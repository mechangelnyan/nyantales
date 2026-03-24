import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { discoverStories } from '../src/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.join(__dirname, '..', 'stories');

describe('discoverStories for random/info', () => {
  it('finds all story directories', () => {
    const stories = discoverStories(STORIES_DIR);
    assert.ok(stories.length >= 26, `Expected at least 26 stories, got ${stories.length}`);
  });

  it('every story has required metadata', () => {
    const stories = discoverStories(STORIES_DIR);
    for (const s of stories) {
      assert.ok(s.slug, 'Story must have slug');
      assert.ok(s.title, `Story ${s.slug} must have title`);
      assert.ok(s.file, `Story ${s.slug} must have file path`);
    }
  });

  it('random pick always returns a valid story', () => {
    const stories = discoverStories(STORIES_DIR);
    for (let i = 0; i < 20; i++) {
      const pick = stories[Math.floor(Math.random() * stories.length)];
      assert.ok(pick.slug);
      assert.ok(fs.existsSync(pick.file));
    }
  });
});

describe('story info data extraction', () => {
  it('can extract scenes, choices, endings from every story', () => {
    const stories = discoverStories(STORIES_DIR);
    for (const s of stories) {
      const raw = fs.readFileSync(s.file, 'utf8');
      const data = yaml.parse(raw);
      const scenes = data.scenes || {};
      const sceneIds = Object.keys(scenes);

      assert.ok(sceneIds.length > 0, `${s.slug} should have scenes`);

      let totalChoices = 0;
      let totalEndings = 0;
      const moodsUsed = new Set();
      const itemsFound = new Set();

      for (const [id, scene] of Object.entries(scenes)) {
        if (scene.choices) totalChoices += scene.choices.length;
        if (scene.ending || scene.is_ending) totalEndings++;
        if (scene.mood) moodsUsed.add(scene.mood);

        if (scene.choices) {
          for (const c of scene.choices) {
            if (c.give_item) itemsFound.add(c.give_item);
            if (c.give_items) c.give_items.forEach(i => itemsFound.add(i));
          }
        }
        if (scene.give_item) itemsFound.add(scene.give_item);
        if (scene.give_items) scene.give_items.forEach(i => itemsFound.add(i));
      }

      assert.ok(totalChoices > 0, `${s.slug} should have choices`);
      assert.ok(totalEndings > 0, `${s.slug} should have at least one ending`);
    }
  });

  it('word count is reasonable for every story', () => {
    const stories = discoverStories(STORIES_DIR);
    for (const s of stories) {
      const raw = fs.readFileSync(s.file, 'utf8');
      const data = yaml.parse(raw);
      const scenes = data.scenes || {};

      let wordCount = 0;
      for (const scene of Object.values(scenes)) {
        if (scene.text) wordCount += scene.text.split(/\s+/).length;
      }

      assert.ok(wordCount > 50, `${s.slug} should have at least 50 words of text, got ${wordCount}`);
    }
  });
});
