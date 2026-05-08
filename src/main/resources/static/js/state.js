/**
 * state.js — Application state, localStorage persistence, and all
 * derived balance/ledger calculations for the dual-account register.
 */

/* eslint-disable no-unused-vars */

const STORAGE_KEY     = 'family-budget-v5';
const API_TOKEN_KEY   = 'family-budget-api-token';

/** @type {object} Live application data */
let AppData = {};

/* ── API Token (server auth) ─────────────────────────────── */

function _getApiToken() {
  try { return localStorage.getItem(API_TOKEN_KEY) || ''; } catch { return ''; }
}

function _authHeaders(extra) {
  const token = _getApiToken();
  const h = { 'Content-Type': 'application/json', ...extra };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/* ── Load / Save ─────────────────────────────────────────── */

/**
 * Loads AppData from the server (source of truth for cross-device sync),
 * falling back to localStorage if the server is unreachable, then defaults.
 * Returns a Promise so the caller can await before first render.
 */
async function loadAppData() {
  // Server is authoritative — always fetch so all devices stay in sync
  try {
    const res = await fetch('/api/data', { headers: _authHeaders() });
    if (res.status === 401) {
      // Auth required — will fall back to localStorage; user can set token via Sync modal
      console.warn('Server requires access token — using localStorage until token is configured');
    } else if (res.status === 200) {
      const json = await res.text();
      if (json && json.trim().length > 0) {
        const serverData = JSON.parse(json);

        // Conflict detection: if localStorage is newer, push it back up rather than overwrite
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const localData = JSON.parse(stored);
            const serverTime = serverData._savedAt || '';
            const localTime  = localData._savedAt  || '';
            if (localTime > serverTime) {
              console.warn('Local data is newer than server — pushing local data to server');
              AppData = localData;
              _migrate();
              fetch('/api/data', { method: 'PUT', headers: _authHeaders(), body: stored }).catch(() => {});
              return;
            }
          }
        } catch { /* ignore — proceed with server data */ }

        AppData = serverData;
        _migrate();
        localStorage.setItem(STORAGE_KEY, json);
        return;
      }
    }
  } catch (err) {
    console.warn('Server fetch failed, falling back to localStorage:', err);
  }

  // Server unavailable or empty — use localStorage as offline fallback
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      AppData = JSON.parse(stored);
      _migrate();
      return;
    }
  } catch (err) {
    console.warn('localStorage load failed, using defaults:', err);
  }

  AppData = {
    accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
    bills:    DEFAULT_BILLS.map((b)    => ({ ...b })),
    income:   DEFAULT_INCOME.map((i)   => ({ ...i })),
    goals:    DEFAULT_GOALS.map((g)    => ({ ...g })),
    debts:    DEFAULT_DEBTS.map((d)    => ({ ...d })),
    budgets:  {},
    ledger:   [],
  };
}

/**
 * Migrates older AppData shapes to the current schema.
 * @private
 */
function _migrate() {
  // Add accounts array if missing (upgrade from pre-dual-account)
  if (!Array.isArray(AppData.accounts)) {
    AppData.accounts = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
  }
  // Convert old paid:{} to empty ledger (data loss is unavoidable for old paid flags,
  // but all financial amounts are preserved)
  if (!Array.isArray(AppData.ledger)) {
    AppData.ledger = [];
  }
  // Ensure all bills have required fields
  AppData.bills = (AppData.bills || []).map((b) => ({
    ...b,
    accountId: b.accountId || AppData.accounts[0].id,
    cat:       b.cat  || 'Other',
    day:       parseInt(b.day, 10) || 1,
  }));
  // Ensure all income sources have an accountId
  AppData.income = (AppData.income || []).map((i) => ({
    ...i,
    accountId: i.accountId || AppData.accounts[0].id,
  }));
  // Ensure all ledger entries have accountId
  AppData.ledger = AppData.ledger.map((e) => ({
    ...e,
    accountId: e.accountId || AppData.accounts[0].id,
  }));
  if (!Array.isArray(AppData.goals))  AppData.goals  = [];
  if (!Array.isArray(AppData.debts))  AppData.debts  = [];
  if (!Array.isArray(AppData.income)) AppData.income = [];
  if (!AppData.budgets || typeof AppData.budgets !== 'object' || Array.isArray(AppData.budgets)) {
    AppData.budgets = {};
  }
}

let _saveTimer = null;

/**
 * Persists AppData to localStorage and syncs to server. Debounced 150ms.
 */
function saveAppData() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AppData._savedAt = new Date().toISOString();
    const json = JSON.stringify(AppData);
    try {
      localStorage.setItem(STORAGE_KEY, json);
      _flashSave('ok');
    } catch (err) {
      console.error('Save failed:', err);
      _flashSave('err');
    }
    fetch('/api/data', {
      method: 'PUT',
      headers: _authHeaders(),
      body: json,
    }).then((res) => {
      if (res.status === 401) _flashSave('auth');
    }).catch((err) => console.warn('Server sync failed:', err));
  }, 150);
}

/** @param {'ok'|'err'|'auth'} type */
function _flashSave(type) {
  const el = document.getElementById('savemsg');
  if (!el) return;
  const msgs = { ok: '✓ Saved', err: '⚠ Save failed', auth: '⚠ Sync needs access code' };
  el.textContent = msgs[type] || '⚠ Save failed';
  el.className   = `save-msg ${type === 'ok' ? 'ok' : 'err'}`;
  setTimeout(() => { el.textContent = ''; el.className = 'save-msg'; }, 3000);
}

/* ── Ledger Mutations ────────────────────────────────────── */

/**
 * Adds a transaction to the ledger and saves.
 * @param {{ type: string, name: string, amount: number, date: string,
 *           category: string, accountId: string, billId?: string,
 *           incomeId?: string, note?: string }} entry
 */
function logTransaction(entry) {
  AppData.ledger.push({
    id:        uid(),
    billId:    null,
    incomeId:  null,
    note:      '',
    category:  '',
    ...entry,
  });
  saveAppData();
}

/**
 * Removes a ledger entry by id.
 * @param {string} id
 */
function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  AppData.ledger = AppData.ledger.filter((e) => e.id !== id);
  saveAppData();
}

/* ── Bill Status ─────────────────────────────────────────── */

/**
 * Determines the current status of a bill.
 * @param {{ id: string, day: number }} bill
 * @returns {'paid'|'pending'|'overdue'}
 */
function getBillStatus(bill) {
  const today    = new Date();
  const todayDay = today.getDate();
  const day      = parseInt(bill.day, 10);
  if (!day || day < 1 || day > 31) return 'pending';
  const cycleStart    = getCycleStart(day, today);
  const cycleStartISO = cycleStart.toISOString().slice(0, 10);
  const paid = AppData.ledger.some(
    (e) => e.type === 'bill' && e.billId === bill.id && e.date >= cycleStartISO
  );
  if (paid) return 'paid';
  if (todayDay >= bill.day) return 'overdue';
  return 'pending';
}

/**
 * Returns all bills that are pending or overdue for a given account.
 * @param {string} accountId
 * @returns {Array}
 */
function pendingBills(accountId) {
  return AppData.bills
    .filter((b) => b.accountId === accountId)
    .filter((b) => {
      const status = getBillStatus(b);
      return status === 'pending' || status === 'overdue';
    })
    .sort((a, b) => a.day - b.day);
}

/* ── Balance Calculations ────────────────────────────────── */

/**
 * Running balance for an account.
 * Starts from the account's openingBalance, then applies all ledger entries.
 * @param {string} accountId
 * @returns {number}
 */
function realBalance(accountId) {
  const acc     = AppData.accounts.find((a) => a.id === accountId);
  const opening = (acc && acc.openingBalance) ? Number(acc.openingBalance) : 0;
  return opening + AppData.ledger
    .filter((e) => e.accountId === accountId)
    .reduce((sum, e) => (e.type === 'income' ? sum + e.amount : sum - e.amount), 0);
}

/**
 * Safe to Spend = realBalance minus total of all unpaid pending/overdue bills.
 * @param {string} accountId
 * @returns {number}
 */
function safeToSpend(accountId) {
  const balance  = realBalance(accountId);
  const pending  = AppData.bills
    .filter((b) => b.accountId === accountId)
    .filter((b) => getBillStatus(b) !== 'paid')
    .reduce((sum, b) => sum + b.amount, 0);
  return balance - pending;
}

/* ── Ledger Queries ──────────────────────────────────────── */

/**
 * All ledger entries sorted newest first.
 * @returns {Array}
 */
function getSortedLedger() {
  return [...AppData.ledger].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );
}

/**
 * Ledger with running balance appended to each entry, per account.
 * Sorted oldest first for calculation, result reversed to newest first.
 * @returns {Array<object>} entries with .runningBalance[accountId]
 */
function getRunningBalances() {
  const sorted = [...AppData.ledger].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
  const running = {};
  AppData.accounts.forEach((acc) => { running[acc.id] = 0; });

  const result = sorted.map((e) => {
    if (e.type === 'income') {
      running[e.accountId] = (running[e.accountId] || 0) + e.amount;
    } else {
      running[e.accountId] = (running[e.accountId] || 0) - e.amount;
    }
    return { ...e, runningBalance: { ...running } };
  });

  return result.reverse();
}

/** @returns {string} Current month prefix as "YYYY-MM" */
function _monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Month-parameterized ledger queries ──────────────────── */

/** @param {string} mk "YYYY-MM" @returns {Array} */
function spendingForMonth(mk) {
  return AppData.ledger
    .filter((e) => e.type === 'expense' && e.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** @param {string} mk @returns {Array} */
function incomeForMonth(mk) {
  return AppData.ledger
    .filter((e) => e.type === 'income' && e.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** @param {string} incomeId @param {string} mk @returns {Array} */
function incomeReceivedInMonth(incomeId, mk) {
  return AppData.ledger.filter(
    (e) => e.type === 'income' && e.incomeId === incomeId && e.date.startsWith(mk)
  );
}

/** @param {string} mk @returns {Array} */
function unlinkedIncomeForMonth(mk) {
  return AppData.ledger.filter(
    (e) => e.type === 'income' && !e.incomeId && e.date.startsWith(mk)
  ).sort((a, b) => b.date.localeCompare(a.date));
}

/** @param {string} mk @returns {Array<{ name: string, emoji: string, total: number }>} */
function spendingByCategoryForMonth(mk) {
  const map = {};
  spendingForMonth(mk).forEach((e) => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, emoji: spendEmoji(name), total }))
    .sort((a, b) => b.total - a.total);
}

/* ── Current-month convenience wrappers ──────────────────── */

/** @returns {Array} */
function thisMonthSpending() { return spendingForMonth(_monthKey()); }
/** @returns {Array} */
function thisMonthIncome()   { return incomeForMonth(_monthKey()); }
/** @param {string} incomeId @returns {Array} */
function incomeReceivedThisMonth(incomeId) { return incomeReceivedInMonth(incomeId, _monthKey()); }
/** @returns {Array} */
function unlinkedIncomeThisMonth() { return unlinkedIncomeForMonth(_monthKey()); }
/** @returns {Array<{ name: string, emoji: string, total: number }>} */
function spendingByCategory() { return spendingByCategoryForMonth(_monthKey()); }

/** @returns {number} */
function totalSaved() {
  return AppData.goals.reduce((s, g) => s + g.saved, 0);
}

/** @returns {number} */
function totalDebt() {
  return AppData.debts.reduce((s, d) => s + d.balance, 0);
}
