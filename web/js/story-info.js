/**
 * NyanTales — Story Info Modal
 *
 * Displays detailed per-story statistics in a modal overlay:
 *   - Title, description, protagonist portrait
 *   - Endings discovered (by name), total/best runs
 *   - Scene exploration %, visited scene count
 *   - Last played timestamp
 *   - Quick-play and continue buttons
 *
 * @class StoryInfoModal
 * @param {StoryTracker} tracker  — progress/ending tracker
 * @param {SaveManager}  saves    — save slot manager
 * @param {PortraitManager} portraits — portrait/sprite resolver
 */
class StoryInfoModal {
  constructor(tracker, saves, portraits) {
    this.tracker = tracker;
    this.saves = saves;
    this.portraits = portraits;
    this.overlay = null;
    this._built = false;
    this._focusTrap = null;

    // External callbacks (set by main.js)
    this.onPlay = null;   // (story) => void
    this.onLoad = null;   // (slug, stateJson) => void
  }

  /** Lazy-build the overlay DOM */
  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'story-info-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Story Details');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = '<div class="story-info-panel"></div>';
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this._built = true;
  }

  /**
   * Show the info modal for a given story.
   * @param {Object} story — { slug, title, description, _parsed }
   * @param {Object[]} characters — CHARACTER_DATA[slug] array
   */
  show(story, characters) {
    this._build();

    const panel = this.overlay.querySelector('.story-info-panel');
    const data = this.tracker.getStory(story.slug);
    const scenes = story._parsed?.scenes ? Object.keys(story._parsed.scenes) : [];
    const totalScenes = scenes.length;
    const visitedCount = (data.visitedScenes || []).length;
    const pct = totalScenes > 0 ? Math.round((visitedCount / totalScenes) * 100) : 0;

    // Word count / reading time
    const wordCount = story._parsed?.scenes
      ? Object.values(story._parsed.scenes).reduce((s, sc) => s + ((sc.text || '').split(/\s+/).length), 0)
      : 0;
    const readMins = Math.max(1, Math.ceil(wordCount / 200));

    // Protagonist portrait
    const chars = characters || [];
    const protag = chars.find(c => c.role === 'protagonist') || chars[0];
    let portraitHtml = '';
    if (protag) {
      const url = this.portraits.getPortrait(protag.name, protag.appearance);
      const hasAI = this.portraits.hasPortrait(protag.name);
      const cls = hasAI ? 'story-info-portrait ai-portrait' : 'story-info-portrait pixel';
      portraitHtml = `<img src="${url}" class="${cls}" alt="${this._esc(protag.name)}" />`;
    }

    // Ending list
    const endings = data.endingsFound || [];
    const endingsHtml = endings.length > 0
      ? endings.map(e => `<span class="story-info-ending-tag">${this._esc(e)}</span>`).join('')
      : '<span class="story-info-none">None yet</span>';

    // Last played
    const lastPlayedStr = data.lastPlayed
      ? new Date(data.lastPlayed).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : 'Never';

    // Has a save to continue?
    const hasSave = this.saves.hasSave(story.slug);

    panel.innerHTML = `
      <div class="story-info-header">
        ${portraitHtml}
        <div class="story-info-title-block">
          <div class="story-info-title">${this._esc(story.title)}</div>
          <div class="story-info-desc">${this._esc(story.description || '')}</div>
          <div class="story-info-meta-row">
            <span>⏱ ~${readMins} min</span>
            <span>📄 ${totalScenes} scenes</span>
            ${protag ? `<span>🐱 ${this._esc(protag.name)}</span>` : ''}
          </div>
        </div>
        <button class="story-info-close" aria-label="Close">✕</button>
      </div>

      <div class="story-info-stats">
        <div class="story-info-stat-card">
          <div class="story-info-stat-value">${pct}%</div>
          <div class="story-info-stat-label">Explored</div>
          <div class="story-info-progress-bar">
            <div class="story-info-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="story-info-stat-sub">${visitedCount} / ${totalScenes} scenes</div>
        </div>
        <div class="story-info-stat-card">
          <div class="story-info-stat-value">${data.totalPlays || 0}</div>
          <div class="story-info-stat-label">Plays</div>
        </div>
        <div class="story-info-stat-card">
          <div class="story-info-stat-value">${data.bestTurns ?? '—'}</div>
          <div class="story-info-stat-label">Best Turns</div>
        </div>
        <div class="story-info-stat-card">
          <div class="story-info-stat-value">${endings.length}</div>
          <div class="story-info-stat-label">Endings Found</div>
        </div>
      </div>

      <div class="story-info-section">
        <div class="story-info-section-title">🔮 Endings Discovered</div>
        <div class="story-info-endings">${endingsHtml}</div>
      </div>

      <div class="story-info-section">
        <div class="story-info-section-title">🕐 Last Played</div>
        <div class="story-info-last-played">${lastPlayedStr}</div>
      </div>

      <div class="story-info-actions">
        <button class="story-info-play-btn">▶ Play</button>
        ${hasSave ? '<button class="story-info-continue-btn">📂 Continue</button>' : ''}
      </div>
    `;

    // Wire close
    panel.querySelector('.story-info-close').addEventListener('click', () => this.hide());

    // Wire play
    panel.querySelector('.story-info-play-btn').addEventListener('click', () => {
      this.hide();
      if (this.onPlay) this.onPlay(story);
    });

    // Wire continue (load most recent save for this slug)
    const contBtn = panel.querySelector('.story-info-continue-btn');
    if (contBtn) {
      contBtn.addEventListener('click', () => {
        const slots = this.saves.getSlots(story.slug);
        // Find the most recent slot
        let best = null;
        for (const slot of Object.values(slots)) {
          if (slot && (!best || slot.timestamp > best.timestamp)) best = slot;
        }
        if (best && this.onLoad) {
          this.hide();
          this.onLoad(story.slug, best.state);
        }
      });
    }

    // Keyboard: Escape to close
    this._keyHandler = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); this.hide(); }
    };
    document.addEventListener('keydown', this._keyHandler, true);

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));

    if (!this._focusTrap) this._focusTrap = new FocusTrap(panel);
    this._focusTrap.activate();
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
    if (this._focusTrap) this._focusTrap.deactivate();
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }
  }

  get isVisible() {
    return this.overlay?.classList.contains('visible') || false;
  }

  /** @private HTML-escape using shared off-screen element */
  _esc(text) {
    if (!VNUI._escapeDiv) VNUI._escapeDiv = document.createElement('div');
    VNUI._escapeDiv.textContent = text;
    return VNUI._escapeDiv.innerHTML;
  }
}
