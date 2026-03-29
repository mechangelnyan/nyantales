/**
 * NyanTales — Achievement Panel
 * Modal overlay displaying all achievements with unlock status.
 * Pre-builds the panel DOM once; show() updates content via textContent.
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
    this._dom = null;
    this._itemPool = [];
  }

  /** Create the overlay and inner panel DOM (called once). */
  _ensureOverlay() {
    if (this._overlay) return;

    this._overlay = document.createElement('div');
    this._overlay.className = 'achievements-overlay';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-label', 'Achievements');
    this._overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this._overlay);

    // Single delegated click handler — handles close button + backdrop click
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) { this.hide(); return; }
      if (e.target.closest('.achievements-panel-close')) this.hide();
    });

    this._focusTrap = new FocusTrap(this._overlay);

    // Build the static panel structure
    const d = {};
    const panel = document.createElement('div');
    panel.className = 'achievements-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'achievements-panel-header';
    const headerLeft = document.createElement('div');
    d.title = document.createElement('div');
    d.title.className = 'achievements-panel-title';
    d.title.textContent = '🏆 Achievements';
    d.count = document.createElement('div');
    d.count.className = 'achievements-panel-count';
    headerLeft.appendChild(d.title);
    headerLeft.appendChild(d.count);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'achievements-panel-close';
    closeBtn.setAttribute('aria-label', 'Close achievements');
    closeBtn.textContent = '✕';
    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'achievements-progress-bar';
    d.progressFill = document.createElement('div');
    d.progressFill.className = 'achievements-progress-fill';
    progressBar.appendChild(d.progressFill);
    panel.appendChild(progressBar);

    // List container
    d.list = document.createElement('div');
    d.list.className = 'achievements-list';
    panel.appendChild(d.list);

    this._overlay.appendChild(panel);
    this._dom = d;

    // Reusable divider element
    this._divider = document.createElement('div');
    this._divider.className = 'achievements-divider';
  }

  /** Show the achievement panel */
  show() {
    this._ensureOverlay();
    this._update();

    this.isVisible = true;
    OverlayMixin.show(this);
  }

  /** Update all panel content using pre-built DOM elements. Zero innerHTML. */
  _update() {
    const allAch = this.achievements.getAll();
    const achStats = this.achievements.getStats();
    const d = this._dom;

    d.count.textContent = `${achStats.unlocked} / ${achStats.total} unlocked`;
    const pct = achStats.total > 0 ? Math.round((achStats.unlocked / achStats.total) * 100) : 0;
    d.progressFill.style.setProperty('--bar-pct', `${pct}%`);

    // Separate unlocked / locked
    const unlocked = allAch.filter(a => a.unlocked);
    const locked = allAch.filter(a => !a.unlocked);
    const combined = [...unlocked, ...locked];

    // Build list using pooled elements + fragment
    d.list.textContent = '';
    const frag = document.createDocumentFragment();
    let needsDivider = unlocked.length > 0 && locked.length > 0;

    for (let i = 0; i < combined.length; i++) {
      // Insert divider between unlocked and locked sections
      if (needsDivider && i === unlocked.length) {
        frag.appendChild(this._divider);
      }
      frag.appendChild(this._getItem(i, combined[i]));
    }
    d.list.appendChild(frag);
  }

  /**
   * Get or grow a pooled achievement item element.
   * @private
   */
  _getItem(idx, a) {
    let item;
    if (idx < this._itemPool.length) {
      item = this._itemPool[idx];
    } else {
      item = document.createElement('div');
      item._iconEl = document.createElement('div');
      item._iconEl.className = 'achievement-item-icon';
      item._nameEl = document.createElement('div');
      item._nameEl.className = 'achievement-item-name';
      item._descEl = document.createElement('div');
      item._descEl.className = 'achievement-item-desc';
      const info = document.createElement('div');
      info.className = 'achievement-item-info';
      info.appendChild(item._nameEl);
      info.appendChild(item._descEl);
      item.appendChild(item._iconEl);
      item.appendChild(info);
      this._itemPool.push(item);
    }

    item.className = `achievement-item ${a.unlocked ? 'unlocked' : 'locked'}`;
    item._iconEl.textContent = a.unlocked ? a.icon : '🔒';
    item._nameEl.textContent = a.unlocked ? a.name : '???';
    item._descEl.textContent = a.desc;
    return item;
  }

  /** Hide the achievement panel */
  hide() {
    OverlayMixin.hide(this);
    this.isVisible = false;
  }
}
