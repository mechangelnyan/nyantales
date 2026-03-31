/**
 * NyanTales Visual Novel — UI Controller
 * Handles DOM updates, scene rendering, character sprites.
 * Delegates to: BackgroundManager (bg transitions), TypewriterController (text reveal),
 * SpriteManager (character sprites), EndingOverlay (ending screen).
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

    // Ending overlay delegated to EndingOverlay (Phase 153)
    this._ending = new EndingOverlay(this.endingEl, this.choicesEl, this._sprites);
    // Expose refs for external access (main.js ending hook uses statsGrid/actionsRow)
    this._endingRefs = this._ending.refs;

    // Cached container ref (used for shake effects)
    this.containerEl = document.querySelector('.vn-container');

    // Pre-built speaker name plate children (avoids innerHTML per scene render)
    this._speakerIcon = document.createElement('img');
    this._speakerIcon.className = 'speaker-icon';
    this._speakerText = document.createTextNode('');
    this._lastSpeakerKey = ''; // cache key to skip redundant updates

    // Choice rendering delegated to ChoiceRenderer (Phase 154)
    this._choices = new ChoiceRenderer(this.choicesEl);

    // Pre-built inventory item pool
    this._invPool = []; // reusable <span> elements

    // State — typewriter proxied via _tw
    this._lastInventory = ''; // cached inventory key to skip redundant DOM updates

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
      this.clickIndicator.classList.add('hidden');
      await this._ending.waitForContinue();
      this._ending.show(scene, engine);
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

    // ── Choices (delegated to ChoiceRenderer — Phase 154) ──

  showChoices(choices, engine) { this._choices.show(choices, engine); }
  hideChoices() { this._choices.hide(); }
  onChoice(callback) { this._choices.onChoice(callback); }

  /** @returns {Array|null} Current choices (for number-key lookup). */
  get _currentChoices() { return this._choices.current; }

  /** @returns {Array} Choice button pool (for direct index access from keyboard shortcuts). */
  get _choiceBtnPool() { return this._choices.pool; }

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

  // ── Ending (delegated to EndingOverlay — Phase 153) ──

  hideEnding() { this._ending.hide(); }
  onRestart(callback) { this._ending.onRestart(callback); }
  onMenu(callback) { this._ending.onMenu(callback); }

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

// Note: _ENDING_ICONS moved to EndingOverlay._ICONS (Phase 153)

// Note: _FORMAT_RE, _HTML_ESC_RE, _HTML_ESC_MAP moved to TypewriterController (Phase 152)
// Note: Sprite position arrays moved to SpriteManager._POS_STATIC (Phase 151)
// Note: _bgEntries moved to BackgroundManager._KEYWORDS (Phase 152)

// Backward-compatible alias: modules that referenced VNUI._escapeDiv now use TypewriterController
VNUI._escapeDiv = null;
Object.defineProperty(VNUI, '_escapeDiv', {
  get() { return TypewriterController._escDiv; },
  set(v) { TypewriterController._escDiv = v; }
});
