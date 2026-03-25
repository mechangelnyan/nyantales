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
      fullscreen: false    // fullscreen mode (not persisted)
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
    for (const [k, v] of Object.entries(this.data)) this._notify(k, v);
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch (e) {
      return { ...this.defaults };
    }
  }

  _save() {
    try {
      const { fullscreen, ...persist } = this.data;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persist));
    } catch (e) { /* noop */ }
  }
}
