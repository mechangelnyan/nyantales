/**
 * NyanTales Visual Novel Engine
 * Handles game state, scene transitions, choices, flags, inventory, and conditions.
 *
 * @class StoryEngine
 * @param {Object} storyData - Parsed YAML story data with scenes, title, start, etc.
 *
 * State shape:
 *   currentScene {string}  - ID of the active scene
 *   inventory    {Array}   - Items the player holds
 *   flags        {Set}     - Boolean flags set during play
 *   visited      {Set}     - Scene IDs the player has seen
 *   turns        {number}  - Total scene transitions
 *   history      {Array}   - Ordered list of visited scene IDs
 */

class StoryEngine {
  constructor(storyData) {
    this.story = storyData;
    // Normalize scenes: convert is_ending/ending_type/ending_text → scene.ending object
    // so the web UI can use scene.ending consistently.
    this.scenes = StoryEngine._normalizeScenes(storyData.scenes || {});
    this.state = {
      currentScene: storyData.start,
      inventory: [],
      flags: new Set(),
      visited: new Set(),
      turns: 0,
      history: [],       // scene IDs for simple backward nav
      snapshots: []      // full state snapshots for accurate rewind
    };
  }

  /** Get the current scene object */
  getCurrentScene() {
    return this.scenes[this.state.currentScene] || null;
  }

  /** Navigate to a scene, processing give/remove/flags from the choice.
   *  Returns the scene object, or null if the target scene doesn't exist.
   */
  goToScene(sceneId, choice = null) {
    if (!sceneId || !this.scenes[sceneId]) {
      console.warn(`[StoryEngine] Scene not found: "${sceneId}"`);
      return null;
    }

    // Process choice effects before transitioning
    if (choice) {
      // Items
      if (choice.give_item) this.addItem(choice.give_item);
      if (choice.give_items) choice.give_items.forEach(i => this.addItem(i));
      if (choice.remove_item) this.removeItem(choice.remove_item);
      
      // Flags
      if (choice.set_flag) this.state.flags.add(choice.set_flag);
      if (choice.set_flags) choice.set_flags.forEach(f => this.state.flags.add(f));
      if (choice.remove_flag) this.state.flags.delete(choice.remove_flag);
    }

    // Snapshot current state before transitioning (for accurate rewind)
    this.state.snapshots.push({
      scene: this.state.currentScene,
      inventory: [...this.state.inventory],
      flags: [...this.state.flags],
      turns: this.state.turns
    });
    // Cap snapshot history to prevent memory bloat
    if (this.state.snapshots.length > 200) this.state.snapshots.shift();

    // Track visit + turns
    this.state.visited.add(this.state.currentScene);
    this.state.turns++;
    this.state.history.push(this.state.currentScene);

    // Transition
    this.state.currentScene = sceneId;
    this.state.visited.add(sceneId);

    return this.getCurrentScene();
  }

  /** Get available choices (filtered by conditions) */
  getAvailableChoices() {
    const scene = this.getCurrentScene();
    if (!scene || !scene.choices) return [];

    return scene.choices.filter(c => this.checkChoiceCondition(c));
  }

  /** Check if a choice's conditions are met */
  checkChoiceCondition(choice) {
    if (choice.requires_flag && !this.state.flags.has(choice.requires_flag)) return false;
    if (choice.requires_not_flag && this.state.flags.has(choice.requires_not_flag)) return false;
    if (choice.requires_item && !this.state.inventory.includes(choice.requires_item)) return false;
    if (choice.requires_no_item && this.state.inventory.includes(choice.requires_no_item)) return false;
    if (choice.requires_visited && !this.state.visited.has(choice.requires_visited)) return false;
    if (choice.requires_not_visited && this.state.visited.has(choice.requires_not_visited)) return false;
    if (choice.condition) return this.evaluateCondition(choice.condition);
    return true;
  }

  /** Evaluate a condition object */
  evaluateCondition(cond) {
    if (!cond) return true;

    // Compound conditions
    if (cond.all) return cond.all.every(c => this.evaluateCondition(c));
    if (cond.any) return cond.any.some(c => this.evaluateCondition(c));
    if (cond.not) return !this.evaluateCondition(cond.not);

    // Simple conditions
    if (cond.flag) return this.state.flags.has(cond.flag);
    if (cond.not_flag) return !this.state.flags.has(cond.not_flag);
    if (cond.has_item) return this.state.inventory.includes(cond.has_item);
    if (cond.no_item) return !this.state.inventory.includes(cond.no_item);
    if (cond.visited) return this.state.visited.has(cond.visited);
    if (cond.not_visited) return !this.state.visited.has(cond.not_visited);
    if (cond.min_turns != null) return this.state.turns >= cond.min_turns;
    if (cond.max_turns != null) return this.state.turns <= cond.max_turns;

    return true;
  }

  /** Get conditional text blocks that match current state */
  getConditionalText() {
    const scene = this.getCurrentScene();
    if (!scene || !scene.conditional) return [];

    return scene.conditional.filter(ct => this.evaluateCondition(ct.condition));
  }

  /**
   * Normalize raw YAML scene objects: converts is_ending/ending_type/ending_text
   * flat fields into an `ending` object that the UI expects.
   * Also normalizes `effects: [list]` → `effect: string` for the first effect.
   * @param {Object} rawScenes
   * @returns {Object}
   */
  static _normalizeScenes(rawScenes) {
    const out = {};
    for (const [id, scene] of Object.entries(rawScenes)) {
      if (!scene.is_ending) {
        out[id] = scene;
        continue;
      }
      const type = scene.ending_type || 'neutral';
      out[id] = {
        ...scene,
        ending: {
          type,
          text: scene.ending_text || scene.text || '',
          title: scene.ending_title || null,
        },
      };
    }
    return out;
  }

  // Pre-compiled interpolation patterns (shared across all engine instances)
  static _INTERP_RE = /\{\{(turns|scene|items|item_count|visited_count|title|flag:\w+|has:\w+)\}\}/g;

  /** Interpolate variables in text using a single regex pass */
  interpolate(text) {
    if (!text) return '';
    return text.replace(StoryEngine._INTERP_RE, (match, key) => {
      switch (key) {
        case 'turns':         return this.state.turns;
        case 'scene':         return this.state.currentScene;
        case 'items':         return this.state.inventory.length ? this.state.inventory.join(', ') : 'nothing';
        case 'item_count':    return this.state.inventory.length;
        case 'visited_count': return this.state.visited.size;
        case 'title':         return this.story.title || '';
        default:
          if (key.startsWith('flag:')) return this.state.flags.has(key.slice(5)) ? 'true' : 'false';
          if (key.startsWith('has:'))  return this.state.inventory.includes(key.slice(4)) ? 'true' : 'false';
          return match;
      }
    });
  }

  /** Inventory management */
  addItem(item) {
    if (!this.state.inventory.includes(item)) {
      this.state.inventory.push(item);
    }
  }

  removeItem(item) {
    this.state.inventory = this.state.inventory.filter(i => i !== item);
  }

  /**
   * Rewind to the previous scene, restoring inventory and flags from the snapshot.
   * Returns the scene object or null if nothing to rewind to.
   * @returns {Object|null}
   */
  rewindScene() {
    if (this.state.snapshots.length === 0) return null;

    const snap = this.state.snapshots.pop();
    this.state.history.pop();

    this.state.currentScene = snap.scene;
    this.state.inventory = snap.inventory;
    this.state.flags = new Set(snap.flags);
    this.state.turns = snap.turns;

    return this.getCurrentScene();
  }

  /**
   * Jump directly to a scene while preserving the current playthrough state.
   * Useful for revisiting already-unlocked scenes from a scene-select panel.
   * Flags, inventory, and visited history are kept as-is.
   * @param {string} sceneId
   * @returns {Object|null}
   */
  jumpToScene(sceneId) {
    if (!this.scenes[sceneId]) return null;
    this.state.history.push(this.state.currentScene);
    this.state.currentScene = sceneId;
    this.state.visited.add(sceneId);
    return this.getCurrentScene();
  }

  /** Save/Load state */
  saveState() {
    return JSON.stringify({
      currentScene: this.state.currentScene,
      inventory: this.state.inventory,
      flags: [...this.state.flags],
      visited: [...this.state.visited],
      turns: this.state.turns,
      history: this.state.history,
      snapshots: this.state.snapshots
    });
  }

  loadState(json) {
    const data = JSON.parse(json);
    this.state.currentScene = data.currentScene;
    this.state.inventory = data.inventory;
    this.state.flags = new Set(data.flags);
    this.state.visited = new Set(data.visited);
    this.state.turns = data.turns;
    this.state.history = data.history || [];
    this.state.snapshots = data.snapshots || [];
  }
}

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

