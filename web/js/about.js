/**
 * NyanTales — About / Credits Panel
 *
 * Displays project info, version, and credits in a styled overlay.
 * Accessible from title screen via the "About" button.
 *
 * @class AboutPanel
 */
class AboutPanel {
  constructor() {
    this.overlay = null;
    this._focusTrap = null;
    this._statsEl = null;
    this._built = false;
  }

  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'about-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'About NyanTales');
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="about-panel">
        <div class="about-header">
          <div class="about-title">🐱 About NyanTales</div>
          <button class="about-close" aria-label="Close">✕</button>
        </div>
        <div class="about-body">
          <pre class="about-ascii" aria-hidden="true"> /\\_/\\
( o.o )
 > ^ <</pre>
          <p class="about-desc">
            <strong>NyanTales</strong> is an interactive visual novel collection featuring
            30 stories of cats navigating the world of computer science — from kernel panics
            to merge conflicts, from DNS quests to Docker escapes.
          </p>
          <div class="about-stats" id="about-stats"></div>
          <div class="about-section">
            <div class="about-section-title">Features</div>
            <ul class="about-features">
              <li>🎮 30 branching interactive stories</li>
              <li>📖 Connected campaign mode (26 chapters across 5 acts)</li>
              <li>🐱 45+ unique cat characters</li>
              <li>🎨 Procedural pixel sprite system</li>
              <li>🔊 Synthesized ambient soundscapes</li>
              <li>💾 Multiple save slots with auto-save</li>
              <li>🏆 16 unlockable achievements</li>
              <li>📱 Mobile touch gestures + PWA</li>
              <li>♿ Full keyboard + screen reader support</li>
            </ul>
          </div>
          <div class="about-section">
            <div class="about-section-title">Tech</div>
            <p class="about-tech">
              Vanilla JS · No frameworks · Web Audio API · Canvas pixel art · Service Worker offline · CSS gradient backgrounds · localStorage persistence
            </p>
          </div>
          <div class="about-footer-text">
            Made with 😻 by <a href="https://github.com/mechangelnyan/nyantales" target="_blank" rel="noopener">NyanTales</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this._statsEl = this.overlay.querySelector('#about-stats');

    // Single delegated click listener for close + backdrop
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.about-close')) this.hide();
    });

    this._built = true;
  }

  /**
   * Show the about panel. Accepts optional stats to display.
   * @param {{ stories: number, characters: number, achievements: string }} [stats]
   */
  show(stats) {
    this._build();

    if (stats && this._statsEl) {
      this._statsEl.innerHTML = `
        <div class="about-stat"><span class="about-stat-val">${stats.stories}</span><span class="about-stat-lbl">Stories</span></div>
        <div class="about-stat"><span class="about-stat-val">${stats.characters}</span><span class="about-stat-lbl">Characters</span></div>
        <div class="about-stat"><span class="about-stat-val">${stats.achievements}</span><span class="about-stat-lbl">Achievements</span></div>
      `;
    }

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) {
      this._focusTrap = new FocusTrap(this.overlay.querySelector('.about-panel'));
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
