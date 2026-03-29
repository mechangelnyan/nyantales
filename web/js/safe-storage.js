/**
 * NyanTales — SafeStorage
 *
 * A localStorage wrapper that gracefully handles:
 *   - QuotaExceededError (with auto-eviction of oldest auto-saves)
 *   - Corrupt or missing JSON data (returns fallback)
 *   - Private browsing restrictions
 *
 * Used by: SettingsManager, StoryTracker, SaveManager, DataManager.
 *
 * @class SafeStorage
 */
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
   * Remove a key from localStorage.
   * @param {string} key
   */
  static remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }

  /**
   * Remove the oldest auto-save slot to free space.
   * Scans all `nyantales-saves-*` keys for auto-save entries (key `'auto'`)
   * and deletes the one with the oldest timestamp.
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
        if (data && data.auto && data.auto.timestamp < oldestTime) {
          oldestTime = data.auto.timestamp;
          oldestKey = key;
        }
      } catch { /* skip corrupt */ }
    }

    if (oldestKey) {
      try {
        const data = JSON.parse(localStorage.getItem(oldestKey));
        delete data.auto;
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
