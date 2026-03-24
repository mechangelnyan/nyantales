#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'yaml';
import { Engine, discoverStories, GameState } from './engine.js';
import { validateStory } from './validator.js';
import { analyzeStoryGraph, renderAsciiMap, findEndingPaths, renderEndingPaths } from './mapper.js';
import { renderAllAchievements, ACHIEVEMENTS, loadAchievements, gatherStats } from './achievements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.join(__dirname, '..', 'stories');

// ─────────────────────────────────────────────────────────────
// Banner
// ─────────────────────────────────────────────────────────────

const BANNER = `
${chalk.cyan('  /\\_/\\')}   ${chalk.bold.magenta('N Y A N T A L E S')}
${chalk.cyan(' ( =^.^= )')}  ${chalk.dim('Terminal Interactive Fiction')}
${chalk.cyan("  )   (  ")}
${chalk.cyan(' (__  __)  ')}${chalk.dim('v1.0.0 · by mechangelnyan')}
`;

// ─────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────

function showHelp() {
  console.log(BANNER);
  console.log(chalk.bold('  Usage:\n'));
  console.log(`    ${chalk.cyan('nyantales')}                ${chalk.dim('Interactive menu')}`);
  console.log(`    ${chalk.cyan('nyantales list')}           ${chalk.dim('List available stories')}`);
  console.log(`    ${chalk.cyan('nyantales play <story>')}   ${chalk.dim('Play a specific story')}`);
  console.log(`    ${chalk.cyan('nyantales play')}           ${chalk.dim('Pick a story interactively')}`);
  console.log(`    ${chalk.cyan('nyantales continue')}       ${chalk.dim('Resume from a saved game')}`);
  console.log(`    ${chalk.cyan('nyantales saves')}          ${chalk.dim('List saved games')}`);
  console.log(`    ${chalk.cyan('nyantales progress')}       ${chalk.dim('View ending discovery progress')}`);
  console.log(`    ${chalk.cyan('nyantales validate')}       ${chalk.dim('Validate all stories')}`);
  console.log(`    ${chalk.cyan('nyantales validate <s>')}   ${chalk.dim('Validate a specific story')}`);
  console.log(`    ${chalk.cyan('nyantales new [slug]')}     ${chalk.dim('Scaffold a new story')}`);
  console.log(`    ${chalk.cyan('nyantales map <story>')}   ${chalk.dim('Show story graph & paths')}`);
  console.log(`    ${chalk.cyan('nyantales map')}           ${chalk.dim('Map all stories')}`);
  console.log(`    ${chalk.cyan('nyantales achievements')}  ${chalk.dim('View unlocked achievements')}`);
  console.log(`    ${chalk.cyan('nyantales stats')}          ${chalk.dim('Player statistics dashboard')}`);
  console.log(`    ${chalk.cyan('nyantales --help')}         ${chalk.dim('Show this help')}`);
  console.log();
  console.log(chalk.bold('  Options:\n'));
  console.log(`    ${chalk.cyan('--fast')}       ${chalk.dim('Skip typewriter animation')}`);
  console.log(`    ${chalk.cyan('--debug')}      ${chalk.dim('Show scene/flag debug info')}`);
  console.log(`    ${chalk.cyan('--pedantic')}   ${chalk.dim('Enable extra validation warnings')}`);
  console.log();
  console.log(chalk.bold('  Examples:\n'));
  console.log(`    ${chalk.dim('nyantales play the-terminal-cat')}`);
  console.log(`    ${chalk.dim('nyantales play the-terminal-cat --fast')}`);
  console.log(`    ${chalk.dim('nyantales validate')}`);
  console.log(`    ${chalk.dim('nyantales validate cafe-debug --pedantic')}`);
  console.log(`    ${chalk.dim('nyantales continue')}`);
  console.log();
}

// ─────────────────────────────────────────────────────────────
// List stories
// ─────────────────────────────────────────────────────────────

function listStories() {
  const stories = discoverStories(STORIES_DIR);

  console.log(BANNER);

  if (stories.length === 0) {
    console.log(chalk.yellow('  No stories found in: ') + chalk.dim(STORIES_DIR));
    console.log(chalk.dim('  Drop a story folder with story.yaml inside stories/ to get started.\n'));
    return;
  }

  console.log(chalk.bold(`  ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} available:\n`));

  for (const s of stories) {
    console.log(`  ${chalk.cyan('◆')} ${chalk.bold(s.slug)}`);
    console.log(`    ${chalk.white(s.title)}`);
    if (s.description) console.log(`    ${chalk.dim(s.description)}`);
    if (s.author)      console.log(`    ${chalk.dim('by ' + s.author)}`);
    console.log();
  }

  console.log(chalk.dim(`  Run: nyantales play <slug>\n`));
}

// ─────────────────────────────────────────────────────────────
// Play a story
// ─────────────────────────────────────────────────────────────

async function playStory(slug, opts = {}) {
  let storyFile;

  if (slug) {
    storyFile = path.join(STORIES_DIR, slug, 'story.yaml');
    if (!fs.existsSync(storyFile)) {
      // Also try treating slug as a direct file path
      if (fs.existsSync(slug)) {
        storyFile = slug;
      } else {
        console.error(chalk.red(`\n  Story not found: ${slug}`));
        console.log(chalk.dim(`  Run 'nyantales list' to see available stories.\n`));
        process.exit(1);
      }
    }
  } else {
    // Interactive picker
    const stories = discoverStories(STORIES_DIR);
    if (stories.length === 0) {
      console.log(chalk.yellow('\n  No stories found.\n'));
      process.exit(0);
    }

    console.log(BANNER);

    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: chalk.cyan('Choose a story:'),
      choices: stories.map(s => ({
        name: `${chalk.bold(s.title)} ${chalk.dim('— ' + s.description)}`,
        value: s.file,
        short: s.title,
      })),
    }]);

    storyFile = chosen;
  }

  console.log(BANNER);

  const engine = new Engine(storyFile, {
    skipAnimation: opts.fast,
    debug: opts.debug,
  });

  await engine.run();
}

// ─────────────────────────────────────────────────────────────
// Saved games
// ─────────────────────────────────────────────────────────────

function listSaves() {
  const saves = Engine.listSaves();

  console.log(BANNER);

  if (saves.length === 0) {
    console.log(chalk.yellow('  No saved games found.'));
    console.log(chalk.dim('  Play a story and use the 💾 Save option to create one.\n'));
    return;
  }

  console.log(chalk.bold(`  ${saves.length} saved game${saves.length === 1 ? '' : 's'}:\n`));

  for (const s of saves) {
    const when = new Date(s.savedAt).toLocaleString();
    console.log(`  ${chalk.cyan('◆')} ${chalk.bold(s.storyTitle)} ${chalk.dim(`(${s.storySlug})`)}`);
    console.log(`    ${chalk.dim('Scene:')} ${s.scene} ${chalk.dim('·')} ${chalk.dim('Turns:')} ${s.turns} ${chalk.dim('·')} ${chalk.dim('Saved:')} ${when}`);
    console.log();
  }
}

async function continueGame(opts = {}) {
  const saves = Engine.listSaves();

  console.log(BANNER);

  if (saves.length === 0) {
    console.log(chalk.yellow('  No saved games to continue.'));
    console.log(chalk.dim('  Start a new story with: nyantales play\n'));
    return;
  }

  const { chosen } = await inquirer.prompt([{
    type: 'list',
    name: 'chosen',
    message: chalk.cyan('Which save to continue?'),
    choices: saves.map(s => {
      const when = new Date(s.savedAt).toLocaleString();
      return {
        name: `${chalk.bold(s.storyTitle)} ${chalk.dim(`— scene: ${s.scene} · ${s.turns} turns · ${when}`)}`,
        value: s,
        short: s.storyTitle,
      };
    }),
  }]);

  const storyFile = path.join(STORIES_DIR, chosen.storySlug, 'story.yaml');
  if (!fs.existsSync(storyFile)) {
    console.error(chalk.red(`\n  Story '${chosen.storySlug}' no longer exists.`));
    process.exit(1);
  }

  const engine = new Engine(storyFile, {
    skipAnimation: opts.fast,
    debug: opts.debug,
  });

  await engine.loadStory();

  // Extract slot from filename: storySlug_slot.json
  const slotMatch = chosen.file.match(/_(.+)\.json$/);
  const slot = slotMatch ? slotMatch[1] : 'auto';
  const loaded = engine.loadGame(slot);

  if (!loaded) {
    console.error(chalk.red('\n  Failed to load save file.'));
    process.exit(1);
  }

  console.log(chalk.green(`  ✦ Resuming: ${engine.story.title}`));
  console.log(chalk.dim(`  Scene: ${engine.state.currentScene} · Turn: ${engine.state.turnCount}`));
  if (engine.state.inventory.length > 0) {
    console.log(chalk.dim(`  Inventory: ${engine.state.inventory.join(', ')}`));
  }
  console.log();

  // Resume from current scene
  let sceneId = engine.state.currentScene;
  while (sceneId) {
    sceneId = await engine.showScene(sceneId);
  }
}

// ─────────────────────────────────────────────────────────────
// Validate stories
// ─────────────────────────────────────────────────────────────

async function validateStories(slug, opts = {}) {
  const { pedantic = false } = opts;

  console.log(BANNER);
  console.log(chalk.bold('  Story Validator\n'));

  let targets;

  if (slug) {
    // Validate a single story
    const storyFile = path.join(STORIES_DIR, slug, 'story.yaml');
    if (!fs.existsSync(storyFile)) {
      console.error(chalk.red(`  Story not found: ${slug}`));
      console.log(chalk.dim(`  Run 'nyantales list' to see available stories.\n`));
      process.exit(1);
    }
    targets = [{ slug, file: storyFile }];
  } else {
    // Validate all stories
    const stories = discoverStories(STORIES_DIR);
    if (stories.length === 0) {
      console.log(chalk.yellow('  No stories found to validate.\n'));
      return;
    }
    targets = stories.map(s => ({ slug: s.slug, file: s.file }));
  }

  let allPassed = true;

  for (const target of targets) {
    let story;
    try {
      const engine = new Engine(target.file, { skipAnimation: true });
      await engine.loadStory();
      story = engine.story;
    } catch (err) {
      console.log(`  ${chalk.red('✗')} ${chalk.bold(target.slug)} — failed to parse: ${err.message}`);
      allPassed = false;
      continue;
    }

    const result = validateStory(story, { pedantic });

    if (result.errors.length === 0) {
      const s = result.stats;
      const endingList = s.endingTypes.join(', ');
      console.log(`  ${chalk.green('✓')} ${chalk.bold(target.slug)}`);
      console.log(chalk.dim(`    ${s.scenes} scenes · ${s.endings} endings (${endingList}) · ${s.choices} choices`));
      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.log(`    ${chalk.yellow('⚠')} ${w}`);
        }
      }
    } else {
      allPassed = false;
      console.log(`  ${chalk.red('✗')} ${chalk.bold(target.slug)}`);
      for (const e of result.errors) {
        console.log(`    ${chalk.red('✗')} ${e}`);
      }
      for (const w of result.warnings) {
        console.log(`    ${chalk.yellow('⚠')} ${w}`);
      }
    }
    console.log();
  }

  if (allPassed) {
    console.log(chalk.green.bold('  All stories passed validation! 🐱\n'));
  } else {
    console.log(chalk.red.bold('  Some stories have errors.\n'));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// Ending progress
// ─────────────────────────────────────────────────────────────

function showProgress() {
  const stories = discoverStories(STORIES_DIR);

  console.log(BANNER);
  console.log(chalk.bold('  Ending Discovery Progress\n'));

  if (stories.length === 0) {
    console.log(chalk.yellow('  No stories found.\n'));
    return;
  }

  let totalFound = 0;
  let totalEndings = 0;

  for (const story of stories) {
    // Create a temporary engine to access endings data
    const engine = new Engine(story.file);
    try {
      const raw = fs.readFileSync(story.file, 'utf8');
      engine.story = yaml.parse(raw);
    } catch {
      continue;
    }

    const endings = engine.getEndingScenes();
    const log = engine.loadEndingsLog();
    const found = Object.keys(log.discovered).length;
    const total = endings.length;
    totalFound += found;
    totalEndings += total;

    const bar = engine.renderProgressBar(found, total);
    const status = found === total ? chalk.green(' ✦ Complete!') : '';
    console.log(`  ${chalk.bold(story.title)} ${chalk.dim(`(${story.slug})`)}`);
    console.log(`    ${bar} ${chalk.dim(`${found}/${total} endings`)}${status}`);

    // Show which endings were found
    if (found > 0) {
      const types = Object.values(log.discovered).map(d => d.type);
      const typeIcons = { good: '✦', bad: '✗', neutral: '◇', secret: '★' };
      const typeColors = { good: 'green', bad: 'red', neutral: 'yellow', secret: 'magenta' };
      const foundList = types.map(t => chalk[typeColors[t] || 'white'](`${typeIcons[t] || '?'} ${t}`)).join('  ');
      console.log(`    ${chalk.dim('Found:')} ${foundList}`);
    }

    // Show undiscovered types as hints
    if (found < total) {
      const discoveredTypes = new Set(Object.values(log.discovered).map(d => d.type));
      const allTypes = endings.map(e => e.type);
      const missing = [...new Set(allTypes.filter(t => !discoveredTypes.has(t) || allTypes.filter(at => at === t).length > discoveredTypes.size))];
      if (missing.length > 0) {
        console.log(`    ${chalk.dim('Hints:')} ${chalk.dim(missing.map(t => `??? (${t})`).join('  '))}`);
      }
    }
    console.log();
  }

  console.log(chalk.dim('  ─'.repeat(30)));
  console.log(`  ${chalk.bold('Total:')} ${totalFound}/${totalEndings} endings discovered`);
  if (totalFound === totalEndings && totalEndings > 0) {
    console.log(chalk.magenta.bold('\n  ★ ★ ★  MASTER COMPLETIONIST  ★ ★ ★'));
    console.log(chalk.magenta('  You\'ve found every ending in every story!'));
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────
// Scaffold a new story
// ─────────────────────────────────────────────────────────────

async function scaffoldStory(slug) {
  console.log(BANNER);

  if (!slug) {
    const { inputSlug } = await inquirer.prompt([{
      type: 'input',
      name: 'inputSlug',
      message: chalk.cyan('Story slug (kebab-case, e.g. "lost-in-the-cloud"):'),
      validate: v => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v) || 'Use lowercase letters, numbers, and hyphens (min 3 chars)',
    }]);
    slug = inputSlug;
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    console.error(chalk.red(`\n  Invalid slug: '${slug}'`));
    console.log(chalk.dim('  Use lowercase letters, numbers, and hyphens (min 3 chars).\n'));
    process.exit(1);
  }

  const storyDir = path.join(STORIES_DIR, slug);
  const storyFile = path.join(storyDir, 'story.yaml');

  if (fs.existsSync(storyDir)) {
    console.error(chalk.red(`\n  Story '${slug}' already exists at: ${storyDir}\n`));
    process.exit(1);
  }

  // Gather metadata
  const { title } = await inquirer.prompt([{
    type: 'input',
    name: 'title',
    message: chalk.cyan('Story title:'),
    default: slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
  }]);

  const { description } = await inquirer.prompt([{
    type: 'input',
    name: 'description',
    message: chalk.cyan('One-line description:'),
    default: 'A cat adventure in the terminal.',
  }]);

  const { author } = await inquirer.prompt([{
    type: 'input',
    name: 'author',
    message: chalk.cyan('Author:'),
    default: 'mechangelnyan',
  }]);

  const template = `# ${title}
# ${description}
# by ${author}

title: "${title}"
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

  // Create the directory and write the file
  fs.mkdirSync(storyDir, { recursive: true });
  fs.writeFileSync(storyFile, template, 'utf8');

  console.log();
  console.log(chalk.green(`  ✦ Story scaffolded!`));
  console.log();
  console.log(chalk.dim('  Directory: ') + storyDir);
  console.log(chalk.dim('  File:      ') + storyFile);
  console.log();

  // Validate the scaffold
  const engine = new Engine(storyFile, { skipAnimation: true });
  await engine.loadStory();
  const result = validateStory(engine.story);

  if (result.errors.length === 0) {
    const s = result.stats;
    console.log(`  ${chalk.green('✓')} Valid — ${s.scenes} scenes · ${s.endings} endings · ${s.choices} choices`);
  } else {
    console.log(chalk.red('  ✗ Scaffold has validation errors (this is a bug):'));
    for (const e of result.errors) console.log(`    ${chalk.red(e)}`);
  }

  console.log();
  console.log(chalk.bold('  Next steps:'));
  console.log(chalk.dim(`    1. Edit ${storyFile}`));
  console.log(chalk.dim(`    2. Run: nyantales validate ${slug}`));
  console.log(chalk.dim(`    3. Run: nyantales play ${slug}`));
  console.log();
}

// ─────────────────────────────────────────────────────────────
// Story map / graph visualization
// ─────────────────────────────────────────────────────────────

async function showStoryMap(slug, opts = {}) {
  console.log(BANNER);

  const stories = discoverStories(STORIES_DIR);
  if (stories.length === 0) {
    console.log(chalk.yellow('  No stories found.\n'));
    return;
  }

  const targets = slug
    ? stories.filter(s => s.slug === slug)
    : stories;

  if (slug && targets.length === 0) {
    console.log(chalk.red(`  Story '${slug}' not found.`));
    console.log(chalk.dim('  Available: ' + stories.map(s => s.slug).join(', ') + '\n'));
    return;
  }

  for (const s of targets) {
    const storyFile = path.join(STORIES_DIR, s.slug, 'story.yaml');
    const raw = fs.readFileSync(storyFile, 'utf8');
    const data = yaml.parse(raw);

    console.log(chalk.bold.magenta(`\n  ── ${data.title || s.slug} ──`));
    if (data.description) console.log(chalk.dim(`  ${data.description}`));
    console.log();

    const graph = analyzeStoryGraph(data);

    // Stats summary
    const st = graph.stats;
    console.log(chalk.bold('  Stats'));
    console.log(chalk.dim('  ─────'));
    console.log(`  Scenes:     ${chalk.cyan(st.totalScenes)}${st.unreachableScenes > 0 ? chalk.yellow(` (${st.unreachableScenes} unreachable)`) : ''}`);
    console.log(`  Connections: ${chalk.cyan(st.totalEdges)}${st.conditionalEdges > 0 ? chalk.dim(` (${st.conditionalEdges} conditional)`) : ''}`);

    const endParts = [];
    if (st.endings.good > 0) endParts.push(chalk.green(`${st.endings.good} good`));
    if (st.endings.bad > 0) endParts.push(chalk.red(`${st.endings.bad} bad`));
    if (st.endings.neutral > 0) endParts.push(chalk.yellow(`${st.endings.neutral} neutral`));
    if (st.endings.secret > 0) endParts.push(chalk.magenta(`${st.endings.secret} secret`));
    console.log(`  Endings:    ${chalk.cyan(st.endings.total)} — ${endParts.join(', ')}`);

    if (st.hubScenes.length > 0) {
      console.log(`  Hub scenes: ${st.hubScenes.map(h => chalk.cyan(h.id) + chalk.dim(` (${h.outDegree} exits)`)).join(', ')}`);
    }

    if (st.deadEnds.length > 0) {
      console.log(chalk.yellow(`  ⚠ Dead ends: ${st.deadEnds.join(', ')}`));
    }

    // ASCII map
    const asciiMap = renderAsciiMap(graph);
    console.log(asciiMap);

    // Ending paths
    const paths = findEndingPaths(graph);
    const pathsText = renderEndingPaths(paths);
    console.log(pathsText);

    console.log(chalk.dim('  ' + '═'.repeat(58)) + '\n');
  }
}

// ─────────────────────────────────────────────────────────────
// Player Stats Dashboard
// ─────────────────────────────────────────────────────────────

function showStats() {
  const stories = discoverStories(STORIES_DIR).map(s => {
    try {
      const raw = fs.readFileSync(s.file, 'utf8');
      const data = yaml.parse(raw);
      const endings = Object.entries(data.scenes || {})
        .filter(([, sc]) => sc.is_ending)
        .map(([id, sc]) => ({ id, type: sc.ending_type || 'neutral' }));
      return { ...s, _endings: endings };
    } catch {
      return { ...s, _endings: [] };
    }
  });
  const stats = gatherStats(STORIES_DIR, stories);
  const data = loadAchievements();
  const playStats = data.playStats || {};

  console.log(BANNER);
  console.log(chalk.bold('  Player Statistics\n'));

  // Cat Rank based on overall progress
  const rank = getCatRank(stats, playStats);
  console.log(`  ${rank.icon}  ${chalk.bold(rank.title)}`);
  console.log(`  ${chalk.dim(rank.flavor)}\n`);

  // Play stats
  const totalPlaythroughs = playStats.totalPlaythroughs || 0;
  console.log(chalk.bold('  Journey'));
  console.log(`    Playthroughs   ${chalk.cyan(totalPlaythroughs)}`);
  console.log(`    Stories found  ${chalk.cyan(stats.storiesCompleted)}${chalk.dim('/' + stats.totalStories)}`);
  console.log(`    100% complete  ${chalk.cyan(stats.storiesFullyCompleted)}${chalk.dim('/' + stats.totalStories)}`);
  console.log();

  // Endings breakdown
  const endingPct = stats.totalEndings > 0
    ? Math.round((stats.totalEndingsFound / stats.totalEndings) * 100)
    : 0;
  console.log(chalk.bold('  Endings'));
  console.log(`    Discovered  ${chalk.green(stats.totalEndingsFound)}${chalk.dim('/' + stats.totalEndings)} ${chalk.dim(`(${endingPct}%)`)}`);
  console.log(`    ${chalk.green('✦')} Good    ${chalk.green(stats.goodEndingsFound)}`);
  console.log(`    ${chalk.red('✗')} Bad     ${chalk.red(stats.badEndingsFound)}`);
  console.log(`    ${chalk.magenta('★')} Secret  ${chalk.magenta(stats.secretEndingsFound)}${chalk.dim('/' + stats.totalSecretEndings)}`);
  console.log();

  // Records
  if (totalPlaythroughs > 0) {
    console.log(chalk.bold('  Records'));
    if (playStats.minTurns > 0) {
      console.log(`    Fastest clear   ${chalk.yellow(playStats.minTurns)} turns`);
    }
    if (playStats.maxScenesVisited > 0) {
      console.log(`    Most explored   ${chalk.yellow(playStats.maxScenesVisited)} scenes in one run`);
    }
    if (playStats.maxItems > 0) {
      console.log(`    Biggest hoard   ${chalk.yellow(playStats.maxItems)} items held at once`);
    }
    if (playStats.lastPlayedAt) {
      const d = new Date(playStats.lastPlayedAt);
      console.log(`    Last played     ${chalk.dim(d.toLocaleDateString() + ' ' + d.toLocaleTimeString())}`);
    }
    console.log();
  }

  // Achievements summary
  const achUnlocked = Object.keys(data.unlocked || {}).length;
  const achTotal = ACHIEVEMENTS.length;
  console.log(chalk.bold('  Achievements'));
  console.log(`    Unlocked  ${chalk.cyan(achUnlocked)}${chalk.dim('/' + achTotal)}`);
  if (achUnlocked > 0) {
    const recent = Object.entries(data.unlocked)
      .sort(([, a], [, b]) => new Date(b.at || 0) - new Date(a.at || 0))
      .slice(0, 3);
    for (const [id] of recent) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) console.log(`    ${ach.icon}  ${chalk.dim(ach.name)}`);
    }
  }
  console.log();

  // No games yet hint
  if (totalPlaythroughs === 0) {
    console.log(chalk.dim('  No adventures yet! Run ') + chalk.cyan('nyantales play') + chalk.dim(' to begin.\n'));
  }
}

function getCatRank(stats, playStats) {
  const total = playStats.totalPlaythroughs || 0;
  const pct = stats.totalEndings > 0
    ? stats.totalEndingsFound / stats.totalEndings
    : 0;

  if (pct >= 1 && stats.storiesFullyCompleted >= stats.totalStories) {
    return { icon: '👑', title: 'Legendary Cat', flavor: 'You\'ve seen every path, every ending. The terminal bows to you.' };
  }
  if (stats.secretEndingsFound >= stats.totalSecretEndings && stats.totalSecretEndings > 0) {
    return { icon: '🌑', title: 'Shadow Cat', flavor: 'No secret is safe from your curious paws.' };
  }
  if (pct >= 0.75) {
    return { icon: '⭐', title: 'Senior Cat', flavor: 'A seasoned explorer of terminal worlds.' };
  }
  if (pct >= 0.5) {
    return { icon: '🐱', title: 'Adventuring Cat', flavor: 'Halfway through the stories — and hungry for more.' };
  }
  if (stats.storiesCompleted >= 3) {
    return { icon: '🐾', title: 'Wandering Cat', flavor: 'Getting comfortable in the terminal. Keep exploring!' };
  }
  if (total >= 1) {
    return { icon: '🌱', title: 'Kitten', flavor: 'Just getting started. The terminal is vast...' };
  }
  return { icon: '🥚', title: 'Unhatched', flavor: 'A cat yet to begin their adventure.' };
}

// ─────────────────────────────────────────────────────────────
// Achievements
// ─────────────────────────────────────────────────────────────

function showAchievements() {
  console.log(BANNER);
  renderAllAchievements();
}

// ─────────────────────────────────────────────────────────────
// Interactive main menu (no args)
// ─────────────────────────────────────────────────────────────

async function mainMenu() {
  console.log(BANNER);

  const saves = Engine.listSaves();
  const choices = [
    { name: 'Play a story',            value: 'play' },
  ];
  if (saves.length > 0) {
    choices.push({ name: `Continue saved game (${saves.length} save${saves.length === 1 ? '' : 's'})`, value: 'continue' });
  }
  const achData = loadAchievements();
  const achCount = Object.keys(achData.unlocked || {}).length;
  const achTotal = ACHIEVEMENTS.length;

  choices.push(
    { name: 'List available stories',  value: 'list' },
    { name: 'Story map / graph',       value: 'map' },
    { name: 'Ending discovery progress', value: 'progress' },
    { name: `Achievements (${achCount}/${achTotal})`,  value: 'achievements' },
    { name: 'Player stats',            value: 'stats' },
    { name: 'Help',                    value: 'help' },
    { name: 'Exit',                    value: 'exit' },
  );

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan('What would you like to do?'),
    choices,
  }]);

  switch (action) {
    case 'play': await playStory(null); break;
    case 'continue': await continueGame(); break;
    case 'list': listStories(); break;
    case 'map': await showStoryMap(null); break;
    case 'progress': showProgress(); break;
    case 'achievements': showAchievements(); break;
    case 'stats': showStats(); break;
    case 'help': showHelp(); break;
    case 'exit': process.exit(0);
  }
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Handle help flag immediately before anything else
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Extract flags
  const fast     = args.includes('--fast');
  const debug    = args.includes('--debug');
  const pedantic = args.includes('--pedantic');
  const opts     = { fast, debug, pedantic };
  const positional = args.filter(a => !a.startsWith('--'));

  const [command, ...rest] = positional;

  switch (command) {
    case undefined:
      await mainMenu();
      break;

    case 'list':
      listStories();
      break;

    case 'play':
      await playStory(rest[0], opts);
      break;

    case 'continue':
    case 'load':
      await continueGame(opts);
      break;

    case 'saves':
      listSaves();
      break;

    case 'progress':
    case 'endings':
      showProgress();
      break;

    case 'validate':
    case 'check':
      await validateStories(rest[0], opts);
      break;

    case 'new':
    case 'create':
    case 'scaffold':
      await scaffoldStory(rest[0]);
      break;

    case 'map':
    case 'graph':
      await showStoryMap(rest[0], opts);
      break;

    case 'achievements':
    case 'badges':
      showAchievements();
      break;

    case 'stats':
    case 'statistics':
      showStats();
      break;

    case '--help':
    case '-h':
    case 'help':
      showHelp();
      break;

    default:
      // Could be a direct story slug shorthand
      if (!command.startsWith('-')) {
        await playStory(command, opts);
      } else {
        showHelp();
      }
  }
}

main().catch(err => {
  console.error(chalk.red('\n  Fatal error: ') + err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
