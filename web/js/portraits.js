/**
 * NyanTales — AI Portrait Manager
 * Maps characters to their AI-generated portrait images.
 * Falls back to procedural pixel sprites when no portrait exists.
 */

const PORTRAIT_MAP = {
  // Character name (lowercase) → image filename in assets/characters/
  // ── Original 6 (updated to new versions where available) ──
  'nyan':                'nyan_v10_s289986600.png',
  'byte':                'byte_v2_s3640488068.png',
  'mochi':               'mochi_v1_s1589397577.png',
  'pixel':               'pixel_v2_s2997965872.png',
  'query':               'query_v5_s1070319388.png',
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
  // ── NPC Portraits ──
  'api-worker-7':        'api_worker_7_v2_s694661517.png',
  'api worker 7':        'api_worker_7_v2_s694661517.png',
  'aria':                'aria_v1_s1814942480.png',
  'chairman whiskers':   'chairman_whiskers_v1_s2465180325.png',
  'chroma':              'chroma_v2_s2577919234.png',
  'closure':             'closure_v1_s565535246.png',
  'coffeebot3000':       'coffeebot3000_v2_s2465713608.png',
  'dangling':            'dangling_v2_s2843304532.png',
  'dev-cat-3':           'dev_cat_3_v2_s2786296074.png',
  'dev cat 3':           'dev_cat_3_v2_s2786296074.png',
  'dev-cat-7':           'dev_cat_7_v2_s2571678067.png',
  'dev cat 7':           'dev_cat_7_v2_s2571678067.png',
  'epsilon':             'epsilon_v1_s85334882.png',
  'nginx':               'nginx_v2_s1772417002.png',
  'serif':               'serif_v1_s343058849.png',
  'stack canary':        'stack_canary_v1_s1403342062.png',
  'the waf':             'the_waf_v2_s3708042226.png',
  'thread-a':            'thread_a_v1_s2967386881.png',
  'thread a':            'thread_a_v1_s2967386881.png',
  'thread-b':            'thread_b_v2_s1531292318.png',
  'thread b':            'thread_b_v2_s1531292318.png',
  'thread-c':            'thread_c_v2_s2517336017.png',
  'thread c':            'thread_c_v2_s2517336017.png',
  'thread-d':            'thread_d_v1_s3290992869.png',
  'thread d':            'thread_d_v1_s3290992869.png',
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
   * Preload all AI portraits to check availability and cache.
   * De-duplicates by filename so shared portraits (e.g. 'thread-a' / 'thread a')
   * only trigger one network request.
   */
  async preloadAll() {
    // Build file → [names] map to deduplicate
    const fileToNames = new Map();
    for (const [name, file] of Object.entries(PORTRAIT_MAP)) {
      if (!fileToNames.has(file)) fileToNames.set(file, []);
      fileToNames.get(file).push(name);
    }

    const promises = Array.from(fileToNames.entries()).map(([file, names]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          for (const n of names) this.preloaded.set(n, true);
          resolve(true);
        };
        img.onerror = () => {
          for (const n of names) this.failedLoads.add(n);
          resolve(false);
        };
        img.src = this.basePath + file;
      });
    });

    const results = await Promise.all(promises);
    const loaded = results.filter(Boolean).length;
    return loaded;
  }
}
