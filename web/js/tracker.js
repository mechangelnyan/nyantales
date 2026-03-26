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
    this._saveTimer = null;
    this._SAVE_DEBOUNCE_MS = 500;
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

  /**
   * Record elapsed reading time for a story session.
   * Called on ending or when returning to menu mid-story.
   * @param {string} slug - Story slug
   * @param {number} elapsedMs - Milliseconds spent reading
   */
  recordReadingTime(slug, elapsedMs) {
    if (!elapsedMs || elapsedMs <= 0) return;
    const story = this.getStory(slug);
    story.totalReadingMs = (story.totalReadingMs || 0) + elapsedMs;
    // Also track global total
    this.data.totalReadingMs = (this.data.totalReadingMs || 0) + elapsedMs;
    this._save();
  }

  /**
   * Get total reading time across all stories in ms.
   * @returns {number}
   */
  getTotalReadingMs() {
    return this.data.totalReadingMs || 0;
  }

  /**
   * Format milliseconds as a human-readable duration string.
   * @param {number} ms
   * @returns {string}
   */
  static formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
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

    // Endings are critical — flush immediately, don't debounce
    this._saveNow();
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

  // ── Favorites ──

  /** Toggle favorite status for a story */
  toggleFavorite(slug) {
    if (!this.data.favorites) this.data.favorites = [];
    const idx = this.data.favorites.indexOf(slug);
    if (idx === -1) {
      this.data.favorites.push(slug);
    } else {
      this.data.favorites.splice(idx, 1);
    }
    // User action — flush immediately
    this._saveNow();
    return this.isFavorite(slug);
  }

  /** Check if a story is favorited */
  isFavorite(slug) {
    return (this.data.favorites || []).includes(slug);
  }

  /** Get all favorite slugs */
  getFavorites() {
    return this.data.favorites || [];
  }

  /** Reset all tracking data */
  reset() {
    this.data = { stories: {}, favorites: [] };
    this._save();
  }

  // ── Storage ──

  _load() {
    if (typeof SafeStorage !== 'undefined') {
      return SafeStorage.getJSON(this.STORAGE_KEY, { stories: {} });
    }
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : { stories: {} };
    } catch (e) {
      return { stories: {} };
    }
  }

  /**
   * Debounced save — coalesces rapid writes (e.g. during skip mode)
   * into a single localStorage write after _SAVE_DEBOUNCE_MS idle.
   */
  _save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._saveNow(), this._SAVE_DEBOUNCE_MS);
  }

  /** Immediately persist data to localStorage. */
  _saveNow() {
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setJSON(this.STORAGE_KEY, this.data);
    } else {
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data)); } catch { /* noop */ }
    }
  }
}
