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
    const story = storyIndex.find(s => s.slug === slug);
    if (story) {
      ensureAudio();
      startStory(story, stateJson);
    }
  };

  // Pre-compute total character count (used by About panel)
  const _totalCharCount = (() => {
    const chars = new Set();
    if (typeof CHARACTER_DATA !== 'undefined') {
      Object.values(CHARACTER_DATA).forEach(cs => cs.forEach(c => chars.add(c.name)));
    }
    return chars.size;
  })();

  // Wire gallery story click (one-time, not per-show)
  gallery.onStoryClick((slug) => {
    const story = storyIndex.find(s => s.slug === slug);
    if (story) { ensureAudio(); startStory(story); }
  });

  // Wire stats dashboard play callback (one-time, not per-show)
  statsDashboard.onPlay = (story) => { ensureAudio(); startStory(story); };

  // Migrate legacy save format to new slot system
  saveManager.migrateLegacy();

  // Preload AI portraits (non-blocking visual improvement)
  await ui.portraits.preloadAll();

  // ── Color Themes (must be before initial settings) ──

  const COLOR_THEMES = {
    cyan:    { accent: '#00d4ff', rgb: [0, 212, 255] },
    magenta: { accent: '#ff36ab', rgb: [255, 54, 171] },
    green:   { accent: '#00ff88', rgb: [0, 255, 136] },
    amber:   { accent: '#ffd700', rgb: [255, 215, 0] },
    violet:  { accent: '#cc66ff', rgb: [204, 102, 255] }
  };

  function applyParticlesSetting(on) {
    document.body.classList.toggle('no-particles', !on);
  }

  function applyFontSize(pct) {
    document.documentElement.style.setProperty('--text-scale', `${pct}%`);
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function applyColorTheme(themeName) {
    const theme = COLOR_THEMES[themeName] || COLOR_THEMES.cyan;
    const root = document.documentElement;
    root.style.setProperty('--accent-cyan', theme.accent);
    // Set RGB components for rgba() usage throughout CSS
    const [r, g, b] = theme.rgb;
    root.style.setProperty('--accent-r', r);
    root.style.setProperty('--accent-g', g);
    root.style.setProperty('--accent-b', b);
    if (themeColorMeta) themeColorMeta.setAttribute('content', theme.accent);
  }

  // Apply initial settings
  ui.typewriterSpeed = settings.get('textSpeed');
  applyParticlesSetting(settings.get('particles'));
  applyColorTheme(settings.get('colorTheme'));
  applyFontSize(settings.get('fontSize'));

  // ── Settings Reactivity ──

  settings.onChange((key, value) => {
    if (key === 'textSpeed')   ui.typewriterSpeed = value;
    if (key === 'autoPlay')  { updateAutoPlayHUD(value); if (!value) clearAutoPlayTimer(); }
    if (key === 'particles')   applyParticlesSetting(value);
    if (key === 'audioVolume' && audio.masterGain) {
      audio.masterGain.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.1);
    }
    if (key === 'colorTheme') applyColorTheme(value);
    if (key === 'fontSize')   applyFontSize(value);
    if (key === 'fullscreen') toggleFullscreen(value);
  });

  /** Toggle fullscreen mode */
  function toggleFullscreen(on) {
    if (on && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (!on && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }
  // Sync setting when user exits fullscreen via Escape/browser UI
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && settings.get('fullscreen')) {
      settings.set('fullscreen', false);
    }
  });

  /** Toggle a panel's visibility. For panels with custom show args, pass them in showArgs. */
  function togglePanel(panel, ...showArgs) {
    panel.isVisible ? panel.hide() : panel.show(...showArgs);
    syncTouchSuspension();
  }

  // (COLOR_THEMES, applyParticlesSetting, applyFontSize, applyColorTheme moved above initial settings)

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

  function storyBasePath() {
    const path = window.location.pathname;
    // Running from web/dist/ (production build) — stories are two levels up
    if (path.includes('/web/dist')) return '../../stories';
    // Running from web/ (dev) — stories are one level up
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  const APP_TITLE = 'NyanTales — Visual Novel';

  let storyIndex   = [];
  let currentEngine = null;
  let currentSlug   = null;
  let activeFilter  = 'all';
  let activeSort    = 'title-asc';
  let storyStartTime = null; // timestamp when current story session began
  let campaignMode  = false; // true when playing the connected campaign

  // ── Auto-play State ──

  let autoPlayTimer     = null;
  let autoPlayIndicator = null;
  let skipIndicator     = null;

  function clearAutoPlayTimer() {
    if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
  }

  /** Check if any overlay panel is currently visible */
  function isAnyPanelOpen() {
    return settingsPanel.isVisible || historyPanel.isVisible || saveManager.isVisible
      || sceneSelect.isVisible || routeMap.isVisible || keyboardHelp.isVisible
      || aboutPanel.isVisible || statsDashboard.isVisible || storyInfo.isVisible
      || achPanel.isVisible;
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

    autoPlayTimer = setTimeout(() => {
      if (!currentEngine || isAnyPanelOpen()) return;
      const s = currentEngine.getCurrentScene();
      if (s && s.next) {
        const next = currentEngine.goToScene(s.next);
        playScene(next);
      }
    }, settings.get('autoPlayDelay'));
  }

  function updateAutoPlayHUD(on) {
    btnAutoEl.classList.toggle('hud-inactive', !on);
    btnAutoEl.title = on ? 'Auto-Play ON (A)' : 'Auto-Play OFF (A)';
    btnAutoEl.setAttribute('aria-pressed', on ? 'true' : 'false');

    if (on) {
      if (!autoPlayIndicator) {
        autoPlayIndicator = document.createElement('div');
        autoPlayIndicator.className = 'auto-play-indicator';
        autoPlayIndicator.innerHTML = '<div class="auto-play-dot"></div> AUTO';
        vnContainer.appendChild(autoPlayIndicator);
      }
      autoPlayIndicator.classList.remove('hidden');
    } else if (autoPlayIndicator) {
      autoPlayIndicator.classList.add('hidden');
    }
  }

  // ── Cached DOM refs ──

  const vnContainer = document.querySelector('.vn-container');
  const btnAutoEl   = document.getElementById('btn-auto');
  const statsEl     = document.getElementById('title-stats');
  const textboxEl   = document.getElementById('vn-textbox');

  // ── In-Game Progress HUD ──

  let progressHUD = null;
  let progressBar = null;

  // Throttle progress HUD updates: only re-render if values actually changed
  let _lastProgressPct = -1;
  let _lastProgressTurns = -1;

  function updateProgressHUD() {
    if (!currentEngine) return;

    if (!progressHUD) {
      progressHUD = document.createElement('div');
      progressHUD.className = 'progress-hud';
      progressHUD.setAttribute('aria-live', 'off');
      vnContainer.appendChild(progressHUD);
    }

    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'story-progress-bar';
      vnContainer.appendChild(progressBar);
    }

    const totalScenes = Object.keys(currentEngine.scenes).length;
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

    progressHUD.innerHTML = `<span>📍 ${visited}/${totalScenes}</span> <span>· Turn ${turns}</span>`;
    progressHUD.title = `${pct}% explored · Turn ${turns}`;
    progressHUD.classList.remove('hidden');

    // Update thin top progress bar
    progressBar.style.width = `${pct}%`;
    progressBar.classList.remove('hidden');
  }

  // ── Skip-Read Logic ──

  function shouldSkipScene(sceneId) {
    return settings.get('skipRead') && currentEngine && currentEngine.state.visited.has(sceneId);
  }

  function updateSkipIndicator(active) {
    if (active) {
      if (!skipIndicator) {
        skipIndicator = document.createElement('div');
        skipIndicator.className = 'skip-indicator';
        skipIndicator.innerHTML = '⏭ SKIP';
        vnContainer.appendChild(skipIndicator);
      }
      skipIndicator.classList.remove('hidden');
      if (autoPlayIndicator) autoPlayIndicator.classList.add('hidden');
    } else if (skipIndicator) {
      skipIndicator.classList.add('hidden');
      if (settings.get('autoPlay') && autoPlayIndicator) autoPlayIndicator.classList.remove('hidden');
    }
  }

  // ── Load Stories ──

  async function loadStoryIndex() {
    const base = storyBasePath();
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
          return { slug, title: parsed.title || slug, description: parsed.description || '', _raw: text, _parsed: parsed };
        } catch (err) {
          console.warn(`[NyanTales] Failed to load story: ${slug}`, err);
          return null;
        }
      })
    );
    storyIndex = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    return storyIndex;
  }

  // ── Core Scene Playback ──

  /**
   * Play a scene: record history, apply skip/fast mode, render, auto-save, schedule next.
   * This is the central heartbeat of the game loop.
   */
  async function playScene(scene) {
    if (!scene || !currentEngine) return;

    const sceneId = currentEngine.state.currentScene;
    textHistory.add(sceneId, scene.speaker, scene.text);

    // Suppress shake/glitch if disabled in settings
    const origEffect = scene.effect;
    if (!settings.get('screenShake') && (scene.effect === 'glitch' || scene.effect === 'shake')) {
      scene.effect = null;
    }

    // Skip-read: temporarily enable fast mode for visited scenes
    const wasInFastMode = ui.fastMode;
    if (shouldSkipScene(sceneId) && !scene.ending) {
      ui.fastMode = true;
      updateSkipIndicator(true);
    } else {
      updateSkipIndicator(false);
    }

    await ui.renderScene(scene, currentEngine);

    // Update audio theme to match background
    if (audio.enabled) audio.setTheme(ui._lastBgClass);

    // Restore fast mode if we forced it
    if (!wasInFastMode && shouldSkipScene(sceneId)) {
      ui.fastMode = wasInFastMode;
    }
    scene.effect = origEffect;

    // Auto-save after each scene and record visited scenes for progress tracking
    if (currentSlug) {
      saveManager.autoSave(currentSlug, currentEngine, scene);
      tracker.recordVisitedScenes(currentSlug, currentEngine.state.visited);
    }

    // Update in-game progress HUD
    updateProgressHUD();

    // Handle endings
    if (scene.ending) return;

    // Skip-read auto-advance through visited no-choice scenes
    const choices = currentEngine.getAvailableChoices();
    if (choices.length === 0 && scene.next && shouldSkipScene(sceneId)) {
      await new Promise(r => setTimeout(r, 50));
      const nextScene = currentEngine.goToScene(scene.next);
      return playScene(nextScene);
    }

    updateRewindButton();
    scheduleAutoAdvance();
  }

  // ── Start / Restart Story ──

  function initEngine(parsed) {
    currentEngine = new StoryEngine(parsed);
    textHistory.clear();
    ui.typewriterSpeed = settings.get('textSpeed');

    // Wire choice handler
    ui.onChoice(choice => {
      clearAutoPlayTimer();
      const nextScene = currentEngine.goToScene(choice.goto, choice);
      playScene(nextScene);
    });

    // Wire ending detection (track + show)
    ui._onEndingHook = (scene, engine) => {
      clearAutoPlayTimer();
      updateSkipIndicator(false);

      // Record reading time to tracker for persistent stats
      const sessionElapsed = storyStartTime ? Date.now() - storyStartTime : 0;
      if (currentSlug && sessionElapsed > 0) {
        tracker.recordReadingTime(currentSlug, sessionElapsed);
        storyStartTime = null; // prevent double-counting on menu return
      }

      // Inject reading time into ending stats grid
      if (sessionElapsed > 0) {
        const timeStr = StoryTracker.formatDuration(sessionElapsed);
        const statsGrid = document.getElementById('ending-stats-grid');
        if (statsGrid) {
          const timeBox = document.createElement('div');
          timeBox.className = 'ending-stat-box';
          timeBox.innerHTML = `<span class="ending-stat-value">⏱ ${timeStr}</span><span class="ending-stat-label">Reading Time</span>`;
          statsGrid.insertBefore(timeBox, statsGrid.firstChild);
        }
      }

      const result = tracker.recordEnding(currentSlug, scene.ending, engine.state.turns);

      if (result.isNewEnding) {
        // Insert "new ending" badge directly into the ending overlay (already rendered at this point)
        const endingEl = document.getElementById('vn-ending');
        if (endingEl) {
          const badge = document.createElement('div');
          badge.className = 'new-ending-badge';
          badge.textContent = '✨ New Ending Discovered!';
          endingEl.appendChild(badge);
        }
      }

      const newAch = achievements.checkAll();
      if (newAch.length > 0) {
        setTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }

      // In campaign mode, add a "Next Chapter" button to the ending overlay
      if (campaignMode) {
        const endingEl = document.getElementById('vn-ending');
        if (endingEl) {
          const nextBtn = document.createElement('button');
          nextBtn.className = 'campaign-btn campaign-btn-ending';
          nextBtn.textContent = campaign.isComplete() ? '🏠 Return Home' : '▶ Next Chapter';
          nextBtn.addEventListener('click', () => onCampaignEnding());
          // Insert before the restart/menu buttons
          const actionsRow = endingEl.querySelector('.ending-actions');
          if (actionsRow) {
            actionsRow.insertBefore(nextBtn, actionsRow.firstChild);
          } else {
            endingEl.appendChild(nextBtn);
          }
        }
      }
    };

    // Wire restart + menu
    ui.onRestart(() => {
      if (campaignMode) {
        // In campaign mode, restart replays current chapter
        initEngine(parsed);
        if (currentEngine) campaign.applyPersistentState(currentEngine);
        ui.showStoryScreen();
        updateAutoPlayHUD(settings.get('autoPlay'));
        playScene(currentEngine.getCurrentScene());
        return;
      }
      initEngine(parsed);
      ui.showStoryScreen();
      updateAutoPlayHUD(settings.get('autoPlay'));
      playScene(currentEngine.getCurrentScene());
    });

    ui.onMenu(() => {
      if (campaignMode) campaignMode = false;
      returnToMenu();
    });
  }

  async function startStory(story, savedState) {
    currentSlug = story.slug;
    storyStartTime = Date.now();
    document.title = `${story.title} — NyanTales`;
    ui.setStorySlug(story.slug);

    initEngine(story._parsed);

    // If loading a saved state, restore it
    if (savedState) {
      try { currentEngine.loadState(savedState); } catch (e) { console.warn('Failed to load save:', e); }
    }

    // Show story intro splash (skip for loaded saves — player already knows the story)
    if (!savedState) {
      await StoryIntro.show(story, ui.portraits);
    }

    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    showKeyboardHints();

    const firstScene = currentEngine.getCurrentScene();
    await playScene(firstScene);

    // Check achievements on story start
    const startAch = achievements.checkAll();
    if (startAch.length > 0) {
      setTimeout(() => achievements.showNewUnlocks(startAch), 1500);
    }
  }

  function returnToMenu() {
    // Record reading time before clearing state
    if (currentSlug && storyStartTime) {
      tracker.recordReadingTime(currentSlug, Date.now() - storyStartTime);
    }

    clearAutoPlayTimer();
    currentEngine = null;
    currentSlug = null;
    storyStartTime = null;
    _lastProgressPct = -1;
    _lastProgressTurns = -1;
    document.title = APP_TITLE;
    ui.setStorySlug(null);
    audio.stop();
    textHistory.clear();
    updateSkipIndicator(false);
    if (sceneSelect.isVisible) sceneSelect.hide();
    if (autoPlayIndicator) autoPlayIndicator.classList.add('hidden');
    if (progressHUD) progressHUD.classList.add('hidden');
    if (progressBar) progressBar.classList.add('hidden');
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
    return slug ? storyIndex.find(s => s.slug === slug) : null;
  }

  /** Start a story from a card click (shared by click + keydown delegation) */
  function selectStoryCard(card) {
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
      if (story) storyInfo.show(story, CHARACTER_DATA[story.slug] || []);
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
   * Compute reading-time estimate and scene count for a story.
   * @param {Object} story - Story index entry with _parsed data
   * @returns {{ sceneCount: number, readMins: number, wordCount: number }}
   */
  function getStoryMeta(story) {
    const scenes = story._parsed?.scenes;
    const sceneCount = scenes ? Object.keys(scenes).length : 0;
    const wordCount = scenes
      ? Object.values(scenes).reduce((sum, s) => sum + ((s.text || '').split(/\s+/).length), 0)
      : 0;
    const readMins = Math.max(1, Math.ceil(wordCount / 200));
    return { sceneCount, readMins, wordCount };
  }

  /**
   * Decorate a freshly-created story card with badges, progress, meta, and buttons.
   * Separated from renderTitleScreen for clarity — called once per card.
   * @param {HTMLElement} card - The story card DOM element
   * @param {Object} story - Story index entry
   */
  function decorateStoryCard(card, story) {
    const completed = tracker.isCompleted(story.slug);
    const endings = tracker.endingCount(story.slug);
    const { sceneCount, readMins } = getStoryMeta(story);

    // Completion badge
    if (completed) {
      card.classList.add('completed');
      const badge = document.createElement('div');
      badge.className = 'story-card-badge';
      badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
      card.appendChild(badge);
    }

    // Save indicator
    if (saveManager.hasSave(story.slug)) {
      const saveIcon = document.createElement('div');
      saveIcon.className = completed
        ? 'story-card-badge story-card-save-badge save-badge-bottom'
        : 'story-card-badge story-card-save-badge';
      saveIcon.textContent = '💾';
      card.appendChild(saveIcon);
    }

    // Progress bar (actual visited scenes)
    if (sceneCount > 0) {
      const pct = tracker.getProgress(story.slug, sceneCount);
      const bar = document.createElement('div');
      bar.className = 'story-card-progress';
      bar.innerHTML = `<div class="story-card-progress-fill" style="width:${pct}%"></div>`;
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuenow', pct);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-label', `${pct}% explored`);
      card.appendChild(bar);
    }

    // Meta info (reading time + scene count)
    if (sceneCount > 0 || readMins > 0) {
      const metaEl = document.createElement('div');
      metaEl.className = 'story-card-meta';
      metaEl.innerHTML = `<span>⏱ ~${readMins} min</span><span>📄 ${sceneCount} scenes</span>`;
      const textContainer = card.querySelector('.story-card-text');
      if (textContainer) textContainer.appendChild(metaEl);
    }

    // Info button (ℹ) — click handled by grid delegation
    const infoBtn = document.createElement('button');
    infoBtn.className = 'story-card-info-btn';
    infoBtn.textContent = 'ℹ';
    infoBtn.title = 'Story details';
    infoBtn.setAttribute('aria-label', `Details for ${story.title}`);
    card.appendChild(infoBtn);

    // Favorite button (heart) — click handled by grid delegation
    const isFav = tracker.isFavorite(story.slug);
    const favBtn = document.createElement('button');
    favBtn.className = 'story-card-fav-btn';
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    favBtn.setAttribute('aria-label', isFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
    favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    card.appendChild(favBtn);

    // Data attributes for filtering/sorting
    card.dataset.slug = story.slug;
    card.dataset.title = story.title.toLowerCase();
    card.dataset.desc = (story.description || '').toLowerCase();
    card.dataset.completed = completed ? '1' : '0';
    card.dataset.favorite = isFav ? '1' : '0';
    card.dataset.readMins = readMins;
    card.dataset.progress = sceneCount > 0 ? tracker.getProgress(story.slug, sceneCount) : 0;
    card.dataset.lastPlayed = tracker.getStory(story.slug).lastPlayed || 0;
  }

  /**
   * Render (or re-render) the title screen.
   * Uses ui.renderStoryList to create fresh cards, then decorates them once.
   * Safe to call multiple times (no duplicate badges/buttons).
   */
  function renderTitleScreen() {
    const stats = tracker.getStats();
    const achStats = achievements.getStats();
    const totalTime = StoryTracker.formatDuration(tracker.getTotalReadingMs());
    statsEl.innerHTML = `
      <div class="stat">📖 <span class="stat-value">${stats.storiesCompleted}</span>/${storyIndex.length} complete</div>
      <div class="stat">🔮 <span class="stat-value">${stats.totalEndings}</span> endings found</div>
      <div class="stat">🎮 <span class="stat-value">${stats.totalPlays}</span> plays</div>
      <div class="stat">🏆 <span class="stat-value">${achStats.unlocked}</span>/${achStats.total}</div>
      ${tracker.getTotalReadingMs() > 0 ? `<div class="stat">⏱ <span class="stat-value">${totalTime}</span> reading</div>` : ''}
    `;

    updateCampaignButton();
    renderChapterGrid();
  }

  // ── Continue Button ──

  function updateContinueButton() {
    const btn = document.getElementById('btn-continue');
    const recent = saveManager.getMostRecentSave();

    if (recent && btn) {
      const story = storyIndex.find(s => s.slug === recent.slug);
      const title = story ? story.title : recent.slug;
      btn.innerHTML = `▶ Continue<span class="continue-meta">${title} · ${recent.turns} turns</span>`;
      btn.classList.remove('hidden');
    } else if (btn) {
      btn.classList.add('hidden');
    }
  }

  // btn-continue click is handled by title-actions event delegation above

  // ── Search, Filter & Sort ──

  const filterInput = document.getElementById('filter-input');
  const filterTagsContainer = document.querySelector('.filter-tags');
  const sortSelect = document.getElementById('sort-select');

  // Debounced search input for smoother performance with 30 cards
  let _filterTimer = null;
  filterInput?.addEventListener('input', () => {
    if (_filterTimer) clearTimeout(_filterTimer);
    _filterTimer = setTimeout(() => applyFilter(), 80);
  });

  // Single delegated listener on filter tags container (replaces 4 individual listeners)
  filterTagsContainer?.addEventListener('click', (e) => {
    const tag = e.target.closest('.filter-tag');
    if (!tag) return;
    filterTagsContainer.querySelectorAll('.filter-tag').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tag.classList.add('active');
    tag.setAttribute('aria-selected', 'true');
    activeFilter = tag.dataset.filter;
    applyFilter();
  });

  sortSelect?.addEventListener('change', () => {
    activeSort = sortSelect.value;
    applySortToGrid();
  });

  // Cached card list — refreshed in renderTitleScreen, reused by filter/sort
  let _cachedCards = null;
  function getStoryCards() {
    if (!_cachedCards || _cachedCards.length === 0) {
      _cachedCards = [...storyGrid.querySelectorAll('.story-card')];
    }
    return _cachedCards;
  }

  function applyFilter() {
    const query = (filterInput.value || '').toLowerCase().trim();
    const cards = getStoryCards();

    let visibleCount = 0;
    cards.forEach(card => {
      let show = true;

      if (query) {
        const matchTitle = card.dataset.title?.includes(query);
        const matchDesc = card.dataset.desc?.includes(query);
        const matchSlug = card.dataset.slug?.includes(query);
        if (!matchTitle && !matchDesc && !matchSlug) show = false;
      }

      if (show && activeFilter === 'completed') {
        if (card.dataset.completed !== '1') show = false;
      } else if (show && activeFilter === 'new') {
        if (card.dataset.completed === '1') show = false;
      } else if (show && activeFilter === 'favorites') {
        if (card.dataset.favorite !== '1') show = false;
      }

      card.classList.toggle('hidden-by-filter', !show);
      if (show) visibleCount++;
    });

    // Update result count indicator
    let countEl = document.getElementById('filter-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.id = 'filter-count';
      countEl.className = 'filter-count';
      filterInput.parentElement.appendChild(countEl);
    }
    if (query || activeFilter !== 'all') {
      countEl.textContent = `${visibleCount} stor${visibleCount === 1 ? 'y' : 'ies'}`;
      countEl.classList.remove('hidden');
    } else {
      countEl.classList.add('hidden');
    }

    // Show/hide empty state message
    let emptyEl = document.getElementById('filter-empty');
    if (visibleCount === 0 && (query || activeFilter !== 'all')) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.id = 'filter-empty';
        emptyEl.className = 'filter-empty';
        storyGrid.parentElement.appendChild(emptyEl);
      }
      const hint = activeFilter === 'favorites' ? 'Tap 🤍 on a story card to favorite it!'
        : activeFilter === 'completed' ? 'No stories completed yet — start playing!'
        : 'No matches found. Try a different search.';
      emptyEl.innerHTML = `<span class="filter-empty-icon">🐱</span><span>${hint}</span>`;
      emptyEl.classList.remove('hidden');
    } else if (emptyEl) {
      emptyEl.classList.add('hidden');
    }
  }

  /**
   * Sort story cards in the DOM by reordering elements.
   * Uses CSS order property for smooth re-sorting without re-rendering.
   */
  function applySortToGrid() {
    const cards = [...getStoryCards()];

    cards.sort((a, b) => {
      switch (activeSort) {
        case 'title-asc':
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        case 'title-desc':
          return (b.dataset.title || '').localeCompare(a.dataset.title || '');
        case 'recent': {
          const aTime = parseFloat(a.dataset.lastPlayed || '0');
          const bTime = parseFloat(b.dataset.lastPlayed || '0');
          return bTime - aTime; // most recent first
        }
        case 'progress': {
          const aPct = parseFloat(a.dataset.progress || '0');
          const bPct = parseFloat(b.dataset.progress || '0');
          return bPct - aPct; // most progress first
        }
        case 'time-short': {
          const aMin = parseInt(a.dataset.readMins || '0');
          const bMin = parseInt(b.dataset.readMins || '0');
          return aMin - bMin;
        }
        case 'time-long': {
          const aMin = parseInt(a.dataset.readMins || '0');
          const bMin = parseInt(b.dataset.readMins || '0');
          return bMin - aMin;
        }
        case 'favorites': {
          const aFav = a.dataset.favorite === '1' ? 1 : 0;
          const bFav = b.dataset.favorite === '1' ? 1 : 0;
          if (bFav !== aFav) return bFav - aFav;
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        }
        default:
          return 0;
      }
    });

    // Reorder DOM elements
    cards.forEach(card => storyGrid.appendChild(card));
  }

  // ── Click/Tap to Advance ──

  textboxEl.addEventListener('click', () => {
    if (ui.isTyping) ui.skipTypewriter();
  });

  // ── Touch Gestures (mobile) ──
  const touch = new TouchHandler(vnContainer, {
    onAdvance: () => {
      if (ui.isTyping) {
        ui.skipTypewriter();
      } else if (currentEngine) {
        const scene = currentEngine.getCurrentScene();
        if (scene && scene.next && currentEngine.getAvailableChoices().length === 0 && !scene.ending) {
          clearAutoPlayTimer();
          const next = currentEngine.goToScene(scene.next);
          playScene(next);
        }
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
    const isSearchFocused = filterInput?.matches(':focus') ?? false;

    if (e.key === 'Escape') {
      // Close the topmost open panel (priority: lightweight overlays first, then core panels)
      const panelCloseOrder = [
        keyboardHelp, aboutPanel, achPanel, statsDashboard, storyInfo,
        routeMap, saveManager, settingsPanel, historyPanel, sceneSelect
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
      } else if (currentEngine) {
        // Advance to next scene when no choices and not at an ending
        const scene = currentEngine.getCurrentScene();
        if (scene && scene.next && currentEngine.getAvailableChoices().length === 0 && !scene.ending) {
          clearAutoPlayTimer();
          const next = currentEngine.goToScene(scene.next);
          playScene(next);
        }
      }
    }

    // Number keys for choices
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const btns = ui.choicesEl.querySelectorAll('.choice-btn');
      if (btns[idx]) btns[idx].click();
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
  const titleBg    = document.querySelector('.title-bg');

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
    const story = storyIndex.find(s => s.slug === slug);
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
        const story = storyIndex.find(s => s.slug === recent.slug);
        if (!story) return;
        ensureAudio();
        startStory(story, recent.state);
        break;
      }
      case 'btn-random': {
        if (storyIndex.length === 0) return;
        const unplayed = storyIndex.filter(s => !tracker.isCompleted(s.slug));
        const pool = unplayed.length > 0 ? unplayed : storyIndex;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        ensureAudio();
        startStory(pick);
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

  /** Show or hide the loading screen with progress */
  function updateLoadingProgress(pct, text) {
    const fill = document.querySelector('.loading-bar-fill');
    const label = document.querySelector('.loading-text');
    if (fill) fill.style.width = `${pct}%`;
    if (label && text) label.textContent = text;
  }

  function hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 600);
    }
    if (app) app.removeAttribute('aria-hidden');
  }

  /** Show keyboard shortcut hints on first visit to story screen */
  function showKeyboardHints() {
    if (localStorage.getItem('nyantales-hints-shown')) return;
    localStorage.setItem('nyantales-hints-shown', '1');
    // Brief toast pointing to full help
    Toast.show('Press ? for keyboard shortcuts', { icon: '⌨️', duration: 4000 });
  }

  async function boot() {
    try {
      updateLoadingProgress(10, 'Initializing...');
      updateLoadingProgress(30, 'Loading stories...');
      await loadStoryIndex();
      updateLoadingProgress(60, 'Loading campaign...');
      try {
        await campaign.load(storyBasePath());
        campaign.loadProgress();
      } catch (e) {
        console.warn('Campaign data not available:', e);
      }
      updateLoadingProgress(80, 'Rendering...');
      renderTitleScreen();
      updateLoadingProgress(100, 'Ready!');

      // Brief pause for visual satisfaction
      await new Promise(r => setTimeout(r, 300));
      hideLoadingScreen();
      ui.showTitleScreen();
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
      const story = storyIndex.find(s => s.slug === ch.story);
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
    campaign.advance(currentEngine);
    // Small delay before advancing to next phase for pacing
    setTimeout(() => playCampaignPhase(), 500);
  }

  /** Update campaign button text on title screen. */
  function updateCampaignButton() {
    const btn = document.getElementById('btn-campaign');
    if (!btn || !campaign.isLoaded) return;
    const label = campaign.getProgressLabel();
    if (campaign.isComplete()) {
      btn.innerHTML = '📖 Campaign <span class="campaign-meta">Complete! ✨</span>';
    } else if (label) {
      btn.innerHTML = `📖 Continue Campaign<span class="campaign-meta">${label}</span>`;
    } else {
      btn.textContent = '📖 Campaign';
    }
  }

  // ── Chapter Grid ──

  /** Determine if a chapter index is unlocked (reachable) */
  function isChapterUnlocked(chapterIndex) {
    if (!campaign.isLoaded || !campaign.progress.started) return chapterIndex === 0;
    return chapterIndex <= campaign.progress.chapterIndex ||
      campaign.progress.completedChapters.includes(chapterIndex);
  }

  /** Render the campaign chapter grid grouped by act. */
  function renderChapterGrid() {
    const grid = document.getElementById('chapter-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!campaign.isLoaded) {
      grid.innerHTML = '<p class="chapter-grid-empty">Campaign data unavailable.</p>';
      return;
    }

    const chapters = campaign.chapters;
    const acts = campaign.manifest?.acts || [];
    const currentIdx = campaign.progress.chapterIndex;
    const isStarted = campaign.progress.started;

    // Build act → chapters mapping
    const actMap = {};
    acts.forEach(act => { actMap[act.id] = []; });

    chapters.forEach((ch, idx) => {
      if (!actMap[ch.act]) actMap[ch.act] = [];
      actMap[ch.act].push({ ch, idx });
    });

    acts.forEach(act => {
      const items = actMap[act.id] || [];
      if (!items.length) return;

      const section = document.createElement('div');
      section.className = 'act-section';

      const header = document.createElement('div');
      header.className = 'act-header';
      header.innerHTML = `<span class="act-title">${act.title}</span><span class="act-subtitle">${act.subtitle || ''}</span>`;
      section.appendChild(header);

      const cards = document.createElement('div');
      cards.className = 'chapter-cards';

      items.forEach(({ ch, idx }) => {
        const unlocked = isChapterUnlocked(idx);
        const completed = campaign.progress.completedChapters.includes(idx);
        const isCurrent = isStarted && idx === currentIdx && campaign.progress.phase === 'chapter';

        const card = document.createElement('div');
        card.className = 'chapter-card' +
          (unlocked ? ' unlocked' : ' locked') +
          (completed ? ' completed' : '') +
          (isCurrent ? ' current' : '');
        card.dataset.chapterIndex = idx;
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', unlocked ? '0' : '-1');
        card.setAttribute('aria-label', `Chapter ${ch.chapter}: ${ch.title}${unlocked ? '' : ' (locked)'}`);

        const numEl = document.createElement('div');
        numEl.className = 'chapter-num';
        numEl.textContent = `CH ${ch.chapter}`;

        const body = document.createElement('div');
        body.className = 'chapter-body';

        const titleEl = document.createElement('div');
        titleEl.className = 'chapter-title';
        titleEl.textContent = ch.title;

        const descEl = document.createElement('div');
        descEl.className = 'chapter-desc';
        descEl.textContent = ch.description || '';

        body.appendChild(titleEl);
        body.appendChild(descEl);

        const status = document.createElement('div');
        status.className = 'chapter-status';
        if (!unlocked) {
          status.textContent = '🔒';
          status.setAttribute('aria-hidden', 'true');
        } else if (isCurrent) {
          status.textContent = '▶';
        } else if (completed) {
          status.textContent = '✅';
        } else {
          status.textContent = '○';
        }

        card.appendChild(numEl);
        card.appendChild(body);
        card.appendChild(status);
        cards.appendChild(card);
      });

      section.appendChild(cards);
      grid.appendChild(section);
    });
  }

  // ── Chapter Grid Click Delegation ──

  const chapterGrid = document.getElementById('chapter-grid');
  if (chapterGrid) {
    chapterGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.chapter-card');
      if (!card || card.classList.contains('locked')) return;
      const idx = parseInt(card.dataset.chapterIndex, 10);
      if (isNaN(idx)) return;
      ensureAudio();
      startCampaignChapter(idx);
    });
    chapterGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.chapter-card');
      if (!card || card.classList.contains('locked')) return;
      e.preventDefault();
      const idx = parseInt(card.dataset.chapterIndex, 10);
      if (isNaN(idx)) return;
      ensureAudio();
      startCampaignChapter(idx);
    });
  }

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
    const story = storyIndex.find(s => s.slug === ch.story);
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

  window.addEventListener('online', () => Toast.show('Back online', { icon: '📶', color: 'rgba(0,255,136,0.88)' }));
  window.addEventListener('offline', () => Toast.show('Offline — saves still work!', { icon: '📴', color: 'rgba(255,68,68,0.88)' }));

  // Pause auto-play when tab is hidden (saves CPU / prevents unexpected advances)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearAutoPlayTimer();
    } else if (settings.get('autoPlay') && currentEngine && !isAnyPanelOpen()) {
      scheduleAutoAdvance();
    }
  });

  boot();
})();
