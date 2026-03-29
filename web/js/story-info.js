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
 * Uses pre-built DOM: the panel tree is constructed once in _build(),
 * and show() swaps content via textContent/src/className updates —
 * zero innerHTML on the warm per-click path.
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
    this.onShare = null;  // (story) => void

    /** @private Cached DOM refs — populated once in _build() */
    this._refs = null;

    /** @private Reusable element pools for endings/cast tags */
    this._endingTagPool = [];
    this._castChipPool = [];
  }

  /** Lazy-build the overlay + panel DOM tree (called once) */
  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'story-info-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Story Details');
    this.overlay.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'story-info-panel';
    this.overlay.appendChild(panel);

    // ─── Header ───
    const header = document.createElement('div');
    header.className = 'story-info-header';

    const portraitImg = document.createElement('img');
    portraitImg.className = 'story-info-portrait';
    portraitImg.alt = '';
    header.appendChild(portraitImg);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'story-info-title-block';

    const titleEl = document.createElement('div');
    titleEl.className = 'story-info-title';
    titleBlock.appendChild(titleEl);

    const descEl = document.createElement('div');
    descEl.className = 'story-info-desc';
    titleBlock.appendChild(descEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'story-info-meta-row';
    const metaTime = document.createElement('span');
    const metaScenes = document.createElement('span');
    const metaProtag = document.createElement('span');
    metaRow.appendChild(metaTime);
    metaRow.appendChild(metaScenes);
    metaRow.appendChild(metaProtag);
    titleBlock.appendChild(metaRow);

    header.appendChild(titleBlock);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'story-info-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // ─── Stats Grid ───
    const stats = document.createElement('div');
    stats.className = 'story-info-stats';

    // 5 stat cards: explored, plays, best turns, endings found, reading time
    const makeStatCard = (label, hasSub, hasBar) => {
      const card = document.createElement('div');
      card.className = 'story-info-stat-card';
      const valEl = document.createElement('div');
      valEl.className = 'story-info-stat-value';
      card.appendChild(valEl);
      const labEl = document.createElement('div');
      labEl.className = 'story-info-stat-label';
      labEl.textContent = label;
      card.appendChild(labEl);
      let barFillEl = null, subEl = null;
      if (hasBar) {
        const barEl = document.createElement('div');
        barEl.className = 'story-info-progress-bar';
        barFillEl = document.createElement('div');
        barFillEl.className = 'story-info-progress-fill';
        barEl.appendChild(barFillEl);
        card.appendChild(barEl);
      }
      if (hasSub) {
        subEl = document.createElement('div');
        subEl.className = 'story-info-stat-sub';
        card.appendChild(subEl);
      }
      stats.appendChild(card);
      return { valEl, barFillEl, subEl };
    };

    const exploredCard = makeStatCard('Explored', true, true);
    const playsCard = makeStatCard('Plays', false, false);
    const bestCard = makeStatCard('Best Turns', false, false);
    const endingsCard = makeStatCard('Endings Found', false, false);
    const readTimeCard = makeStatCard('Reading Time', false, false);
    panel.appendChild(stats);

    // ─── Cast Section ───
    const castSection = document.createElement('div');
    castSection.className = 'story-info-section';
    const castTitle = document.createElement('div');
    castTitle.className = 'story-info-section-title';
    castTitle.textContent = '🐾 Cast';
    castSection.appendChild(castTitle);
    const castContainer = document.createElement('div');
    castContainer.className = 'story-info-cast';
    castSection.appendChild(castContainer);
    panel.appendChild(castSection);

    // ─── Endings Section ───
    const endingsSection = document.createElement('div');
    endingsSection.className = 'story-info-section';
    const endingsTitle = document.createElement('div');
    endingsTitle.className = 'story-info-section-title';
    endingsTitle.textContent = '🔮 Endings Discovered';
    endingsSection.appendChild(endingsTitle);
    const endingsContainer = document.createElement('div');
    endingsContainer.className = 'story-info-endings';
    endingsSection.appendChild(endingsContainer);
    panel.appendChild(endingsSection);

    // ─── Last Played Section ───
    const lastSection = document.createElement('div');
    lastSection.className = 'story-info-section';
    const lastTitle = document.createElement('div');
    lastTitle.className = 'story-info-section-title';
    lastTitle.textContent = '🕐 Last Played';
    lastSection.appendChild(lastTitle);
    const lastPlayedEl = document.createElement('div');
    lastPlayedEl.className = 'story-info-last-played';
    lastSection.appendChild(lastPlayedEl);
    panel.appendChild(lastSection);

    // ─── Actions ───
    const actions = document.createElement('div');
    actions.className = 'story-info-actions';
    const playBtn = document.createElement('button');
    playBtn.className = 'story-info-play-btn';
    playBtn.textContent = '▶ Play';
    const continueBtn = document.createElement('button');
    continueBtn.className = 'story-info-continue-btn';
    continueBtn.textContent = '📂 Continue';
    const shareBtn = document.createElement('button');
    shareBtn.className = 'story-info-share-btn';
    shareBtn.textContent = '🔗 Share';
    actions.appendChild(playBtn);
    actions.appendChild(continueBtn);
    actions.appendChild(shareBtn);
    panel.appendChild(actions);

    // ─── None-yet placeholder (reusable) ───
    const nonePlaceholder = document.createElement('span');
    nonePlaceholder.className = 'story-info-none';
    nonePlaceholder.textContent = 'None yet';

    const unknownCast = document.createElement('span');
    unknownCast.className = 'story-info-none';
    unknownCast.textContent = 'Unknown cast';

    document.body.appendChild(this.overlay);

    // ─── Cache refs ───
    this._refs = {
      panel, portraitImg, titleEl, descEl,
      metaTime, metaScenes, metaProtag,
      exploredVal: exploredCard.valEl, exploredBar: exploredCard.barFillEl, exploredSub: exploredCard.subEl,
      playsVal: playsCard.valEl, bestVal: bestCard.valEl,
      endingsVal: endingsCard.valEl, readTimeVal: readTimeCard.valEl,
      castContainer, endingsContainer, lastPlayedEl,
      continueBtn, nonePlaceholder, unknownCast
    };

    // ─── Event delegation ───
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) { this.hide(); return; }
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('story-info-close')) { this.hide(); return; }
      if (btn.classList.contains('story-info-play-btn')) {
        this.hide();
        if (this.onPlay && this._currentStory) this.onPlay(this._currentStory);
        return;
      }
      if (btn.classList.contains('story-info-continue-btn')) {
        if (!this._currentStory) return;
        const slots = this.saves.getSlots(this._currentStory.slug);
        let best = null;
        for (const slot of Object.values(slots)) {
          if (slot && (!best || slot.timestamp > best.timestamp)) best = slot;
        }
        if (best && this.onLoad) {
          this.hide();
          this.onLoad(this._currentStory.slug, best.state);
        }
        return;
      }
      if (btn.classList.contains('story-info-share-btn')) {
        if (this.onShare && this._currentStory) this.onShare(this._currentStory);
      }
    });

    this._built = true;
  }

  /**
   * Get or grow a pooled ending tag element.
   * @private
   */
  _getEndingTag(idx) {
    if (idx < this._endingTagPool.length) return this._endingTagPool[idx];
    const el = document.createElement('span');
    el.className = 'story-info-ending-tag';
    this._endingTagPool.push(el);
    return el;
  }

  /**
   * Get or grow a pooled cast chip element (with pre-built children).
   * @private
   */
  _getCastChip(idx) {
    if (idx < this._castChipPool.length) return this._castChipPool[idx];
    const chip = document.createElement('span');
    chip.className = 'story-info-cast-chip';
    const nameEl = document.createElement('span');
    nameEl.className = 'story-info-cast-name';
    const roleEl = document.createElement('span');
    roleEl.className = 'story-info-cast-role';
    chip.appendChild(nameEl);
    chip.appendChild(roleEl);
    chip._nameEl = nameEl;
    chip._roleEl = roleEl;
    this._castChipPool.push(chip);
    return chip;
  }

  /**
   * Show the info modal for a given story.
   * Updates pre-built DOM refs with new data — zero innerHTML.
   * @param {Object} story — { slug, title, description, _parsed }
   * @param {Object[]} characters — CHARACTER_DATA[slug] array
   */
  show(story, characters) {
    this._build();
    this._currentStory = story;
    const r = this._refs;

    const data = this.tracker.getStory(story.slug);
    const scenes = story._parsed?.scenes ? Object.keys(story._parsed.scenes) : [];
    const totalScenes = scenes.length;
    const visitedCount = (data.visitedScenes || []).length;
    const pct = totalScenes > 0 ? Math.round((visitedCount / totalScenes) * 100) : 0;
    const totalEndings = story._parsed?.scenes
      ? Object.values(story._parsed.scenes).filter(sc => sc.ending).length
      : 0;

    // Word count / reading time
    const wordCount = story._parsed?.scenes
      ? Object.values(story._parsed.scenes).reduce((s, sc) => s + ((sc.text || '').split(/\s+/).length), 0)
      : 0;
    const readMins = Math.max(1, Math.ceil(wordCount / 200));

    // Protagonist portrait
    const chars = characters || [];
    const protag = chars.find(c => c.role === 'protagonist') || chars[0];
    if (protag) {
      const url = this.portraits.getPortrait(protag.name, protag.appearance);
      const hasAI = this.portraits.hasPortrait(protag.name);
      r.portraitImg.src = url;
      r.portraitImg.alt = protag.name;
      r.portraitImg.className = hasAI ? 'story-info-portrait ai-portrait' : 'story-info-portrait pixel';
      r.portraitImg.classList.remove('hidden');
    } else {
      r.portraitImg.classList.add('hidden');
    }

    // Header text
    r.titleEl.textContent = story.title;
    r.descEl.textContent = story.description || '';
    r.metaTime.textContent = `⏱ ~${readMins} min`;
    r.metaScenes.textContent = `📄 ${totalScenes} scenes`;
    if (protag) {
      r.metaProtag.textContent = `🐱 ${protag.name}`;
      r.metaProtag.classList.remove('hidden');
    } else {
      r.metaProtag.classList.add('hidden');
    }

    // Stats
    r.exploredVal.textContent = `${pct}%`;
    r.exploredBar.style.setProperty('--bar-pct', `${pct}%`);
    r.exploredSub.textContent = `${visitedCount} / ${totalScenes} scenes`;
    r.playsVal.textContent = data.totalPlays || 0;
    r.bestVal.textContent = data.bestTurns ?? '—';

    // Endings found value (with /total suffix)
    const endings = data.endingsFound || [];
    r.endingsVal.textContent = '';
    r.endingsVal.appendChild(document.createTextNode(String(endings.length)));
    if (totalEndings) {
      const totalSpan = document.createElement('span');
      totalSpan.className = 'story-info-stat-total';
      totalSpan.textContent = `/${totalEndings}`;
      r.endingsVal.appendChild(totalSpan);
    }

    const totalReadingMs = data.totalReadingMs || 0;
    r.readTimeVal.textContent = StoryTracker.formatDuration(totalReadingMs);

    // Cast chips
    r.castContainer.textContent = '';
    if (chars.length > 0) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < chars.length; i++) {
        const chip = this._getCastChip(i);
        chip.title = chars[i].appearance || '';
        chip._nameEl.textContent = chars[i].name;
        chip._roleEl.textContent = chars[i].role || 'cat';
        frag.appendChild(chip);
      }
      r.castContainer.appendChild(frag);
    } else {
      r.castContainer.appendChild(r.unknownCast);
    }

    // Ending tags
    r.endingsContainer.textContent = '';
    if (endings.length > 0) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < endings.length; i++) {
        const tag = this._getEndingTag(i);
        tag.textContent = endings[i];
        frag.appendChild(tag);
      }
      r.endingsContainer.appendChild(frag);
    } else {
      r.endingsContainer.appendChild(r.nonePlaceholder);
    }

    // Last played
    r.lastPlayedEl.textContent = data.lastPlayed
      ? new Date(data.lastPlayed).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : 'Never';

    // Continue button visibility
    const hasSave = this.saves.hasSave(story.slug);
    r.continueBtn.classList.toggle('hidden', !hasSave);

    this._focusTrapTarget = r.panel;
    OverlayMixin.show(this);
  }

  hide() {
    OverlayMixin.hide(this);
    this._currentStory = null;
  }

  get isVisible() {
    return OverlayMixin.isVisible(this);
  }
}
