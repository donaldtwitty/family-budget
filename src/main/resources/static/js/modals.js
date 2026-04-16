/**
 * modals.js — Modal display and all CRUD operations.
 */

/* eslint-disable no-unused-vars */

/* ── Modal infrastructure ────────────────────────────────── */

/**
 * Opens the modal sheet with a given title and body HTML.
 * @param {string} title
 * @param {string} bodyHtml
 */
function showModal(title, bodyHtml) {
  document.getElementById('sh-ttl').textContent = title;
  document.getElementById('sh-body').innerHTML  = bodyHtml;
  const overlay = document.getElementById('overlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  const firstInput = document.querySelector('#sh-body input, #sh-body select, #sh-body textarea, #sh-body button');
  if (firstInput) firstInput.focus();
}

/** Closes the modal sheet. */
function hideModal() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

/* ── Shared form helpers ─────────────────────────────────── */

/** @returns {string} <option> elements for bill category select */
function categoryOptions(selected) {
  return CATEGORIES.map((c) =>
    `<option value="${esc(c)}"${c === selected ? ' selected' : ''}>${esc(c)}</option>`
  ).join('');
}

/** Reads a trimmed string from a form field by id */
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/** Reads a float from a form field by id */
function numVal(id) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) || 0 : 0;
}

/** Reads a checkbox state by id */
function checkVal(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

/* ── Expense CRUD ────────────────────────────────────────── */

/**
 * Shows the "Log an Expense" modal with scan receipt buttons
 * at the top and a manual entry form below.
 */
function showExpenseForm() {
  const catGrid = SPENDING_CATEGORIES.map((c) => `
    <button class="cat-picker-btn"
            data-action="pick-spend-cat"
            data-cat="${esc(c.name)}"
            aria-label="${esc(c.name)}">
      <span class="cat-picker-btn__emoji">${c.emoji}</span>
      <span class="cat-picker-btn__name">${esc(c.name)}</span>
    </button>`).join('');

  showModal('Log an Expense', `
    <div class="receipt-scan-bar">
      <p class="receipt-scan-bar__label">Scan a receipt to auto-fill</p>
      <div class="receipt-scan-bar__btns">
        <button class="receipt-scan-btn" data-action="start-receipt-scan">
          <span>📷</span> Camera
        </button>
        <button class="receipt-scan-btn" data-action="open-gallery-direct">
          <span>🖼️</span> Upload
        </button>
      </div>
    </div>

    <div class="receipt-scan-bar__divider">
      <span>or enter manually</span>
    </div>

    <div>
      <p class="form-label">Category</p>
      <div class="cat-picker" id="cat-picker" role="group" aria-label="Spending category">${catGrid}</div>
      <input type="hidden" id="f-category" value="" />
      <p class="cat-picker__hint" id="cat-hint">Tap a category above</p>
    </div>

    <div>
      <label class="form-label" for="f-store">Store / Description</label>
      <input id="f-store" class="form-input" type="text" placeholder="e.g. HEB, Walmart, Target" autocomplete="off" />
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
      <label class="form-label" for="f-note">Note <span class="form-checkbox__note">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" placeholder="e.g. weekly grocery run" autocomplete="off" />
    </div>

    <button class="btn btn--primary" data-action="save-expense">
      ✅ Save Expense
    </button>

    <!-- Hidden file inputs used by receipt scanner -->
    <input id="receipt-camera"
           type="file"
           accept="image/*"
           capture="environment"
           class="receipt-file-input"
           aria-hidden="true" />
    <input id="receipt-gallery"
           type="file"
           accept="image/*"
           class="receipt-file-input"
           aria-hidden="true" />
  `);

  attachReceiptListeners();
}

/**
 * Called when a category button is tapped in the expense form.
 * Highlights the selected category and stores the value.
 * @param {string} catName
 */
function pickSpendCategory(catName) {
  document.querySelectorAll('.cat-picker-btn').forEach((btn) => {
    btn.classList.toggle('cat-picker-btn--active', btn.dataset.cat === catName);
  });
  const hidden = document.getElementById('f-category');
  if (hidden) hidden.value = catName;
  const hint = document.getElementById('cat-hint');
  if (hint) {
    const match = SPENDING_CATEGORIES.find((c) => c.name === catName);
    hint.textContent = match ? `${match.emoji} ${match.name} selected` : '';
    hint.classList.add('cat-picker__hint--selected');
  }
}

function saveExpense() {
  const category = val('f-category');
  const store    = val('f-store');
  const amount   = numVal('f-amount');
  const date     = val('f-date') || todayISO();
  const note     = val('f-note');

  if (!category) { alert('Please select a category.');    return; }
  if (!store)    { alert('Please enter a store or description.'); return; }
  if (amount <= 0) { alert('Please enter a valid amount.'); return; }

  AppData.spending.push({ id: uid(), category, store, amount, date, note });
  saveAppData();
  hideModal();
}

function deleteExpense(id) {
  if (!confirm('Remove this expense?')) return;
  AppData.spending = AppData.spending.filter((e) => e.id !== id);
  saveAppData();
}

function showEditExpenseForm(id) {
  const exp = AppData.spending.find((e) => e.id === id);
  if (!exp) return;

  const catGrid = SPENDING_CATEGORIES.map((c) => `
    <button class="cat-picker-btn${c.name === exp.category ? ' cat-picker-btn--active' : ''}"
            data-action="pick-spend-cat"
            data-cat="${esc(c.name)}"
            aria-label="${esc(c.name)}">
      <span class="cat-picker-btn__emoji">${c.emoji}</span>
      <span class="cat-picker-btn__name">${esc(c.name)}</span>
    </button>`).join('');

  showModal('Edit Expense', `
    <div>
      <p class="form-label">Category</p>
      <div class="cat-picker" id="cat-picker" role="group" aria-label="Spending category">${catGrid}</div>
      <input type="hidden" id="f-category" value="${esc(exp.category)}" />
      <p class="cat-picker__hint cat-picker__hint--selected" id="cat-hint">${esc(spendEmoji(exp.category))} ${esc(exp.category)} selected</p>
    </div>

    <div>
      <label class="form-label" for="f-store">Store / Description</label>
      <input id="f-store" class="form-input" type="text" value="${esc(exp.store)}" autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount" class="form-input" type="number" value="${exp.amount}" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-date">Date</label>
        <input id="f-date" class="form-input" type="date" value="${esc(exp.date)}" />
      </div>
    </div>

    <div>
      <label class="form-label" for="f-note">Note <span class="form-checkbox__note">(optional)</span></label>
      <input id="f-note" class="form-input" type="text" value="${esc(exp.note || '')}" autocomplete="off" />
    </div>

    <button class="btn btn--primary" data-action="save-edit-expense" data-edit-id="${esc(id)}">
      💾 Update Expense
    </button>
  `);
}

function saveEditExpense(editId) {
  const category = val('f-category');
  const store    = val('f-store');
  const amount   = numVal('f-amount');
  const date     = val('f-date') || todayISO();
  const note     = val('f-note');

  if (!category) { alert('Please select a category.');    return; }
  if (!store)    { alert('Please enter a store or description.'); return; }
  if (amount <= 0) { alert('Please enter a valid amount.'); return; }

  AppData.spending = AppData.spending.map((e) =>
    e.id === editId ? { ...e, category, store, amount, date, note } : e
  );
  saveAppData();
  hideModal();
}

/* ── Bill CRUD ───────────────────────────────────────────── */

/** @param {string|null} id */
function showBillForm(id) {
  const bill   = id ? AppData.bills.find((b) => b.id === id) : null;
  const editId = bill ? esc(bill.id) : '';

  showModal(bill ? 'Edit Bill' : 'Add New Bill', `
    <div>
      <label class="form-label" for="f-name">Bill Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. Netflix" value="${esc(bill?.name || '')}" autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount" class="form-input" type="number" placeholder="0.00" value="${bill?.amount || ''}" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-day">Due Day (1–31)</label>
        <input id="f-day" class="form-input" type="number" placeholder="15" value="${bill?.day || ''}" min="1" max="31" />
      </div>
    </div>

    <div>
      <label class="form-label" for="f-cat">Category</label>
      <select id="f-cat" class="form-input">${categoryOptions(bill?.cat || 'Housing')}</select>
    </div>

    <label class="form-checkbox">
      <input id="f-auto" type="checkbox" ${bill?.auto ? 'checked' : ''} />
      Autopay <span class="form-checkbox__note">(automatically deducted)</span>
    </label>

    <button class="btn btn--primary" data-action="save-bill" data-edit-id="${editId}">
      💾 ${bill ? 'Update' : 'Add'} Bill
    </button>
  `);
}

function saveBill(editId) {
  const name   = val('f-name');
  const amount = numVal('f-amount');
  const day    = numVal('f-day');
  const cat    = val('f-cat');
  const auto   = checkVal('f-auto');

  if (!name || amount <= 0 || day < 1 || day > 31) {
    alert('Please fill all fields correctly.');
    return;
  }

  if (editId) {
    AppData.bills = AppData.bills.map((b) =>
      b.id === editId ? { ...b, name, amount, day, cat, auto } : b
    );
  } else {
    AppData.bills.push({ id: uid(), name, amount, day, cat, auto });
    AppData.bills.sort((a, b) => a.day - b.day);
  }

  saveAppData();
  hideModal();
}

function deleteBill(id) {
  if (!confirm('Delete this bill?')) return;
  AppData.bills = AppData.bills.filter((b) => b.id !== id);
  saveAppData();
}

/* ── Goal CRUD ───────────────────────────────────────────── */

/** @param {string|null} id */
function showGoalForm(id) {
  const goal   = id ? AppData.goals.find((g) => g.id === id) : null;
  const editId = goal ? esc(goal.id) : '';

  showModal(goal ? 'Edit Goal' : 'Add New Goal', `
    <div class="form-grid-icon">
      <div>
        <label class="form-label" for="f-emoji">Icon</label>
        <input id="f-emoji" class="form-input form-input--emoji" type="text" maxlength="2" value="${esc(goal?.emoji || '🎯')}" />
      </div>
      <div>
        <label class="form-label" for="f-name">Goal Name</label>
        <input id="f-name" class="form-input" type="text" placeholder="e.g. Hawaii Vacation" value="${esc(goal?.name || '')}" autocomplete="off" />
      </div>
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-target">Target Amount ($)</label>
        <input id="f-target" class="form-input" type="number" placeholder="5000" value="${goal?.target || ''}" min="0" />
      </div>
      <div>
        <label class="form-label" for="f-saved">Already Saved ($)</label>
        <input id="f-saved" class="form-input" type="number" placeholder="0" value="${goal?.saved ?? 0}" min="0" />
      </div>
    </div>

    <div>
      <label class="form-label" for="f-date">Target Date <span class="form-checkbox__note">(optional)</span></label>
      <input id="f-date" class="form-input" type="date" value="${esc(goal?.date || '')}" />
    </div>

    <button class="btn btn--primary" data-action="save-goal" data-edit-id="${editId}">
      💾 ${goal ? 'Update' : 'Add'} Goal
    </button>
  `);
}

function saveGoal(editId) {
  const emoji  = val('f-emoji') || '🎯';
  const name   = val('f-name');
  const target = numVal('f-target');
  const saved  = numVal('f-saved');
  const date   = val('f-date');

  if (!name || target <= 0) {
    alert('Please enter a name and target amount.');
    return;
  }

  if (editId) {
    AppData.goals = AppData.goals.map((g) =>
      g.id === editId ? { ...g, emoji, name, target, saved, date } : g
    );
  } else {
    AppData.goals.push({ id: uid(), emoji, name, target, saved, date });
  }

  saveAppData();
  hideModal();
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  AppData.goals = AppData.goals.filter((g) => g.id !== id);
  saveAppData();
}

/** @param {string} id - goal id */
function showContributeForm(id) {
  const goal = AppData.goals.find((g) => g.id === id);
  if (!goal) return;

  showModal(`Add to ${goal.name}`, `
    <p style="color:#6b7280;font-size:14px">${fmt(goal.saved)} saved of ${fmt(goal.target)} goal</p>

    <div>
      <label class="form-label" for="f-amount">Amount to Add ($)</label>
      <input id="f-amount" class="form-input" type="number" placeholder="100" min="0" step="0.01" />
    </div>

    <button class="btn btn--primary" data-action="add-funds" data-id="${esc(id)}">
      ✅ Add Funds
    </button>
  `);
}

function addFunds(id) {
  const amount = numVal('f-amount');
  if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }

  AppData.goals = AppData.goals.map((g) =>
    g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
  );

  saveAppData();
  hideModal();
}

/* ── Debt CRUD ───────────────────────────────────────────── */

/** @param {string|null} id */
function showDebtForm(id) {
  const debt   = id ? AppData.debts.find((d) => d.id === id) : null;
  const editId = debt ? esc(debt.id) : '';

  showModal(debt ? 'Edit Debt' : 'Add Debt', `
    <div>
      <label class="form-label" for="f-name">Lender / Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. Car Loan" value="${esc(debt?.name || '')}" autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-balance">Current Balance ($)</label>
        <input id="f-balance" class="form-input" type="number" placeholder="5000" value="${debt?.balance || ''}" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-payment">Monthly Payment ($)</label>
        <input id="f-payment" class="form-input" type="number" placeholder="200" value="${debt?.payment || ''}" min="0" step="0.01" />
      </div>
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-rate">Interest Rate (%)</label>
        <input id="f-rate" class="form-input" type="number" placeholder="6.5" value="${debt?.rate ?? ''}" min="0" step="0.1" />
      </div>
      <div>
        <label class="form-label" for="f-day">Due Day (1–31)</label>
        <input id="f-day" class="form-input" type="number" placeholder="15" value="${debt?.day || ''}" min="1" max="31" />
      </div>
    </div>

    <button class="btn btn--primary" data-action="save-debt" data-edit-id="${editId}">
      💾 ${debt ? 'Update' : 'Add'} Debt
    </button>
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
    AppData.debts = AppData.debts.map((d) =>
      d.id === editId ? { ...d, name, balance, payment, rate, day } : d
    );
  } else {
    AppData.debts.push({ id: uid(), name, balance, payment, rate, day });
  }

  saveAppData();
  hideModal();
}

function deleteDebt(id) {
  if (!confirm('Remove this debt?')) return;
  AppData.debts = AppData.debts.filter((d) => d.id !== id);
  saveAppData();
}

/* ── Income CRUD ─────────────────────────────────────────── */

/** @param {string|null} id */
function showIncomeForm(id) {
  const inc    = id ? AppData.income.find((i) => i.id === id) : null;
  const editId = inc ? esc(inc.id) : '';

  showModal(inc ? 'Edit Income' : 'Add Income Source', `
    <div>
      <label class="form-label" for="f-name">Source Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. VA Benefits" value="${esc(inc?.name || '')}" autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount" class="form-input" type="number" placeholder="0.00" value="${inc?.amount || ''}" min="0" step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-day">Pay Day (1–31)</label>
        <input id="f-day" class="form-input" type="number" placeholder="6" value="${inc?.day || ''}" min="1" max="31" />
      </div>
    </div>

    <button class="btn btn--primary" data-action="save-income" data-edit-id="${editId}">
      💾 ${inc ? 'Update' : 'Add'} Income Source
    </button>
  `);
}

function saveIncome(editId) {
  const name   = val('f-name');
  const amount = numVal('f-amount');
  const day    = numVal('f-day') || 1;

  if (!name || amount <= 0) { alert('Please fill all fields.'); return; }

  if (editId) {
    AppData.income = AppData.income.map((i) =>
      i.id === editId ? { ...i, name, amount, day } : i
    );
  } else {
    AppData.income.push({ id: uid(), name, amount, day });
  }

  saveAppData();
  hideModal();
}

function deleteIncome(id) {
  if (!confirm('Remove this income source?')) return;
  AppData.income = AppData.income.filter((i) => i.id !== id);
  saveAppData();
}

/* ── Sync Modal ──────────────────────────────────────────── */

function showSyncModal() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(AppData))));

  showModal('Sync Between Phones', `
    <div class="info-panel info-panel--green">
      <strong>To share your budget:</strong><br>
      1. Tap <strong>Copy Code</strong> and send it via iMessage<br>
      2. She opens the app → Home → <em>Sync Between Phones</em><br>
      3. She pastes the code below and taps <strong>Import</strong>
    </div>

    <div>
      <div class="code-export">
        <label class="form-label" style="margin:0">Your Export Code</label>
        <button class="copy-btn" id="copy-btn" data-action="copy-code">📋 Copy</button>
      </div>
      <div class="code-box" id="export-code">${esc(code)}</div>
    </div>

    <hr class="sync-divider" />

    <div>
      <label class="form-label" for="f-import">Import Code (paste from other phone)</label>
      <textarea id="f-import" class="form-input form-input--mono" placeholder="Paste the export code here…"></textarea>
    </div>

    <button class="btn btn--primary" data-action="import-data">⬇️ Import &amp; Sync</button>
    <p class="sync-note">⚠ Importing replaces all data on this phone</p>
  `);
}

function copyExportCode() {
  const code = document.getElementById('export-code')?.textContent || '';
  const btn  = document.getElementById('copy-btn');
  const done = () => {
    if (btn) btn.textContent = '✓ Copied!';
    setTimeout(() => { if (btn) btn.textContent = '📋 Copy'; }, 2000);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(done).catch(() => { fallbackCopy(code); done(); });
  } else {
    fallbackCopy(code); done();
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function importData() {
  const raw = document.getElementById('f-import')?.value.trim();
  if (!raw) { alert('Please paste the export code first.'); return; }
  try {
    const imported = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!imported.bills || !imported.income || !imported.goals || !imported.debts) throw new Error('Invalid');
    if (!Array.isArray(imported.spending)) imported.spending = [];
    AppData = imported;
    saveAppData();
    hideModal();
    alert('✅ Data imported successfully!');
  } catch {
    alert('❌ Invalid code. Make sure you copied the full code from the other phone.');
  }
}

/* ── Install Modal ───────────────────────────────────────── */

function showInstallModal() {
  showModal('Install on Your Phone', `
    <div class="info-panel info-panel--yellow">
      <strong>🤖 Samsung Galaxy (Chrome):</strong><br>
      1. Open the app URL in <strong>Chrome</strong><br>
      2. Tap the <strong>⋮ menu</strong> → <strong>"Add to Home Screen"</strong><br>
      3. Tap <strong>Add</strong> — done!
    </div>
    <div class="info-panel info-panel--yellow">
      <strong>🌐 Samsung Internet:</strong><br>
      1. Open the URL in <strong>Samsung Internet</strong><br>
      2. Tap <strong>≡ menu</strong> → <strong>Add page to</strong> → <strong>Home Screen</strong>
    </div>
    <div class="info-panel info-panel--gray">
      <strong>💡 Keeping in sync:</strong><br>
      Both phones use the same GitHub Pages URL.
      Use <strong>Sync Between Phones</strong> on the Home tab to share data between devices.
    </div>
    <button class="btn btn--primary" data-action="hide-modal">Got it!</button>
  `);
}
