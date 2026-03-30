/**
 * NyanTales Visual Novel — Main Application
 *
 * Orchestrates all subsystems: engine, UI, tracker, audio, achievements,
 * gallery, settings, history, save manager, and touch gestures.
 *
 * Boot flow:
 *   1. Init YAML parser (loads js-yaml CDN)
 *   2. Instantiate all subsystems
 *   3. Preload AI portraits
 *   4. Load story index from YAML files
 *   5. Render title screen with stats, "Continue" button, story grid
 *   6. Wait for user to select a story
 *
 * Game loop (per story):
 *   startStory → playScene ↔ choices → ending → restart/menu
 */

(async function () {
  'use strict';

  // ── Init Subsystems ──

  await YAMLParser.init();

  const ui            = new VNUI();
  const tracker       = new StoryTracker();
  const audio         = new AmbientAudio();
  const achievements  = new AchievementSystem(tracker);
  const gallery       = new CharacterGallery(ui.spriteGen, ui.portraits);
  const settings      = new SettingsManager();
  const settingsPanel = new SettingsPanel(settings);
  const textHistory   = new TextHistory();
  const historyPanel  = new HistoryPanel(textHistory);
  const saveManager   = new SaveManager();
  const storyInfo     = new StoryInfoModal(tracker, saveManager, ui.portraits);
  const keyboardHelp  = new KeyboardHelp();
  const aboutPanel    = new AboutPanel();
  const campaign    = new CampaignManager();
  const campaignUI  = new CampaignUI(campaign, saveManager);
  // Wire chapter grid click → startCampaignChapter (set after startCampaignChapter is defined below)
  const statsDashboard = new StatsDashboard(tracker, achievements, saveManager, ui.portraits, campaign);
  const routeMap      = new RouteMap();
  const achPanel      = new AchievementPanel(achievements);
  const sceneSelect   = new SceneSelect((sceneId) => {
    if (!currentEngine) return;
    clearAutoPlayTimer();
    updateSkipIndicator(false);
    const scene = currentEngine.jumpToScene(sceneId);
    if (scene) playScene(scene);
    updateRewindButton();
  });

  /** Ensure audio context is initialized (safe to call repeatedly). */
  function ensureAudio() {
    if (!audio.ctx) audio.init();
  }

  // Wire story info modal callbacks
  storyInfo.onPlay = (story) => {
    ensureAudio();
    startStory(story);
  };
  storyInfo.onLoad = (slug, stateJson) => {
    const story = storySlugMap.get(slug);
    if (story) {
      ensureAudio();
      startStory(story, stateJson);
    }
  };
  storyInfo.onShare = (story) => {
    const shareUrl = ShareHelper.storyUrl(story.slug);
    const shareText = [
      `🐱 NyanTales — ${story.title}`,
      story.description || '',
      '',
      `🎮 Play this story: ${shareUrl}`
    ].filter(Boolean).join('\n');
    ShareHelper.share({
      title: `NyanTales — ${story.title}`,
      text: shareText,
      url: shareUrl,
      successMessage: 'Story link copied!',
      successIcon: '🔗',
      errorMessage: 'Failed to share story'
    });
  };

  // Pre-compute total character count (used by About panel)
  const _totalCharCount = (() => {
    const chars = new Set();
    if (typeof CHARACTER_DATA !== 'undefined') {
      for (const slug in CHARACTER_DATA) {
        for (const c of CHARACTER_DATA[slug]) chars.add(c.name);
      }
    }
    return chars.size;
  })();

  // Wire gallery story click (one-time, not per-show)
  gallery.onStorySelect = (slug) => {
    const story = storySlugMap.get(slug);
    if (story) { ensureAudio(); startStory(story); }
  };

  // Wire stats dashboard play callback (one-time, not per-show)
  statsDashboard.onPlay = (story) => { ensureAudio(); startStory(story); };

  // Migrate legacy save format to new slot system
  saveManager.migrateLegacy();

  // AI portraits preloaded in parallel with story/campaign loading during boot (see boot())

  // ── Theme & Settings ──

  const theme = new ThemeManager(settings);
  ui.typewriterSpeed = settings.get('textSpeed');
  theme.applyAll();
  // Reactivity wired after autoPlayHUD helpers are defined (see below)

  /** Toggle a panel's visibility. For panels with custom show args, pass them in showArgs. */
  function togglePanel(panel, ...showArgs) {
    panel.isVisible ? panel.hide() : panel.show(...showArgs);
    syncTouchSuspension();
  }

  // ── Story Index ──

  const STORY_SLUGS = [
    '404-not-found', 'buffer-overflow', 'cache-invalidation', 'cafe-debug',
    'deadlock', 'dns-quest', 'docker-escape', 'encoding-error',
    'floating-point', 'fork-bomb', 'garbage-collection', 'git-blame',
    'haunted-network', 'infinite-loop', 'kernel-panic', 'memory-leak',
    'merge-conflict', 'midnight-deploy', 'permission-denied',
    'pipeline-purrdition', 'race-condition', 'regex-catastrophe',
    'segfault', 'server-room-stray', 'sql-injection', 'stack-overflow',
    'the-terminal-cat', 'tls-pawshake', 'vim-escape', 'zombie-process'
  ];

  const router = new AppRouter();

  let deferredInstallPrompt = null;

  let storyIndex   = [];
  /** @type {Map<string, Object>} slug → story for O(1) lookups */
  let storySlugMap  = new Map();
  /** @type {Map<Object, number>} story object → storyIndex position for O(1) indexOf */
  let storyIdxMap   = new Map();
  let currentEngine = null;
  let _currentTotalScenes = 0; // cached Object.keys(engine.scenes).length
  let currentSlug   = null;
  let storyStartTime = null; // timestamp when current story session began
  let campaignMode  = false; // true when playing the connected campaign
  let pendingAchievementUnlocks = [];
  let suppressNextAutoAdvance = false;
  // Route change serial managed by router.serial / router.bump() / router.isCurrent()

  // ── Auto-play State ──

  let autoPlayTimer     = null;
  /** Tracked timers for achievement toasts, campaign pacing, etc. Cleared on menu return. */
  let _miscTimers       = [];

  // Reusable DOM elements for ending overlays (avoids createElement per ending)
  let _endingTimeBox      = null;
  let _endingNewBadge     = null;
  // _endingCampaignBtn managed by campaignUI

  function clearAutoPlayTimer() {
    if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
  }

  /** Schedule a tracked timeout — automatically cleared on menu return via clearMiscTimers(). */
  function trackTimeout(fn, ms) {
    const id = setTimeout(() => {
      const idx = _miscTimers.indexOf(id);
      if (idx !== -1) _miscTimers.splice(idx, 1);
      fn();
    }, ms);
    _miscTimers.push(id);
    return id;
  }

  function clearMiscTimers() {
    for (const id of _miscTimers) clearTimeout(id);
    _miscTimers.length = 0;
  }

  /**
   * Advance to the next scene if the current scene has a `next` link
   * and no choices / no ending. Returns true if advanced.
   */
  function advanceScene() {
    if (!currentEngine) return false;
    const scene = currentEngine.getCurrentScene();
    if (scene && scene.next && currentEngine.getAvailableChoices().length === 0 && !scene.ending) {
      clearAutoPlayTimer();
      const next = currentEngine.goToScene(scene.next);
      playScene(next);
      return true;
    }
    return false;
  }

  /** Check if any overlay panel is currently visible */
  function isAnyPanelOpen() {
    return settingsPanel.isVisible || historyPanel.isVisible || saveManager.isVisible
      || sceneSelect.isVisible || routeMap.isVisible || keyboardHelp.isVisible
      || aboutPanel.isVisible || statsDashboard.isVisible || storyInfo.isVisible
      || achPanel.isVisible || gallery.isVisible;
  }

  /**
   * Sync touch gesture suspension with panel state.
   * Called after any panel show/hide to prevent swipe gestures
   * from triggering behind open overlays.
   */
  function syncTouchSuspension() {
    touch.suspend(isAnyPanelOpen());
  }

  function scheduleAutoAdvance() {
    clearAutoPlayTimer();
    if (!settings.get('autoPlay') || !currentEngine) return;

    // Pause auto-play while any panel/overlay is open
    if (isAnyPanelOpen()) return;

    const scene = currentEngine.getCurrentScene();
    if (!scene || scene.ending) return;
    if (currentEngine.getAvailableChoices().length > 0) return;
    if (suppressNextAutoAdvance) {
      suppressNextAutoAdvance = false;
      return;
    }

    autoPlayTimer = setTimeout(() => {
      if (!currentEngine || isAnyPanelOpen()) return;
      advanceScene();
    }, settings.get('autoPlayDelay'));
  }

  function updateAutoPlayHUD(on) {
    btnAutoEl.classList.toggle('hud-inactive', !on);
    btnAutoEl.title = on ? 'Auto-Play ON (A)' : 'Auto-Play OFF (A)';
    btnAutoEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    autoPlayIndicator.classList.toggle('hidden', !on);
  }

  // Wire theme settings reactivity (needs updateAutoPlayHUD + clearAutoPlayTimer defined above)
  theme.wireReactivity({ ui, audio, updateAutoPlayHUD, clearAutoPlayTimer });

  // ── Cached DOM refs ──

  const vnContainer    = document.querySelector('.vn-container');
  const btnAutoEl      = document.getElementById('btn-auto');
  const btnInstallEl   = document.getElementById('btn-install');
  const statsEl        = document.getElementById('title-stats');
  const textboxEl      = document.getElementById('vn-textbox');
  // chapterGridEl, sectionDivider, campaignBtnEl now managed by CampaignUI

  // ── Pre-created overlay indicators ──
  // Built once at init, toggled via .hidden class. Avoids createElement in hot paths.

  const autoPlayIndicator = (() => {
    const el = document.createElement('div');
    el.className = 'auto-play-indicator hidden';
    const dot = document.createElement('div');
    dot.className = 'auto-play-dot';
    el.appendChild(dot);
    el.appendChild(document.createTextNode(' AUTO'));
    vnContainer.appendChild(el);
    return el;
  })();

  const skipIndicator = (() => {
    const el = document.createElement('div');
    el.className = 'skip-indicator hidden';
    el.textContent = '⏭ SKIP';
    vnContainer.appendChild(el);
    return el;
  })();

  const progressHUD = (() => {
    const el = document.createElement('div');
    el.className = 'progress-hud hidden';
    el.setAttribute('aria-live', 'off');
    // Pre-build child spans so we can update textContent instead of innerHTML
    const visitedSpan = document.createElement('span');
    const turnSpan = document.createElement('span');
    el.appendChild(visitedSpan);
    el.appendChild(turnSpan);
    el._visitedSpan = visitedSpan;
    el._turnSpan = turnSpan;
    vnContainer.appendChild(el);
    return el;
  })();

  const progressBar = (() => {
    const el = document.createElement('div');
    el.className = 'story-progress-bar hidden';
    vnContainer.appendChild(el);
    return el;
  })();

  // Throttle progress HUD updates: only re-render if values actually changed
  let _lastProgressPct = -1;
  let _lastProgressTurns = -1;

  function updateProgressHUD() {
    if (!currentEngine) return;

    const totalScenes = _currentTotalScenes;
    const visited = currentEngine.state.visited.size;
    const pct = totalScenes > 0 ? Math.round((visited / totalScenes) * 100) : 0;
    const turns = currentEngine.state.turns;

    // Skip DOM writes if nothing changed (avoids layout thrash during skip mode)
    if (pct === _lastProgressPct && turns === _lastProgressTurns) {
      progressHUD.classList.remove('hidden');
      progressBar.classList.remove('hidden');
      return;
    }
    _lastProgressPct = pct;
    _lastProgressTurns = turns;

    progressHUD._visitedSpan.textContent = `📍 ${visited}/${totalScenes}`;
    progressHUD._turnSpan.textContent = ` · Turn ${turns}`;
    progressHUD.title = `${pct}% explored · Turn ${turns}`;
    progressHUD.classList.remove('hidden');

    // Update thin top progress bar via CSS custom property
    progressBar.style.setProperty('--bar-pct', `${pct}%`);
    progressBar.classList.remove('hidden');
  }

  // ── Skip-Read Logic ──

  function shouldSkipScene(sceneId) {
    return settings.get('skipRead') && currentEngine && currentEngine.state.visited.has(sceneId);
  }

  function updateSkipIndicator(active) {
    skipIndicator.classList.toggle('hidden', !active);
    if (active) {
      autoPlayIndicator.classList.add('hidden');
    } else if (settings.get('autoPlay')) {
      autoPlayIndicator.classList.remove('hidden');
    }
  }

  // ── Load Stories ──

  /**
   * Load the story index — tries a pre-built manifest first (production),
   * falls back to fetching all 30 YAML files (dev).
   * Manifest mode: 8KB JSON vs 1.6MB of YAML, zero js-yaml parsing on boot.
   */
  async function loadStoryIndex() {
    const base = router.storyBasePath();

    // Try manifest first (generated at build time, ~8KB vs ~1.6MB of YAML)
    try {
      // Replace trailing 'stories' segment with 'story-manifest.json'
      const manifestUrl = base.replace(/stories$/, 'story-manifest.json');
      const resp = await fetch(manifestUrl);
      if (resp.ok) {
        const manifest = await resp.json();
        if (Array.isArray(manifest) && manifest.length > 0) {
          storyIndex = [];
          storySlugMap = new Map();
          storyIdxMap = new Map();
          for (let i = 0; i < manifest.length; i++) {
            const m = manifest[i];
            const entry = {
              slug: m.slug,
              title: m.title || m.slug,
              description: m.description || '',
              _parsed: null, // lazy-loaded on play
              _meta: { sceneCount: m.sceneCount, wordCount: m.wordCount, totalEndings: m.totalEndings, readMins: m.readMins }
            };
            storyIndex.push(entry);
            storySlugMap.set(m.slug, entry);
            storyIdxMap.set(entry, i);
          }
          return storyIndex;
        }
      }
    } catch (_) { /* manifest not available, fall through to YAML loading */ }

    // Fallback: fetch and parse all YAML files (dev mode)
    const results = await Promise.allSettled(
      STORY_SLUGS.map(async slug => {
        try {
          const resp = await fetch(`${base}/${slug}/story.yaml`);
          if (!resp.ok) return null;
          const text = await resp.text();
          const parsed = YAMLParser.parse(text);
          if (!parsed || !parsed.scenes) {
            console.warn(`[NyanTales] Invalid story data: ${slug}`);
            return null;
          }
          return { slug, title: parsed.title || slug, description: parsed.description || '', _parsed: parsed, _meta: null };
        } catch (err) {
          console.warn(`[NyanTales] Failed to load story: ${slug}`, err);
          return null;
        }
      })
    );
    storyIndex = [];
    storySlugMap = new Map();
    storyIdxMap = new Map();
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const entry = r.value;
        storyIdxMap.set(entry, storyIndex.length);
        storyIndex.push(entry);
        storySlugMap.set(entry.slug, entry);
      }
    }
    return storyIndex;
  }

  /**
   * Lazy-load and parse a story's full YAML data. Returns the parsed object.
   * Caches the result on story._parsed for subsequent plays.
   * @param {Object} story — story index entry
   * @returns {Promise<Object|null>} parsed YAML data (scenes, title, start, etc.)
   */
  async function loadFullStory(story) {
    if (story._parsed) return story._parsed;
    const base = router.storyBasePath();
    try {
      const resp = await fetch(`${base}/${story.slug}/story.yaml`);
      if (!resp.ok) return null;
      const text = await resp.text();
      const parsed = YAMLParser.parse(text);
      if (!parsed || !parsed.scenes) return null;
      story._parsed = parsed;
      // Backfill _meta if it wasn't from the manifest
      if (!story._meta) {
        let sc = 0, wc = 0, te = 0;
        for (const id in parsed.scenes) {
          sc++;
          const sc_ = parsed.scenes[id];
          if (sc_.text) wc += sc_.text.split(/\s+/).length;
          if (sc_.is_ending || sc_.ending) te++;
        }
        story._meta = { sceneCount: sc, wordCount: wc, totalEndings: te, readMins: Math.max(1, Math.ceil(wc / 200)) };
      }
      return parsed;
    } catch (err) {
      console.warn(`[NyanTales] Failed to lazy-load story: ${story.slug}`, err);
      return null;
    }
  }

  // ── Core Scene Playback ──

  /** Check if a slug is a campaign transient (intro/connector) that shouldn't be auto-saved. */
  function _isCampaignTransient(slug) {
    return campaignMode && (slug === 'campaign-intro' || slug?.startsWith('campaign-connector-'));
  }

  /** Compute effect override for a scene (suppress shake/glitch when disabled). */
  function _effectOverride(scene) {
    return (!settings.get('screenShake') && (scene.effect === 'glitch' || scene.effect === 'shake'))
      ? null : undefined;
  }

  /**
   * Render one scene: record history, apply effects, render UI, auto-save, update HUD.
   * Shared between normal play and skip-read loop to eliminate duplication.
   * @param {Object} scene — current scene data
   * @param {boolean} skipMode — true if this is part of skip-read fast-forward
   */
  async function _renderOneScene(scene, skipMode) {
    const sceneId = currentEngine.state.currentScene;
    textHistory.add(sceneId, scene.speaker, scene.text);

    const wasInFastMode = ui.fastMode;
    const skipActive = skipMode && !scene.ending;
    if (skipActive) ui.fastMode = true;
    if (!skipMode) updateSkipIndicator(skipActive);

    const effOvr = _effectOverride(scene);
    const renderScene = effOvr !== undefined ? { ...scene, effect: effOvr } : scene;
    await ui.renderScene(renderScene, currentEngine);

    if (audio.enabled) audio.setTheme(ui._lastBgClass);
    if (skipActive) ui.fastMode = wasInFastMode;

    if (currentSlug && !_isCampaignTransient(currentSlug)) {
      saveManager.autoSave(currentSlug, currentEngine, scene);
    }
    if (currentSlug) tracker.recordVisitedScenes(currentSlug, currentEngine.state.visited);
    updateProgressHUD();
  }

  /**
   * Play a scene: record history, apply skip/fast mode, render, auto-save, schedule next.
   * This is the central heartbeat of the game loop.
   */
  async function playScene(scene) {
    if (!scene || !currentEngine) return;

    const sceneId = currentEngine.state.currentScene;
    const skipActive = shouldSkipScene(sceneId) && !scene.ending;
    updateSkipIndicator(skipActive);

    await _renderOneScene(scene, skipActive);

    // Handle endings
    if (scene.ending) return;

    // Skip-read auto-advance through visited no-choice scenes (iterative to avoid stack overflow)
    const choices = currentEngine.getAvailableChoices();
    if (choices.length === 0 && scene.next && shouldSkipScene(sceneId)) {
      await new Promise(r => setTimeout(r, 50));
      let nextScene = currentEngine.goToScene(scene.next);
      while (nextScene && !nextScene.ending && currentEngine) {
        const nId = currentEngine.state.currentScene;
        await _renderOneScene(nextScene, true);
        const nc = currentEngine.getAvailableChoices();
        if (nc.length > 0 || !nextScene.next || !shouldSkipScene(nId)) break;
        await new Promise(r => setTimeout(r, 50));
        nextScene = currentEngine.goToScene(nextScene.next);
      }
      if (nextScene && currentEngine) {
        return playScene(nextScene);
      }
      return;
    }

    updateRewindButton();
    scheduleAutoAdvance();
  }

  // ── Start / Restart Story ──

  // ── Engine Callbacks (wired once, reference currentEngine dynamically) ──

  // Campaign ending callback — wired once on ui, invoked via ending delegation (data-action="campaign-next")
  ui._onCampaignEnding = () => onCampaignEnding();

  /** @type {Object|null} The most recently parsed story data (for restart). */
  let _currentParsed = null;

  ui.onChoice(choice => {
    if (!currentEngine) return;
    clearAutoPlayTimer();
    const nextScene = currentEngine.goToScene(choice.goto, choice);
    playScene(nextScene);
  });

  ui._onEndingHook = (scene, engine) => {
    clearAutoPlayTimer();
    updateSkipIndicator(false);

    // Record reading time to tracker for persistent stats
    const sessionElapsed = storyStartTime ? Date.now() - storyStartTime : 0;
    if (currentSlug && sessionElapsed > 0) {
      tracker.recordReadingTime(currentSlug, sessionElapsed);
      storyStartTime = null; // prevent double-counting on menu return
    }

    // Inject reading time into ending stats grid (reusable element)
    if (sessionElapsed > 0) {
      const timeStr = StoryTracker.formatDuration(sessionElapsed);
      const statsGrid = ui._endingRefs.statsGrid;
      if (statsGrid) {
        if (!_endingTimeBox) {
          _endingTimeBox = document.createElement('div');
          _endingTimeBox.className = 'ending-stat-box';
          const valSpan = document.createElement('span');
          valSpan.className = 'ending-stat-value';
          const lblSpan = document.createElement('span');
          lblSpan.className = 'ending-stat-label';
          lblSpan.textContent = 'Reading Time';
          _endingTimeBox.appendChild(valSpan);
          _endingTimeBox.appendChild(lblSpan);
          _endingTimeBox._valSpan = valSpan;
        }
        _endingTimeBox._valSpan.textContent = `⏱ ${timeStr}`;
        statsGrid.insertBefore(_endingTimeBox, statsGrid.firstChild);
      }
    }

    const result = tracker.recordEnding(currentSlug, scene.ending, engine.state.turns);

    if (result.isNewEnding && ui.endingEl) {
      if (!_endingNewBadge) {
        _endingNewBadge = document.createElement('div');
        _endingNewBadge.className = 'new-ending-badge';
        _endingNewBadge.textContent = '✨ New Ending Discovered!';
      }
      ui.endingEl.appendChild(_endingNewBadge);
    }

    const newAch = achievements.checkAll();
    if (newAch.length > 0) {
      if (campaignMode) {
        pendingAchievementUnlocks.push(...newAch);
      } else {
        trackTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }
    }

    // In campaign mode, add a "Next Chapter" button to the ending overlay
    if (campaignMode && ui.endingEl) {
      const nextBtn = campaignUI.getEndingButton(campaign.isComplete());
      const actionsRow = ui._endingRefs.actionsRow;
      actionsRow.insertBefore(nextBtn, actionsRow.firstChild);
      requestAnimationFrame(() => nextBtn.focus());
    }
  };

  ui.onRestart(() => {
    if (!_currentParsed) return;
    initEngine(_currentParsed);
    if (campaignMode && currentEngine) campaign.applyPersistentState(currentEngine);
    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    playScene(currentEngine.getCurrentScene());
  });

  ui.onMenu(() => {
    if (campaignMode) campaignMode = false;
    returnToMenu();
  });

  function initEngine(parsed) {
    _currentParsed = parsed;
    currentEngine = new StoryEngine(parsed);
    // Count scenes without Object.keys allocation
    let _sc = 0; for (const _ in parsed.scenes) _sc++;
    _currentTotalScenes = _sc;
    ui._totalScenes = _currentTotalScenes; // share with UI to avoid re-computing in _showEnding
    textHistory.clear();
    ui.typewriterSpeed = settings.get('textSpeed');
  }

  async function startStory(story, savedState, options = {}) {
    const {
      historyMode = 'push',
      syncRoute = true,
      showIntro = !savedState
    } = options;

    const navId = router.bump();

    currentSlug = story.slug;
    storyStartTime = Date.now();
    document.title = `${story.title} — NyanTales`;
    ui.setStorySlug(story.slug);
    if (story.slug && syncRoute) router.syncStoryUrl(story.slug, historyMode);

    // Lazy-load full YAML if not yet parsed (manifest-boot mode)
    if (!story._parsed) {
      const parsed = await loadFullStory(story);
      if (!parsed) {
        Toast.show(`Failed to load story: ${story.title}`, { icon: '⚠️', duration: 3000 });
        returnToMenu();
        return;
      }
      if (!router.isCurrent(navId)) return; // Route changed during load
    }

    initEngine(story._parsed);

    // If loading a saved state, restore it
    if (savedState) {
      try { currentEngine.loadState(savedState); } catch (e) { console.warn('Failed to load save:', e); }
    }

    // Show story intro splash (skip for loaded saves / history-driven route changes)
    if (showIntro) {
      await StoryIntro.show(story, ui.portraits);
      if (!router.isCurrent(navId)) return;
      suppressNextAutoAdvance = true;
    }

    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    showKeyboardHints();

    const firstScene = currentEngine.getCurrentScene();
    await playScene(firstScene);
    if (!router.isCurrent(navId)) return;

    // Check achievements on story start
    const startAch = achievements.checkAll();
    if (startAch.length > 0) {
      if (campaignMode) {
        pendingAchievementUnlocks.push(...startAch);
      } else {
        trackTimeout(() => achievements.showNewUnlocks(startAch), 1500);
      }
    }
  }

  function returnToMenu(options = {}) {
    const { syncRoute = true, historyMode = 'replace' } = options;
    router.bump();
    // Record reading time before clearing state
    if (currentSlug && storyStartTime) {
      tracker.recordReadingTime(currentSlug, Date.now() - storyStartTime);
    }

    clearAutoPlayTimer();
    clearMiscTimers();
    achievements.cancelPendingToasts();
    currentEngine = null;
    currentSlug = null;
    storyStartTime = null;
    _lastProgressPct = -1;
    _lastProgressTurns = -1;
    document.title = router.APP_TITLE;
    ui.setStorySlug(null);
    if (syncRoute) router.syncStoryUrl(null, historyMode);
    audio.stop();
    textHistory.clear();
    updateSkipIndicator(false);
    if (sceneSelect.isVisible) sceneSelect.hide();
    autoPlayIndicator.classList.add('hidden');
    progressHUD.classList.add('hidden');
    progressBar.classList.add('hidden');
    ui.showTitleScreen();
    renderTitleScreen();

    // Scroll title screen back to top
    if (titleBg) titleBg.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Title Screen Rendering ──

  // ── Story Grid Event Delegation ──
  // Single listener handles info/fav clicks for all 30 cards (replaces 60+ per-card listeners)

  const storyGrid = document.getElementById('story-list');
  /** Resolve a story from a card element via data-slug */
  function storyFromCard(card) {
    const slug = card?.dataset.slug;
    return slug ? storySlugMap.get(slug) : null;
  }

  /** Start a story from a card click (shared by click + keydown delegation) */
  function selectStoryCard(card) {
    if (card.dataset.locked === '1') {
      Toast.show('🔒 Progress through the campaign to unlock this story', { icon: '🐱', duration: 2500 });
      return;
    }
    const story = storyFromCard(card);
    if (!story) return;
    ensureAudio();
    startStory(story);
  }

  if (storyGrid) storyGrid.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.story-card-info-btn');
    if (infoBtn) {
      e.stopPropagation();
      const card = infoBtn.closest('.story-card');
      const story = storyFromCard(card);
      if (story) storyInfo.show(story, CHARACTER_DATA[story.slug] || [], getStoryMeta(story));
      return;
    }

    const favBtn = e.target.closest('.story-card-fav-btn');
    if (favBtn) {
      e.stopPropagation();
      const card = favBtn.closest('.story-card');
      const story = storyFromCard(card);
      if (!story) return;
      const nowFav = tracker.toggleFavorite(story.slug);
      favBtn.textContent = nowFav ? '❤️' : '🤍';
      favBtn.title = nowFav ? 'Remove from favorites' : 'Add to favorites';
      favBtn.setAttribute('aria-pressed', nowFav ? 'true' : 'false');
      favBtn.setAttribute('aria-label', nowFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
      card.dataset.favorite = nowFav ? '1' : '0';
      Toast.show(nowFav ? 'Added to favorites' : 'Removed from favorites', { icon: nowFav ? '❤️' : '💔', duration: 1500 });
      return;
    }

    // Card click — start story (only if the card itself was clicked, not a child button)
    const card = e.target.closest('.story-card');
    if (card) selectStoryCard(card);
  });

  if (storyGrid) storyGrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.story-card');
    if (!card) return;
    e.preventDefault();
    selectStoryCard(card);
  });

  /**
   * Compute reading-time estimate and scene count for a story (cached per slug).
   * @param {Object} story - Story index entry with _parsed data
   * @returns {{ sceneCount: number, readMins: number, wordCount: number }}
   */
  const _storyMetaCache = new Map();
  function getStoryMeta(story) {
    const cached = _storyMetaCache.get(story.slug);
    if (cached) return cached;

    // Use pre-computed manifest meta if available (avoids needing _parsed)
    if (story._meta) {
      _storyMetaCache.set(story.slug, story._meta);
      return story._meta;
    }

    const scenes = story._parsed?.scenes;
    let sceneCount = 0, wordCount = 0, totalEndings = 0;
    if (scenes) {
      for (const id in scenes) {
        sceneCount++;
        const s = scenes[id];
        if (s.text) wordCount += s.text.split(/\s+/).length;
        if (s.is_ending || s.ending) totalEndings++;
      }
    }
    const readMins = Math.max(1, Math.ceil(wordCount / 200));
    const meta = { sceneCount, readMins, wordCount, totalEndings };
    _storyMetaCache.set(story.slug, meta);
    return meta;
  }

  /**
   * Decorate a freshly-created story card with badges, progress, meta, and buttons.
   * Separated from renderTitleScreen for clarity — called once per card.
   * @param {HTMLElement} card - The story card DOM element
   * @param {Object} story - Story index entry
   */
  function decorateStoryCard(card, story) {
    const locked = !campaignUI.isStoryUnlocked(story.slug);
    if (locked) {
      card.classList.add('story-locked');
      card.setAttribute('tabindex', '-1');
      card.setAttribute('aria-label', `${story.title}: Locked — progress through the campaign to unlock`);
      // Replace card content with locked placeholder — use cached inner refs (no querySelector)
      const ir = card._innerRefs;
      if (ir) {
        if (ir.h3) ir.h3.textContent = '🔒 ' + story.title;
        if (ir.p) ir.p.textContent = 'Progress through the campaign to unlock';
        if (ir.spriteEl) ir.spriteEl.classList.add('locked-sprite');
      }
      card.dataset.slug = story.slug;
      card.dataset.locked = '1';
      return; // Don't add badges/progress/buttons for locked stories
    }

    card.dataset.locked = '0';
    const completed = tracker.isCompleted(story.slug);
    const endings = tracker.endingCount(story.slug);
    const { sceneCount, readMins } = getStoryMeta(story);

    // Ref object for caching child elements (used by _refreshStoryCards and _resetCardForRedecorate)
    const refs = { badge: null, saveIcon: null, barFill: null, barEl: null, favBtn: null, infoBtn: null, metaEl: null };

    // Completion badge
    const badge = document.createElement('div');
    badge.className = 'story-card-badge';
    if (completed) {
      card.classList.add('completed');
      badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
    } else {
      badge.classList.add('hidden');
    }
    card.appendChild(badge);
    refs.badge = badge;

    // Save indicator (always created, hidden when no save)
    const saveIcon = document.createElement('div');
    saveIcon.textContent = '💾';
    if (saveManager.hasSave(story.slug)) {
      saveIcon.className = completed
        ? 'story-card-badge story-card-save-badge save-badge-bottom'
        : 'story-card-badge story-card-save-badge';
    } else {
      saveIcon.className = 'story-card-badge story-card-save-badge hidden';
    }
    card.appendChild(saveIcon);
    refs.saveIcon = saveIcon;

    // Progress bar (always created for consistent ref caching)
    const bar = document.createElement('div');
    bar.className = 'story-card-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const barFill = document.createElement('div');
    barFill.className = 'story-card-progress-fill';
    if (sceneCount > 0) {
      const pct = tracker.getProgress(story.slug, sceneCount);
      barFill.style.setProperty('--bar-pct', `${pct}%`);
      bar.setAttribute('aria-valuenow', pct);
      bar.setAttribute('aria-label', `${pct}% explored`);
    } else {
      barFill.style.setProperty('--bar-pct', '0%');
      bar.setAttribute('aria-valuenow', 0);
      bar.setAttribute('aria-label', '0% explored');
    }
    bar.appendChild(barFill);
    card.appendChild(bar);
    refs.barFill = barFill;
    refs.barEl = bar;

    // Meta info (reading time + scene count) — use cached textDiv ref
    if (sceneCount > 0 || readMins > 0) {
      const metaEl = document.createElement('div');
      metaEl.className = 'story-card-meta';
      const timeSpan = document.createElement('span');
      timeSpan.textContent = `⏱ ~${readMins} min`;
      const sceneSpan = document.createElement('span');
      sceneSpan.textContent = `📄 ${sceneCount} scenes`;
      metaEl.appendChild(timeSpan);
      metaEl.appendChild(sceneSpan);
      const textContainer = card._innerRefs?.textDiv;
      if (textContainer) textContainer.appendChild(metaEl);
      refs.metaEl = metaEl;
    }

    // Info button (ℹ) — click handled by grid delegation
    const infoBtn = document.createElement('button');
    infoBtn.className = 'story-card-info-btn';
    infoBtn.textContent = 'ℹ';
    infoBtn.title = 'Story details';
    infoBtn.setAttribute('aria-label', `Details for ${story.title}`);
    card.appendChild(infoBtn);
    refs.infoBtn = infoBtn;

    // Favorite button (heart) — click handled by grid delegation
    const isFav = tracker.isFavorite(story.slug);
    const favBtn = document.createElement('button');
    favBtn.className = 'story-card-fav-btn';
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    favBtn.setAttribute('aria-label', isFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
    favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    card.appendChild(favBtn);
    refs.favBtn = favBtn;

    // Cache refs for this card index
    const cardIdx = storyIdxMap.get(story);
    if (cardIdx !== undefined) _storyCardRefs.set(cardIdx, refs);

    // Data attributes for filtering/sorting
    card.dataset.slug = story.slug;
    card.dataset.title = story.title.toLowerCase();
    card.dataset.desc = (story.description || '').toLowerCase();
    card.dataset.search = buildStorySearchBlob(story);
    card.dataset.completed = completed ? '1' : '0';
    card.dataset.favorite = isFav ? '1' : '0';
    card.dataset.readMins = readMins;
    card.dataset.progress = sceneCount > 0 ? tracker.getProgress(story.slug, sceneCount) : 0;
    card.dataset.lastPlayed = tracker.getStory(story.slug).lastPlayed || 0;
  }

  /** Whether the story grid has been built at least once (for partial refresh). */
  let _gridBuilt = false;
  // _chapterGridBuilt managed by CampaignUI

  /**
   * Cached story card child refs to avoid querySelector per card on every refresh.
   * Maps card index → { badge, saveIcon, barFill, barEl, favBtn }.
   * Built lazily on first _refreshStoryCards() call.
   * @type {Map<number, Object>}
   */
  const _storyCardRefs = new Map();

  /**
   * Render (or re-render) the title screen.
   * First call: builds the full story grid from scratch.
   * Subsequent calls: partial refresh — only updates stats, badges, progress, and
   * dynamic card state without destroying/rebuilding 30 DOM cards.
   * Safe to call multiple times.
   */
  // Pre-built stats bar elements (avoid innerHTML on every menu return)
  let _statsBuilt = false;
  const _statRefs = {};

  function _ensureStatsBar() {
    if (_statsBuilt) return;
    statsEl.textContent = '';
    const defs = [
      { key: 'complete', icon: '📖', suffix: () => `/${storyIndex.length} complete` },
      { key: 'endings', icon: '🔮', suffix: () => ' endings found' },
      { key: 'plays', icon: '🎮', suffix: () => ' plays' },
      { key: 'achievements', icon: '🏆', suffix: () => '' },
      { key: 'readTime', icon: '⏱', suffix: () => ' reading' }
    ];
    for (const d of defs) {
      const div = document.createElement('div');
      div.className = 'stat';
      const valSpan = document.createElement('span');
      valSpan.className = 'stat-value';
      div.appendChild(document.createTextNode(d.icon + ' '));
      div.appendChild(valSpan);
      const suffixNode = document.createTextNode('');
      div.appendChild(suffixNode);
      _statRefs[d.key] = { el: div, valSpan, suffixNode, suffixFn: d.suffix };
      statsEl.appendChild(div);
    }
    _statsBuilt = true;
  }

  function _updateStatsBar(stats, achStats, totalTime) {
    _statRefs.complete.valSpan.textContent = stats.storiesCompleted;
    _statRefs.complete.suffixNode.textContent = _statRefs.complete.suffixFn();
    _statRefs.endings.valSpan.textContent = stats.totalEndings;
    _statRefs.endings.suffixNode.textContent = _statRefs.endings.suffixFn();
    _statRefs.plays.valSpan.textContent = stats.totalPlays;
    _statRefs.plays.suffixNode.textContent = _statRefs.plays.suffixFn();
    _statRefs.achievements.valSpan.textContent = `${achStats.unlocked}/${achStats.total}`;
    const hasReadTime = tracker.getTotalReadingMs() > 0;
    _statRefs.readTime.el.classList.toggle('hidden', !hasReadTime);
    if (hasReadTime) {
      _statRefs.readTime.valSpan.textContent = totalTime;
      _statRefs.readTime.suffixNode.textContent = _statRefs.readTime.suffixFn();
    }
  }

  function renderTitleScreen() {
    const stats = tracker.getStats();
    const achStats = achievements.getStats();
    const totalTime = StoryTracker.formatDuration(tracker.getTotalReadingMs());
    _ensureStatsBar();
    _updateStatsBar(stats, achStats, totalTime);

    // Campaign section
    campaignUI.updateButton();
    campaignUI.renderGrid();

    if (!_gridBuilt) {
      // First render: build full story grid from scratch
      _storyCardRefs.clear();
      ui.renderStoryList(storyIndex);
      const cards = titleBrowser.refreshCards();
      for (let idx = 0; idx < storyIndex.length; idx++) {
        const card = cards[idx];
        if (card) decorateStoryCard(card, storyIndex[idx]);
      }
      _gridBuilt = true;
    } else {
      // Subsequent renders: update dynamic card state without rebuilding DOM
      _refreshStoryCards();
    }

    // "Continue" button — shows if there's a recent save
    updateContinueButton();

    titleBrowser.apply();
  }

  /**
   * Partial refresh of story cards: updates badges, progress bars, favorites,
   * and data attributes without destroying/recreating DOM elements.
   * Avoids the cost of rebuilding 30 cards + re-attaching sprites on every menu return.
   */
  function _refreshStoryCards() {
    const cards = titleBrowser.refreshCards();
    for (let idx = 0; idx < storyIndex.length; idx++) {
      const story = storyIndex[idx];
      const card = cards[idx];
      if (!card) continue;

      const locked = !campaignUI.isStoryUnlocked(story.slug);
      const wasLocked = card.dataset.locked === '1';

      // If lock state changed, we need a full card rebuild for this card
      if (locked !== wasLocked) {
        // Re-render this single card via full decoration (rare: only on campaign advance)
        _storyCardRefs.delete(idx);
        _resetCardForRedecorate(card, story);
        decorateStoryCard(card, story);
        continue;
      }

      if (locked) continue; // Locked cards don't need dynamic updates

      const completed = tracker.isCompleted(story.slug);
      const endings = tracker.endingCount(story.slug);
      const { sceneCount } = getStoryMeta(story);
      const isFav = tracker.isFavorite(story.slug);
      const hasSave = saveManager.hasSave(story.slug);
      const pct = sceneCount > 0 ? tracker.getProgress(story.slug, sceneCount) : 0;

      // Use cached refs (built in decorateStoryCard) — avoids 5+ querySelector per card
      const refs = _storyCardRefs.get(idx);

      // Update completion badge
      card.classList.toggle('completed', completed);
      if (refs?.badge) {
        if (completed) {
          refs.badge.classList.remove('hidden');
          refs.badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
        } else {
          refs.badge.classList.add('hidden');
        }
      }

      // Update save indicator
      if (refs?.saveIcon) {
        if (hasSave) {
          refs.saveIcon.classList.remove('hidden');
          refs.saveIcon.classList.toggle('save-badge-bottom', completed);
        } else {
          refs.saveIcon.classList.add('hidden');
        }
      }

      // Update progress bar
      if (refs?.barFill) {
        refs.barFill.style.setProperty('--bar-pct', `${pct}%`);
        if (refs.barEl) refs.barEl.setAttribute('aria-valuenow', pct);
      }

      // Update favorite button
      if (refs?.favBtn) {
        refs.favBtn.textContent = isFav ? '❤️' : '🤍';
        refs.favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        refs.favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      }

      // Update data attributes for filtering/sorting
      card.dataset.completed = completed ? '1' : '0';
      card.dataset.favorite = isFav ? '1' : '0';
      card.dataset.progress = pct;
      card.dataset.lastPlayed = tracker.getStory(story.slug).lastPlayed || 0;
    }
  }

  /**
   * Strip dynamic decorations from a card so it can be re-decorated from scratch.
   * Used when lock state changes (rare: campaign advance).
   */
  function _resetCardForRedecorate(card, story) {
    // Remove dynamic children using cached refs (zero querySelector)
    const refs = _storyCardRefs.get(storyIdxMap.get(story));
    if (refs) {
      if (refs.badge) refs.badge.remove();
      if (refs.saveIcon) refs.saveIcon.remove();
      if (refs.barEl) refs.barEl.remove();
      if (refs.favBtn) refs.favBtn.remove();
      if (refs.infoBtn) refs.infoBtn.remove();
      if (refs.metaEl) refs.metaEl.remove();
    }
    card.classList.remove('completed', 'story-locked');
    card.removeAttribute('data-locked');

    // Restore original title/description text using cached inner refs (no querySelector)
    const ir = card._innerRefs;
    if (ir) {
      if (ir.h3) ir.h3.textContent = story.title;
      if (ir.p) ir.p.textContent = story.description || '';
      if (ir.spriteEl) ir.spriteEl.classList.remove('locked-sprite');
    }
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${story.title}: ${story.description || 'Interactive story'}`);
  }

  // ── Continue Button ──

  const btnContinueEl = document.getElementById('btn-continue');
  // Pre-build continue button children so we can update textContent instead of innerHTML
  let _continueMeta = null;
  if (btnContinueEl) {
    btnContinueEl.textContent = '';
    btnContinueEl.appendChild(document.createTextNode('▶ Continue'));
    _continueMeta = document.createElement('span');
    _continueMeta.className = 'continue-meta';
    btnContinueEl.appendChild(_continueMeta);
  }

  function updateContinueButton() {
    const btn = btnContinueEl;
    let recent = saveManager.getMostRecentSave();

    // Skip campaign transient saves — they shouldn't drive the Continue button
    if (recent && (recent.slug === 'campaign-intro' || recent.slug?.startsWith('campaign-connector-'))) {
      recent = null;
    }

    if (recent && btn) {
      const story = storySlugMap.get(recent.slug);
      const title = story ? story.title : recent.slug;
      _continueMeta.textContent = `${title} · ${recent.turns} turns`;
      btn.classList.remove('hidden');
    } else if (btn) {
      btn.classList.add('hidden');
    }
  }

  function updateInstallButton() {
    if (!btnInstallEl) return;

    const showButton = !router.isStandaloneMode() && (Boolean(deferredInstallPrompt) || router.isIOSInstallable());
    btnInstallEl.classList.toggle('hidden', !showButton);

    if (!showButton) return;

    if (deferredInstallPrompt) {
      btnInstallEl.textContent = '📲 Install App';
      btnInstallEl.title = 'Install NyanTales for offline play';
      btnInstallEl.setAttribute('aria-label', 'Install NyanTales as an app');
    } else {
      btnInstallEl.textContent = '📲 Install';
      btnInstallEl.title = 'Show iPhone/iPad install instructions';
      btnInstallEl.setAttribute('aria-label', 'Show install instructions for iPhone or iPad');
    }
  }

  async function handleInstallAction() {
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      updateInstallButton();

      try {
        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result?.outcome === 'accepted') {
          Toast.show('NyanTales is installing… offline cat adventures unlocked.', { icon: '📲', duration: 3500 });
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
        Toast.show('Could not open the install prompt right now.', { icon: '⚠️', duration: 3000 });
      }
      return;
    }

    if (router.isIOSInstallable()) {
      Toast.show('On iPhone/iPad: tap Share, then choose “Add to Home Screen”.', { icon: '📲', duration: 5000 });
      return;
    }

    Toast.show('Install is not available in this browser right now.', { icon: 'ℹ️', duration: 3000 });
  }

  // btn-continue click is handled by title-actions event delegation above

  // ── Search, Filter & Sort (delegated to TitleBrowser) ──

  const titleBg = document.querySelector('.title-bg');

  const titleBrowser = new TitleBrowser(storyGrid, {
    filterInput:        document.getElementById('filter-input'),
    filterTagsContainer: document.querySelector('.filter-tags'),
    sortSelect:         document.getElementById('sort-select'),
    filterClearBtn:     document.getElementById('filter-clear'),
    storyFilter:        document.getElementById('story-filter'),
    titleBg
  });

  function buildStorySearchBlob(story) {
    const chars = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA[story.slug]) || [];
    const parts = [story.slug, story.title, story.description || ''];
    for (const char of chars) {
      parts.push(char.name || '');
      parts.push(char.appearance || '');
      parts.push(char.role || '');
    }
    return parts.join(' ').toLowerCase();
  }

  // ── Click/Tap to Advance ──

  textboxEl.addEventListener('click', (e) => {
    if (e.target === ui.clickIndicator) return;
    if (ui.isTyping) ui.skipTypewriter();
  });

  ui.clickIndicator?.addEventListener('click', () => {
    if (ui.isTyping || !currentEngine) return;
    advanceScene();
  });

  // ── Touch Gestures (mobile) ──
  const touch = new TouchHandler(vnContainer, {
    onAdvance: () => {
      if (ui.isTyping) {
        ui.skipTypewriter();
      } else {
        advanceScene();
      }
    },
    onOpenHistory: () => {
      if (currentEngine && !historyPanel.isVisible) historyPanel.show();
    },
    onOpenSettings: () => {
      if (!settingsPanel.isVisible) settingsPanel.show();
    },
    onOpenSave: () => {
      if (currentEngine && currentSlug && !saveManager.isVisible) {
        saveManager.show(currentSlug, currentEngine, 'save');
      }
    }
  });

  // ── Keyboard Shortcuts ──

  document.addEventListener('keydown', (e) => {
    const isSearchFocused = titleBrowser.isSearchFocused;

    if (e.key === 'Escape') {
      // Close the topmost open panel (priority: lightweight overlays first, then core panels)
      const panelCloseOrder = [
        keyboardHelp, aboutPanel, achPanel, statsDashboard, storyInfo,
        gallery, routeMap, saveManager, settingsPanel, historyPanel, sceneSelect
      ];
      const openPanel = panelCloseOrder.find(p => p.isVisible);
      if (openPanel) {
        openPanel.hide();
        syncTouchSuspension();
        // Resume auto-play if no panels remain open
        if (settings.get('autoPlay') && currentEngine && !isAnyPanelOpen()) {
          scheduleAutoAdvance();
        }
        return;
      }
      if (currentEngine) { returnToMenu(); return; }
    }

    if (isSearchFocused) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (ui.isTyping) {
        ui.skipTypewriter();
      } else {
        advanceScene();
      }
    }

    // Number keys for choices — direct pool lookup (no querySelector)
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const pool = ui._choiceBtnPool;
      const btn = (ui._currentChoices && idx < ui._currentChoices.length) ? pool[idx] : null;
      if (btn) btn.click();
    }

    const noMod = !e.ctrlKey && !e.metaKey;
    const key = e.key.toLowerCase();

    if (key === 'm' && noMod) toggleAudio();
    if (key === 'b' && noMod && currentEngine) rewindOneScene();
    if (e.key === '?' || (key === '/' && e.shiftKey)) togglePanel(keyboardHelp);

    if (key === 'a' && noMod && currentEngine) toggleAutoPlay();
    if (key === 'h' && noMod && currentEngine) togglePanel(historyPanel);
    if (key === 'g' && noMod && currentEngine) togglePanel(sceneSelect, currentEngine, currentEngine.state.currentScene);
    if (key === 'r' && noMod && currentEngine) togglePanel(routeMap, currentEngine);
    if (key === 'f' && noMod && currentEngine) settings.set('fullscreen', !settings.get('fullscreen'));
    if (key === 's' && noMod) togglePanel(settingsPanel);

    // 'Q' for save/load panel
    if (key === 'q' && noMod && currentEngine && currentSlug) togglePanel(saveManager, currentSlug, currentEngine, 'save');
  });

  // ── Auto-play Toggle ──

  function toggleAutoPlay() {
    const newVal = !settings.get('autoPlay');
    settings.set('autoPlay', newVal);
    if (newVal && currentEngine) scheduleAutoAdvance();
  }

  // ── Audio Toggle ──

  const btnAudio = document.getElementById('btn-audio');
  // btn-audio click is handled by HUD event delegation

  function toggleAudio() {
    const enabled = audio.toggle();
    btnAudio.textContent = enabled ? '🔊' : '🔇';
    btnAudio.classList.toggle('hud-inactive', !enabled);
    btnAudio.title = enabled ? 'Audio ON (M)' : 'Audio OFF (M)';
    btnAudio.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    if (enabled && ui._lastBgClass) audio.setTheme(ui._lastBgClass);
  }

  // ── Rewind helpers (referenced by HUD delegation + keyboard) ──

  const btnRewind = document.getElementById('btn-rewind');
  const hudMoreBtn = document.getElementById('btn-hud-more');
  const hudToolbar = document.querySelector('.vn-hud');

  // Mobile sticky filter sync is handled by TitleBrowser (scroll/resize/orientation listeners)

  function updateRewindButton() {
    const canRewind = currentEngine && currentEngine.state.snapshots.length > 0;
    btnRewind.classList.toggle('hud-dim', !canRewind);
    btnRewind.disabled = !canRewind;
  }

  function rewindOneScene() {
    if (!currentEngine || currentEngine.state.snapshots.length === 0) return;
    clearAutoPlayTimer();
    updateSkipIndicator(false);
    const prevScene = currentEngine.rewindScene();
    if (prevScene) playScene(prevScene);
    updateRewindButton();
  }

  // Wire save manager's load callback
  saveManager.onLoad = (slug, stateJson) => {
    const story = storySlugMap.get(slug);
    if (story) startStory(story, stateJson);
  };

  // ── HUD Event Delegation ──
  // Single listener on the HUD toolbar handles all button clicks (replaces 12 individual listeners)

  hudToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.hud-btn');
    if (!btn) return;
    const id = btn.id;

    switch (id) {
      case 'btn-back':    returnToMenu(); break;
      case 'btn-rewind':  rewindOneScene(); break;
      case 'btn-save':    if (currentEngine && currentSlug) saveManager.show(currentSlug, currentEngine, 'save'); break;
      case 'btn-hud-more':
        hudToolbar.classList.toggle('hud-expanded');
        hudMoreBtn.textContent = hudToolbar.classList.contains('hud-expanded') ? '✕' : '⋯';
        break;
      case 'btn-fast': {
        const fast = ui.toggleFastMode();
        ui.btnFast.title = fast ? 'Fast Mode ON' : 'Fast Mode OFF';
        break;
      }
      case 'btn-auto':    if (currentEngine) toggleAutoPlay(); break;
      case 'btn-history': if (currentEngine) togglePanel(historyPanel); break;
      case 'btn-scenes':  if (currentEngine) togglePanel(sceneSelect, currentEngine, currentEngine.state.currentScene); break;
      case 'btn-settings': togglePanel(settingsPanel); break;
      case 'btn-audio':   ensureAudio(); toggleAudio(); break;
      case 'btn-routemap': if (currentEngine) togglePanel(routeMap, currentEngine); break;
      case 'btn-help':    togglePanel(keyboardHelp); break;
    }
  });

  // ── Title Screen Event Delegation ──
  // Single listener on title-actions toolbar handles Random, Gallery, Achievements, Stats, About buttons

  const titleActions = document.querySelector('.title-actions');
  titleActions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.id;

    switch (id) {
      case 'btn-campaign': {
        ensureAudio();
        startCampaign();
        break;
      }
      case 'btn-continue': {
        const recent = saveManager.getMostRecentSave();
        if (!recent) return;
        // If most recent save is a campaign transient (intro/connector), start campaign instead
        if (recent.slug === 'campaign-intro' || recent.slug?.startsWith('campaign-connector-')) {
          saveManager.deleteSlot(recent.slug, 'auto');
          ensureAudio();
          startCampaign();
          return;
        }
        const story = storySlugMap.get(recent.slug);
        if (!story) return;
        ensureAudio();
        startStory(story, recent.state);
        break;
      }
      case 'btn-random': {
        if (storyIndex.length === 0) return;
        // Reservoir sampling: pick a random unplayed story without allocating filtered array.
        // Falls back to any story if all are completed.
        let pick = null;
        let count = 0;
        for (const s of storyIndex) {
          if (!tracker.isCompleted(s.slug)) {
            count++;
            if (Math.random() * count < 1) pick = s;
          }
        }
        if (!pick) pick = storyIndex[Math.floor(Math.random() * storyIndex.length)];
        ensureAudio();
        startStory(pick);
        break;
      }
      case 'btn-install': {
        void handleInstallAction();
        break;
      }
      case 'btn-gallery': gallery.show(); break;
      case 'btn-achievements': togglePanel(achPanel); break;
      case 'btn-stats': statsDashboard.setStories(storyIndex); statsDashboard.show(); break;
      case 'btn-about': {
        const achStats = achievements.getStats();
        aboutPanel.show({
          stories: storyIndex.length,
          characters: _totalCharCount,
          achievements: `${achStats.unlocked}/${achStats.total}`
        });
        break;
      }
    }
  });

  // ── Boot ──

  achievements.checkAll();

  // Surface app install when the browser says the PWA is installable.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    updateInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallButton();
    Toast.show('NyanTales installed — the cat terminal now lives on your home screen.', { icon: '✨', duration: 4000 });
  });

  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)');
  if (standaloneMedia?.addEventListener) {
    standaloneMedia.addEventListener('change', () => updateInstallButton());
  } else if (standaloneMedia?.addListener) {
    standaloneMedia.addListener(() => updateInstallButton());
  }

  // Respect browser Back/Forward for ?story=slug deep links.
  window.addEventListener('popstate', () => {
    handleRouteChange({ fromHistory: true }).catch(err => {
      console.warn('Failed to handle history navigation:', err);
    });
  });

  /** Show or hide the loading screen with progress */
  const _loadingFill  = document.querySelector('.loading-bar-fill');
  const _loadingLabel = document.querySelector('.loading-text');
  function updateLoadingProgress(pct, text) {
    if (_loadingFill) _loadingFill.style.setProperty('--bar-pct', `${pct}%`);
    if (_loadingLabel && text) _loadingLabel.textContent = text;
  }

  function hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loading) {
      loading.classList.add('hidden');
      trackTimeout(() => loading.remove(), 600);
    }
    if (app) app.removeAttribute('aria-hidden');
  }

  /** Show keyboard shortcut hints on first visit to story screen */
  function showKeyboardHints() {
    if (SafeStorage.getRaw('nyantales-hints-shown')) return;
    SafeStorage.setRaw('nyantales-hints-shown', '1');
    // Brief toast pointing to full help
    Toast.show('Press ? for keyboard shortcuts', { icon: '⌨️', duration: 4000 });
  }

  async function handleRouteChange(options = {}) {
    const {
      fromHistory = false,
      defaultHistoryMode = 'replace',
      showIntro = !fromHistory
    } = options;

    const requestedSlug = router.getRequestedSlug();
    if (!requestedSlug) {
      if (currentSlug) {
        returnToMenu({ syncRoute: !fromHistory, historyMode: defaultHistoryMode });
      } else if (!fromHistory) {
        router.syncStoryUrl(null, defaultHistoryMode);
      }
      return;
    }

    const story = storySlugMap.get(requestedSlug);
    if (!story) {
      Toast.show(`Story not found: ${requestedSlug}`, { icon: '⚠️', duration: 3500 });
      if (currentSlug) {
        returnToMenu({ syncRoute: !fromHistory, historyMode: 'replace' });
      } else {
        router.syncStoryUrl(null, 'replace');
      }
      return;
    }

    if (currentSlug === requestedSlug && currentEngine) return;

    await startStory(story, null, {
      historyMode: defaultHistoryMode,
      syncRoute: !fromHistory,
      showIntro
    });
  }

  async function boot() {
    try {
      updateLoadingProgress(10, 'Initializing...');
      updateLoadingProgress(30, 'Loading stories...');
      // Parallelize story index, campaign, and portrait preloads
      const [,] = await Promise.all([
        loadStoryIndex(),
        campaign.load(router.storyBasePath()).then(() => {
          campaign.loadProgress();
          campaignUI.rebuildSlugMap();
        }).catch(e => {
          console.warn('Campaign data not available:', e);
        }),
        ui.portraits.preloadAll()
      ]);
      updateLoadingProgress(80, 'Rendering...');
      renderTitleScreen();
      updateInstallButton();
      updateLoadingProgress(100, 'Ready!');

      // Brief pause for visual satisfaction
      await new Promise(r => setTimeout(r, 300));
      hideLoadingScreen();
      ui.showTitleScreen();
      await handleRouteChange({ defaultHistoryMode: 'replace' });
    } catch (err) {
      console.error('Failed to boot NyanTales:', err);
      hideLoadingScreen();
      const errTarget = storyGrid || document.getElementById('story-list');
      if (errTarget) errTarget.innerHTML =
        `<p class="boot-error" role="alert">
          Error loading stories. Make sure you're serving this from a web server.<br>
          <code>cd /tmp/nyantales && python3 -m http.server 8080</code><br>
          Then open <a href="http://localhost:8080/web/">http://localhost:8080/web/</a>
        </p>`;
    }
  }

  // ── Campaign Mode ──

  /** Start or continue the campaign. */
  async function startCampaign() {
    if (!campaign.isLoaded) {
      Toast.show('Campaign data not available', { icon: '⚠️' });
      return;
    }
    // Clean up stale transient saves from previous campaign runs
    saveManager.deleteSlot('campaign-intro', 'auto');
    campaignMode = true;
    playCampaignPhase();
  }

  /** Play the current campaign phase (intro, connector, chapter, or complete). */
  async function playCampaignPhase() {
    const phase = campaign.progress.phase;

    if (phase === 'intro' && !campaign.progress.started) {
      // Play the intro
      const introStory = campaign.getIntroAsStory();
      if (introStory) {
        startStory(introStory);
        return;
      }
      // If no intro, advance to first chapter
      campaign.advance();
      playCampaignPhase();
      return;
    }

    if (phase === 'connector') {
      const key = campaign.progress.connectorKey;
      const connStory = campaign.getConnectorAsStory(key);
      if (connStory) {
        startStory(connStory);
        return;
      }
      // If connector missing, skip to chapter
      campaign.advance();
      playCampaignPhase();
      return;
    }

    if (phase === 'chapter') {
      const ch = campaign.getCurrentChapter();
      if (!ch) {
        campaign.progress.phase = 'complete';
        campaign.saveProgress();
        playCampaignPhase();
        return;
      }
      const story = storySlugMap.get(ch.story);
      if (!story) {
        console.warn(`Campaign: story "${ch.story}" not found, skipping`);
        campaign.advance();
        playCampaignPhase();
        return;
      }
      // Apply persistent state to the new engine after it starts
      startStory(story).then(() => {
        if (currentEngine) campaign.applyPersistentState(currentEngine);
      }).catch(e => console.warn('Campaign: failed to start chapter', e));
      return;
    }

    if (phase === 'complete') {
      campaignMode = false;
      Toast.show('Campaign complete! 🎉 Thanks for playing.', { icon: '🐱', duration: 5000 });
      returnToMenu();
      return;
    }
  }

  /**
   * Called when a story/connector ends during campaign mode.
   * Advances campaign state and plays the next phase.
   */
  function onCampaignEnding() {
    // Clean up transient campaign saves (intro/connectors shouldn't linger)
    if (currentSlug === 'campaign-intro' || currentSlug?.startsWith('campaign-connector-')) {
      saveManager.deleteSlot(currentSlug, 'auto');
    }
    campaign.advance(currentEngine);
    campaignUI.rebuildSlugMap(); // Refresh unlock state after advancing
    const queuedUnlocks = pendingAchievementUnlocks.splice(0, pendingAchievementUnlocks.length);
    // Small delay before advancing to next phase for pacing
    trackTimeout(() => {
      playCampaignPhase();
      if (queuedUnlocks.length > 0) {
        trackTimeout(() => achievements.showNewUnlocks(queuedUnlocks), 1200);
      }
    }, 500);
  }

  // Campaign UI (button, grid, slug map, chapter delegation) managed by CampaignUI class

  /** Whether the chapter grid has been built at least once (for partial refresh). */
  // _chapterGridBuilt managed by CampaignUI

  // Wire campaignUI chapter grid click
  campaignUI.onChapterSelect = (idx) => {
    ensureAudio();
    startCampaignChapter(idx);
  };

  /**
   * Start a specific campaign chapter by index.
   * Used when player clicks a chapter card to replay or jump to current chapter.
   */
  async function startCampaignChapter(chapterIndex) {
    if (!campaign.isLoaded) {
      Toast.show('Campaign data not available', { icon: '⚠️' });
      return;
    }
    const ch = campaign.chapters[chapterIndex];
    if (!ch) return;
    const story = storySlugMap.get(ch.story);
    if (!story) {
      Toast.show('Story not found: ' + ch.story, { icon: '⚠️' });
      return;
    }
    // Set campaign to play this chapter
    campaign.progress.chapterIndex = chapterIndex;
    campaign.progress.phase = 'chapter';
    if (!campaign.progress.started && chapterIndex === 0) {
      // Starting fresh — go through intro first
      campaign.progress.started = false;
    } else if (chapterIndex > 0) {
      campaign.progress.started = true;
    }
    campaign.saveProgress();
    campaignMode = true;
    await startStory(story);
    if (currentEngine) campaign.applyPersistentState(currentEngine);
  }

  // ── Online/Offline Toasts ──

  window.addEventListener('online', () => Toast.show('Back online', { icon: '📶', className: 'nt-toast-success' }));
  window.addEventListener('offline', () => Toast.show('Offline — saves still work!', { icon: '📴', className: 'nt-toast-error' }));

  // Pause auto-play when tab is hidden (saves CPU / prevents unexpected advances)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearAutoPlayTimer();
    } else if (settings.get('autoPlay') && currentEngine && !isAnyPanelOpen()) {
      scheduleAutoAdvance();
    }
  });

  // ── Service Worker Registration ──
  // Moved from inline <script> to main.js for CSP compliance (script-src 'self')

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — show update banner
            const banner = document.createElement('div');
            banner.className = 'sw-update-banner';
            const text = document.createElement('span');
            text.className = 'sw-update-text';
            text.textContent = '🐱 NyanTales updated!';
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'sw-update-btn';
            reloadBtn.textContent = 'Reload';
            reloadBtn.addEventListener('click', () => location.reload());
            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'sw-dismiss-btn';
            dismissBtn.setAttribute('aria-label', 'Dismiss');
            dismissBtn.textContent = '✕';
            dismissBtn.addEventListener('click', () => banner.remove());
            banner.append(text, reloadBtn, dismissBtn);
            document.body.appendChild(banner);
            requestAnimationFrame(() => banner.classList.add('visible'));
          }
        });
      });
    }).catch(() => {});
  }

  boot();
})();
