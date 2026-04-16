/**
 * app.js — Application entry point.
 *
 * Responsibilities:
 *  - Initialize app state and register Service Worker
 *  - Control tab switching
 *  - Central click event delegator (all data-action routing)
 *  - Trigger renders
 */

/* ── App UI state ─────────────────────────────────────────── */
let currentTab   = 'home';
let showIncome   = false;
let activeFilter = 'All';
let spendFilter  = 'All';

/* ── Render orchestrator ─────────────────────────────────── */

/**
 * Re-renders the main content area and updates the header.
 * Called after any state mutation.
 */
function render() {
  updateHeader();

  const content = document.getElementById('content');

  switch (currentTab) {
    case 'home':
      content.innerHTML = renderHome(showIncome);
      break;
    case 'bills':
      content.innerHTML = renderBills(showIncome, activeFilter);
      break;
    case 'spend':
      content.innerHTML = renderSpend(spendFilter);
      break;
    case 'goals':
      content.innerHTML = renderGoals();
      break;
    case 'debts':
      content.innerHTML = renderDebts();
      break;
    default:
      content.innerHTML = '';
  }

  applyDynamicStyles();
}

/* ── Tab switching ───────────────────────────────────────── */

/**
 * Switches the active tab and re-renders content.
 * @param {string} tab
 */
function setTab(tab) {
  currentTab   = tab;
  showIncome   = false;
  activeFilter = 'All';
  spendFilter  = 'All';

  document.querySelectorAll('.nav-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Income toggle ───────────────────────────────────────── */
function toggleIncome() {
  showIncome = !showIncome;
  render();
}

/* ── Category filters ────────────────────────────────────── */
/** @param {string} filter */
function setFilter(filter) {
  activeFilter = filter;
  render();
}

/** @param {string} filter */
function setSpendFilter(filter) {
  spendFilter = filter;
  render();
}

/* ── Central click event delegator ──────────────────────── */
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const id     = target.dataset.id     || null;
  const editId = target.dataset.editId || null;
  const tab    = target.dataset.tab    || null;
  const filter = target.dataset.filter || null;
  const cat    = target.dataset.cat    || null;

  switch (action) {

    // ── Navigation ─────────────────────────────────────────
    case 'set-tab':
      setTab(tab);
      break;

    // ── Bill actions ───────────────────────────────────────
    case 'toggle-paid':
      togglePaid(id);
      render();
      break;
    case 'add-bill':
      showBillForm(null);
      break;
    case 'edit-bill':
      showBillForm(id);
      break;
    case 'del-bill':
      deleteBill(id);
      render();
      break;
    case 'save-bill':
      saveBill(editId);
      render();
      break;

    // ── Expense / Spending actions ─────────────────────────
    case 'add-expense':
      showExpenseForm();
      break;
    case 'pick-spend-cat':
      pickSpendCategory(cat);
      break;
    case 'save-expense':
      saveExpense();
      render();
      break;
    case 'edit-expense':
      showEditExpenseForm(id);
      break;
    case 'save-edit-expense':
      saveEditExpense(editId);
      render();
      break;
    case 'del-expense':
      deleteExpense(id);
      render();
      break;
    case 'set-spend-filter':
      setSpendFilter(filter);
      break;

    // ── Receipt scanning ───────────────────────────────────
    case 'start-receipt-scan':
      startReceiptScan();
      break;
    case 'show-receipt-picker':
      showReceiptSourcePicker();
      break;
    case 'open-camera':
      openCamera();
      break;
    case 'open-gallery':
      openGallery();
      break;
    case 'open-gallery-direct':
      (function () {
        const gal = document.getElementById('receipt-gallery');
        if (gal) gal.click();
      }());
      break;
    case 'save-api-key':
      saveApiKeyAndContinue();
      break;
    case 'clear-api-key':
      clearApiKey();
      break;
    case 'show-api-key-settings':
      showApiKeyModal();
      break;

    // ── Goal actions ───────────────────────────────────────
    case 'add-goal':
      showGoalForm(null);
      break;
    case 'edit-goal':
      showGoalForm(id);
      break;
    case 'del-goal':
      deleteGoal(id);
      render();
      break;
    case 'save-goal':
      saveGoal(editId);
      render();
      break;
    case 'contribute-goal':
      showContributeForm(id);
      break;
    case 'add-funds':
      addFunds(id);
      render();
      break;

    // ── Debt actions ───────────────────────────────────────
    case 'add-debt':
      showDebtForm(null);
      break;
    case 'edit-debt':
      showDebtForm(id);
      break;
    case 'del-debt':
      deleteDebt(id);
      render();
      break;
    case 'save-debt':
      saveDebt(editId);
      render();
      break;

    // ── Income actions ─────────────────────────────────────
    case 'add-income':
      showIncomeForm(null);
      break;
    case 'edit-income':
      showIncomeForm(id);
      break;
    case 'del-income':
      deleteIncome(id);
      render();
      break;
    case 'save-income':
      saveIncome(editId);
      render();
      break;

    // ── UI controls ────────────────────────────────────────
    case 'toggle-inc':
      toggleIncome();
      break;
    case 'set-filter':
      setFilter(filter);
      break;
    case 'prev-month':
      shiftMonth(-1);
      render();
      break;
    case 'next-month':
      shiftMonth(1);
      render();
      break;
    case 'hide-modal':
      hideModal();
      break;

    // ── Sync & install ─────────────────────────────────────
    case 'show-sync':
      showSyncModal();
      break;
    case 'show-install':
      showInstallModal();
      break;
    case 'copy-code':
      copyExportCode();
      break;
    case 'import-data':
      importData();
      render();
      break;

    // ── PIN lock ───────────────────────────────────────────
    case 'show-pin-settings':
      showPinSettings();
      break;
    case 'create-pin':
      hideModal();
      setTimeout(() => showPinScreen('create'), 200);
      break;
    case 'change-pin':
      hideModal();
      setTimeout(() => showPinScreen('change-old'), 200);
      break;
    case 'reset-pin':
      resetPin();
      break;

    default:
      console.warn(`Unhandled action: "${action}"`);
  }
});

/* ── Close modal on backdrop click ──────────────────────── */
document.getElementById('overlay').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) hideModal();
});

/* ── Close modal on Escape ───────────────────────────────── */
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideModal();
});

/* ── Service Worker ──────────────────────────────────────── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  }
}

/* ── Boot ────────────────────────────────────────────────── */
(async function init() {
  await loadAppData();
  render();
  registerServiceWorker();
  initPinLock();
})();
