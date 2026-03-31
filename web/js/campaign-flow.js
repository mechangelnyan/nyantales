/**
 * NyanTales — Campaign Flow Controller
 *
 * Manages the campaign state machine: starting the campaign, advancing phases
 * (intro → connector → chapter → complete), and handling campaign endings.
 *
 * Orchestrates the multi-act campaign state machine (start, phase transitions, chapter flow).
 * Requires callbacks for startStory / returnToMenu (set after construction).
 */
class CampaignFlow {
  /**
   * @param {CampaignManager} campaign
   * @param {CampaignUI}      campaignUI
   * @param {SaveManager}     saveManager
   * @param {AchievementSystem} achievements
   * @param {PlaybackController} playback
   */
  constructor(campaign, campaignUI, saveManager, achievements, playback) {
    this._campaign    = campaign;
    this._campaignUI  = campaignUI;
    this._saveManager = saveManager;
    this._achievements = achievements;
    this._playback    = playback;

    /** @type {Array} Queued achievement unlocks during campaign (shown between phases) */
    this.pendingUnlocks = [];

    // ── Callbacks (wired by main.js after construction) ──
    /** @type {function(Object, Object=, Object=):Promise<void>} */
    this.startStory   = null;
    /** @type {function():void} */
    this.returnToMenu = null;
    /** @type {function():Map<string,Object>} */
    this.storySlugMap  = null;
  }

  /** Start or continue the campaign. */
  start() {
    if (!this._campaign.isLoaded) {
      Toast.show('Campaign data not available', { icon: '⚠️' });
      return;
    }
    // Clean up stale transient saves from previous campaign runs
    this._saveManager.deleteSlot('campaign-intro', 'auto');
    this._playback.campaignMode = true;
    this._playPhase();
  }

  /** Play the current campaign phase (intro, connector, chapter, or complete). */
  _playPhase() {
    const c = this._campaign;
    const phase = c.progress.phase;

    if (phase === 'intro' && !c.progress.started) {
      const introStory = c.getIntroAsStory();
      if (introStory) {
        this.startStory(introStory);
        return;
      }
      c.advance();
      this._playPhase();
      return;
    }

    if (phase === 'connector') {
      const connStory = c.getConnectorAsStory(c.progress.connectorKey);
      if (connStory) {
        this.startStory(connStory);
        return;
      }
      c.advance();
      this._playPhase();
      return;
    }

    if (phase === 'chapter') {
      const ch = c.getCurrentChapter();
      if (!ch) {
        c.progress.phase = 'complete';
        c.saveProgress();
        this._playPhase();
        return;
      }
      const slugMap = this.storySlugMap();
      const story = slugMap.get(ch.story);
      if (!story) {
        console.warn(`Campaign: story "${ch.story}" not found, skipping`);
        c.advance();
        this._playPhase();
        return;
      }
      this.startStory(story).then(() => {
        if (this._playback.engine) c.applyPersistentState(this._playback.engine);
      }).catch(e => console.warn('Campaign: failed to start chapter', e));
      return;
    }

    if (phase === 'complete') {
      this._playback.campaignMode = false;
      Toast.show('Campaign complete! 🎉 Thanks for playing.', { icon: '🐱', duration: 5000 });
      this.returnToMenu();
    }
  }

  /**
   * Called when a story/connector ends during campaign mode.
   * Advances campaign state and plays the next phase.
   */
  onEnding() {
    const slug = this._playback.currentSlug;
    // Clean up transient campaign saves (intro/connectors shouldn't linger)
    if (slug === 'campaign-intro' || slug?.startsWith('campaign-connector-')) {
      this._saveManager.deleteSlot(slug, 'auto');
    }
    this._campaign.advance(this._playback.engine);
    this._campaignUI.rebuildSlugMap();

    const queued = this.pendingUnlocks.splice(0, this.pendingUnlocks.length);
    this._playback.trackTimeout(() => {
      this._playPhase();
      if (queued.length > 0) {
        this._playback.trackTimeout(() => this._achievements.showNewUnlocks(queued), 1200);
      }
    }, 500);
  }

  /**
   * Start a specific campaign chapter by index.
   * Used when player clicks a chapter card to replay or jump to current chapter.
   */
  async startChapter(chapterIndex) {
    const c = this._campaign;
    if (!c.isLoaded) {
      Toast.show('Campaign data not available', { icon: '⚠️' });
      return;
    }
    const ch = c.chapters[chapterIndex];
    if (!ch) return;
    const slugMap = this.storySlugMap();
    const story = slugMap.get(ch.story);
    if (!story) {
      Toast.show('Story not found: ' + ch.story, { icon: '⚠️' });
      return;
    }
    c.progress.chapterIndex = chapterIndex;
    c.progress.phase = 'chapter';
    if (!c.progress.started && chapterIndex === 0) {
      c.progress.started = false;
    } else if (chapterIndex > 0) {
      c.progress.started = true;
    }
    c.saveProgress();
    this._playback.campaignMode = true;
    await this.startStory(story);
    if (this._playback.engine) c.applyPersistentState(this._playback.engine);
  }
}
