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
  const statsDashboard = new StatsDashboard(tracker, achievements, saveManager, ui.portraits);
  const sceneSelect   = new SceneSelect((sceneId) => {
    if (!currentEngine) return;
    clearAutoPlayTimer();
    updateSkipIndicator(false);
    const scene = currentEngine.jumpToScene(sceneId);
    if (scene) playScene(scene);
    updateRewindButton();
  });

  // Wire story info modal callbacks
  storyInfo.onPlay = (story) => {
    if (!audio.ctx) audio.init();
    startStory(story);
  };
  storyInfo.onLoad = (slug, stateJson) => {
    const story = storyIndex.find(s => s.slug === slug);
    if (story) {
      if (!audio.ctx) audio.init();
      startStory(story, stateJson);
    }
  };

  // Migrate legacy save format to new slot system
  saveManager.migrateLegacy();

  // Preload AI portraits (non-blocking visual improvement)
  await ui.portraits.preloadAll();

  // ── Color Themes (must be before initial settings) ──

  const COLOR_THEMES = {
    cyan:    { accent: '#00d4ff', rgb: '0, 212, 255' },
    magenta: { accent: '#ff36ab', rgb: '255, 54, 171' },
    green:   { accent: '#00ff88', rgb: '0, 255, 136' },
    amber:   { accent: '#ffd700', rgb: '255, 215, 0' },
    violet:  { accent: '#cc66ff', rgb: '204, 102, 255' }
  };

  function applyParticlesSetting(on) {
    document.body.classList.toggle('no-particles', !on);
  }

  function applyFontSize(pct) {
    document.documentElement.style.setProperty('--text-scale', `${pct}%`);
  }

  function applyColorTheme(themeName) {
    const theme = COLOR_THEMES[themeName] || COLOR_THEMES.cyan;
    const root = document.documentElement;
    root.style.setProperty('--accent-cyan', theme.accent);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.accent);
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
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  let storyIndex   = [];
  let currentEngine = null;
  let currentSlug   = null;
  let activeFilter  = 'all';
  let activeSort    = 'title-asc';

  // ── Auto-play State ──

  let autoPlayTimer     = null;
  let autoPlayIndicator = null;
  let skipIndicator     = null;

  function clearAutoPlayTimer() {
    if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
  }

  function scheduleAutoAdvance() {
    clearAutoPlayTimer();
    if (!settings.get('autoPlay') || !currentEngine) return;

    const scene = currentEngine.getCurrentScene();
    if (!scene || scene.ending) return;
    if (currentEngine.getAvailableChoices().length > 0) return;

    autoPlayTimer = setTimeout(() => {
      if (!currentEngine) return;
      const s = currentEngine.getCurrentScene();
      if (s && s.next) {
        const next = currentEngine.goToScene(s.next);
        playScene(next);
      }
    }, settings.get('autoPlayDelay'));
  }

  function updateAutoPlayHUD(on) {
    const btn = document.getElementById('btn-auto');
    btn.style.opacity = on ? '1' : '0.5';
    btn.title = on ? 'Auto-Play ON (A)' : 'Auto-Play OFF (A)';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');

    if (on) {
      if (!autoPlayIndicator) {
        autoPlayIndicator = document.createElement('div');
        autoPlayIndicator.className = 'auto-play-indicator';
        autoPlayIndicator.innerHTML = '<div class="auto-play-dot"></div> AUTO';
        document.querySelector('.vn-container').appendChild(autoPlayIndicator);
      }
      autoPlayIndicator.style.display = '';
    } else if (autoPlayIndicator) {
      autoPlayIndicator.style.display = 'none';
    }
  }

  // ── In-Game Progress HUD ──

  let progressHUD = null;

  function updateProgressHUD() {
    if (!currentEngine) return;

    if (!progressHUD) {
      progressHUD = document.createElement('div');
      progressHUD.className = 'progress-hud';
      progressHUD.setAttribute('aria-live', 'off');
      document.querySelector('.vn-container').appendChild(progressHUD);
    }

    const totalScenes = Object.keys(currentEngine.scenes).length;
    const visited = currentEngine.state.visited.size;
    const pct = totalScenes > 0 ? Math.round((visited / totalScenes) * 100) : 0;

    progressHUD.innerHTML = `<span>📍 ${visited}/${totalScenes}</span> <span>· Turn ${currentEngine.state.turns}</span>`;
    progressHUD.title = `${pct}% explored · Turn ${currentEngine.state.turns}`;
    progressHUD.style.display = '';
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
        document.querySelector('.vn-container').appendChild(skipIndicator);
      }
      skipIndicator.style.display = '';
      if (autoPlayIndicator) autoPlayIndicator.style.display = 'none';
    } else if (skipIndicator) {
      skipIndicator.style.display = 'none';
      if (settings.get('autoPlay') && autoPlayIndicator) autoPlayIndicator.style.display = '';
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

      const result = tracker.recordEnding(currentSlug, scene.ending, engine.state.turns);

      if (result.isNewEnding) {
        // Insert "new ending" badge after the ending renders
        setTimeout(() => {
          const endingEl = document.getElementById('vn-ending');
          if (!endingEl) return;
          const badge = document.createElement('div');
          badge.className = 'new-ending-badge';
          badge.textContent = '✨ New Ending Discovered!';
          badge.style.cssText = 'color:var(--accent-yellow);font-family:var(--font-mono);font-size:0.75rem;margin-top:0.5rem;animation:fadeIn 0.5s ease';
          endingEl.appendChild(badge);
        }, 100);
      }

      const newAch = achievements.checkAll();
      if (newAch.length > 0) {
        setTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }
    };

    // Wire restart + menu
    ui.onRestart(() => {
      initEngine(parsed);
      ui.showStoryScreen();
      updateAutoPlayHUD(settings.get('autoPlay'));
      playScene(currentEngine.getCurrentScene());
    });

    ui.onMenu(() => returnToMenu());
  }

  async function startStory(story, savedState) {
    currentSlug = story.slug;
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
    clearAutoPlayTimer();
    currentEngine = null;
    currentSlug = null;
    ui.setStorySlug(null);
    audio.stop();
    textHistory.clear();
    updateSkipIndicator(false);
    if (sceneSelect.isVisible) sceneSelect.hide();
    if (autoPlayIndicator) autoPlayIndicator.style.display = 'none';
    if (progressHUD) progressHUD.style.display = 'none';
    ui.showTitleScreen();
    renderTitleScreen();
  }

  // ── Title Screen Rendering ──

  /**
   * Render (or re-render) the title screen.
   * Uses ui.renderStoryList to create fresh cards, then decorates them once.
   * Safe to call multiple times (no duplicate badges/buttons).
   */
  function renderTitleScreen() {
    const stats = tracker.getStats();
    const achStats = achievements.getStats();
    const statsEl = document.getElementById('title-stats');
    statsEl.innerHTML = `
      <div class="stat">📖 <span class="stat-value">${stats.storiesCompleted}</span>/${storyIndex.length} complete</div>
      <div class="stat">🔮 <span class="stat-value">${stats.totalEndings}</span> endings found</div>
      <div class="stat">🎮 <span class="stat-value">${stats.totalPlays}</span> plays</div>
      <div class="stat">🏆 <span class="stat-value">${achStats.unlocked}</span>/${achStats.total}</div>
    `;

    // renderStoryList clears the grid and creates fresh cards — no duplicate risk
    ui.renderStoryList(storyIndex, (story) => {
      if (!audio.ctx) audio.init();
      startStory(story);
    });

    // Decorate each freshly-created card
    const cards = document.querySelectorAll('.story-card');
    storyIndex.forEach((story, idx) => {
      const card = cards[idx];
      if (!card) return;

      const completed = tracker.isCompleted(story.slug);
      const endings = tracker.endingCount(story.slug);
      const sceneCount = story._parsed?.scenes ? Object.keys(story._parsed.scenes).length : 0;

      // Reading time estimate (word count across all scenes, ~200 wpm)
      const wordCount = story._parsed?.scenes
        ? Object.values(story._parsed.scenes).reduce((sum, s) => sum + ((s.text || '').split(/\s+/).length), 0)
        : 0;
      const readMins = Math.max(1, Math.ceil(wordCount / 200));

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
        saveIcon.className = 'story-card-badge story-card-save-badge';
        saveIcon.style.cssText = completed
          ? 'top:auto;bottom:6px;color:var(--accent-cyan);'
          : 'color:var(--accent-cyan);';
        saveIcon.textContent = '💾';
        card.appendChild(saveIcon);
      }

      // Progress bar (actual visited scenes)
      if (sceneCount > 0) {
        const pct = tracker.getProgress(story.slug, sceneCount);
        const progressBar = document.createElement('div');
        progressBar.className = 'story-card-progress';
        progressBar.innerHTML = `<div class="story-card-progress-fill" style="width:${pct}%"></div>`;
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuenow', pct);
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-label', `${pct}% explored`);
        card.appendChild(progressBar);
      }

      // Meta info (reading time + scene count)
      if (sceneCount > 0 || readMins > 0) {
        const metaEl = document.createElement('div');
        metaEl.className = 'story-card-meta';
        metaEl.innerHTML = `<span>⏱ ~${readMins} min</span><span>📄 ${sceneCount} scenes</span>`;
        const textContainer = card.querySelector('.story-card-text');
        if (textContainer) textContainer.appendChild(metaEl);
      }

      // Info button (ℹ) — story detail modal
      const infoBtn = document.createElement('button');
      infoBtn.className = 'story-card-info-btn';
      infoBtn.textContent = 'ℹ';
      infoBtn.title = 'Story details';
      infoBtn.setAttribute('aria-label', `Details for ${story.title}`);
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        storyInfo.show(story, CHARACTER_DATA[story.slug] || []);
      });
      card.appendChild(infoBtn);

      // Favorite button (heart)
      const isFav = tracker.isFavorite(story.slug);
      const favBtn = document.createElement('button');
      favBtn.className = 'story-card-fav-btn';
      favBtn.textContent = isFav ? '❤️' : '🤍';
      favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
      favBtn.setAttribute('aria-label', isFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
      favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowFav = tracker.toggleFavorite(story.slug);
        favBtn.textContent = nowFav ? '❤️' : '🤍';
        favBtn.title = nowFav ? 'Remove from favorites' : 'Add to favorites';
        favBtn.setAttribute('aria-pressed', nowFav ? 'true' : 'false');
        favBtn.setAttribute('aria-label', nowFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
        card.dataset.favorite = nowFav ? '1' : '0';
        Toast.show(nowFav ? 'Added to favorites' : 'Removed from favorites', { icon: nowFav ? '❤️' : '💔', duration: 1500 });
      });
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
    });

    // "Continue" button — shows if there's a recent save
    updateContinueButton();

    applyFilter();
    applySortToGrid();
  }

  // ── Continue Button ──

  function updateContinueButton() {
    const btn = document.getElementById('btn-continue');
    const recent = saveManager.getMostRecentSave();

    if (recent) {
      const story = storyIndex.find(s => s.slug === recent.slug);
      const title = story ? story.title : recent.slug;
      btn.innerHTML = `▶ Continue<span class="continue-meta">${title} · ${recent.turns} turns</span>`;
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  document.getElementById('btn-continue').addEventListener('click', () => {
    const recent = saveManager.getMostRecentSave();
    if (!recent) return;
    const story = storyIndex.find(s => s.slug === recent.slug);
    if (!story) return;
    if (!audio.ctx) audio.init();
    startStory(story, recent.state);
  });

  // ── Search, Filter & Sort ──

  const filterInput = document.getElementById('filter-input');
  const filterTags = document.querySelectorAll('.filter-tag');
  const sortSelect = document.getElementById('sort-select');

  // Debounced search input for smoother performance with 30 cards
  let _filterTimer = null;
  filterInput.addEventListener('input', () => {
    if (_filterTimer) clearTimeout(_filterTimer);
    _filterTimer = setTimeout(() => applyFilter(), 80);
  });
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tag.classList.add('active');
      tag.setAttribute('aria-selected', 'true');
      activeFilter = tag.dataset.filter;
      applyFilter();
    });
  });

  sortSelect.addEventListener('change', () => {
    activeSort = sortSelect.value;
    applySortToGrid();
  });

  function applyFilter() {
    const query = (filterInput.value || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.story-card');

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
      countEl.style.display = '';
    } else {
      countEl.style.display = 'none';
    }
  }

  /**
   * Sort story cards in the DOM by reordering elements.
   * Uses CSS order property for smooth re-sorting without re-rendering.
   */
  function applySortToGrid() {
    const grid = document.getElementById('story-list');
    const cards = [...grid.querySelectorAll('.story-card')];

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
    cards.forEach(card => grid.appendChild(card));
  }

  // ── Click/Tap to Advance ──

  document.getElementById('vn-textbox').addEventListener('click', () => {
    if (ui.isTyping) ui.skipTypewriter();
  });

  // ── Touch Gestures (mobile) ──

  const vnContainer = document.querySelector('.vn-container');
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
    }
  });

  // ── Keyboard Shortcuts ──

  document.addEventListener('keydown', (e) => {
    const isSearchFocused = filterInput.matches(':focus');

    if (e.key === 'Escape') {
      if (keyboardHelp.isVisible)   { keyboardHelp.hide(); return; }
      if (aboutPanel.isVisible)     { aboutPanel.hide(); return; }
      if (statsDashboard.isVisible) { statsDashboard.hide(); return; }
      if (storyInfo.isVisible)      { storyInfo.hide(); return; }
      if (saveManager.isVisible)    { saveManager.hide(); return; }
      if (settingsPanel.isVisible)  { settingsPanel.hide(); return; }
      if (historyPanel.isVisible)   { historyPanel.hide(); return; }
      if (sceneSelect.isVisible)    { sceneSelect.hide(); return; }
      if (currentEngine)            { returnToMenu(); return; }
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
    if (e.key === '?' || (key === '/' && e.shiftKey)) {
      keyboardHelp.isVisible ? keyboardHelp.hide() : keyboardHelp.show();
    }

    if (key === 'a' && noMod && currentEngine) toggleAutoPlay();

    if (key === 'h' && noMod && currentEngine) {
      historyPanel.isVisible ? historyPanel.hide() : historyPanel.show();
    }

    if (key === 'g' && noMod && currentEngine) {
      sceneSelect.isVisible
        ? sceneSelect.hide()
        : sceneSelect.show(currentEngine, currentEngine.state.currentScene);
    }

    if (key === 'f' && noMod && currentEngine) {
      const fs = !settings.get('fullscreen');
      settings.set('fullscreen', fs);
    }

    if (key === 's' && noMod) {
      settingsPanel.isVisible ? settingsPanel.hide() : settingsPanel.show();
    }

    // 'Q' for save/load panel
    if (key === 'q' && noMod && currentEngine && currentSlug) {
      saveManager.isVisible ? saveManager.hide() : saveManager.show(currentSlug, currentEngine, 'save');
    }
  });

  // ── Auto-play Toggle ──

  function toggleAutoPlay() {
    const newVal = !settings.get('autoPlay');
    settings.set('autoPlay', newVal);
    if (newVal && currentEngine) scheduleAutoAdvance();
  }

  // ── Audio Toggle ──

  const btnAudio = document.getElementById('btn-audio');
  btnAudio.addEventListener('click', () => {
    if (!audio.ctx) audio.init();
    toggleAudio();
  });

  function toggleAudio() {
    const enabled = audio.toggle();
    btnAudio.textContent = enabled ? '🔊' : '🔇';
    btnAudio.style.opacity = enabled ? '1' : '0.5';
    btnAudio.title = enabled ? 'Audio ON (M)' : 'Audio OFF (M)';
    btnAudio.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    if (enabled && ui._lastBgClass) audio.setTheme(ui._lastBgClass);
  }

  // ── HUD Buttons ──

  ui.btnBack.addEventListener('click', () => returnToMenu());

  // ── HUD Overflow Toggle (mobile) ──

  const hudMoreBtn = document.getElementById('btn-hud-more');
  const hudToolbar = document.querySelector('.vn-hud');
  hudMoreBtn.addEventListener('click', () => {
    hudToolbar.classList.toggle('hud-expanded');
    hudMoreBtn.textContent = hudToolbar.classList.contains('hud-expanded') ? '✕' : '⋯';
  });

  // ── Rewind (Back one scene) ──

  const btnRewind = document.getElementById('btn-rewind');

  function updateRewindButton() {
    const canRewind = currentEngine && currentEngine.state.snapshots.length > 0;
    btnRewind.style.opacity = canRewind ? '0.85' : '0.35';
    btnRewind.disabled = !canRewind;
  }

  function rewindOneScene() {
    if (!currentEngine || currentEngine.state.snapshots.length === 0) return;

    clearAutoPlayTimer();
    updateSkipIndicator(false);

    // Use engine's proper rewind which restores inventory + flags from snapshot
    const prevScene = currentEngine.rewindScene();
    if (prevScene) {
      playScene(prevScene);
    }
    updateRewindButton();
  }

  btnRewind.addEventListener('click', rewindOneScene);

  ui.btnSave.addEventListener('click', () => {
    if (currentEngine && currentSlug) {
      saveManager.show(currentSlug, currentEngine, 'save');
    }
  });

  // Wire save manager's load callback
  saveManager.onLoad = (slug, stateJson) => {
    const story = storyIndex.find(s => s.slug === slug);
    if (story) startStory(story, stateJson);
  };

  ui.btnFast.addEventListener('click', () => {
    const fast = ui.toggleFastMode();
    ui.btnFast.title = fast ? 'Fast Mode ON' : 'Fast Mode OFF';
  });

  document.getElementById('btn-auto').addEventListener('click', () => {
    if (currentEngine) toggleAutoPlay();
  });

  document.getElementById('btn-history').addEventListener('click', () => {
    if (currentEngine) {
      historyPanel.isVisible ? historyPanel.hide() : historyPanel.show();
    }
  });

  document.getElementById('btn-scenes').addEventListener('click', () => {
    if (currentEngine) {
      sceneSelect.isVisible
        ? sceneSelect.hide()
        : sceneSelect.show(currentEngine, currentEngine.state.currentScene);
    }
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPanel.isVisible ? settingsPanel.hide() : settingsPanel.show();
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    keyboardHelp.isVisible ? keyboardHelp.hide() : keyboardHelp.show();
  });

  // ── Random Story ──

  document.getElementById('btn-random').addEventListener('click', () => {
    if (storyIndex.length === 0) return;
    // Prefer unplayed stories, fall back to any
    const unplayed = storyIndex.filter(s => !tracker.isCompleted(s.slug));
    const pool = unplayed.length > 0 ? unplayed : storyIndex;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!audio.ctx) audio.init();
    startStory(pick);
  });

  // ── Stats Dashboard ──

  document.getElementById('btn-stats').addEventListener('click', () => {
    statsDashboard.setStories(storyIndex);
    statsDashboard.onPlay = (story) => {
      if (!audio.ctx) audio.init();
      startStory(story);
    };
    statsDashboard.show();
  });

  // ── About Panel ──

  document.getElementById('btn-about').addEventListener('click', () => {
    const achStats = achievements.getStats();
    // Count unique characters across all stories
    const allChars = new Set();
    Object.values(CHARACTER_DATA).forEach(chars => chars.forEach(c => allChars.add(c.name)));
    aboutPanel.show({
      stories: storyIndex.length,
      characters: allChars.size,
      achievements: `${achStats.unlocked}/${achStats.total}`
    });
  });

  // ── Gallery ──

  document.getElementById('btn-gallery').addEventListener('click', () => {
    gallery.onStoryClick((slug) => {
      const story = storyIndex.find(s => s.slug === slug);
      if (story) { if (!audio.ctx) audio.init(); startStory(story); }
    });
    gallery.show();
  });

  // ── Achievements Panel ──

  const achBtn = document.getElementById('btn-achievements');
  let achOverlay = null;

  achBtn.addEventListener('click', () => {
    if (!achOverlay) {
      achOverlay = document.createElement('div');
      achOverlay.className = 'achievements-overlay';
      document.body.appendChild(achOverlay);
      achOverlay.addEventListener('click', (e) => {
        if (e.target === achOverlay) achOverlay.classList.remove('visible');
      });
    }

    const allAch = achievements.getAll();
    const achStats = achievements.getStats();

    achOverlay.innerHTML = `
      <div class="achievements-panel">
        <div class="achievements-panel-header">
          <div>
            <div class="achievements-panel-title">🏆 Achievements</div>
            <div class="achievements-panel-count">${achStats.unlocked} / ${achStats.total} unlocked</div>
          </div>
          <button class="achievements-panel-close">✕</button>
        </div>
        <div class="achievements-list">
          ${allAch.map(a => `
            <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
              <div class="achievement-item-icon">${a.unlocked ? a.icon : '🔒'}</div>
              <div class="achievement-item-info">
                <div class="achievement-item-name">${a.unlocked ? a.name : '???'}</div>
                <div class="achievement-item-desc">${a.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    achOverlay.querySelector('.achievements-panel-close').addEventListener('click', () => {
      achOverlay.classList.remove('visible');
    });
    requestAnimationFrame(() => achOverlay.classList.add('visible'));
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
      document.getElementById('story-list').innerHTML =
        `<p style="color:var(--accent-red);padding:2rem;font-family:var(--font-mono)" role="alert">
          Error loading stories. Make sure you're serving this from a web server.<br>
          <code>cd /tmp/nyantales && python3 -m http.server 8080</code><br>
          Then open <a href="http://localhost:8080/web/" style="color:var(--accent-cyan)">http://localhost:8080/web/</a>
        </p>`;
    }
  }

  // ── Online/Offline Notifications ──

  // ── Online/Offline Toasts (using centralized Toast system) ──

  window.addEventListener('online', () => Toast.show('Back online', { icon: '📶', color: 'rgba(0,255,136,0.88)' }));
  window.addEventListener('offline', () => Toast.show('Offline — saves still work!', { icon: '📴', color: 'rgba(255,68,68,0.88)' }));

  boot();
})();
