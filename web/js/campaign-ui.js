/**
 * NyanTales — Campaign UI Controller
 *
 * Manages campaign-specific UI: chapter grid rendering, campaign button,
 * story unlock state, campaign flow (start/advance/ending), and slug map.
 *
 * Renders campaign chapter grid, button state, and story lock status.
 * main.js handles app-wide orchestration; this handles campaign display logic.
 */
class CampaignUI {
  /**
   * @param {CampaignManager} campaign  — campaign data/progress manager
   * @param {SaveManager}     saveManager
   */
  constructor(campaign, saveManager) {
    this._campaign = campaign;
    this._saveManager = saveManager;

    // DOM refs (cached at init)
    this._gridEl      = document.getElementById('chapter-grid');
    this._dividerEl   = document.querySelector('.section-divider');
    this._btnEl       = document.getElementById('btn-campaign');

    // Pre-built campaign button children
    this._btnText = null;
    this._btnMeta = null;
    if (this._btnEl) {
      this._btnEl.textContent = '';
      this._btnText = document.createTextNode('📖 Campaign');
      this._btnMeta = document.createElement('span');
      this._btnMeta.className = 'campaign-meta';
      this._btnEl.appendChild(this._btnText);
      this._btnEl.appendChild(this._btnMeta);
    }

    // Reusable ending "Next Chapter" button
    this._endingBtn = null;

    // Chapter grid state
    this._gridBuilt = false;
    /** @type {Map<number, {card:HTMLElement, titleEl:HTMLElement, descEl:HTMLElement, statusEl:HTMLElement}>} */
    this._cardRefs = new Map();

    /**
     * Pre-built slug → chapter-index / bonus-entry map for O(1) lock lookups.
     * @type {Map<string, {type:'chapter',index:number}|{type:'bonus',flag:string|null}>}
     */
    this._slugMap = new Map();

    // Chapter grid click/keydown delegation
    if (this._gridEl) {
      this._gridEl.addEventListener('click', (e) => this._onGridClick(e));
      this._gridEl.addEventListener('keydown', (e) => this._onGridKeydown(e));
    }

    /** @type {function(number):void|null} External callback: play a campaign chapter */
    this.onChapterSelect = null;
  }

  // ── Slug Map ──

  /** Rebuild the slug → campaign entry map. Call after loading or advancing campaign. */
  rebuildSlugMap() {
    this._slugMap.clear();
    const c = this._campaign;
    if (!c.isLoaded) return;
    const chapters = c.chapters;
    for (let i = 0; i < chapters.length; i++) {
      this._slugMap.set(chapters[i].story, { type: 'chapter', index: i });
    }
    const bonus = c.manifest?.bonus_chapters || [];
    for (const b of bonus) {
      this._slugMap.set(b.story, { type: 'bonus', flag: b.unlock_flag || null });
    }
  }

  /**
   * Check if a story slug is unlocked for standalone play.
   * Campaign chapter stories are locked until the player reaches them.
   * Non-campaign stories are always unlocked.
   */
  isStoryUnlocked(slug) {
    if (!this._campaign.isLoaded) return true;
    const entry = this._slugMap.get(slug);
    if (!entry) return true;
    if (entry.type === 'chapter') return this._isChapterUnlocked(entry.index);
    if (!entry.flag) return true;
    return this._campaign.progress.persistentFlags?.includes(entry.flag) || false;
  }

  /** Check if a chapter index is unlocked (reachable). */
  _isChapterUnlocked(idx) {
    const c = this._campaign;
    if (!c.isLoaded || !c.progress.started) return idx === 0;
    return idx <= c.progress.chapterIndex ||
      c.progress.completedChapters.includes(idx);
  }

  // ── Campaign Button ──

  /** Update campaign button text on title screen. */
  updateButton() {
    const c = this._campaign;
    if (!this._btnEl || !c.isLoaded) return;
    const label = c.getProgressLabel();
    if (c.isComplete()) {
      this._btnText.textContent = '📖 Campaign ';
      this._btnMeta.textContent = 'Complete! ✨';
    } else if (label) {
      this._btnText.textContent = '📖 Continue Campaign';
      this._btnMeta.textContent = label;
    } else {
      this._btnText.textContent = '📖 Campaign';
      this._btnMeta.textContent = '';
    }
  }

  // ── Ending Button ──

  /**
   * Get or create the reusable "Next Chapter" ending button.
   * Uses `data-action="campaign-next"` for delegation by VNUI ending handler.
   */
  getEndingButton(isComplete) {
    if (!this._endingBtn) {
      this._endingBtn = document.createElement('button');
      this._endingBtn.className = 'campaign-btn campaign-btn-ending';
      this._endingBtn.dataset.action = 'campaign-next';
    }
    this._endingBtn.textContent = isComplete ? '🏠 Return Home' : '▶ Next Chapter';
    return this._endingBtn;
  }

  // ── Chapter Grid ──

  /**
   * Render the campaign chapter grid grouped by act.
   * First call: builds from scratch. Subsequent: partial refresh.
   */
  renderGrid() {
    if (!this._gridEl) return;
    const c = this._campaign;

    if (!c.isLoaded) {
      this._gridEl.classList.add('hidden');
      if (this._dividerEl) this._dividerEl.classList.add('hidden');
      if (this._btnEl) this._btnEl.classList.add('hidden');
      this._gridBuilt = false;
      this._cardRefs.clear();
      return;
    }
    this._gridEl.classList.remove('hidden');
    if (this._dividerEl) this._dividerEl.classList.remove('hidden');
    if (this._btnEl) this._btnEl.classList.remove('hidden');

    if (this._gridBuilt) {
      this._refreshCards();
      return;
    }

    this._buildGrid();
    this._gridBuilt = true;
  }

  /** Full grid build (first render only). */
  _buildGrid() {
    const c = this._campaign;
    this._cardRefs.clear();
    this._gridEl.textContent = '';

    const gridFrag = document.createDocumentFragment();
    const chapters = c.chapters;
    const acts = c.manifest?.acts || [];

    const actMap = {};
    for (const act of acts) actMap[act.id] = [];
    for (let idx = 0; idx < chapters.length; idx++) {
      const ch = chapters[idx];
      if (!actMap[ch.act]) actMap[ch.act] = [];
      actMap[ch.act].push({ ch, idx });
    }

    for (const act of acts) {
      const items = actMap[act.id] || [];
      if (!items.length) continue;

      const section = document.createElement('div');
      section.className = 'act-section';

      const header = document.createElement('div');
      header.className = 'act-header';
      const actTitle = document.createElement('span');
      actTitle.className = 'act-title';
      actTitle.textContent = act.title;
      const actSub = document.createElement('span');
      actSub.className = 'act-subtitle';
      actSub.textContent = act.subtitle || '';
      header.appendChild(actTitle);
      header.appendChild(actSub);
      section.appendChild(header);

      const cards = document.createElement('div');
      cards.className = 'chapter-cards';

      for (const { ch, idx } of items) {
        const card = this._buildCard(ch, idx);
        cards.appendChild(card);
      }

      section.appendChild(cards);
      gridFrag.appendChild(section);
    }
    this._gridEl.appendChild(gridFrag);
  }

  /** Build a single chapter card element. */
  _buildCard(ch, idx) {
    const unlocked = this._isChapterUnlocked(idx);
    const completed = this._campaign.progress.completedChapters.includes(idx);
    const isStarted = this._campaign.progress.started;
    const isCurrent = isStarted && idx === this._campaign.progress.chapterIndex &&
      this._campaign.progress.phase === 'chapter';

    const card = document.createElement('div');
    card.className = 'chapter-card' +
      (unlocked ? ' unlocked' : ' locked') +
      (completed ? ' completed' : '') +
      (isCurrent ? ' current' : '');
    card.dataset.chapterIndex = idx;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', unlocked ? '0' : '-1');
    card.setAttribute('aria-label', unlocked
      ? `Chapter ${ch.chapter}: ${ch.title}`
      : `Chapter ${ch.chapter}: Locked`);

    const numEl = document.createElement('div');
    numEl.className = 'chapter-num';
    numEl.textContent = `CH ${ch.chapter}`;

    const body = document.createElement('div');
    body.className = 'chapter-body';
    const titleEl = document.createElement('div');
    titleEl.className = 'chapter-title';
    titleEl.textContent = unlocked ? ch.title : '???';
    const descEl = document.createElement('div');
    descEl.className = 'chapter-desc';
    descEl.textContent = unlocked ? (ch.description || '') : '';
    body.appendChild(titleEl);
    body.appendChild(descEl);

    const status = document.createElement('div');
    status.className = 'chapter-status';
    this._applyStatusIcon(status, unlocked, isCurrent, completed);

    card.appendChild(numEl);
    card.appendChild(body);
    card.appendChild(status);

    this._cardRefs.set(idx, { card, titleEl, descEl, statusEl: status });
    return card;
  }

  /** Apply status icon text + aria to a status element. */
  _applyStatusIcon(el, unlocked, isCurrent, completed) {
    if (!unlocked) {
      el.textContent = '🔒';
      el.setAttribute('aria-hidden', 'true');
    } else if (isCurrent) {
      el.textContent = '▶';
      el.removeAttribute('aria-hidden');
    } else if (completed) {
      el.textContent = '✅';
      el.removeAttribute('aria-hidden');
    } else {
      el.textContent = '○';
      el.removeAttribute('aria-hidden');
    }
  }

  /** Partial refresh: update state of existing chapter cards. */
  _refreshCards() {
    const c = this._campaign;
    const chapters = c.chapters;
    const isStarted = c.progress.started;
    const currentIdx = c.progress.chapterIndex;

    for (const [idx, { card, titleEl, descEl, statusEl }] of this._cardRefs) {
      if (!chapters[idx]) continue;
      const ch = chapters[idx];
      const unlocked = this._isChapterUnlocked(idx);
      const completed = c.progress.completedChapters.includes(idx);
      const isCurrent = isStarted && idx === currentIdx && c.progress.phase === 'chapter';

      card.classList.toggle('unlocked', unlocked);
      card.classList.toggle('locked', !unlocked);
      card.classList.toggle('completed', completed);
      card.classList.toggle('current', isCurrent);
      card.setAttribute('tabindex', unlocked ? '0' : '-1');
      card.setAttribute('aria-label', unlocked
        ? `Chapter ${ch.chapter}: ${ch.title}`
        : `Chapter ${ch.chapter}: Locked`);

      titleEl.textContent = unlocked ? ch.title : '???';
      descEl.textContent = unlocked ? (ch.description || '') : '';
      this._applyStatusIcon(statusEl, unlocked, isCurrent, completed);
    }
  }

  // ── Grid Delegation ──

  _onGridClick(e) {
    const card = e.target.closest('.chapter-card');
    if (!card || card.classList.contains('locked')) return;
    const idx = parseInt(card.dataset.chapterIndex, 10);
    if (!isNaN(idx) && this.onChapterSelect) this.onChapterSelect(idx);
  }

  _onGridKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.chapter-card');
    if (!card || card.classList.contains('locked')) return;
    e.preventDefault();
    const idx = parseInt(card.dataset.chapterIndex, 10);
    if (!isNaN(idx) && this.onChapterSelect) this.onChapterSelect(idx);
  }
}
