/**
 * modals.js — All modal rendering and CRUD operations.
 */

/* eslint-disable no-unused-vars */

/* ── Modal infrastructure ────────────────────────────────── */

/**
 * @param {string} title
 * @param {string} bodyHtml
 */
function showModal(title, bodyHtml) {
  document.getElementById('sh-ttl').textContent = title;
  document.getElementById('sh-body').innerHTML  = bodyHtml;
  const ov = document.getElementById('overlay');
  ov.classList.add('open');
  ov.setAttribute('aria-hidden', 'false');
  const first = document.querySelector('#sh-body input, #sh-body select, #sh-body textarea, #sh-body button');
  if (first) first.focus();
}

function hideModal() {
  const ov = document.getElementById('overlay');
  ov.classList.remove('open');
  ov.setAttribute('aria-hidden', 'true');
}

/* ── Form helpers ────────────────────────────────────────── */

/** @returns {string} */
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
/** @returns {number} */
function numVal(id) { const el = document.getElementById(id); return el ? parseFloat(el.value) || 0 : 0; }
/** @returns {boolean} */
function checkVal(id) { const el = document.getElementById(id); return el ? el.checked : false; }

/** @returns {string} <option> elements for bill categories */
function catOptions(sel) {
  return BILL_CATEGORIES.map((c) =>
    `<option value="${esc(c)}"${c === sel ? ' selected' : ''}>${esc(c)}</option>`
  ).join('');
}

/** @returns {string} <option> elements for accounts */
function accountOptions(sel) {
  return AppData.accounts.map((a) =>
    `<option value="${esc(a.id)}"${a.id === sel ? ' selected' : ''}>${esc(a.name)}</option>`
  ).join('');
}

/* ── Log Income ──────────────────────────────────────────── */

/** Shows the income source picker */
function showLogIncomeModal() {
  const cards = AppData.income.map((i) => {
    const acc = AppData.accounts.find((a) => a.id === i.accountId);
    return `<button class="income-source-btn" data-action="log-income-source" data-id="${esc(i.id)}">
      <span class="income-source-btn__name">${esc(i.name)}</span>
      <span class="income-source-btn__amt">${fmt(i.amount)}</span>
      <span class="income-source-btn__acc" data-acc-id="${esc(i.accountId)}">${esc(acc ? acc.name : '')}</span>
    </button>`;
  }).join('');

  showModal('Log Income', `
    <p class="form-hint">Tap the source that just arrived, then confirm the amount and actual date.</p>
    <div class="income-source-grid">${cards}</div>
    <button class="btn btn--subtle mt-8" data-action="log-income-manual">+ Enter manually</button>
  `);
}

/**
 * Opens the confirm form pre-filled from an income template.
 * @param {string} incomeId
 */
function showLogIncomeConfirm(incomeId) {
  const inc = AppData.income.find((i) => i.id === incomeId);
  if (!inc) return;
  showModal(`Log: ${inc.name}`, `
    <div class="info-panel info-panel--green">Confirm the amount and the <strong>actual date it arrived</strong> in your account.</div>
    <div>
      <label class="form-label" for="f-amount">Amount ($)</label>
      <input id="f-amount" class="form-input" type="number" value="${inc.amount}" min="0" step="0.01" />
    </div>
    <div>
      <label class="form-label" for="f-date">Date Received</label>
      <input id="f-date" class="form-input" type="date" value="${todayISO()}" />
    </div>
    <div>
      <label class="form-label" for="f-note">Note <span class="form-hint-inline">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" placeholder="e.g. March early deposit" autocomplete="off" />
    </div>
    <button class="btn btn--primary" data-action="save-income-entry" data-income-id="${esc(incomeId)}">
      💰 Log This Income
    </button>
  `);
}

/** Manual income entry (no template) */
function showLogIncomeManual() {
  showModal('Log Income Manually', `
    <div>
      <label class="form-label" for="f-name">Source Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. VA Benefits" autocomplete="off" />
    </div>
    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount" class="form-input" type="number" placeholder="0.00" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-date">Date Received</label>
        <input id="f-date" class="form-input" type="date" value="${todayISO()}" />
      </div>
    </div>
    <div>
      <label class="form-label" for="f-account">Account</label>
      <select id="f-account" class="form-input">${accountOptions(AppData.accounts[0].id)}</select>
    </div>
    <div>
      <label class="form-label" for="f-note">Note <span class="form-hint-inline">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" autocomplete="off" />
    </div>
    <button class="btn btn--primary" data-action="save-income-manual">💰 Log Income</button>
  `);
}

function saveIncomeEntry(incomeId) {
  const inc    = AppData.income.find((i) => i.id === incomeId);
  if (!inc) return;
  const amount = numVal('f-amount');
  const date   = val('f-date') || todayISO();
  const note   = val('f-note');
  if (amount <= 0) { alert('Please enter a valid amount.'); return; }
  logTransaction({ type: 'income', name: inc.name, amount, date, category: 'Income', accountId: inc.accountId, incomeId, note });
  hideModal();
}

function saveIncomeManual() {
  const name   = val('f-name');
  const amount = numVal('f-amount');
  const date   = val('f-date') || todayISO();
  const accountId = val('f-account') || AppData.accounts[0].id;
  const note   = val('f-note');
  if (!name || amount <= 0) { alert('Please fill all fields.'); return; }
  logTransaction({ type: 'income', name, amount, date, category: 'Income', accountId, incomeId: null, note });
  hideModal();
}

/* ── Pay Bill ────────────────────────────────────────────── */

/**
 * @param {string} billId
 */
function showPayBillModal(billId) {
  const bill  = AppData.bills.find((b) => b.id === billId);
  if (!bill) return;
  const acc   = AppData.accounts.find((a) => a.id === bill.accountId);
  const debt  = bill.debtId ? AppData.debts.find((d) => d.id === bill.debtId) : null;

  const debtNotice = debt ? `
    <div class="info-panel info-panel--green">
      🔗 Linked to <strong>${esc(debt.name)}</strong> — current balance <strong>${fmt(debt.balance)}</strong>.<br>
      Paying this bill will reduce the debt balance by the amount paid.
    </div>` : '';

  showModal(`Pay: ${bill.name}`, `
    <div class="info-panel info-panel--green">
      Logging this payment will deduct from <strong>${esc(acc ? acc.name : '')}</strong>.
    </div>
    ${debtNotice}
    <div>
      <label class="form-label" for="f-amount">Amount Paid ($)</label>
      <input id="f-amount" class="form-input" type="number" value="${bill.amount}" min="0" step="0.01" />
    </div>
    <div>
      <label class="form-label" for="f-date">Date Paid</label>
      <input id="f-date" class="form-input" type="date" value="${todayISO()}" />
    </div>
    <div>
      <label class="form-label" for="f-note">Note <span class="form-hint-inline">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" autocomplete="off" />
    </div>
    <button class="btn btn--primary" data-action="save-bill-payment" data-bill-id="${esc(billId)}">
      ✅ Mark as Paid${debt ? ' & Reduce Debt' : ''}
    </button>
  `);
}

function saveBillPayment(billId) {
  const bill  = AppData.bills.find((b) => b.id === billId);
  if (!bill) return;
  const amount = numVal('f-amount');
  const date   = val('f-date') || todayISO();
  const note   = val('f-note');
  if (amount <= 0) { alert('Please enter a valid amount.'); return; }

  // Log the ledger transaction (deducts from account balance)
  logTransaction({ type: 'bill', name: bill.name, amount, date, category: bill.cat, accountId: bill.accountId, billId, note });

  // If linked to a debt, reduce its balance by the principal portion paid
  if (bill.debtId) {
    AppData.debts = AppData.debts.map((d) => {
      if (d.id !== bill.debtId) return d;
      // Subtract interest for this month to get principal portion
      const monthlyInterest = d.rate > 0 ? d.balance * (d.rate / 100) / 12 : 0;
      const principal       = Math.max(0, amount - monthlyInterest);
      return { ...d, balance: Math.max(0, d.balance - principal) };
    });
    saveAppData();
  }

  hideModal();
}

/* ── Register Modal ──────────────────────────────────────── */

function showRegisterModal() {
  const entries = getRunningBalances();
  const groups  = {};
  entries.forEach((e) => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const rows = sortedDates.length
    ? sortedDates.map((date) => `
        <p class="section-heading mt-4">${friendlyDate(date)}</p>
        ${groups[date].map((e) => renderLedgerRow(e, true)).join('')}
      `).join('')
    : '<div class="empty-state">No transactions yet — log income to get started</div>';

  // Running balance totals at top
  const totals = AppData.accounts.map((acc) => `
    <div class="register-total">
      <p class="register-total__name" data-acc-id="${esc(acc.id)}">${esc(acc.name)}</p>
      <p class="register-total__bal">${fmt(realBalance(acc.id))}</p>
      <p class="register-total__safe">Safe: ${fmt(safeToSpend(acc.id))}</p>
    </div>`).join('');

  showModal('Account Register', `
    <div class="register-totals">${totals}</div>
    <div class="register-entries">${rows}</div>
  `);
}

/* ── Expense CRUD ────────────────────────────────────────── */

function showExpenseForm() {
  const catGrid = SPENDING_CATEGORIES.map((c) => `
    <button class="cat-picker-btn" data-action="pick-spend-cat" data-cat="${esc(c.name)}" aria-label="${esc(c.name)}">
      <span class="cat-picker-btn__emoji">${c.emoji}</span>
      <span class="cat-picker-btn__name">${esc(c.name)}</span>
    </button>`).join('');

  showModal('Log an Expense', `
    <div class="receipt-scan-bar">
      <p class="receipt-scan-bar__label">Scan a receipt to auto-fill</p>
      <div class="receipt-scan-bar__btns">
        <button class="receipt-scan-btn" data-action="start-receipt-scan"><span>📷</span> Camera</button>
        <button class="receipt-scan-btn" data-action="open-gallery-direct"><span>🖼️</span> Upload</button>
      </div>
    </div>
    <div class="receipt-scan-bar__divider"><span>or enter manually</span></div>
    <div>
      <p class="form-label">Category</p>
      <div class="cat-picker" id="cat-picker">${catGrid}</div>
      <input type="hidden" id="f-category" value="" />
      <p class="cat-picker__hint" id="cat-hint">Tap a category above</p>
    </div>
    <div>
      <label class="form-label" for="f-store">Store / Description</label>
      <input id="f-store" class="form-input" type="text" placeholder="e.g. HEB, Walmart" autocomplete="off" />
    </div>
    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount" class="form-input" type="number" placeholder="0.00" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-date">Date</label>
        <input id="f-date" class="form-input" type="date" value="${todayISO()}" />
      </div>
    </div>
    <div>
      <label class="form-label" for="f-account">Charge to Account</label>
      <select id="f-account" class="form-input">${accountOptions(AppData.accounts[0].id)}</select>
    </div>
    <div>
      <label class="form-label" for="f-note">Note <span class="form-hint-inline">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" placeholder="e.g. weekly grocery run" autocomplete="off" />
    </div>
    <button class="btn btn--primary" data-action="save-expense">✅ Save Expense</button>
    <input id="receipt-camera"  type="file" accept="image/*" capture="environment" class="receipt-file-input" aria-hidden="true" />
    <input id="receipt-gallery" type="file" accept="image/*" class="receipt-file-input" aria-hidden="true" />
  `);

  requestAnimationFrame(() => {
    const cam = document.getElementById('receipt-camera');
    const gal = document.getElementById('receipt-gallery');
    if (cam) cam.addEventListener('change', handleReceiptFileChosen);
    if (gal) gal.addEventListener('change', handleReceiptFileChosen);
  });
}

function pickSpendCategory(catName) {
  document.querySelectorAll('.cat-picker-btn').forEach((btn) =>
    btn.classList.toggle('cat-picker-btn--active', btn.dataset.cat === catName)
  );
  const hidden = document.getElementById('f-category');
  if (hidden) hidden.value = catName;
  const hint  = document.getElementById('cat-hint');
  const match = SPENDING_CATEGORIES.find((c) => c.name === catName);
  if (hint && match) { hint.textContent = `${match.emoji} ${match.name} selected`; hint.classList.add('cat-picker__hint--selected'); }
}

function saveExpense() {
  const category  = val('f-category');
  const store     = val('f-store');
  const amount    = numVal('f-amount');
  const date      = val('f-date') || todayISO();
  const accountId = val('f-account') || AppData.accounts[0].id;
  const note      = val('f-note');
  if (!category) { alert('Please select a category.'); return; }
  if (!store)    { alert('Please enter a store or description.'); return; }
  if (amount <= 0) { alert('Please enter a valid amount.'); return; }
  logTransaction({ type: 'expense', name: store, amount, date, category, accountId, note });
  hideModal();
}

/* ── Bill Template CRUD ──────────────────────────────────── */

function showBillForm(id) {
  const bill   = id ? AppData.bills.find((b) => b.id === id) : null;
  const editId = bill ? esc(bill.id) : '';

  // Build the optional debt-link dropdown
  const debtOptions = [
    `<option value="">— None —</option>`,
    ...AppData.debts.map((d) =>
      `<option value="${esc(d.id)}" ${bill?.debtId === d.id ? 'selected' : ''}>${esc(d.name)} (${fmt(d.balance)})</option>`
    ),
  ].join('');

  showModal(bill ? 'Edit Bill' : 'Add New Bill', `
    <div>
      <label class="form-label" for="f-name">Bill Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. Netflix" value="${esc(bill?.name || '')}" autocomplete="off" />
    </div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-amount">Amount ($)</label><input id="f-amount" class="form-input" type="number" placeholder="0.00" value="${bill?.amount || ''}" min="0" step="0.01" /></div>
      <div><label class="form-label" for="f-day">Due Day (1–31)</label><input id="f-day" class="form-input" type="number" placeholder="15" value="${bill?.day || ''}" min="1" max="31" /></div>
    </div>
    <div><label class="form-label" for="f-cat">Category</label><select id="f-cat" class="form-input">${catOptions(bill?.cat || 'Housing')}</select></div>
    <div><label class="form-label" for="f-account">Account</label><select id="f-account" class="form-input">${accountOptions(bill?.accountId || AppData.accounts[0].id)}</select></div>
    <div>
      <label class="form-label" for="f-debt">Link to Debt <span class="form-hint-inline">(optional — payments will reduce the balance)</span></label>
      <select id="f-debt" class="form-input">${debtOptions}</select>
    </div>
    <label class="form-checkbox"><input id="f-auto" type="checkbox" ${bill?.auto ? 'checked' : ''} /> Autopay <span class="form-checkbox__note">(auto-deducted)</span></label>
    <button class="btn btn--primary" data-action="save-bill" data-edit-id="${editId}">💾 ${bill ? 'Update' : 'Add'} Bill</button>
  `);
}

function saveBill(editId) {
  const name      = val('f-name');
  const amount    = numVal('f-amount');
  const day       = numVal('f-day');
  const cat       = val('f-cat');
  const accountId = val('f-account') || AppData.accounts[0].id;
  const debtId    = val('f-debt') || null;
  const auto      = checkVal('f-auto');
  if (!name || amount <= 0 || day < 1 || day > 31) { alert('Please fill all fields correctly.'); return; }
  if (editId) {
    AppData.bills = AppData.bills.map((b) => b.id === editId ? { ...b, name, amount, day, cat, accountId, debtId, auto } : b);
  } else {
    AppData.bills.push({ id: uid(), name, amount, day, cat, accountId, debtId, auto });
    AppData.bills.sort((a, b) => a.day - b.day);
  }
  saveAppData(); hideModal();
}

function deleteBill(id) {
  if (!confirm('Delete this bill?')) return;
  AppData.bills = AppData.bills.filter((b) => b.id !== id);
  saveAppData();
}

/* ── Goal CRUD ───────────────────────────────────────────── */

function showGoalForm(id) {
  const goal   = id ? AppData.goals.find((g) => g.id === id) : null;
  const editId = goal ? esc(goal.id) : '';
  showModal(goal ? 'Edit Goal' : 'Add New Goal', `
    <div class="form-grid-icon">
      <div><label class="form-label" for="f-emoji">Icon</label><input id="f-emoji" class="form-input form-input--emoji" type="text" maxlength="2" value="${esc(goal?.emoji || '🎯')}" /></div>
      <div><label class="form-label" for="f-name">Goal Name</label><input id="f-name" class="form-input" type="text" placeholder="e.g. Hawaii Vacation" value="${esc(goal?.name || '')}" autocomplete="off" /></div>
    </div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-target">Target ($)</label><input id="f-target" class="form-input" type="number" placeholder="5000" value="${goal?.target || ''}" min="0" /></div>
      <div><label class="form-label" for="f-saved">Already Saved ($)</label><input id="f-saved" class="form-input" type="number" placeholder="0" value="${goal?.saved ?? 0}" min="0" /></div>
    </div>
    <div><label class="form-label" for="f-date">Target Date <span class="form-hint-inline">(optional)</span></label><input id="f-date" class="form-input" type="date" value="${esc(goal?.date || '')}" /></div>
    <button class="btn btn--primary" data-action="save-goal" data-edit-id="${editId}">💾 ${goal ? 'Update' : 'Add'} Goal</button>
  `);
}

function saveGoal(editId) {
  const emoji  = val('f-emoji') || '🎯';
  const name   = val('f-name');
  const target = numVal('f-target');
  const saved  = numVal('f-saved');
  const date   = val('f-date');
  if (!name || target <= 0) { alert('Please enter a name and target amount.'); return; }
  if (editId) {
    AppData.goals = AppData.goals.map((g) => g.id === editId ? { ...g, emoji, name, target, saved, date } : g);
  } else {
    AppData.goals.push({ id: uid(), emoji, name, target, saved, date });
  }
  saveAppData(); hideModal();
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  AppData.goals = AppData.goals.filter((g) => g.id !== id);
  saveAppData();
}

function showContributeForm(id) {
  const goal = AppData.goals.find((g) => g.id === id);
  if (!goal) return;
  showModal(`Add to ${goal.name}`, `
    <p class="form-hint">${fmt(goal.saved)} saved of ${fmt(goal.target)} goal</p>
    <div><label class="form-label" for="f-amount">Amount to Add ($)</label><input id="f-amount" class="form-input" type="number" placeholder="100" min="0" step="0.01" /></div>
    <button class="btn btn--primary" data-action="add-funds" data-id="${esc(id)}">✅ Add Funds</button>
  `);
}

function addFunds(id) {
  const amount = numVal('f-amount');
  if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
  AppData.goals = AppData.goals.map((g) => g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g);
  saveAppData(); hideModal();
}

/* ── Debt CRUD ───────────────────────────────────────────── */

function showDebtForm(id) {
  const debt   = id ? AppData.debts.find((d) => d.id === id) : null;
  const editId = debt ? esc(debt.id) : '';
  showModal(debt ? 'Edit Debt' : 'Add Debt', `
    <div><label class="form-label" for="f-name">Lender / Name</label><input id="f-name" class="form-input" type="text" placeholder="e.g. Car Loan" value="${esc(debt?.name || '')}" autocomplete="off" /></div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-balance">Balance ($)</label><input id="f-balance" class="form-input" type="number" placeholder="5000" value="${debt?.balance || ''}" min="0" step="0.01" /></div>
      <div><label class="form-label" for="f-payment">Payment ($)</label><input id="f-payment" class="form-input" type="number" placeholder="200" value="${debt?.payment || ''}" min="0" step="0.01" /></div>
    </div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-rate">Rate (%)</label><input id="f-rate" class="form-input" type="number" placeholder="6.5" value="${debt?.rate ?? ''}" min="0" step="0.1" /></div>
      <div><label class="form-label" for="f-day">Due Day</label><input id="f-day" class="form-input" type="number" placeholder="15" value="${debt?.day || ''}" min="1" max="31" /></div>
    </div>
    <button class="btn btn--primary" data-action="save-debt" data-edit-id="${editId}">💾 ${debt ? 'Update' : 'Add'} Debt</button>
  `);
}

function saveDebt(editId) {
  const name    = val('f-name');
  const balance = numVal('f-balance');
  const payment = numVal('f-payment');
  const rate    = numVal('f-rate');
  const day     = numVal('f-day') || 1;
  if (!name) { alert('Please enter a name.'); return; }
  if (editId) {
    AppData.debts = AppData.debts.map((d) => d.id === editId ? { ...d, name, balance, payment, rate, day } : d);
  } else {
    AppData.debts.push({ id: uid(), name, balance, payment, rate, day });
  }
  saveAppData(); hideModal();
}

function deleteDebt(id) {
  if (!confirm('Remove this debt?')) return;
  AppData.debts = AppData.debts.filter((d) => d.id !== id);
  saveAppData();
}

/* ── Income Template CRUD ────────────────────────────────── */

function showIncomeForm(id) {
  const inc    = id ? AppData.income.find((i) => i.id === id) : null;
  const editId = inc ? esc(inc.id) : '';
  showModal(inc ? 'Edit Income Source' : 'Add Income Source', `
    <div><label class="form-label" for="f-name">Source Name</label><input id="f-name" class="form-input" type="text" placeholder="e.g. VA Benefits" value="${esc(inc?.name || '')}" autocomplete="off" /></div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-amount">Expected Amount ($)</label><input id="f-amount" class="form-input" type="number" placeholder="0.00" value="${inc?.amount || ''}" min="0" step="0.01" /></div>
      <div><label class="form-label" for="f-day">Expected Day (1–31)</label><input id="f-day" class="form-input" type="number" placeholder="1" value="${inc?.day || ''}" min="1" max="31" /></div>
    </div>
    <div><label class="form-label" for="f-account">Account</label><select id="f-account" class="form-input">${accountOptions(inc?.accountId || AppData.accounts[0].id)}</select></div>
    <button class="btn btn--primary" data-action="save-income-template" data-edit-id="${editId}">💾 ${inc ? 'Update' : 'Add'} Income Source</button>
  `);
}

function saveIncomeTemplate(editId) {
  const name      = val('f-name');
  const amount    = numVal('f-amount');
  const day       = numVal('f-day') || 1;
  const accountId = val('f-account') || AppData.accounts[0].id;
  if (!name || amount <= 0) { alert('Please fill all fields.'); return; }
  if (editId) {
    AppData.income = AppData.income.map((i) => i.id === editId ? { ...i, name, amount, day, accountId } : i);
  } else {
    AppData.income.push({ id: uid(), name, amount, day, accountId });
  }
  saveAppData(); hideModal();
}

function deleteIncome(id) {
  if (!confirm('Remove this income source?')) return;
  AppData.income = AppData.income.filter((i) => i.id !== id);
  saveAppData();
}

/* ── Account Management ──────────────────────────────────── */

function showAccountForm(id) {
  const acc    = id ? AppData.accounts.find((a) => a.id === id) : null;
  const editId = acc ? esc(acc.id) : '';
  showModal(acc ? 'Edit Account' : 'Add Account', `
    <div><label class="form-label" for="f-name">Account Name</label><input id="f-name" class="form-input" type="text" placeholder="e.g. Checking" value="${esc(acc?.name || '')}" autocomplete="off" /></div>
    <button class="btn btn--primary" data-action="save-account" data-edit-id="${editId}">💾 ${acc ? 'Update' : 'Add'} Account</button>
  `);
}

function saveAccount(editId) {
  const name = val('f-name');
  if (!name) { alert('Please enter an account name.'); return; }
  if (editId) {
    AppData.accounts = AppData.accounts.map((a) => a.id === editId ? { ...a, name } : a);
  } else {
    AppData.accounts.push({ id: uid(), name, color: '#1b4332' });
  }
  saveAppData(); hideModal();
}

/* ── Sync Modal ──────────────────────────────────────────── */

function showSyncModal() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(AppData))));
  showModal('Sync Between Phones', `
    <div class="info-panel info-panel--green">
      <strong>To sync with your wife's phone:</strong><br>
      1. Tap <strong>Copy Code</strong> and send via iMessage<br>
      2. She opens app → Home → Sync Phones<br>
      3. She pastes the code and taps <strong>Import</strong>
    </div>
    <div>
      <div class="code-export">
        <label class="form-label" style="margin:0">Your Export Code</label>
        <button class="copy-btn" id="copy-btn" data-action="copy-code">📋 Copy</button>
      </div>
      <div class="code-box" id="export-code">${esc(code)}</div>
    </div>
    <hr class="sync-divider" />
    <div><label class="form-label" for="f-import">Import Code</label><textarea id="f-import" class="form-input form-input--mono" placeholder="Paste the export code here…"></textarea></div>
    <button class="btn btn--primary" data-action="import-data">⬇️ Import &amp; Sync</button>
    <p class="sync-note">⚠ Importing replaces all data on this phone</p>
    <hr class="sync-divider" />
    <p class="danger-zone-label">⚠ Danger Zone</p>
    <button class="btn btn--outline-red" data-action="show-reset-confirm">🗑 Reset All Data…</button>
  `);
}

/* ── Reset All Data ──────────────────────────────────────── */

function showResetConfirm() {
  showModal('Reset All Data', `
    <div class="info-panel info-panel--yellow">
      <strong>⚠ This cannot be undone.</strong><br>
      Every transaction, bill, income source, account, goal, and debt will be permanently deleted from this device and the server.
    </div>
    <div>
      <label class="form-label" for="f-reset-confirm">Type <strong>RESET</strong> to confirm</label>
      <input id="f-reset-confirm" class="form-input" type="text" placeholder="RESET"
             autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" />
    </div>
    <button class="btn btn--outline-red" data-action="confirm-reset-data">🗑 Delete Everything</button>
    <button class="btn btn--subtle" data-action="hide-modal">Cancel</button>
  `);
}

function confirmResetData() {
  if (val('f-reset-confirm') !== 'RESET') {
    alert('Please type RESET (all caps) to confirm.');
    return;
  }

  AppData = {
    accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
    bills:    DEFAULT_BILLS.map((b)    => ({ ...b })),
    income:   DEFAULT_INCOME.map((i)   => ({ ...i })),
    goals:    DEFAULT_GOALS.map((g)    => ({ ...g })),
    debts:    DEFAULT_DEBTS.map((d)    => ({ ...d })),
    ledger:   [],
  };

  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  saveAppData();
  hideModal();
  render();
}

function copyExportCode() {
  const code = document.getElementById('export-code')?.textContent || '';
  const btn  = document.getElementById('copy-btn');
  const done = () => { if (btn) btn.textContent = '✓ Copied!'; setTimeout(() => { if (btn) btn.textContent = '📋 Copy'; }, 2000); };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(done).catch(() => { _fallbackCopy(code); done(); });
  } else { _fallbackCopy(code); done(); }
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

function importData() {
  const raw = document.getElementById('f-import')?.value.trim();
  if (!raw) { alert('Please paste the export code first.'); return; }
  try {
    const imp = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!imp.bills || !imp.income || !imp.goals || !imp.debts) throw new Error('Invalid');
    if (!Array.isArray(imp.ledger))   imp.ledger   = [];
    if (!Array.isArray(imp.accounts)) imp.accounts = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
    AppData = imp;
    saveAppData(); hideModal();
    alert('✅ Data imported successfully!');
  } catch { alert('❌ Invalid code. Make sure you copied the full code.'); }
}

/* ── Install Modal ───────────────────────────────────────── */

function showInstallModal() {
  showModal('Install on Your Phone', `
    <div class="info-panel info-panel--yellow">
      <strong>🤖 Samsung Galaxy (Chrome):</strong><br>
      1. Open your GitHub Pages URL in <strong>Chrome</strong><br>
      2. Tap ⋮ menu → <strong>Add to Home Screen</strong><br>
      3. Tap <strong>Add</strong>
    </div>
    <div class="info-panel info-panel--yellow">
      <strong>🌐 Samsung Internet:</strong><br>
      Tap ≡ menu → <strong>Add page to</strong> → <strong>Home Screen</strong>
    </div>
    <button class="btn btn--primary" data-action="hide-modal">Got it!</button>
  `);
}
