/**
 * CampaignManager — orchestrates the connected campaign across all chapters.
 *
 * Responsibilities:
 *   - Load campaign.yaml, connectors.yaml, intro.yaml from the server
 *   - Persist campaign progress (current chapter, phase, persistent flags/items)
 *   - Provide methods for main.js to query what to play next
 *   - Track persistent state that carries across chapters
 *
 * Campaign phases:
 *   'intro'     — playing the opening intro scene
 *   'chapter'   — playing a main story chapter
 *   'connector' — playing a connector mini-scene between chapters
 *   'complete'  — all chapters finished
 *
 * @class CampaignManager
 */
class CampaignManager {
  static SAVE_KEY = 'nyantales-campaign';

  constructor() {
    this.manifest   = null;   // Parsed campaign.yaml
    this.connectors = null;   // Parsed connectors.yaml
    this.intro      = null;   // Parsed intro.yaml
    this._loaded    = false;
    this.progress   = this._defaultProgress();
  }

  _defaultProgress() {
    return {
      started:          false,
      phase:            'intro',   // 'intro' | 'connector' | 'chapter' | 'complete'
      chapterIndex:     0,         // 0-based index into manifest.chapters
      connectorKey:     null,      // key into connectors.connectors map
      completedChapters: [],       // chapter indices completed so far
      persistentFlags:  [],        // flags that survive chapter transitions
      persistentItems:  [],        // items that survive chapter transitions
    };
  }

  /** Fetch and parse all three campaign YAML files. */
  async load(basePath) {
    const base = `${basePath}/campaign`;
    const [manifestText, connectorsText, introText] = await Promise.all([
      fetch(`${base}/campaign.yaml`).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
      fetch(`${base}/connectors.yaml`).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
      fetch(`${base}/intro.yaml`).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
    ]);
    this.manifest   = YAMLParser.parse(manifestText);
    this.connectors = YAMLParser.parse(connectorsText);
    this.intro      = YAMLParser.parse(introText);
    this._loaded    = true;
    return this;
  }

  get isLoaded() { return this._loaded; }

  // ── Progress persistence ──────────────────────────────────────

  saveProgress() {
    SafeStorage.setJSON(CampaignManager.SAVE_KEY, this.progress);
  }

  loadProgress() {
    const saved = SafeStorage.getJSON(CampaignManager.SAVE_KEY, null);
    if (saved && typeof saved === 'object') {
      this.progress = { ...this._defaultProgress(), ...saved };
    } else {
      this.progress = this._defaultProgress();
    }
    return this.progress;
  }

  resetProgress() {
    this.progress = this._defaultProgress();
    this.saveProgress();
  }

  hasSave() {
    return SafeStorage.getJSON(CampaignManager.SAVE_KEY, null) !== null;
  }

  // ── Chapter / connector accessors ────────────────────────────

  get chapters() { return this.manifest?.chapters || []; }

  getCurrentChapter() {
    return this.chapters[this.progress.chapterIndex] || null;
  }

  isComplete() {
    return this.progress.phase === 'complete' ||
      (this.progress.phase === 'chapter' && this.progress.chapterIndex >= this.chapters.length);
  }

  /** True if a connector exists from the chapter at fromIdx to the next. */
  hasConnector(fromIdx) {
    const ch = this.chapters[fromIdx];
    if (!ch?.connector_to_next) return false;
    return !!(this.connectors?.connectors?.[ch.connector_to_next]);
  }

  /** Build a loadable story object from the intro YAML. */
  getIntroAsStory() {
    if (!this.intro) return null;
    return {
      slug:        'campaign-intro',
      title:       this.intro.title || 'The Fall',
      description: this.intro.description || '',
      _parsed:     this.intro,
    };
  }

  /** Build a loadable story object from a connector by key. */
  getConnectorAsStory(key) {
    const conn = this.connectors?.connectors?.[key];
    if (!conn) return null;
    return {
      slug:    `connector-${key}`,
      title:   conn.title || 'Transition',
      description: '',
      _parsed: { title: conn.title, start: conn.start, scenes: conn.scenes },
    };
  }

  /** Find a story in the story index by slug for the current chapter. */
  getChapterStory(storyIndex) {
    const ch = this.getCurrentChapter();
    if (!ch) return null;
    return storyIndex.find(s => s.slug === ch.story) || null;
  }

  /** Human-readable progress label for the title screen. */
  getProgressLabel() {
    if (!this._loaded) return null;
    const p = this.progress;
    if (!p.started) return null;
    if (p.phase === 'complete') return 'Complete!';
    const ch = this.chapters[p.chapterIndex];
    if (!ch) return null;
    const actLabel = p.phase === 'connector' ? ' (transition)' : '';
    return `Ch.${ch.chapter}: ${ch.title}${actLabel}`;
  }

  // ── Persistent state management ───────────────────────────────

  /**
   * After a chapter/connector ends, absorb flags and items that should persist.
   * @param {StoryEngine} engine - The just-finished engine instance
   */
  absorbEngineState(engine) {
    if (!engine || !this.manifest) return;
    const persistFlags = this.manifest.persistent_flags || [];
    const persistItems = this.manifest.persistent_items || [];

    for (const flag of persistFlags) {
      if (engine.state.flags.has(flag) && !this.progress.persistentFlags.includes(flag)) {
        this.progress.persistentFlags.push(flag);
      }
    }
    for (const item of persistItems) {
      if (engine.state.inventory.includes(item) && !this.progress.persistentItems.includes(item)) {
        this.progress.persistentItems.push(item);
      }
    }
  }

  /**
   * Apply persistent flags and items to a freshly created engine
   * at the start of each new chapter.
   * @param {StoryEngine} engine
   */
  applyPersistentState(engine) {
    if (!engine) return;
    for (const flag of this.progress.persistentFlags) {
      engine.state.flags.add(flag);
    }
    for (const item of this.progress.persistentItems) {
      engine.addItem(item);
    }
  }

  // ── Campaign advancement ──────────────────────────────────────

  /**
   * Advance the campaign to the next phase after the current one ends.
   * Call this after an ending is confirmed.
   * @param {StoryEngine|null} finishedEngine - The engine that just ended (for state absorption)
   * @returns {string} The new phase: 'intro'|'connector'|'chapter'|'complete'
   */
  advance(finishedEngine = null) {
    const p = this.progress;

    if (p.phase === 'intro') {
      // Intro done → first chapter
      p.started      = true;
      p.phase        = 'chapter';
      p.chapterIndex = 0;

    } else if (p.phase === 'connector') {
      // Connector done → the chapter we advanced to
      p.phase        = 'chapter';
      // chapterIndex was already set to the destination during the chapter→connector transition

    } else if (p.phase === 'chapter') {
      if (finishedEngine) this.absorbEngineState(finishedEngine);
      if (!p.completedChapters.includes(p.chapterIndex)) {
        p.completedChapters.push(p.chapterIndex);
      }

      const nextIdx = p.chapterIndex + 1;
      if (nextIdx >= this.chapters.length) {
        // All chapters done
        p.phase = 'complete';
      } else if (this.hasConnector(p.chapterIndex)) {
        // Play connector before advancing
        const ch          = this.chapters[p.chapterIndex];
        p.connectorKey    = ch.connector_to_next;
        p.chapterIndex    = nextIdx;   // pre-advance; connector phase uses connectorKey
        p.phase           = 'connector';
      } else {
        // No connector — go straight to next chapter
        p.chapterIndex = nextIdx;
        p.phase        = 'chapter';
      }
    }

    this.saveProgress();
    return p.phase;
  }
}
