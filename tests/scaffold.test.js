import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Engine } from '../src/engine.js';
import { validateStory } from '../src/validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// Scaffold template validation
//
// We can't easily test the interactive CLI flow, but we can
// verify that the template YAML produced by `nyantales new`
// is structurally valid. We replicate the template here.
// ─────────────────────────────────────────────────────────────

function generateTemplate(title, description, author) {
  return `title: "${title}"
description: "${description}"
author: "${author}"
start: intro

scenes:
  intro:
    location: "The Beginning"
    mood: peaceful
    art: |
      .  ^  ^ .
      ( o.o  )
      (  > <  )
    text: >
      You open your eyes. The screen flickers.
      A cursor blinks in the darkness, waiting for input.
      This is where your story begins.
    choices:
      - label: "Look around"
        goto: look_around
      - label: "Type something"
        goto: type_something

  look_around:
    text: >
      The room is dim, lit only by the glow of the monitor.
      You notice a small note taped to the side of the screen.
    choices:
      - label: "Read the note"
        goto: read_note
        set_flag: found_note
      - label: "Ignore it and explore further"
        goto: explore

  type_something:
    text: >
      Your paws tap hesitantly on the keyboard.
      The terminal responds with a friendly greeting.
    choices:
      - label: "Keep typing"
        goto: explore
      - label: "Step back and look around"
        goto: look_around

  read_note:
    mood: mysterious
    text: >
      The note reads: "Every story needs an ending.
      Some good, some bad. All worth finding."
    choices:
      - label: "Take the note"
        goto: explore
        give_item: mysterious_note
      - label: "Leave it"
        goto: explore

  explore:
    text: >
      You venture deeper into the terminal.
      Something tells you this is just the beginning...
    choices:
      - label: "Press onward (good path)"
        goto: ending_good
      - label: "Turn back (neutral path)"
        goto: ending_neutral
      - label: "Secret path"
        goto: ending_secret
        condition:
          has_item: mysterious_note

  ending_good:
    is_ending: true
    ending_type: good
    mood: peaceful
    art: |
      *  .  *
      . ★★★ .
      *  .  *
    text: >
      The screen fills with warm light.
      You found your way home.
    ending_text: >
      Congratulations! You completed the story.
      But there are more paths to discover...

  ending_neutral:
    is_ending: true
    ending_type: neutral
    text: >
      You return to where you started.
      The cursor blinks, patient as ever.
      Maybe next time you'll go further.
    ending_text: >
      Not every journey reaches its destination,
      but every step teaches something new.

  ending_secret:
    is_ending: true
    ending_type: secret
    mood: mysterious
    art: |
      ╔══════════════════╗
      ║  ★ SECRET  ★     ║
      ╚══════════════════╝
    text: >
      The mysterious note glows in your paws.
      It was a key all along — a key to understanding
      that the best stories are the ones you almost miss.
    ending_text: >
      You found the secret ending!
      The note knew you'd come looking.
`;
}

describe('Story scaffold template', () => {
  let tmpDir;
  let storyFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyantales-scaffold-'));
    storyFile = path.join(tmpDir, 'story.yaml');
    const yaml = generateTemplate('Test Story', 'A test scaffold', 'tester');
    fs.writeFileSync(storyFile, yaml, 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scaffold template is valid YAML that loads as a story', async () => {
    const engine = new Engine(storyFile, { skipAnimation: true });
    await engine.loadStory();
    assert.equal(engine.story.title, 'Test Story');
    assert.equal(engine.story.start, 'intro');
  });

  it('scaffold template passes validation with no errors', async () => {
    const engine = new Engine(storyFile, { skipAnimation: true });
    await engine.loadStory();
    const result = validateStory(engine.story, { pedantic: true });
    assert.deepEqual(result.errors, [], `Errors: ${result.errors.join('; ')}`);
  });

  it('scaffold template has correct stats', async () => {
    const engine = new Engine(storyFile, { skipAnimation: true });
    await engine.loadStory();
    const result = validateStory(engine.story);
    assert.equal(result.stats.scenes, 8);
    assert.equal(result.stats.endings, 3);
    assert.ok(result.stats.choices >= 9);
  });

  it('scaffold template has all three ending types', async () => {
    const engine = new Engine(storyFile, { skipAnimation: true });
    await engine.loadStory();
    const result = validateStory(engine.story);
    const types = new Set(result.stats.endingTypes);
    assert.ok(types.has('good'), 'has good ending');
    assert.ok(types.has('neutral'), 'has neutral ending');
    assert.ok(types.has('secret'), 'has secret ending');
  });

  it('scaffold template has no unreachable scenes', async () => {
    const engine = new Engine(storyFile, { skipAnimation: true });
    await engine.loadStory();
    const result = validateStory(engine.story);
    assert.equal(result.stats.unreachable, 0);
  });
});
