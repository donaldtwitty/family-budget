/**
 * utils.js — Pure utility functions and shared constants.
 * No DOM access. No side effects.
 */

/* eslint-disable no-unused-vars */

/** Bill categories for the bills tab */
const CATEGORIES = [
  'Housing',
  'Utilities',
  'Debt',
  'Streaming',
  'Insurance',
  'Subscription',
  'Kids',
  'Health',
  'Home',
];

/**
 * Converts a category name to a CSS class-safe string.
 * e.g. "Subscription" → "cat-subscription"
 * @param {string} cat
 * @returns {string}
 */
function catClass(cat) {
  return `cat-${cat.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Formats a number as USD currency.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

/**
 * Returns an ordinal string for a number.
 * e.g. 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"
 * @param {number} n
 * @returns {string}
 */
function ord(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

/**
 * Generates a random short unique ID string.
 * @returns {string}
 */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Escapes a string for safe insertion into HTML.
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
 * Clamps a value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Calculates estimated payoff info for a debt.
 * @param {{ balance: number, payment: number, rate: number }} debt
 * @param {Date} fromDate
 * @returns {string}
 */
function calcPayoff(debt, fromDate) {
  if (debt.balance <= 0) return '🎉 Paid off!';

  const monthlyInterest = debt.balance * (debt.rate / 100) / 12;

  if (debt.rate > 0 && debt.payment <= monthlyInterest) {
    return '⚠ Increase payment to make progress';
  }

  let balance = debt.balance;
  let months  = 0;
  const MAX_MONTHS = 600;

  while (balance > 0 && months < MAX_MONTHS) {
    balance = balance + balance * (debt.rate / 100) / 12 - debt.payment;
    months++;
  }

  if (months >= MAX_MONTHS) return '';

  const payoffDate = new Date(fromDate);
  payoffDate.setMonth(payoffDate.getMonth() + months);
  const label = payoffDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return `Est. payoff: ${label} (${months} mo)`;
}

/**
 * Formats a date string (YYYY-MM-DD) as a friendly label.
 * Returns "Today", "Yesterday", or "Mon Apr 5" style.
 * @param {string} dateStr
 * @returns {string}
 */
function friendlyDate(dateStr) {
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - d) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Returns today's date as an ISO string (YYYY-MM-DD).
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the emoji for a spending category name.
 * Falls back to 💰 if not found.
 * @param {string} name
 * @returns {string}
 */
function spendEmoji(name) {
  const match = SPENDING_CATEGORIES.find((c) => c.name === name);
  return match ? match.emoji : '💰';
}

/* ── SVG Icon strings ─────────────────────────────────────── */

const ICON_CHECK = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" fill="#1b4332"/>
    <path d="M7 12l3.5 3.5L17 8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const ICON_CIRCLE = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" stroke="#d1d5db" stroke-width="2" fill="none"/>
  </svg>`;

const ICON_PENCIL = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          stroke-linecap="round" fill="none"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke-linecap="round" fill="none"/>
  </svg>`;

const ICON_TRASH = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="3 6 5 6 21 6" stroke-linecap="round" fill="none"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
          stroke-linecap="round" fill="none"/>
    <path d="M10 11v6M14 11v6" stroke-linecap="round" fill="none"/>
  </svg>`;

const ICON_PLUS = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
    <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
  </svg>`;

const ICON_CHEVRON_DOWN = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="6 9 12 15 18 9" stroke-linecap="round" fill="none"/>
  </svg>`;

const ICON_CHEVRON_UP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="18 15 12 9 6 15" stroke-linecap="round" fill="none"/>
  </svg>`;

const ICON_DOLLAR = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16"
       stroke="#1b4332" stroke-width="2" fill="none" stroke-linecap="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>`;
