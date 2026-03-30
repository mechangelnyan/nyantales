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
      if (choice.give_items) { for (const i of choice.give_items) this.addItem(i); }
      if (choice.remove_item) this.removeItem(choice.remove_item);
      
      // Flags
      if (choice.set_flag) this.state.flags.add(choice.set_flag);
      if (choice.set_flags) { for (const f of choice.set_flags) this.state.flags.add(f); }
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
    for (const id in rawScenes) {
      const scene = rawScenes[id];
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
    this.state.inventory = data.inventory || [];
    this.state.flags = new Set(data.flags);
    this.state.visited = new Set(data.visited);
    this.state.turns = data.turns || 0;
    // Cap history/snapshots on load to prevent memory bloat from corrupt or very old saves
    const hist = data.history || [];
    this.state.history = hist.length > 500 ? hist.slice(-500) : hist;
    const snaps = data.snapshots || [];
    this.state.snapshots = snaps.length > 200 ? snaps.slice(-200) : snaps;
  }
}
