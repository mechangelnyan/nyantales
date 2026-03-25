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

  // Migrate legacy save format to new slot system
  saveManager.migrateLegacy();

  // Preload AI portraits (non-blocking visual improvement)
  await ui.portraits.preloadAll();

  // Apply initial settings
  ui.typewriterSpeed = settings.get('textSpeed');
  applyParticlesSetting(settings.get('particles'));

  // ── Settings Reactivity ──

  settings.onChange((key, value) => {
    if (key === 'textSpeed')   ui.typewriterSpeed = value;
    if (key === 'autoPlay')  { updateAutoPlayHUD(value); if (!value) clearAutoPlayTimer(); }
    if (key === 'particles')   applyParticlesSetting(value);
    if (key === 'audioVolume' && audio.masterGain) {
      audio.masterGain.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.1);
    }
  });

  function applyParticlesSetting(on) {
    document.body.classList.toggle('no-particles', !on);
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

  function storyBasePath() {
    const path = window.location.pathname;
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  let storyIndex   = [];
  let currentEngine = null;
  let currentSlug   = null;
  let activeFilter  = 'all';

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
        const resp = await fetch(`${base}/${slug}/story.yaml`);
        if (!resp.ok) return null;
        const text = await resp.text();
        const parsed = YAMLParser.parse(text);
        return { slug, title: parsed.title || slug, description: parsed.description || '', _raw: text, _parsed: parsed };
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

    // Auto-save after each scene
    if (currentSlug) saveManager.autoSave(currentSlug, currentEngine, scene);

    // Handle endings
    if (scene.ending) return;

    // Skip-read auto-advance through visited no-choice scenes
    const choices = currentEngine.getAvailableChoices();
    if (choices.length === 0 && scene.next && shouldSkipScene(sceneId)) {
      await new Promise(r => setTimeout(r, 50));
      const nextScene = currentEngine.goToScene(scene.next);
      return playScene(nextScene);
    }

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

    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));

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
    if (autoPlayIndicator) autoPlayIndicator.style.display = 'none';
    ui.showTitleScreen();
    renderTitleScreen();
  }

  // ── Title Screen Rendering ──

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

    ui.renderStoryList(storyIndex, (story) => {
      if (!audio.ctx) audio.init();
      startStory(story);
    });

    // Decorate cards with completion info
    const cards = document.querySelectorAll('.story-card');
    storyIndex.forEach((story, idx) => {
      const card = cards[idx];
      if (!card) return;

      const completed = tracker.isCompleted(story.slug);
      const endings = tracker.endingCount(story.slug);

      if (completed) {
        card.classList.add('completed');
        const badge = document.createElement('div');
        badge.className = 'story-card-badge';
        badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
        card.appendChild(badge);
      }

      // Add save indicator
      if (saveManager.hasSave(story.slug)) {
        const saveIcon = document.createElement('div');
        saveIcon.className = 'story-card-badge';
        saveIcon.style.cssText = completed
          ? 'top:auto;bottom:6px;color:var(--accent-cyan);'
          : 'color:var(--accent-cyan);';
        saveIcon.textContent = '💾';
        card.appendChild(saveIcon);
      }

      card.dataset.slug = story.slug;
      card.dataset.title = story.title.toLowerCase();
      card.dataset.desc = (story.description || '').toLowerCase();
      card.dataset.completed = completed ? '1' : '0';
    });

    // "Continue" button — shows if there's a recent save
    updateContinueButton();

    applyFilter();
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

  // ── Search & Filter ──

  const filterInput = document.getElementById('filter-input');
  const filterTags = document.querySelectorAll('.filter-tag');

  filterInput.addEventListener('input', () => applyFilter());
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      activeFilter = tag.dataset.filter;
      applyFilter();
    });
  });

  function applyFilter() {
    const query = (filterInput.value || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.story-card');

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
      }

      card.classList.toggle('hidden-by-filter', !show);
    });
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
      if (saveManager.isVisible)    { saveManager.hide(); return; }
      if (settingsPanel.isVisible)  { settingsPanel.hide(); return; }
      if (historyPanel.isVisible)   { historyPanel.hide(); return; }
      if (currentEngine)            { returnToMenu(); return; }
    }

    if (isSearchFocused) return;

    if (e.key === ' ' || e.key === 'Enter') {
      if (ui.isTyping) { ui.skipTypewriter(); e.preventDefault(); }
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

    if (key === 'a' && noMod && currentEngine) toggleAutoPlay();

    if (key === 'h' && noMod && currentEngine) {
      historyPanel.isVisible ? historyPanel.hide() : historyPanel.show();
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
    if (enabled && ui._lastBgClass) audio.setTheme(ui._lastBgClass);
  }

  // ── HUD Buttons ──

  ui.btnBack.addEventListener('click', () => returnToMenu());

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

  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPanel.isVisible ? settingsPanel.hide() : settingsPanel.show();
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

  async function boot() {
    try {
      await loadStoryIndex();
      renderTitleScreen();
      ui.showTitleScreen();
    } catch (err) {
      console.error('Failed to boot NyanTales:', err);
      document.getElementById('story-list').innerHTML =
        `<p style="color:var(--accent-red);padding:2rem;font-family:var(--font-mono)">
          Error loading stories. Make sure you're serving this from a web server.<br>
          <code>cd /tmp/nyantales && python3 -m http.server 8080</code><br>
          Then open <a href="http://localhost:8080/web/" style="color:var(--accent-cyan)">http://localhost:8080/web/</a>
        </p>`;
    }
  }

  boot();
})();
