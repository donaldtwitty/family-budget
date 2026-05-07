/**
 * render.js — Pure HTML-string renderers for every tab and the header.
 * No inline style= or onclick= anywhere in this file.
 */

/* eslint-disable no-unused-vars */

/* ── Header ─────────────────────────────────────────────── */

/**
 * Builds or refreshes the dual-account header cards.
 */
function updateHeader() {
  document.getElementById('hlbl').textContent = MONTH_LABEL;
  const container = document.getElementById('account-cards');
  if (!container) return;

  // Rebuild cards if they don't exist
  if (!document.getElementById(`acc-card-${AppData.accounts[0].id}`)) {
    container.innerHTML = AppData.accounts.map((acc) => `
      <div class="acc-card" id="acc-card-${esc(acc.id)}" data-acc-id="${esc(acc.id)}">
        <p class="acc-card__name" data-acc-id="${esc(acc.id)}">${esc(acc.name)}</p>
        <p class="acc-card__safe-label">Safe to Spend</p>
        <p class="acc-card__safe" id="safe-${esc(acc.id)}">—</p>
        <p class="acc-card__bal-label">Balance</p>
        <p class="acc-card__bal"  id="bal-${esc(acc.id)}">—</p>
      </div>`).join('');
  }

  AppData.accounts.forEach((acc) => {
    const bal    = realBalance(acc.id);
    const safe   = safeToSpend(acc.id);
    const safeEl = document.getElementById(`safe-${acc.id}`);
    const balEl  = document.getElementById(`bal-${acc.id}`);
    const cardEl = document.getElementById(`acc-card-${acc.id}`);
    if (safeEl) safeEl.textContent = fmt(safe);
    if (balEl)  balEl.textContent  = fmt(bal);
    if (cardEl) cardEl.dataset.state = safe < 0 ? 'negative' : safe < 100 ? 'warning' : 'positive';
  });
}

/* ── Dynamic styles ──────────────────────────────────────── */

/**
 * Applies --fill-width CSS custom property on [data-width] elements.
 * Also applies --acc-color on [data-acc-id] elements.
 */
function applyDynamicStyles() {
  document.querySelectorAll('[data-width]').forEach((el) => {
    el.style.setProperty('--fill-width', `${el.dataset.width}%`);
  });
  document.querySelectorAll('[data-acc-id]').forEach((el) => {
    const acc = AppData.accounts.find((a) => a.id === el.dataset.accId);
    if (acc) el.style.setProperty('--acc-color', acc.color);
  });
}

/* ── Shared partials ─────────────────────────────────────── */

/**
 * @param {number} pct
 * @param {'dark'|'light'} style
 * @param {'white'|'green'} fill
 * @returns {string}
 */
function renderProgressBar(pct, style, fill) {
  const w = clamp(Math.round(pct), 0, 100);
  return `<div class="progress-bar progress-bar--${style}">
    <div class="progress-fill progress-fill--${fill}" data-width="${w}"></div>
  </div>`;
}

/**
 * @param {object}  bill
 * @param {string}  status
 * @param {boolean} showEdit
 * @returns {string}
 */
function renderBillRow(bill, status, showEdit) {
  const acc      = AppData.accounts.find((a) => a.id === bill.accountId) || AppData.accounts[0];
  const editBtns = showEdit ? `
    <div class="edit-btns">
      <button class="icon-btn icon-btn--edit" data-action="edit-bill" data-id="${esc(bill.id)}">${ICON_PENCIL}</button>
      <button class="icon-btn icon-btn--del"  data-action="del-bill"  data-id="${esc(bill.id)}">${ICON_TRASH}</button>
    </div>` : '';
  const isPayable = status === 'pending' || status === 'overdue';

  return `
    <div class="card bill-row bill-row--${status}"
      ${isPayable ? `data-action="pay-bill" data-id="${esc(bill.id)}" role="button" tabindex="0"` : ''}>
      <span class="bill-status-badge bill-status-badge--${status}">${status.toUpperCase()}</span>
      <div class="bill-info">
        <div class="bill-name-row">
          <span class="bill-name-text">${esc(bill.name)}</span>
          ${bill.auto ? '<span class="auto-badge">AUTO</span>' : ''}
        </div>
        <div class="bill-meta">
          <span class="cat-badge ${catClass(bill.cat)}">${esc(bill.cat)}</span>
          <span class="due-text">Due ${ord(bill.day)}</span>
          <span class="acc-tag" data-acc-id="${esc(acc.id)}">${esc(acc.name)}</span>
        </div>
      </div>
      <div class="bill-right">
        <span class="bill-amount">${fmt(bill.amount)}</span>
        ${editBtns}
      </div>
    </div>`;
}

/**
 * @param {object}  entry
 * @param {boolean} showBalance
 * @returns {string}
 */
function renderLedgerRow(entry, showBalance) {
  const isIncome  = entry.type === 'income';
  const isExpense = entry.type === 'expense';
  const acc       = AppData.accounts.find((a) => a.id === entry.accountId);
  const emoji     = isIncome ? '💵' : isExpense ? spendEmoji(entry.category) : '🧾';

  const balanceCols = showBalance && entry.runningBalance
    ? `<div class="register-balances">
        ${AppData.accounts.map((a) => `
          <div class="register-bal ${a.id === entry.accountId ? 'register-bal--active' : ''}">
            <span class="register-bal__label">${esc(a.name)}</span>
            <span class="register-bal__val">${fmt(entry.runningBalance[a.id] || 0)}</span>
          </div>`).join('')}
       </div>` : '';

  return `
    <div class="ledger-row ledger-row--${entry.type}">
      <span class="ledger-row__emoji">${emoji}</span>
      <div class="ledger-row__info">
        <p class="ledger-row__name">${esc(entry.name)}</p>
        <p class="ledger-row__meta">${esc(acc ? acc.name : '')}${entry.category ? ` · ${esc(entry.category)}` : ''}${entry.note ? ` · ${esc(entry.note)}` : ''}</p>
      </div>
      <div class="ledger-row__right">
        <span class="ledger-row__amount ledger-row__amount--${isIncome ? 'in' : 'out'}">
          ${isIncome ? '+' : '−'}${fmt(entry.amount)}
        </span>
        <button class="icon-btn icon-btn--del" data-action="del-transaction" data-id="${esc(entry.id)}">${ICON_TRASH}</button>
      </div>
      ${balanceCols}
    </div>`;
}

/* ── Home Tab ────────────────────────────────────────────── */

/** @param {boolean} showIncome @returns {string} */
function renderHome(showIncome) {
  const allPending = AppData.bills
    .filter((b) => { const s = getBillStatus(b); return s === 'pending' || s === 'overdue'; })
    .sort((a, b) => a.day - b.day);

  const pendingRows = allPending.length
    ? allPending.map((b) => renderBillRow(b, getBillStatus(b), false)).join('')
    : '<div class="empty-state">No pending bills 🎉</div>';

  const recent     = getSortedLedger().slice(0, 5);
  const recentRows = recent.length
    ? recent.map((e) => renderLedgerRow(e, false)).join('')
    : '<div class="empty-state">No transactions yet — tap Log Income to start</div>';

  const goalMini = AppData.goals.map((g) => {
    const p = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    return `<div class="card goal-mini mb-8">
      <div class="goal-mini__row">
        <span class="goal-mini__emoji">${esc(g.emoji)}</span>
        <div class="goal-mini__info">
          <p class="goal-mini__name">${esc(g.name)}</p>
          <p class="goal-mini__sub">${fmt(g.saved)} of ${fmt(g.target)}</p>
        </div>
        <span class="goal-mini__pct">${Math.round(p)}%</span>
      </div>
      ${renderProgressBar(p, 'light', 'green')}
    </div>`;
  }).join('');

  const incomeCards = AppData.income.map((i) => {
    const acc = AppData.accounts.find((a) => a.id === i.accountId);
    return `<button class="income-source-btn" data-action="log-income-source" data-id="${esc(i.id)}">
      <span class="income-source-btn__name">${esc(i.name)}</span>
      <span class="income-source-btn__amt">${fmt(i.amount)}</span>
      <span class="income-source-btn__acc" data-acc-id="${esc(i.accountId)}">${esc(acc ? acc.name : '')}</span>
    </button>`;
  }).join('');

  return `
    <div class="log-income-bar">
      <button class="btn btn--log-income" data-action="show-log-income">
        ${ICON_DOLLAR} ${showIncome ? 'Hide Income' : 'Log Income'}
      </button>
      <button class="btn btn--register" data-action="show-register">
        ${ICON_BOOK} View Register
      </button>
    </div>
    ${showIncome ? `<div class="income-source-grid">${incomeCards}</div>` : ''}
    <p class="section-heading mt-6">⚠️ Pending Bills</p>
    ${pendingRows}
    <p class="section-heading mt-6">🕐 Recent Transactions</p>
    ${recentRows}
    ${AppData.goals.length ? `<p class="section-heading mt-6">🎯 Savings Goals</p>${goalMini}` : ''}
    <div class="settings-btns">
      <button class="btn btn--subtle" data-action="show-sync">⇄ Sync Phones</button>
      <button class="btn btn--subtle" data-action="show-install">📲 Install App</button>
      <button class="btn btn--subtle" data-action="show-pin-settings">🔐 PIN Lock</button>
      <button class="btn btn--subtle" data-action="show-api-key-settings">🔑 Receipt Scan</button>
    </div>`;
}

/* ── Bills Tab ───────────────────────────────────────────── */

/** @param {boolean} showIncome @param {string} activeFilter @returns {string} */
function renderBills(showIncome, activeFilter) {
  const accountSummaries = AppData.accounts.map((acc) => {
    const total = AppData.bills.filter((b) => b.accountId === acc.id).reduce((s, b) => s + b.amount, 0);
    return `<div class="summary-card">
      <p class="summary-card__label" data-acc-id="${esc(acc.id)}">${esc(acc.name)}</p>
      <p class="summary-card__value">${fmt(total)}/mo</p>
    </div>`;
  }).join('');

  const incomeRows = AppData.income.map((i) => {
    const acc = AppData.accounts.find((a) => a.id === i.accountId);
    return `<div class="card income-row">
      <div>
        <p class="income-row__name">${esc(i.name)}</p>
        <p class="income-row__day">Expected ${ord(i.day)} · <span data-acc-id="${esc(i.accountId)}">${esc(acc ? acc.name : '')}</span></p>
      </div>
      <div class="income-row__right">
        <p class="income-row__amount">${fmt(i.amount)}</p>
        <button class="icon-btn icon-btn--edit" data-action="edit-income" data-id="${esc(i.id)}">${ICON_PENCIL}</button>
        <button class="icon-btn icon-btn--del"  data-action="del-income"  data-id="${esc(i.id)}">${ICON_TRASH}</button>
      </div>
    </div>`;
  }).join('');

  const sorted   = [...AppData.bills].sort((a, b) => a.day - b.day);
  const filtered = activeFilter === 'All' ? sorted : sorted.filter((b) => b.cat === activeFilter);
  const chips    = ['All', ...BILL_CATEGORIES].map((c) =>
    `<button class="chip ${activeFilter === c ? 'active' : ''}" data-action="set-filter" data-filter="${esc(c)}">${esc(c)}</button>`
  ).join('');

  return `
    <div class="summary-grid">${accountSummaries}</div>
    <button class="section-toggle" data-action="toggle-inc" aria-expanded="${showIncome}">
      <span class="section-toggle__label">${ICON_DOLLAR} Income Sources</span>
      <span class="section-toggle__icon">${showIncome ? ICON_CHEVRON_UP : ICON_CHEVRON_DOWN}</span>
    </button>
    ${showIncome ? incomeRows + `<button class="btn btn--outline-green btn--icon mb-14" data-action="add-income">${ICON_PLUS} Add Income Source</button>` : ''}
    <div class="chips">${chips}</div>
    ${filtered.map((b) => renderBillRow(b, getBillStatus(b), true)).join('')}
    <button class="btn btn--outline-green btn--icon mt-4" data-action="add-bill">${ICON_PLUS} Add Bill</button>`;
}

/* ── Spend Tab ───────────────────────────────────────────── */

/** @param {string} spendFilter @returns {string} */
function renderSpend(spendFilter) {
  const entries      = thisMonthSpending();
  const catBreakdown = spendingByCategory();
  const maxTotal     = catBreakdown.length ? catBreakdown[0].total : 1;
  const filtered     = spendFilter === 'All' ? entries : entries.filter((e) => e.category === spendFilter);

  const groups = {};
  filtered.forEach((e) => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const catBars = catBreakdown.slice(0, 6).map((c) => {
    const pct = (c.total / maxTotal) * 100;
    return `<div class="spend-cat-row">
      <div class="spend-cat-row__label"><span>${esc(c.emoji)}</span><span class="spend-cat-row__name">${esc(c.name)}</span></div>
      <div class="spend-cat-row__bar-wrap">${renderProgressBar(pct, 'light', 'green')}</div>
      <span class="spend-cat-row__total">${fmt(c.total)}</span>
    </div>`;
  }).join('');

  const usedCats = [...new Set(entries.map((e) => e.category))];
  const chips    = ['All', ...usedCats].map((c) =>
    `<button class="chip ${spendFilter === c ? 'active' : ''}" data-action="set-spend-filter" data-filter="${esc(c)}">${esc(c)}</button>`
  ).join('');

  const txRows = sortedDates.length
    ? sortedDates.map((date) => `
        <p class="section-heading mt-6">${friendlyDate(date)}</p>
        ${groups[date].map((e) => renderLedgerRow(e, false)).join('')}
      `).join('')
    : '<div class="empty-state">No expenses logged this month yet 👍</div>';

  return `
    <div class="hero hero--green">
      <p class="hero__label">Spent This Month</p>
      <p class="hero__amount">${fmt(entries.reduce((s, e) => s + e.amount, 0))}</p>
      <p class="hero__sub">${entries.length} transaction${entries.length !== 1 ? 's' : ''} logged</p>
    </div>
    <div class="spend-actions">
      <button class="btn btn--primary btn--icon spend-actions__primary" data-action="add-expense">${ICON_PLUS} Log an Expense</button>
      <button class="btn btn--outline-green btn--icon desktop-only" data-action="start-csv-import">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Import Bank CSV
      </button>
    </div>
    ${catBreakdown.length ? `<p class="section-heading mt-6">📊 This Month by Category</p><div class="card">${catBars}</div>` : ''}
    <div class="chips mt-6">${chips}</div>
    ${txRows}`;
}

/* ── Goals Tab ───────────────────────────────────────────── */

/** @returns {string} */
function renderGoals() {
  const tTarget = AppData.goals.reduce((s, g) => s + g.target, 0);
  const cards   = AppData.goals.map((g) => {
    const p        = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    const daysLeft = g.date ? Math.ceil((new Date(g.date + 'T00:00:00') - TODAY) / 86400000) : null;
    const dClass   = daysLeft === null ? '' : daysLeft < 30 ? 'goal-card__days--urgent' : daysLeft < 90 ? 'goal-card__days--warning' : 'goal-card__days--normal';
    const dText    = daysLeft === null ? '' : daysLeft > 0 ? `${daysLeft} days left` : 'Target date reached';
    return `<div class="card goal-card">
      <div class="goal-card__header">
        <div class="goal-card__identity">
          <span class="goal-card__emoji">${esc(g.emoji)}</span>
          <div>
            <p class="goal-card__name">${esc(g.name)}</p>
            ${daysLeft !== null ? `<p class="goal-card__days ${dClass}">${dText}</p>` : ''}
          </div>
        </div>
        <div class="goal-card__actions">
          <button class="icon-btn icon-btn--edit" data-action="edit-goal" data-id="${esc(g.id)}">${ICON_PENCIL}</button>
          <button class="icon-btn icon-btn--del"  data-action="del-goal"  data-id="${esc(g.id)}">${ICON_TRASH}</button>
        </div>
      </div>
      <div class="stat-grid stat-grid--3">
        <div class="stat-box stat-box--saved"><p class="stat-box__label stat-box__label--green">SAVED</p><p class="stat-box__value stat-box__value--green">${fmt(g.saved)}</p></div>
        <div class="stat-box stat-box--goal"><p class="stat-box__label stat-box__label--gray">GOAL</p><p class="stat-box__value stat-box__value--gray">${fmt(g.target)}</p></div>
        <div class="stat-box stat-box--left"><p class="stat-box__label stat-box__label--yellow">LEFT</p><p class="stat-box__value stat-box__value--yellow">${fmt(Math.max(0, g.target - g.saved))}</p></div>
      </div>
      <div class="goal-card__progress-header"><span>Progress</span><span class="goal-card__pct">${Math.round(p)}%</span></div>
      ${renderProgressBar(p, 'light', 'green')}
      <button class="btn btn--solid-green btn--icon" data-action="contribute-goal" data-id="${esc(g.id)}">${ICON_PLUS} Add Funds</button>
    </div>`;
  }).join('');

  return `
    <div class="hero hero--green">
      <p class="hero__label">Total Saved</p>
      <p class="hero__amount">${fmt(totalSaved())}</p>
      <p class="hero__sub">of ${fmt(tTarget)} across ${AppData.goals.length} goals</p>
    </div>
    ${cards}
    <button class="btn btn--outline-green btn--icon mt-4" data-action="add-goal">${ICON_PLUS} Add Goal</button>`;
}

/* ── Debts Tab ───────────────────────────────────────────── */

/** @returns {string} */
function renderDebts() {
  const tPay  = AppData.debts.reduce((s, d) => s + d.payment, 0);
  const cards = AppData.debts.map((d) => {
    const payoff      = calcPayoff(d, TODAY);
    const linkedBill  = AppData.bills.find((b) => b.debtId === d.id);
    const linkedBadge = linkedBill
      ? `<span class="debt-linked-badge">🔗 Linked to "${esc(linkedBill.name)}" bill</span>`
      : `<span class="debt-linked-badge debt-linked-badge--none">No bill linked — <button class="debt-link-hint" data-action="add-bill">link a bill</button></span>`;

    return `<div class="card debt-card">
      <div class="debt-card__header">
        <div><p class="debt-card__name">${esc(d.name)}</p><p class="debt-card__due">Due ${ord(d.day)} each month</p></div>
        <div class="debt-card__actions">
          <button class="icon-btn icon-btn--edit" data-action="edit-debt" data-id="${esc(d.id)}">${ICON_PENCIL}</button>
          <button class="icon-btn icon-btn--del"  data-action="del-debt"  data-id="${esc(d.id)}">${ICON_TRASH}</button>
        </div>
      </div>
      <div class="stat-grid stat-grid--3">
        <div class="stat-box stat-box--balance"><p class="stat-box__label stat-box__label--red">BALANCE</p><p class="stat-box__value stat-box__value--red">${fmt(d.balance)}</p></div>
        <div class="stat-box stat-box--payment"><p class="stat-box__label stat-box__label--green">PAYMENT</p><p class="stat-box__value stat-box__value--green">${fmt(d.payment)}</p></div>
        <div class="stat-box stat-box--rate"><p class="stat-box__label stat-box__label--yellow">RATE</p><p class="stat-box__value stat-box__value--yellow">${d.rate}%</p></div>
      </div>
      ${payoff ? `<p class="debt-card__payoff">📅 ${payoff}</p>` : ''}
      ${linkedBadge}
    </div>`;
  }).join('');

  return `
    <div class="hero hero--red">
      <p class="hero__label">Total Debt Balance</p>
      <p class="hero__amount">${fmt(totalDebt())}</p>
      <p class="hero__sub">Monthly payments: ${fmt(tPay)}</p>
    </div>
    ${cards}
    <button class="btn btn--outline-red btn--icon mt-4" data-action="add-debt">${ICON_PLUS} Add Debt</button>`;
}
