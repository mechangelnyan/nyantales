/**
 * NyanTales — Achievement Panel
 * Modal overlay displaying all achievements with unlock status.
 * Extracted from main.js for modularity and proper focus trap support.
 *
 * @class AchievementPanel
 * @param {AchievementSystem} achievements - The achievement system instance
 */

class AchievementPanel {
  constructor(achievements) {
    this.achievements = achievements;
    this.isVisible = false;
    this._overlay = null;
    this._focusTrap = null;
  }

  /** Create or update the overlay DOM */
  _ensureOverlay() {
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.className = 'achievements-overlay';
      this._overlay.setAttribute('role', 'dialog');
      this._overlay.setAttribute('aria-label', 'Achievements');
      document.body.appendChild(this._overlay);

      // Single delegated click handler — handles close button + backdrop click
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) { this.hide(); return; }
        if (e.target.closest('.achievements-panel-close')) this.hide();
      });

      this._focusTrap = new FocusTrap(this._overlay);
    }
  }

  /** Show the achievement panel */
  show() {
    this._ensureOverlay();

    const allAch = this.achievements.getAll();
    const achStats = this.achievements.getStats();

    // Group achievements by status for visual separation
    const unlocked = allAch.filter(a => a.unlocked);
    const locked = allAch.filter(a => !a.unlocked);

    this._overlay.innerHTML = `
      <div class="achievements-panel">
        <div class="achievements-panel-header">
          <div>
            <div class="achievements-panel-title">🏆 Achievements</div>
            <div class="achievements-panel-count">${achStats.unlocked} / ${achStats.total} unlocked</div>
          </div>
          <button class="achievements-panel-close" aria-label="Close achievements">✕</button>
        </div>
        <div class="achievements-progress-bar">
          <div class="achievements-progress-fill" style="width:${Math.round((achStats.unlocked / achStats.total) * 100)}%"></div>
        </div>
        <div class="achievements-list">
          ${unlocked.map(a => this._renderItem(a)).join('')}
          ${locked.length > 0 && unlocked.length > 0 ? '<div class="achievements-divider"></div>' : ''}
          ${locked.map(a => this._renderItem(a)).join('')}
        </div>
      </div>
    `;

    // Close button click handled by delegated listener on _overlay (no per-show addEventListener)

    this.isVisible = true;
    this._overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      this._overlay.classList.add('visible');
      this._focusTrap.activate();
    });
  }

  /** Render a single achievement item */
  _renderItem(a) {
    return `
      <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-item-icon">${a.unlocked ? a.icon : '🔒'}</div>
        <div class="achievement-item-info">
          <div class="achievement-item-name">${a.unlocked ? a.name : '???'}</div>
          <div class="achievement-item-desc">${a.desc}</div>
        </div>
      </div>
    `;
  }

  /** Hide the achievement panel */
  hide() {
    if (!this._overlay) return;
    this._overlay.classList.remove('visible');
    this._overlay.setAttribute('aria-hidden', 'true');
    this.isVisible = false;
    if (this._focusTrap) this._focusTrap.deactivate();
  }
}
