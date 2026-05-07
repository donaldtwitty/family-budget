/**
 * app.js — Application entry point.
 * Controls tab state and routes ALL click events via data-action delegation.
 */

/* eslint-disable no-unused-vars */

/* ── UI State ─────────────────────────────────────────────── */
let currentTab   = 'home';
let showIncome   = false;
let activeFilter = 'All';
let spendFilter  = 'All';

/* ── Render ──────────────────────────────────────────────── */

/**
 * Re-renders the active tab content and refreshes the header.
 */
function render() {
  updateHeader();
  const content = document.getElementById('content');
  switch (currentTab) {
    case 'home':   content.innerHTML = renderHome(showIncome);           break;
    case 'bills':  content.innerHTML = renderBills(showIncome, activeFilter); break;
    case 'spend':  content.innerHTML = renderSpend(spendFilter);         break;
    case 'goals':  content.innerHTML = renderGoals();                    break;
    case 'debts':  content.innerHTML = renderDebts();                    break;
    default:       content.innerHTML = '';
  }
  applyDynamicStyles();
  _applyAccountColors();
}

/**
 * Applies account accent colors to all [data-acc-id] elements.
 * This is the only place dynamic color is applied — never inline style in HTML.
 */
function _applyAccountColors() {
  document.querySelectorAll('[data-acc-id]').forEach((el) => {
    const acc = AppData.accounts.find((a) => a.id === el.dataset.accId);
    if (acc) el.style.setProperty('--acc-color', acc.color);
  });
}

/* ── Tab Switching ───────────────────────────────────────── */

/**
 * @param {string} tab
 */
function setTab(tab) {
  currentTab   = tab;
  showIncome   = false;
  activeFilter = 'All';
  spendFilter  = 'All';

  document.querySelectorAll('.nav-tab').forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });

  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Central Click Delegator ─────────────────────────────── */

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action   = target.dataset.action;
  const id       = target.dataset.id       || null;
  const editId   = target.dataset.editId   || null;
  const tab      = target.dataset.tab      || null;
  const filter   = target.dataset.filter   || null;
  const cat      = target.dataset.cat      || null;
  const billId   = target.dataset.billId   || null;
  const incomeId = target.dataset.incomeId || null;

  switch (action) {

    // ── Navigation ─────────────────────────────────────────
    case 'set-tab': setTab(tab); break;

    // ── Home ───────────────────────────────────────────────
    case 'show-log-income':
      showIncome = !showIncome;
      render();
      break;
    case 'log-income-source':
      showLogIncomeConfirm(id);
      break;
    case 'log-income-manual':
      showLogIncomeManual();
      break;
    case 'save-income-entry':
      saveIncomeEntry(target.dataset.incomeId);
      render();
      break;
    case 'save-income-manual':
      saveIncomeManual();
      render();
      break;
    case 'show-register':
      showRegisterModal();
      break;

    // ── Bills ──────────────────────────────────────────────
    case 'pay-bill':
      showPayBillModal(id);
      break;
    case 'save-bill-payment':
      saveBillPayment(target.dataset.billId);
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

    // ── Income Templates ───────────────────────────────────
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
    case 'save-income-template':
      saveIncomeTemplate(editId);
      render();
      break;

    // ── Spending ───────────────────────────────────────────
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
    case 'del-transaction':
      deleteTransaction(id);
      render();
      break;
    case 'set-spend-filter':
      spendFilter = filter;
      render();
      break;

    // ── Receipt Scanning ───────────────────────────────────
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
      document.getElementById('receipt-gallery')?.click();
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

    // ── Goals ──────────────────────────────────────────────
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

    // ── Debts ──────────────────────────────────────────────
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

    // ── Filters ────────────────────────────────────────────
    case 'toggle-inc':
      showIncome = !showIncome;
      render();
      break;
    case 'set-filter':
      activeFilter = filter;
      render();
      break;
    case 'hide-modal':
      hideModal();
      break;

    // ── PIN ────────────────────────────────────────────────
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

    // ── CSV Import ────────────────────────────────────────
    case 'start-csv-import':
      startCsvImport();
      break;
    case 'process-csv-import':
      processCsvImport();
      break;
    case 'confirm-csv-import':
      confirmCsvImport();
      break;

    // ── Sync & Install ─────────────────────────────────────
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

    default:
      console.warn(`Unhandled action: "${action}"`);
  }
});

/* ── Modal close handlers ────────────────────────────────── */
document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideModal();
});

/* ── Service Worker ──────────────────────────────────────── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) =>
      console.warn('SW registration failed:', err)
    );
  }
}

/* ── Boot ────────────────────────────────────────────────── */
(async function init() {
  await loadAppData();
  render();
  registerServiceWorker();
  initPinLock();
}());
