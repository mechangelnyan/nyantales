import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'src', 'cli.js');

describe('nyantales stats', () => {
  it('runs without error', () => {
    const output = execFileSync('node', [CLI, 'stats'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ok(output.includes('Player Statistics'), 'should display the stats header');
  });

  it('shows cat rank', () => {
    const output = execFileSync('node', [CLI, 'stats'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    // Should contain one of the rank titles
    const ranks = ['Legendary Cat', 'Shadow Cat', 'Senior Cat', 'Adventuring Cat', 'Wandering Cat', 'Kitten', 'Unhatched'];
    const hasRank = ranks.some(r => output.includes(r));
    assert.ok(hasRank, 'should display a cat rank');
  });

  it('shows journey section', () => {
    const output = execFileSync('node', [CLI, 'stats'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ok(output.includes('Journey'), 'should have Journey section');
    assert.ok(output.includes('Playthroughs'), 'should show playthroughs');
  });

  it('shows endings breakdown', () => {
    const output = execFileSync('node', [CLI, 'stats'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ok(output.includes('Endings'), 'should have Endings section');
    assert.ok(output.includes('Good'), 'should show good endings');
    assert.ok(output.includes('Bad'), 'should show bad endings');
    assert.ok(output.includes('Secret'), 'should show secret endings');
  });

  it('shows achievements count', () => {
    const output = execFileSync('node', [CLI, 'stats'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ok(output.includes('Achievements'), 'should have Achievements section');
    assert.ok(output.includes('Unlocked'), 'should show unlocked count');
  });

  it('also works via "statistics" alias', () => {
    const output = execFileSync('node', [CLI, 'statistics'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ok(output.includes('Player Statistics'), 'alias should also work');
  });
});
