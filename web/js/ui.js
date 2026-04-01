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

    // Subsystem delegates
    this._sprites = new SpriteManager(this.spritesEl, this.portraits);
    this._bg = new BackgroundManager(this.bgEl);
    this._tw = new TypewriterController(this.textEl, this.textboxEl, this.clickIndicator);
    this._ending = new EndingOverlay(this.endingEl, this.choicesEl, this._sprites);

    // Cached container ref (used for shake effects)
    this.containerEl = document.querySelector('.vn-container');

    // Pre-built speaker name plate children (avoids innerHTML per scene render)
    this._speakerIcon = document.createElement('img');
    this._speakerIcon.className = 'speaker-icon';
    this._speakerText = document.createTextNode('');
    this._lastSpeakerKey = ''; // cache key to skip redundant updates

    this._choices = new ChoiceRenderer(this.choicesEl);

    // Pre-built inventory item pool
    this._invPool = []; // reusable <span> elements

    // Pre-built conditional text pool
    this._condPool = [];

    // Reusable scene lowercase buffer (avoids object allocation per render)
    this._sceneLower = { loc: '', scn: '', txt: '', spk: '' };

    // State — typewriter proxied via _tw
    this._lastInventory = ''; // cached inventory key to skip redundant DOM updates

    // Mood emoji map (static — shared across instances)
    // See VNUI._MOOD_EMOJIS below
  }

  // ── Typewriter proxy properties (backward-compatible with external callers) ──

  get typewriterSpeed() { return this._tw.speed; }
  set typewriterSpeed(v) { this._tw.speed = v; }
  get fastMode() { return this._tw.fastMode; }
  set fastMode(v) { this._tw.fastMode = v; }
  get isTyping() { return this._tw.isTyping; }
  set isTyping(v) { this._tw.isTyping = v; }

  // ── Background proxy ──

  /** @returns {string} Current background CSS class (used by audio theme sync). */
  get lastBgClass() { return this._bg.lastBgClass; }

  // ── Screen Transitions ──

  /**
   * Shared screen transition: fade entering screen in, fade exiting screen out.
   * @param {HTMLElement} show - Screen element to reveal
   * @param {HTMLElement} hide - Screen element to dismiss
   */
  _transitionScreens(show, hide) {
    hide.classList.remove('active');
    hide.classList.add('exiting');
    // Clear any lingering exiting class on the screen we're showing
    show.classList.remove('exiting');
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
    // Cancel lingering screen transition timer (prevents class removal on wrong screen)
    if (this._screenTransTimer) { clearTimeout(this._screenTransTimer); this._screenTransTimer = null; }
  }



  // ── Story List ──

  /**
   * Render story selection grid on title screen.
   * Card click/keydown events are NOT attached here — they are handled by
   * grid-level event delegation in main.js (single listener for all 30 cards).
   * @param {Array} stories - Story index entries
   * @param {Function} [onInnerRefs] - Optional callback(story, {inner, textDiv, h3, p, spriteEl}) to receive inner DOM refs per card
   */
  renderStoryList(stories, onInnerRefs) {
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

      // Pass inner DOM refs to caller (StoryCardManager) for lock/unlock state management
      if (onInnerRefs) onInnerRefs(story, { inner, textDiv, h3, p, spriteEl });

      frag.appendChild(card);
    }
    this.storyListEl.appendChild(frag);
  }

  // ── Character Sprites (delegated to SpriteManager) ──

  /** Clear all sprites and remove lingering effect CSS classes. */
  _clearSprites() {
    this._sprites.clear();
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
    this._sprites.clearEffectTimers();
    this.textEl.classList.remove('glitch-text');
    this.containerEl.classList.remove('shake');

    // Pre-compute lowercase strings once for use by both background and sprites
    // Reuses the same object (allocated in constructor) to avoid per-render allocation
    const sl = this._sceneLower;
    sl.loc = (scene.location || '').toLowerCase();
    sl.scn = (engine.state.currentScene || '').toLowerCase();
    sl.txt = (scene.text || '').toLowerCase();
    sl.spk = (scene.speaker || '').toLowerCase();

    // Scene transition effect (delegated to BackgroundManager)
    await this._bg.transition(scene, engine, this._sceneLower, this._tw.fastMode);

    // Update sprites
    this._sprites.update(scene, engine, this._sceneLower);

    // Location
    if (scene.location) {
      this.locationEl.textContent = `📍 ${scene.location}`;
      this.locationEl.classList.remove('hidden');
    } else {
      this.locationEl.classList.add('hidden');
    }

    // Mood
    this.textEl.className = 'vn-text';
    if (scene.mood) {
      this.moodEl.textContent = VNUI._MOOD_EMOJIS[scene.mood] || '';
      this.moodEl.classList.remove('hidden');
      this.textEl.classList.add(`mood-${scene.mood}`);
    } else {
      this.moodEl.classList.add('hidden');
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
      const speakerChar = this._sprites.findSpeakerChar(scene.speaker);
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
      this._sprites.trackTimer(setTimeout(() => this.textEl.classList.remove('glitch-text'), 1000));
    }
    if (scene.effect === 'shake') {
      this.containerEl.classList.add('shake');
      this._sprites.trackTimer(setTimeout(() => this.containerEl.classList.remove('shake'), 500));
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
   * @param {string} text - Text to display
   * @returns {Promise<void>}
   */
  typewriterText(text) {
    return this._tw.run(text);
  }

  skipTypewriter() {
    this._tw.skip();
  }

    // ── Choices ──

  showChoices(choices, engine) { this._choices.show(choices, engine); }
  hideChoices() { this._choices.hide(); }
  onChoice(callback) { this._choices.onChoice(callback); }

  /** @returns {Array|null} Current choices (for number-key lookup). */
  get currentChoices() { return this._choices.current; }

  /** @returns {Array} Choice button pool (for direct index access from keyboard shortcuts). */
  get choiceBtnPool() { return this._choices.pool; }

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

  hideEnding() { this._ending.hide(); }
  onRestart(callback) { this._ending.onRestart(callback); }
  onMenu(callback) { this._ending.onMenu(callback); }

  /** @returns {EndingOverlay} Ending overlay subsystem. */
  get ending() { return this._ending; }

  /** @returns {Object} Pre-built ending DOM refs (statsGrid, actionsRow, etc.). */
  get endingRefs() { return this._ending.refs; }

  // ── Fast Mode ──

  toggleFastMode() {
    this.fastMode = !this.fastMode;
    this.btnFast.classList.toggle('hud-inactive', !this.fastMode);
    return this.fastMode;
  }

}

/** Mood → emoji lookup (static, shared, no per-instance allocation). */
VNUI._MOOD_EMOJIS = {
  tense: '😰', peaceful: '😌', mysterious: '🔮', funny: '😹',
  glitch: '⚡', danger: '💀', warm: '☀️', sad: '😿',
  excited: '✨', spooky: '👻'
};
