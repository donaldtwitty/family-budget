/**
 * receipt.js — Receipt scanning via the Anthropic Vision API.
 *
 * Handles:
 *  - API key setup and secure localStorage storage
 *  - Camera capture (paper receipts)
 *  - Gallery / screenshot upload (online order confirmations)
 *  - Image → base64 conversion
 *  - Claude vision API call with structured JSON response
 *  - Auto-filling the expense form with extracted data
 */

/* eslint-disable no-unused-vars */

const API_KEY_STORAGE = 'family-budget-anthropic-key';
const ANTHROPIC_MODEL = 'claude-opus-4-5';
const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages';

/* ── API Key Management ──────────────────────────────────── */

/**
 * Returns the stored Anthropic API key, or null if not set.
 * @returns {string|null}
 */
function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

/**
 * Saves the Anthropic API key to localStorage.
 * @param {string} key
 */
function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

/**
 * Shows the API key setup modal.
 * Called when the user tries to scan a receipt without a key configured.
 */
function showApiKeySetup() {
  showModal('Set Up Receipt Scanning', `
    <div class="info-panel info-panel--green">
      <strong>One-time setup required:</strong><br>
      Receipt scanning uses the Anthropic API to read your receipts.
      You need a free API key — it costs fractions of a cent per scan.
    </div>

    <div class="receipt-setup-steps">
      <div class="setup-step">
        <span class="setup-step__num">1</span>
        <div>
          <p class="setup-step__title">Get your API key</p>
          <p class="setup-step__desc">Go to <strong>console.anthropic.com</strong>, sign up free, and copy your API key.</p>
        </div>
      </div>
      <div class="setup-step">
        <span class="setup-step__num">2</span>
        <div>
          <p class="setup-step__title">Paste it below</p>
          <p class="setup-step__desc">Your key is stored only on this device — never shared.</p>
        </div>
      </div>
    </div>

    <div>
      <label class="form-label" for="f-apikey">Anthropic API Key</label>
      <input id="f-apikey"
             class="form-input form-input--mono"
             type="password"
             placeholder="sk-ant-api03-..."
             autocomplete="off"
             autocorrect="off"
             autocapitalize="none" />
    </div>

    <button class="btn btn--primary" data-action="save-api-key">
      ✅ Save &amp; Continue
    </button>

    <p class="sync-note">🔒 Stored locally on your phone only</p>
  `);
}

/**
 * Validates and saves the API key, then opens the receipt source picker.
 */
function saveApiKeyAndContinue() {
  const key = val('f-apikey');
  if (!key || !key.startsWith('sk-ant-')) {
    alert('Please enter a valid Anthropic API key (starts with sk-ant-)');
    return;
  }
  saveApiKey(key);
  showReceiptSourcePicker();
}

/* ── Receipt Source Picker ───────────────────────────────── */

/**
 * Shows the modal that lets the user choose camera or gallery upload.
 */
function showReceiptSourcePicker() {
  showModal('Scan a Receipt', `
    <p class="receipt-picker__intro">
      How would you like to add your receipt?
    </p>

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

    <p class="receipt-picker__note">
      💡 Works with HEB, Amazon, Walmart, Target, and any store receipt or order confirmation screenshot.
    </p>

    <!-- Hidden file inputs — triggered programmatically -->
    <input id="receipt-camera"
           type="file"
           accept="image/*"
           capture="environment"
           class="receipt-file-input" />

    <input id="receipt-gallery"
           type="file"
           accept="image/*"
           class="receipt-file-input" />
  `);

  attachReceiptListeners();
}

/**
 * Programmatically triggers the camera file input.
 */
function openCamera() {
  const input = document.getElementById('receipt-camera');
  if (input) input.click();
}

/**
 * Programmatically triggers the gallery file input.
 */
function openGallery() {
  const input = document.getElementById('receipt-gallery');
  if (input) input.click();
}

/* ── Image Processing ────────────────────────────────────── */

/**
 * Called when either file input fires a change event.
 * Converts the selected image to base64 and sends it to the API.
 * @param {Event} event
 */
function handleReceiptFileChosen(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  showScanningLoader();
  fileToBase64(file)
    .then((base64) => scanReceiptWithClaude(base64, file.type))
    .catch((err) => {
      console.error('Image read error:', err);
      showScanError('Could not read the image. Please try again.');
    });
}

/**
 * Converts a File object to a base64-encoded string.
 * @param {File} file
 * @returns {Promise<string>} base64 data (without the data: prefix)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      // Strip the "data:image/jpeg;base64," prefix
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Shows a loading spinner while the API processes the image.
 */
function showScanningLoader() {
  showModal('Reading Receipt…', `
    <div class="scan-loader">
      <div class="scan-loader__spinner" aria-hidden="true"></div>
      <p class="scan-loader__text">Claude is reading your receipt…</p>
      <p class="scan-loader__sub">This usually takes 3–5 seconds</p>
    </div>
  `);
}

/* ── Anthropic API Call ───────────────────────────────────── */

/**
 * Sends the base64 image to the Anthropic vision API and extracts
 * structured expense data from the response.
 * @param {string} base64Image
 * @param {string} mimeType - e.g. "image/jpeg"
 */
async function scanReceiptWithClaude(base64Image, mimeType) {
  const apiKey = getApiKey();
  if (!apiKey) {
    showApiKeySetup();
    return;
  }

  const categoryNames = SPENDING_CATEGORIES.map((c) => c.name).join(', ');

  const prompt = `You are a receipt parser. Analyze this receipt or order confirmation image and extract the purchase details.

Return ONLY a valid JSON object with no other text, markdown, or explanation. Use this exact shape:
{
  "store": "Store or merchant name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "category": "Best matching category",
  "note": "Brief description of main items (optional, max 40 chars)"
}

Rules:
- "store": The merchant, retailer, or website name. Be concise (e.g. "HEB", "Amazon", "Walmart", "Target").
- "amount": The final total charged (after tax, after discounts). Use a number, no $ sign.
- "date": The purchase or order date in YYYY-MM-DD format. Use today's date (${todayISO()}) if not visible.
- "category": Pick the single best match from this list: ${categoryNames}
- "note": Optional short note about main items. Leave as empty string "" if not needed.

If you cannot read a field clearly, make your best guess. Always return valid JSON.`;

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      ANTHROPIC_MODEL,
        max_tokens: 256,
        messages: [
          {
            role:    'user',
            content: [
              {
                type:   'image',
                source: {
                  type:       'base64',
                  media_type: mimeType || 'image/jpeg',
                  data:       base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (response.status === 401) {
      showScanError('Invalid API key. Please check your key in Settings.');
      return;
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed = parseReceiptJson(rawText);
    if (!parsed) {
      throw new Error('Could not parse API response as JSON');
    }

    showReceiptConfirmForm(parsed);

  } catch (err) {
    console.error('Receipt scan error:', err);
    showScanError(err.message || 'Something went wrong. Please try again.');
  }
}

/**
 * Safely parses the JSON from Claude's response text.
 * Handles responses that may have stray backticks or whitespace.
 * @param {string} text
 * @returns {object|null}
 */
function parseReceiptJson(text) {
  try {
    // Strip any markdown code fences Claude might accidentally include
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to extract a JSON object using regex as a fallback
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ── Confirm Form ────────────────────────────────────────── */

/**
 * Shows the pre-filled expense form with data extracted from the receipt.
 * The user can review, adjust, and confirm before saving.
 * @param {{ store: string, amount: number, date: string, category: string, note: string }} data
 */
function showReceiptConfirmForm(data) {
  const catGrid = SPENDING_CATEGORIES.map((c) => `
    <button class="cat-picker-btn ${c.name === data.category ? 'cat-picker-btn--active' : ''}"
            data-action="pick-spend-cat"
            data-cat="${esc(c.name)}"
            aria-label="${esc(c.name)}">
      <span class="cat-picker-btn__emoji">${c.emoji}</span>
      <span class="cat-picker-btn__name">${esc(c.name)}</span>
    </button>`).join('');

  const matchedCat = SPENDING_CATEGORIES.find((c) => c.name === data.category);
  const hintText   = matchedCat
    ? `${matchedCat.emoji} ${matchedCat.name} selected`
    : 'Tap a category above';

  showModal('Confirm & Save', `
    <div class="info-panel info-panel--green">
      ✅ Receipt scanned! Review the details below and tap Save.
    </div>

    <div>
      <p class="form-label">Category</p>
      <div class="cat-picker" id="cat-picker" role="group" aria-label="Spending category">${catGrid}</div>
      <input type="hidden" id="f-category" value="${esc(data.category)}" />
      <p class="cat-picker__hint cat-picker__hint--selected" id="cat-hint">${esc(hintText)}</p>
    </div>

    <div>
      <label class="form-label" for="f-store">Store / Description</label>
      <input id="f-store"
             class="form-input"
             type="text"
             value="${esc(data.store || '')}"
             autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div>
        <label class="form-label" for="f-amount">Amount ($)</label>
        <input id="f-amount"
               class="form-input"
               type="number"
               value="${data.amount || ''}"
               min="0"
               step="0.01" />
      </div>
      <div>
        <label class="form-label" for="f-date">Date</label>
        <input id="f-date"
               class="form-input"
               type="date"
               value="${esc(data.date || todayISO())}" />
      </div>
    </div>

    <div>
      <label class="form-label" for="f-note">Note <span class="form-checkbox__note">(optional)</span></label>
      <input id="f-note"
             class="form-input"
             type="text"
             value="${esc(data.note || '')}"
             placeholder="e.g. weekly grocery run"
             autocomplete="off" />
    </div>

    <button class="btn btn--primary" data-action="save-expense">
      💾 Save Expense
    </button>

    <button class="btn btn--subtle" data-action="show-receipt-picker">
      ↩ Scan a Different Receipt
    </button>
  `);
}

/**
 * Shows an error state inside the modal with a retry option.
 * @param {string} message
 */
function showScanError(message) {
  showModal('Scan Failed', `
    <div class="info-panel info-panel--yellow">
      <strong>⚠ Could not read this receipt</strong><br>
      ${esc(message)}
    </div>

    <div class="scan-error-tips">
      <p class="form-label">Tips for better results:</p>
      <ul class="scan-tips-list">
        <li>Make sure the receipt is flat and well-lit</li>
        <li>Capture the full receipt including the total</li>
        <li>For screenshots, crop to just the receipt/order summary</li>
        <li>Avoid shadows or glare across the text</li>
      </ul>
    </div>

    <button class="btn btn--primary" data-action="show-receipt-picker">
      🔄 Try Again
    </button>

    <button class="btn btn--outline-green" data-action="add-expense">
      ✏️ Enter Manually Instead
    </button>
  `);
}

/* ── Entry Point ─────────────────────────────────────────── */

/**
 * Attaches change listeners to the receipt file inputs currently in the DOM.
 */
function attachReceiptListeners() {
  requestAnimationFrame(() => {
    const cam = document.getElementById('receipt-camera');
    const gal = document.getElementById('receipt-gallery');
    if (cam) cam.addEventListener('change', handleReceiptFileChosen);
    if (gal) gal.addEventListener('change', handleReceiptFileChosen);
  });
}

/**
 * Main entry point — called when the user taps "Scan Receipt".
 * Checks for API key first, then shows the source picker.
 */
function startReceiptScan() {
  if (!getApiKey()) {
    showApiKeySetup();
  } else {
    showReceiptSourcePicker();
  }
}

/**
 * Shows the API key management modal (accessible from settings).
 */
function showApiKeyModal() {
  const existing = getApiKey();
  showModal('Receipt Scan Settings', `
    <div class="info-panel info-panel--green">
      Your API key is stored only on this device and is never shared.
    </div>

    <div>
      <label class="form-label" for="f-apikey">
        Anthropic API Key ${existing ? '<span style="color:#1b4332">(✓ configured)</span>' : ''}
      </label>
      <input id="f-apikey"
             class="form-input form-input--mono"
             type="password"
             placeholder="${existing ? '••••••••••••••••••' : 'sk-ant-api03-...'}"
             autocomplete="off"
             autocorrect="off"
             autocapitalize="none" />
    </div>

    <button class="btn btn--primary" data-action="save-api-key">
      💾 Save API Key
    </button>

    ${existing ? `<button class="btn btn--outline-red" data-action="clear-api-key">🗑 Remove API Key</button>` : ''}

    <p class="sync-note">
      Get a free key at <strong>console.anthropic.com</strong>
    </p>
  `);
}

/**
 * Clears the stored API key after confirmation.
 */
function clearApiKey() {
  if (!confirm('Remove your API key? Receipt scanning will stop working until you add a new one.')) return;
  localStorage.removeItem(API_KEY_STORAGE);
  hideModal();
  alert('API key removed.');
}
