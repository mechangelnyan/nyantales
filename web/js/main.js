/**
 * NyanTales Visual Novel — Main Application
 * Loads stories, wires up the engine + UI, handles game loop.
 */

(async function () {
  'use strict';

  // ── Init ──
  await YAMLParser.init();
  const ui = new VNUI();

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
    // If we're inside /web/, stories are at ../stories/
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  let storyIndex = [];
  let currentEngine = null;
  let currentSlug = null;

  // ── Load Story Index ──
  async function loadStoryIndex() {
    const base = storyBasePath();
    const entries = [];

    // Fetch each story's YAML header (just title + description)
    const results = await Promise.allSettled(
      STORY_SLUGS.map(async slug => {
        const resp = await fetch(`${base}/${slug}/story.yaml`);
        if (!resp.ok) return null;
        const text = await resp.text();
        // Quick parse just the header
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
    const parsed = story._parsed;
    currentEngine = new StoryEngine(parsed);

    // Wire up choice handler
    ui.onChoice(choice => {
      const nextScene = currentEngine.goToScene(choice.goto, choice);
      ui.renderScene(nextScene, currentEngine);
    });

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
      ui.showTitleScreen();
    });

    // Show story screen and render first scene
    ui.showStoryScreen();
    const firstScene = currentEngine.getCurrentScene();
    await ui.renderScene(firstScene, currentEngine);

    // Save to localStorage
    saveProgress();
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
        ui.showTitleScreen();
      }
    }
    // Number keys for choices
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const btns = ui.choicesEl.querySelectorAll('.choice-btn');
      if (btns[idx]) btns[idx].click();
    }
  });

  // ── HUD Buttons ──
  ui.btnBack.addEventListener('click', () => {
    currentEngine = null;
    currentSlug = null;
    ui.showTitleScreen();
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

      ui.renderStoryList(stories, (story) => {
        startStory(story);
      });

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
