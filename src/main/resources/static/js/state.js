/**
 * state.js — Application state, localStorage persistence, and all
 * derived balance/ledger calculations for the dual-account register.
 */

/* eslint-disable no-unused-vars */

const STORAGE_KEY = 'family-budget-v5';
const TODAY       = new Date();
const TODAY_DAY   = TODAY.getDate();
const MONTH_LABEL = TODAY.toLocaleString('en-US', { month: 'long', year: 'numeric' });

/** @type {object} Live application data */
let AppData = {};

/* ── Load / Save ─────────────────────────────────────────── */

/**
 * Loads AppData from the server (source of truth for cross-device sync),
 * falling back to localStorage if the server is unreachable, then defaults.
 * Returns a Promise so the caller can await before first render.
 */
async function loadAppData() {
  // Server is authoritative — always fetch so all devices stay in sync
  try {
    const res = await fetch('/api/data');
    if (res.status === 200) {
      const json = await res.text();
      if (json && json.trim().length > 0) {
        AppData = JSON.parse(json);
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
}

let _saveTimer = null;

/**
 * Persists AppData to localStorage and syncs to server. Debounced 150ms.
 */
function saveAppData() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
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
      headers: { 'Content-Type': 'application/json' },
      body: json,
    }).catch((err) => console.warn('Server sync failed:', err));
  }, 150);
}

/** @param {'ok'|'err'} type */
function _flashSave(type) {
  const el = document.getElementById('savemsg');
  if (!el) return;
  el.textContent = type === 'ok' ? '✓ Saved' : '⚠ Save failed';
  el.className   = `save-msg ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'save-msg'; }, 1800);
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
  const day = parseInt(bill.day, 10);
  if (!day || day < 1 || day > 31) return 'pending';
  const cycleStart = getCycleStart(day, TODAY);
  const cycleStartISO = cycleStart.toISOString().slice(0, 10);
  const paid = AppData.ledger.some(
    (e) => e.type === 'bill' && e.billId === bill.id && e.date >= cycleStartISO
  );
  if (paid) return 'paid';
  if (TODAY_DAY >= bill.day) return 'overdue';
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
 * Income adds; bills and expenses subtract.
 * @param {string} accountId
 * @returns {number}
 */
function realBalance(accountId) {
  return AppData.ledger
    .filter((e) => e.accountId === accountId)
    .reduce((sum, e) => {
      return e.type === 'income' ? sum + e.amount : sum - e.amount;
    }, 0);
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

/**
 * Spending entries in the current calendar month.
 * @returns {Array}
 */
function thisMonthSpending() {
  const mk = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;
  return AppData.ledger
    .filter((e) => e.type === 'expense' && e.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Income entries in the current calendar month.
 * @returns {Array}
 */
function thisMonthIncome() {
  const mk = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;
  return AppData.ledger
    .filter((e) => e.type === 'income' && e.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Spending grouped by category for the current month.
 * @returns {Array<{ name: string, emoji: string, total: number }>}
 */
function spendingByCategory() {
  const map = {};
  thisMonthSpending().forEach((e) => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, emoji: spendEmoji(name), total }))
    .sort((a, b) => b.total - a.total);
}

/** @returns {number} */
function totalSaved() {
  return AppData.goals.reduce((s, g) => s + g.saved, 0);
}

/** @returns {number} */
function totalDebt() {
  return AppData.debts.reduce((s, d) => s + d.balance, 0);
}
