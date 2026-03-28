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

    const panel = document.createElement('div');
    panel.className = 'keyboard-help-panel';

    const header = document.createElement('div');
    header.className = 'keyboard-help-header';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'keyboard-help-title';
    titleDiv.textContent = '⌨️ Keyboard Shortcuts';
    header.appendChild(titleDiv);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'keyboard-help-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'keyboard-help-body';

    // Helper to build a section with rows
    const mkSection = (title, rows) => {
      const sec = document.createElement('div');
      sec.className = 'kh-section';
      const h = document.createElement('div');
      h.className = 'kh-section-title';
      h.textContent = title;
      sec.appendChild(h);
      for (const row of rows) {
        const r = document.createElement('div');
        r.className = 'kh-row';
        // Keys part
        const keysSpan = document.createElement('span');
        if (row.gesture) {
          keysSpan.className = 'kh-gesture';
          keysSpan.textContent = row.keys;
        } else {
          // Build kbd elements; '|' = ' / ' separator, '~' = '–' (range)
          const parts = row.keys.split(/([|~])/);
          for (let i = 0; i < parts.length; i++) {
            const tok = parts[i];
            if (tok === '|') { keysSpan.appendChild(document.createTextNode(' / ')); continue; }
            if (tok === '~') { keysSpan.appendChild(document.createTextNode('–')); continue; }
            if (!tok.trim()) continue;
            const kbd = document.createElement('kbd');
            kbd.textContent = tok.trim();
            keysSpan.appendChild(kbd);
          }
        }
        r.appendChild(keysSpan);
        const desc = document.createElement('span');
        desc.textContent = row.desc;
        r.appendChild(desc);
        sec.appendChild(r);
      }
      return sec;
    };

    body.appendChild(mkSection('Navigation', [
      { keys: 'Space|Enter', desc: 'Advance text / skip typewriter' },
      { keys: '1~9', desc: 'Select choice by number' },
      { keys: 'B', desc: 'Rewind one scene' },
      { keys: 'Esc', desc: 'Back to story list / close panel' }
    ]));
    body.appendChild(mkSection('Panels', [
      { keys: 'H', desc: 'Text history' },
      { keys: 'G', desc: 'Scene select' },
      { keys: 'R', desc: 'Route map (branching graph)' },
      { keys: 'Q', desc: 'Save / Load' },
      { keys: 'S', desc: 'Settings' }
    ]));
    body.appendChild(mkSection('Toggles', [
      { keys: 'A', desc: 'Auto-play on/off' },
      { keys: 'M', desc: 'Audio on/off' },
      { keys: 'F', desc: 'Fullscreen on/off' },
      { keys: '?', desc: 'This help screen' }
    ]));
    body.appendChild(mkSection('History Panel', [
      { keys: 'PgUp | PgDn', desc: 'Scroll history (large step)' },
      { keys: '↑ | ↓', desc: 'Scroll history (small step)' },
      { keys: 'Home | End', desc: 'Jump to start / end of history' }
    ]));
    body.appendChild(mkSection('Mobile Gestures', [
      { keys: '← Swipe left', desc: 'Advance text', gesture: true },
      { keys: '→ Swipe right', desc: 'Open history', gesture: true },
      { keys: '↓ Swipe down', desc: 'Open settings', gesture: true },
      { keys: '↑ Swipe up', desc: 'Open save/load', gesture: true }
    ]));

    panel.appendChild(body);
    this.overlay.appendChild(panel);
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
      this._focusTrap = new FocusTrap(this.overlay.firstElementChild);
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
