/**
 * NyanTales Visual Novel — Main Application
 * Loads stories, wires up the engine + UI + tracker + audio, handles game loop.
 */

(async function () {
  'use strict';

  // ── Init ──
  await YAMLParser.init();
  const ui = new VNUI();
  const tracker = new StoryTracker();
  const audio = new AmbientAudio();

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

  // Resolve base path — works whether served from /web/ or repo root
  function storyBasePath() {
    const path = window.location.pathname;
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  let storyIndex = [];
  let currentEngine = null;
  let currentSlug = null;
  let activeFilter = 'all';

  // ── Load Story Index ──
  async function loadStoryIndex() {
    const base = storyBasePath();
    const entries = [];

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

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) entries.push(r.value);
    }

    storyIndex = entries;
    return entries;
  }

  // ── Start Story ──
  async function startStory(story) {
    currentSlug = story.slug;
    ui.setStorySlug(story.slug);
    const parsed = story._parsed;
    currentEngine = new StoryEngine(parsed);

    // Wire audio theme updates to scene transitions
    const originalRenderScene = ui.renderScene.bind(ui);
    ui.renderScene = async function(scene, engine) {
      await originalRenderScene(scene, engine);
      // Update audio based on background
      if (audio.enabled) {
        audio.setTheme(ui._lastBgClass);
      }
    };

    // Wire up choice handler
    ui.onChoice(choice => {
      const nextScene = currentEngine.goToScene(choice.goto, choice);
      ui.renderScene(nextScene, currentEngine);
    });

    // Wire up ending detection
    const origShowEnding = ui._showEnding.bind(ui);
    ui._showEnding = function(scene, engine) {
      // Track completion
      const result = tracker.recordEnding(currentSlug, scene.ending, engine.state.turns);
      origShowEnding(scene, engine);

      // Add "new ending" flash if applicable
      if (result.isNewEnding) {
        const endingEl = document.getElementById('vn-ending');
        const newBadge = document.createElement('div');
        newBadge.className = 'new-ending-badge';
        newBadge.textContent = '✨ New Ending Discovered!';
        newBadge.style.cssText = 'color:var(--accent-yellow);font-family:var(--font-mono);font-size:0.75rem;margin-top:0.5rem;animation:fadeIn 0.5s ease';
        endingEl.appendChild(newBadge);
      }
    };

    // Wire up restart
    ui.onRestart(() => {
      currentEngine = new StoryEngine(parsed);
      ui.onChoice(choice => {
        const nextScene = currentEngine.goToScene(choice.goto, choice);
        ui.renderScene(nextScene, currentEngine);
      });
      const firstScene = currentEngine.getCurrentScene();
      ui.renderScene(firstScene, currentEngine);
    });

    // Wire up menu
    ui.onMenu(() => {
      currentEngine = null;
      currentSlug = null;
      ui.setStorySlug(null);
      audio.stop();
      ui.showTitleScreen();
      renderTitleScreen();
    });

    // Show story screen and render first scene
    ui.showStoryScreen();
    const firstScene = currentEngine.getCurrentScene();
    await ui.renderScene(firstScene, currentEngine);

    // Save to localStorage
    saveProgress();
  }

  // ── Render Title Screen (with stats + completion badges) ──
  function renderTitleScreen() {
    // Stats bar
    const stats = tracker.getStats();
    const statsEl = document.getElementById('title-stats');
    statsEl.innerHTML = `
      <div class="stat">📖 <span class="stat-value">${stats.storiesCompleted}</span>/${storyIndex.length} complete</div>
      <div class="stat">🔮 <span class="stat-value">${stats.totalEndings}</span> endings found</div>
      <div class="stat">🎮 <span class="stat-value">${stats.totalPlays}</span> plays</div>
    `;

    // Render story list with badges
    ui.renderStoryList(storyIndex, (story) => {
      // Init audio on first user gesture
      if (!audio.ctx) audio.init();
      startStory(story);
    });

    // Add completion badges to cards
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

      // Store slug for filtering
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

      // Text search
      if (query) {
        const matchTitle = card.dataset.title?.includes(query);
        const matchDesc = card.dataset.desc?.includes(query);
        const matchSlug = card.dataset.slug?.includes(query);
        if (!matchTitle && !matchDesc && !matchSlug) show = false;
      }

      // Category filter
      if (show && activeFilter === 'completed') {
        if (card.dataset.completed !== '1') show = false;
      } else if (show && activeFilter === 'new') {
        if (card.dataset.completed === '1') show = false;
      }

      card.classList.toggle('hidden-by-filter', !show);
    });
  }

  // ── Click/Tap to advance (skip typewriter) ──
  document.getElementById('vn-textbox').addEventListener('click', () => {
    if (ui.isTyping) {
      ui.skipTypewriter();
    }
  });

  // ── Keyboard support ──
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (ui.isTyping) {
        ui.skipTypewriter();
        e.preventDefault();
      }
    }
    if (e.key === 'Escape') {
      if (currentEngine) {
        currentEngine = null;
        currentSlug = null;
        ui.setStorySlug(null);
        audio.stop();
        ui.showTitleScreen();
        renderTitleScreen();
      }
    }
    // Number keys for choices
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const btns = ui.choicesEl.querySelectorAll('.choice-btn');
      if (btns[idx]) btns[idx].click();
    }
    // 'M' to toggle audio
    if (e.key === 'm' || e.key === 'M') {
      if (!e.ctrlKey && !e.metaKey && !filterInput.matches(':focus')) {
        toggleAudio();
      }
    }
  });

  // ── Audio Toggle Button ──
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
  ui.btnBack.addEventListener('click', () => {
    currentEngine = null;
    currentSlug = null;
    ui.setStorySlug(null);
    audio.stop();
    ui.showTitleScreen();
    renderTitleScreen();
  });

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

  // ── Save/Load ──
  function saveProgress() {
    if (!currentEngine || !currentSlug) return;
    try {
      localStorage.setItem(`nyantales-save-${currentSlug}`, currentEngine.saveState());
      localStorage.setItem('nyantales-last-story', currentSlug);
    } catch (e) { /* localStorage might be unavailable */ }
  }

  function loadProgress(slug) {
    try {
      const saved = localStorage.getItem(`nyantales-save-${slug}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }

  // ── Boot ──
  async function boot() {
    try {
      const stories = await loadStoryIndex();
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
