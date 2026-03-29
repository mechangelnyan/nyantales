/**
 * NyanTales Visual Novel — UI Controller
 * Handles DOM updates, typewriter text, scene rendering, transitions, character sprites.
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
    this._activeSprites = new Map(); // name -> element

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

    // State
    this.typewriterSpeed = 18; // ms per character
    this.fastMode = false;
    this.isTyping = false;
    this._typewriterResolve = null;
    this._typewriterTimeout = null;
    this._fullText = '';
    this._lastBgClass = '';
    this._transitioning = false;
    this._lastInventory = ''; // cached inventory key to skip redundant DOM updates

    // Reusable transition overlay (avoids DOM create/remove on every bg change)
    this._transOverlay = document.createElement('div');
    this._transOverlay.className = 'scene-transition-overlay';

    // Track active effect timers so they can be cancelled on scene change
    this._effectTimers = [];

    // Init ending event delegation (one-time, prevents listener leak)
    this._initEndingDelegation();

    // Mood emoji map
    this.moodEmojis = {
      tense: '😰', peaceful: '😌', mysterious: '🔮', funny: '😹',
      glitch: '⚡', danger: '💀', warm: '☀️', sad: '😿',
      excited: '✨', spooky: '👻'
    };

    // Background keyword → class entries (pre-computed array avoids Object.entries() per render)
    this._bgEntries = [
      ['terminal', 'bg-terminal'], ['shell', 'bg-terminal'],
      ['filesystem', 'bg-filesystem'], ['directory', 'bg-filesystem'],
      ['/home', 'bg-filesystem'], ['/root', 'bg-filesystem'], ['/bin', 'bg-filesystem'],
      ['/tmp', 'bg-filesystem'], ['/etc', 'bg-filesystem'], ['/proc', 'bg-danger'], ['/var', 'bg-filesystem'],
      ['server', 'bg-server-room'], ['rack', 'bg-server-room'], ['datacenter', 'bg-server-room'],
      ['network', 'bg-network'], ['http', 'bg-network'], ['dns', 'bg-network'],
      ['tcp', 'bg-network'], ['packet', 'bg-network'],
      ['memory', 'bg-memory'], ['heap', 'bg-memory'], ['stack', 'bg-memory'], ['buffer', 'bg-memory'],
      ['database', 'bg-database'], ['sql', 'bg-database'], ['table', 'bg-database'],
      ['café', 'bg-cafe'], ['cafe', 'bg-cafe'], ['coffee', 'bg-cafe'],
      ['warm', 'bg-warm'], ['home', 'bg-warm'], ['cozy', 'bg-warm'],
      ['danger', 'bg-danger'], ['kernel', 'bg-danger'], ['panic', 'bg-danger'], ['crash', 'bg-danger'],
      ['void', 'bg-void'], ['null', 'bg-void'], ['empty', 'bg-void'],
      ['docker', 'bg-server-room'], ['container', 'bg-server-room'],
      ['git', 'bg-terminal'], ['branch', 'bg-terminal'],
      ['regex', 'bg-danger'], ['loop', 'bg-memory'],
      ['process', 'bg-server-room'], ['pipe', 'bg-terminal'],
      ['deploy', 'bg-server-room'], ['production', 'bg-danger'],
      ['cache', 'bg-memory'], ['tls', 'bg-network'], ['ssl', 'bg-network'],
      ['cipher', 'bg-network'], ['handshake', 'bg-network']
    ];
  }

  // ── Screen Transitions ──

  /** Switch to title screen with fade animation */
  showTitleScreen() {
    this.storyScreen.classList.remove('active');
    this.storyScreen.classList.add('exiting');
    // Show title with entering animation, then promote to active
    this.titleScreen.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.titleScreen.classList.remove('entering');
        this.titleScreen.classList.add('active');
      });
    });
    clearTimeout(this._screenTransTimer);
    this._screenTransTimer = setTimeout(() => {
      this.storyScreen.classList.remove('exiting');
    }, 500);
    this._clearSprites();
  }

  /** Switch to story VN screen with fade animation */
  showStoryScreen() {
    this.titleScreen.classList.remove('active');
    this.titleScreen.classList.add('exiting');
    // Show story with entering animation, then promote to active
    this.storyScreen.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.storyScreen.classList.remove('entering');
        this.storyScreen.classList.add('active');
      });
    });
    clearTimeout(this._screenTransTimer);
    this._screenTransTimer = setTimeout(() => {
      this.titleScreen.classList.remove('exiting');
    }, 500);
  }

  setStorySlug(slug) {
    this.currentStorySlug = slug;
    this._speakerCache = new Map(); // reset speaker lookup cache per story
    this._charNameCache = new Map(); // reset lowercase name cache per story
    this._charHyphenCache = new Map(); // reset hyphenated name cache per story
    this._lastSpeakerKey = ''; // reset speaker DOM cache
    this._lastInventory = ''; // reset inventory cache
  }

  /**
   * Find a character matching a speaker name, with per-story caching.
   * Avoids repeated array.find() on every scene render for the same speaker.
   * @param {string} speakerName
   * @returns {Object|null}
   */
  _findSpeakerChar(speakerName) {
    if (!this._speakerCache) this._speakerCache = new Map();
    if (this._speakerCache.has(speakerName)) return this._speakerCache.get(speakerName);

    const chars = CHARACTER_DATA[this.currentStorySlug] || [];
    const speakerLower = speakerName.toLowerCase();
    const found = chars.find(c =>
      c.name.toLowerCase() === speakerLower ||
      speakerLower.includes(c.name.toLowerCase())
    ) || null;

    this._speakerCache.set(speakerName, found);
    return found;
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

  _clearSprites() {
    this._clearEffectTimers(); // Cancel any pending sprite fade-out / effect timers
    this.spritesEl.textContent = '';
    this._activeSprites.clear();
  }

  _updateSprites(scene, engine) {
    const slug = this.currentStorySlug;
    if (!slug) return;

    const chars = CHARACTER_DATA[slug] || [];
    if (chars.length === 0) return;

    // Determine which characters should be visible
    // 1. The speaker (if named)
    // 2. Characters mentioned in text
    // Use pre-computed lowercase strings from renderScene (avoids redundant toLowerCase)
    const sl = this._sceneLower;
    const speakerLower = sl ? sl.spk : (scene.speaker || '').toLowerCase();
    const textLower = sl ? sl.txt : (scene.text || '').toLowerCase();
    const sceneIdLower = sl ? sl.scn : (engine.state.currentScene || '').toLowerCase();

    // Build visible list without spreading (avoids object allocation per character per render)
    // Cache lowercase names per story to avoid toLowerCase() on every render
    if (!this._charNameCache) this._charNameCache = new Map();
    if (!this._charHyphenCache) this._charHyphenCache = new Map();
    const visible = [];
    const speakerFlags = []; // parallel array: true if the char at this index is speaking
    for (const char of chars) {
      let nameLower = this._charNameCache.get(char.name);
      if (nameLower === undefined) {
        nameLower = char.name.toLowerCase();
        this._charNameCache.set(char.name, nameLower);
      }
      let nameHyphen = this._charHyphenCache.get(char.name);
      if (nameHyphen === undefined) {
        nameHyphen = nameLower.replace(/\s+/g, '-');
        this._charHyphenCache.set(char.name, nameHyphen);
      }
      const isSpeaker = speakerLower === nameLower || speakerLower.includes(nameLower);
      const inText = textLower.includes(nameLower);
      const inScene = sceneIdLower.includes(nameHyphen);

      if (isSpeaker || inText || inScene) {
        visible.push(char);
        speakerFlags.push(isSpeaker);
      }
    }

    // If no one's visible, show protagonist
    if (visible.length === 0 && chars.length > 0) {
      const protag = chars.find(c => c.role === 'protagonist') || chars[0];
      visible.push(protag);
      speakerFlags.push(false);
    }

    // Position sprites
    const positions = this._getSpritePositions(visible.length);

    // Fade out removed sprites (reuse Set to avoid allocation per render)
    if (!this._visibleNamesBuf) this._visibleNamesBuf = new Set();
    const visibleNames = this._visibleNamesBuf;
    visibleNames.clear();
    for (const v of visible) visibleNames.add(v.name);
    for (const [name, el] of this._activeSprites) {
      if (!visibleNames.has(name)) {
        el.classList.remove('visible');
        el.classList.add('sprite-exit');
        this._trackTimer(setTimeout(() => el.remove(), 500));
        this._activeSprites.delete(name);
      }
    }

    // Add/update visible sprites
    for (let i = 0; i < visible.length; i++) {
      const char = visible[i];
      const isSpeaker = speakerFlags[i];
      let spriteEl = this._activeSprites.get(char.name);
      const pos = positions[i];

      if (!spriteEl) {
        // Create new sprite
        spriteEl = document.createElement('div');
        spriteEl.className = 'vn-sprite-wrap';
        const img = document.createElement('img');
        img.src = this.portraits.getPortrait(char.name, char.appearance);
        img.className = 'vn-sprite';
        if (this.portraits.hasPortrait(char.name)) img.classList.add('ai-portrait');
        img.alt = char.name;

        const label = document.createElement('div');
        label.className = 'sprite-label';
        label.textContent = char.name;

        spriteEl.appendChild(img);
        spriteEl.appendChild(label);
        this.spritesEl.appendChild(spriteEl);
        this._activeSprites.set(char.name, spriteEl);

        // Trigger entrance animation via CSS custom properties
        requestAnimationFrame(() => {
          spriteEl.style.setProperty('--sprite-x', pos.x);
          spriteEl.style.setProperty('--sprite-scale', pos.scale);
          img.classList.add('visible');
        });
      } else {
        // Move existing sprite via CSS custom properties
        spriteEl.style.setProperty('--sprite-x', pos.x);
        spriteEl.style.setProperty('--sprite-scale', pos.scale);
      }

      // Highlight speaker — use CSS classes instead of inline styles for theme reactivity
      spriteEl.classList.toggle('speaking', isSpeaker);
      // Clear any ending-state classes from previous scene
      spriteEl.classList.remove('ending-good', 'ending-bad', 'ending-neutral');
    }
  }

  /** Track a setTimeout so it can be cancelled on scene teardown. */
  _trackTimer(id) { this._effectTimers.push(id); return id; }

  /** Cancel all pending effect timers and clean up stale CSS classes. */
  _clearEffectTimers() {
    for (const id of this._effectTimers) clearTimeout(id);
    this._effectTimers.length = 0;
    // Remove any lingering effect classes that a cancelled timer would have cleaned up
    this.textEl.classList.remove('glitch-text');
    this.containerEl.classList.remove('shake');
  }

  _getSpritePositions(count) {
    // Use pre-built static arrays for common counts (0-3) to avoid allocation per render
    if (count <= 3) return VNUI._SPRITE_POS[count];
    // 4+: spread evenly (rare — most scenes have 1-3 visible characters)
    return Array.from({ length: count }, (_, i) => ({
      x: `${15 + (70 * i / (count - 1))}%`,
      scale: 0.75
    }));
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

    // Pre-compute lowercase strings once for use by both _sceneTransition and _updateSprites
    this._sceneLower = {
      loc: (scene.location || '').toLowerCase(),
      scn: (engine.state.currentScene || '').toLowerCase(),
      txt: (scene.text || '').toLowerCase(),
      spk: (scene.speaker || '').toLowerCase()
    };

    // Scene transition effect
    await this._sceneTransition(scene, engine);

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

  // ── Scene Transition ──

  async _sceneTransition(scene, engine) {
    const newBg = this._inferBackground(scene, engine);

    if (newBg !== this._lastBgClass && this._lastBgClass) {
      // Crossfade background using reusable overlay (no DOM create/remove per transition)
      this._transitioning = true;
      const overlay = this._transOverlay;
      this.bgEl.parentElement.appendChild(overlay);

      // Fade in overlay
      requestAnimationFrame(() => overlay.classList.add('active'));
      await this._wait(300);

      // Switch background
      this.bgEl.className = 'vn-bg';
      if (newBg) this.bgEl.classList.add(newBg);
      await this._wait(100);

      // Fade out overlay, then detach (keeps it reusable)
      overlay.classList.remove('active');
      await this._wait(300);
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);

      this._transitioning = false;
    } else {
      this.bgEl.className = 'vn-bg';
      if (newBg) this.bgEl.classList.add(newBg);
    }

    this._lastBgClass = newBg;
  }

  _inferBackground(scene, engine) {
    if (scene.background) return `bg-${scene.background}`;

    // Use pre-computed lowercase strings from renderScene (avoids redundant toLowerCase per render)
    const sl = this._sceneLower;
    const loc = sl ? sl.loc : (scene.location || '').toLowerCase();
    const scn = sl ? sl.scn : (engine.state.currentScene || '').toLowerCase();
    const txt = sl ? sl.txt : (scene.text || '').toLowerCase();

    for (const [keyword, bgClass] of this._bgEntries) {
      if (loc.includes(keyword) || scn.includes(keyword) || txt.includes(keyword)) return bgClass;
    }
    return '';
  }

  _wait(ms) {
    return new Promise(r => setTimeout(r, this.fastMode ? 0 : ms));
  }

  // ── Typewriter Effect ──

  /**
   * Display text with typewriter animation. Resolves when fully displayed or skipped.
   * @param {string} text - Text to display
   * @returns {Promise<void>}
   */
  typewriterText(text) {
    return new Promise(resolve => {
      this._cancelTypewriter();

      this._fullText = text;
      this._typewriterResolve = resolve;
      this.isTyping = true;
      this.clickIndicator.classList.add('hidden');

      const formattedHtml = this._formatText(text);

      if (this.fastMode) {
        this.textEl.innerHTML = formattedHtml;
        this.isTyping = false;
        this.clickIndicator.classList.remove('hidden');
        this.textboxEl.scrollTop = this.textboxEl.scrollHeight;
        resolve();
        return;
      }

      // Progressive reveal: render the full formatted HTML into a hidden container,
      // then reveal characters via a clipping wrapper. This avoids re-calling
      // _formatText() on every 2-char chunk (was O(n²) for long text).
      this.textEl.innerHTML = '';
      const wrapper = document.createElement('span');
      wrapper.className = 'vn-typewriter-reveal';
      wrapper.innerHTML = formattedHtml;
      this.textEl.appendChild(wrapper);

      // Measure total text length for progressive reveal
      const fullLen = wrapper.textContent.length;
      let revealedLen = 0;

      // Use CSS clip-path or max-width to reveal progressively
      // Simplest cross-browser approach: walk text nodes and toggle visibility
      const textNodes = [];
      const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      // Split each text node into individual spans for character-level reveal
      const charSpans = [];
      for (const tn of textNodes) {
        const parent = tn.parentNode;
        const chars = tn.textContent;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
          const span = document.createElement('span');
          span.textContent = chars[i];
          span.className = 'tw-hidden';
          charSpans.push(span);
          frag.appendChild(span);
        }
        parent.replaceChild(frag, tn);
      }

      const type = () => {
        const end = Math.min(revealedLen + 2, charSpans.length);
        for (let i = revealedLen; i < end; i++) {
          charSpans[i].className = '';
        }
        revealedLen = end;

        // Auto-scroll textbox to keep new text visible
        this.textboxEl.scrollTop = this.textboxEl.scrollHeight;

        if (revealedLen < charSpans.length) {
          this._typewriterTimeout = setTimeout(type, this.typewriterSpeed);
        } else {
          // Replace char spans with clean formatted HTML (removes per-char spans)
          this.textEl.innerHTML = formattedHtml;
          this.isTyping = false;
          this.clickIndicator.classList.remove('hidden');
          this.textboxEl.scrollTop = this.textboxEl.scrollHeight;
          resolve();
        }
      };
      type();
    });
  }

  skipTypewriter() {
    if (this.isTyping) {
      this._cancelTypewriter();
      // Reveal all text immediately (replaces char spans with clean formatted HTML)
      this.textEl.innerHTML = this._formatText(this._fullText);
      this.isTyping = false;
      this.clickIndicator.classList.remove('hidden');
      this.textboxEl.scrollTop = this.textboxEl.scrollHeight;
      if (this._typewriterResolve) {
        this._typewriterResolve();
        this._typewriterResolve = null;
      }
    }
  }

  _cancelTypewriter() {
    if (this._typewriterTimeout) {
      clearTimeout(this._typewriterTimeout);
      this._typewriterTimeout = null;
    }
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

    // Dim sprites with CSS class — use cached _activeSprites Map (no querySelectorAll)
    const endingClass = `ending-${type === 'secret' ? 'neutral' : type}`;
    for (const [, wrap] of this._activeSprites) {
      wrap.classList.remove('ending-good', 'ending-bad', 'ending-neutral');
      wrap.classList.add(endingClass);
    }

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

  // ── Text Formatting ──

  /**
   * Format VN text: escape HTML, then apply markdown (code, bold, italic, newlines).
   * Uses a single pre-compiled regex for markdown transforms (replaces 4 sequential passes).
   */
  _formatText(text) {
    // First pass: HTML escape (single regex with map lookup)
    const escaped = text.replace(VNUI._HTML_ESC_RE, c => VNUI._HTML_ESC_MAP[c]);
    // Second pass: markdown + newlines in one regex
    return escaped.replace(VNUI._FORMAT_RE, (m, code, bold, italic) => {
      if (code !== undefined) return `<code class="vn-inline-code">${code}</code>`;
      if (bold !== undefined) return `<strong class="vn-bold">${bold}</strong>`;
      if (italic !== undefined) return `<em>${italic}</em>`;
      if (m === '\n') return '<br>';
      return m;
    });
  }

  _escapeHtml(text) {
    // Reuse a single off-screen element instead of creating one per call
    if (!VNUI._escapeDiv) VNUI._escapeDiv = document.createElement('div');
    VNUI._escapeDiv.textContent = text;
    return VNUI._escapeDiv.innerHTML;
  }

  // ── Fast Mode ──

  toggleFastMode() {
    this.fastMode = !this.fastMode;
    this.btnFast.classList.toggle('hud-inactive', !this.fastMode);
    return this.fastMode;
  }

  // Note: _accentRGBA removed — sprite highlighting now uses pure CSS classes
  // with var(--accent-r/g/b). RouteMap has its own copy for canvas rendering.
}

/** Pre-compiled regex for _formatText: matches backtick code, **bold**, *italic*, or newline in one pass. */
VNUI._FORMAT_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\n/g;

/** Ending type → icon map (static, avoids object literal allocation per ending). */
VNUI._ENDING_ICONS = { good: '🌟', bad: '💀', neutral: '📋', secret: '🔮' };

/** Pre-compiled HTML escape regex and lookup map (replaces 3 chained .replace() calls). */
VNUI._HTML_ESC_RE = /[&<>]/g;
VNUI._HTML_ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** Pre-built sprite position arrays for counts 0-3 (avoids object/array allocation per render). */
VNUI._SPRITE_POS = [
  [],
  [{ x: '50%', scale: 1 }],
  [{ x: '30%', scale: 0.9 }, { x: '70%', scale: 0.9 }],
  [{ x: '20%', scale: 0.8 }, { x: '50%', scale: 0.9 }, { x: '80%', scale: 0.8 }]
];
