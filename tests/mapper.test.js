import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { analyzeStoryGraph, renderAsciiMap, findEndingPaths, renderEndingPaths } from '../src/mapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.join(__dirname, '..', 'stories');

// ── Helper: minimal story ────────────────────────────────────

function makeStory(scenes, start = 'start') {
  return { title: 'Test Story', start, scenes };
}

// ── analyzeStoryGraph ────────────────────────────────────────

describe('analyzeStoryGraph', () => {
  it('identifies start, endings, and basic stats', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'mid' }] },
      mid: { choices: [{ label: 'End', goto: 'fin' }] },
      fin: { is_ending: true, ending_type: 'good' },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.totalScenes, 3);
    assert.equal(g.stats.totalEdges, 2);
    assert.equal(g.stats.endings.total, 1);
    assert.equal(g.stats.endings.good, 1);
    assert.equal(g.nodes.get('start').isStart, true);
    assert.equal(g.nodes.get('fin').isEnding, true);
  });

  it('detects unreachable scenes', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true },
      orphan: { choices: [{ label: 'Nowhere', goto: 'start' }] },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.unreachableScenes, 1);
    assert.ok(!g.reachable.has('orphan'));
  });

  it('counts conditional edges', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'Free', goto: 'a' },
          { label: 'Locked', goto: 'b', requires_flag: 'key' },
        ],
      },
      a: { is_ending: true },
      b: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.conditionalEdges, 1);
    assert.equal(g.stats.totalEdges, 2);
  });

  it('identifies hub scenes (3+ exits)', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'A', goto: 'a' },
          { label: 'B', goto: 'b' },
          { label: 'C', goto: 'c' },
        ],
      },
      a: { is_ending: true },
      b: { is_ending: true },
      c: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.hubScenes.length, 1);
    assert.equal(g.stats.hubScenes[0].id, 'start');
    assert.equal(g.stats.hubScenes[0].outDegree, 3);
  });

  it('identifies dead-end non-ending scenes', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'stuck' }] },
      stuck: {}, // no choices, no is_ending
    });
    const g = analyzeStoryGraph(story);
    assert.deepEqual(g.stats.deadEnds, ['stuck']);
  });

  it('counts fallback_goto as edge', () => {
    const story = makeStory({
      start: {
        choices: [{ label: 'Go', goto: 'a', requires_flag: 'nope' }],
        fallback_goto: 'b',
      },
      a: { is_ending: true },
      b: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.totalEdges, 2);
    assert.equal(g.stats.conditionalEdges, 2); // both are conditional
    assert.ok(g.nodes.get('start').hasFallback);
  });

  it('handles all ending types', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'A', goto: 'g' },
          { label: 'B', goto: 'b' },
          { label: 'C', goto: 'n' },
          { label: 'D', goto: 's' },
        ],
      },
      g: { is_ending: true, ending_type: 'good' },
      b: { is_ending: true, ending_type: 'bad' },
      n: { is_ending: true, ending_type: 'neutral' },
      s: { is_ending: true, ending_type: 'secret' },
    });
    const g = analyzeStoryGraph(story);
    assert.equal(g.stats.endings.good, 1);
    assert.equal(g.stats.endings.bad, 1);
    assert.equal(g.stats.endings.neutral, 1);
    assert.equal(g.stats.endings.secret, 1);
  });

  it('tracks mood and art metadata on nodes', () => {
    const story = makeStory({
      start: { mood: 'mysterious', art: '  /\\_/\\', choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    const n = g.nodes.get('start');
    assert.ok(n.hasMood);
    assert.equal(n.mood, 'mysterious');
    assert.ok(n.hasArt);
  });
});

// ── renderAsciiMap ───────────────────────────────────────────

describe('renderAsciiMap', () => {
  it('returns a string containing STORY MAP header', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true, ending_type: 'good' },
    });
    const g = analyzeStoryGraph(story);
    const map = renderAsciiMap(g);
    assert.ok(map.includes('STORY MAP'));
    assert.ok(map.includes('start'));
    assert.ok(map.includes('end'));
    assert.ok(map.includes('▶')); // start symbol
    assert.ok(map.includes('✦')); // good ending symbol
  });

  it('marks unreachable scenes', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true },
      orphan: { text: 'lost' },
    });
    const g = analyzeStoryGraph(story);
    const map = renderAsciiMap(g);
    assert.ok(map.includes('Unreachable'));
    assert.ok(map.includes('orphan'));
  });

  it('shows conditional arrows differently', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'Free path', goto: 'a' },
          { label: 'Locked path', goto: 'b', requires_item: 'key' },
        ],
      },
      a: { is_ending: true },
      b: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    const map = renderAsciiMap(g);
    assert.ok(map.includes('─→')); // normal arrow
    assert.ok(map.includes('╌→')); // conditional arrow
  });
});

// ── findEndingPaths ──────────────────────────────────────────

describe('findEndingPaths', () => {
  it('finds paths to all endings', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'A', goto: 'mid' },
          { label: 'B', goto: 'end_bad' },
        ],
      },
      mid: { choices: [{ label: 'Go', goto: 'end_good' }] },
      end_good: { is_ending: true, ending_type: 'good' },
      end_bad: { is_ending: true, ending_type: 'bad' },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g);
    assert.equal(paths.length, 2);
    const endings = paths.map(p => p.ending).sort();
    assert.deepEqual(endings, ['end_bad', 'end_good']);
  });

  it('finds multiple paths to same ending', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'Left', goto: 'left' },
          { label: 'Right', goto: 'right' },
        ],
      },
      left: { choices: [{ label: 'Go', goto: 'end' }] },
      right: { choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true, ending_type: 'good' },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g);
    assert.equal(paths.length, 2);
    assert.ok(paths.every(p => p.ending === 'end'));
  });

  it('respects maxPathsPerEnding limit', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'A', goto: 'a' },
          { label: 'B', goto: 'b' },
        ],
      },
      a: { choices: [{ label: 'Go', goto: 'end' }] },
      b: { choices: [{ label: 'Go', goto: 'end' }] },
      end: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g, { maxPathsPerEnding: 1 });
    assert.equal(paths.length, 1);
  });

  it('handles cycles without infinite loop', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'Loop', goto: 'mid' },
          { label: 'End', goto: 'end' },
        ],
      },
      mid: {
        choices: [
          { label: 'Back', goto: 'start' },
          { label: 'End', goto: 'end' },
        ],
      },
      end: { is_ending: true },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g);
    assert.ok(paths.length >= 2);
    // Paths should not contain cycles
    for (const p of paths) {
      const unique = new Set(p.path);
      assert.equal(unique.size, p.path.length, `Path has no duplicates: ${p.path.join(' → ')}`);
    }
  });

  it('sorts secret endings first', () => {
    const story = makeStory({
      start: {
        choices: [
          { label: 'A', goto: 'end_good' },
          { label: 'B', goto: 'end_secret' },
        ],
      },
      end_good: { is_ending: true, ending_type: 'good' },
      end_secret: { is_ending: true, ending_type: 'secret' },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g);
    assert.equal(paths[0].type, 'secret');
  });

  it('returns empty array for story with no endings', () => {
    const story = makeStory({
      start: { choices: [{ label: 'Go', goto: 'mid' }] },
      mid: { choices: [{ label: 'Back', goto: 'start' }] },
    });
    const g = analyzeStoryGraph(story);
    const paths = findEndingPaths(g);
    assert.equal(paths.length, 0);
  });
});

// ── renderEndingPaths ────────────────────────────────────────

describe('renderEndingPaths', () => {
  it('renders header and ending info', () => {
    const paths = [
      { ending: 'end_good', type: 'good', path: ['start', 'mid', 'end_good'], length: 3 },
    ];
    const text = renderEndingPaths(paths);
    assert.ok(text.includes('PATHS TO ENDINGS'));
    assert.ok(text.includes('end_good'));
    assert.ok(text.includes('good'));
    assert.ok(text.includes('✦'));
  });

  it('handles empty paths gracefully', () => {
    const text = renderEndingPaths([]);
    assert.ok(text.includes('No paths found'));
  });
});

// ── Real stories ─────────────────────────────────────────────

describe('real story analysis', () => {
  const storyDirs = fs.readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const slug of storyDirs) {
    it(`analyzes ${slug} without errors`, () => {
      const storyFile = path.join(STORIES_DIR, slug, 'story.yaml');
      const raw = fs.readFileSync(storyFile, 'utf8');
      const data = yaml.parse(raw);
      const g = analyzeStoryGraph(data);

      // Basic sanity
      assert.ok(g.stats.totalScenes > 0, 'has scenes');
      assert.ok(g.stats.endings.total > 0, 'has endings');
      assert.equal(g.stats.unreachableScenes, 0, 'no unreachable scenes');
      assert.equal(g.stats.deadEnds.length, 0, 'no dead ends');

      // Can render without throwing
      const map = renderAsciiMap(g);
      assert.ok(map.length > 0);

      // Can find paths
      const paths = findEndingPaths(g);
      assert.ok(paths.length > 0, 'has paths to endings');

      // Every ending should be reachable
      const endingIds = [...g.nodes.values()]
        .filter(n => n.isEnding)
        .map(n => n.id);
      const reachedEndings = new Set(paths.map(p => p.ending));
      for (const eid of endingIds) {
        assert.ok(reachedEndings.has(eid), `ending ${eid} is reachable via path`);
      }
    });
  }
});
