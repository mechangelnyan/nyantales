/**
 * NyanTales Visual Novel — UI Controller
 * Handles DOM updates, scene rendering, character sprites.
 * Delegates to: BackgroundManager (bg transitions), TypewriterController (text reveal),
 * SpriteManager (character sprites).
 */

class VNUI {
  constructor() {
    // Screens
    this.titleScreen = document.getElementById('title-screen');
    this.storyScreen = document.getElementById('story-screen');

    // VN elements
    this.bgEl = document.getElementById('vn-background');
    this.spritesEl = document.getElementById('vn-sprites');
    this.locationEl = document.getElementById('vn-location');
    this.moodEl = document.getElementById('vn-mood');
    this.artEl = document.getElementById('vn-art');
    this.textboxEl = document.getElementById('vn-textbox');
    this.speakerEl = document.getElementById('vn-speaker');
    this.textEl = document.getElementById('vn-text');
    this.clickIndicator = document.getElementById('vn-click-indicator');
    this.inventoryEl = document.getElementById('vn-inventory');
    this.choicesEl = document.getElementById('vn-choices');
    this.conditionalEl = document.getElementById('vn-conditional');
    this.endingEl = document.getElementById('vn-ending');
    this.storyListEl = document.getElementById('story-list');

    // HUD
    this.btnBack = document.getElementById('btn-back');
    this.btnSave = document.getElementById('btn-save');
    this.btnFast = document.getElementById('btn-fast');

    // Sprite generator + portrait manager
    this.spriteGen = new CatSpriteGenerator();
    this.portraits = new PortraitManager(this.spriteGen);
    this.currentStorySlug = null;

    // Sprite management delegated to SpriteManager (Phase 151)
    this._sprites = new SpriteManager(this.spritesEl, this.portraits);
    // Expose for external access (ending state, activeSprites)
    this._activeSprites = this._sprites.activeSprites;

    // Background management delegated to BackgroundManager (Phase 152)
    this._bg = new BackgroundManager(this.bgEl);

    // Typewriter delegated to TypewriterController (Phase 152)
    this._tw = new TypewriterController(this.textEl, this.textboxEl, this.clickIndicator);

    // Cached container ref (used for shake effects)
    this.containerEl = document.querySelector('.vn-container');

    // Pre-built speaker name plate children (avoids innerHTML per scene render)
    this._speakerIcon = document.createElement('img');
    this._speakerIcon.className = 'speaker-icon';
    this._speakerText = document.createTextNode('');
    this._lastSpeakerKey = ''; // cache key to skip redundant updates

    // Pre-built inventory item pool
    this._invPool = []; // reusable <span> elements

    // Choice button pool (avoids createElement per choice per render)
    this._choiceBtnPool = [];

    // Pre-built ending overlay child elements (avoids innerHTML per ending)
    this._endingRefs = this._buildEndingDOM();

    // State — typewriter proxied via _tw
    this._lastInventory = ''; // cached inventory key to skip redundant DOM updates

    // Init ending event delegation (one-time, prevents listener leak)
    this._initEndingDelegation();

    // Mood emoji map
    this.moodEmojis = {
      tense: '😰', peaceful: '😌', mysterious: '🔮', funny: '😹',
      glitch: '⚡', danger: '💀', warm: '☀️', sad: '😿',
      excited: '✨', spooky: '👻'
    };
  }

  // ── Typewriter proxy properties (backward-compatible with external callers) ──

  get typewriterSpeed() { return this._tw.speed; }
  set typewriterSpeed(v) { this._tw.speed = v; }
  get fastMode() { return this._tw.fastMode; }
  set fastMode(v) { this._tw.fastMode = v; }
  get isTyping() { return this._tw.isTyping; }
  set isTyping(v) { this._tw.isTyping = v; }

  // ── Background proxy ──

  /** @returns {string} Current background CSS class */
  get _lastBgClass() { return this._bg.lastBgClass; }

  // ── Screen Transitions ──

  /**
   * Shared screen transition: fade entering screen in, fade exiting screen out.
   * @param {HTMLElement} show - Screen element to reveal
   * @param {HTMLElement} hide - Screen element to dismiss
   */
  _transitionScreens(show, hide) {
    hide.classList.remove('active');
    hide.classList.add('exiting');
    show.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        show.classList.remove('entering');
        show.classList.add('active');
      });
    });
    clearTimeout(this._screenTransTimer);
    this._screenTransTimer = setTimeout(() => {
      hide.classList.remove('exiting');
    }, 500);
  }

  /** Switch to title screen with fade animation */
  showTitleScreen() {
    this._transitionScreens(this.titleScreen, this.storyScreen);
    this._clearSprites();
  }

  /** Switch to story VN screen with fade animation */
  showStoryScreen() {
    this._transitionScreens(this.storyScreen, this.titleScreen);
  }

  setStorySlug(slug) {
    this.currentStorySlug = slug;
    this._sprites.setStorySlug(slug);
    this._bg.reset();              // reset background transition state
    this._lastSpeakerKey = '';     // reset speaker DOM cache
    this._lastInventory = '';      // reset inventory cache
  }

  /**
   * Find a character matching a speaker name, with per-story caching.
   * Delegates to SpriteManager.
   * @param {string} speakerName
   * @returns {Object|null}
   */
  _findSpeakerChar(speakerName) {
    return this._sprites.findSpeakerChar(speakerName);
  }

  // ── Story List ──

  /**
   * Render story selection grid on title screen.
   * Card click/keydown events are NOT attached here — they are handled by
   * grid-level event delegation in main.js (single listener for all 30 cards).
   * @param {Array} stories - Story index entries
   */
  renderStoryList(stories) {
    this.storyListEl.textContent = '';
    // Batch-append cards via DocumentFragment (1 reflow instead of 30)
    const frag = document.createDocumentFragment();
    for (let idx = 0; idx < stories.length; idx++) {
      const story = stories[idx];
      const card = document.createElement('div');
      card.className = 'story-card fade-in';
      card.style.setProperty('--card-delay', `${Math.min(idx * 0.04, 1.2)}s`);
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${story.title}: ${story.description || 'Interactive story'}`);

      // Build card inner DOM via createElement (no innerHTML with dynamic content)
      const inner = document.createElement('div');
      inner.className = 'story-card-inner';

      const chars = CHARACTER_DATA[story.slug] || [];
      const protag = chars.find(c => c.role === 'protagonist');
      let spriteEl = null;
      if (protag) {
        const img = document.createElement('img');
        img.src = this.portraits.getSprite(protag.name, protag.appearance);
        img.className = this.portraits.hasPortrait(protag.name)
          ? 'story-card-sprite ai-portrait' : 'story-card-sprite';
        img.alt = protag.name;
        img.loading = 'lazy';
        img.decoding = 'async';
        inner.appendChild(img);
        spriteEl = img;
      }

      const textDiv = document.createElement('div');
      textDiv.className = 'story-card-text';
      const h3 = document.createElement('h3');
      h3.textContent = story.title;
      const p = document.createElement('p');
      p.textContent = story.description || '';
      textDiv.appendChild(h3);
      textDiv.appendChild(p);
      inner.appendChild(textDiv);
      card.appendChild(inner);

      // Expose inner DOM refs for main.js to avoid querySelector on lock/unlock
      card._innerRefs = { inner, textDiv, h3, p, spriteEl };

      frag.appendChild(card);
    }
    this.storyListEl.appendChild(frag);
  }

  // ── Character Sprites ──

  /** Remove all sprites (delegated to SpriteManager). */
  _clearSprites() {
    this._sprites.clear();
    // Also clean up effect classes that sprite timers would have handled
    this.textEl.classList.remove('glitch-text');
    this.containerEl.classList.remove('shake');
  }

  /** Update sprites for a scene (delegated to SpriteManager). */
  _updateSprites(scene, engine) {
    this._sprites.update(scene, engine, this._sceneLower);
  }

  /** Track a setTimeout so it can be cancelled on scene teardown. */
  _trackTimer(id) { return this._sprites._trackTimer(id); }

  /** Cancel all pending effect timers and clean up stale CSS classes. */
  _clearEffectTimers() {
    this._sprites._clearEffectTimers();
    this.textEl.classList.remove('glitch-text');
    this.containerEl.classList.remove('shake');
  }

  // ── Scene Rendering ──

  /**
   * Render a scene: background transition, sprites, text, choices, endings.
   * @param {Object} scene - Scene data from story YAML
   * @param {StoryEngine} engine - Current game engine instance
   */
  async renderScene(scene, engine) {
    if (!scene) return;

    // Reset
    this.hideChoices();
    this.hideEnding();
    this.hideConditional();
    this.clickIndicator.classList.add('hidden');

    // Cancel any lingering effect timers from the previous scene
    this._clearEffectTimers();

    // Pre-compute lowercase strings once for use by both background and sprites
    this._sceneLower = {
      loc: (scene.location || '').toLowerCase(),
      scn: (engine.state.currentScene || '').toLowerCase(),
      txt: (scene.text || '').toLowerCase(),
      spk: (scene.speaker || '').toLowerCase()
    };

    // Scene transition effect (delegated to BackgroundManager)
    await this._bg.transition(scene, engine, this._sceneLower, this._tw.fastMode);

    // Update sprites
    this._updateSprites(scene, engine);

    // Location
    if (scene.location) {
      this.locationEl.textContent = `📍 ${scene.location}`;
      this.locationEl.classList.remove('hidden');
    } else {
      this.locationEl.classList.add('hidden');
    }

    // Mood
    if (scene.mood) {
      const emoji = this.moodEmojis[scene.mood] || '';
      this.moodEl.textContent = emoji;
      this.moodEl.classList.remove('hidden');
      this.textEl.className = 'vn-text';
      if (scene.mood) this.textEl.classList.add(`mood-${scene.mood}`);
    } else {
      this.moodEl.classList.add('hidden');
      this.textEl.className = 'vn-text';
    }

    // ASCII Art
    if (scene.art) {
      this.artEl.textContent = scene.art;
      this.artEl.classList.remove('hidden');
    } else {
      this.artEl.classList.add('hidden');
    }

    // Speaker (with portrait in name plate) — uses pre-built DOM + cache to skip redundant updates
    if (scene.speaker) {
      const speakerChar = this._findSpeakerChar(scene.speaker);
      // Build a cache key: "charName|speaker" or just "speaker" (null char)
      const speakerKey = speakerChar ? `${speakerChar.name}|${scene.speaker}` : scene.speaker;
      if (speakerKey !== this._lastSpeakerKey) {
        this._lastSpeakerKey = speakerKey;
        if (speakerChar) {
          const spriteUrl = this.portraits.getSprite(speakerChar.name, speakerChar.appearance);
          this._speakerIcon.src = spriteUrl;
          this._speakerIcon.className = this.portraits.hasPortrait(speakerChar.name) ? 'speaker-icon ai-icon' : 'speaker-icon';
          this._speakerText.textContent = ` ${scene.speaker}`;
          this.speakerEl.textContent = '';
          this.speakerEl.appendChild(this._speakerIcon);
          this.speakerEl.appendChild(this._speakerText);
        } else {
          this.speakerEl.textContent = scene.speaker;
        }
      }
      this.speakerEl.classList.remove('hidden');
    } else {
      this.speakerEl.classList.add('hidden');
      this._lastSpeakerKey = '';
    }

    // Inventory
    this._updateInventory(engine.state.inventory);

    // Conditional text
    const conditionals = engine.getConditionalText();
    if (conditionals.length > 0) {
      this._showConditionals(conditionals, engine);
    }

    // Interpolate and display text
    const text = engine.interpolate(scene.text || '');
    await this.typewriterText(text);

    // Effects (tracked so they can be cancelled on scene change)
    if (scene.effect === 'glitch') {
      this.textEl.classList.add('glitch-text');
      this._trackTimer(setTimeout(() => this.textEl.classList.remove('glitch-text'), 1000));
    }
    if (scene.effect === 'shake') {
      this.containerEl.classList.add('shake');
      this._trackTimer(setTimeout(() => this.containerEl.classList.remove('shake'), 500));
    }

    // Check for ending — show a "Continue" prompt first, then the ending overlay
    if (scene.ending) {
      await this._waitForEndingContinue();
      this._showEnding(scene, engine);
      // Notify external hook (tracker, achievements)
      if (this._onEndingHook) this._onEndingHook(scene, engine);
      return;
    }

    // Show choices
    const choices = engine.getAvailableChoices();
    if (choices.length > 0) {
      this.clickIndicator.classList.add('hidden');
      this.showChoices(choices, engine);
    } else if (scene.next) {
      this.clickIndicator.classList.remove('hidden');
    } else {
      this.clickIndicator.classList.add('hidden');
    }
  }

  // ── Typewriter Effect ──

  /**
   * Display text with typewriter animation. Resolves when fully displayed or skipped.
   * Delegates to TypewriterController (Phase 152).
   * @param {string} text - Text to display
   * @returns {Promise<void>}
   */
  typewriterText(text) {
    return this._tw.run(text);
  }

  skipTypewriter() {
    this._tw.skip();
  }

  /**
   * Show a "Continue ▶" button and wait for the player to click/tap it
   * before revealing the ending overlay. Gives the player a moment to
   * absorb the final scene text.
   * Uses a reusable button element and permanent event handlers to avoid
   * per-show addEventListener/removeEventListener churn.
   * @returns {Promise<void>}
   */
  _waitForEndingContinue() {
    return new Promise(resolve => {
      this.clickIndicator.classList.add('hidden');
      this.choicesEl.textContent = '';
      this.choicesEl.classList.remove('hidden');

      // Reuse the continue button element across endings
      if (!this._endingContinueBtn) {
        this._endingContinueBtn = document.createElement('button');
        this._endingContinueBtn.className = 'choice-btn ending-continue-btn fade-in';
        this._endingContinueBtn.textContent = 'Continue ▶';

        // Permanent click handler — only fires when _endingContinueResolve is set
        this._endingContinueBtn.addEventListener('click', () => {
          if (this._endingContinueResolve) this._dismissEndingContinue();
        });

        // Permanent keydown handler — only fires when _endingContinueResolve is set
        document.addEventListener('keydown', (e) => {
          if (!this._endingContinueResolve) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._dismissEndingContinue();
          }
        });
      }

      this._endingContinueResolve = resolve;
      this.choicesEl.appendChild(this._endingContinueBtn);
      this._endingContinueBtn.focus();
    });
  }

  /** Dismiss the ending continue prompt and resolve the pending promise. */
  _dismissEndingContinue() {
    const resolve = this._endingContinueResolve;
    this._endingContinueResolve = null;
    this.choicesEl.textContent = '';
    this.choicesEl.classList.add('hidden');
    if (resolve) resolve();
  }

  // ── Choices ──

  /**
   * Show choices using event delegation on choicesEl (single listener,
   * initialized once in constructor-like flow via _initChoiceDelegation).
   */
  showChoices(choices, engine) {
    this.choicesEl.textContent = '';
    this.choicesEl.classList.remove('hidden');
    // Store current choices for delegation handler lookup
    this._currentChoices = choices;

    // Grow pool as needed (reuse buttons across choice renders)
    while (this._choiceBtnPool.length < choices.length) {
      const btn = document.createElement('button');
      // Pre-build child structure: [numHint span] [text node] [visited span]
      btn._numSpan = document.createElement('span');
      btn._numSpan.className = 'choice-num';
      btn._textNode = document.createTextNode('');
      btn._visitedSpan = document.createElement('span');
      btn._visitedSpan.className = 'choice-visited';
      btn._visitedSpan.title = 'Previously visited';
      btn._visitedSpan.textContent = '✓';
      this._choiceBtnPool.push(btn);
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const btn = this._choiceBtnPool[i];
      btn.className = 'choice-btn fade-in';
      btn.style.setProperty('--choice-delay', `${i * 0.08}s`);
      btn.dataset.choiceIdx = i;

      let label = engine.interpolate(choice.label || choice.text || `Choice ${i + 1}`);
      if (choice.requires_item) {
        const hasItem = engine.state.inventory.includes(choice.requires_item);
        if (hasItem) label += ` [${choice.requires_item}]`;
      }

      const visited = choice.goto && engine.state.visited.has(choice.goto);
      if (visited) btn.classList.add('choice-visited-path');

      // Update pre-built children
      btn.textContent = '';
      if (i < 9) {
        btn._numSpan.textContent = i + 1;
        btn.appendChild(btn._numSpan);
      }
      btn._textNode.textContent = label;
      btn.appendChild(btn._textNode);
      if (visited) btn.appendChild(btn._visitedSpan);

      frag.appendChild(btn);
    }
    this.choicesEl.appendChild(frag);

    // One-time delegation setup
    this._initChoiceDelegation();
  }

  /**
   * Set up a single delegated click listener on choicesEl (called once).
   * Replaces per-button addEventListener that leaked on each showChoices call.
   * @private
   */
  _initChoiceDelegation() {
    if (this._choicesDelegated) return;
    this._choicesDelegated = true;

    this.choicesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.choice-btn');
      if (!btn || !this._currentChoices) return;
      const idx = parseInt(btn.dataset.choiceIdx, 10);
      const choice = this._currentChoices[idx];
      if (!choice) return;

      // Click ripple effect — track timer so rapid clicks don't queue stale callbacks
      btn.classList.add('chosen');
      clearTimeout(this._choiceRippleTimer);
      this._choiceRippleTimer = setTimeout(() => {
        this.choicesEl.classList.add('hidden');
        if (this._onChoice) this._onChoice(choice);
      }, 200);
    });
  }

  hideChoices() {
    this.choicesEl.classList.add('hidden');
    this.choicesEl.textContent = '';
    this._currentChoices = null;
  }

  onChoice(callback) {
    this._onChoice = callback;
  }

  // ── Inventory ──

  _updateInventory(items) {
    if (items.length === 0) {
      this.inventoryEl.classList.add('hidden');
      this._lastInventory = '';
      return;
    }
    // Skip DOM write if inventory hasn't changed (common case: same items scene-to-scene)
    const key = items.join('\0');
    if (key === this._lastInventory) {
      this.inventoryEl.classList.remove('hidden');
      return;
    }
    this._lastInventory = key;
    this.inventoryEl.classList.remove('hidden');

    // Reuse pooled span elements instead of innerHTML + map + join
    while (this._invPool.length < items.length) {
      const span = document.createElement('span');
      span.className = 'inv-item';
      this._invPool.push(span);
    }
    // Update text and ensure correct children
    const frag = document.createDocumentFragment();
    for (let i = 0; i < items.length; i++) {
      this._invPool[i].textContent = `🎒 ${items[i]}`;
      frag.appendChild(this._invPool[i]);
    }
    this.inventoryEl.textContent = ''; // clear without innerHTML
    this.inventoryEl.appendChild(frag);
  }

  // ── Conditionals ──

  _showConditionals(conditionals, engine) {
    this.conditionalEl.classList.remove('hidden');
    // Reuse pooled div elements instead of innerHTML + map + join
    if (!this._condPool) this._condPool = [];
    while (this._condPool.length < conditionals.length) {
      const div = document.createElement('div');
      div.className = 'cond-text';
      this._condPool.push(div);
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < conditionals.length; i++) {
      this._condPool[i].textContent = engine.interpolate(conditionals[i].text);
      frag.appendChild(this._condPool[i]);
    }
    this.conditionalEl.textContent = '';
    this.conditionalEl.appendChild(frag);
  }

  hideConditional() {
    this.conditionalEl.classList.add('hidden');
    this.conditionalEl.textContent = '';
  }

  // ── Ending ──

  /**
   * Build the ending overlay DOM tree once. Returns refs to dynamic elements
   * so _showEnding can swap content via textContent/classList instead of innerHTML.
   * @private
   */
  _buildEndingDOM() {
    const r = {};
    r.iconEl = document.createElement('div');
    r.iconEl.className = 'ending-icon';

    r.typeEl = document.createElement('div');
    r.typeEl.className = 'ending-type';

    r.textEl = document.createElement('div');
    r.textEl.className = 'ending-text';

    r.statsGrid = document.createElement('div');
    r.statsGrid.className = 'ending-stats-grid';
    r.statsGrid.id = 'ending-stats-grid';

    // Turns stat (always visible)
    r.turnsBox = document.createElement('div');
    r.turnsBox.className = 'ending-stat-box';
    r.turnsVal = document.createElement('span');
    r.turnsVal.className = 'ending-stat-value';
    const turnsLabel = document.createElement('span');
    turnsLabel.className = 'ending-stat-label';
    turnsLabel.textContent = 'Turns';
    r.turnsBox.appendChild(r.turnsVal);
    r.turnsBox.appendChild(turnsLabel);

    // Scenes stat (always visible)
    r.scenesBox = document.createElement('div');
    r.scenesBox.className = 'ending-stat-box';
    r.scenesVal = document.createElement('span');
    r.scenesVal.className = 'ending-stat-value';
    r.scenesLabel = document.createElement('span');
    r.scenesLabel.className = 'ending-stat-label';
    r.scenesBox.appendChild(r.scenesVal);
    r.scenesBox.appendChild(r.scenesLabel);

    // Inventory stat (conditionally shown)
    r.invBox = document.createElement('div');
    r.invBox.className = 'ending-stat-box ending-stat-wide';
    r.invVal = document.createElement('span');
    r.invVal.className = 'ending-stat-value';
    const invLabel = document.createElement('span');
    invLabel.className = 'ending-stat-label';
    invLabel.textContent = 'Items Collected';
    r.invBox.appendChild(r.invVal);
    r.invBox.appendChild(invLabel);

    // Actions row (always the same buttons)
    r.actionsRow = document.createElement('div');
    r.actionsRow.className = 'ending-actions';
    r.restartBtn = document.createElement('button');
    r.restartBtn.className = 'ending-btn';
    r.restartBtn.dataset.action = 'restart';
    r.restartBtn.textContent = '↻ Play Again';
    r.menuBtn = document.createElement('button');
    r.menuBtn.className = 'ending-btn ending-btn-secondary';
    r.menuBtn.dataset.action = 'menu';
    r.menuBtn.textContent = '⏎ Story List';
    r.shareBtn = document.createElement('button');
    r.shareBtn.className = 'ending-btn ending-btn-secondary ending-btn-share';
    r.shareBtn.dataset.action = 'share';
    r.shareBtn.title = 'Copy ending summary to clipboard';
    r.shareBtn.textContent = '📋 Share';
    r.actionsRow.appendChild(r.restartBtn);
    r.actionsRow.appendChild(r.menuBtn);
    r.actionsRow.appendChild(r.shareBtn);

    return r;
  }

  /**
   * Show the ending overlay. Uses pre-built DOM elements (no innerHTML) and
   * event delegation on endingEl to avoid listener leaks.
   */
  _showEnding(scene, engine) {
    const ending = scene.ending;
    const type = ending.type || 'neutral';
    const icon = VNUI._ENDING_ICONS[type] || '📋';

    // Dim sprites with ending-state CSS class
    this._sprites.applyEndingState(type);

    // Use cached scene count if available (avoids Object.keys allocation per ending)
    let totalScenes = this._totalScenes;
    if (!totalScenes) { totalScenes = 0; for (const _ in engine.scenes) totalScenes++; }
    const visitPct = totalScenes > 0 ? Math.round((engine.state.visited.size / totalScenes) * 100) : 0;

    // Store share data for delegation handler
    const shareUrl = ShareHelper.storyUrl(engine.story?.slug);

    this._endingShareData = {
      icon,
      endingTitle: ending.title || type.toUpperCase(),
      storyTitle: engine.story.title || 'Unknown Story',
      storySlug: engine.story?.slug || '',
      turns: engine.state.turns,
      visitedSize: engine.state.visited.size,
      totalScenes,
      visitPct,
      inventory: [...engine.state.inventory],
      shareUrl
    };

    const r = this._endingRefs;

    // Update pre-built elements with current ending data
    r.iconEl.textContent = icon;
    r.typeEl.className = `ending-type ${type}`;
    r.typeEl.textContent = (ending.title || type.toUpperCase()).toUpperCase();
    r.textEl.textContent = engine.interpolate(ending.text || scene.text || '');
    r.turnsVal.textContent = engine.state.turns;
    r.scenesVal.textContent = `${engine.state.visited.size}/${totalScenes}`;
    r.scenesLabel.textContent = `Scenes (${visitPct}%)`;

    // Rebuild stats grid (just re-append existing elements, no creation)
    r.statsGrid.textContent = '';
    r.statsGrid.appendChild(r.turnsBox);
    r.statsGrid.appendChild(r.scenesBox);
    if (engine.state.inventory.length) {
      r.invVal.textContent = `🎒 ${engine.state.inventory.join(', ')}`;
      r.statsGrid.appendChild(r.invBox);
    }

    // Assemble into endingEl (no innerHTML — just re-append pre-built children)
    this.endingEl.textContent = '';
    this.endingEl.appendChild(r.iconEl);
    this.endingEl.appendChild(r.typeEl);
    this.endingEl.appendChild(r.textEl);
    this.endingEl.appendChild(r.statsGrid);
    this.endingEl.appendChild(r.actionsRow);
    this.endingEl.classList.remove('hidden');

    this.endingEl.setAttribute('role', 'dialog');
    this.endingEl.setAttribute('aria-label', `Ending: ${ending.title || type}`);

    // Auto-focus the "Play Again" button for keyboard users
    requestAnimationFrame(() => r.restartBtn.focus());
  }

  /**
   * Initialize event delegation on the ending overlay (called once).
   * This avoids creating new listeners on every ending render.
   * @private
   */
  _initEndingDelegation() {
    if (this._endingDelegated) return;
    this._endingDelegated = true;

    this.endingEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'restart' && this._onRestart) {
        this._onRestart();
      } else if (action === 'menu' && this._onMenu) {
        this._onMenu();
      } else if (action === 'share') {
        await this._shareEnding();
      } else if (action === 'campaign-next' && this._onCampaignEnding) {
        this._onCampaignEnding();
      }
    });
  }

  /** Share ending card via Web Share API → clipboard fallback */
  async _shareEnding() {
    const d = this._endingShareData;
    if (!d) return;

    const shareText = [
      `🐱 NyanTales — ${d.storyTitle}`,
      `${d.icon} Ending: ${d.endingTitle}`,
      `📊 ${d.turns} turns · ${d.visitedSize}/${d.totalScenes} scenes (${d.visitPct}%)`,
      d.inventory.length ? `🎒 Items: ${d.inventory.join(', ')}` : '',
      '',
      `🎮 Play this story: ${d.shareUrl}`
    ].filter(Boolean).join('\n');

    await ShareHelper.share({
      title: `NyanTales — ${d.storyTitle}`,
      text: shareText,
      url: d.shareUrl,
      successMessage: 'Copied to clipboard!',
      successIcon: '📋',
      errorMessage: 'Failed to copy'
    });
  }

  hideEnding() {
    this.endingEl.classList.add('hidden');
    this.endingEl.textContent = '';
  }

  onRestart(callback) { this._onRestart = callback; }
  onMenu(callback) { this._onMenu = callback; }

  // ── Text Formatting (delegated to TypewriterController) ──

  /** Format VN text: escape HTML, apply markdown. Delegates to TypewriterController. */
  _formatText(text) { return TypewriterController.formatText(text); }

  /** Escape HTML special characters. Delegates to TypewriterController. */
  _escapeHtml(text) { return TypewriterController.escapeHtml(text); }

  // ── Fast Mode ──

  toggleFastMode() {
    this.fastMode = !this.fastMode;
    this.btnFast.classList.toggle('hud-inactive', !this.fastMode);
    return this.fastMode;
  }

  // Note: _accentRGBA removed — sprite highlighting now uses pure CSS classes
  // with var(--accent-r/g/b). RouteMap has its own copy for canvas rendering.
}

/** Ending type → icon map (static, avoids object literal allocation per ending). */
VNUI._ENDING_ICONS = { good: '🌟', bad: '💀', neutral: '📋', secret: '🔮' };

// Note: _FORMAT_RE, _HTML_ESC_RE, _HTML_ESC_MAP moved to TypewriterController (Phase 152)
// Note: Sprite position arrays moved to SpriteManager._POS_STATIC (Phase 151)
// Note: _bgEntries moved to BackgroundManager._KEYWORDS (Phase 152)

// Backward-compatible alias: modules that referenced VNUI._escapeDiv now use TypewriterController
VNUI._escapeDiv = null;
Object.defineProperty(VNUI, '_escapeDiv', {
  get() { return TypewriterController._escDiv; },
  set(v) { TypewriterController._escDiv = v; }
});
