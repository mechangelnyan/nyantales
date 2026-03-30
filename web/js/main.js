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
  const playback      = new PlaybackController({
    ui, settings, textHistory, audio, saveManager, tracker,
    vnContainer: document.querySelector('.vn-container')
  });
  const campaignFlow = new CampaignFlow(campaign, campaignUI, saveManager, achievements, playback);
  const achPanel      = new AchievementPanel(achievements);
  const sceneSelect   = new SceneSelect((sceneId) => {
    if (!playback.engine) return;
    playback.clearAutoPlay();
    playback.updateSkipIndicator(false);
    const scene = playback.engine.jumpToScene(sceneId);
    if (scene) playback.playScene(scene);
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

  // ── Panel Manager ──
  // Centralized panel orchestration: toggle, close topmost (Escape), isAnyOpen, touch suspension sync.
  const panels = new PanelManager();
  // Register all 11 overlay panels (priority 0 = closes first on Escape)
  panels.register(keyboardHelp, 0);
  panels.register(aboutPanel, 1);
  panels.register(achPanel, 2);
  panels.register(statsDashboard, 3);
  panels.register(storyInfo, 4);
  panels.register(gallery, 5);
  panels.register(routeMap, 6);
  panels.register(saveManager, 7);
  panels.register(settingsPanel, 8);
  panels.register(historyPanel, 9);
  panels.register(sceneSelect, 10);

  /** Toggle a panel's visibility. For panels with custom show args, pass them in showArgs. */
  function togglePanel(panel, ...showArgs) {
    panels.toggle(panel, ...showArgs);
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
  // Game state aliases (delegated to PlaybackController)
  // Access via playback.engine, playback.currentSlug, playback.campaignMode, etc.
  let storyStartTime = null; // timestamp when current story session began

  // Reusable DOM elements for ending overlays (avoids createElement per ending)
  let _endingTimeBox      = null;
  let _endingNewBadge     = null;
  // _endingCampaignBtn managed by campaignUI

  // Convenience aliases (used heavily throughout main.js)
  function clearAutoPlayTimer() { playback.clearAutoPlay(); }
  function trackTimeout(fn, ms) { return playback.trackTimeout(fn, ms); }
  function clearMiscTimers() { playback.clearMiscTimers(); }
  function advanceScene() { return playback.advanceScene(); }

  /** Check if any overlay panel is currently visible */
  function isAnyPanelOpen() { return panels.isAnyOpen(); }

  // Wire panel-open check into playback controller
  playback.isAnyPanelOpen = isAnyPanelOpen;

  /**
   * Sync touch gesture suspension with panel state.
   * Called after any panel show/hide to prevent swipe gestures
   * from triggering behind open overlays.
   */
  function syncTouchSuspension() {
    touch.suspend(panels.isAnyOpen());
  }
  // Wire panel change listener for touch suspension sync
  panels.onPanelChange = syncTouchSuspension;

  function scheduleAutoAdvance() { playback.scheduleAutoAdvance(); }

  function updateAutoPlayHUD(on) {
    playback.updateAutoPlayHUD(on, btnAutoEl);
  }

  // Wire theme settings reactivity (needs updateAutoPlayHUD + clearAutoPlayTimer defined above)
  theme.wireReactivity({ ui, audio, updateAutoPlayHUD, clearAutoPlayTimer });

  // ── Cached DOM refs ──
  // HUD indicators are now managed by PlaybackController (autoPlay, skip, progress, bar)

  const vnContainer    = document.querySelector('.vn-container');
  const btnAutoEl      = document.getElementById('btn-auto');
  const btnInstallEl   = document.getElementById('btn-install');
  const statsEl        = document.getElementById('title-stats');
  const textboxEl      = document.getElementById('vn-textbox');
  // chapterGridEl, sectionDivider, campaignBtnEl now managed by CampaignUI

  // Convenience aliases delegating to PlaybackController
  function updateProgressHUD() { playback.updateProgressHUD(); }
  function updateSkipIndicator(active) { playback.updateSkipIndicator(active); }

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

  // ── Core Scene Playback (delegated to PlaybackController) ──

  /** Play a scene through the playback controller. */
  function playScene(scene) { return playback.playScene(scene); }

  // ── Start / Restart Story ──

  // ── Engine Callbacks (wired once, reference playback.engine dynamically) ──

  // Campaign ending callback — wired once on ui, invoked via ending delegation (data-action="campaign-next")
  ui._onCampaignEnding = () => campaignFlow.onEnding();

  /** @type {Object|null} The most recently parsed story data (for restart). */
  let _currentParsed = null;

  ui.onChoice(choice => {
    if (!playback.engine) return;
    clearAutoPlayTimer();
    const nextScene = playback.engine.goToScene(choice.goto, choice);
    playScene(nextScene);
  });

  ui._onEndingHook = (scene, engine) => {
    clearAutoPlayTimer();
    updateSkipIndicator(false);

    // Record reading time to tracker for persistent stats
    const sessionElapsed = storyStartTime ? Date.now() - storyStartTime : 0;
    if (playback.currentSlug && sessionElapsed > 0) {
      tracker.recordReadingTime(playback.currentSlug, sessionElapsed);
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

    const result = tracker.recordEnding(playback.currentSlug, scene.ending, engine.state.turns);

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
      if (playback.campaignMode) {
        campaignFlow.pendingUnlocks.push(...newAch);
      } else {
        trackTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }
    }

    // In campaign mode, add a "Next Chapter" button to the ending overlay
    if (playback.campaignMode && ui.endingEl) {
      const nextBtn = campaignUI.getEndingButton(campaign.isComplete());
      const actionsRow = ui._endingRefs.actionsRow;
      actionsRow.insertBefore(nextBtn, actionsRow.firstChild);
      requestAnimationFrame(() => nextBtn.focus());
    }
  };

  ui.onRestart(() => {
    if (!_currentParsed) return;
    initEngine(_currentParsed);
    if (playback.campaignMode && playback.engine) campaign.applyPersistentState(playback.engine);
    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    playScene(playback.engine.getCurrentScene());
  });

  ui.onMenu(() => {
    if (playback.campaignMode) playback.campaignMode = false;
    returnToMenu();
  });

  function initEngine(parsed) {
    _currentParsed = parsed;
    const engine = new StoryEngine(parsed);
    playback.engine = engine;
    // Count scenes without Object.keys allocation
    let _sc = 0; for (const _ in parsed.scenes) _sc++;
    playback.totalScenes = _sc;
    ui._totalScenes = _sc; // share with UI to avoid re-computing in _showEnding
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

    playback.currentSlug = story.slug;
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
      try { playback.engine.loadState(savedState); } catch (e) { console.warn('Failed to load save:', e); }
    }

    // Show story intro splash (skip for loaded saves / history-driven route changes)
    if (showIntro) {
      await StoryIntro.show(story, ui.portraits);
      if (!router.isCurrent(navId)) return;
      playback.suppressNextAutoAdvance();
    }

    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    showKeyboardHints();

    const firstScene = playback.engine.getCurrentScene();
    await playScene(firstScene);
    if (!router.isCurrent(navId)) return;

    // Check achievements on story start
    const startAch = achievements.checkAll();
    if (startAch.length > 0) {
      if (playback.campaignMode) {
        campaignFlow.pendingUnlocks.push(...startAch);
      } else {
        trackTimeout(() => achievements.showNewUnlocks(startAch), 1500);
      }
    }
  }

  function returnToMenu(options = {}) {
    const { syncRoute = true, historyMode = 'replace' } = options;
    router.bump();
    // Record reading time before clearing state
    if (playback.currentSlug && storyStartTime) {
      tracker.recordReadingTime(playback.currentSlug, Date.now() - storyStartTime);
    }

    achievements.cancelPendingToasts();
    storyStartTime = null;
    document.title = router.APP_TITLE;
    ui.setStorySlug(null);
    if (syncRoute) router.syncStoryUrl(null, historyMode);
    audio.stop();
    textHistory.clear();
    if (sceneSelect.isVisible) sceneSelect.hide();
    playback.cleanup(); // clears engine, slug, timers, HUD indicators
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

  // ── Story Card Manager ──
  // Manages card decoration, refresh, reset, and metadata (extracted from main.js Phase 139)
  const cardManager = new StoryCardManager({
    tracker, saveManager, campaignUI, storySlugMap, storyIdxMap
  });

  /** Shorthand for card manager getMeta (used by storyInfo and statsDashboard). */
  function getStoryMeta(story) { return cardManager.getMeta(story); }

  /** Whether the story grid has been built at least once (for partial refresh). */
  let _gridBuilt = false;
  // _chapterGridBuilt managed by CampaignUI

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
      cardManager.clearRefs();
      ui.renderStoryList(storyIndex);
      const cards = titleBrowser.refreshCards();
      for (let idx = 0; idx < storyIndex.length; idx++) {
        const card = cards[idx];
        if (card) cardManager.decorate(card, storyIndex[idx]);
      }
      _gridBuilt = true;
    } else {
      // Subsequent renders: update dynamic card state without rebuilding DOM
      cardManager.refresh(storyIndex, titleBrowser.refreshCards());
    }

    // "Continue" button — shows if there's a recent save
    updateContinueButton();

    titleBrowser.apply();
  }

  // _refreshStoryCards and _resetCardForRedecorate moved to StoryCardManager (Phase 139)

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

  // buildStorySearchBlob moved to StoryCardManager (Phase 139)

  // ── Click/Tap to Advance ──

  textboxEl.addEventListener('click', (e) => {
    if (e.target === ui.clickIndicator) return;
    if (ui.isTyping) ui.skipTypewriter();
  });

  ui.clickIndicator?.addEventListener('click', () => {
    if (ui.isTyping || !playback.engine) return;
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
      if (playback.engine && !historyPanel.isVisible) historyPanel.show();
    },
    onOpenSettings: () => {
      if (!settingsPanel.isVisible) settingsPanel.show();
    },
    onOpenSave: () => {
      if (playback.engine && playback.currentSlug && !saveManager.isVisible) {
        saveManager.show(playback.currentSlug, playback.engine, 'save');
      }
    }
  });

  // ── Keyboard Shortcuts ──

  document.addEventListener('keydown', (e) => {
    const isSearchFocused = titleBrowser.isSearchFocused;

    if (e.key === 'Escape') {
      // Close the topmost open panel (priority order managed by PanelManager)
      if (panels.closeTopmost()) {
        // Resume auto-play if no panels remain open
        if (settings.get('autoPlay') && playback.engine && !panels.isAnyOpen()) {
          scheduleAutoAdvance();
        }
        return;
      }
      if (playback.engine) { returnToMenu(); return; }
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
    if (key === 'b' && noMod && playback.engine) rewindOneScene();
    if (e.key === '?' || (key === '/' && e.shiftKey)) togglePanel(keyboardHelp);

    if (key === 'a' && noMod && playback.engine) toggleAutoPlay();
    if (key === 'h' && noMod && playback.engine) togglePanel(historyPanel);
    if (key === 'g' && noMod && playback.engine) togglePanel(sceneSelect, playback.engine, playback.engine.state.currentScene);
    if (key === 'r' && noMod && playback.engine) togglePanel(routeMap, playback.engine);
    if (key === 'f' && noMod && playback.engine) settings.set('fullscreen', !settings.get('fullscreen'));
    if (key === 's' && noMod) togglePanel(settingsPanel);

    // 'Q' for save/load panel
    if (key === 'q' && noMod && playback.engine && playback.currentSlug) togglePanel(saveManager, playback.currentSlug, playback.engine, 'save');
  });

  // ── Auto-play Toggle ──

  function toggleAutoPlay() {
    const newVal = !settings.get('autoPlay');
    settings.set('autoPlay', newVal);
    if (newVal && playback.engine) scheduleAutoAdvance();
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

  // Wire rewind button into playback controller
  playback.setRewindButton(btnRewind);

  function updateRewindButton() { playback.updateRewindButton(btnRewind); }
  function rewindOneScene() { playback.rewindOneScene(btnRewind); }

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
      case 'btn-save':    if (playback.engine && playback.currentSlug) saveManager.show(playback.currentSlug, playback.engine, 'save'); break;
      case 'btn-hud-more':
        hudToolbar.classList.toggle('hud-expanded');
        hudMoreBtn.textContent = hudToolbar.classList.contains('hud-expanded') ? '✕' : '⋯';
        break;
      case 'btn-fast': {
        const fast = ui.toggleFastMode();
        ui.btnFast.title = fast ? 'Fast Mode ON' : 'Fast Mode OFF';
        break;
      }
      case 'btn-auto':    if (playback.engine) toggleAutoPlay(); break;
      case 'btn-history': if (playback.engine) togglePanel(historyPanel); break;
      case 'btn-scenes':  if (playback.engine) togglePanel(sceneSelect, playback.engine, playback.engine.state.currentScene); break;
      case 'btn-settings': togglePanel(settingsPanel); break;
      case 'btn-audio':   ensureAudio(); toggleAudio(); break;
      case 'btn-routemap': if (playback.engine) togglePanel(routeMap, playback.engine); break;
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
        campaignFlow.start();
        break;
      }
      case 'btn-continue': {
        const recent = saveManager.getMostRecentSave();
        if (!recent) return;
        // If most recent save is a campaign transient (intro/connector), start campaign instead
        if (recent.slug === 'campaign-intro' || recent.slug?.startsWith('campaign-connector-')) {
          saveManager.deleteSlot(recent.slug, 'auto');
          ensureAudio();
          campaignFlow.start();
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
      if (playback.currentSlug) {
        returnToMenu({ syncRoute: !fromHistory, historyMode: defaultHistoryMode });
      } else if (!fromHistory) {
        router.syncStoryUrl(null, defaultHistoryMode);
      }
      return;
    }

    const story = storySlugMap.get(requestedSlug);
    if (!story) {
      Toast.show(`Story not found: ${requestedSlug}`, { icon: '⚠️', duration: 3500 });
      if (playback.currentSlug) {
        returnToMenu({ syncRoute: !fromHistory, historyMode: 'replace' });
      } else {
        router.syncStoryUrl(null, 'replace');
      }
      return;
    }

    if (playback.currentSlug === requestedSlug && playback.engine) return;

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

  // ── Campaign Mode (delegated to CampaignFlow) ──

  // Wire campaign flow callbacks (needs startStory/returnToMenu defined above)
  campaignFlow.startStory   = (story, state, opts) => startStory(story, state, opts);
  campaignFlow.returnToMenu = () => returnToMenu();
  campaignFlow.storySlugMap = () => storySlugMap;

  campaignUI.onChapterSelect = (idx) => {
    ensureAudio();
    campaignFlow.startChapter(idx);
  };

  // ── Online/Offline Toasts ──

  window.addEventListener('online', () => Toast.show('Back online', { icon: '📶', className: 'nt-toast-success' }));
  window.addEventListener('offline', () => Toast.show('Offline — saves still work!', { icon: '📴', className: 'nt-toast-error' }));

  // Pause auto-play when tab is hidden (saves CPU / prevents unexpected advances)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearAutoPlayTimer();
    } else if (settings.get('autoPlay') && playback.engine && !isAnyPanelOpen()) {
      scheduleAutoAdvance();
    }
  });

  // ── Service Worker Registration (delegated to SWRegister) ──
  SWRegister.init();

  boot();
})();
