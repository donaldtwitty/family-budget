/**
 * pin.js — Full-screen PIN lock overlay.
 * PIN is hashed with SHA-256 and stored in localStorage. Never plain text.
 */

/* eslint-disable no-unused-vars */

const PIN_HASH_KEY    = 'family-budget-pin-hash';
const PIN_SESSION_KEY = 'family-budget-pin-session'; // survives refresh, cleared on tab close
const PIN_MAX_DIGITS  = 6;
const PIN_MIN_DIGITS  = 4;

/** @returns {string|null} */
function getStoredPinHash() { try { return localStorage.getItem(PIN_HASH_KEY); } catch { return null; } }
/** @param {string} hash */
function _storePinHash(hash) { localStorage.setItem(PIN_HASH_KEY, hash); }
function _clearPin() { localStorage.removeItem(PIN_HASH_KEY); }
/** @returns {boolean} */
function hasPinConfigured() { return !!getStoredPinHash(); }

function _markUnlocked() { try { sessionStorage.setItem(PIN_SESSION_KEY, '1'); } catch {} }
function _markLocked()   { try { sessionStorage.removeItem(PIN_SESSION_KEY); } catch {} }
function _isUnlocked()   { try { return sessionStorage.getItem(PIN_SESSION_KEY) === '1'; } catch { return false; } }

/** @param {string} str @returns {Promise<string>} */
async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

let _pinPending = '';

/**
 * @param {'unlock'|'create'|'confirm'|'change-old'|'change-new'|'change-confirm'} mode
 * @param {string} [subtitle]
 */
function showPinScreen(mode, subtitle) {
  document.getElementById('pin-screen')?.remove();
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
  screen.innerHTML = `
    <div class="pin-screen__inner">
      <div class="pin-screen__logo" aria-hidden="true">💰</div>
      <h2 class="pin-screen__title">${titles[mode] || 'Enter PIN'}</h2>
      <p class="pin-screen__subtitle ${subtitle && subtitle.startsWith('✗') ? 'pin-screen__subtitle--error' : ''}" id="pin-subtitle">${subtitle ? esc(subtitle) : '&nbsp;'}</p>
      <div class="pin-dots" id="pin-dots" aria-live="polite">
        ${[0,1,2,3,4,5].map((i) => `<span class="pin-dot" data-index="${i}"></span>`).join('')}
      </div>
      <div class="pin-keypad" role="group" aria-label="PIN keypad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k) => `
          <button class="pin-key${k === '' ? ' pin-key--empty' : ''}"
                  data-key="${k}"
                  ${k === '' ? 'aria-hidden="true" tabindex="-1"' : `aria-label="${k === '⌫' ? 'Delete' : k}"`}>
            ${k}
          </button>`).join('')}
      </div>
      ${mode === 'unlock' ? '<button class="pin-screen__link" id="pin-forgot">Forgot PIN?</button>' : ''}
    </div>`;
  document.body.appendChild(screen);
  document.body.style.overflow = 'hidden';
  _attachPinKeypad(screen, mode);
}

function _attachPinKeypad(screen, mode) {
  let digits = '';
  const dots = screen.querySelectorAll('.pin-dot');

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('pin-dot--filled', i < digits.length));
  }

  async function onComplete() {
    switch (mode) {
      case 'unlock':
        if (await _sha256(digits) === getStoredPinHash()) { _dismissPin(); }
        else { showPinScreen('unlock', '✗ Incorrect PIN, try again'); }
        break;
      case 'create':
        _pinPending = digits; showPinScreen('confirm');
        break;
      case 'confirm':
        if (digits === _pinPending) { _storePinHash(await _sha256(digits)); _pinPending = ''; _dismissPin(); _pinToast('✓ PIN created'); }
        else { _pinPending = ''; showPinScreen('create', '✗ PINs did not match — try again'); }
        break;
      case 'change-old':
        if (await _sha256(digits) === getStoredPinHash()) { showPinScreen('change-new'); }
        else { showPinScreen('change-old', '✗ Incorrect PIN'); }
        break;
      case 'change-new':
        _pinPending = digits; showPinScreen('change-confirm');
        break;
      case 'change-confirm':
        if (digits === _pinPending) { _storePinHash(await _sha256(digits)); _pinPending = ''; hideModal(); _pinToast('✓ PIN updated'); }
        else { _pinPending = ''; showPinScreen('change-new', '✗ PINs did not match — try again'); }
        break;
    }
  }

  screen.querySelectorAll('.pin-key:not(.pin-key--empty)').forEach((key) => {
    key.addEventListener('click', () => {
      const k = key.dataset.key;
      if (k === '⌫') { digits = digits.slice(0, -1); updateDots(); return; }
      if (digits.length >= PIN_MAX_DIGITS) return;
      digits += k;
      updateDots();
      if (digits.length === PIN_MAX_DIGITS) {
        setTimeout(onComplete, 120);
      } else if (digits.length === PIN_MIN_DIGITS) {
        setTimeout(() => { if (digits.length === PIN_MIN_DIGITS) onComplete(); }, 600);
      }
    });
  });

  const forgot = document.getElementById('pin-forgot');
  if (forgot) forgot.addEventListener('click', _showForgotPin);
}

function _dismissPin() {
  const screen = document.getElementById('pin-screen');
  if (screen) { screen.classList.add('pin-screen--exit'); setTimeout(() => screen.remove(), 300); }
  document.body.style.overflow = '';
  _markUnlocked();
}

function _pinToast(msg) {
  const t = document.createElement('div');
  t.className = 'pin-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('pin-toast--visible'), 10);
  setTimeout(() => { t.classList.remove('pin-toast--visible'); setTimeout(() => t.remove(), 300); }, 2200);
}

function _showForgotPin() {
  showModal('Forgot PIN', `
    <div class="info-panel info-panel--yellow"><strong>⚠ Reset your PIN</strong><br>Your budget data will NOT be deleted.</div>
    <button class="btn btn--outline-red" data-action="reset-pin">🗑 Reset PIN</button>
    <button class="btn btn--subtle" data-action="hide-modal">Cancel</button>
  `);
}

function resetPin() {
  if (!confirm('Reset your PIN? You will need to create a new one.')) return;
  _clearPin(); hideModal(); _dismissPin();
  setTimeout(() => showPinScreen('create'), 320);
}

function showPinSettings() {
  showModal('PIN Lock Settings', `
    <div class="info-panel info-panel--green">${hasPinConfigured() ? 'A PIN is currently set on this device.' : 'No PIN is set yet.'}</div>
    ${hasPinConfigured() ? `
      <button class="btn btn--primary" data-action="change-pin">🔐 Change PIN</button>
      <button class="btn btn--outline-red" data-action="reset-pin">🗑 Remove PIN</button>` : `
      <button class="btn btn--primary" data-action="create-pin">🔐 Create PIN</button>`}
    <button class="btn btn--subtle" data-action="hide-modal">Cancel</button>
  `);
}

/**
 * Sets up a listener that locks the app whenever the screen sleeps or the
 * user switches away from the app, but NOT on a plain page refresh.
 * pagehide fires before visibilitychange on refresh/navigation, so we use
 * it as a signal to skip the lock for that cycle.
 */
let _lockListenerReady = false;
function _setupSleepLock() {
  if (_lockListenerReady) return;
  _lockListenerReady = true;

  let _refreshing = false;
  window.addEventListener('pagehide', () => { _refreshing = true; });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (_refreshing) { _refreshing = false; return; } // page refresh — don't lock
      _markLocked(); // screen sleep or app switch — lock on return
    } else if (document.visibilityState === 'visible') {
      _refreshing = false;
      if (hasPinConfigured() && !_isUnlocked()) showPinScreen('unlock');
    }
  });
}

/** Called from app.js init */
function initPinLock() {
  _setupSleepLock();

  if (_isUnlocked()) return; // already authenticated this session (e.g. page refresh)

  if (hasPinConfigured()) {
    showPinScreen('unlock');
  } else {
    showPinScreen('create', 'Choose a 4–6 digit PIN to protect your budget');
  }
}
