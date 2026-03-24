import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from '../src/validator.js';

// ─────────────────────────────────────────────────────────────
// Validator unit tests
// ─────────────────────────────────────────────────────────────

describe('validateStory', () => {
  it('returns errors for null story', () => {
    const { errors } = validateStory(null);
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('null'));
  });

  it('returns errors for missing required fields', () => {
    const { errors } = validateStory({ scenes: {} });
    assert.ok(errors.some(e => e.includes('title')));
    assert.ok(errors.some(e => e.includes('start')));
  });

  it('returns error for missing scenes map', () => {
    const { errors } = validateStory({ title: 'Test', start: 'a' });
    assert.ok(errors.some(e => e.includes('scenes')));
  });

  it('passes a valid minimal story', () => {
    const story = {
      title: 'Tiny',
      start: 'begin',
      scenes: {
        begin: {
          text: 'Hello',
          choices: [{ label: 'End it', goto: 'fin' }],
        },
        fin: {
          text: 'Done',
          is_ending: true,
          ending_type: 'good',
        },
      },
    };
    const { errors } = validateStory(story);
    assert.deepEqual(errors, []);
  });

  it('detects broken goto targets', () => {
    const story = {
      title: 'Broken',
      start: 'a',
      scenes: {
        a: {
          text: 'Start',
          choices: [{ label: 'Go nowhere', goto: 'missing' }],
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('missing')));
  });

  it('detects dead-end scenes', () => {
    const story = {
      title: 'Dead',
      start: 'a',
      scenes: {
        a: {
          text: 'Start',
          choices: [{ label: 'Go', goto: 'b' }],
        },
        b: {
          text: 'Stuck here',
          // no choices, no fallback, not an ending
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('Dead-end')));
  });

  it('detects unreachable scenes', () => {
    const story = {
      title: 'Island',
      start: 'a',
      scenes: {
        a: {
          text: 'Start',
          is_ending: true,
          ending_type: 'good',
        },
        orphan: {
          text: 'Nobody comes here',
          is_ending: true,
          ending_type: 'bad',
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('Unreachable') && e.includes('orphan')));
  });

  it('detects missing endings', () => {
    const story = {
      title: 'Endless',
      start: 'a',
      scenes: {
        a: {
          text: 'Loop',
          choices: [{ label: 'Again', goto: 'a' }],
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('no endings')));
  });

  it('warns on unknown mood', () => {
    const story = {
      title: 'Moody',
      start: 'a',
      scenes: {
        a: {
          text: 'Hmm',
          mood: 'existential_dread',
          is_ending: true,
          ending_type: 'neutral',
        },
      },
    };
    const { warnings } = validateStory(story);
    assert.ok(warnings.some(w => w.includes('existential_dread')));
  });

  it('warns on unknown ending_type', () => {
    const story = {
      title: 'Typed',
      start: 'a',
      scenes: {
        a: {
          text: 'End',
          is_ending: true,
          ending_type: 'cosmic',
        },
      },
    };
    const { warnings } = validateStory(story);
    assert.ok(warnings.some(w => w.includes('cosmic')));
  });

  it('detects empty choice labels', () => {
    const story = {
      title: 'Empty',
      start: 'a',
      scenes: {
        a: {
          text: 'Pick',
          choices: [{ label: '', goto: 'b' }],
        },
        b: { text: 'End', is_ending: true },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('empty') && e.includes('label')));
  });

  it('detects choices missing goto', () => {
    const story = {
      title: 'NoGoto',
      start: 'a',
      scenes: {
        a: {
          text: 'Pick',
          choices: [{ label: 'Nowhere' }],
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('missing goto')));
  });

  it('provides accurate stats', () => {
    const story = {
      title: 'Stats',
      start: 'a',
      scenes: {
        a: {
          text: 'Start',
          choices: [
            { label: 'Good', goto: 'good' },
            { label: 'Bad', goto: 'bad' },
          ],
        },
        good: { text: 'Win', is_ending: true, ending_type: 'good' },
        bad: { text: 'Lose', is_ending: true, ending_type: 'bad' },
      },
    };
    const { stats } = validateStory(story);
    assert.equal(stats.scenes, 3);
    assert.equal(stats.endings, 2);
    assert.equal(stats.choices, 2);
    assert.deepEqual(stats.endingTypes.sort(), ['bad', 'good']);
  });

  it('pedantic mode warns on self-loops', () => {
    const story = {
      title: 'Loop',
      start: 'a',
      scenes: {
        a: {
          text: 'Again',
          choices: [
            { label: 'Stay', goto: 'a' },
            { label: 'Leave', goto: 'b' },
          ],
        },
        b: { text: 'Done', is_ending: true },
      },
    };
    const normal = validateStory(story, { pedantic: false });
    assert.equal(normal.warnings.filter(w => w.includes('loops back')).length, 0);

    const pedant = validateStory(story, { pedantic: true });
    assert.ok(pedant.warnings.some(w => w.includes('loops back')));
  });

  it('validates fallback_goto targets', () => {
    const story = {
      title: 'Fallback',
      start: 'a',
      scenes: {
        a: {
          text: 'Auto',
          fallback_goto: 'ghost',
        },
      },
    };
    const { errors } = validateStory(story);
    assert.ok(errors.some(e => e.includes('ghost')));
  });
});
