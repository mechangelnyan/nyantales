/**
 * NyanTales — AI Portrait Manager
 * Maps characters to their AI-generated portrait images.
 * Falls back to procedural pixel sprites when no portrait exists.
 */

const PORTRAIT_MAP = {
  // Character name (lowercase) → image filename in assets/characters/
  'nyan':                'nyan_v5.png',
  'byte':                'byte.png',
  'mochi':               'mochi_v3.png',
  'pixel':               'pixel_v2.png',
  'query':               'query.png',
  'inspector whiskers':  'inspector_whiskers.png',
};

class PortraitManager {
  constructor(spriteGen) {
    this.spriteGen = spriteGen;
    this.basePath = 'assets/characters/';
    this.preloaded = new Map();
    this.failedLoads = new Set();
  }

  /**
   * Get portrait URL for a character.
   * Returns AI portrait path if available, otherwise procedural sprite data URL.
   */
  getPortrait(name, appearance) {
    const key = name.toLowerCase();
    
    // Check if we have an AI portrait
    if (PORTRAIT_MAP[key] && !this.failedLoads.has(key)) {
      return this.basePath + PORTRAIT_MAP[key];
    }

    // Fall back to procedural sprite
    return this.spriteGen.generatePortrait(name, appearance);
  }

  /**
   * Get small sprite for story cards and speaker plates.
   * Uses AI portrait thumbnail if available.
   */
  getSprite(name, appearance) {
    const key = name.toLowerCase();
    
    if (PORTRAIT_MAP[key] && !this.failedLoads.has(key)) {
      return this.basePath + PORTRAIT_MAP[key];
    }

    return this.spriteGen.generate(name, appearance);
  }

  /**
   * Check if a character has an AI portrait
   */
  hasPortrait(name) {
    return !!PORTRAIT_MAP[name.toLowerCase()] && !this.failedLoads.has(name.toLowerCase());
  }

  /**
   * Preload all AI portraits to check availability and cache
   */
  async preloadAll() {
    const promises = Object.entries(PORTRAIT_MAP).map(([name, file]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.preloaded.set(name, true);
          resolve(true);
        };
        img.onerror = () => {
          this.failedLoads.add(name);
          resolve(false);
        };
        img.src = this.basePath + file;
      });
    });

    const results = await Promise.all(promises);
    const loaded = results.filter(Boolean).length;
    // Portrait preload complete (loaded/total logged only in dev)
    return loaded;
  }
}
