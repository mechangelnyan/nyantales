/**
 * NyanTales — Procedural Ambient Audio Engine
 * Generates background ambiance using Web Audio API (no external files needed).
 * Each background theme gets a unique synthesized atmosphere.
 */

class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.currentTheme = null;
    this.nodes = [];
    this._blipTimers = []; // track blip setTimeout IDs for cleanup
    this._fadeTimers = []; // track setTheme/stop fade setTimeout IDs for cleanup
    this._noiseBuffer = null; // shared noise buffer (reused across theme changes)
    this.enabled = false;
    this.volume = 0.15;
    this._fadeTime = 1.5; // seconds
  }

  /** Initialize AudioContext (must be called from user gesture) */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);
    this.enabled = true;
  }

  /** Set volume (0-1) */
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.currentTheme) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.3);
    }
  }

  /** Toggle audio on/off */
  toggle() {
    if (!this.ctx) this.init();
    this.enabled = !this.enabled;
    if (this.enabled && this.currentTheme) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.5);
    } else {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }
    return this.enabled;
  }

  /** Switch to a background theme */
  setTheme(bgClass) {
    if (!this.ctx) return;
    const theme = this._classifyTheme(bgClass);
    if (theme === this.currentTheme) return;

    // Fade out old
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);

    // Cancel blip + fade timers before stopping nodes (prevents orphaned callbacks)
    this._cancelBlipTimers();
    this._cancelFadeTimers();

    // Stop old nodes after fade (tracked to prevent stale cleanup on rapid theme changes)
    const oldNodes = this.nodes.slice();
    this._trackFadeTimer(setTimeout(() => {
      for (const n of oldNodes) {
        try { n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      }
    }, 800));
    this.nodes = [];

    this.currentTheme = theme;

    // Build new theme after brief pause (tracked for cancellation)
    this._trackFadeTimer(setTimeout(() => {
      if (this.currentTheme !== theme) return; // theme changed during fade
      this._buildTheme(theme);
      if (this.enabled) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, this._fadeTime);
      }
    }, 500));
  }

  /** Stop all audio */
  stop() {
    if (!this.ctx) return;
    this._cancelBlipTimers();
    this._cancelFadeTimers();
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    this._trackFadeTimer(setTimeout(() => {
      for (const n of this.nodes) {
        try { n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      }
      this.nodes = [];
      this.currentTheme = null;
    }, 500));
  }

  /** Cancel all blip recursive setTimeout chains to prevent memory leaks. */
  _cancelBlipTimers() {
    for (const id of this._blipTimers) clearTimeout(id);
    this._blipTimers.length = 0;
  }

  /** Track a fade/build setTimeout for cancellation on rapid theme changes. */
  _trackFadeTimer(id) { this._fadeTimers.push(id); return id; }

  /** Cancel all pending fade/build timers (prevents stale node stops + builds during rapid transitions). */
  _cancelFadeTimers() {
    for (const id of this._fadeTimers) clearTimeout(id);
    this._fadeTimers.length = 0;
  }

  // ── Theme Classification ──

  /** Static lookup — avoids allocating a new object on every classify call. */
  static _THEME_MAP = {
    'bg-terminal': 'digital',
    'bg-filesystem': 'digital',
    'bg-server-room': 'server',
    'bg-network': 'network',
    'bg-memory': 'memory',
    'bg-database': 'database',
    'bg-cafe': 'cafe',
    'bg-warm': 'warm',
    'bg-danger': 'danger',
    'bg-void': 'void'
  };

  _classifyTheme(bgClass) {
    if (!bgClass) return 'default';
    return AmbientAudio._THEME_MAP[bgClass] || 'default';
  }

  // ── Theme Builders ──

  /** Direct switch dispatch — avoids allocating a builder object per theme change. */
  _buildTheme(theme) {
    switch (theme) {
      case 'digital': this._buildDigital(); break;
      case 'server':  this._buildServer();  break;
      case 'network': this._buildNetwork(); break;
      case 'memory':  this._buildMemory();  break;
      case 'database':this._buildDatabase();break;
      case 'cafe':    this._buildCafe();    break;
      case 'warm':    this._buildWarm();    break;
      case 'danger':  this._buildDanger();  break;
      case 'void':    this._buildVoid();    break;
      default:        this._buildDigital(); break;
    }
  }

  /** Get or create a shared white noise buffer (reused across all themes). */
  _getNoiseBuffer() {
    if (this._noiseBuffer && this._noiseBuffer.sampleRate === this.ctx.sampleRate) {
      return this._noiseBuffer;
    }
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    this._noiseBuffer = buffer;
    return buffer;
  }

  /** Create a filtered noise source (reuses shared noise buffer). */
  _noise(type = 'lowpass', freq = 800, q = 1, gain = 0.3) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._getNoiseBuffer();
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.value = gain;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start();
    this.nodes.push(src);
    return { src, filter, gain: g };
  }

  /** Create a slow oscillator pad */
  _pad(freq, type = 'sine', gain = 0.08) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    // Slow LFO for movement
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = freq * 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const g = this.ctx.createGain();
    g.gain.value = gain;

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    lfo.start();
    this.nodes.push(osc, lfo);
    return osc;
  }

  /** Random blip/click pattern (timers tracked for cleanup on theme change). */
  _blips(interval, freqMin, freqMax, duration = 0.05, gain = 0.04) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.masterGain);

    const doBlip = () => {
      if (!this.currentTheme) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freqMin + Math.random() * (freqMax - freqMin);
      const env = this.ctx.createGain();
      env.gain.value = 0;
      env.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
      env.gain.setTargetAtTime(0, this.ctx.currentTime + duration * 0.3, duration * 0.5);

      osc.connect(env);
      env.connect(g);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);

      const next = interval * (0.5 + Math.random());
      this._blipTimers.push(setTimeout(doBlip, next * 1000));
    };
    this._blipTimers.push(setTimeout(doBlip, Math.random() * interval * 1000));
  }

  // ── Specific Themes ──

  _buildDigital() {
    // Low hum + soft noise + occasional data blips
    this._pad(55, 'sine', 0.06);
    this._pad(82.5, 'sine', 0.03);
    this._noise('lowpass', 400, 0.5, 0.04);
    this._blips(3, 800, 2000, 0.03, 0.02);
  }

  _buildServer() {
    // Fan noise + deeper hum + status beeps
    this._noise('lowpass', 300, 0.3, 0.08);
    this._noise('bandpass', 120, 2, 0.05);
    this._pad(60, 'sine', 0.05);
    this._pad(120, 'triangle', 0.02);
    this._blips(5, 1000, 1500, 0.02, 0.015);
  }

  _buildNetwork() {
    // Higher frequency movement, packet sounds
    this._pad(110, 'sine', 0.04);
    this._pad(165, 'triangle', 0.025);
    this._noise('bandpass', 2000, 3, 0.02);
    this._blips(1.2, 1200, 3000, 0.02, 0.03);
    this._blips(4, 400, 600, 0.08, 0.02);
  }

  _buildMemory() {
    // Ethereal, spacey
    this._pad(73.4, 'sine', 0.06); // D2
    this._pad(110, 'sine', 0.04); // A2
    this._pad(146.8, 'triangle', 0.02); // D3
    this._noise('highpass', 4000, 0.5, 0.015);
    this._blips(6, 500, 1000, 0.1, 0.015);
  }

  _buildDatabase() {
    // Structured, mechanical
    this._pad(82.4, 'square', 0.02);
    this._pad(110, 'sine', 0.04);
    this._noise('lowpass', 200, 1, 0.04);
    this._blips(2, 600, 900, 0.04, 0.025);
  }

  _buildCafe() {
    // Warm, gentle
    this._pad(130.8, 'sine', 0.05); // C3
    this._pad(164.8, 'sine', 0.035); // E3
    this._pad(196, 'sine', 0.025); // G3
    this._noise('lowpass', 600, 0.3, 0.03);
  }

  _buildWarm() {
    // Cozy, safe
    this._pad(98, 'sine', 0.05); // G2
    this._pad(123.5, 'sine', 0.04); // B2
    this._pad(147, 'triangle', 0.025); // D3
    this._noise('lowpass', 300, 0.3, 0.02);
  }

  _buildDanger() {
    // Tense, dissonant
    this._pad(55, 'sawtooth', 0.03);
    this._pad(58.3, 'sine', 0.05); // Bb1 - dissonant against A
    this._noise('bandpass', 150, 5, 0.06);
    this._noise('highpass', 3000, 2, 0.02);
    this._blips(2, 200, 400, 0.06, 0.04);
  }

  _buildVoid() {
    // Minimal, eerie
    this._pad(36.7, 'sine', 0.04); // D1
    this._noise('bandpass', 80, 8, 0.03);
    this._blips(8, 300, 600, 0.15, 0.01);
  }
}
