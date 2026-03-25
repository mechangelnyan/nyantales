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
    this.scenes = storyData.scenes || {};
    this.state = {
      currentScene: storyData.start,
      inventory: [],
      flags: new Set(),
      visited: new Set(),
      turns: 0,
      history: []
    };
  }

  /** Get the current scene object */
  getCurrentScene() {
    return this.scenes[this.state.currentScene] || null;
  }

  /** Navigate to a scene, processing give/remove/flags from the choice */
  goToScene(sceneId, choice = null) {
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

  /** Interpolate variables in text */
  interpolate(text) {
    if (!text) return '';
    return text
      .replace(/\{\{turns\}\}/g, this.state.turns)
      .replace(/\{\{scene\}\}/g, this.state.currentScene)
      .replace(/\{\{items\}\}/g, this.state.inventory.length ? this.state.inventory.join(', ') : 'nothing')
      .replace(/\{\{item_count\}\}/g, this.state.inventory.length)
      .replace(/\{\{visited_count\}\}/g, this.state.visited.size)
      .replace(/\{\{title\}\}/g, this.story.title || '')
      .replace(/\{\{flag:(\w+)\}\}/g, (_, name) => this.state.flags.has(name) ? 'true' : 'false')
      .replace(/\{\{has:(\w+)\}\}/g, (_, name) => this.state.inventory.includes(name) ? 'true' : 'false');
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
      history: this.state.history
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
  }
}
