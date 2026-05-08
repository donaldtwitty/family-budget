/**
 * import.js — Bank statement CSV import via Claude AI.
 * Parses and categorizes transactions, then merges into the ledger.
 */

/* eslint-disable no-unused-vars */

const IMPORT_MODEL = 'claude-sonnet-4-6'; // better reasoning for CSV categorization

/** Module-level state shared between the picker, preview, and confirm steps. */
let _importState = null; // { transactions: Array, accountId: string }

/* ── Entry point ─────────────────────────────────────────── */

function startCsvImport() {
  if (!getApiKey()) { showApiKeySetup(); return; }
  _showImportPicker();
}

/* ── Step 1 — Account + file picker ─────────────────────── */

function _showImportPicker() {
  showModal('Import Bank Statement', `
    <div class="info-panel info-panel--green">
      Upload a CSV exported from your bank's website. Claude will read and
      categorize every transaction automatically.
    </div>
    <div>
      <label class="form-label" for="f-import-account">Import into Account</label>
      <select id="f-import-account" class="form-input">${accountOptions(AppData.accounts[0].id)}</select>
    </div>
    <label class="import-file-label" for="f-csv-file">
      <svg class="import-file-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span id="import-file-name">Choose a CSV file…</span>
    </label>
    <input id="f-csv-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" class="receipt-file-input" aria-hidden="true" />
    <button class="btn btn--primary" data-action="process-csv-import">📊 Parse &amp; Categorize</button>
    <p class="sync-note">Works with USAA, RBFCU, Chase, Bank of America, and most banks · max 250 rows</p>
  `);

  requestAnimationFrame(() => {
    const input = document.getElementById('f-csv-file');
    if (input) {
      input.addEventListener('change', (e) => {
        const name = e.target.files?.[0]?.name;
        const el   = document.getElementById('import-file-name');
        if (name && el) el.textContent = `📄 ${name}`;
      });
    }
  });
}

/* ── Step 2 — Read file and call Claude ──────────────────── */

async function processCsvImport() {
  const input     = document.getElementById('f-csv-file');
  const accountId = val('f-import-account');
  const file      = input?.files?.[0];

  if (!file)      { alert('Please choose a CSV file first.'); return; }
  if (!accountId) { alert('Please select an account.'); return; }

  _showImportLoading();

  try {
    const text         = await _readFileAsText(file);
    const transactions = await _parseWithClaude(text);
    if (!transactions.length) throw new Error('No transactions found in this file. Make sure it is a CSV bank statement.');
    _showImportPreview(transactions, accountId);
  } catch (err) {
    console.error('CSV import error:', err);
    showModal('Import Failed', `
      <div class="info-panel info-panel--yellow">
        <strong>⚠ Could not import this file</strong><br>${esc(err.message || 'An unexpected error occurred.')}
      </div>
      <button class="btn btn--primary" data-action="start-csv-import">↩ Try Again</button>
    `);
  }
}

function _showImportLoading() {
  showModal('Parsing Statement…', `
    <div class="scan-loader">
      <div class="scan-loader__spinner" aria-hidden="true"></div>
      <p class="scan-loader__text">Claude is reading your statement…</p>
      <p class="scan-loader__sub">Usually 10–20 seconds for a full month</p>
    </div>
  `);
}

/** @param {File} file @returns {Promise<string>} */
function _readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

/**
 * Sends raw CSV text to Claude, which returns a JSON array of transactions.
 * @param {string} csvText
 * @returns {Promise<Array<{date:string,description:string,amount:number,type:string,category:string,billName:string|null,incomeSource:string|null}>>}
 */
async function _parseWithClaude(csvText) {
  const apiKey = getApiKey();
  if (!apiKey) { showApiKeySetup(); throw new Error('No API key configured.'); }

  // Trim to first 250 data rows to keep prompt size reasonable
  const lines  = csvText.split('\n');
  const sample = lines.slice(0, 251).join('\n');

  const catNames    = SPENDING_CATEGORIES.map((c) => c.name).join(', ');
  const billList    = AppData.bills.map((b) => b.name).join(', ');
  const incomeList  = AppData.income.map((i) => i.name).join(', ');

  const prompt = `You are a bank statement parser. Parse the bank export data below and return ONLY a valid JSON array — no explanation, no markdown, no code fences.

Each element must have exactly these fields:
{ "date": "YYYY-MM-DD", "description": "Clean merchant name", "amount": 0.00, "type": "expense" or "income", "category": "...", "billName": null, "incomeSource": null }

FORMAT DETECTION — detect automatically from the header row (may be comma or tab separated):
- USAA format:  Date, Description, Original Description, Category, Amount, Status
- RBFCU format: Post Date, Amount, Check Number, Payee
- Other formats: detect columns from the header row

FIELD RULES:
- date: convert any date format → YYYY-MM-DD
- description: extract a clean, short merchant name. Strip store numbers, addresses, city/state codes, ZIP codes, confirmation codes, trailing digits, and junk. Examples:
    "BURGER BOY 6 - PAT B 050626" → "Burger Boy"
    "H-E-B #415 SCHERTZ TX" → "H-E-B"
    "VACP TREAS 310 XXVA BENEF ***3600" → "VA Benefits"
    "VAED TREAS 310 XXVA EDUC ***3600" → "VA Education Benefits"
    "Accenture Federa 27722543C959 001 - PAYROLL" → "Accenture Payroll"
    "SHELL OIL 12484 3835 E LOOP 1604 N CONVERSE TXUS" → "Shell Oil"
    "CAPITAL ONE MOBILE PMT ***D30B" → "Capital One Payment"
    "USAA FUNDS TRANSFER CR" → "USAA Transfer In"
    "USAA FUNDS TRANSFER DB" → "USAA Transfer Out"
    "ATM REBATE" → "ATM Fee Rebate"
- amount: always output as a POSITIVE number. Use the original sign to set type:
    Negative original amount → type: "expense"
    Positive original amount → type: "income"
- type overrides (apply these after the sign rule):
    VA benefits, education benefits, payroll, direct deposit, interest, ATM rebates → always "income"
    Credit card payments, loan payments → "expense"
    Internal bank transfers OUT (negative, description contains "TRANSFER DB" or "FUNDS TRANSFER") → "expense"
    Internal bank transfers IN (positive, description contains "TRANSFER CR" or "FUNDS TRANSFER CR") → "income"
    If still uncertain whether a positive-amount row is income or expense, default to "income"
- category: pick the single best match from this exact list: ${catNames}. Use the bank's Category column as a strong hint when available.
- billName: if this looks like a payment matching one of these bill names, return the EXACT name from this list (otherwise null): ${billList}
- incomeSource: if this is income matching one of these source names, return the EXACT name from this list (otherwise null): ${incomeList}

SKIP: header rows, rows where amount is exactly 0.00, balance/summary rows, and any row where the Status column value is "Pending"

Bank data:
${sample}`;

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: IMPORT_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (response.status === 401) throw new Error('Invalid API key — check your key in Receipt Scan Settings.');
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('No JSON array in Claude response — please try again.');
    try { parsed = JSON.parse(m[0]); }
    catch { throw new Error('Could not parse Claude response — please try again.'); }
  }

  if (!Array.isArray(parsed)) throw new Error('Unexpected response format from Claude.');
  return parsed;
}

/* ── Step 3 — Preview + confirm ─────────────────────────── */

/** @param {{ date:string, amount:number, description:string }} t */
function _isDuplicate(t) {
  const desc = (t.description || '').toLowerCase().trim();
  return AppData.ledger.some((e) =>
    e.date === t.date &&
    Math.abs(e.amount - t.amount) < 0.01 &&
    (e.name || '').toLowerCase().trim() === desc
  );
}

function _showImportPreview(transactions, accountId) {
  const tagged   = transactions.map((t) => ({ ...t, dup: _isDuplicate(t) }));
  const dupCount = tagged.filter((t) => t.dup).length;
  const newCount = tagged.length - dupCount;

  const rows = tagged.map((t, i) => {
    const catOpts = SPENDING_CATEGORIES.map((c) =>
      `<option value="${esc(c.name)}"${c.name === t.category ? ' selected' : ''}>${esc(c.emoji)} ${esc(c.name)}</option>`
    ).join('');
    const matchBadge = t.billName
      ? `<span class="import-match-badge import-match-badge--bill">🔗 ${esc(t.billName)}</span>`
      : t.incomeSource
        ? `<span class="import-match-badge import-match-badge--income">💵 ${esc(t.incomeSource)}</span>`
        : '';
    return `
      <tr class="${t.dup ? 'import-row--dup' : ''}">
        <td class="import-td-cb">
          <input type="checkbox" class="import-cb" data-idx="${i}" ${t.dup ? '' : 'checked'}
                 ${t.dup ? 'title="Possible duplicate — check to include anyway"' : ''} />
        </td>
        <td class="import-td-date">${esc(t.date)}</td>
        <td class="import-td-desc">
          <input class="import-desc" data-idx="${i}" type="text" value="${esc(t.description)}" autocomplete="off" />
          ${matchBadge}
        </td>
        <td class="import-td-cat">
          <select class="import-cat" data-idx="${i}">${catOpts}</select>
        </td>
        <td class="import-td-amt${t.type === 'income' ? ' import-td-amt--in' : ''}">
          ${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}
        </td>
      </tr>`;
  }).join('');

  _importState = { transactions: tagged, accountId };

  showModal('Review Transactions', `
    <div class="info-panel info-panel--green">
      Found <strong>${tagged.length}</strong> transactions · <strong id="import-count">${newCount}</strong> selected
      ${dupCount ? `· <span class="import-dup-badge">${dupCount} possible duplicate${dupCount > 1 ? 's' : ''} unchecked</span>` : ''}
    </div>
    <div class="import-scroll">
      <table class="import-table">
        <thead>
          <tr>
            <th class="import-th-cb">
              <input type="checkbox" id="import-select-all" checked title="Select / deselect all" />
            </th>
            <th>Date</th><th>Description</th><th>Category</th><th class="import-th-amt">Amount</th>
          </tr>
        </thead>
        <tbody id="import-tbody">${rows}</tbody>
      </table>
    </div>
    <button class="btn btn--primary" id="import-confirm-btn" data-action="confirm-csv-import">
      ✅ Import ${newCount} Transaction${newCount !== 1 ? 's' : ''}
    </button>
    <button class="btn btn--subtle" data-action="start-csv-import">↩ Try a Different File</button>
  `);

  requestAnimationFrame(() => {
    document.querySelectorAll('.import-cb').forEach((cb) => cb.addEventListener('change', _refreshImportCount));
    const all = document.getElementById('import-select-all');
    if (all) {
      all.indeterminate = dupCount > 0;
      all.addEventListener('change', (e) => {
        document.querySelectorAll('.import-cb').forEach((cb) => { cb.checked = e.target.checked; });
        _refreshImportCount();
      });
    }
  });
}

function _refreshImportCount() {
  const n    = document.querySelectorAll('.import-cb:checked').length;
  const el   = document.getElementById('import-count');
  const btn  = document.getElementById('import-confirm-btn');
  if (el)  el.textContent  = n;
  if (btn) btn.textContent = `✅ Import ${n} Transaction${n !== 1 ? 's' : ''}`;
}

/* ── Step 4 — Commit to ledger ───────────────────────────── */

function confirmCsvImport() {
  if (!_importState) return;
  const { transactions, accountId } = _importState;
  let count = 0;

  transactions.forEach((t, i) => {
    const cb = document.querySelector(`.import-cb[data-idx="${i}"]`);
    if (!cb?.checked) return;

    const desc = document.querySelector(`.import-desc[data-idx="${i}"]`);
    const cat  = document.querySelector(`.import-cat[data-idx="${i}"]`);

    const bKey          = (t.billName     || '').toLowerCase().trim();
    const iKey          = (t.incomeSource || '').toLowerCase().trim();
    const matchedBill   = bKey ? AppData.bills.find((b)  => b.name.toLowerCase().trim() === bKey)  : null;
    const matchedIncome = iKey ? AppData.income.find((i) => i.name.toLowerCase().trim() === iKey) : null;

    logTransaction({
      type:       matchedBill ? 'bill' : t.type,
      name:       desc ? (desc.value.trim() || t.description) : t.description,
      amount:     t.amount,
      date:       t.date,
      category:   cat ? cat.value : t.category,
      accountId,
      billId:     matchedBill?.id   || null,
      incomeId:   matchedIncome?.id || null,
      note:       'imported',
    });
    count++;
  });

  _importState = null;
  const accName = AppData.accounts.find((a) => a.id === accountId)?.name || 'account';

  showModal('Import Complete', `
    <div class="info-panel info-panel--green">
      ✅ <strong>${count}</strong> transaction${count !== 1 ? 's' : ''} added to <strong>${esc(accName)}</strong>.
    </div>
    <button class="btn btn--primary" data-action="hide-modal">Done</button>
  `);

  render();
}
