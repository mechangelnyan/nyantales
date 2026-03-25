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
  constructor(tracker, achievements, saveManager, portraits) {
    this.tracker = tracker;
    this.achievements = achievements;
    this.saveManager = saveManager;
    this.portraits = portraits;
    this.isVisible = false;
    this._overlay = null;
    this._focusTrap = null;
    this._storyIndex = [];

    /** @type {Function|null} Callback when user clicks "Play" on a story row */
    this.onPlay = null;
  }

  /**
   * Set the loaded story index (needed for scene counts, titles, etc.)
   * @param {Array} stories
   */
  setStories(stories) {
    this._storyIndex = stories;
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
      document.body.appendChild(this._overlay);
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.hide();
      });
    }

    this._render();
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
      const progress = sceneCount > 0 ? this.tracker.getProgress(story.slug, sceneCount) : 0;
      const endings = this.tracker.endingCount(story.slug);
      const completed = this.tracker.isCompleted(story.slug);
      const plays = data.plays || 0;
      const bestTurns = data.bestTurns || null;
      const lastPlayed = data.lastPlayed || 0;
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
        progress,
        endings,
        totalEndings,
        completed,
        plays,
        bestTurns,
        lastPlayed,
        hasSave
      };
    });

    // Sort by most played, then most progress
    const mostPlayed = [...storyRows].sort((a, b) => b.plays - a.plays).filter(s => s.plays > 0);
    const recentlyPlayed = [...storyRows].sort((a, b) => b.lastPlayed - a.lastPlayed).filter(s => s.lastPlayed > 0);

    // Total scenes across all stories
    const totalScenes = storyRows.reduce((sum, s) => sum + s.sceneCount, 0);
    const totalScenesVisited = storyRows.reduce((sum, s) => sum + Math.round(s.sceneCount * s.progress / 100), 0);

    // Total endings possible vs found
    const totalEndingsPossible = storyRows.reduce((sum, s) => sum + s.totalEndings, 0);

    // Save count
    let saveCount = 0;
    storyRows.forEach(s => { if (s.hasSave) saveCount++; });

    return {
      global: globalStats,
      achievements: achStats,
      storyRows,
      mostPlayed,
      recentlyPlayed,
      totalScenes,
      totalScenesVisited,
      totalEndingsPossible,
      saveCount
    };
  }

  /** Render the dashboard */
  _render() {
    const stats = this._computeStats();
    const g = stats.global;
    const a = stats.achievements;

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
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="width:${completionPct}%"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${g.totalEndings}<span class="stats-card-total">/${stats.totalEndingsPossible}</span></div>
            <div class="stats-card-label">Endings Found</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="width:${endingPct}%;background:var(--accent-magenta)"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${scenePct}%</div>
            <div class="stats-card-label">Scenes Explored</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="width:${scenePct}%;background:var(--accent-green)"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${g.totalPlays}</div>
            <div class="stats-card-label">Total Plays</div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${a.unlocked}<span class="stats-card-total">/${a.total}</span></div>
            <div class="stats-card-label">Achievements</div>
            <div class="stats-card-bar"><div class="stats-card-bar-fill" style="width:${Math.round(a.unlocked/a.total*100)}%;background:var(--accent-yellow)"></div></div>
          </div>
          <div class="stats-card">
            <div class="stats-card-value">${stats.saveCount}</div>
            <div class="stats-card-label">Active Saves</div>
          </div>
        </div>

        ${stats.recentlyPlayed.length > 0 ? `
        <!-- Recently played -->
        <div class="stats-section">
          <div class="stats-section-title">🕐 Recently Played</div>
          <div class="stats-recent-list">
            ${stats.recentlyPlayed.slice(0, 5).map(s => `
              <div class="stats-recent-item" data-slug="${s.slug}">
                <div class="stats-recent-title">${this._escapeHtml(s.title)}</div>
                <div class="stats-recent-meta">
                  <span>${s.progress}% explored</span>
                  <span>${s.endings} ending${s.endings !== 1 ? 's' : ''}</span>
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
          <div class="stats-story-table">
            <div class="stats-table-header">
              <span class="stats-th stats-th-title">Story</span>
              <span class="stats-th">Progress</span>
              <span class="stats-th">Endings</span>
              <span class="stats-th">Plays</span>
              <span class="stats-th">Best</span>
            </div>
            ${stats.storyRows.map(s => `
              <div class="stats-table-row ${s.completed ? 'completed' : ''} ${s.plays > 0 ? 'played' : ''}">
                <span class="stats-td stats-td-title" title="${this._escapeHtml(s.title)}">
                  ${s.completed ? '✅' : (s.plays > 0 ? '📖' : '🆕')} ${this._escapeHtml(s.title)}
                </span>
                <span class="stats-td">
                  <span class="stats-mini-bar"><span class="stats-mini-bar-fill" style="width:${s.progress}%"></span></span>
                  <span class="stats-td-pct">${s.progress}%</span>
                </span>
                <span class="stats-td">${s.endings}/${s.totalEndings}</span>
                <span class="stats-td">${s.plays || '—'}</span>
                <span class="stats-td">${s.bestTurns || '—'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Wire close button
    this._overlay.querySelector('.stats-close').addEventListener('click', () => this.hide());

    // Wire recent items to play
    this._overlay.querySelectorAll('.stats-recent-item').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const slug = el.dataset.slug;
        const story = this._storyIndex.find(s => s.slug === slug);
        if (story && this.onPlay) {
          this.hide();
          this.onPlay(story);
        }
      });
    });
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

  /** Escape HTML */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
