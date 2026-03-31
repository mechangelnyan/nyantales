/**
 * NyanTales — Sprite Manager
 * Manages character sprite positioning, visibility, caching, and animations.
 * Manages character sprite lifecycle: positioning, fade in/out, speaking state, and effect timers.
 */

class SpriteManager {
  /**
   * @param {HTMLElement} spritesEl - Container element for sprites
   * @param {PortraitManager} portraits - Portrait/sprite lookup manager
   */
  constructor(spritesEl, portraits) {
    this.spritesEl = spritesEl;
    this.portraits = portraits;
    this.currentStorySlug = null;

    /** @type {Map<string, HTMLElement>} Active sprite name → wrapper element */
    this._activeSprites = new Map();

    // Per-story caches (cleared on story change)
    this._speakerCache = new Map();     // speaker name → character object
    this._charNameCache = new Map();    // char name → lowercase
    this._charHyphenCache = new Map();  // char name → hyphenated

    // Reusable Set buffer for fade-out diffing (avoids allocation per render)
    this._visibleNamesBuf = new Set();

    // Effect timers for sprite fade-out timeouts
    this._effectTimers = [];
  }

  /**
   * Reset per-story caches when changing stories.
   * @param {string|null} slug
   */
  setStorySlug(slug) {
    this.currentStorySlug = slug;
    this._speakerCache.clear();
    this._charNameCache.clear();
    this._charHyphenCache.clear();
  }

  /** Remove all sprites and cancel pending effect timers. */
  clear() {
    this._clearEffectTimers();
    this.spritesEl.textContent = '';
    this._activeSprites.clear();
  }

  /** @returns {Map<string, HTMLElement>} Active sprites map (name → element) */
  get activeSprites() { return this._activeSprites; }

  /**
   * Find a character matching a speaker name, with per-story caching.
   * Avoids repeated array.find() on every scene render for the same speaker.
   * @param {string} speakerName
   * @returns {Object|null}
   */
  findSpeakerChar(speakerName) {
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

  /**
   * Update visible character sprites based on scene state.
   * @param {Object} scene - Current scene data
   * @param {Object} engine - Story engine instance
   * @param {Object} [sceneLower] - Pre-computed lowercase strings { loc, scn, txt, spk }
   */
  update(scene, engine, sceneLower) {
    const slug = this.currentStorySlug;
    if (!slug) return;

    const chars = CHARACTER_DATA[slug] || [];
    if (chars.length === 0) return;

    const sl = sceneLower;
    const speakerLower = sl ? sl.spk : (scene.speaker || '').toLowerCase();
    const textLower = sl ? sl.txt : (scene.text || '').toLowerCase();
    const sceneIdLower = sl ? sl.scn : (engine.state.currentScene || '').toLowerCase();

    // Build visible list with parallel speaker flags (zero object allocation)
    const visible = [];
    const speakerFlags = [];
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

    const positions = SpriteManager._POSITIONS(visible.length);

    // Fade out removed sprites
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

        requestAnimationFrame(() => {
          spriteEl.style.setProperty('--sprite-x', pos.x);
          spriteEl.style.setProperty('--sprite-scale', pos.scale);
          img.classList.add('visible');
        });
      } else {
        spriteEl.style.setProperty('--sprite-x', pos.x);
        spriteEl.style.setProperty('--sprite-scale', pos.scale);
      }

      spriteEl.classList.toggle('speaking', isSpeaker);
      spriteEl.classList.remove('ending-good', 'ending-bad', 'ending-neutral');
    }
  }

  /**
   * Apply ending CSS class to all active sprites.
   * @param {string} type - Ending type (good/bad/neutral/secret)
   */
  applyEndingState(type) {
    const endingClass = `ending-${type === 'secret' ? 'neutral' : type}`;
    for (const [, wrap] of this._activeSprites) {
      wrap.classList.remove('ending-good', 'ending-bad', 'ending-neutral');
      wrap.classList.add(endingClass);
    }
  }

  /** Track a setTimeout so it can be cancelled on scene teardown. */
  _trackTimer(id) { this._effectTimers.push(id); return id; }

  /** Cancel all pending effect timers. */
  _clearEffectTimers() {
    for (const id of this._effectTimers) clearTimeout(id);
    this._effectTimers.length = 0;
  }

  /**
   * Get position array for N sprites. Static arrays for 0-3 (zero allocation).
   * @param {number} count
   * @returns {Array<{x: string, scale: number}>}
   */
  static _POSITIONS(count) {
    if (count <= 3) return SpriteManager._POS_STATIC[count];
    return Array.from({ length: count }, (_, i) => ({
      x: `${15 + (70 * i / (count - 1))}%`,
      scale: 0.75
    }));
  }
}

/** Pre-built sprite position arrays for counts 0-3. */
SpriteManager._POS_STATIC = [
  [],
  [{ x: '50%', scale: 1 }],
  [{ x: '30%', scale: 0.9 }, { x: '70%', scale: 0.9 }],
  [{ x: '20%', scale: 0.8 }, { x: '50%', scale: 0.9 }, { x: '80%', scale: 0.8 }]
];
