/**
 * TitleScreen — manages title screen rendering: stats bar, story grid,
 * continue button, and install button coordination.
 *
 * Handles first-render vs partial-refresh of the 30-card story grid
 * (full build on first call, in-place update on subsequent menu returns).
 */
class TitleScreen {
  /**
   * @param {Object} deps
   * @param {StoryTracker} deps.tracker
   * @param {AchievementSystem} deps.achievements
   * @param {SaveManager} deps.saveManager
   * @param {CampaignUI} deps.campaignUI
   * @param {StoryCardManager} deps.cardManager
   * @param {VNUI} deps.ui
   * @param {TitleBrowser} deps.titleBrowser
   * @param {StoryLoader} deps.stories
   * @param {HTMLElement} deps.statsEl
   * @param {HTMLElement} deps.btnContinueEl
   */
  constructor(deps) {
    this._tracker = deps.tracker;
    this._achievements = deps.achievements;
    this._saveManager = deps.saveManager;
    this._campaignUI = deps.campaignUI;
    this._cardManager = deps.cardManager;
    this._ui = deps.ui;
    this._titleBrowser = deps.titleBrowser;
    this._stories = deps.stories;

    this._statsEl = deps.statsEl;
    this._btnContinueEl = deps.btnContinueEl;

    // Stats bar DOM (built once)
    this._statsBuilt = false;
    this._statRefs = {};

    // Story grid state
    this._gridBuilt = false;

    // Pre-build continue button children
    this._continueMeta = null;
    if (this._btnContinueEl) {
      this._btnContinueEl.textContent = '';
      this._btnContinueEl.appendChild(document.createTextNode('▶ Continue'));
      this._continueMeta = document.createElement('span');
      this._continueMeta.className = 'continue-meta';
      this._btnContinueEl.appendChild(this._continueMeta);
    }
  }

  /**
   * Render (or re-render) the title screen.
   * First call: builds the full story grid from scratch.
   * Subsequent calls: partial refresh — updates stats, badges, progress
   * without destroying/rebuilding 30 DOM cards.
   */
  render() {
    const stats = this._tracker.getStats();
    const achStats = this._achievements.getStats();
    const totalTime = StoryTracker.formatDuration(this._tracker.getTotalReadingMs());
    this._ensureStatsBar();
    this._updateStatsBar(stats, achStats, totalTime);

    // Campaign section
    this._campaignUI.updateButton();
    this._campaignUI.renderGrid();

    const storyIndex = this._stories.index;
    if (!this._gridBuilt) {
      // First render: build full story grid
      this._cardManager.clearRefs();
      this._ui.renderStoryList(storyIndex, (story, refs) => this._cardManager.setInnerRefs(story, refs));
      const cards = this._titleBrowser.refreshCards();
      for (let idx = 0; idx < storyIndex.length; idx++) {
        const card = cards[idx];
        if (card) this._cardManager.decorate(card, storyIndex[idx]);
      }
      this._gridBuilt = true;
    } else {
      // Subsequent renders: partial update
      this._cardManager.refresh(storyIndex, this._titleBrowser.refreshCards());
    }

    this.updateContinueButton();
    this._titleBrowser.apply();
  }

  /** Update continue button text and visibility based on most recent save. */
  updateContinueButton() {
    const btn = this._btnContinueEl;
    if (!btn) return;

    let recent = this._saveManager.getMostRecentSave();

    // Skip campaign transient saves
    if (recent && (recent.slug === 'campaign-intro' || recent.slug?.startsWith('campaign-connector-'))) {
      recent = null;
    }

    if (recent) {
      const story = this._stories.get(recent.slug);
      const title = story ? story.title : recent.slug;
      this._continueMeta.textContent = `${title} · ${recent.turns} turns`;
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  // ── Stats Bar (pre-built DOM, textContent updates) ──

  _ensureStatsBar() {
    if (this._statsBuilt) return;
    const el = this._statsEl;
    el.textContent = '';
    const storyCount = this._stories.index.length;
    const defs = [
      { key: 'complete', icon: '📖', suffix: `/${storyCount} complete` },
      { key: 'endings', icon: '🔮', suffix: ' endings found' },
      { key: 'plays', icon: '🎮', suffix: ' plays' },
      { key: 'achievements', icon: '🏆', suffix: '' },
      { key: 'readTime', icon: '⏱', suffix: ' reading' }
    ];
    for (const d of defs) {
      const div = document.createElement('div');
      div.className = 'stat';
      const valSpan = document.createElement('span');
      valSpan.className = 'stat-value';
      div.appendChild(document.createTextNode(d.icon + ' '));
      div.appendChild(valSpan);
      const suffixNode = document.createTextNode(d.suffix);
      div.appendChild(suffixNode);
      this._statRefs[d.key] = { el: div, valSpan, suffixNode };
      el.appendChild(div);
    }
    this._statsBuilt = true;
  }

  _updateStatsBar(stats, achStats, totalTime) {
    const r = this._statRefs;
    r.complete.valSpan.textContent = stats.storiesCompleted;
    r.endings.valSpan.textContent = stats.totalEndings;
    r.plays.valSpan.textContent = stats.totalPlays;
    r.achievements.valSpan.textContent = `${achStats.unlocked}/${achStats.total}`;
    const hasReadTime = this._tracker.getTotalReadingMs() > 0;
    r.readTime.el.classList.toggle('hidden', !hasReadTime);
    if (hasReadTime) {
      r.readTime.valSpan.textContent = totalTime;
    }
  }
}
