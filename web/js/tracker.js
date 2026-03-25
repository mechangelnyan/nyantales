/**
 * NyanTales — Story Completion Tracker
 * Tracks which stories have been completed, endings discovered,
 * and provides stats for the title screen.
 */

class StoryTracker {
  constructor() {
    this.STORAGE_KEY = 'nyantales-tracker';
    this.data = this._load();
  }

  /** Get tracking data for a story */
  getStory(slug) {
    if (!this.data.stories[slug]) {
      this.data.stories[slug] = {
        completed: false,
        endingsFound: [],
        totalPlays: 0,
        bestTurns: null,
        lastPlayed: null
      };
    }
    return this.data.stories[slug];
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
    if (!story.endingsFound.includes(endingKey)) {
      story.endingsFound.push(endingKey);
    }

    this._save();
    return { isNewEnding: story.endingsFound.length > story.endingsFound.indexOf(endingKey) + 1 ? false : true };
  }

  /** Get overall stats */
  getStats() {
    const slugs = Object.keys(this.data.stories);
    const completed = slugs.filter(s => this.data.stories[s].completed);
    const totalEndings = slugs.reduce((sum, s) => sum + this.data.stories[s].endingsFound.length, 0);
    const totalPlays = slugs.reduce((sum, s) => sum + this.data.stories[s].totalPlays, 0);

    return {
      storiesCompleted: completed.length,
      totalEndings: totalEndings,
      totalPlays: totalPlays
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
