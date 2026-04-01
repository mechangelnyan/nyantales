/**
 * PlaybackController — manages scene playback pipeline, auto-play timer,
 * skip-read fast-forward, rewind, and HUD indicator state.
 */
class PlaybackController {
  /** Shared delay utility — zero allocation when ms <= 0. */
  static delay(ms) { return ms > 0 ? new Promise(r => setTimeout(r, ms)) : undefined; }

  /** Yield to the next animation frame — allows UI repaint between rapid skip-read advances. */
  static raf() { return new Promise(r => requestAnimationFrame(r)); }

  /**
   * @param {Object} deps — subsystem references
   * @param {VNUI}             deps.ui
   * @param {SettingsManager}  deps.settings
   * @param {TextHistory}      deps.textHistory
   * @param {AmbientAudio}     deps.audio
   * @param {SaveManager}      deps.saveManager
   * @param {StoryTracker}     deps.tracker
   * @param {HTMLElement}      deps.vnContainer
   */
  constructor(deps) {
    this.ui           = deps.ui;
    this.settings     = deps.settings;
    this.textHistory  = deps.textHistory;
    this.audio        = deps.audio;
    this.saveManager  = deps.saveManager;
    this.tracker      = deps.tracker;

    /** @type {StoryEngine|null} */
    this.engine       = null;
    this.currentSlug  = null;
    this.totalScenes  = 0;
    this.campaignMode = false;
    this.storyStartTime = null;

    /** @type {Object|null} Most recently parsed story data (for restart). */
    this.currentParsed = null;

    // Reusable ending DOM elements (avoids createElement per ending)
    this._endingTimeBox  = null;
    this._endingNewBadge = null;

    // Auto-play
    this._autoTimer   = null;
    this._suppressNext = false;

    // Misc tracked timers (achievement toasts, campaign pacing) — cleared on menu return
    this._miscTimers  = new Set();

    // Progress HUD throttle
    this._lastPct     = -1;
    this._lastTurns   = -1;

    // Panel-open callback — set by main.js so we can check without importing all panels
    /** @returns {boolean} */
    this.isAnyPanelOpen = () => false;

    // ── Build HUD indicator elements ──

    const vc = deps.vnContainer;

    this._autoEl = (() => {
      const el = document.createElement('div');
      el.className = 'auto-play-indicator hidden';
      const dot = document.createElement('div');
      dot.className = 'auto-play-dot';
      el.appendChild(dot);
      el.appendChild(document.createTextNode(' AUTO'));
      vc.appendChild(el);
      return el;
    })();

    this._skipEl = (() => {
      const el = document.createElement('div');
      el.className = 'skip-indicator hidden';
      el.textContent = '⏭ SKIP';
      vc.appendChild(el);
      return el;
    })();

    this._hudEl = (() => {
      const el = document.createElement('div');
      el.className = 'progress-hud hidden';
      el.setAttribute('aria-live', 'off');
      const vs = document.createElement('span');
      const ts = document.createElement('span');
      el.appendChild(vs);
      el.appendChild(ts);
      vc.appendChild(el);
      return el;
    })();
    this._hudVisitedSpan = this._hudEl.firstChild;
    this._hudTurnSpan = this._hudEl.lastChild;

    this._barEl = (() => {
      const el = document.createElement('div');
      el.className = 'story-progress-bar hidden';
      vc.appendChild(el);
      return el;
    })();
  }

  // ── Timer Management ──

  clearAutoPlay() {
    if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; }
  }

  /** Schedule a tracked timeout — auto-cleared on cleanup(). */
  trackTimeout(fn, ms) {
    const id = setTimeout(() => {
      this._miscTimers.delete(id);
      fn();
    }, ms);
    this._miscTimers.add(id);
    return id;
  }

  clearMiscTimers() {
    for (const id of this._miscTimers) clearTimeout(id);
    this._miscTimers.clear();
  }

  /** Suppress the next auto-advance (e.g. after intro splash). */
  suppressNextAutoAdvance() { this._suppressNext = true; }

  scheduleAutoAdvance() {
    this.clearAutoPlay();
    if (!this.settings.get('autoPlay') || !this.engine) return;
    if (this.isAnyPanelOpen()) return;

    const scene = this.engine.getCurrentScene();
    if (!scene || scene.ending) return;
    if (this.engine.getAvailableChoices().length > 0) return;
    if (this._suppressNext) { this._suppressNext = false; return; }

    this._autoTimer = setTimeout(() => {
      if (!this.engine || this.isAnyPanelOpen()) return;
      this.advanceScene();
    }, this.settings.get('autoPlayDelay'));
  }

  // ── Scene Advance ──

  /**
   * Advance to the next scene if the current scene has a `next` link
   * and no choices / no ending. Returns true if advanced.
   */
  advanceScene() {
    if (!this.engine) return false;
    const scene = this.engine.getCurrentScene();
    if (scene && scene.next && this.engine.getAvailableChoices().length === 0 && !scene.ending) {
      this.clearAutoPlay();
      const next = this.engine.goToScene(scene.next);
      this.playScene(next);
      return true;
    }
    return false;
  }

  // ── Skip-Read ──

  shouldSkip(sceneId) {
    return this.settings.get('skipRead') && this.engine && this.engine.state.visited.has(sceneId);
  }

  // ── HUD Updates ──

  updateSkipIndicator(active) {
    this._skipEl.classList.toggle('hidden', !active);
    if (active) {
      this._autoEl.classList.add('hidden');
    } else if (this.settings.get('autoPlay')) {
      this._autoEl.classList.remove('hidden');
    }
  }

  /** Cache the auto-play HUD button ref. */
  setAutoButton(el) { this._autoBtnEl = el; }

  updateAutoPlayHUD(on) {
    const btnEl = this._autoBtnEl;
    if (btnEl) {
      btnEl.classList.toggle('hud-inactive', !on);
      btnEl.title = on ? 'Auto-Play ON (A)' : 'Auto-Play OFF (A)';
      btnEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    this._autoEl.classList.toggle('hidden', !on);
  }

  updateProgressHUD() {
    if (!this.engine) return;

    const visited = this.engine.state.visited.size;
    const pct = this.totalScenes > 0 ? Math.round((visited / this.totalScenes) * 100) : 0;
    const turns = this.engine.state.turns;

    if (pct === this._lastPct && turns === this._lastTurns) {
      this._hudEl.classList.remove('hidden');
      this._barEl.classList.remove('hidden');
      return;
    }
    this._lastPct = pct;
    this._lastTurns = turns;

    this._hudVisitedSpan.textContent = `📍 ${visited}/${this.totalScenes}`;
    this._hudTurnSpan.textContent = ` · Turn ${turns}`;
    this._hudEl.title = `${pct}% explored · Turn ${turns}`;
    this._hudEl.classList.remove('hidden');

    this._barEl.style.setProperty('--bar-pct', `${pct}%`);
    this._barEl.classList.remove('hidden');
  }

  /** Update rewind button state based on snapshot availability. */
  updateRewindButton() {
    if (!this._rewindBtnEl) return;
    const canRewind = this.engine && this.engine.state.snapshots.length > 0;
    this._rewindBtnEl.classList.toggle('hud-dim', !canRewind);
    this._rewindBtnEl.disabled = !canRewind;
  }

  /** Rewind one scene and replay. */
  rewindOneScene() {
    if (!this.engine || this.engine.state.snapshots.length === 0) return;
    this.clearAutoPlay();
    this.updateSkipIndicator(false);
    const prev = this.engine.rewindScene();
    if (prev) this.playScene(prev);
    this.updateRewindButton();
  }

  // ── Core Playback ──

  /** Check if a slug is a campaign transient (intro/connector). */
  _isCampaignTransient() {
    return this.campaignMode &&
      (this.currentSlug === 'campaign-intro' || this.currentSlug?.startsWith('campaign-connector-'));
  }

  /** Compute effect override (suppress shake/glitch when disabled). */
  _effectOverride(scene) {
    return (!this.settings.get('screenShake') && (scene.effect === 'glitch' || scene.effect === 'shake'))
      ? null : undefined;
  }

  /**
   * Render one scene: record history, apply effects, render UI, auto-save, update HUD.
   * Shared between normal play and skip-read loop.
   */
  async _renderOneScene(scene, skipMode) {
    const sceneId = this.engine.state.currentScene;
    this.textHistory.add(sceneId, scene.speaker, scene.text);

    const wasInFastMode = this.ui.fastMode;
    const skipActive = skipMode && !scene.ending;
    if (skipActive) this.ui.fastMode = true;
    if (!skipMode) this.updateSkipIndicator(skipActive);

    const effOvr = this._effectOverride(scene);
    const renderScene = effOvr !== undefined ? { ...scene, effect: effOvr } : scene;
    await this.ui.renderScene(renderScene, this.engine);

    if (this.audio.enabled) this.audio.setTheme(this.ui.lastBgClass);
    if (skipActive) this.ui.fastMode = wasInFastMode;

    if (this.currentSlug && !this._isCampaignTransient()) {
      this.saveManager.autoSave(this.currentSlug, this.engine, scene);
    }
    if (this.currentSlug) this.tracker.recordVisitedScenes(this.currentSlug, this.engine.state.visited);
    this.updateProgressHUD();
  }

  /**
   * Play a scene: render, handle skip-read chain, schedule next advance.
   * This is the central heartbeat of the game loop.
   */
  async playScene(scene) {
    if (!scene || !this.engine) return;

    const sceneId = this.engine.state.currentScene;
    const skipActive = this.shouldSkip(sceneId) && !scene.ending;
    this.updateSkipIndicator(skipActive);

    await this._renderOneScene(scene, skipActive);

    // Handle endings (ending hook wired externally)
    if (scene.ending) return;

    // Skip-read auto-advance through visited no-choice scenes (iterative)
    const choices = this.engine.getAvailableChoices();
    if (choices.length === 0 && scene.next && this.shouldSkip(sceneId)) {
      await PlaybackController.raf();
      let nextScene = this.engine.goToScene(scene.next);
      while (nextScene && !nextScene.ending && this.engine) {
        const nId = this.engine.state.currentScene;
        await this._renderOneScene(nextScene, true);
        const nc = this.engine.getAvailableChoices();
        if (nc.length > 0 || !nextScene.next || !this.shouldSkip(nId)) break;
        await PlaybackController.raf();
        nextScene = this.engine.goToScene(nextScene.next);
      }
      if (nextScene && this.engine) {
        return this.playScene(nextScene);
      }
      return;
    }

    // Normal scene — schedule next advance
    this.updateRewindButton();
    this.scheduleAutoAdvance();
  }

  /** Cache a reference to the rewind button for auto-update after playScene. */
  setRewindButton(el) { this._rewindBtnEl = el; }

  // ── Ending Helpers ──

  /** Get elapsed reading time for the current session and reset the timer. */
  getSessionElapsed() {
    const elapsed = this.storyStartTime ? Date.now() - this.storyStartTime : 0;
    if (elapsed > 0) this.storyStartTime = null; // prevent double-counting
    return elapsed;
  }

  /** Inject reading time stat into the ending stats grid (reusable element). */
  injectReadingTime(statsGrid, elapsedMs) {
    if (!elapsedMs || !statsGrid) return;
    if (!this._endingTimeBox) {
      const box = document.createElement('div');
      box.className = 'ending-stat-box';
      const valSpan = document.createElement('span');
      valSpan.className = 'ending-stat-value';
      const lblSpan = document.createElement('span');
      lblSpan.className = 'ending-stat-label';
      lblSpan.textContent = 'Reading Time';
      box.appendChild(valSpan);
      box.appendChild(lblSpan);
      this._endingTimeBox = box;
      this._endingTimeValSpan = valSpan;
    }
    this._endingTimeValSpan.textContent = `⏱ ${StoryTracker.formatDuration(elapsedMs)}`;
    statsGrid.insertBefore(this._endingTimeBox, statsGrid.firstChild);
  }

  /** Append "New Ending Discovered!" badge to ending overlay (reusable element). */
  showNewEndingBadge(endingEl) {
    if (!endingEl) return;
    if (!this._endingNewBadge) {
      this._endingNewBadge = document.createElement('div');
      this._endingNewBadge.className = 'new-ending-badge';
      this._endingNewBadge.textContent = '✨ New Ending Discovered!';
    }
    endingEl.appendChild(this._endingNewBadge);
  }

  // ── Cleanup (called on menu return) ──

  /** Hide all HUD indicators and reset state. */
  hideIndicators() {
    this._autoEl.classList.add('hidden');
    this._skipEl.classList.add('hidden');
    this._hudEl.classList.add('hidden');
    this._barEl.classList.add('hidden');
    this._lastPct = -1;
    this._lastTurns = -1;
  }

  /** Full cleanup: timers + indicators + engine ref. */
  cleanup() {
    this.clearAutoPlay();
    this.clearMiscTimers();
    this.engine = null;
    this.currentSlug = null;
    this.totalScenes = 0;
    this.storyStartTime = null;
    this.currentParsed = null;
    this.campaignMode = false;
    this.hideIndicators();
    this.updateSkipIndicator(false);
  }
}
