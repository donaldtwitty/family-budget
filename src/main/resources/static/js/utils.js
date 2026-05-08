/**
 * utils.js — Pure utility functions and SVG icon constants.
 * No DOM access. No side effects.
 */

/* eslint-disable no-unused-vars */

/** Bill categories used in the Bills tab */
const BILL_CATEGORIES = [
  'Housing', 'Utilities', 'Debt', 'Streaming',
  'Insurance', 'Subscription', 'Kids', 'Health', 'Home',
];

/**
 * Formats a number as USD currency.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(n || 0);
}

/**
 * Returns ordinal string for a number. e.g. 1 → "1st", 21 → "21st"
 * @param {number} n
 * @returns {string}
 */
function ord(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Generates a random short unique ID.
 * @returns {string}
 */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Escapes a value for safe HTML insertion.
 * @param {string|number} s
 * @returns {string}
 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Clamps a number between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Returns today's date as YYYY-MM-DD string.
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM-DD date as a friendly label.
 * Returns "Today", "Yesterday", or "Mon Apr 5" style.
 * @param {string} dateStr
 * @returns {string}
 */
function friendlyDate(dateStr) {
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Returns the emoji for a spending category name.
 * @param {string} name
 * @returns {string}
 */
function spendEmoji(name) {
  const match = SPENDING_CATEGORIES.find((c) => c.name === name);
  return match ? match.emoji : '💰';
}

/**
 * Converts a bill category name to a CSS class.
 * @param {string} cat
 * @returns {string}
 */
function catClass(cat) {
  if (!cat) return 'cat-other';
  return `cat-${cat.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Calculates estimated payoff info for a debt.
 * @param {{ balance: number, payment: number, rate: number }} debt
 * @param {Date} fromDate
 * @returns {string}
 */
function calcPayoff(debt, fromDate) {
  if (debt.balance <= 0) return '🎉 Paid off!';
  const mi = debt.balance * (debt.rate / 100) / 12;
  if (debt.rate > 0 && debt.payment <= mi) return '⚠ Increase payment to make progress';
  let bal = debt.balance, months = 0;
  while (bal > 0 && months < 600) {
    bal = bal + bal * (debt.rate / 100) / 12 - debt.payment;
    months++;
  }
  if (months >= 600) return '';
  const dt = new Date(fromDate);
  dt.setMonth(dt.getMonth() + months);
  return `Est. payoff: ${dt.toLocaleString('en-US', { month: 'short', year: 'numeric' })} (${months} mo)`;
}

/**
 * Returns the billing cycle start date for a bill.
 * If today >= bill.day this month, cycle started this month.
 * Otherwise cycle started last month.
 * @param {number} dueDay - 1-31
 * @param {Date}   fromDate
 * @returns {Date}
 */
function getCycleStart(dueDay, fromDate) {
  const day   = Math.max(1, Math.min(31, parseInt(dueDay, 10) || 1));
  const d     = new Date(fromDate);
  const today = d.getDate();
  if (today >= day) {
    return new Date(d.getFullYear(), d.getMonth(), day);
  }
  const prev    = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  return new Date(prev.getFullYear(), prev.getMonth(), Math.min(day, lastDay));
}

/* ── SVG Icon strings ─────────────────────────────────────── */

const ICON_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1b4332"/><path d="M7 12l3.5 3.5L17 8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
const ICON_CIRCLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" stroke="#d1d5db" stroke-width="2" fill="none"/></svg>`;
const ICON_PENCIL = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/></svg>`;
const ICON_TRASH  = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const ICON_PLUS   = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const ICON_CHEVRON_UP   = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const ICON_DOLLAR = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#1b4332" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
const ICON_BOOK   = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
