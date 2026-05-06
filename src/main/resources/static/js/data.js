/**
 * data.js — Default seed data. All amounts are 0 and names are generic.
 * Real values are entered inside the app and stored in localStorage only.
 * This file is safe to commit to a public GitHub repository.
 */

/* eslint-disable no-unused-vars */

/**
 * Two bank accounts. Each bill, income source, and expense is assigned
 * to one of these accounts so balances stay fully independent.
 */
const DEFAULT_ACCOUNTS = [
  { id: 'acc1', name: 'Account 1', color: '#1b4332' },
  { id: 'acc2', name: 'Account 2', color: '#1e3a5f' },
];

const DEFAULT_BILLS = [
  { id: 'b1',  name: 'Bill 1',           amount: 0, day: 1,  cat: 'Housing',      auto: false, accountId: 'acc1' },
  { id: 'b2',  name: 'Bill 2',           amount: 0, day: 1,  cat: 'Kids',         auto: false, accountId: 'acc1' },
  { id: 'b3',  name: 'Bill 3',           amount: 0, day: 1,  cat: 'Home',         auto: false, accountId: 'acc2' },
  { id: 'b4',  name: 'Streaming 1',      amount: 0, day: 4,  cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b5',  name: 'Subscription 1',   amount: 0, day: 5,  cat: 'Subscription', auto: true,  accountId: 'acc2' },
  { id: 'b6',  name: 'Insurance 1',      amount: 0, day: 5,  cat: 'Insurance',    auto: false, accountId: 'acc1' },
  { id: 'b7',  name: 'Insurance 2',      amount: 0, day: 5,  cat: 'Insurance',    auto: false, accountId: 'acc1' },
  { id: 'b8',  name: 'Utility 1',        amount: 0, day: 6,  cat: 'Utilities',    auto: false, accountId: 'acc1' },
  { id: 'b9',  name: 'Utility 2',        amount: 0, day: 6,  cat: 'Utilities',    auto: false, accountId: 'acc1' },
  { id: 'b10', name: 'Streaming 2',      amount: 0, day: 8,  cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b11', name: 'Utility 3',        amount: 0, day: 9,  cat: 'Utilities',    auto: false, accountId: 'acc1' },
  { id: 'b12', name: 'Streaming 3',      amount: 0, day: 10, cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b13', name: 'Subscription 2',   amount: 0, day: 13, cat: 'Subscription', auto: false, accountId: 'acc2' },
  { id: 'b14', name: 'Utility 4',        amount: 0, day: 13, cat: 'Utilities',    auto: true,  accountId: 'acc1' },
  { id: 'b15', name: 'Streaming 4',      amount: 0, day: 13, cat: 'Streaming',    auto: false, accountId: 'acc2' },
  { id: 'b16', name: 'Loan Payment 1',   amount: 0, day: 13, cat: 'Debt',         auto: false, accountId: 'acc2' },
  { id: 'b17', name: 'Streaming 5',      amount: 0, day: 14, cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b18', name: 'Streaming 6',      amount: 0, day: 15, cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b19', name: 'Loan Payment 2',   amount: 0, day: 15, cat: 'Debt',         auto: false, accountId: 'acc2' },
  { id: 'b20', name: 'Insurance 3',      amount: 0, day: 18, cat: 'Insurance',    auto: false, accountId: 'acc2' },
  { id: 'b21', name: 'Car Payment 1',    amount: 0, day: 19, cat: 'Debt',         auto: false, accountId: 'acc1' },
  { id: 'b22', name: 'Insurance 4',      amount: 0, day: 20, cat: 'Insurance',    auto: false, accountId: 'acc1' },
  { id: 'b23', name: 'Kids Activity',    amount: 0, day: 21, cat: 'Kids',         auto: false, accountId: 'acc1' },
  { id: 'b24', name: 'Streaming 7',      amount: 0, day: 21, cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b25', name: 'Streaming 8',      amount: 0, day: 23, cat: 'Streaming',    auto: true,  accountId: 'acc2' },
  { id: 'b26', name: 'Music',            amount: 0, day: 24, cat: 'Streaming',    auto: false, accountId: 'acc2' },
  { id: 'b27', name: 'Phone Bill',       amount: 0, day: 26, cat: 'Utilities',    auto: true,  accountId: 'acc2' },
  { id: 'b28', name: 'Car Payment 2',    amount: 0, day: 27, cat: 'Debt',         auto: false, accountId: 'acc2' },
  { id: 'b29', name: 'Health/Fitness',   amount: 0, day: 30, cat: 'Health',       auto: false, accountId: 'acc2' },
];

const DEFAULT_INCOME = [
  { id: 'i1', name: 'Income Source 1', amount: 0, day: 1,  accountId: 'acc1' },
  { id: 'i2', name: 'Income Source 2', amount: 0, day: 1,  accountId: 'acc1' },
  { id: 'i3', name: 'Income Source 3', amount: 0, day: 1,  accountId: 'acc2' },
  { id: 'i4', name: 'Income Source 4', amount: 0, day: 15, accountId: 'acc2' },
];

const DEFAULT_GOALS = [
  { id: 'g1', name: 'Vacation Fund',  emoji: '✈️', target: 0, saved: 0, date: '' },
  { id: 'g2', name: 'Home Projects',  emoji: '🏠', target: 0, saved: 0, date: '' },
  { id: 'g3', name: 'Emergency Fund', emoji: '🛡️', target: 0, saved: 0, date: '' },
];

const DEFAULT_DEBTS = [
  { id: 'd1', name: 'Car Loan 1',    balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd2', name: 'Car Loan 2',    balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd3', name: 'Personal Loan', balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd4', name: 'Installment',   balance: 0, payment: 0, rate: 0, day: 1 },
  { id: 'd5', name: 'Home Loan',     balance: 0, payment: 0, rate: 0, day: 1 },
];

/**
 * Spending categories for the daily expense logger.
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
  { name: 'Other',         emoji: '💰' },
];
