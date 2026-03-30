/**
 * NyanTales — Settings Manager
 * Persistent user preferences: text speed, auto-play, skip read, audio volume.
 */

class SettingsManager {
  constructor() {
    this.STORAGE_KEY = 'nyantales-settings';
    this.defaults = {
      textSpeed: 18,       // ms per 2-char chunk (lower = faster)
      autoPlay: false,     // auto-advance after text finishes
      autoPlayDelay: 2500, // ms to wait before auto-advance
      skipRead: false,     // fast-forward through visited scenes
      audioVolume: 0.5,    // 0–1 master volume
      screenShake: true,   // enable shake/glitch effects
      particles: true,     // floating particle overlay
      fullscreen: false,   // fullscreen mode (not persisted)
      colorTheme: 'cyan',  // accent color theme: cyan, magenta, green, amber, violet
      fontSize: 100        // text font size as percentage (80–140)
    };
    this.data = this._load();
    this._listeners = [];
  }

  get(key) {
    return this.data[key] ?? this.defaults[key];
  }

  set(key, value) {
    this.data[key] = value;
    this._save();
    this._notify(key, value);
  }

  /** Subscribe to setting changes */
  onChange(callback) {
    this._listeners.push(callback);
  }

  _notify(key, value) {
    for (const cb of this._listeners) {
      try { cb(key, value); } catch (e) { /* ignore */ }
    }
  }

  /** Reset all settings to defaults */
  reset() {
    this.data = { ...this.defaults };
    this._save();
    for (const k in this.data) this._notify(k, this.data[k]);
  }

  _load() {
    const stored = SafeStorage.getJSON(this.STORAGE_KEY, null);
    return stored ? { ...this.defaults, ...stored } : { ...this.defaults };
  }

  _save() {
    const { fullscreen, ...persist } = this.data;
    SafeStorage.setJSON(this.STORAGE_KEY, persist);
  }
}
