/**
 * NyanTales — Keyboard Help Modal
 *
 * Shows all keyboard shortcuts in a styled overlay. Accessible anytime
 * via the '?' key or the ❓ HUD button. Also shown as a brief toast
 * on the very first story entry.
 *
 * @class KeyboardHelp
 */
class KeyboardHelp {
  constructor() {
    this.overlay = null;
    this._focusTrap = null;
    this._built = false;
  }

  /** Lazy-build the overlay DOM */
  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'keyboard-help-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Keyboard Shortcuts');
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="keyboard-help-panel">
        <div class="keyboard-help-header">
          <div class="keyboard-help-title">⌨️ Keyboard Shortcuts</div>
          <button class="keyboard-help-close" aria-label="Close">✕</button>
        </div>
        <div class="keyboard-help-body">
          <div class="kh-section">
            <div class="kh-section-title">Navigation</div>
            <div class="kh-row"><kbd>Space</kbd> / <kbd>Enter</kbd><span>Advance text / skip typewriter</span></div>
            <div class="kh-row"><kbd>1</kbd>–<kbd>9</kbd><span>Select choice by number</span></div>
            <div class="kh-row"><kbd>B</kbd><span>Rewind one scene</span></div>
            <div class="kh-row"><kbd>Esc</kbd><span>Back to story list / close panel</span></div>
          </div>
          <div class="kh-section">
            <div class="kh-section-title">Panels</div>
            <div class="kh-row"><kbd>H</kbd><span>Text history</span></div>
            <div class="kh-row"><kbd>G</kbd><span>Scene select</span></div>
            <div class="kh-row"><kbd>R</kbd><span>Route map (branching graph)</span></div>
            <div class="kh-row"><kbd>Q</kbd><span>Save / Load</span></div>
            <div class="kh-row"><kbd>S</kbd><span>Settings</span></div>
          </div>
          <div class="kh-section">
            <div class="kh-section-title">Toggles</div>
            <div class="kh-row"><kbd>A</kbd><span>Auto-play on/off</span></div>
            <div class="kh-row"><kbd>M</kbd><span>Audio on/off</span></div>
            <div class="kh-row"><kbd>F</kbd><span>Fullscreen on/off</span></div>
            <div class="kh-row"><kbd>?</kbd><span>This help screen</span></div>
          </div>
          <div class="kh-section">
            <div class="kh-section-title">History Panel</div>
            <div class="kh-row"><kbd>PgUp</kbd> / <kbd>PgDn</kbd><span>Scroll history (large step)</span></div>
            <div class="kh-row"><kbd>↑</kbd> / <kbd>↓</kbd><span>Scroll history (small step)</span></div>
            <div class="kh-row"><kbd>Home</kbd> / <kbd>End</kbd><span>Jump to start / end of history</span></div>
          </div>
          <div class="kh-section">
            <div class="kh-section-title">Mobile Gestures</div>
            <div class="kh-row"><span class="kh-gesture">← Swipe left</span><span>Advance text</span></div>
            <div class="kh-row"><span class="kh-gesture">→ Swipe right</span><span>Open history</span></div>
            <div class="kh-row"><span class="kh-gesture">↓ Swipe down</span><span>Open settings</span></div>
            <div class="kh-row"><span class="kh-gesture">↑ Swipe up</span><span>Open save/load</span></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Single delegated click — handles close button + backdrop
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.keyboard-help-close')) this.hide();
    });

    this._built = true;
  }

  show() {
    this._build();
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) {
      this._focusTrap = new FocusTrap(this.overlay.querySelector('.keyboard-help-panel'));
    }
    this._focusTrap.activate();
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.remove('visible');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this._focusTrap) this._focusTrap.deactivate();
  }

  get isVisible() {
    return this.overlay?.classList.contains('visible') || false;
  }
}
