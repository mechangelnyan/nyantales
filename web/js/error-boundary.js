/**
 * NyanTales — Error Boundary & Storage Safety
 *
 * Global error / unhandled rejection handler: catches fatal JS errors
 * and surfaces a non-blocking toast so the player knows something went
 * wrong without losing the current screen.
 *
 * Also provides `SafeStorage` — a localStorage wrapper that handles
 * quota-exceeded errors, corrupt JSON, and private-browsing restrictions.
 *
 * @class SafeStorage
 */

// ── Global Error Handler ──

window.addEventListener('error', (event) => {
  console.error('[NyanTales] Uncaught error:', event.error || event.message);
  // Show toast only if Toast system is loaded
  if (typeof Toast !== 'undefined') {
    Toast.show('Something went wrong — your saves are safe', {
      icon: '⚠️',
      color: 'rgba(255,140,0,0.9)',
      duration: 5000
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[NyanTales] Unhandled promise rejection:', event.reason);
  if (typeof Toast !== 'undefined') {
    Toast.show('A background task failed — gameplay continues', {
      icon: '⚠️',
      color: 'rgba(255,140,0,0.9)',
      duration: 4000
    });
  }
});

// ── Safe localStorage Wrapper ──

class SafeStorage {
  /**
   * Get a parsed JSON value from localStorage.
   * Returns `fallback` on missing key, corrupt JSON, or any error.
   * @param {string} key
   * @param {*} [fallback=null]
   * @returns {*}
   */
  static getJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[SafeStorage] Failed to read "${key}":`, e.message);
      return fallback;
    }
  }

  /**
   * Write a JSON value to localStorage.
   * Handles quota-exceeded by attempting cleanup of oldest saves first.
   * @param {string} key
   * @param {*} value - Will be JSON.stringify'd
   * @returns {boolean} true if write succeeded
   */
  static setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[SafeStorage] Quota exceeded, attempting cleanup...');
        SafeStorage._evictOldest();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e2) {
          console.error('[SafeStorage] Still over quota after cleanup:', e2.message);
          if (typeof Toast !== 'undefined') {
            Toast.error('Storage full — try exporting & clearing old saves');
          }
          return false;
        }
      }
      console.error(`[SafeStorage] Failed to write "${key}":`, e.message);
      return false;
    }
  }

  /**
   * Get a raw string from localStorage (no JSON parsing).
   * @param {string} key
   * @returns {string|null}
   */
  static getRaw(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  /**
   * Set a raw string in localStorage.
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  static setRaw(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch { return false; }
  }

  /**
   * Remove the oldest auto-save slot to free space.
   * @private
   */
  static _evictOldest() {
    const prefix = 'nyantales-saves-';
    let oldestKey = null;
    let oldestTime = Infinity;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        // Look for auto-save slot (slot index 3)
        if (data && data[3] && data[3].timestamp < oldestTime) {
          oldestTime = data[3].timestamp;
          oldestKey = key;
        }
      } catch { /* skip corrupt */ }
    }

    if (oldestKey) {
      try {
        const data = JSON.parse(localStorage.getItem(oldestKey));
        delete data[3]; // Remove auto-save slot
        localStorage.setItem(oldestKey, JSON.stringify(data));
        console.info(`[SafeStorage] Evicted oldest auto-save from ${oldestKey}`);
      } catch { /* best effort */ }
    }
  }

  /**
   * Estimate localStorage usage in bytes for NyanTales keys.
   * @returns {number}
   */
  static estimateUsage() {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nyantales')) {
          bytes += key.length + (localStorage.getItem(key) || '').length;
        }
      }
    } catch { /* noop */ }
    return bytes * 2; // UTF-16 = 2 bytes per char
  }
}
