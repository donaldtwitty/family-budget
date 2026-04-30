/**
 * state.js — Application state, server + localStorage persistence,
 * and derived totals. All mutation goes through these functions.
 *
 * CHANGES FROM ORIGINAL (localStorage-only):
 *  - loadAppData() is now async: tries the REST API first, falls back
 *    to localStorage, then falls back to seed defaults.
 *  - saveAppData() still writes to localStorage immediately (fast UI
 *    feedback) and also fires an async PUT /api/data in the background.
 */

/* eslint-disable no-unused-vars */

const STORAGE_KEY = 'family-budget-v4';

/** Today's date (shared across the module) */
const TODAY = new Date();

/** The month currently being viewed — defaults to today, shifted by nav arrows */
let viewDate = new Date(TODAY);

function viewMonthKey() {
  return `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
}
function viewMonthLabel() {
  return viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}
function viewDay() {
  return isViewingCurrentMonth() ? TODAY.getDate() : 0;
}
function isViewingCurrentMonth() {
  return viewDate.getFullYear() === TODAY.getFullYear() &&
         viewDate.getMonth()    === TODAY.getMonth();
}

/** Shift the viewed month by delta (-1 or +1) */
function shiftMonth(delta) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
}

/**
 * The live application data object.
 * Shape: { bills, income, goals, debts, spending, paid }
 * @type {object}
 */
let AppData = {};

/* ── Seed defaults helper ────────────────────────────────── */
function seedDefaults() {
  return {
    bills:    DEFAULT_BILLS.map((b) => ({ ...b })),
    income:   DEFAULT_INCOME.map((i) => ({ ...i })),
    goals:    DEFAULT_GOALS.map((g) => ({ ...g })),
    debts:    DEFAULT_DEBTS.map((d) => ({ ...d })),
    spending: [],
    paid:     {},
  };
}

/* ── Load / Save ─────────────────────────────────────────── */

/**
 * Loads AppData from the REST API (server), falling back to
 * localStorage, then to seed defaults.
 *
 * This function is async. app.js calls it with await before rendering.
 */
async function loadAppData() {
  // 1 — Try the server (source of truth in production)
  try {
    const serverData = await apiLoadData();
    if (serverData) {
      AppData = serverData;
      if (!Array.isArray(AppData.spending)) AppData.spending = [];
      // Keep localStorage in sync so the app works if the user goes offline
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AppData));
      return;
    }
  } catch (err) {
    console.warn('[state] Server load error, trying localStorage.', err);
  }

  // 2 — Fall back to localStorage (offline / first-visit before server save)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      AppData = JSON.parse(stored);
      if (!Array.isArray(AppData.spending)) AppData.spending = [];
      return;
    }
  } catch (err) {
    console.warn('[state] localStorage load failed, using defaults.', err);
  }

  // 3 — Brand-new install: seed from defaults
  AppData = seedDefaults();
}

let saveTimer = null;

/**
 * Persists AppData:
 *  1. Immediately to localStorage (fast, synchronous)
 *  2. Asynchronously to the REST API (debounced 300 ms)
 */
function saveAppData() {
  // Instant localStorage write so the UI never stalls
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppData));
  } catch (err) {
    console.error('[state] localStorage write failed:', err);
  }

  // Debounced server sync
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await apiSaveData(AppData);
      flashSave('ok');
    } catch (err) {
      console.error('[state] Server save failed:', err);
      flashSave('err');
    }
  }, 300);
}

/**
 * Shows a brief save confirmation in the header.
 * @param {'ok'|'err'} type
 */
function flashSave(type) {
  const el = document.getElementById('savemsg');
  if (!el) return;
  el.textContent = type === 'ok' ? '✓ Saved' : '⚠ Save failed';
  el.className   = `save-msg ${type}`;
  setTimeout(() => {
    el.textContent = '';
    el.className   = 'save-msg';
  }, 1800);
}

/* ── Paid Bill Tracking ──────────────────────────────────── */

function getPaidSet() {
  return new Set(AppData.paid[viewMonthKey()] || []);
}

function togglePaid(billId) {
  const mk   = viewMonthKey();
  const paid = getPaidSet();
  if (paid.has(billId)) {
    paid.delete(billId);
  } else {
    paid.add(billId);
  }
  AppData.paid[mk] = [...paid];
  saveAppData();
}

/**
 * Auto-marks autopay bills as paid once their due day has passed
 * in the current month. Only runs for the current month view.
 * Called once at boot and on each render.
 */
function autoMarkAutopay() {
  if (!isViewingCurrentMonth()) return;
  const mk   = viewMonthKey();
  const paid = getPaidSet();
  const day  = TODAY.getDate();
  let changed = false;

  AppData.bills.forEach((b) => {
    if (b.auto && b.day <= day && !paid.has(b.id)) {
      paid.add(b.id);
      changed = true;
    }
  });

  if (changed) {
    AppData.paid[mk] = [...paid];
    saveAppData();
  }
}

/* ── Derived Totals ──────────────────────────────────────── */

function totalIncome() {
  return AppData.income.reduce((sum, i) => sum + i.amount, 0);
}

function totalBills() {
  return AppData.bills.reduce((sum, b) => sum + b.amount, 0);
}

/**
 * Sum of only the bills marked as paid this month.
 * Used for the balance calculation — unpaid bills don't reduce
 * available money until the user confirms payment.
 */
function totalPaidBills() {
  const paid = getPaidSet();
  return AppData.bills
    .filter((b) => paid.has(b.id))
    .reduce((sum, b) => sum + b.amount, 0);
}

function totalDebt() {
  return AppData.debts.reduce((sum, d) => sum + d.balance, 0);
}

function totalSaved() {
  return AppData.goals.reduce((sum, g) => sum + g.saved, 0);
}

function totalSpent() {
  const mk = viewMonthKey();
  return AppData.spending
    .filter((e) => e.date.startsWith(mk))
    .reduce((sum, e) => sum + e.amount, 0);
}

function thisMonthSpending() {
  const mk = viewMonthKey();
  return AppData.spending
    .filter((e) => e.date.startsWith(mk))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function spendingByCategory() {
  const mk  = viewMonthKey();
  const map = {};
  AppData.spending
    .filter((e) => e.date.startsWith(mk))
    .forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

  return Object.entries(map)
    .map(([name, total]) => ({ name, emoji: spendEmoji(name), total }))
    .sort((a, b) => b.total - a.total);
}
