// ─────────────────────────────────────────────────────────────
// Story Validator
//
// Validates story YAML files for structural integrity:
//   - Start scene exists
//   - All goto targets resolve
//   - No dead-end scenes (non-ending without choices/fallback)
//   - All scenes reachable from start
//   - At least one ending
//   - Choice labels are non-empty
//   - Mood values are valid
//   - No duplicate scene IDs in choices (goto loops to self)
//
// Used by: `nyantales validate` CLI command + test suite
// ─────────────────────────────────────────────────────────────

const VALID_MOODS = new Set([
  'tense', 'peaceful', 'mysterious', 'funny', 'glitch',
]);

const VALID_ENDING_TYPES = new Set([
  'good', 'bad', 'neutral', 'secret',
]);

/**
 * Validate a parsed story object.
 * @param {object} story - Parsed YAML story
 * @param {object} [opts] - Options
 * @param {boolean} [opts.pedantic=false] - Enable extra warnings
 * @returns {{ errors: string[], warnings: string[], stats: object }}
 */
export function validateStory(story, opts = {}) {
  const { pedantic = false } = opts;
  const errors = [];
  const warnings = [];

  if (!story) {
    errors.push('Story is null or undefined');
    return { errors, warnings, stats: {} };
  }

  // ── Required top-level fields ──────────────────────────
  if (!story.title)  errors.push('Missing required field: title');
  if (!story.start)  errors.push('Missing required field: start');
  if (!story.scenes || typeof story.scenes !== 'object') {
    errors.push('Missing or invalid "scenes" map');
    return { errors, warnings, stats: {} };
  }

  const sceneIds = new Set(Object.keys(story.scenes));
  const sceneCount = sceneIds.size;

  // ── Start scene exists ─────────────────────────────────
  if (story.start && !sceneIds.has(story.start)) {
    errors.push(`Start scene '${story.start}' does not exist`);
  }

  // ── Per-scene checks ───────────────────────────────────
  const brokenGotos = [];
  const deadEnds = [];
  const endings = [];
  let choiceCount = 0;

  for (const [id, scene] of Object.entries(story.scenes)) {
    if (!scene || typeof scene !== 'object') {
      errors.push(`Scene '${id}' is not a valid object`);
      continue;
    }

    // Mood validation
    if (scene.mood && !VALID_MOODS.has(scene.mood)) {
      warnings.push(`Scene '${id}': unknown mood '${scene.mood}' (valid: ${[...VALID_MOODS].join(', ')})`);
    }

    // Ending type validation
    if (scene.is_ending) {
      endings.push(id);
      if (scene.ending_type && !VALID_ENDING_TYPES.has(scene.ending_type)) {
        warnings.push(`Scene '${id}': unknown ending_type '${scene.ending_type}' (valid: ${[...VALID_ENDING_TYPES].join(', ')})`);
      }
    }

    // Fallback goto
    if (scene.fallback_goto && !sceneIds.has(scene.fallback_goto)) {
      brokenGotos.push(`${id}.fallback_goto → '${scene.fallback_goto}'`);
    }

    // Choices
    const choices = scene.choices || [];
    choiceCount += choices.length;

    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const ref = `${id} choice[${i}]`;

      if (!c.label || !c.label.trim()) {
        errors.push(`${ref}: empty or missing label`);
      }

      if (!c.goto) {
        errors.push(`${ref} ("${c.label || '?'}"): missing goto target`);
      } else if (!sceneIds.has(c.goto)) {
        brokenGotos.push(`${ref} ("${c.label}") → '${c.goto}'`);
      }

      // Self-loop warning (pedantic)
      if (pedantic && c.goto === id) {
        warnings.push(`${ref} ("${c.label}"): loops back to same scene`);
      }
    }

    // Dead-end check: non-ending scene with no choices and no fallback
    if (!scene.is_ending && choices.length === 0 && !scene.fallback_goto) {
      deadEnds.push(id);
    }

    // Missing text warning
    if (!scene.text && !scene.art) {
      warnings.push(`Scene '${id}': has neither text nor art`);
    }
  }

  if (brokenGotos.length > 0) {
    errors.push(`Broken goto targets:\n  ${brokenGotos.join('\n  ')}`);
  }

  if (deadEnds.length > 0) {
    errors.push(`Dead-end scenes (no choices, no fallback, not an ending): ${deadEnds.join(', ')}`);
  }

  if (endings.length === 0) {
    errors.push('Story has no endings (no scene with is_ending: true)');
  }

  // ── Reachability ───────────────────────────────────────
  const reachable = new Set();
  if (story.start && sceneIds.has(story.start)) {
    const queue = [story.start];
    while (queue.length > 0) {
      const sid = queue.pop();
      if (reachable.has(sid)) continue;
      reachable.add(sid);

      const s = story.scenes[sid];
      if (!s) continue;
      if (s.fallback_goto) queue.push(s.fallback_goto);
      for (const c of (s.choices || [])) {
        if (c.goto) queue.push(c.goto);
      }
    }
  }

  const unreachable = [...sceneIds].filter(s => !reachable.has(s));
  if (unreachable.length > 0) {
    errors.push(`Unreachable scenes: ${unreachable.join(', ')}`);
  }

  // ── Stats ──────────────────────────────────────────────
  const stats = {
    scenes: sceneCount,
    reachable: reachable.size,
    unreachable: unreachable.length,
    endings: endings.length,
    choices: choiceCount,
    endingTypes: endings.map(id => story.scenes[id].ending_type || 'neutral'),
  };

  return { errors, warnings, stats };
}
