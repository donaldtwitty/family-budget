/**
 * chat.js — Floating budget assistant powered by Claude.
 * Injects a persistent chat widget into the page; shares the API key
 * already used for receipt scanning and CSV import.
 */

/* eslint-disable no-unused-vars */

/** Conversation messages sent to the API (excludes the static welcome). */
let _chatHistory = [];
let _chatOpen    = false;
let _chatReady   = false; // true after first open (welcome shown)

/* ── Bootstrap ───────────────────────────────────────────── */

function initChat() {
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <div class="chat-panel" id="chat-panel" aria-hidden="true" role="dialog" aria-label="Budget assistant">
      <div class="chat-header">
        <div class="chat-header__left">
          <div class="chat-avatar" aria-hidden="true">✨</div>
          <div>
            <p class="chat-header__title">Budget Assistant</p>
            <p class="chat-header__sub">Powered by Claude</p>
          </div>
        </div>
        <button class="chat-close" aria-label="Close chat" id="chat-close-btn">✕</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-footer">
        <textarea id="chat-input" class="chat-input" placeholder="Ask about your budget…"
                  rows="1" maxlength="600" aria-label="Message"></textarea>
        <button class="chat-send" id="chat-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
    <button class="chat-fab" id="chat-fab" aria-label="Open budget assistant" aria-expanded="false">
      <svg class="chat-fab__icon chat-fab__icon--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="chat-fab__icon chat-fab__icon--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  document.body.appendChild(widget);

  document.getElementById('chat-fab')?.addEventListener('click', toggleChat);
  document.getElementById('chat-close-btn')?.addEventListener('click', toggleChat);

  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _submitMessage(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  document.getElementById('chat-send')?.addEventListener('click', _submitMessage);
}

/* ── Open / close ────────────────────────────────────────── */

function toggleChat() {
  _chatOpen = !_chatOpen;

  const panel = document.getElementById('chat-panel');
  const fab   = document.getElementById('chat-fab');
  panel?.classList.toggle('chat-panel--open', _chatOpen);
  panel?.setAttribute('aria-hidden', String(!_chatOpen));
  fab?.setAttribute('aria-expanded', String(_chatOpen));
  fab?.classList.toggle('chat-fab--open', _chatOpen);

  if (_chatOpen) {
    if (!_chatReady) { _showWelcome(); _chatReady = true; }
    setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
    _scrollToBottom();
  }
}

/* ── Welcome ─────────────────────────────────────────────── */

function _showWelcome() {
  _appendBubble('assistant',
    "Hi! I'm your budget assistant. Ask me anything — account balances, upcoming bills, " +
    "spending this month, goal progress, or debt payoff estimates."
  );
}

/* ── Send a message ──────────────────────────────────────── */

async function _submitMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text) return;

  if (!getApiKey()) {
    toggleChat();
    showApiKeySetup();
    return;
  }

  input.value = '';
  input.style.height = 'auto';

  _chatHistory.push({ role: 'user', content: text });
  _appendBubble('user', text);

  const send = document.getElementById('chat-send');
  if (send) send.disabled = true;
  _showTyping();

  try {
    const reply = await _callClaude();
    _hideTyping();
    _chatHistory.push({ role: 'assistant', content: reply });
    _appendBubble('assistant', reply);
  } catch (err) {
    _hideTyping();
    const msg = err.message || 'Something went wrong. Please try again.';
    _appendBubble('assistant', `⚠ ${msg}`);
  } finally {
    if (send) send.disabled = false;
    document.getElementById('chat-input')?.focus();
  }
}

/* ── Claude API call ─────────────────────────────────────── */

async function _callClaude() {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:     _buildContext(),
      messages:   _chatHistory,
    }),
  });

  if (response.status === 401) throw new Error('Invalid API key — check your key in Receipt Scan Settings.');
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/* ── System prompt with live budget data ─────────────────── */

function _buildContext() {
  const today = todayISO();

  const accs = (AppData.accounts || []).map((a) =>
    `${a.name}: balance ${fmt(realBalance(a.id))}, safe to spend ${fmt(safeToSpend(a.id))}`
  ).join('\n');

  const upcoming = (AppData.accounts || []).flatMap((a) =>
    pendingBills(a.id).map((b) => `${b.name} — ${fmt(b.amount)} due the ${ord(b.day)} (${a.name})`)
  );

  const monthTotal = thisMonthSpending().reduce((s, e) => s + e.amount, 0);
  const catLines   = spendingByCategory().slice(0, 10)
    .map((c) => `  ${c.emoji} ${c.name}: ${fmt(c.total)}`).join('\n');

  const goals = (AppData.goals || []).map((g) => {
    const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
    return `  ${g.emoji} ${g.name}: ${fmt(g.saved)} of ${fmt(g.target)} (${pct}%)`;
  }).join('\n');

  const debts = (AppData.debts || [])
    .filter((d) => d.balance > 0)
    .map((d) => `  ${d.name}: ${fmt(d.balance)} balance, ${fmt(d.payment)}/mo, ${d.rate}% APR`)
    .join('\n');

  return `You are a friendly and concise budget assistant built into a family finance app.
Keep answers to 2–4 sentences unless the user asks for detail. Use the numbers below — never invent figures.
Today is ${today}.

ACCOUNTS
${accs || 'No accounts'}

UPCOMING BILLS (pending / overdue)
${upcoming.length ? upcoming.join('\n') : 'None'}

SPENDING THIS MONTH
Total: ${fmt(monthTotal)}
${catLines || '  (none logged yet)'}

SAVINGS GOALS
${goals || '  (none)'}

DEBTS WITH BALANCES
${debts || '  (none)'}

If asked about something not shown here, say you don't have that data. Never make up numbers.`;
}

/* ── DOM helpers ─────────────────────────────────────────── */

function _appendBubble(role, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${role}`;
  div.innerHTML = `<div class="chat-bubble">${esc(text).replace(/\n/g, '<br>')}</div>`;
  container.appendChild(div);
  _scrollToBottom();
}

function _showTyping() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.id        = 'chat-typing';
  div.className = 'chat-msg chat-msg--assistant';
  div.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
  container.appendChild(div);
  _scrollToBottom();
}

function _hideTyping() {
  document.getElementById('chat-typing')?.remove();
}

function _scrollToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

/* ── Self-initialize once DOM is ready ───────────────────── */
initChat();
