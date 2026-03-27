/**
 * NyanTales — AI Portrait Manager
 * Maps characters to their AI-generated portrait images.
 * Falls back to procedural pixel sprites when no portrait exists.
 */

const PORTRAIT_MAP = {
  // Character name (lowercase) → image filename in assets/characters/
  // ── Original 6 (updated to new versions where available) ──
  'nyan':                'nyan_v5.png',
  'byte':                'byte_v2_s3640488068.png',
  'mochi':               'mochi_v1_s1589397577.png',
  'pixel':               'pixel_v2_s2997965872.png',
  'query':               'query.png',
  'inspector whiskers':  'inspector_whiskers_v1_s3700622707.png',
  // ── New portraits (19 from use/ folder) ──
  'cache cat':           'cache_cat_v1_s2137356658.png',
  'caret':               'caret_v2_s1238923086.png',
  'glyph':               'glyph_v2_s782893174.png',
  'loop':                'loop_v1_s3690775859.png',
  'mantissa':            'mantissa_v2_s1338624289.png',
  'merge cat':           'merge_cat_v1_s1821845315.png',
  'mutex':               'mutex_v1_s1937636553.png',
  'nibble':              'nibble_v2_s2628395722.png',
  'pippa':               'pippa_v1_s3020603209.png',
  'pointer':             'pointer_v1_s3391978122.png',
  'recurse':             'recurse_v1_s2918635092.png',
  'server room cat':     'server_room_cat_v1_s2656082059.png',
  'sudo':                'sudo_v1_s2698937433.png',
  'tls cat':             'tls_cat_v1_s804870981.png',
  'whisker':             'whisker_v1_s2327025987.png',
  'fork bomb cat':      'fork_bomb_cat_v2_s8162739.png',
  'tabby':               'tabby_v2_s8371526.png',
  'the scheduler':       'the_scheduler_v2_s2738491.png',
  'zombie cat':          'zombie_cat_v2_s1847362.png',
  'packet':              'packet_v2_s7294015.png',
  // ── Still missing: Nyan (new version) ──
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
