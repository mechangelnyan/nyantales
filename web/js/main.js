/**
 * NyanTales Visual Novel - Main Application
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
  const vnContainer    = document.querySelector('.vn-container');
  const playback      = new PlaybackController({
    ui, settings, textHistory, audio, saveManager, tracker,
    vnContainer
  });
  const campaignFlow = new CampaignFlow(campaign, campaignUI, saveManager, achievements, playback);
  const achPanel      = new AchievementPanel(achievements);
  const sceneSelect   = new SceneSelect((sceneId) => {
    if (!playback.engine) return;
    playback.clearAutoPlay();
    playback.updateSkipIndicator(false);
    const scene = playback.engine.jumpToScene(sceneId);
    if (scene) playback.playScene(scene);
    playback.updateRewindButton(btnRewind);
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
    const story = stories.get(slug);
    if (story) {
      ensureAudio();
      startStory(story, stateJson);
    }
  };
  storyInfo.onShare = (story) => ShareHelper.shareStory(story);

  // Pre-compute total character count (used by About panel)
  const _totalCharCount = (() => {
    const chars = new Set();
    for (const slug in CHARACTER_DATA) {
      for (const c of CHARACTER_DATA[slug]) chars.add(c.name);
    }
    return chars.size;
  })();

  // Wire gallery story click (one-time, not per-show)
  gallery.onStorySelect = (slug) => {
    const story = stories.get(slug);
    if (story) { ensureAudio(); startStory(story); }
  };

  // Wire stats dashboard play callback (one-time, not per-show)
  statsDashboard.onPlay = (story) => { ensureAudio(); startStory(story); };

  // Migrate legacy save format to new slot system
  saveManager.migrateLegacy();

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

  // ── Routing & Stories ──

  const router = new AppRouter();
  const stories = new StoryLoader(router);

  // Wire panel-open check into playback controller
  playback.isAnyPanelOpen = () => panels.isAnyOpen();

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

  // Wire theme settings reactivity
  theme.wireReactivity({
    ui, audio,
    updateAutoPlayHUD: (on) => playback.updateAutoPlayHUD(on),
    clearAutoPlayTimer: () => playback.clearAutoPlay()
  });

  // ── Cached DOM refs ──

  const btnAutoEl      = document.getElementById('btn-auto');
  playback.setAutoButton(btnAutoEl);
  const btnInstallEl   = document.getElementById('btn-install');
  const statsEl        = document.getElementById('title-stats');
  const textboxEl      = document.getElementById('vn-textbox');

  // ── Engine Callbacks (wired once, reference playback.engine dynamically) ──

  // Campaign ending callback - wired once on ending overlay, invoked via delegation (data-action="campaign-next")
  ui.ending.onCampaignEnding = () => campaignFlow.onEnding();

  ui.onChoice(choice => {
    if (!playback.engine) return;
    playback.clearAutoPlay();
    const nextScene = playback.engine.goToScene(choice.goto, choice);
    playback.playScene(nextScene);
  });

  ui.ending.onEndingHook = (scene, engine) => {
    playback.clearAutoPlay();
    playback.updateSkipIndicator(false);

    // Record reading time to tracker for persistent stats
    const sessionElapsed = playback.getSessionElapsed();
    if (playback.currentSlug && sessionElapsed > 0) {
      tracker.recordReadingTime(playback.currentSlug, sessionElapsed);
    }

    // Inject reading time into ending stats grid (reusable element)
    playback.injectReadingTime(ui.endingRefs.statsGrid, sessionElapsed);

    const result = tracker.recordEnding(playback.currentSlug, scene.ending, engine.state.turns);

    if (result.isNewEnding) {
      playback.showNewEndingBadge(ui.endingEl);
    }

    const newAch = achievements.checkAll();
    if (newAch.length > 0) {
      if (playback.campaignMode) {
        campaignFlow.pendingUnlocks.push(...newAch);
      } else {
        playback.trackTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }
    }

    // In campaign mode, add a "Next Chapter" button to the ending overlay
    if (playback.campaignMode && ui.endingEl) {
      const nextBtn = campaignUI.getEndingButton(campaign.isComplete());
      const actionsRow = ui.endingRefs.actionsRow;
      actionsRow.insertBefore(nextBtn, actionsRow.firstChild);
      requestAnimationFrame(() => nextBtn.focus());
    }
  };

  ui.onRestart(() => {
    if (!playback.currentParsed) return;
    initEngine(playback.currentParsed);
    if (playback.campaignMode && playback.engine) campaign.applyPersistentState(playback.engine);
    ui.showStoryScreen();
    playback.updateAutoPlayHUD(settings.get('autoPlay'));
    playback.playScene(playback.engine.getCurrentScene());
  });

  ui.onMenu(() => returnToMenu());

  function initEngine(parsed) {
    playback.currentParsed = parsed;
    const engine = new StoryEngine(parsed);
    playback.engine = engine;
    // Count scenes without Object.keys allocation
    let _sc = 0; for (const _ in parsed.scenes) _sc++;
    playback.totalScenes = _sc;
    ui.ending.totalScenes = _sc; // share with ending overlay to avoid re-computing
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
    playback.storyStartTime = Date.now();
    document.title = `${story.title} - NyanTales`;
    ui.setStorySlug(story.slug);
    if (story.slug && syncRoute) router.syncStoryUrl(story.slug, historyMode);

    // Lazy-load full YAML if not yet parsed (manifest-boot mode)
    if (!story._parsed) {
      const parsed = await stories.loadFull(story);
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
    playback.updateAutoPlayHUD(settings.get('autoPlay'));
    showKeyboardHints();

    const firstScene = playback.engine.getCurrentScene();
    await playback.playScene(firstScene);
    if (!router.isCurrent(navId)) return;

    // Check achievements on story start
    const startAch = achievements.checkAll();
    if (startAch.length > 0) {
      if (playback.campaignMode) {
        campaignFlow.pendingUnlocks.push(...startAch);
      } else {
        playback.trackTimeout(() => achievements.showNewUnlocks(startAch), 1500);
      }
    }
  }

  function returnToMenu(options = {}) {
    const { syncRoute = true, historyMode = 'replace' } = options;
    router.bump();
    // Record reading time before clearing state
    const menuElapsed = playback.getSessionElapsed();
    if (playback.currentSlug && menuElapsed > 0) {
      tracker.recordReadingTime(playback.currentSlug, menuElapsed);
    }

    achievements.cancelPendingToasts();
    document.title = router.APP_TITLE;
    ui.setStorySlug(null);
    if (syncRoute) router.syncStoryUrl(null, historyMode);
    audio.stop();
    textHistory.clear();
    if (sceneSelect.isVisible) sceneSelect.hide();
    playback.cleanup(); // clears engine, slug, timers, HUD indicators
    ui.showTitleScreen();
    titleScreen.render();

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
    return slug ? stories.get(slug) : null;
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

  // Single delegated listener on story grid handles click + keyboard for all 30 cards
  function _gridHandler(e) {
    if (e.type === 'keydown') {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.story-card');
      if (!card) return;
      e.preventDefault();
      selectStoryCard(card);
      return;
    }
    // Click handling
    const infoBtn = e.target.closest('.story-card-info-btn');
    if (infoBtn) {
      e.stopPropagation();
      const card = infoBtn.closest('.story-card');
      const story = storyFromCard(card);
      if (story) storyInfo.show(story, CHARACTER_DATA[story.slug] || [], cardManager.getMeta(story));
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
    const card = e.target.closest('.story-card');
    if (card) selectStoryCard(card);
  }
  if (storyGrid) {
    storyGrid.addEventListener('click', _gridHandler);
    storyGrid.addEventListener('keydown', _gridHandler);
  }

  // ── Story Card Manager ──
  const cardManager = new StoryCardManager({
    tracker, saveManager, campaignUI, storySlugMap: stories.slugMap, storyIdxMap: stories.idxMap
  });

  // ── Title Screen ──

  const btnContinueEl = document.getElementById('btn-continue');

  const installMgr = new InstallManager(btnInstallEl, router);

  // ── Search, Filter & Sort ──

  const titleBg = document.querySelector('.title-bg');

  const titleBrowser = new TitleBrowser(storyGrid, {
    filterInput:        document.getElementById('filter-input'),
    filterTagsContainer: document.querySelector('.filter-tags'),
    sortSelect:         document.getElementById('sort-select'),
    filterClearBtn:     document.getElementById('filter-clear'),
    storyFilter:        document.getElementById('story-filter'),
    titleBg
  });

  // ── Title Screen Renderer ──

  const titleScreen = new TitleScreen({
    tracker, achievements, saveManager, campaignUI, cardManager,
    ui, titleBrowser, stories,
    statsEl, btnContinueEl
  });

  // ── Click/Tap to Advance ──

  // Single delegated listener on textbox handles both text skip and advance indicator
  textboxEl.addEventListener('click', (e) => {
    if (e.target === ui.clickIndicator || e.target.parentElement === ui.clickIndicator) {
      if (!ui.isTyping && playback.engine) playback.advanceScene();
    } else {
      if (ui.isTyping) ui.skipTypewriter();
    }
  });

  // ── Touch Gestures (mobile) ──
  const touch = new TouchHandler(vnContainer, {
    onAdvance: () => {
      if (ui.isTyping) {
        ui.skipTypewriter();
      } else {
        playback.advanceScene();
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
          playback.scheduleAutoAdvance();
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
        playback.advanceScene();
      }
    }

    // Number keys for choices - direct pool lookup (no querySelector)
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const pool = ui.choiceBtnPool;
      const btn = (ui.currentChoices && idx < ui.currentChoices.length) ? pool[idx] : null;
      if (btn) btn.click();
    }

    const noMod = !e.ctrlKey && !e.metaKey;
    const key = e.key.toLowerCase();

    if (key === 'm' && noMod) toggleAudio();
    if (key === 'b' && noMod && playback.engine) playback.rewindOneScene(btnRewind);
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
    if (newVal && playback.engine) playback.scheduleAutoAdvance();
  }

  // ── Audio Toggle ──

  const btnAudio = document.getElementById('btn-audio');

  function toggleAudio() {
    const enabled = audio.toggle();
    btnAudio.textContent = enabled ? '🔊' : '🔇';
    btnAudio.classList.toggle('hud-inactive', !enabled);
    btnAudio.title = enabled ? 'Audio ON (M)' : 'Audio OFF (M)';
    btnAudio.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    if (enabled && ui.lastBgClass) audio.setTheme(ui.lastBgClass);
  }

  // ── Rewind helpers (referenced by HUD delegation + keyboard) ──

  const btnRewind = document.getElementById('btn-rewind');
  const hudMoreBtn = document.getElementById('btn-hud-more');
  const hudToolbar = document.querySelector('.vn-hud');

  // Wire rewind button into playback controller
  playback.setRewindButton(btnRewind);

  // Wire save manager's load callback
  saveManager.onLoad = (slug, stateJson) => {
    const story = stories.get(slug);
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
      case 'btn-rewind':  playback.rewindOneScene(btnRewind); break;
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
        const story = stories.get(recent.slug);
        if (!story) return;
        ensureAudio();
        startStory(story, recent.state);
        break;
      }
      case 'btn-random': {
        if (stories.index.length === 0) return;
        const pick = stories.pickRandom(slug => tracker.isCompleted(slug));
        ensureAudio();
        startStory(pick);
        break;
      }
      case 'btn-install': {
        void installMgr.handleAction();
        break;
      }
      case 'btn-gallery': gallery.show(); break;
      case 'btn-achievements': togglePanel(achPanel); break;
      case 'btn-stats': statsDashboard.setStories(stories.index); statsDashboard.show(); break;
      case 'btn-about': {
        const achStats = achievements.getStats();
        aboutPanel.show({
          stories: stories.index.length,
          characters: _totalCharCount,
          achievements: `${achStats.unlocked}/${achStats.total}`
        });
        break;
      }
    }
  });

  // ── Boot ──

  achievements.checkAll();

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
      playback.trackTimeout(() => loading.remove(), 600);
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

    const story = stories.get(requestedSlug);
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
        stories.load(),
        campaign.load(router.storyBasePath()).then(() => {
          campaign.loadProgress();
          campaignUI.rebuildSlugMap();
        }).catch(e => {
          console.warn('Campaign data not available:', e);
        }),
        ui.portraits.preloadAll()
      ]);
      updateLoadingProgress(80, 'Rendering...');
      titleScreen.render();
      installMgr.updateButton();
      updateLoadingProgress(100, 'Ready!');

      // Brief pause for visual satisfaction
      await PlaybackController._delay(300);
      hideLoadingScreen();
      ui.showTitleScreen();
      await handleRouteChange({ defaultHistoryMode: 'replace' });
    } catch (err) {
      console.error('Failed to boot NyanTales:', err);
      hideLoadingScreen();
      const errTarget = storyGrid || document.getElementById('story-list');
      if (errTarget) {
        errTarget.textContent = '';
        const p = document.createElement('p');
        p.className = 'boot-error';
        p.setAttribute('role', 'alert');
        p.appendChild(document.createTextNode('Error loading stories. Make sure you\'re serving this from a web server.'));
        p.appendChild(document.createElement('br'));
        const code = document.createElement('code');
        code.textContent = 'cd /tmp/nyantales && python3 -m http.server 8080';
        p.appendChild(code);
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode('Then open '));
        const a = document.createElement('a');
        a.href = 'http://localhost:8080/web/';
        a.textContent = 'http://localhost:8080/web/';
        p.appendChild(a);
        errTarget.appendChild(p);
      }
    }
  }

  // ── Campaign Mode ──
  campaignFlow.startStory   = (story, state, opts) => startStory(story, state, opts);
  campaignFlow.returnToMenu = () => returnToMenu();
  campaignFlow.storySlugMap = () => stories.slugMap;

  campaignUI.onChapterSelect = (idx) => {
    ensureAudio();
    campaignFlow.startChapter(idx);
  };

  // ── Online/Offline Toasts ──

  window.addEventListener('online', () => Toast.show('Back online', { icon: '📶', className: 'nt-toast-success' }));
  window.addEventListener('offline', () => Toast.show('Offline - saves still work!', { icon: '📴', className: 'nt-toast-error' }));

  // Pause auto-play when tab is hidden (saves CPU / prevents unexpected advances)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      playback.clearAutoPlay();
    } else if (settings.get('autoPlay') && playback.engine && !panels.isAnyOpen()) {
      playback.scheduleAutoAdvance();
    }
  });

  SWRegister.init();

  boot();
})();
