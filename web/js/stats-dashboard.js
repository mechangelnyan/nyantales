/**
 * NyanTales — Statistics Dashboard
 * Comprehensive player statistics panel with per-story breakdown,
 * play streaks, and global analytics. Pre-builds the entire DOM tree
 * once, then updates content via textContent on each show() — zero
 * innerHTML on the warm per-open path.
 *
 * @class StatsDashboard
 * @param {StoryTracker} tracker - Story progress tracker
 * @param {AchievementSystem} achievements - Achievement system
 * @param {SaveManager} saveManager - Save slot manager
 * @param {PortraitManager} portraits - Portrait image manager
 */

class StatsDashboard {
  constructor(tracker, achievements, saveManager, portraits, campaign) {
    this.tracker = tracker;
    this.achievements = achievements;
    this.saveManager = saveManager;
    this.portraits = portraits;
    this.campaign = campaign || null;
    this.isVisible = false;
    this._overlay = null;
    this._focusTrap = null;
    this._storyIndex = [];
    this._prefsKey = 'nyantales-stats-dashboard';
    this._storySearch = '';
    this._storySort = 'progress-desc';
    this._loadPrefs();

    /** @type {Function|null} Callback when user clicks "Play" on a story row */
    this.onPlay = null;

    // Pre-built DOM refs (populated by _buildPanel)
    this._dom = null;
    this._recentPool = [];
    this._recentRefs = []; // parallel: { titleEl, metaSpans } per pooled item
    this._panelBuilt = false;
  }

  /**
   * Set the loaded story index (needed for scene counts, titles, etc.)
   * @param {Array} stories
   */
  setStories(stories) {
    this._storyIndex = stories;
    // Build slug→story Map for O(1) lookups in _playStoryBySlug
    this._storySlugMap = new Map();
    for (const s of stories) this._storySlugMap.set(s.slug, s);
    // Pre-compute scene counts + total endings (uses _meta from manifest or _parsed fallback)
    this._sceneCountCache = new Map();
    this._totalEndingsCache = new Map();
    for (const s of stories) {
      if (s._meta) {
        this._sceneCountCache.set(s.slug, s._meta.sceneCount);
        this._totalEndingsCache.set(s.slug, s._meta.totalEndings);
      } else {
        let count = 0, endings = 0;
        const scenes = s._parsed?.scenes;
        if (scenes) {
          for (const id in scenes) {
            count++;
            if (scenes[id].is_ending || scenes[id].ending) endings++;
          }
        }
        this._sceneCountCache.set(s.slug, count);
        this._totalEndingsCache.set(s.slug, endings);
      }
    }
  }

  /** Show the stats dashboard */
  show() {
    if (this.isVisible) return;
    this.isVisible = true;

    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.className = 'stats-overlay';
      this._overlay.setAttribute('role', 'dialog');
      this._overlay.setAttribute('aria-label', 'Statistics Dashboard');
      this._overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this._overlay);
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.hide();
      });
      this._buildPanel();
      this._initDelegation();
    }

    this._update();
    OverlayMixin.show(this);
  }

  /** Hide the stats dashboard */
  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    OverlayMixin.hide(this);
  }

  // ─── DOM Construction (called once) ────────────────────────────

  /** Build the entire panel DOM tree. Content updated via _update(). */
  _buildPanel() {
    if (this._panelBuilt) return;
    this._panelBuilt = true;

    const d = {};  // cached DOM refs

    const panel = document.createElement('div');
    panel.className = 'stats-panel';

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'stats-header';
    const headerLeft = document.createElement('div');
    d.title = document.createElement('div');
    d.title.className = 'stats-title';
    d.title.textContent = '📊 Statistics';
    d.subtitle = document.createElement('div');
    d.subtitle.className = 'stats-subtitle';
    headerLeft.appendChild(d.title);
    headerLeft.appendChild(d.subtitle);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'stats-close';
    closeBtn.setAttribute('aria-label', 'Close statistics');
    closeBtn.textContent = '✕';
    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // ── Summary cards ──
    d.summary = document.createElement('div');
    d.summary.className = 'stats-summary';

    // Helper to build a summary card
    const makeCard = (label, barClass) => {
      const card = document.createElement('div');
      card.className = 'stats-card';
      const valDiv = document.createElement('div');
      valDiv.className = 'stats-card-value';
      const valText = document.createTextNode('');
      const totalSpan = document.createElement('span');
      totalSpan.className = 'stats-card-total';
      valDiv.appendChild(valText);
      valDiv.appendChild(totalSpan);
      const lblDiv = document.createElement('div');
      lblDiv.className = 'stats-card-label';
      lblDiv.textContent = label;
      card.appendChild(valDiv);
      card.appendChild(lblDiv);
      let barFill = null;
      if (barClass !== undefined) {
        const bar = document.createElement('div');
        bar.className = 'stats-card-bar';
        barFill = document.createElement('div');
        barFill.className = 'stats-card-bar-fill' + (barClass ? ' ' + barClass : '');
        bar.appendChild(barFill);
        card.appendChild(bar);
      }
      return { card, valText, totalSpan, barFill };
    };

    const cStories = makeCard('Stories Complete', '');
    const cEndings = makeCard('Endings Found', 'stats-bar-magenta');
    const cScenes = makeCard('Scenes Explored', 'stats-bar-green');
    const cPlays = makeCard('Total Plays');          // no bar
    const cReading = makeCard('Reading Time');        // no bar
    const cAch = makeCard('Achievements', 'stats-bar-yellow');
    const cSaves = makeCard('Active Saves');          // no bar

    d.storiesVal = cStories.valText;  d.storiesTotal = cStories.totalSpan;  d.storiesBar = cStories.barFill;
    d.endingsVal = cEndings.valText;  d.endingsTotal = cEndings.totalSpan;  d.endingsBar = cEndings.barFill;
    d.scenesVal = cScenes.valText;    d.scenesBar = cScenes.barFill;
    // scenes total span not used (value is "X%")
    cScenes.totalSpan.remove();
    d.playsVal = cPlays.valText;      cPlays.totalSpan.remove();
    d.readingVal = cReading.valText;  cReading.totalSpan.remove();
    d.achVal = cAch.valText;          d.achTotal = cAch.totalSpan;          d.achBar = cAch.barFill;
    d.savesVal = cSaves.valText;      cSaves.totalSpan.remove();

    for (const c of [cStories, cEndings, cScenes, cPlays, cReading, cAch, cSaves]) d.summary.appendChild(c.card);
    panel.appendChild(d.summary);

    // ── Campaign section (hidden by default) ──
    d.campaignSection = document.createElement('div');
    d.campaignSection.className = 'stats-section hidden';
    const campTitle = document.createElement('div');
    campTitle.className = 'stats-section-title';
    campTitle.textContent = '📖 Campaign Progress';
    d.campaignSection.appendChild(campTitle);

    const campCard = document.createElement('div');
    campCard.className = 'stats-card stats-card-wide';
    d.campVal = document.createElement('div');
    d.campVal.className = 'stats-card-value stats-card-gold';
    d.campLabel = document.createElement('div');
    d.campLabel.className = 'stats-card-label';
    const campBar = document.createElement('div');
    campBar.className = 'stats-card-bar';
    d.campBarFill = document.createElement('div');
    d.campBarFill.className = 'stats-card-bar-fill stats-bar-gold';
    campBar.appendChild(d.campBarFill);
    campCard.appendChild(d.campVal);
    campCard.appendChild(d.campLabel);
    campCard.appendChild(campBar);
    d.campaignSection.appendChild(campCard);
    panel.appendChild(d.campaignSection);

    // ── Recently played section (hidden by default) ──
    d.recentSection = document.createElement('div');
    d.recentSection.className = 'stats-section hidden';
    const recentTitle = document.createElement('div');
    recentTitle.className = 'stats-section-title';
    recentTitle.textContent = '🕐 Recently Played';
    d.recentSection.appendChild(recentTitle);
    d.recentList = document.createElement('div');
    d.recentList.className = 'stats-recent-list';
    d.recentSection.appendChild(d.recentList);
    panel.appendChild(d.recentSection);

    // ── Story breakdown section ──
    const breakdownSection = document.createElement('div');
    breakdownSection.className = 'stats-section';
    const breakdownTitle = document.createElement('div');
    breakdownTitle.className = 'stats-section-title';
    breakdownTitle.textContent = '📖 Story Breakdown';
    breakdownSection.appendChild(breakdownTitle);

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'stats-controls';

    const searchWrap = document.createElement('label');
    searchWrap.className = 'stats-search-wrap';
    const searchSr = document.createElement('span');
    searchSr.className = 'sr-only';
    searchSr.textContent = 'Search stories in statistics';
    d.searchInput = document.createElement('input');
    d.searchInput.type = 'search';
    d.searchInput.className = 'stats-search';
    d.searchInput.placeholder = 'Search by title or slug…';
    d.searchInput.setAttribute('aria-label', 'Search stories in statistics');
    searchWrap.appendChild(searchSr);
    searchWrap.appendChild(d.searchInput);

    const sortWrap = document.createElement('label');
    sortWrap.className = 'stats-sort-wrap';
    const sortSr = document.createElement('span');
    sortSr.className = 'sr-only';
    sortSr.textContent = 'Sort stories in statistics';
    d.sortSelect = document.createElement('select');
    d.sortSelect.className = 'stats-sort';
    d.sortSelect.setAttribute('aria-label', 'Sort stories in statistics');
    const sortOptions = [
      ['progress-desc', 'Most Progress'],
      ['recent-desc', 'Recently Played'],
      ['plays-desc', 'Most Plays'],
      ['endings-desc', 'Most Endings'],
      ['reading-desc', 'Longest Read Time'],
      ['title-asc', 'Title A → Z']
    ];
    for (const [val, lbl] of sortOptions) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = lbl;
      d.sortSelect.appendChild(opt);
    }
    sortWrap.appendChild(sortSr);
    sortWrap.appendChild(d.sortSelect);

    d.storyCount = document.createElement('div');
    d.storyCount.className = 'stats-story-count';
    d.storyCount.setAttribute('aria-live', 'polite');

    controls.appendChild(searchWrap);
    controls.appendChild(sortWrap);
    controls.appendChild(d.storyCount);
    breakdownSection.appendChild(controls);

    d.storyTable = document.createElement('div');
    d.storyTable.className = 'stats-story-table';
    breakdownSection.appendChild(d.storyTable);
    panel.appendChild(breakdownSection);

    this._overlay.appendChild(panel);
    this._dom = d;
  }

  // ─── Content Update (called on every show) ─────────────────────

  /** Update all pre-built DOM elements with fresh stats. Zero innerHTML. */
  _update() {
    const stats = this._computeStats();
    const g = stats.global;
    const a = stats.achievements;
    const d = this._dom;
    const storyLen = this._storyIndex.length;

    // Subtitle
    d.subtitle.textContent = `${storyLen} stories · ${stats.totalScenes} scenes`;

    // Summary cards
    const completionPct = storyLen > 0 ? Math.round((g.storiesCompleted / storyLen) * 100) : 0;
    const endingPct = stats.totalEndingsPossible > 0 ? Math.round((g.totalEndings / stats.totalEndingsPossible) * 100) : 0;
    const scenePct = stats.totalScenes > 0 ? Math.round((stats.totalScenesVisited / stats.totalScenes) * 100) : 0;
    const achPct = a.total > 0 ? Math.round(a.unlocked / a.total * 100) : 0;

    d.storiesVal.textContent = g.storiesCompleted;
    d.storiesTotal.textContent = `/${storyLen}`;
    d.storiesBar.style.setProperty('--bar-pct', `${completionPct}%`);

    d.endingsVal.textContent = g.totalEndings;
    d.endingsTotal.textContent = `/${stats.totalEndingsPossible}`;
    d.endingsBar.style.setProperty('--bar-pct', `${endingPct}%`);

    d.scenesVal.textContent = `${scenePct}%`;
    d.scenesBar.style.setProperty('--bar-pct', `${scenePct}%`);

    d.playsVal.textContent = g.totalPlays;
    d.readingVal.textContent = StoryTracker.formatDuration(stats.totalReadingMs);

    d.achVal.textContent = a.unlocked;
    d.achTotal.textContent = `/${a.total}`;
    d.achBar.style.setProperty('--bar-pct', `${achPct}%`);

    d.savesVal.textContent = stats.saveCount;

    // Campaign section
    const cs = stats.campaignStats;
    if (cs && cs.started) {
      d.campaignSection.classList.remove('hidden');
      d.campVal.textContent = cs.complete ? '✨ Complete!' : `${cs.chaptersCompleted}/${cs.chaptersTotal} chapters`;
      d.campLabel.textContent = cs.label || 'The Campaign';
      d.campBarFill.style.setProperty('--bar-pct', `${cs.pct}%`);
    } else {
      d.campaignSection.classList.add('hidden');
    }

    // Recently played
    if (stats.recentlyPlayed.length > 0) {
      d.recentSection.classList.remove('hidden');
      this._updateRecentList(stats.recentlyPlayed.slice(0, 5));
    } else {
      d.recentSection.classList.add('hidden');
    }

    // Search/sort inputs — restore persisted values
    d.searchInput.value = this._storySearch;
    d.sortSelect.value = this._storySort;

    // Story table
    this._lastStoryRows = stats.storyRows;
    this._renderStoryTable();
  }

  /** Update the recently-played list using a pool of reusable elements. */
  _updateRecentList(items) {
    const list = this._dom.recentList;

    for (let i = 0; i < items.length; i++) {
      let item;
      if (i < this._recentPool.length) {
        item = this._recentPool[i];
      } else {
        item = document.createElement('div');
        item.className = 'stats-recent-item';
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        const titleEl = document.createElement('div');
        titleEl.className = 'stats-recent-title';
        const metaEl = document.createElement('div');
        metaEl.className = 'stats-recent-meta';
        const metaSpans = [];
        for (let j = 0; j < 4; j++) {
          const sp = document.createElement('span');
          metaEl.appendChild(sp);
          metaSpans.push(sp);
        }
        item.appendChild(titleEl);
        item.appendChild(metaEl);
        this._recentPool.push(item);
        this._recentRefs.push({ titleEl, metaSpans });
      }

      const s = items[i];
      const refs = this._recentRefs[i];
      item.dataset.slug = s.slug;
      item.setAttribute('aria-label', `Play ${s.title}`);
      refs.titleEl.textContent = s.title;
      refs.metaSpans[0].textContent = `${s.progress}% explored`;
      refs.metaSpans[1].textContent = `${s.endings}/${s.totalEndings} endings`;
      refs.metaSpans[2].textContent = `${s.plays} play${s.plays !== 1 ? 's' : ''}`;
      refs.metaSpans[3].textContent = this._timeAgo(s.lastPlayed);

      if (item.parentNode !== list) list.appendChild(item);
    }

    // Hide excess pooled items
    for (let i = items.length; i < this._recentPool.length; i++) {
      if (this._recentPool[i].parentNode === list) {
        list.removeChild(this._recentPool[i]);
      }
    }
  }

  // ─── Stats Computation ─────────────────────────────────────────

  /** Compute global stats */
  _computeStats() {
    const globalStats = this.tracker.getStats();
    const achStats = this.achievements.getStats();
    const stories = this._storyIndex;

    // Per-story data + single-pass aggregation (zero intermediate arrays)
    const storyRows = [];
    let totalScenes = 0, totalScenesVisited = 0, totalEndingsPossible = 0, saveCount = 0;
    const mostPlayed = [], recentlyPlayed = [];

    for (const story of stories) {
      const data = this.tracker.getStory(story.slug);
      const sceneCount = this._sceneCountCache.get(story.slug) || 0;
      const visitedCount = this.tracker.visitedSceneCount(story.slug);
      const progress = sceneCount > 0 ? this.tracker.getProgress(story.slug, sceneCount) : 0;
      const endings = this.tracker.endingCount(story.slug);
      const completed = this.tracker.isCompleted(story.slug);
      const plays = data.totalPlays || 0;
      const bestTurns = data.bestTurns || null;
      const lastPlayed = data.lastPlayed || 0;
      const readingMs = data.totalReadingMs || 0;
      const hasSave = this.saveManager.hasSave(story.slug);
      const totalEndings = this._totalEndingsCache.get(story.slug) || 0;

      const row = {
        slug: story.slug, title: story.title, sceneCount, visitedCount,
        progress, endings, totalEndings, completed, plays, bestTurns,
        lastPlayed, readingMs, hasSave,
        _searchKey: `${story.title} ${story.slug}`.toLowerCase()
      };
      storyRows.push(row);

      // Accumulate globals in the same pass
      totalScenes += sceneCount;
      totalScenesVisited += visitedCount;
      totalEndingsPossible += totalEndings;
      if (hasSave) saveCount++;
      if (plays > 0) mostPlayed.push(row);
      if (lastPlayed > 0) recentlyPlayed.push(row);
    }
    mostPlayed.sort((a, b) => b.plays - a.plays);
    recentlyPlayed.sort((a, b) => b.lastPlayed - a.lastPlayed);

    // Campaign progress
    let campaignStats = null;
    if (this.campaign && this.campaign.isLoaded) {
      const p = this.campaign.progress;
      const total = this.campaign.chapters.length;
      const done = p.completedChapters ? p.completedChapters.length : 0;
      campaignStats = {
        started: p.started,
        complete: this.campaign.isComplete(),
        chaptersCompleted: done,
        chaptersTotal: total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        label: this.campaign.getProgressLabel()
      };
    }

    return {
      global: globalStats,
      achievements: achStats,
      storyRows,
      mostPlayed,
      recentlyPlayed,
      totalScenes,
      totalScenesVisited,
      totalEndingsPossible,
      saveCount,
      totalReadingMs: this.tracker.getTotalReadingMs(),
      campaignStats
    };
  }

  // ─── Story Table ───────────────────────────────────────────────

  /** Filter + sort the per-story table rows for the breakdown section. */
  _getVisibleStoryRows(storyRows) {
    const query = this._storySearch.trim().toLowerCase();
    // .sort() mutates in-place; storyRows is a fresh array from _computeStats, safe to sort
    let arr;
    if (query) {
      // Use pre-computed _searchKey instead of allocating template string per row per keystroke
      arr = [];
      for (const s of storyRows) if (s._searchKey.includes(query)) arr.push(s);
    } else {
      arr = storyRows;
    }
    return arr.sort(StatsDashboard._COMPARATORS[this._storySort] || StatsDashboard._COMPARATORS['progress-desc']);
  }

  /**
   * Re-render only the story breakdown table.
   * Uses pooled row elements — zero innerHTML.
   */
  _renderStoryTable() {
    if (!this._lastStoryRows || !this._dom) return;
    const tableEl = this._dom.storyTable;
    const countEl = this._dom.storyCount;

    const visibleRows = this._getVisibleStoryRows(this._lastStoryRows);

    tableEl.textContent = '';
    const frag = document.createDocumentFragment();

    // Header row (reuse or create once)
    if (!this._tableHeader) {
      const hdr = document.createElement('div');
      hdr.className = 'stats-table-header';
      const labels = ['Story', 'Progress', 'Endings', 'Plays', 'Best'];
      for (const lbl of labels) {
        const sp = document.createElement('span');
        sp.className = lbl === 'Story' ? 'stats-th stats-th-title' : 'stats-th';
        sp.textContent = lbl;
        hdr.appendChild(sp);
      }
      this._tableHeader = hdr;
    }
    frag.appendChild(this._tableHeader);

    if (visibleRows.length > 0) {
      for (let i = 0; i < visibleRows.length; i++) {
        frag.appendChild(this._getStoryRow(i, visibleRows[i]));
      }
    } else {
      if (!this._tableEmpty) {
        this._tableEmpty = document.createElement('div');
        this._tableEmpty.className = 'stats-empty-state';
        this._tableEmpty.textContent = 'No stories match that search yet.';
      }
      frag.appendChild(this._tableEmpty);
    }
    tableEl.appendChild(frag);

    countEl.textContent = `${visibleRows.length}/${this._lastStoryRows.length} shown`;
  }

  /**
   * Get or grow a pooled story row element with pre-built child structure.
   * @private
   * @param {number} idx — pool index
   * @param {Object} s — story row data
   * @returns {HTMLElement}
   */
  _getStoryRow(idx, s) {
    if (!this._rowPool) this._rowPool = [];
    if (!this._rowRefs) this._rowRefs = [];
    let row, refs;
    if (idx < this._rowPool.length) {
      row = this._rowPool[idx];
      refs = this._rowRefs[idx];
    } else {
      row = document.createElement('div');
      row.className = 'stats-table-row';
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');

      // Title cell
      const tdTitle = document.createElement('span');
      tdTitle.className = 'stats-td stats-td-title';
      row.appendChild(tdTitle);

      // Progress cell
      const tdProgress = document.createElement('span');
      tdProgress.className = 'stats-td stats-td-progress';
      tdProgress.setAttribute('data-label', 'Progress');
      const miniBar = document.createElement('span');
      miniBar.className = 'stats-mini-bar';
      const miniBarFill = document.createElement('span');
      miniBarFill.className = 'stats-mini-bar-fill';
      miniBar.appendChild(miniBarFill);
      tdProgress.appendChild(miniBar);
      const pctSpan = document.createElement('span');
      pctSpan.className = 'stats-td-pct';
      tdProgress.appendChild(pctSpan);
      row.appendChild(tdProgress);

      // Endings cell
      const tdEndings = document.createElement('span');
      tdEndings.className = 'stats-td';
      tdEndings.setAttribute('data-label', 'Endings');
      row.appendChild(tdEndings);

      // Plays cell
      const tdPlays = document.createElement('span');
      tdPlays.className = 'stats-td';
      tdPlays.setAttribute('data-label', 'Plays');
      row.appendChild(tdPlays);

      // Best cell
      const tdBest = document.createElement('span');
      tdBest.className = 'stats-td';
      tdBest.setAttribute('data-label', 'Best');
      row.appendChild(tdBest);

      refs = { tdTitle, miniBarFill, pctSpan, tdEndings, tdPlays, tdBest };
      this._rowPool.push(row);
      this._rowRefs.push(refs);
    }

    // Update content
    row.className = 'stats-table-row' + (s.completed ? ' completed' : '') + (s.plays > 0 ? ' played' : '');
    row.dataset.slug = s.slug;
    row.setAttribute('aria-label', `Play ${s.title}`);

    const icon = s.completed ? '✅' : (s.plays > 0 ? '📖' : '🆕');
    refs.tdTitle.textContent = `${icon} ${s.title}`;
    refs.tdTitle.title = s.title;
    refs.miniBarFill.style.setProperty('--bar-pct', `${s.progress}%`);
    refs.pctSpan.textContent = `${s.progress}%`;
    refs.tdEndings.textContent = `${s.endings}/${s.totalEndings}`;
    refs.tdPlays.textContent = s.plays || '—';
    refs.tdBest.textContent = s.bestTurns || '—';

    return row;
  }

  // ─── Interaction ───────────────────────────────────────────────

  /** Play a story by slug via the external callback. */
  _playStoryBySlug(slug) {
    if (!this.onPlay) return;
    // Use cached slug map for O(1) lookup (built on setStories)
    const story = this._storySlugMap ? this._storySlugMap.get(slug)
      : this._storyIndex.find(s => s.slug === slug);
    if (story) {
      this.hide();
      this.onPlay(story);
    }
  }

  /** Initialize delegated click/input/keyboard handlers once (avoids re-binding on every render) */
  _initDelegation() {
    if (this._delegated) return;
    this._delegated = true;

    this._overlay.addEventListener('click', (e) => {
      // Close button
      if (e.target.closest('.stats-close')) { this.hide(); return; }

      // Search + sort are handled by dedicated input/change listeners.
      if (e.target.closest('.stats-search') || e.target.closest('.stats-sort')) return;

      // Clickable rows (story breakdown or recently played)
      const playable = e.target.closest('.stats-recent-item, .stats-table-row');
      if (playable) this._playStoryBySlug(playable.dataset.slug);
    });

    this._overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const playable = e.target.closest('.stats-recent-item, .stats-table-row');
      if (!playable) return;
      e.preventDefault();
      this._playStoryBySlug(playable.dataset.slug);
    });

    this._overlay.addEventListener('input', (e) => {
      if (!e.target.classList.contains('stats-search')) return;
      this._storySearch = e.target.value || '';
      this._savePrefs();
      this._renderStoryTable();
    });

    this._overlay.addEventListener('change', (e) => {
      if (!e.target.classList.contains('stats-sort')) return;
      this._storySort = e.target.value || 'progress-desc';
      this._savePrefs();
      this._renderStoryTable();
    });
  }

  // ─── Preferences ───────────────────────────────────────────────

  /** Persist lightweight dashboard UI prefs between opens/reloads. */
  _savePrefs() {
    SafeStorage.setJSON(this._prefsKey, {
      storySearch: this._storySearch,
      storySort: this._storySort
    });
  }

  /** Restore persisted dashboard UI prefs, if available. */
  _loadPrefs() {
    const saved = SafeStorage.getJSON(this._prefsKey, null);
    if (!saved) return;
    this._storySearch = typeof saved.storySearch === 'string' ? saved.storySearch : '';
    this._storySort = typeof saved.storySort === 'string' ? saved.storySort : 'progress-desc';
  }

  // ─── Utilities ─────────────────────────────────────────────────

  /** Format a timestamp to relative time */
  _timeAgo(ts) {
    if (!ts) return 'never';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }
}

/** Pre-built sort comparators — avoids object allocation per _getVisibleStoryRows call */
StatsDashboard._COMPARATORS = {
  'progress-desc': (a, b) => b.progress - a.progress || b.visitedCount - a.visitedCount || a.title.localeCompare(b.title),
  'recent-desc': (a, b) => b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title),
  'plays-desc': (a, b) => b.plays - a.plays || b.progress - a.progress || a.title.localeCompare(b.title),
  'reading-desc': (a, b) => b.readingMs - a.readingMs || b.progress - a.progress || a.title.localeCompare(b.title),
  'endings-desc': (a, b) => b.endings - a.endings || b.totalEndings - a.totalEndings || a.title.localeCompare(b.title),
  'title-asc': (a, b) => a.title.localeCompare(b.title)
};
