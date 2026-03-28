/**
 * NyanTales — Statistics Dashboard
 * Comprehensive player statistics panel with per-story breakdown,
 * play streaks, and global analytics.
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
  }

  /**
   * Set the loaded story index (needed for scene counts, titles, etc.)
   * @param {Array} stories
   */
  setStories(stories) {
    this._storyIndex = stories;
    // Build slug→story Map for O(1) lookups in _playStoryBySlug
    this._storySlugMap = new Map(stories.map(s => [s.slug, s]));
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
      this._initDelegation();
    }

    this._render();
    this._overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this._overlay.classList.add('visible'));

    if (typeof FocusTrap !== 'undefined') {
      this._focusTrap = new FocusTrap(this._overlay);
      this._focusTrap.activate();
    }
  }

  /** Hide the stats dashboard */
  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this._overlay.classList.remove('visible');
    this._overlay.setAttribute('aria-hidden', 'true');
    if (this._focusTrap) {
      this._focusTrap.deactivate();
      this._focusTrap = null;
    }
  }

  /** Compute global stats */
  _computeStats() {
    const globalStats = this.tracker.getStats();
    const achStats = this.achievements.getStats();
    const stories = this._storyIndex;

    // Per-story data
    const storyRows = stories.map(story => {
      const data = this.tracker.getStory(story.slug);
      const sceneCount = story._parsed?.scenes ? Object.keys(story._parsed.scenes).length : 0;
      const visitedCount = this.tracker.visitedSceneCount(story.slug);
      const progress = sceneCount > 0 ? this.tracker.getProgress(story.slug, sceneCount) : 0;
      const endings = this.tracker.endingCount(story.slug);
      const completed = this.tracker.isCompleted(story.slug);
      const plays = data.totalPlays || 0;
      const bestTurns = data.bestTurns || null;
      const lastPlayed = data.lastPlayed || 0;
      const readingMs = data.totalReadingMs || 0;
      const hasSave = this.saveManager.hasSave(story.slug);

      // Count total possible endings from story data
      let totalEndings = 0;
      if (story._parsed?.scenes) {
        Object.values(story._parsed.scenes).forEach(s => {
          if (s.ending) totalEndings++;
        });
      }

      return {
        slug: story.slug,
        title: story.title,
        sceneCount,
        visitedCount,
        progress,
        endings,
        totalEndings,
        completed,
        plays,
        bestTurns,
        lastPlayed,
        readingMs,
        hasSave
      };
    });

    // Sort by most played, then most progress
    const mostPlayed = [...storyRows].sort((a, b) => b.plays - a.plays).filter(s => s.plays > 0);
    const recentlyPlayed = [...storyRows].sort((a, b) => b.lastPlayed - a.lastPlayed).filter(s => s.lastPlayed > 0);

    // Total scenes across all stories
    const totalScenes = storyRows.reduce((sum, s) => sum + s.sceneCount, 0);
    const totalScenesVisited = storyRows.reduce((sum, s) => sum + s.visitedCount, 0);

    // Total endings possible vs found
    const totalEndingsPossible = storyRows.reduce((sum, s) => sum + s.totalEndings, 0);

    // Save count
    let saveCount = 0;
    storyRows.forEach(s => { if (s.hasSave) saveCount++; });

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

  /** Filter + sort the per-story table rows for the breakdown section. */
  _getVisibleStoryRows(storyRows) {
    const query = this._storySearch.trim().toLowerCase();
    const filtered = query
      ? storyRows.filter(s => {
          const haystack = `${s.title} ${s.slug}`.toLowerCase();
          return haystack.includes(query);
        })
      : [...storyRows];

    const comparators = {
      'progress-desc': (a, b) => b.progress - a.progress || b.visitedCount - a.visitedCount || a.title.localeCompare(b.title),
      'recent-desc': (a, b) => b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title),
      'plays-desc': (a, b) => b.plays - a.plays || b.progress - a.progress || a.title.localeCompare(b.title),
      'reading-desc': (a, b) => b.readingMs - a.readingMs || b.progress - a.progress || a.title.localeCompare(b.title),
      'endings-desc': (a, b) => b.endings - a.endings || b.totalEndings - a.totalEndings || a.title.localeCompare(b.title),
      'title-asc': (a, b) => a.title.localeCompare(b.title)
    };

    return filtered.sort(comparators[this._storySort] || comparators['progress-desc']);
  }

  /** Render the dashboard */
  _render() {
    const stats = this._computeStats();
    const g = stats.global;
    const a = stats.achievements;
    const visibleRows = this._getVisibleStoryRows(stats.storyRows);

    // Completion percentage
    const completionPct = this._storyIndex.length > 0
      ? Math.round((g.storiesCompleted / this._storyIndex.length) * 100)
      : 0;

    // Scene exploration percentage
    const scenePct = stats.totalScenes > 0
      ? Math.round((stats.totalScenesVisited / stats.totalScenes) * 100)
      : 0;

    // Ending discovery percentage
    const endingPct = stats.totalEndingsPossible > 0
      ? Math.round((g.totalEndings / stats.totalEndingsPossible) * 100)
      : 0;

    this._overlay.innerHTML = `
      <div class="stats-panel">
        <div class="stats-header">
          <div>
            <div class="stats-title">📊 Statistics</div>
            <div class="stats-subtitle">${this._storyIndex.length} stories · ${stats.totalScenes} scenes</div>
          </div>
          <button class="stats-close" aria-label="Close statistics">✕</button>
        </div>

        <!-- Global summary cards -->
        <div class="stats-summary">
          <div class="stats-card">
            <div class="stats-card-value">${g.storiesCompleted}<span class="stats-card-total">/${this._storyIndex.length}</span></div>
            <div class="stats-card-label">Stories Complete</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="--bar-pct:${completionPct}%"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${g.totalEndings}<span class="stats-card-total">/${stats.totalEndingsPossible}</span></div>
            <div class="stats-card-label">Endings Found</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill stats-bar-magenta" style="--bar-pct:${endingPct}%"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${scenePct}%</div>
            <div class="stats-card-label">Scenes Explored</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill stats-bar-green" style="--bar-pct:${scenePct}%"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${g.totalPlays}</div>
            <div class="stats-card-label">Total Plays</div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${StoryTracker.formatDuration(stats.totalReadingMs)}</div>
            <div class="stats-card-label">Reading Time</div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${a.unlocked}<span class="stats-card-total">/${a.total}</span></div>
            <div class="stats-card-label">Achievements</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill stats-bar-yellow" style="--bar-pct:${Math.round(a.unlocked / a.total * 100)}%"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${stats.saveCount}</div>
            <div class="stats-card-label">Active Saves</div>
          </div>
        </div>

        ${stats.campaignStats && stats.campaignStats.started ? `
        <!-- Campaign progress -->
        <div class="stats-section">
          <div class="stats-section-title">📖 Campaign Progress</div>
          <div class="stats-card stats-card-wide">
            <div class="stats-card-value stats-card-gold">${stats.campaignStats.complete ? '✨ Complete!' : `${stats.campaignStats.chaptersCompleted}/${stats.campaignStats.chaptersTotal} chapters`}</div>
            <div class="stats-card-label">${stats.campaignStats.label || 'The Campaign'}</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill stats-bar-gold" style="--bar-pct:${stats.campaignStats.pct}%"></div></div>
          </div>
        </div>
        ` : ''}

        ${stats.recentlyPlayed.length > 0 ? `
        <!-- Recently played -->
        <div class="stats-section">
          <div class="stats-section-title">🕐 Recently Played</div>
          <div class="stats-recent-list">
            ${stats.recentlyPlayed.slice(0, 5).map(s => `
              <div class="stats-recent-item" data-slug="${s.slug}" tabindex="0" role="button" aria-label="Play ${this._escapeHtml(s.title)}">
                <div class="stats-recent-title">${this._escapeHtml(s.title)}</div>
                <div class="stats-recent-meta">
                  <span>${s.progress}% explored</span>
                  <span>${s.endings}/${s.totalEndings} endings</span>
                  <span>${s.plays} play${s.plays !== 1 ? 's' : ''}</span>
                  <span>${this._timeAgo(s.lastPlayed)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Per-story breakdown -->
        <div class="stats-section">
          <div class="stats-section-title">📖 Story Breakdown</div>

          <div class="stats-controls">
            <label class="stats-search-wrap">
              <span class="sr-only">Search stories in statistics</span>
              <input
                type="search"
                class="stats-search"
                placeholder="Search by title or slug…"
                value="${this._escapeHtml(this._storySearch)}"
                aria-label="Search stories in statistics"
              >
            </label>

            <label class="stats-sort-wrap">
              <span class="sr-only">Sort stories in statistics</span>
              <select class="stats-sort" aria-label="Sort stories in statistics">
                <option value="progress-desc" ${this._storySort === 'progress-desc' ? 'selected' : ''}>Most Progress</option>
                <option value="recent-desc" ${this._storySort === 'recent-desc' ? 'selected' : ''}>Recently Played</option>
                <option value="plays-desc" ${this._storySort === 'plays-desc' ? 'selected' : ''}>Most Plays</option>
                <option value="endings-desc" ${this._storySort === 'endings-desc' ? 'selected' : ''}>Most Endings</option>
                <option value="reading-desc" ${this._storySort === 'reading-desc' ? 'selected' : ''}>Longest Read Time</option>
                <option value="title-asc" ${this._storySort === 'title-asc' ? 'selected' : ''}>Title A → Z</option>
              </select>
            </label>

            <div class="stats-story-count" aria-live="polite">${visibleRows.length}/${stats.storyRows.length} shown</div>
          </div>

          <div class="stats-story-table">
            <div class="stats-table-header">
              <span class="stats-th stats-th-title">Story</span>
              <span class="stats-th">Progress</span>
              <span class="stats-th">Endings</span>
              <span class="stats-th">Plays</span>
              <span class="stats-th">Best</span>
            </div>
            ${visibleRows.length > 0 ? visibleRows.map(s => `
              <div class="stats-table-row ${s.completed ? 'completed' : ''} ${s.plays > 0 ? 'played' : ''}"
                   data-slug="${s.slug}"
                   tabindex="0"
                   role="button"
                   aria-label="Play ${this._escapeHtml(s.title)}">
                <span class="stats-td stats-td-title" title="${this._escapeHtml(s.title)}">
                  ${s.completed ? '✅' : (s.plays > 0 ? '📖' : '🆕')} ${this._escapeHtml(s.title)}
                </span>
                <span class="stats-td stats-td-progress" data-label="Progress">
                  <span class="stats-mini-bar"><span class="stats-mini-bar-fill" style="--bar-pct:${s.progress}%"></span></span>
                  <span class="stats-td-pct">${s.progress}%</span>
                </span>
                <span class="stats-td" data-label="Endings">${s.endings}/${s.totalEndings}</span>
                <span class="stats-td" data-label="Plays">${s.plays || '—'}</span>
                <span class="stats-td" data-label="Best">${s.bestTurns || '—'}</span>
              </div>
            `).join('') : `
              <div class="stats-empty-state">No stories match that search yet.</div>
            `}
          </div>
        </div>
      </div>
    `;

    // Close + recent-item clicks handled by delegated listener (see _initDelegation)

    // Cache computed data for partial re-renders (search/sort only update the table)
    this._lastStoryRows = stats.storyRows;
  }

  /**
   * Re-render only the story breakdown table (not summary/recent sections).
   * Called on search/sort input to avoid full innerHTML rebuild on every keystroke.
   */
  _renderStoryTable() {
    if (!this._lastStoryRows || !this._overlay) return;
    const tableEl = this._overlay.querySelector('.stats-story-table');
    const countEl = this._overlay.querySelector('.stats-story-count');
    if (!tableEl) return;

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

    if (countEl) {
      countEl.textContent = `${visibleRows.length}/${this._lastStoryRows.length} shown`;
    }
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
    let row;
    if (idx < this._rowPool.length) {
      row = this._rowPool[idx];
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

      // Cache child refs on the row element
      row._tdTitle = tdTitle;
      row._miniBarFill = miniBarFill;
      row._pctSpan = pctSpan;
      row._tdEndings = tdEndings;
      row._tdPlays = tdPlays;
      row._tdBest = tdBest;

      this._rowPool.push(row);
    }

    // Update content
    row.className = 'stats-table-row' + (s.completed ? ' completed' : '') + (s.plays > 0 ? ' played' : '');
    row.dataset.slug = s.slug;
    row.setAttribute('aria-label', `Play ${s.title}`);

    const icon = s.completed ? '✅' : (s.plays > 0 ? '📖' : '🆕');
    row._tdTitle.textContent = `${icon} ${s.title}`;
    row._tdTitle.title = s.title;
    row._miniBarFill.style.setProperty('--bar-pct', `${s.progress}%`);
    row._pctSpan.textContent = `${s.progress}%`;
    row._tdEndings.textContent = `${s.endings}/${s.totalEndings}`;
    row._tdPlays.textContent = s.plays || '—';
    row._tdBest.textContent = s.bestTurns || '—';

    return row;
  }

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

  /** Persist lightweight dashboard UI prefs between opens/reloads. */
  _savePrefs() {
    try {
      localStorage.setItem(this._prefsKey, JSON.stringify({
        storySearch: this._storySearch,
        storySort: this._storySort
      }));
    } catch (err) {
      console.warn('Failed to persist stats dashboard prefs:', err);
    }
  }

  /** Restore persisted dashboard UI prefs, if available. */
  _loadPrefs() {
    try {
      const raw = localStorage.getItem(this._prefsKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this._storySearch = typeof saved.storySearch === 'string' ? saved.storySearch : '';
      this._storySort = typeof saved.storySort === 'string' ? saved.storySort : 'progress-desc';
    } catch (err) {
      console.warn('Failed to load stats dashboard prefs:', err);
      this._storySearch = '';
      this._storySort = 'progress-desc';
    }
  }

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

  /** Escape HTML (reuses shared off-screen element) */
  _escapeHtml(text) {
    if (!VNUI._escapeDiv) VNUI._escapeDiv = document.createElement('div');
    VNUI._escapeDiv.textContent = text;
    return VNUI._escapeDiv.innerHTML;
  }
}
