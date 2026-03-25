/**
 * NyanTales — Data Export/Import Manager
 * Allows players to backup and restore all game data (saves, tracker,
 * achievements, settings) as a single JSON file.
 *
 * @class DataManager
 */

class DataManager {
  constructor() {
    /** Keys to include in export/import */
    this.DATA_KEYS = [
      'nyantales-tracker',
      'nyantales-achievements',
      'nyantales-settings',
      'nyantales-hints-shown'
    ];
    /** Prefix for per-story save slots */
    this.SAVE_PREFIX = 'nyantales-saves-';
  }

  /**
   * Gather all NyanTales data from localStorage into a plain object.
   * @returns {{ version: number, exportedAt: string, data: Object }}
   */
  exportAll() {
    const data = {};

    // Fixed keys
    for (const key of this.DATA_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
      }
    }

    // Per-story saves
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SAVE_PREFIX)) {
        try { data[key] = JSON.parse(localStorage.getItem(key)); } catch { /* skip corrupt */ }
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  /**
   * Download the export as a .json file.
   */
  downloadExport() {
    const payload = this.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `nyantales-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a JSON file, merging into localStorage.
   * @param {File} file - The JSON file selected by the user
   * @returns {Promise<{ imported: number, errors: string[] }>}
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (!payload.data || typeof payload.data !== 'object') {
            return reject(new Error('Invalid backup file format'));
          }

          let imported = 0;
          const errors = [];

          for (const [key, value] of Object.entries(payload.data)) {
            // Only import recognized keys
            const isValid = this.DATA_KEYS.includes(key) || key.startsWith(this.SAVE_PREFIX);
            if (!isValid) {
              errors.push(`Skipped unrecognized key: ${key}`);
              continue;
            }
            try {
              const serialized = typeof value === 'string' ? value : JSON.stringify(value);
              localStorage.setItem(key, serialized);
              imported++;
            } catch (e) {
              errors.push(`Failed to import ${key}: ${e.message}`);
            }
          }

          resolve({ imported, errors });
        } catch (e) {
          reject(new Error(`Failed to parse backup: ${e.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Get a summary of current data usage.
   * @returns {{ stories: number, saves: number, totalKeys: number, estimatedBytes: number }}
   */
  getStats() {
    let stories = 0;
    let saves = 0;
    let totalKeys = 0;
    let estimatedBytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('nyantales')) continue;
      totalKeys++;
      const val = localStorage.getItem(key) || '';
      estimatedBytes += key.length + val.length;

      if (key.startsWith(this.SAVE_PREFIX)) saves++;
      if (key === 'nyantales-tracker') {
        try {
          const data = JSON.parse(val);
          stories = Object.keys(data.stories || {}).length;
        } catch { /* noop */ }
      }
    }

    return { stories, saves, totalKeys, estimatedBytes };
  }
}
