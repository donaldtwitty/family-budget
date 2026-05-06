/**
 * receipt.js — Receipt scanning via the Anthropic Vision API.
 * Handles camera capture, gallery upload, API call, and confirm form.
 */

/* eslint-disable no-unused-vars */

const API_KEY_STORAGE = 'family-budget-anthropic-key';
const ANTHROPIC_MODEL = 'claude-opus-4-5';
const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages';

/* ── API Key ─────────────────────────────────────────────── */

/** @returns {string|null} */
function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE); } catch { return null; }
}

/** @param {string} key */
function saveApiKey(key) { localStorage.setItem(API_KEY_STORAGE, key.trim()); }

function showApiKeySetup() {
  showModal('Set Up Receipt Scanning', `
    <div class="info-panel info-panel--green">
      <strong>One-time setup:</strong><br>
      Go to <strong>console.anthropic.com</strong>, create a free account, and copy your API key. Receipt scanning costs fractions of a cent per scan.
    </div>
    <div><label class="form-label" for="f-apikey">Anthropic API Key</label>
      <input id="f-apikey" class="form-input form-input--mono" type="password" placeholder="sk-ant-api03-..." autocomplete="off" autocorrect="off" autocapitalize="none" />
    </div>
    <button class="btn btn--primary" data-action="save-api-key">✅ Save &amp; Continue</button>
    <p class="sync-note">🔒 Stored on this device only</p>
  `);
}

function saveApiKeyAndContinue() {
  const key = val('f-apikey');
  if (!key || !key.startsWith('sk-ant-')) { alert('Please enter a valid Anthropic API key (starts with sk-ant-)'); return; }
  saveApiKey(key);
  showReceiptSourcePicker();
}

function showApiKeyModal() {
  const existing = getApiKey();
  showModal('Receipt Scan Settings', `
    <div class="info-panel info-panel--green">Your API key is stored only on this device.</div>
    <div><label class="form-label" for="f-apikey">API Key ${existing ? '<span style="color:#1b4332">(✓ configured)</span>' : ''}</label>
      <input id="f-apikey" class="form-input form-input--mono" type="password" placeholder="${existing ? '••••••••••••' : 'sk-ant-api03-...'}" autocomplete="off" autocorrect="off" autocapitalize="none" />
    </div>
    <button class="btn btn--primary" data-action="save-api-key">💾 Save Key</button>
    ${existing ? '<button class="btn btn--outline-red" data-action="clear-api-key">🗑 Remove Key</button>' : ''}
    <p class="sync-note">Get a free key at <strong>console.anthropic.com</strong></p>
  `);
}

function clearApiKey() {
  if (!confirm('Remove API key? Receipt scanning will stop working.')) return;
  localStorage.removeItem(API_KEY_STORAGE);
  hideModal();
}

/* ── Source Picker ───────────────────────────────────────── */

function showReceiptSourcePicker() {
  showModal('Scan a Receipt', `
    <p class="receipt-picker__intro">How would you like to add your receipt?</p>
    <div class="receipt-source-grid">
      <button class="receipt-source-btn" data-action="open-camera">
        <span class="receipt-source-btn__icon">📷</span>
        <span class="receipt-source-btn__label">Take Photo</span>
        <span class="receipt-source-btn__sub">Paper receipts</span>
      </button>
      <button class="receipt-source-btn" data-action="open-gallery">
        <span class="receipt-source-btn__icon">🖼️</span>
        <span class="receipt-source-btn__label">Upload Image</span>
        <span class="receipt-source-btn__sub">Screenshots &amp; online orders</span>
      </button>
    </div>
    <p class="receipt-picker__note">💡 Works with HEB, Amazon, Walmart, Target, and any receipt or order confirmation.</p>
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

function openCamera()  { document.getElementById('receipt-camera')?.click(); }
function openGallery() { document.getElementById('receipt-gallery')?.click(); }

/* ── File Processing ─────────────────────────────────────── */

/**
 * @param {Event} event
 */
function handleReceiptFileChosen(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  showScanningLoader();
  fileToBase64(file)
    .then((base64) => scanReceiptWithClaude(base64, file.type))
    .catch((err)   => { console.error(err); showScanError('Could not read the image. Please try again.'); });
}

/** @param {File} file @returns {Promise<string>} */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function showScanningLoader() {
  showModal('Reading Receipt…', `
    <div class="scan-loader">
      <div class="scan-loader__spinner" aria-hidden="true"></div>
      <p class="scan-loader__text">Claude is reading your receipt…</p>
      <p class="scan-loader__sub">Usually 3–5 seconds</p>
    </div>`);
}

/* ── API Call ────────────────────────────────────────────── */

/**
 * @param {string} base64Image
 * @param {string} mimeType
 */
async function scanReceiptWithClaude(base64Image, mimeType) {
  const apiKey = getApiKey();
  if (!apiKey) { showApiKeySetup(); return; }

  const catNames = SPENDING_CATEGORIES.map((c) => c.name).join(', ');
  const prompt   = `You are a receipt parser. Analyze this receipt or order confirmation and extract purchase details.
Return ONLY a valid JSON object with no other text, markdown, or explanation:
{"store":"merchant name","amount":0.00,"date":"YYYY-MM-DD","category":"best match","note":"optional short note max 40 chars"}
Rules:
- store: concise merchant name (e.g. "HEB", "Amazon", "Target")
- amount: final total charged after tax and discounts, as a number
- date: purchase date as YYYY-MM-DD; use today ${todayISO()} if not visible
- category: best match from: ${catNames}
- note: optional short description; empty string "" if not needed
Always return valid JSON.`;

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: 256,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: base64Image } },
          { type: 'text', text: prompt },
        ]}],
      }),
    });

    if (response.status === 401) { showScanError('Invalid API key. Check your key in Receipt Scan Settings.'); return; }
    if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${response.status}`); }

    const data    = await response.json();
    const rawText = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed  = _parseReceiptJson(rawText);
    if (!parsed) throw new Error('Could not parse API response as JSON');
    showReceiptConfirmForm(parsed);

  } catch (err) {
    console.error('Receipt scan error:', err);
    showScanError(err.message || 'Something went wrong. Please try again.');
  }
}

/** @param {string} text @returns {object|null} */
function _parseReceiptJson(text) {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

/* ── Confirm Form ────────────────────────────────────────── */

/** @param {{ store: string, amount: number, date: string, category: string, note: string }} data */
function showReceiptConfirmForm(data) {
  const catGrid = SPENDING_CATEGORIES.map((c) => `
    <button class="cat-picker-btn ${c.name === data.category ? 'cat-picker-btn--active' : ''}"
            data-action="pick-spend-cat" data-cat="${esc(c.name)}" aria-label="${esc(c.name)}">
      <span class="cat-picker-btn__emoji">${c.emoji}</span>
      <span class="cat-picker-btn__name">${esc(c.name)}</span>
    </button>`).join('');
  const match = SPENDING_CATEGORIES.find((c) => c.name === data.category);

  showModal('Confirm & Save', `
    <div class="info-panel info-panel--green">✅ Receipt scanned! Review and tap Save.</div>
    <div>
      <p class="form-label">Category</p>
      <div class="cat-picker" id="cat-picker">${catGrid}</div>
      <input type="hidden" id="f-category" value="${esc(data.category)}" />
      <p class="cat-picker__hint cat-picker__hint--selected" id="cat-hint">${esc(match ? `${match.emoji} ${match.name} selected` : 'Tap a category')}</p>
    </div>
    <div><label class="form-label" for="f-store">Store / Description</label><input id="f-store" class="form-input" type="text" value="${esc(data.store || '')}" autocomplete="off" /></div>
    <div class="form-grid-2">
      <div><label class="form-label" for="f-amount">Amount ($)</label><input id="f-amount" class="form-input" type="number" value="${data.amount || ''}" min="0" step="0.01" /></div>
      <div><label class="form-label" for="f-date">Date</label><input id="f-date" class="form-input" type="date" value="${esc(data.date || todayISO())}" /></div>
    </div>
    <div><label class="form-label" for="f-account">Charge to Account</label><select id="f-account" class="form-input">${accountOptions(AppData.accounts[0].id)}</select></div>
    <div><label class="form-label" for="f-note">Note</label><input id="f-note" class="form-input" type="text" value="${esc(data.note || '')}" autocomplete="off" /></div>
    <button class="btn btn--primary" data-action="save-expense">💾 Save Expense</button>
    <button class="btn btn--subtle" data-action="show-receipt-picker">↩ Scan Different Receipt</button>
  `);
}

function showScanError(message) {
  showModal('Scan Failed', `
    <div class="info-panel info-panel--yellow"><strong>⚠ Could not read this receipt</strong><br>${esc(message)}</div>
    <div class="scan-error-tips">
      <p class="form-label">Tips for better results:</p>
      <ul class="scan-tips-list">
        <li>Make sure the receipt is flat and well-lit</li>
        <li>Capture the full receipt including the total</li>
        <li>For screenshots, crop to just the order summary</li>
      </ul>
    </div>
    <button class="btn btn--primary" data-action="show-receipt-picker">🔄 Try Again</button>
    <button class="btn btn--outline-green" data-action="add-expense">✏️ Enter Manually</button>
  `);
}

/** Main entry — checks for API key first */
function startReceiptScan() {
  if (!getApiKey()) { showApiKeySetup(); } else { showReceiptSourcePicker(); }
}
