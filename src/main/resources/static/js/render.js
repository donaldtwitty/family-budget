/**
 * render.js — Pure HTML-string rendering functions.
 *
 * Rules enforced here:
 *  - No inline event handlers (onclick, etc.)
 *  - No inline style attributes; dynamic values use data-* attributes
 *    and are applied via applyDynamicStyles() after insertion.
 *  - All interactivity is driven by data-action / data-id attributes
 *    handled centrally in app.js.
 */

/* eslint-disable no-unused-vars */

/* ── Header ─────────────────────────────────────────────── */

/**
 * Updates the sticky header with the latest totals.
 */
function updateHeader() {
  const inc   = totalIncome();
  const bills = totalBills();
  const spent = totalSpent();

  document.getElementById('hlbl').textContent   = viewMonthLabel();
  document.getElementById('hinc').textContent   = fmt(inc);
  document.getElementById('hbal').textContent   = fmt(inc - totalPaidBills() - spent);
  document.getElementById('hbills').textContent = fmt(bills);
  document.getElementById('hspent').textContent = fmt(spent);
  document.getElementById('hdebt').textContent  = fmt(totalDebt());
  document.getElementById('hgoals').textContent = fmt(totalSaved());
}

/* ── Dynamic style application ──────────────────────────── */

/**
 * After any render, call this to apply CSS custom properties
 * for progress bar widths declared via data-width attributes.
 */
function applyDynamicStyles() {
  document.querySelectorAll('[data-width]').forEach((el) => {
    el.style.setProperty('--fill-width', `${el.dataset.width}%`);
  });
}

/* ── Shared Partials ─────────────────────────────────────── */

/**
 * Renders a single bill row.
 * @param {object}  bill
 * @param {boolean} isPaid
 * @param {boolean} showEditControls
 * @param {boolean} isOverdue
 * @returns {string}
 */
function renderBillRow(bill, isPaid, showEditControls, isOverdue) {
  const paidClass    = isPaid    ? ' bill-row--paid'    : '';
  const overdueClass = isOverdue ? ' bill-row--overdue' : '';
  const toggleIcon   = isPaid    ? ICON_CHECK           : ICON_CIRCLE;
  const toggleClass  = isPaid    ? 'pay-toggle pay-toggle--checked' : 'pay-toggle';
  const dueClass     = isOverdue ? 'due-text due-text--overdue'     : 'due-text';
  const overdueText  = isOverdue ? ' — OVERDUE' : '';

  const editControls = showEditControls ? `
    <div class="edit-btns">
      <button class="icon-btn icon-btn--edit" data-action="edit-bill" data-id="${esc(bill.id)}" aria-label="Edit ${esc(bill.name)}">${ICON_PENCIL}</button>
      <button class="icon-btn icon-btn--del"  data-action="del-bill"  data-id="${esc(bill.id)}" aria-label="Delete ${esc(bill.name)}">${ICON_TRASH}</button>
    </div>` : '';

  return `
    <div class="card bill-row${paidClass}${overdueClass}">
      <button class="${toggleClass}"
              data-action="toggle-paid"
              data-id="${esc(bill.id)}"
              aria-label="${isPaid ? 'Mark unpaid' : 'Mark paid'}: ${esc(bill.name)}">
        ${toggleIcon}
      </button>
      <div class="bill-info">
        <div class="bill-name">
          <span class="bill-name-text">${esc(bill.name)}</span>
          ${bill.auto ? '<span class="auto-badge">AUTO</span>' : ''}
        </div>
        <div class="bill-meta">
          <span class="cat-badge ${catClass(bill.cat)}">${esc(bill.cat)}</span>
          <span class="${dueClass}">Due ${ord(bill.day)}${overdueText}</span>
        </div>
      </div>
      <div class="bill-right">
        <span class="bill-amount">${fmt(bill.amount)}</span>
        ${editControls}
      </div>
    </div>`;
}

/**
 * Renders a progress bar element.
 * Width is applied after insertion via applyDynamicStyles().
 * @param {number}          pct   - 0–100
 * @param {'dark'|'light'}  style
 * @param {'white'|'green'} fill
 * @returns {string}
 */
function renderProgressBar(pct, style, fill) {
  const clamped = clamp(Math.round(pct), 0, 100);
  return `
    <div class="progress-bar progress-bar--${style}">
      <div class="progress-fill progress-fill--${fill}" data-width="${clamped}"></div>
    </div>`;
}

/* ── Month Navigation ────────────────────────────────────── */

const ICON_CHEVRON_LEFT = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="15 18 9 12 15 6" stroke-linecap="round" fill="none"/>
  </svg>`;

const ICON_CHEVRON_RIGHT = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polyline points="9 6 15 12 9 18" stroke-linecap="round" fill="none"/>
  </svg>`;

function renderMonthNav() {
  return `
    <div class="month-nav">
      <button class="month-nav__btn" data-action="prev-month" aria-label="Previous month">${ICON_CHEVRON_LEFT}</button>
      <span class="month-nav__label">${esc(viewMonthLabel())}</span>
      <button class="month-nav__btn" data-action="next-month" aria-label="Next month">${ICON_CHEVRON_RIGHT}</button>
    </div>`;
}

/* ── Home Tab ────────────────────────────────────────────── */

/**
 * @param {boolean} showIncome
 * @returns {string}
 */
function renderHome(showIncome) {
  const paid    = getPaidSet();
  const tb      = totalBills();
  const paidAmt = AppData.bills.filter((b) => paid.has(b.id)).reduce((s, b) => s + b.amount, 0);
  const paidCnt = AppData.bills.filter((b) => paid.has(b.id)).length;
  const pct     = tb > 0 ? (paidAmt / tb) * 100 : 0;

  const vDay = viewDay();
  const overdue  = AppData.bills.filter((b) => !paid.has(b.id) && vDay > 0 && b.day <  vDay).sort((a, b) => a.day - b.day);
  const upcoming = AppData.bills.filter((b) => !paid.has(b.id) && vDay > 0 && b.day >= vDay && b.day <= vDay + 7).sort((a, b) => a.day - b.day);

  const incomeRows = AppData.income.map((i) => `
    <div class="card income-row">
      <div>
        <p class="income-row__name">${esc(i.name)}</p>
        <p class="income-row__day">Received on the ${ord(i.day)}</p>
      </div>
      <p class="income-row__amount">${fmt(i.amount)}</p>
    </div>`).join('');

  const overdueSection = overdue.length ? `
    <p class="section-heading section-heading--overdue">⚠️ Overdue (${overdue.length})</p>
    ${overdue.map((b) => renderBillRow(b, false, false, true)).join('')}` : '';

  const upcomingRows = upcoming.length
    ? upcoming.map((b) => renderBillRow(b, false, false, false)).join('')
    : '<div class="card empty-state">No bills due in the next 7 days 🎉</div>';

  const goalRows = AppData.goals.map((g) => {
    const p = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    return `
      <div class="card mb-8">
        <div class="goal-home-row">
          <div class="goal-home-row__identity">
            <span class="goal-card__emoji">${esc(g.emoji)}</span>
            <div>
              <p class="goal-card__name">${esc(g.name)}</p>
              <p class="income-row__day">${fmt(g.saved)} of ${fmt(g.target)}</p>
            </div>
          </div>
          <span class="goal-home-row__pct">${Math.round(p)}%</span>
        </div>
        ${renderProgressBar(p, 'light', 'green')}
      </div>`;
  }).join('');

  // Recent spending (last 3 entries)
  const recent = thisMonthSpending().slice(0, 3);
  const recentRows = recent.length ? recent.map((e) => `
    <div class="card spend-row">
      <span class="spend-row__emoji">${esc(spendEmoji(e.category))}</span>
      <div class="spend-row__info">
        <p class="spend-row__store">${esc(e.store)}</p>
        <p class="spend-row__cat">${esc(e.category)} · ${friendlyDate(e.date)}</p>
      </div>
      <span class="spend-row__amount">${fmt(e.amount)}</span>
    </div>`).join('') : '<div class="card empty-state">No spending logged this month yet</div>';

  return `
    ${renderMonthNav()}
    <div class="hero hero--green">
      <p class="hero__label">Bills Paid This Month</p>
      <p class="hero__amount">${Math.round(pct)}%</p>
      ${renderProgressBar(pct, 'dark', 'white')}
      <div class="hero__stats">
        <div><span>Paid </span><strong>${fmt(paidAmt)}</strong></div>
        <div><span>Left </span><strong>${fmt(tb - paidAmt)}</strong></div>
        <div>${paidCnt}/${AppData.bills.length} bills</div>
      </div>
    </div>

    <button class="section-toggle" data-action="toggle-inc" aria-expanded="${showIncome}">
      <span class="section-toggle__label">${ICON_DOLLAR} Monthly Income — ${fmt(totalIncome())}</span>
      <span class="section-toggle__icon">${showIncome ? ICON_CHEVRON_UP : ICON_CHEVRON_DOWN}</span>
    </button>
    ${showIncome ? incomeRows : ''}

    ${overdueSection}

    <p class="section-heading${overdue.length ? ' section-heading--spaced' : ''}">📅 Due This Week</p>
    ${upcomingRows}

    <p class="section-heading mt-6">🛒 Recent Spending</p>
    ${recentRows}
    <button class="btn btn--outline-green btn--icon mt-4" data-action="set-tab" data-tab="spend">
      View All Spending
    </button>

    <p class="section-heading mt-6">🎯 Savings Goals</p>
    ${goalRows}

    <button class="btn btn--outline-green btn--icon mt-6" data-action="show-sync">
      ⇄ Sync Between Phones
    </button>
    <button class="btn btn--subtle mt-8" data-action="show-install">
      📲 How to Install This App
    </button>
    <button class="btn btn--subtle mt-8" data-action="show-api-key-settings">
      🔑 Receipt Scan Settings
    </button>
    <button class="btn btn--subtle mt-8" data-action="show-pin-settings">
      🔐 PIN Lock Settings
    </button>`;
}

/* ── Bills Tab ───────────────────────────────────────────── */

/**
 * @param {boolean} showIncome
 * @param {string}  activeFilter
 * @returns {string}
 */
function renderBills(showIncome, activeFilter) {
  const paid    = getPaidSet();
  const paidAmt = AppData.bills.filter((b) => paid.has(b.id)).reduce((s, b) => s + b.amount, 0);
  const sorted  = [...AppData.bills].sort((a, b) => a.day - b.day);
  const filtered = activeFilter === 'All' ? sorted : sorted.filter((b) => b.cat === activeFilter);

  const incomeRows = AppData.income.map((i) => `
    <div class="card income-row">
      <div>
        <p class="income-row__name">${esc(i.name)}</p>
        <p class="income-row__day">Received ${ord(i.day)} of month</p>
      </div>
      <div class="income-row__right">
        <p class="income-row__amount">${fmt(i.amount)}</p>
        <button class="icon-btn icon-btn--edit" data-action="edit-income" data-id="${esc(i.id)}" aria-label="Edit ${esc(i.name)}">${ICON_PENCIL}</button>
        <button class="icon-btn icon-btn--del"  data-action="del-income"  data-id="${esc(i.id)}" aria-label="Delete ${esc(i.name)}">${ICON_TRASH}</button>
      </div>
    </div>`).join('');

  const chips = ['All', ...CATEGORIES].map((c) => `
    <button class="chip ${activeFilter === c ? 'active' : ''}"
            data-action="set-filter"
            data-filter="${esc(c)}">${esc(c)}</button>`).join('');

  return `
    ${renderMonthNav()}
    <div class="summary-grid">
      <div class="summary-card">
        <p class="summary-card__label">Total Monthly</p>
        <p class="summary-card__value">${fmt(totalBills())}</p>
      </div>
      <div class="summary-card">
        <p class="summary-card__label summary-card__label--green">Paid This Month</p>
        <p class="summary-card__value summary-card__value--green">${fmt(paidAmt)}</p>
      </div>
    </div>

    <button class="section-toggle" data-action="toggle-inc" aria-expanded="${showIncome}">
      <span class="section-toggle__label">${ICON_DOLLAR} Income Sources — ${fmt(totalIncome())}/mo</span>
      <span class="section-toggle__icon">${showIncome ? ICON_CHEVRON_UP : ICON_CHEVRON_DOWN}</span>
    </button>
    ${showIncome ? incomeRows + `<button class="btn btn--outline-green btn--icon mb-14" data-action="add-income">${ICON_PLUS} Add Income Source</button>` : ''}

    <div class="chips" role="group" aria-label="Filter by category">${chips}</div>

    ${filtered.map((b) => renderBillRow(b, paid.has(b.id), true, false)).join('')}

    <button class="btn btn--outline-green btn--icon mt-4" data-action="add-bill">${ICON_PLUS} Add Bill</button>`;
}

/* ── Spend Tab ───────────────────────────────────────────── */

/**
 * @param {string} spendFilter - category name or 'All'
 * @returns {string}
 */
function renderSpend(spendFilter) {
  const monthEntries = thisMonthSpending();
  const catBreakdown = spendingByCategory();
  const maxCatTotal  = catBreakdown.length > 0 ? catBreakdown[0].total : 1;

  const filtered = spendFilter === 'All'
    ? monthEntries
    : monthEntries.filter((e) => e.category === spendFilter);

  // Group entries by date
  const groups = {};
  filtered.forEach((e) => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  // Category breakdown bars
  const catBars = catBreakdown.slice(0, 6).map((c) => {
    const pct = (c.total / maxCatTotal) * 100;
    return `
      <div class="spend-cat-row">
        <div class="spend-cat-row__label">
          <span>${esc(c.emoji)}</span>
          <span class="spend-cat-row__name">${esc(c.name)}</span>
        </div>
        <div class="spend-cat-row__bar-wrap">
          <div class="progress-bar progress-bar--light">
            <div class="progress-fill progress-fill--green" data-width="${Math.round(pct)}"></div>
          </div>
        </div>
        <span class="spend-cat-row__total">${fmt(c.total)}</span>
      </div>`;
  }).join('');

  // Category filter chips (only cats that have spending this month)
  const usedCats = [...new Set(monthEntries.map((e) => e.category))];
  const chips = ['All', ...usedCats].map((c) => `
    <button class="chip ${spendFilter === c ? 'active' : ''}"
            data-action="set-spend-filter"
            data-filter="${esc(c)}">${esc(c)}</button>`).join('');

  // Transaction rows grouped by date
  const txRows = sortedDates.length ? sortedDates.map((date) => `
    <p class="section-heading mt-6">${friendlyDate(date)}</p>
    ${groups[date].map((e) => `
      <div class="card spend-row">
        <span class="spend-row__emoji">${esc(spendEmoji(e.category))}</span>
        <div class="spend-row__info">
          <p class="spend-row__store">${esc(e.store)}</p>
          <p class="spend-row__cat">${esc(e.category)}${e.note ? ` · ${esc(e.note)}` : ''}</p>
        </div>
        <div class="spend-row__right">
          <span class="spend-row__amount">${fmt(e.amount)}</span>
          <button class="icon-btn icon-btn--edit" data-action="edit-expense" data-id="${esc(e.id)}" aria-label="Edit expense">${ICON_PENCIL}</button>
          <button class="icon-btn icon-btn--del" data-action="del-expense" data-id="${esc(e.id)}" aria-label="Delete expense">${ICON_TRASH}</button>
        </div>
      </div>`).join('')}
  `).join('') : '<div class="card empty-state">No expenses logged yet this month 👍</div>';

  return `
    ${renderMonthNav()}
    <div class="hero hero--green">
      <p class="hero__label">Spent This Month</p>
      <p class="hero__amount">${fmt(totalSpent())}</p>
      <p class="hero__sub">${monthEntries.length} transaction${monthEntries.length !== 1 ? 's' : ''} logged</p>
    </div>

    <button class="btn btn--primary btn--icon" data-action="add-expense">
      ${ICON_PLUS} Log an Expense
    </button>

    ${catBreakdown.length ? `
      <p class="section-heading mt-6">📊 This Month by Category</p>
      <div class="card" style="padding: 14px 16px;">
        ${catBars}
      </div>` : ''}

    <div class="chips mt-6" role="group" aria-label="Filter by category">${chips}</div>

    ${txRows}`;
}

/* ── Goals Tab ───────────────────────────────────────────── */

/** @returns {string} */
function renderGoals() {
  const tTarget = AppData.goals.reduce((s, g) => s + g.target, 0);

  const goalCards = AppData.goals.map((g) => {
    const p        = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    const daysLeft = g.date ? Math.ceil((new Date(g.date + 'T00:00:00') - TODAY) / 86400000) : null;

    let daysClass = '';
    let daysText  = '';
    if (daysLeft !== null) {
      daysClass = daysLeft < 30 ? 'goal-card__days--urgent' : daysLeft < 90 ? 'goal-card__days--warning' : 'goal-card__days--normal';
      daysText  = daysLeft > 0 ? `${daysLeft} days left` : 'Target date reached';
    }

    return `
      <div class="card goal-card">
        <div class="goal-card__header">
          <div class="goal-card__identity">
            <span class="goal-card__emoji" aria-hidden="true">${esc(g.emoji)}</span>
            <div>
              <p class="goal-card__name">${esc(g.name)}</p>
              ${daysLeft !== null ? `<p class="goal-card__days ${daysClass}">${daysText}</p>` : ''}
            </div>
          </div>
          <div class="goal-card__actions">
            <button class="icon-btn icon-btn--edit" data-action="edit-goal" data-id="${esc(g.id)}" aria-label="Edit ${esc(g.name)}">${ICON_PENCIL}</button>
            <button class="icon-btn icon-btn--del"  data-action="del-goal"  data-id="${esc(g.id)}" aria-label="Delete ${esc(g.name)}">${ICON_TRASH}</button>
          </div>
        </div>

        <div class="stat-grid stat-grid--3">
          <div class="stat-box stat-box--saved">
            <p class="stat-box__label stat-box__label--green">Saved</p>
            <p class="stat-box__value stat-box__value--green">${fmt(g.saved)}</p>
          </div>
          <div class="stat-box stat-box--goal">
            <p class="stat-box__label stat-box__label--gray">Goal</p>
            <p class="stat-box__value stat-box__value--gray">${fmt(g.target)}</p>
          </div>
          <div class="stat-box stat-box--left">
            <p class="stat-box__label stat-box__label--yellow">Left</p>
            <p class="stat-box__value stat-box__value--yellow">${fmt(Math.max(0, g.target - g.saved))}</p>
          </div>
        </div>

        <div class="goal-card__progress-header">
          <span>Progress</span>
          <span class="goal-card__pct">${Math.round(p)}%</span>
        </div>
        ${renderProgressBar(p, 'light', 'green')}

        <button class="btn btn--solid-green btn--icon" data-action="contribute-goal" data-id="${esc(g.id)}">
          ${ICON_PLUS} Add Funds
        </button>
      </div>`;
  }).join('');

  return `
    ${renderMonthNav()}
    <div class="hero hero--green">
      <p class="hero__label">Total Saved</p>
      <p class="hero__amount">${fmt(totalSaved())}</p>
      <p class="hero__sub">of ${fmt(tTarget)} across ${AppData.goals.length} goals</p>
    </div>

    ${goalCards}

    <button class="btn btn--outline-green btn--icon mt-4" data-action="add-goal">${ICON_PLUS} Add Goal</button>`;
}

/* ── Debts Tab ───────────────────────────────────────────── */

/** @returns {string} */
function renderDebts() {
  const tPayments = AppData.debts.reduce((s, d) => s + d.payment, 0);

  const debtCards = AppData.debts.map((d) => {
    const payoffText = calcPayoff(d, TODAY);
    return `
      <div class="card debt-card">
        <div class="debt-card__header">
          <div>
            <p class="debt-card__name">${esc(d.name)}</p>
            <p class="debt-card__due">Due ${ord(d.day)} each month</p>
          </div>
          <div class="debt-card__actions">
            <button class="icon-btn icon-btn--edit" data-action="edit-debt" data-id="${esc(d.id)}" aria-label="Edit ${esc(d.name)}">${ICON_PENCIL}</button>
            <button class="icon-btn icon-btn--del"  data-action="del-debt"  data-id="${esc(d.id)}" aria-label="Delete ${esc(d.name)}">${ICON_TRASH}</button>
          </div>
        </div>

        <div class="stat-grid stat-grid--3">
          <div class="stat-box stat-box--balance">
            <p class="stat-box__label stat-box__label--red">Balance</p>
            <p class="stat-box__value stat-box__value--red">${fmt(d.balance)}</p>
          </div>
          <div class="stat-box stat-box--payment">
            <p class="stat-box__label stat-box__label--green">Payment</p>
            <p class="stat-box__value stat-box__value--green">${fmt(d.payment)}</p>
          </div>
          <div class="stat-box stat-box--rate">
            <p class="stat-box__label stat-box__label--yellow">Rate</p>
            <p class="stat-box__value stat-box__value--yellow">${d.rate}%</p>
          </div>
        </div>

        ${payoffText ? `<p class="debt-card__payoff">📅 ${payoffText}</p>` : ''}
      </div>`;
  }).join('');

  return `
    ${renderMonthNav()}
    <div class="hero hero--red">
      <p class="hero__label">Total Debt Balance</p>
      <p class="hero__amount">${fmt(totalDebt())}</p>
      <p class="hero__sub">Monthly payments: ${fmt(tPayments)}</p>
    </div>

    ${debtCards}

    <button class="btn btn--outline-red btn--icon mt-4" data-action="add-debt">${ICON_PLUS} Add Debt</button>`;
}
