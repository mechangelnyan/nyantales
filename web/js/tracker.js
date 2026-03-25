/**
 * NyanTales — Story Completion Tracker
 * Tracks which stories have been completed, endings discovered, scene visits,
 * and provides stats for the title screen and per-story progress bars.
 *
 * @class StoryTracker
 *
 * Per-story data shape:
 *   completed    {boolean}  - Whether at least one ending has been reached
 *   endingsFound {string[]} - Unique ending keys discovered
 *   totalPlays   {number}   - Total times an ending was reached
 *   bestTurns    {number|null} - Fewest turns to reach any ending
 *   lastPlayed   {number|null} - Timestamp of last play
 *   visitedScenes {string[]}   - All unique scene IDs the player has seen
 */

class StoryTracker {
  constructor() {
    this.STORAGE_KEY = 'nyantales-tracker';
    this.data = this._load();
  }

  /** Get tracking data for a story, creating if absent */
  getStory(slug) {
    if (!this.data.stories[slug]) {
      this.data.stories[slug] = {
        completed: false,
        endingsFound: [],
        totalPlays: 0,
        bestTurns: null,
        lastPlayed: null,
        visitedScenes: []
      };
    }
    // Migration: add visitedScenes to old entries
    if (!this.data.stories[slug].visitedScenes) {
      this.data.stories[slug].visitedScenes = [];
    }
    return this.data.stories[slug];
  }

  /**
   * Record visited scenes from the engine's visited set.
   * Called periodically (e.g. after each scene transition or on ending).
   * Merges new scene IDs without duplicates.
   * @param {string} slug - Story slug
   * @param {Set<string>} visitedSet - engine.state.visited
   */
  recordVisitedScenes(slug, visitedSet) {
    const story = this.getStory(slug);
    const existing = new Set(story.visitedScenes);
    let changed = false;
    for (const sceneId of visitedSet) {
      if (!existing.has(sceneId)) {
        story.visitedScenes.push(sceneId);
        existing.add(sceneId);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  /**
   * Get per-story progress as a percentage (0–100).
   * @param {string} slug - Story slug
   * @param {number} totalScenes - Total scenes in the story YAML
   * @returns {number}
   */
  getProgress(slug, totalScenes) {
    if (totalScenes <= 0) return 0;
    const story = this.getStory(slug);
    return Math.min(100, Math.round((story.visitedScenes.length / totalScenes) * 100));
  }

  /** Record a story completion */
  recordEnding(slug, ending, turns) {
    const story = this.getStory(slug);
    story.completed = true;
    story.totalPlays++;
    story.lastPlayed = Date.now();

    if (story.bestTurns === null || turns < story.bestTurns) {
      story.bestTurns = turns;
    }

    // Track unique endings
    const endingKey = ending.title || ending.type || 'unknown';
    const isNew = !story.endingsFound.includes(endingKey);
    if (isNew) {
      story.endingsFound.push(endingKey);
    }

    this._save();
    return { isNewEnding: isNew };
  }

  /** Get overall stats */
  getStats() {
    const slugs = Object.keys(this.data.stories);
    const completed = slugs.filter(s => this.data.stories[s].completed);
    const totalEndings = slugs.reduce((sum, s) => sum + this.data.stories[s].endingsFound.length, 0);
    const totalPlays = slugs.reduce((sum, s) => sum + this.data.stories[s].totalPlays, 0);

    return {
      storiesCompleted: completed.length,
      totalEndings,
      totalPlays
    };
  }

  /** Check if story is completed */
  isCompleted(slug) {
    return this.data.stories[slug]?.completed || false;
  }

  /** Get endings count for a story */
  endingCount(slug) {
    return this.data.stories[slug]?.endingsFound?.length || 0;
  }

  /** Get number of visited scenes for a story */
  visitedSceneCount(slug) {
    return this.data.stories[slug]?.visitedScenes?.length || 0;
  }

  /** Reset all tracking data */
  reset() {
    this.data = { stories: {} };
    this._save();
  }

  // ── Storage ──

  _load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : { stories: {} };
    } catch (e) {
      return { stories: {} };
    }
  }

  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* localStorage might be unavailable */ }
  }
}
