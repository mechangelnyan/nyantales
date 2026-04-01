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
    this._overlay = null;
    this._focusTrap = null;
    this._dom = null;
    this._itemPool = [];
    this._itemRefs = []; // parallel: { iconEl, nameEl, descEl } per pooled item
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

    // Build list in two passes (unlocked then locked) — avoids filter + spread allocation
    d.list.textContent = '';
    const frag = document.createDocumentFragment();
    let idx = 0;
    let unlockedCount = 0;

    for (const ach of allAch) {
      if (!ach.unlocked) continue;
      unlockedCount++;
      frag.appendChild(this._getItem(idx++, ach));
    }
    if (unlockedCount > 0 && unlockedCount < allAch.length) {
      frag.appendChild(this._divider);
    }
    for (const ach of allAch) {
      if (ach.unlocked) continue;
      frag.appendChild(this._getItem(idx++, ach));
    }
    d.list.appendChild(frag);
  }

  /**
   * Get or grow a pooled achievement item element.
   * @private
   */
  _getItem(idx, a) {
    let item, refs;
    if (idx < this._itemPool.length) {
      item = this._itemPool[idx];
      refs = this._itemRefs[idx];
    } else {
      item = document.createElement('div');
      const iconEl = document.createElement('div');
      iconEl.className = 'achievement-item-icon';
      const nameEl = document.createElement('div');
      nameEl.className = 'achievement-item-name';
      const descEl = document.createElement('div');
      descEl.className = 'achievement-item-desc';
      const info = document.createElement('div');
      info.className = 'achievement-item-info';
      info.appendChild(nameEl);
      info.appendChild(descEl);
      item.appendChild(iconEl);
      item.appendChild(info);
      refs = { iconEl, nameEl, descEl };
      this._itemPool.push(item);
      this._itemRefs.push(refs);
    }

    item.className = `achievement-item ${a.unlocked ? 'unlocked' : 'locked'}`;
    refs.iconEl.textContent = a.unlocked ? a.icon : '🔒';
    refs.nameEl.textContent = a.unlocked ? a.name : '???';
    refs.descEl.textContent = a.desc;
    return item;
  }

  /** Hide the achievement panel */
  hide() {
    OverlayMixin.hide(this);
  }

  get isVisible() {
    return OverlayMixin.isVisible(this);
  }
}
