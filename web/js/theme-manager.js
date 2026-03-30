/**
 * ThemeManager — Color themes, particles, font size, fullscreen.
 *
 * Centralizes visual-preference application that was previously
 * scattered across main.js.  Keeps the CSS-custom-property plumbing
 * in one place so main.js only needs to call ThemeManager methods.
 */
/* global SettingsManager */
// eslint-disable-next-line no-unused-vars
class ThemeManager {
  static COLOR_THEMES = {
    cyan:    { accent: '#00d4ff', rgb: [0, 212, 255] },
    magenta: { accent: '#ff36ab', rgb: [255, 54, 171] },
    green:   { accent: '#00ff88', rgb: [0, 255, 136] },
    amber:   { accent: '#ffd700', rgb: [255, 215, 0] },
    violet:  { accent: '#cc66ff', rgb: [204, 102, 255] }
  };

  /** @param {SettingsManager} settings */
  constructor(settings) {
    this._settings = settings;
    this._themeColorMeta = document.querySelector('meta[name="theme-color"]');
  }

  // ── Apply helpers ──

  applyColorTheme(themeName) {
    const theme = ThemeManager.COLOR_THEMES[themeName] || ThemeManager.COLOR_THEMES.cyan;
    const root = document.documentElement;
    root.style.setProperty('--accent-cyan', theme.accent);
    const [r, g, b] = theme.rgb;
    root.style.setProperty('--accent-r', r);
    root.style.setProperty('--accent-g', g);
    root.style.setProperty('--accent-b', b);
    if (this._themeColorMeta) this._themeColorMeta.setAttribute('content', theme.accent);
  }

  applyParticles(on) {
    document.body.classList.toggle('no-particles', !on);
  }

  applyFontSize(pct) {
    document.documentElement.style.setProperty('--text-scale', `${pct}%`);
  }

  toggleFullscreen(on) {
    if (on && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (!on && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  /** Apply all stored settings on boot. */
  applyAll() {
    this.applyColorTheme(this._settings.get('colorTheme'));
    this.applyParticles(this._settings.get('particles'));
    this.applyFontSize(this._settings.get('fontSize'));
  }

  /**
   * Wire setting-change reactions.
   * @param {Object} deps — { ui, audio, updateAutoPlayHUD, clearAutoPlayTimer }
   */
  wireReactivity(deps) {
    const { ui, audio, updateAutoPlayHUD, clearAutoPlayTimer } = deps;

    this._settings.onChange((key, value) => {
      if (key === 'textSpeed')   ui.typewriterSpeed = value;
      if (key === 'autoPlay')  { updateAutoPlayHUD(value); if (!value) clearAutoPlayTimer(); }
      if (key === 'particles')   this.applyParticles(value);
      if (key === 'audioVolume' && audio.masterGain) {
        audio.masterGain.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.1);
      }
      if (key === 'colorTheme') this.applyColorTheme(value);
      if (key === 'fontSize')   this.applyFontSize(value);
      if (key === 'fullscreen') this.toggleFullscreen(value);
    });

    // Sync setting when user exits fullscreen via Escape/browser UI
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this._settings.get('fullscreen')) {
        this._settings.set('fullscreen', false);
      }
    });
  }
}
