/**
 * api.js — REST API client for the Family Budget backend.
 *
 * Replaces the localStorage-only persistence in state.js with
 * server-side storage via the Spring Boot REST API.
 *
 * Strategy:
 *  - On load  : try the server first, fall back to localStorage.
 *  - On save  : write to localStorage immediately (instant feedback),
 *               then asynchronously sync to the server.
 */

/* eslint-disable no-unused-vars */

const API_BASE = '/api';

/**
 * Fetches the stored AppData JSON from the server.
 *
 * @returns {Promise<object|null>} Parsed AppData object, or null if the
 *   server has no data yet (first launch).
 */
async function apiLoadData() {
  try {
    const res = await fetch(`${API_BASE}/data`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.status === 204) {
      // No data on server yet — let the caller seed from defaults.
      return null;
    }

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[api] Load failed, will use localStorage fallback.', err);
    return null;
  }
}

/**
 * Persists the full AppData object to the server.
 * Failures are logged but do not interrupt the UI —
 * localStorage already holds the latest state as a safety net.
 *
 * @param {object} appData
 */
async function apiSaveData(appData) {
  try {
    const res = await fetch(`${API_BASE}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server returned ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('[api] Save to server failed.', err);
    // The data is already in localStorage; it will sync on next successful save.
  }
}
