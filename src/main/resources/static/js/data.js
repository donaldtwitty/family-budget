/**
 * data.js — Default seed data loaded on first launch.
 * Edit these arrays to change the pre-populated values.
 */

/* eslint-disable no-unused-vars */

/**
 * DEFAULT_BILLS — starter list of bill names and due dates.
 * Amounts are intentionally set to 0. Enter real amounts
 * inside the app after first launch — they are saved to
 * localStorage on your device and never stored in this file.
 */
const DEFAULT_BILLS = [
  { id: 'b1',  name: 'Mortgage',          amount: 0, day: 1,  cat: 'Housing',      auto: false },
  { id: 'b2',  name: 'Kids Activity',     amount: 0, day: 1,  cat: 'Kids',         auto: false },
  { id: 'b3',  name: 'Home Loan',         amount: 0, day: 1,  cat: 'Home',         auto: false },
  { id: 'b4',  name: 'Streaming 1',       amount: 0, day: 4,  cat: 'Streaming',    auto: true  },
  { id: 'b5',  name: 'Subscription 1',    amount: 0, day: 5,  cat: 'Subscription', auto: true  },
  { id: 'b6',  name: 'Life Insurance 1',  amount: 0, day: 5,  cat: 'Insurance',    auto: false },
  { id: 'b7',  name: 'Life Insurance 2',  amount: 0, day: 5,  cat: 'Insurance',    auto: false },
  { id: 'b8',  name: 'Water',             amount: 0, day: 6,  cat: 'Utilities',    auto: false },
  { id: 'b9',  name: 'Trash',             amount: 0, day: 6,  cat: 'Utilities',    auto: false },
  { id: 'b10', name: 'Streaming 2',       amount: 0, day: 8,  cat: 'Streaming',    auto: true  },
  { id: 'b11', name: 'Electric',          amount: 0, day: 9,  cat: 'Utilities',    auto: false },
  { id: 'b12', name: 'Streaming 3',       amount: 0, day: 10, cat: 'Streaming',    auto: true  },
  { id: 'b13', name: 'Subscription 2',    amount: 0, day: 13, cat: 'Subscription', auto: false },
  { id: 'b14', name: 'Internet',          amount: 0, day: 13, cat: 'Utilities',    auto: true  },
  { id: 'b15', name: 'Streaming 4',       amount: 0, day: 13, cat: 'Streaming',    auto: false },
  { id: 'b16', name: 'Loan Payment',      amount: 0, day: 13, cat: 'Debt',         auto: false },
  { id: 'b17', name: 'Streaming 5',       amount: 0, day: 14, cat: 'Streaming',    auto: true  },
  { id: 'b18', name: 'Streaming 6',       amount: 0, day: 15, cat: 'Streaming',    auto: true  },
  { id: 'b19', name: 'Installment Loan',  amount: 0, day: 15, cat: 'Debt',         auto: false },
  { id: 'b20', name: 'Auto Insurance',    amount: 0, day: 18, cat: 'Insurance',    auto: false },
  { id: 'b21', name: 'Car Payment 1',     amount: 0, day: 19, cat: 'Debt',         auto: false },
  { id: 'b22', name: 'Renters Insurance', amount: 0, day: 20, cat: 'Insurance',    auto: false },
  { id: 'b23', name: 'Kids Activity 2',   amount: 0, day: 21, cat: 'Kids',         auto: false },
  { id: 'b24', name: 'Streaming 7',       amount: 0, day: 21, cat: 'Streaming',    auto: true  },
  { id: 'b25', name: 'Streaming 8',       amount: 0, day: 23, cat: 'Streaming',    auto: true  },
  { id: 'b26', name: 'Music',             amount: 0, day: 24, cat: 'Streaming',    auto: false },
  { id: 'b27', name: 'Phone Bill',        amount: 0, day: 26, cat: 'Utilities',    auto: true  },
  { id: 'b28', name: 'Car Payment 2',     amount: 0, day: 27, cat: 'Debt',         auto: false },
  { id: 'b29', name: 'Gym',               amount: 0, day: 30, cat: 'Health',       auto: false },
];

/**
 * DEFAULT_INCOME — income source names only, amounts set to 0.
 * Enter real amounts inside the app.
 */
const DEFAULT_INCOME = [
  { id: 'i1', name: 'Income 1', amount: 0, day: 1  },
  { id: 'i2', name: 'Income 2', amount: 0, day: 1  },
  { id: 'i3', name: 'Income 3', amount: 0, day: 1  },
  { id: 'i4', name: 'Income 4', amount: 0, day: 15 },
];

/**
 * DEFAULT_GOALS — example goals with zero amounts.
 * Customize inside the app.
 */
const DEFAULT_GOALS = [
  { id: 'g1', name: 'Vacation Fund',  emoji: '✈️', target: 0, saved: 0, date: '' },
  { id: 'g2', name: 'Home Projects',  emoji: '🏠', target: 0, saved: 0, date: '' },
  { id: 'g3', name: 'Emergency Fund', emoji: '🛡️', target: 0, saved: 0, date: '' },
];

/**
 * DEFAULT_DEBTS — debt names only, balances and amounts set to 0.
 * Enter real balances inside the app.
 */
const DEFAULT_DEBTS = [
  { id: 'd1', name: 'Car Loan 1',  balance: 0, payment: 0, rate: 0, day: 1  },
  { id: 'd2', name: 'Car Loan 2',  balance: 0, payment: 0, rate: 0, day: 1  },
  { id: 'd3', name: 'Personal Loan', balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd4', name: 'Installment',   balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd5', name: 'Home Loan',     balance: 0, payment: 0, rate: 0, day: 1 },
];

/**
 * Spending categories used for daily expense logging.
 * Add or remove entries here to customize the category picker.
 * Each entry needs a unique `name` and an `emoji`.
 */
const SPENDING_CATEGORIES = [
  { name: 'Groceries',     emoji: '🛒' },
  { name: 'Gas',           emoji: '⛽' },
  { name: 'Dining Out',    emoji: '🍔' },
  { name: 'Shopping',      emoji: '🛍️' },
  { name: 'Pharmacy',      emoji: '💊' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Personal Care', emoji: '✂️' },
  { name: 'Medical',       emoji: '🏥' },
  { name: 'Online/Amazon', emoji: '📦' },
  { name: 'Home/Hardware', emoji: '🔧' },
  { name: 'Gifts',         emoji: '🎁' },
  { name: 'Kids',          emoji: '🧒' },
  { name: 'Pets',          emoji: '🐾' },
  { name: 'Travel',        emoji: '✈️' },
  { name: 'Fuel',          emoji: '🔋' },
  { name: 'Other',         emoji: '💰' },
];
