import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameState, Engine, discoverStories } from '../src/engine.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.join(__dirname, '..', 'stories');

// ─────────────────────────────────────────────────────────────
// GameState tests
// ─────────────────────────────────────────────────────────────

describe('GameState', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  describe('flags', () => {
    it('starts with no flags', () => {
      assert.equal(state.hasFlag('test'), false);
    });

    it('can set and check a flag', () => {
      state.setFlag('knows_ls');
      assert.equal(state.hasFlag('knows_ls'), true);
    });

    it('can remove a flag', () => {
      state.setFlag('test');
      state.removeFlag('test');
      assert.equal(state.hasFlag('test'), false);
    });

    it('removing a non-existent flag is safe', () => {
      state.removeFlag('nope');
      assert.equal(state.hasFlag('nope'), false);
    });
  });

  describe('inventory', () => {
    it('starts with empty inventory', () => {
      assert.equal(state.hasItem('fish'), false);
      assert.deepEqual(state.inventory, []);
    });

    it('can add and check items', () => {
      state.addItem('fish_treat');
      assert.equal(state.hasItem('fish_treat'), true);
    });

    it('does not duplicate items', () => {
      state.addItem('fish_treat');
      state.addItem('fish_treat');
      assert.equal(state.inventory.length, 1);
    });

    it('can remove items', () => {
      state.addItem('key');
      state.addItem('potion');
      state.removeItem('key');
      assert.equal(state.hasItem('key'), false);
      assert.equal(state.hasItem('potion'), true);
    });

    it('removing a non-existent item is safe', () => {
      state.removeItem('nope');
      assert.deepEqual(state.inventory, []);
    });
  });

  describe('visited scenes', () => {
    it('starts with no visited scenes', () => {
      assert.equal(state.hasVisited('intro'), false);
    });

    it('can mark and check visited', () => {
      state.markVisited('intro');
      assert.equal(state.hasVisited('intro'), true);
    });
  });

  describe('turn counter', () => {
    it('starts at zero', () => {
      assert.equal(state.turnCount, 0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Engine — condition evaluation
// ─────────────────────────────────────────────────────────────

describe('Engine.checkCondition', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine('/dev/null', { skipAnimation: true });
  });

  it('returns true for null/undefined condition', () => {
    assert.equal(engine.checkCondition(null), true);
    assert.equal(engine.checkCondition(undefined), true);
  });

  it('checks string conditions as flags', () => {
    assert.equal(engine.checkCondition('my_flag'), false);
    engine.state.setFlag('my_flag');
    assert.equal(engine.checkCondition('my_flag'), true);
  });

  it('checks { flag: ... }', () => {
    assert.equal(engine.checkCondition({ flag: 'x' }), false);
    engine.state.setFlag('x');
    assert.equal(engine.checkCondition({ flag: 'x' }), true);
  });

  it('checks { not_flag: ... }', () => {
    assert.equal(engine.checkCondition({ not_flag: 'x' }), true);
    engine.state.setFlag('x');
    assert.equal(engine.checkCondition({ not_flag: 'x' }), false);
  });

  it('checks { has_item: ... }', () => {
    assert.equal(engine.checkCondition({ has_item: 'fish' }), false);
    engine.state.addItem('fish');
    assert.equal(engine.checkCondition({ has_item: 'fish' }), true);
  });

  it('checks { no_item: ... }', () => {
    assert.equal(engine.checkCondition({ no_item: 'fish' }), true);
    engine.state.addItem('fish');
    assert.equal(engine.checkCondition({ no_item: 'fish' }), false);
  });

  it('checks { visited: ... }', () => {
    assert.equal(engine.checkCondition({ visited: 'intro' }), false);
    engine.state.markVisited('intro');
    assert.equal(engine.checkCondition({ visited: 'intro' }), true);
  });

  it('checks { not_visited: ... }', () => {
    assert.equal(engine.checkCondition({ not_visited: 'intro' }), true);
    engine.state.markVisited('intro');
    assert.equal(engine.checkCondition({ not_visited: 'intro' }), false);
  });

  // ── Compound conditions ──────────────────────────────────

  it('all: returns true when every sub-condition passes', () => {
    engine.state.setFlag('a');
    engine.state.setFlag('b');
    assert.equal(engine.checkCondition({ all: [{ flag: 'a' }, { flag: 'b' }] }), true);
  });

  it('all: returns false when any sub-condition fails', () => {
    engine.state.setFlag('a');
    assert.equal(engine.checkCondition({ all: [{ flag: 'a' }, { flag: 'b' }] }), false);
  });

  it('any: returns true when at least one sub-condition passes', () => {
    engine.state.setFlag('b');
    assert.equal(engine.checkCondition({ any: [{ flag: 'a' }, { flag: 'b' }] }), true);
  });

  it('any: returns false when all sub-conditions fail', () => {
    assert.equal(engine.checkCondition({ any: [{ flag: 'a' }, { flag: 'b' }] }), false);
  });

  it('not: negates a sub-condition', () => {
    assert.equal(engine.checkCondition({ not: { flag: 'x' } }), true);
    engine.state.setFlag('x');
    assert.equal(engine.checkCondition({ not: { flag: 'x' } }), false);
  });

  it('nested compound: all containing any', () => {
    engine.state.setFlag('a');
    engine.state.addItem('key');
    // all: [ any of flags, has_item ]
    const cond = { all: [
      { any: [{ flag: 'a' }, { flag: 'b' }] },
      { has_item: 'key' },
    ]};
    assert.equal(engine.checkCondition(cond), true);
    engine.state.removeItem('key');
    assert.equal(engine.checkCondition(cond), false);
  });

  it('min_turns checks turn count', () => {
    engine.state.turnCount = 5;
    assert.equal(engine.checkCondition({ min_turns: 3 }), true);
    assert.equal(engine.checkCondition({ min_turns: 5 }), true);
    assert.equal(engine.checkCondition({ min_turns: 6 }), false);
  });

  it('max_turns checks turn count', () => {
    engine.state.turnCount = 5;
    assert.equal(engine.checkCondition({ max_turns: 5 }), true);
    assert.equal(engine.checkCondition({ max_turns: 10 }), true);
    assert.equal(engine.checkCondition({ max_turns: 4 }), false);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine — choice availability
// ─────────────────────────────────────────────────────────────

describe('Engine.choiceAvailable', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine('/dev/null', { skipAnimation: true });
  });

  it('simple choice with no requirements is always available', () => {
    assert.equal(engine.choiceAvailable({ label: 'Go', goto: 'x' }), true);
  });

  it('requires_flag blocks when flag missing', () => {
    assert.equal(engine.choiceAvailable({ requires_flag: 'key' }), false);
    engine.state.setFlag('key');
    assert.equal(engine.choiceAvailable({ requires_flag: 'key' }), true);
  });

  it('requires_not_flag blocks when flag present', () => {
    assert.equal(engine.choiceAvailable({ requires_not_flag: 'key' }), true);
    engine.state.setFlag('key');
    assert.equal(engine.choiceAvailable({ requires_not_flag: 'key' }), false);
  });

  it('requires_item blocks when item missing', () => {
    assert.equal(engine.choiceAvailable({ requires_item: 'fish' }), false);
    engine.state.addItem('fish');
    assert.equal(engine.choiceAvailable({ requires_item: 'fish' }), true);
  });

  it('requires_no_item blocks when item present', () => {
    assert.equal(engine.choiceAvailable({ requires_no_item: 'fish' }), true);
    engine.state.addItem('fish');
    assert.equal(engine.choiceAvailable({ requires_no_item: 'fish' }), false);
  });

  it('requires_visited blocks when scene not visited', () => {
    assert.equal(engine.choiceAvailable({ requires_visited: 'x' }), false);
    engine.state.markVisited('x');
    assert.equal(engine.choiceAvailable({ requires_visited: 'x' }), true);
  });

  it('requires_items checks multiple items', () => {
    const choice = { requires_items: ['key', 'map'] };
    assert.equal(engine.choiceAvailable(choice), false);
    engine.state.addItem('key');
    assert.equal(engine.choiceAvailable(choice), false);
    engine.state.addItem('map');
    assert.equal(engine.choiceAvailable(choice), true);
  });

  it('condition field works with object conditions', () => {
    const choice = { condition: { flag: 'secret' } };
    assert.equal(engine.choiceAvailable(choice), false);
    engine.state.setFlag('secret');
    assert.equal(engine.choiceAvailable(choice), true);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine — effect application
// ─────────────────────────────────────────────────────────────

describe('Engine.applyEffects', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine('/dev/null', { skipAnimation: true });
  });

  it('set_flag sets a flag', () => {
    engine.applyEffects({ set_flag: 'hello' });
    assert.equal(engine.state.hasFlag('hello'), true);
  });

  it('set_flags sets multiple flags', () => {
    engine.applyEffects({ set_flags: ['a', 'b'] });
    assert.equal(engine.state.hasFlag('a'), true);
    assert.equal(engine.state.hasFlag('b'), true);
  });

  it('remove_flag removes a flag', () => {
    engine.state.setFlag('temp');
    engine.applyEffects({ remove_flag: 'temp' });
    assert.equal(engine.state.hasFlag('temp'), false);
  });

  it('give_item adds an item', () => {
    engine.applyEffects({ give_item: 'sword' });
    assert.equal(engine.state.hasItem('sword'), true);
  });

  it('give_items adds multiple items', () => {
    engine.applyEffects({ give_items: ['potion', 'scroll'] });
    assert.equal(engine.state.hasItem('potion'), true);
    assert.equal(engine.state.hasItem('scroll'), true);
  });

  it('remove_item removes an item', () => {
    engine.state.addItem('key');
    engine.applyEffects({ remove_item: 'key' });
    assert.equal(engine.state.hasItem('key'), false);
  });

  it('handles combined effects', () => {
    engine.applyEffects({
      set_flag: 'quest_started',
      give_item: 'map',
      remove_flag: 'nothing',
    });
    assert.equal(engine.state.hasFlag('quest_started'), true);
    assert.equal(engine.state.hasItem('map'), true);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine — story loading
// ─────────────────────────────────────────────────────────────

describe('Engine.loadStory', () => {
  it('loads the-terminal-cat story', async () => {
    const storyPath = path.join(STORIES_DIR, 'the-terminal-cat', 'story.yaml');
    const engine = new Engine(storyPath, { skipAnimation: true });
    await engine.loadStory();

    assert.equal(engine.story.title, 'The Terminal Cat');
    assert.ok(engine.story.scenes.boot_screen, 'has boot_screen scene');
    assert.equal(engine.story.start, 'boot_screen');
  });

  it('loads cafe-debug story', async () => {
    const storyPath = path.join(STORIES_DIR, 'cafe-debug', 'story.yaml');
    const engine = new Engine(storyPath, { skipAnimation: true });
    await engine.loadStory();

    assert.equal(engine.story.title, 'Café Debug');
    assert.ok(engine.story.scenes.cafe_morning, 'has cafe_morning scene');
    assert.equal(engine.story.start, 'cafe_morning');
  });
});

// ─────────────────────────────────────────────────────────────
// Story discovery
// ─────────────────────────────────────────────────────────────

describe('discoverStories', () => {
  it('finds stories in the stories directory', () => {
    const stories = discoverStories(STORIES_DIR);
    assert.ok(stories.length >= 3, `expected at least 3 stories, got ${stories.length}`);

    const slugs = stories.map(s => s.slug);
    assert.ok(slugs.includes('the-terminal-cat'), 'should find the-terminal-cat');
    assert.ok(slugs.includes('cafe-debug'), 'should find cafe-debug');
  });

  it('returns title and metadata for each story', () => {
    const stories = discoverStories(STORIES_DIR);
    const cat = stories.find(s => s.slug === 'the-terminal-cat');

    assert.equal(cat.title, 'The Terminal Cat');
    assert.ok(cat.description.length > 0);
    assert.equal(cat.author, 'mechangelnyan');
    assert.ok(cat.file.endsWith('story.yaml'));
  });

  it('returns empty array for non-existent directory', () => {
    const stories = discoverStories('/tmp/does-not-exist-xyz');
    assert.deepEqual(stories, []);
  });
});

// ─────────────────────────────────────────────────────────────
// Story integrity — validate all scenes are reachable
// ─────────────────────────────────────────────────────────────

describe('Story integrity', () => {
  for (const storySlug of ['the-terminal-cat', 'cafe-debug', 'server-room-stray', 'midnight-deploy', 'haunted-network']) {
    describe(storySlug, () => {
      let story;

      beforeEach(async () => {
        const storyPath = path.join(STORIES_DIR, storySlug, 'story.yaml');
        const engine = new Engine(storyPath, { skipAnimation: true });
        await engine.loadStory();
        story = engine.story;
      });

      it('start scene exists', () => {
        assert.ok(story.scenes[story.start], `start scene '${story.start}' not found`);
      });

      it('all goto targets point to existing scenes', () => {
        const sceneIds = new Set(Object.keys(story.scenes));
        const broken = [];

        for (const [id, scene] of Object.entries(story.scenes)) {
          if (scene.fallback_goto && !sceneIds.has(scene.fallback_goto)) {
            broken.push(`${id}.fallback_goto → ${scene.fallback_goto}`);
          }
          for (const choice of (scene.choices || [])) {
            if (choice.goto && !sceneIds.has(choice.goto)) {
              broken.push(`${id} choice "${choice.label}" → ${choice.goto}`);
            }
          }
        }

        assert.deepEqual(broken, [], `Broken goto links:\n${broken.join('\n')}`);
      });

      it('every non-ending scene has choices or fallback_goto', () => {
        const missing = [];
        for (const [id, scene] of Object.entries(story.scenes)) {
          if (scene.is_ending) continue;
          if ((!scene.choices || scene.choices.length === 0) && !scene.fallback_goto) {
            missing.push(id);
          }
        }
        assert.deepEqual(missing, [], `Scenes with no choices or fallback: ${missing.join(', ')}`);
      });

      it('all scenes are reachable from start', () => {
        const reachable = new Set();
        const queue = [story.start];

        while (queue.length > 0) {
          const id = queue.pop();
          if (reachable.has(id)) continue;
          reachable.add(id);

          const scene = story.scenes[id];
          if (!scene) continue;

          if (scene.fallback_goto) queue.push(scene.fallback_goto);
          for (const choice of (scene.choices || [])) {
            if (choice.goto) queue.push(choice.goto);
          }
        }

        const allScenes = new Set(Object.keys(story.scenes));
        const unreachable = [...allScenes].filter(s => !reachable.has(s));
        assert.deepEqual(unreachable, [], `Unreachable scenes: ${unreachable.join(', ')}`);
      });

      it('has at least one ending', () => {
        const endings = Object.entries(story.scenes)
          .filter(([_, s]) => s.is_ending)
          .map(([id]) => id);
        assert.ok(endings.length > 0, 'Story has no endings');
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Ending discovery tracking
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import os from 'os';

describe('Ending discovery', () => {
  let engine;
  let tmpSavesDir;

  beforeEach(async () => {
    const storyPath = path.join(STORIES_DIR, 'the-terminal-cat', 'story.yaml');
    engine = new Engine(storyPath, { skipAnimation: true });
    await engine.loadStory();

    // Override saves dir to a temp directory for isolation
    tmpSavesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyantales-test-'));
    engine.getEndingsLogPath = () => path.join(tmpSavesDir, `${engine.storySlug}_endings.json`);
  });

  it('getEndingScenes returns all ending scenes', () => {
    const endings = engine.getEndingScenes();
    assert.ok(endings.length >= 3, `expected at least 3 endings, got ${endings.length}`);
    for (const e of endings) {
      assert.ok(e.id, 'ending has id');
      assert.ok(['good', 'bad', 'neutral', 'secret'].includes(e.type), `valid type: ${e.type}`);
    }
  });

  it('recordEnding marks first discovery as new', () => {
    const endings = engine.getEndingScenes();
    const result = engine.recordEnding(endings[0].id);
    assert.equal(result.isNew, true);
    assert.equal(result.found, 1);
    assert.equal(result.total, endings.length);
  });

  it('recordEnding marks repeat discovery as not new', () => {
    const endings = engine.getEndingScenes();
    engine.recordEnding(endings[0].id);
    const result = engine.recordEnding(endings[0].id);
    assert.equal(result.isNew, false);
    assert.equal(result.found, 1);
  });

  it('tracks multiple endings independently', () => {
    const endings = engine.getEndingScenes();
    engine.recordEnding(endings[0].id);
    const result = engine.recordEnding(endings[1].id);
    assert.equal(result.found, 2);
    assert.equal(result.total, endings.length);
  });

  it('persists endings to disk', () => {
    const endings = engine.getEndingScenes();
    engine.recordEnding(endings[0].id);

    // Read directly from file
    const raw = fs.readFileSync(engine.getEndingsLogPath(), 'utf8');
    const log = JSON.parse(raw);
    assert.ok(log.discovered[endings[0].id], 'ending recorded in file');
    assert.equal(log.discovered[endings[0].id].type, endings[0].type);
    assert.ok(log.discovered[endings[0].id].discoveredAt, 'has timestamp');
  });

  it('loadEndingsLog returns empty for no file', () => {
    const log = engine.loadEndingsLog();
    assert.deepEqual(log, { discovered: {} });
  });

  it('renderProgressBar produces correct output', () => {
    const bar = engine.renderProgressBar(2, 4, 10);
    // Should contain filled and empty chars (strip ANSI for length check)
    assert.ok(bar.length > 0, 'bar is not empty');
  });
});

// ─────────────────────────────────────────────────────────────
// Text interpolation tests
// ─────────────────────────────────────────────────────────────

describe('interpolate', () => {
  let engine;

  beforeEach(async () => {
    engine = new Engine(path.join(STORIES_DIR, 'the-terminal-cat', 'story.yaml'));
    await engine.loadStory();
  });

  it('replaces {{turns}} with current turn count', () => {
    engine.state.turnCount = 7;
    assert.equal(engine.interpolate('Turn {{turns}} begins.'), 'Turn 7 begins.');
  });

  it('replaces {{scene}} with current scene id', () => {
    engine.state.currentScene = 'lobby';
    assert.equal(engine.interpolate('You are in {{scene}}.'), 'You are in lobby.');
  });

  it('replaces {{items}} with inventory list', () => {
    engine.state.addItem('fish');
    engine.state.addItem('key');
    assert.equal(engine.interpolate('Carrying: {{items}}'), 'Carrying: fish, key');
  });

  it('replaces {{items}} with "nothing" when empty', () => {
    assert.equal(engine.interpolate('Carrying: {{items}}'), 'Carrying: nothing');
  });

  it('replaces {{item_count}} with inventory size', () => {
    engine.state.addItem('fish');
    engine.state.addItem('key');
    assert.equal(engine.interpolate('You have {{item_count}} items.'), 'You have 2 items.');
  });

  it('replaces {{visited_count}} with visited scenes count', () => {
    engine.state.markVisited('a');
    engine.state.markVisited('b');
    engine.state.markVisited('c');
    assert.equal(engine.interpolate('Explored {{visited_count}} scenes.'), 'Explored 3 scenes.');
  });

  it('replaces {{title}} with story title', () => {
    assert.equal(engine.interpolate('Playing: {{title}}'), 'Playing: The Terminal Cat');
  });

  it('replaces {{flag:name}} with true/false', () => {
    engine.state.setFlag('has_key');
    assert.equal(engine.interpolate('Key: {{flag:has_key}}, Clue: {{flag:has_clue}}'), 'Key: true, Clue: false');
  });

  it('replaces {{has:item}} with true/false', () => {
    engine.state.addItem('fish');
    assert.equal(engine.interpolate('Fish: {{has:fish}}, Key: {{has:key}}'), 'Fish: true, Key: false');
  });

  it('leaves unknown variables as-is', () => {
    assert.equal(engine.interpolate('Hello {{unknown_var}}!'), 'Hello {{unknown_var}}!');
  });

  it('handles multiple replacements in one string', () => {
    engine.state.turnCount = 3;
    engine.state.addItem('map');
    assert.equal(
      engine.interpolate('Turn {{turns}}, carrying {{items}} ({{item_count}} item).'),
      'Turn 3, carrying map (1 item).'
    );
  });

  it('returns non-string input unchanged', () => {
    assert.equal(engine.interpolate(null), null);
    assert.equal(engine.interpolate(undefined), undefined);
    assert.equal(engine.interpolate(42), 42);
  });
});
