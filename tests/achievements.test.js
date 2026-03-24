import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = path.join(__dirname, '..', 'saves');
const ACHIEVEMENTS_FILE = path.join(SAVES_DIR, 'achievements.json');

import {
  ACHIEVEMENTS,
  loadAchievements,
  saveAchievements,
  recordPlaythrough,
  checkAchievements,
  gatherStats,
  renderAllAchievements,
  renderNewAchievements,
} from '../src/achievements.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

let savedFile = null;

function backupAchievements() {
  if (fs.existsSync(ACHIEVEMENTS_FILE)) {
    savedFile = fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8');
  } else {
    savedFile = null;
  }
}

function restoreAchievements() {
  if (savedFile !== null) {
    fs.writeFileSync(ACHIEVEMENTS_FILE, savedFile, 'utf8');
  } else if (fs.existsSync(ACHIEVEMENTS_FILE)) {
    fs.unlinkSync(ACHIEVEMENTS_FILE);
  }
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('Achievements', () => {
  beforeEach(() => backupAchievements());
  afterEach(() => restoreAchievements());

  describe('ACHIEVEMENTS registry', () => {
    it('has unique IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      assert.equal(ids.length, new Set(ids).size, 'Duplicate achievement IDs found');
    });

    it('every achievement has required fields', () => {
      for (const ach of ACHIEVEMENTS) {
        assert.ok(ach.id, `Missing id`);
        assert.ok(ach.name, `Missing name for ${ach.id}`);
        assert.ok(ach.icon, `Missing icon for ${ach.id}`);
        assert.ok(ach.description, `Missing description for ${ach.id}`);
        assert.ok(ach.category, `Missing category for ${ach.id}`);
        assert.equal(typeof ach.check, 'function', `check must be a function for ${ach.id}`);
      }
    });

    it('has at least 10 achievements', () => {
      assert.ok(ACHIEVEMENTS.length >= 10, `Only ${ACHIEVEMENTS.length} achievements defined`);
    });
  });

  describe('loadAchievements / saveAchievements', () => {
    it('returns empty state when no file exists', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);
      const data = loadAchievements();
      assert.deepEqual(data.unlocked, {});
    });

    it('round-trips data', () => {
      const data = {
        unlocked: { first_ending: { unlockedAt: '2026-01-01T00:00:00Z' } },
        playStats: { minTurns: 3 },
      };
      saveAchievements(data);
      const loaded = loadAchievements();
      assert.deepEqual(loaded.unlocked, data.unlocked);
      assert.equal(loaded.playStats.minTurns, 3);
    });
  });

  describe('recordPlaythrough', () => {
    it('tracks minimum turns', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      // First playthrough: 10 turns
      recordPlaythrough({
        turnCount: 10,
        visited: new Set(['a', 'b', 'c']),
        inventory: ['item1'],
      });
      let data = loadAchievements();
      assert.equal(data.playStats.minTurns, 10);

      // Second playthrough: 4 turns (new min)
      recordPlaythrough({
        turnCount: 4,
        visited: new Set(['a', 'b']),
        inventory: [],
      });
      data = loadAchievements();
      assert.equal(data.playStats.minTurns, 4);

      // Third playthrough: 8 turns (no change)
      recordPlaythrough({
        turnCount: 8,
        visited: new Set(['a']),
        inventory: [],
      });
      data = loadAchievements();
      assert.equal(data.playStats.minTurns, 4);
    });

    it('tracks max scenes visited', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      recordPlaythrough({
        turnCount: 5,
        visited: new Set(Array.from({ length: 15 }, (_, i) => `s${i}`)),
        inventory: [],
      });
      const data = loadAchievements();
      assert.equal(data.playStats.maxScenesVisited, 15);
    });

    it('tracks max items', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      recordPlaythrough({
        turnCount: 5,
        visited: new Set(['a']),
        inventory: ['a', 'b', 'c', 'd', 'e', 'f'],
      });
      const data = loadAchievements();
      assert.equal(data.playStats.maxItems, 6);
    });

    it('increments total playthroughs', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      recordPlaythrough({ turnCount: 5, visited: new Set(), inventory: [] });
      recordPlaythrough({ turnCount: 3, visited: new Set(), inventory: [] });
      recordPlaythrough({ turnCount: 7, visited: new Set(), inventory: [] });
      const data = loadAchievements();
      assert.equal(data.playStats.totalPlaythroughs, 3);
    });
  });

  describe('checkAchievements', () => {
    it('unlocks first_ending with 1 ending found', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      const stats = {
        totalEndingsFound: 1, totalEndings: 20,
        totalSecretEndings: 5, secretEndingsFound: 0,
        goodEndingsFound: 1, badEndingsFound: 0,
        storiesCompleted: 1, storiesFullyCompleted: 0,
        totalStories: 6, minTurns: 8, maxScenesVisited: 5, maxItems: 1,
      };
      const newOnes = checkAchievements(stats);
      const ids = newOnes.map(a => a.id);
      assert.ok(ids.includes('first_ending'), 'Should unlock first_ending');
    });

    it('unlocks speedrun with <= 5 turns', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      const stats = {
        totalEndingsFound: 1, totalEndings: 20,
        totalSecretEndings: 5, secretEndingsFound: 0,
        goodEndingsFound: 0, badEndingsFound: 0,
        storiesCompleted: 1, storiesFullyCompleted: 0,
        totalStories: 6, minTurns: 4, maxScenesVisited: 4, maxItems: 0,
      };
      const newOnes = checkAchievements(stats);
      const ids = newOnes.map(a => a.id);
      assert.ok(ids.includes('speedrun'), 'Should unlock speedrun');
    });

    it('does not double-unlock', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      const stats = {
        totalEndingsFound: 1, totalEndings: 20,
        totalSecretEndings: 5, secretEndingsFound: 0,
        goodEndingsFound: 1, badEndingsFound: 0,
        storiesCompleted: 1, storiesFullyCompleted: 0,
        totalStories: 6, minTurns: 8, maxScenesVisited: 5, maxItems: 1,
      };
      const first = checkAchievements(stats);
      assert.ok(first.length > 0);

      const second = checkAchievements(stats);
      assert.equal(second.length, 0, 'Should not unlock already-unlocked achievements');
    });

    it('unlocks hoarder with 5+ items', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      const stats = {
        totalEndingsFound: 1, totalEndings: 20,
        totalSecretEndings: 5, secretEndingsFound: 0,
        goodEndingsFound: 0, badEndingsFound: 0,
        storiesCompleted: 1, storiesFullyCompleted: 0,
        totalStories: 6, minTurns: 20, maxScenesVisited: 10, maxItems: 5,
      };
      const newOnes = checkAchievements(stats);
      const ids = newOnes.map(a => a.id);
      assert.ok(ids.includes('hoarder'), 'Should unlock hoarder');
    });

    it('unlocks master_completionist when all endings found', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);

      const stats = {
        totalEndingsFound: 27, totalEndings: 27,
        totalSecretEndings: 6, secretEndingsFound: 6,
        goodEndingsFound: 10, badEndingsFound: 5,
        storiesCompleted: 6, storiesFullyCompleted: 6,
        totalStories: 6, minTurns: 4, maxScenesVisited: 35, maxItems: 6,
      };
      const newOnes = checkAchievements(stats);
      const ids = newOnes.map(a => a.id);
      assert.ok(ids.includes('master_completionist'), 'Should unlock master_completionist');
      assert.ok(ids.includes('all_secrets'), 'Should unlock all_secrets');
      assert.ok(ids.includes('all_stories'), 'Should unlock all_stories');
    });
  });

  describe('renderAllAchievements', () => {
    it('runs without throwing', () => {
      if (fs.existsSync(ACHIEVEMENTS_FILE)) fs.unlinkSync(ACHIEVEMENTS_FILE);
      assert.doesNotThrow(() => renderAllAchievements());
    });
  });

  describe('renderNewAchievements', () => {
    it('handles empty array', () => {
      assert.doesNotThrow(() => renderNewAchievements([]));
    });

    it('handles achievements', () => {
      assert.doesNotThrow(() => renderNewAchievements([ACHIEVEMENTS[0]]));
    });
  });

  describe('gatherStats', () => {
    it('returns valid stats object', () => {
      const stories = [
        { slug: 'test', file: '/nonexistent', _endings: [{ id: 'e1', type: 'good' }] },
      ];
      const stats = gatherStats('/tmp', stories);
      assert.equal(typeof stats.totalEndingsFound, 'number');
      assert.equal(typeof stats.totalEndings, 'number');
      assert.equal(stats.totalStories, 1);
      assert.equal(stats.totalEndings, 1);
    });
  });
});
