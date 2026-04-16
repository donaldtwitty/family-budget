/**
 * pin.js — PIN lock screen.
 *
 * - Shown on every app launch before any content is displayed.
 * - PIN is stored as a SHA-256 hash in localStorage (never plain text).
 * - First launch prompts the user to create a PIN.
 * - Supports PIN change and reset via the settings modal.
 * - Both phones set their own PIN independently.
 */

/* eslint-disable no-unused-vars */

const PIN_HASH_KEY    = 'family-budget-pin-hash';
const PIN_SESSION_KEY = 'family-budget-pin-ok';
const PIN_MAX_DIGITS  = 6;
const PIN_MIN_DIGITS  = 4;

/* ── Hashing ─────────────────────────────────────────────── */

/**
 * Returns a hex SHA-256 hash of the given string.
 * Uses the Web Crypto API (available in all modern browsers).
 * @param {string} str
 * @returns {Promise<string>}
 */
async function sha256(str) {
  const buffer  = new TextEncoder().encode(str);
  const digest  = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ── Storage ─────────────────────────────────────────────── */

/** @returns {string|null} stored PIN hash, or null if not set */
function getStoredPinHash() {
  return localStorage.getItem(PIN_HASH_KEY);
}

/** @param {string} hash */
function storePinHash(hash) {
  localStorage.setItem(PIN_HASH_KEY, hash);
}

function clearStoredPin() {
  localStorage.removeItem(PIN_HASH_KEY);
  sessionStorage.removeItem(PIN_SESSION_KEY);
}

/** @returns {boolean} */
function hasPinConfigured() {
  return !!getStoredPinHash();
}

/* ── PIN Screen HTML ─────────────────────────────────────── */

/**
 * Injects the full-screen PIN lock overlay into the document.
 * @param {'unlock'|'create'|'confirm'|'change-old'|'change-new'|'change-confirm'} mode
 * @param {string} [subtitle]
 */
function showPinScreen(mode, subtitle) {
  // Remove any existing pin screen
  const existing = document.getElementById('pin-screen');
  if (existing) existing.remove();

  const titles = {
    'unlock':         'Enter your PIN',
    'create':         'Create a PIN',
    'confirm':        'Confirm your PIN',
    'change-old':     'Enter current PIN',
    'change-new':     'Enter new PIN',
    'change-confirm': 'Confirm new PIN',
  };

  const screen = document.createElement('div');
  screen.id = 'pin-screen';
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-label', titles[mode] || 'PIN entry');
  screen.innerHTML = `
    <div class="pin-screen__inner">
      <div class="pin-screen__logo" aria-hidden="true">💰</div>
      <h2 class="pin-screen__title">${titles[mode] || 'Enter PIN'}</h2>
      ${subtitle ? `<p class="pin-screen__subtitle ${subtitle.startsWith('✗') ? 'pin-screen__subtitle--error' : ''}">${esc(subtitle)}</p>` : '<p class="pin-screen__subtitle">&nbsp;</p>'}

      <div class="pin-dots" id="pin-dots" aria-live="polite" aria-label="PIN digits entered">
        <span class="pin-dot" data-index="0"></span>
        <span class="pin-dot" data-index="1"></span>
        <span class="pin-dot" data-index="2"></span>
        <span class="pin-dot" data-index="3"></span>
        <span class="pin-dot" data-index="4"></span>
        <span class="pin-dot" data-index="5"></span>
      </div>

      <div class="pin-keypad" role="group" aria-label="PIN keypad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k) => `
          <button class="pin-key ${k === '' ? 'pin-key--empty' : ''}"
                  data-key="${k}"
                  ${k === '' ? 'aria-hidden="true" tabindex="-1"' : `aria-label="${k === '⌫' ? 'Delete' : k}"`}>
            ${k}
          </button>`).join('')}
      </div>

      ${mode === 'unlock' ? `
        <button class="pin-screen__link" id="pin-forgot">Forgot PIN?</button>` : ''}
    </div>
  `;

  document.body.appendChild(screen);
  // Prevent scrolling the app behind the PIN screen
  document.body.style.overflow = 'hidden';

  attachPinKeypad(screen, mode);
}

/* ── Keypad Logic ────────────────────────────────────────── */

/**
 * Attaches keypad button listeners and manages PIN digit state.
 * @param {HTMLElement} screen
 * @param {string} mode
 */
function attachPinKeypad(screen, mode) {
  let digits = '';

  const dots     = screen.querySelectorAll('.pin-dot');
  const keys     = screen.querySelectorAll('.pin-key:not(.pin-key--empty)');
  const forgotEl = screen.getElementById ? screen.getElementById('pin-forgot') : null;
  const forgotBtn = document.getElementById('pin-forgot');

  /** Updates the dot indicators to reflect current digit count */
  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('pin-dot--filled', i < digits.length);
    });
  }

  /** Called when the user completes PIN entry */
  async function onPinComplete() {
    switch (mode) {
      case 'unlock':
        await handleUnlock(digits);
        break;
      case 'create':
        PIN_PENDING = digits;
        showPinScreen('confirm');
        break;
      case 'confirm':
        await handleConfirm(digits);
        break;
      case 'change-old':
        await handleChangeOld(digits);
        break;
      case 'change-new':
        PIN_PENDING = digits;
        showPinScreen('change-confirm');
        break;
      case 'change-confirm':
        await handleChangeConfirm(digits);
        break;
    }
  }

  keys.forEach((key) => {
    key.addEventListener('click', () => {
      const k = key.dataset.key;
      if (k === '⌫') {
        digits = digits.slice(0, -1);
        updateDots();
        return;
      }
      if (digits.length >= PIN_MAX_DIGITS) return;
      digits += k;
      updateDots();
      if (digits.length >= PIN_MIN_DIGITS && digits.length === PIN_MAX_DIGITS) {
        // Auto-submit at max digits
        setTimeout(onPinComplete, 120);
      } else if (digits.length === PIN_MIN_DIGITS) {
        // Allow 4-digit PINs too — wait briefly for a 5th digit
        setTimeout(() => {
          if (digits.length === PIN_MIN_DIGITS) onPinComplete();
        }, 600);
      }
    });
  });

  if (forgotBtn) {
    forgotBtn.addEventListener('click', showForgotPinModal);
  }
}

/* ── Temporary PIN storage during create/confirm flow ─────── */
let PIN_PENDING = '';

/* ── Mode Handlers ───────────────────────────────────────── */

async function handleUnlock(digits) {
  const hash    = await sha256(digits);
  const stored  = getStoredPinHash();
  if (hash === stored) {
    dismissPinScreen();
  } else {
    showPinScreen('unlock', '✗ Incorrect PIN, try again');
  }
}

async function handleConfirm(digits) {
  if (digits === PIN_PENDING) {
    const hash = await sha256(digits);
    storePinHash(hash);
    PIN_PENDING = '';
    dismissPinScreen();
    // Show a brief success toast
    showPinToast('✓ PIN created successfully');
  } else {
    PIN_PENDING = '';
    showPinScreen('create', '✗ PINs did not match — try again');
  }
}

async function handleChangeOld(digits) {
  const hash   = await sha256(digits);
  const stored = getStoredPinHash();
  if (hash === stored) {
    showPinScreen('change-new');
  } else {
    showPinScreen('change-old', '✗ Incorrect PIN');
  }
}

async function handleChangeConfirm(digits) {
  if (digits === PIN_PENDING) {
    const hash = await sha256(digits);
    storePinHash(hash);
    PIN_PENDING = '';
    hideModal();          // close the settings modal if open
    showPinToast('✓ PIN updated successfully');
  } else {
    PIN_PENDING = '';
    showPinScreen('change-new', '✗ PINs did not match — try again');
  }
}

/* ── Dismiss / Show ──────────────────────────────────────── */

/** Removes the PIN screen and restores scrolling. */
function dismissPinScreen() {
  const screen = document.getElementById('pin-screen');
  if (screen) {
    screen.classList.add('pin-screen--exit');
    setTimeout(() => screen.remove(), 300);
  }
  document.body.style.overflow = '';
  sessionStorage.setItem(PIN_SESSION_KEY, '1');
}

/**
 * Shows a brief bottom toast notification.
 * @param {string} message
 */
function showPinToast(message) {
  const toast = document.createElement('div');
  toast.className  = 'pin-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('pin-toast--visible'), 10);
  setTimeout(() => {
    toast.classList.remove('pin-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

/* ── Forgot PIN ──────────────────────────────────────────── */

function showForgotPinModal() {
  showModal('Forgot PIN', `
    <div class="info-panel info-panel--yellow">
      <strong>⚠ Reset your PIN</strong><br>
      Resetting will clear your PIN. You'll be asked to create a new one on next launch.
      Your budget data will <strong>not</strong> be deleted.
    </div>
    <button class="btn btn--outline-red" data-action="reset-pin">
      🗑 Reset PIN
    </button>
    <button class="btn btn--subtle" data-action="hide-modal">
      Cancel
    </button>
  `);
}

function resetPin() {
  if (!confirm('Reset your PIN? You will need to create a new one.')) return;
  clearStoredPin();
  hideModal();
  // Dismiss the old lock screen and show the create flow
  dismissPinScreen();
  setTimeout(() => showPinScreen('create'), 320);
}

/* ── PIN Settings Modal (accessible from Home tab) ─────────── */

function showPinSettings() {
  showModal('PIN Lock Settings', `
    <div class="info-panel info-panel--green">
      Your PIN protects the app on this device.
      ${hasPinConfigured() ? 'A PIN is currently set.' : 'No PIN is set yet.'}
    </div>
    ${hasPinConfigured() ? `
      <button class="btn btn--primary" data-action="change-pin">
        🔐 Change PIN
      </button>
      <button class="btn btn--outline-red" data-action="reset-pin">
        🗑 Remove PIN
      </button>` : `
      <button class="btn btn--primary" data-action="create-pin">
        🔐 Create PIN
      </button>`}
    <button class="btn btn--subtle" data-action="hide-modal">Cancel</button>
  `);
}

/* ── Boot check ──────────────────────────────────────────── */

/**
 * Called from app.js init(). Shows PIN screen if a PIN is configured,
 * or the create-PIN flow if this is a first launch.
 */
function initPinLock() {
  if (hasPinConfigured()) {
    if (sessionStorage.getItem(PIN_SESSION_KEY)) return;
    showPinScreen('unlock');
  } else {
    showPinScreen('create', 'Choose a 4–6 digit PIN to protect your budget');
  }
}
