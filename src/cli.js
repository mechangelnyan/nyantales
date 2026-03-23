#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Engine, discoverStories } from './engine.js';

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
  console.log(`    ${chalk.cyan('nyantales --help')}         ${chalk.dim('Show this help')}`);
  console.log();
  console.log(chalk.bold('  Options:\n'));
  console.log(`    ${chalk.cyan('--fast')}     ${chalk.dim('Skip typewriter animation')}`);
  console.log(`    ${chalk.cyan('--debug')}    ${chalk.dim('Show scene/flag debug info')}`);
  console.log();
  console.log(chalk.bold('  Examples:\n'));
  console.log(`    ${chalk.dim('nyantales play the-terminal-cat')}`);
  console.log(`    ${chalk.dim('nyantales play the-terminal-cat --fast')}`);
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
// Interactive main menu (no args)
// ─────────────────────────────────────────────────────────────

async function mainMenu() {
  console.log(BANNER);

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan('What would you like to do?'),
    choices: [
      { name: 'Play a story',            value: 'play' },
      { name: 'List available stories',  value: 'list' },
      { name: 'Help',                    value: 'help' },
      { name: 'Exit',                    value: 'exit' },
    ],
  }]);

  switch (action) {
    case 'play': await playStory(null); break;
    case 'list': listStories(); break;
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
  const fast  = args.includes('--fast');
  const debug = args.includes('--debug');
  const opts  = { fast, debug };
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
