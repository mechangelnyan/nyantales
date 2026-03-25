/**
 * NyanTales Visual Novel — Main Application
 * Loads stories, wires up the engine + UI + tracker + audio + settings + history, handles game loop.
 */

(async function () {
  'use strict';

  // ── Init ──
  await YAMLParser.init();
  const ui = new VNUI();
  const tracker = new StoryTracker();
  const audio = new AmbientAudio();
  const achievements = new AchievementSystem(tracker);
  const gallery = new CharacterGallery(ui.spriteGen, ui.portraits);
  const settings = new SettingsManager();
  const settingsPanel = new SettingsPanel(settings);
  const textHistory = new TextHistory();
  const historyPanel = new HistoryPanel(textHistory);

  // Preload AI portraits
  await ui.portraits.preloadAll();

  // Apply initial settings to UI
  ui.typewriterSpeed = settings.get('textSpeed');
  applyParticlesSetting(settings.get('particles'));

  // React to setting changes live
  settings.onChange((key, value) => {
    if (key === 'textSpeed') ui.typewriterSpeed = value;
    if (key === 'autoPlay') {
      updateAutoPlayHUD(value);
      if (!value) clearAutoPlayTimer();
    }
    if (key === 'particles') applyParticlesSetting(value);
    if (key === 'audioVolume' && audio.masterGain) {
      audio.masterGain.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.1);
    }
  });

  function applyParticlesSetting(on) {
    document.body.classList.toggle('no-particles', !on);
  }

  // Story index: map of slug → { title, description, slug }
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

  // Resolve base path
  function storyBasePath() {
    const path = window.location.pathname;
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  let storyIndex = [];
  let currentEngine = null;
  let currentSlug = null;
  let activeFilter = 'all';
  let autoPlayTimer = null;
  let autoPlayIndicator = null;
  let skipIndicator = null;

  // ── Auto-play management ──

  function clearAutoPlayTimer() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function scheduleAutoAdvance() {
    clearAutoPlayTimer();
    if (!settings.get('autoPlay') || !currentEngine) return;

    const scene = currentEngine.getCurrentScene();
    if (!scene || scene.ending) return;

    // Don't auto-advance when choices are showing
    const choices = currentEngine.getAvailableChoices();
    if (choices.length > 0) return;

    autoPlayTimer = setTimeout(() => {
      // Auto-advance: move to the scene's "next" if it has one, or first choice's goto
      if (!currentEngine) return;
      const currentScene = currentEngine.getCurrentScene();
      if (!currentScene) return;

      if (currentScene.next) {
        const nextScene = currentEngine.goToScene(currentScene.next);
        playScene(nextScene);
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

  // ── Skip-read-scenes logic ──

  function shouldSkipScene(sceneId) {
    if (!settings.get('skipRead') || !currentEngine) return false;
    return currentEngine.state.visited.has(sceneId);
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
      // Hide auto indicator while skipping
      if (autoPlayIndicator) autoPlayIndicator.style.display = 'none';
    } else if (skipIndicator) {
      skipIndicator.style.display = 'none';
      if (settings.get('autoPlay') && autoPlayIndicator) autoPlayIndicator.style.display = '';
    }
  }

  // ── Load Story Index ──
  async function loadStoryIndex() {
    const base = storyBasePath();

    const results = await Promise.allSettled(
      STORY_SLUGS.map(async slug => {
        const resp = await fetch(`${base}/${slug}/story.yaml`);
        if (!resp.ok) return null;
        const text = await resp.text();
        const parsed = YAMLParser.parse(text);
        return {
          slug,
          title: parsed.title || slug,
          description: parsed.description || '',
          _raw: text,
          _parsed: parsed
        };
      })
    );

    storyIndex = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    return storyIndex;
  }

  // ── Core scene playback (with skip + history + auto-play) ──

  async function playScene(scene) {
    if (!scene || !currentEngine) return;

    // Record to history before rendering
    const sceneId = currentEngine.state.currentScene;
    textHistory.add(sceneId, scene.speaker, scene.text);

    // Disable screen shake if setting is off
    const origEffect = scene.effect;
    if (!settings.get('screenShake') && (scene.effect === 'glitch' || scene.effect === 'shake')) {
      scene.effect = null;
    }

    // Skip-read: if scene was already visited, use fast mode temporarily
    const wasInFastMode = ui.fastMode;
    if (shouldSkipScene(sceneId) && !scene.ending) {
      ui.fastMode = true;
      updateSkipIndicator(true);
    } else {
      updateSkipIndicator(false);
    }

    await ui.renderScene(scene, currentEngine);

    // Restore fast mode
    if (!wasInFastMode && shouldSkipScene(sceneId)) {
      ui.fastMode = wasInFastMode;
    }

    scene.effect = origEffect;

    // Check for auto-advance on scenes with "next" and no choices
    if (!scene.ending) {
      const choices = currentEngine.getAvailableChoices();
      if (choices.length === 0 && scene.next && shouldSkipScene(sceneId)) {
        // Skip-read: auto-advance through visited no-choice scenes quickly
        await new Promise(r => setTimeout(r, 50));
        const nextScene = currentEngine.goToScene(scene.next);
        return playScene(nextScene);
      }
      scheduleAutoAdvance();
    }
  }

  // ── Start Story ──
  async function startStory(story) {
    currentSlug = story.slug;
    ui.setStorySlug(story.slug);
    const parsed = story._parsed;
    currentEngine = new StoryEngine(parsed);
    textHistory.clear();

    // Apply current text speed
    ui.typewriterSpeed = settings.get('textSpeed');

    // Wire audio theme updates to scene transitions
    const originalRenderScene = ui.renderScene.bind(ui);
    ui.renderScene = async function(scene, engine) {
      await originalRenderScene(scene, engine);
      if (audio.enabled) {
        audio.setTheme(ui._lastBgClass);
      }
    };

    // Wire up choice handler
    ui.onChoice(choice => {
      clearAutoPlayTimer();
      const nextScene = currentEngine.goToScene(choice.goto, choice);
      playScene(nextScene);
    });

    // Wire up ending detection
    const origShowEnding = ui._showEnding.bind(ui);
    ui._showEnding = function(scene, engine) {
      clearAutoPlayTimer();
      updateSkipIndicator(false);

      const result = tracker.recordEnding(currentSlug, scene.ending, engine.state.turns);
      origShowEnding(scene, engine);

      if (result.isNewEnding) {
        const endingEl = document.getElementById('vn-ending');
        const newBadge = document.createElement('div');
        newBadge.className = 'new-ending-badge';
        newBadge.textContent = '✨ New Ending Discovered!';
        newBadge.style.cssText = 'color:var(--accent-yellow);font-family:var(--font-mono);font-size:0.75rem;margin-top:0.5rem;animation:fadeIn 0.5s ease';
        endingEl.appendChild(newBadge);
      }

      const newAch = achievements.checkAll();
      if (newAch.length > 0) {
        setTimeout(() => achievements.showNewUnlocks(newAch), 2000);
      }
    };

    // Wire up restart
    ui.onRestart(() => {
      currentEngine = new StoryEngine(parsed);
      textHistory.clear();
      ui.onChoice(choice => {
        clearAutoPlayTimer();
        const nextScene = currentEngine.goToScene(choice.goto, choice);
        playScene(nextScene);
      });
      const firstScene = currentEngine.getCurrentScene();
      playScene(firstScene);
    });

    // Wire up menu
    ui.onMenu(() => {
      returnToMenu();
    });

    // Show story screen and render first scene
    ui.showStoryScreen();
    updateAutoPlayHUD(settings.get('autoPlay'));
    const firstScene = currentEngine.getCurrentScene();
    await playScene(firstScene);

    saveProgress();

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

  // ── Render Title Screen ──
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

      card.dataset.slug = story.slug;
      card.dataset.title = story.title.toLowerCase();
      card.dataset.desc = (story.description || '').toLowerCase();
      card.dataset.completed = completed ? '1' : '0';
    });

    applyFilter();
  }

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

  // ── Click/Tap to advance ──
  document.getElementById('vn-textbox').addEventListener('click', () => {
    if (ui.isTyping) {
      ui.skipTypewriter();
    }
  });

  // ── Keyboard support ──
  document.addEventListener('keydown', (e) => {
    // Don't capture keys when search is focused (unless Escape)
    const isSearchFocused = filterInput.matches(':focus');

    if (e.key === 'Escape') {
      // Close panels first, then exit story
      if (settingsPanel.isVisible) { settingsPanel.hide(); return; }
      if (historyPanel.isVisible) { historyPanel.hide(); return; }
      if (currentEngine) { returnToMenu(); return; }
    }

    if (isSearchFocused) return;

    if (e.key === ' ' || e.key === 'Enter') {
      if (ui.isTyping) {
        ui.skipTypewriter();
        e.preventDefault();
      }
    }

    // Number keys for choices
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const btns = ui.choicesEl.querySelectorAll('.choice-btn');
      if (btns[idx]) btns[idx].click();
    }

    // 'M' for audio
    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
      toggleAudio();
    }

    // 'A' for auto-play
    if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && currentEngine) {
      toggleAutoPlay();
    }

    // 'H' for history
    if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && currentEngine) {
      if (historyPanel.isVisible) historyPanel.hide();
      else historyPanel.show();
    }

    // 'S' for settings (when not in search)
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
      if (settingsPanel.isVisible) settingsPanel.hide();
      else settingsPanel.show();
    }
  });

  // ── Auto-play toggle ──
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
    if (enabled && ui._lastBgClass) {
      audio.setTheme(ui._lastBgClass);
    }
  }

  // ── HUD Buttons ──
  ui.btnBack.addEventListener('click', () => returnToMenu());

  ui.btnSave.addEventListener('click', () => {
    if (currentEngine && currentSlug) {
      saveProgress();
      ui.btnSave.textContent = '✅';
      setTimeout(() => { ui.btnSave.textContent = '💾'; }, 1000);
    }
  });

  ui.btnFast.addEventListener('click', () => {
    const fast = ui.toggleFastMode();
    ui.btnFast.title = fast ? 'Fast Mode ON' : 'Fast Mode OFF';
  });

  document.getElementById('btn-auto').addEventListener('click', () => {
    if (currentEngine) toggleAutoPlay();
  });

  document.getElementById('btn-history').addEventListener('click', () => {
    if (currentEngine) {
      if (historyPanel.isVisible) historyPanel.hide();
      else historyPanel.show();
    }
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    if (settingsPanel.isVisible) settingsPanel.hide();
    else settingsPanel.show();
  });

  // ── Save/Load ──
  function saveProgress() {
    if (!currentEngine || !currentSlug) return;
    try {
      localStorage.setItem(`nyantales-save-${currentSlug}`, currentEngine.saveState());
      localStorage.setItem('nyantales-last-story', currentSlug);
    } catch (e) { /* noop */ }
  }

  // ── Boot ──
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

  // ── Gallery Button ──
  document.getElementById('btn-gallery').addEventListener('click', () => {
    gallery.onStoryClick((slug) => {
      const story = storyIndex.find(s => s.slug === slug);
      if (story) {
        if (!audio.ctx) audio.init();
        startStory(story);
      }
    });
    gallery.show();
  });

  // ── Achievements Button + Panel ──
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

  // Check achievements on boot
  achievements.checkAll();

  boot();
})();
