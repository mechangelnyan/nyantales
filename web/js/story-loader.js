/**
 * StoryLoader — story index loading, lazy YAML parsing, and O(1) lookups.
 *
 * Manages the story index array plus two Maps for O(1) slug→story and story→index lookups.
 * Tries a pre-built manifest first (production, ~8KB) and falls through to
 * fetching all 30 YAML files individually (dev mode).
 */
class StoryLoader {
  /** Canonical list of story slugs. */
  static SLUGS = [
    '404-not-found', 'buffer-overflow', 'cache-invalidation', 'cafe-debug',
    'deadlock', 'dns-quest', 'docker-escape', 'encoding-error',
    'floating-point', 'fork-bomb', 'garbage-collection', 'git-blame',
    'haunted-network', 'infinite-loop', 'kernel-panic', 'memory-leak',
    'merge-conflict', 'midnight-deploy', 'permission-denied',
    'pipeline-purrdition', 'race-condition', 'regex-catastrophe',
    'segfault', 'server-room-stray', 'sql-injection', 'stack-overflow',
    'the-terminal-cat', 'tls-pawshake', 'vim-escape', 'zombie-process'
  ];

  constructor(router) {
    /** @type {AppRouter} */
    this._router = router;

    /** @type {Object[]} ordered story entries */
    this.index = [];

    /** @type {Map<string, Object>} slug → story (O(1) lookup) */
    this.slugMap = new Map();

    /** @type {Map<Object, number>} story → position in index (O(1) indexOf) */
    this.idxMap = new Map();
  }

  /**
   * Load story index. Tries manifest first (production), falls back to 30 YAML fetches (dev).
   * Populates index, slugMap, and idxMap.
   * @returns {Promise<Object[]>} the loaded story index
   */
  async load() {
    const base = this._router.storyBasePath();

    // Try manifest first (generated at build time, ~8KB vs ~1.6MB of YAML)
    try {
      const manifestUrl = base.replace(/stories$/, 'story-manifest.json');
      const resp = await fetch(manifestUrl);
      if (resp.ok) {
        const manifest = await resp.json();
        if (Array.isArray(manifest) && manifest.length > 0) {
          this._clear();
          for (let i = 0; i < manifest.length; i++) {
            const m = manifest[i];
            const entry = {
              slug: m.slug,
              title: m.title || m.slug,
              description: m.description || '',
              _parsed: null, // lazy-loaded on play
              _meta: { sceneCount: m.sceneCount, wordCount: m.wordCount, totalEndings: m.totalEndings, readMins: m.readMins }
            };
            this.index.push(entry);
            this.slugMap.set(m.slug, entry);
            this.idxMap.set(entry, i);
          }
          return this.index;
        }
      }
    } catch (_) { /* manifest not available, fall through to YAML loading */ }

    // Fallback: fetch and parse all YAML files (dev mode)
    const results = await Promise.allSettled(
      StoryLoader.SLUGS.map(async slug => {
        try {
          const resp = await fetch(`${base}/${slug}/story.yaml`);
          if (!resp.ok) return null;
          const text = await resp.text();
          const parsed = YAMLParser.parse(text);
          if (!parsed || !parsed.scenes) {
            console.warn(`[NyanTales] Invalid story data: ${slug}`);
            return null;
          }
          return { slug, title: parsed.title || slug, description: parsed.description || '', _parsed: parsed, _meta: null };
        } catch (err) {
          console.warn(`[NyanTales] Failed to load story: ${slug}`, err);
          return null;
        }
      })
    );
    this._clear();
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const entry = r.value;
        this.idxMap.set(entry, this.index.length);
        this.index.push(entry);
        this.slugMap.set(entry.slug, entry);
      }
    }
    return this.index;
  }

  /**
   * Lazy-load and parse a story's full YAML. Caches result on story._parsed.
   * @param {Object} story - story index entry
   * @returns {Promise<Object|null>} parsed YAML data or null on failure
   */
  async loadFull(story) {
    if (story._parsed) return story._parsed;
    const base = this._router.storyBasePath();
    try {
      const resp = await fetch(`${base}/${story.slug}/story.yaml`);
      if (!resp.ok) return null;
      const text = await resp.text();
      const parsed = YAMLParser.parse(text);
      if (!parsed || !parsed.scenes) return null;
      story._parsed = parsed;
      // Backfill _meta if it wasn't from the manifest
      if (!story._meta) {
        let sc = 0, wc = 0, te = 0;
        for (const id in parsed.scenes) {
          sc++;
          const s = parsed.scenes[id];
          if (s.text) wc += s.text.split(/\s+/).length;
          if (s.is_ending || s.ending) te++;
        }
        story._meta = { sceneCount: sc, wordCount: wc, totalEndings: te, readMins: Math.max(1, Math.ceil(wc / 200)) };
      }
      return parsed;
    } catch (err) {
      console.warn(`[NyanTales] Failed to lazy-load story: ${story.slug}`, err);
      return null;
    }
  }

  /**
   * Get a story by slug (O(1)).
   * @param {string} slug
   * @returns {Object|undefined}
   */
  get(slug) { return this.slugMap.get(slug); }

  /**
   * Pick a random story, preferring unplayed. Reservoir sampling (zero allocation).
   * @param {function(string): boolean} isCompleted — slug → completed check
   * @returns {Object} a story entry
   */
  pickRandom(isCompleted) {
    let pick = null;
    let count = 0;
    for (const s of this.index) {
      if (!isCompleted(s.slug)) {
        count++;
        if (Math.random() * count < 1) pick = s;
      }
    }
    if (!pick) pick = this.index[Math.floor(Math.random() * this.index.length)];
    return pick;
  }

  /** Clear all internal data structures. */
  _clear() {
    this.index = [];
    this.slugMap.clear();
    this.idxMap.clear();
  }
}
