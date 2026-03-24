import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState, Engine } from '../src/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.join(__dirname, '..', 'stories');
const SAVES_DIR = path.join(__dirname, '..', 'saves');

// ─────────────────────────────────────────────────────────────
// GameState serialization
// ─────────────────────────────────────────────────────────────

describe('GameState serialization', () => {
  it('round-trips state through serialize/deserialize', () => {
    const state = new GameState();
    state.setFlag('talked_to_cat');
    state.setFlag('found_secret');
    state.addItem('fish_treat');
    state.addItem('ssh_key');
    state.markVisited('intro');
    state.markVisited('hallway');
    state.currentScene = 'hallway';
    state.turnCount = 7;

    const serialized = state.serialize();
    const restored = GameState.deserialize(serialized);

    assert.equal(restored.hasFlag('talked_to_cat'), true);
    assert.equal(restored.hasFlag('found_secret'), true);
    assert.equal(restored.hasFlag('nonexistent'), false);
    assert.equal(restored.hasItem('fish_treat'), true);
    assert.equal(restored.hasItem('ssh_key'), true);
    assert.equal(restored.hasItem('nope'), false);
    assert.equal(restored.hasVisited('intro'), true);
    assert.equal(restored.hasVisited('hallway'), true);
    assert.equal(restored.hasVisited('nope'), false);
    assert.equal(restored.currentScene, 'hallway');
    assert.equal(restored.turnCount, 7);
  });

  it('deserializes empty/missing fields gracefully', () => {
    const restored = GameState.deserialize({});
    assert.equal(restored.turnCount, 0);
    assert.equal(restored.currentScene, null);
    assert.deepEqual(restored.inventory, []);
  });

  it('serialize produces plain JSON-safe object', () => {
    const state = new GameState();
    state.setFlag('x');
    state.addItem('y');
    const data = state.serialize();

    // Should be JSON-serializable
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    assert.deepEqual(parsed.flags, ['x']);
    assert.deepEqual(parsed.inventory, ['y']);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine save/load
// ─────────────────────────────────────────────────────────────

describe('Engine save/load', () => {
  let engine;
  const testSlot = 'test_slot_' + Date.now();

  beforeEach(async () => {
    const storyPath = path.join(STORIES_DIR, 'the-terminal-cat', 'story.yaml');
    engine = new Engine(storyPath, { skipAnimation: true });
    await engine.loadStory();
  });

  afterEach(() => {
    // Clean up test saves
    const savePath = engine.getSavePath(testSlot);
    if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
  });

  it('storySlug extracts directory name', () => {
    assert.equal(engine.storySlug, 'the-terminal-cat');
  });

  it('saveGame creates a save file', () => {
    engine.state.setFlag('test_flag');
    engine.state.addItem('test_item');
    engine.state.currentScene = 'boot_screen';
    engine.state.turnCount = 3;

    const savePath = engine.saveGame(testSlot);
    assert.ok(fs.existsSync(savePath), 'save file should exist');

    const data = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    assert.equal(data.version, 1);
    assert.equal(data.storySlug, 'the-terminal-cat');
    assert.equal(data.storyTitle, 'The Terminal Cat');
    assert.ok(data.savedAt);
    assert.deepEqual(data.state.flags, ['test_flag']);
    assert.deepEqual(data.state.inventory, ['test_item']);
    assert.equal(data.state.currentScene, 'boot_screen');
    assert.equal(data.state.turnCount, 3);
  });

  it('loadGame restores state from save file', () => {
    engine.state.setFlag('saved_flag');
    engine.state.addItem('saved_item');
    engine.state.currentScene = 'some_scene';
    engine.state.turnCount = 5;
    engine.saveGame(testSlot);

    // Create fresh engine and load
    const engine2 = new Engine(path.join(STORIES_DIR, 'the-terminal-cat', 'story.yaml'), { skipAnimation: true });
    const loaded = engine2.loadGame(testSlot);

    assert.equal(loaded, true);
    assert.equal(engine2.state.hasFlag('saved_flag'), true);
    assert.equal(engine2.state.hasItem('saved_item'), true);
    assert.equal(engine2.state.currentScene, 'some_scene');
    assert.equal(engine2.state.turnCount, 5);
  });

  it('loadGame returns false for non-existent save', () => {
    const loaded = engine.loadGame('nonexistent_slot_xyz');
    assert.equal(loaded, false);
  });

  it('listSaves returns save metadata', () => {
    engine.state.currentScene = 'boot_screen';
    engine.state.turnCount = 2;
    engine.saveGame(testSlot);

    const saves = Engine.listSaves();
    const found = saves.find(s => s.file.includes(testSlot));
    assert.ok(found, 'should find the test save');
    assert.equal(found.storySlug, 'the-terminal-cat');
    assert.equal(found.storyTitle, 'The Terminal Cat');
    assert.equal(found.scene, 'boot_screen');
    assert.equal(found.turns, 2);
  });
});
