import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TYPEWRITER_SPEED = 18; // ms per character

// ─────────────────────────────────────────────────────────────
// GameState
// ─────────────────────────────────────────────────────────────

export class GameState {
  constructor() {
    this.visited = new Set();
    this.inventory = [];
    this.flags = new Set();
    this.currentScene = null;
    this.turnCount = 0;
  }

  hasFlag(flag) { return this.flags.has(flag); }
  setFlag(flag) { this.flags.add(flag); }
  removeFlag(flag) { this.flags.delete(flag); }

  hasItem(item) { return this.inventory.includes(item); }
  addItem(item) { if (!this.hasItem(item)) this.inventory.push(item); }
  removeItem(item) { this.inventory = this.inventory.filter(i => i !== item); }

  markVisited(scene) { this.visited.add(scene); }
  hasVisited(scene) { return this.visited.has(scene); }
}

// ─────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────

export class Engine {
  constructor(storyPath, options = {}) {
    this.storyPath = storyPath;
    this.story = null;
    this.state = new GameState();
    this.speed = options.speed ?? DEFAULT_TYPEWRITER_SPEED;
    this.skipAnimation = options.skipAnimation ?? false;
    this.debug = options.debug ?? false;
  }

  // ── Loading ──────────────────────────────────────────────

  async loadStory() {
    const content = fs.readFileSync(this.storyPath, 'utf8');
    this.story = yaml.parse(content);
  }

  // ── Output helpers ───────────────────────────────────────

  async typewrite(text, color) {
    if (!text) return;
    const str = String(text);
    const painted = color && chalk[color] ? chalk[color](str) : str;

    if (this.skipAnimation) {
      process.stdout.write(painted + '\n');
      return;
    }

    for (const char of painted) {
      process.stdout.write(char);
      // Newlines land instantly; spaces are slightly faster
      const delay = char === '\n' ? 0 : char === ' ' ? this.speed * 0.4 : this.speed;
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }
    process.stdout.write('\n');
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  displayArt(art) {
    if (!art) return;
    const lines = String(art).split('\n');
    for (const line of lines) {
      console.log(chalk.cyan(line));
    }
  }

  displayDivider(char = '─', width = 60) {
    console.log(chalk.dim(char.repeat(width)));
  }

  displayInventory() {
    if (this.state.inventory.length > 0) {
      const items = this.state.inventory
        .map(i => chalk.yellow(`[${i}]`))
        .join(' ');
      console.log(chalk.dim('  Carrying: ') + items);
      console.log();
    }
  }

  // ── Condition evaluation ─────────────────────────────────

  checkCondition(cond) {
    if (!cond) return true;
    if (typeof cond === 'string') return this.state.hasFlag(cond);
    if (cond.flag)          return this.state.hasFlag(cond.flag);
    if (cond.not_flag)      return !this.state.hasFlag(cond.not_flag);
    if (cond.has_item)      return this.state.hasItem(cond.has_item);
    if (cond.no_item)       return !this.state.hasItem(cond.no_item);
    if (cond.visited)       return this.state.hasVisited(cond.visited);
    if (cond.not_visited)   return !this.state.hasVisited(cond.not_visited);
    return true;
  }

  choiceAvailable(choice) {
    if (choice.requires_flag && !this.state.hasFlag(choice.requires_flag)) return false;
    if (choice.requires_not_flag && this.state.hasFlag(choice.requires_not_flag)) return false;
    if (choice.requires_item && !this.state.hasItem(choice.requires_item)) return false;
    if (choice.requires_no_item && this.state.hasItem(choice.requires_no_item)) return false;
    if (choice.requires_visited && !this.state.hasVisited(choice.requires_visited)) return false;
    if (choice.condition && !this.checkCondition(choice.condition)) return false;
    return true;
  }

  applyEffects(choice) {
    // Single or array variants for all effect types
    const asArray = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
    for (const f of asArray(choice.set_flag))    this.state.setFlag(f);
    for (const f of asArray(choice.set_flags))   this.state.setFlag(f);
    for (const f of asArray(choice.remove_flag)) this.state.removeFlag(f);
    for (const i of asArray(choice.give_item))   this.state.addItem(i);
    for (const i of asArray(choice.give_items))  this.state.addItem(i);
    for (const i of asArray(choice.remove_item)) this.state.removeItem(i);
  }

  // ── Scene rendering ──────────────────────────────────────

  async showScene(sceneId) {
    const scene = this.story.scenes[sceneId];
    if (!scene) {
      console.error(chalk.red(`\n  Error: scene '${sceneId}' not found in story file.`));
      process.exit(1);
    }

    this.state.markVisited(sceneId);
    this.state.currentScene = sceneId;
    this.state.turnCount++;

    console.log('\n' + chalk.dim('─'.repeat(60)) + '\n');

    // ASCII art
    if (scene.art) {
      this.displayArt(scene.art);
      console.log();
    }

    // Scene label (optional)
    if (scene.location) {
      console.log(chalk.dim(`  ${scene.location}`));
      console.log();
    }

    // Main narrative text
    if (scene.text) {
      await this.typewrite(scene.text, 'white');
      console.log();
    }

    // Second-visit text
    if (scene.revisit_text && this.state.hasVisited(sceneId) && this.state.turnCount > 1) {
      // Already marked visited above, so just check turnCount proxy
      // Actually we need to track if THIS specific scene was visited before this turn
      // We'll use a pre-visit check below instead
    }

    // Conditional text blocks
    if (Array.isArray(scene.conditional)) {
      for (const block of scene.conditional) {
        if (this.checkCondition(block.condition)) {
          await this.typewrite(block.text, block.color || 'yellow');
          console.log();
        }
      }
    }

    // Inventory display
    this.displayInventory();

    // Debug info
    if (this.debug) {
      console.log(chalk.dim(`  [scene: ${sceneId} | flags: ${[...this.state.flags].join(',')} | items: ${this.state.inventory.join(',')}]`));
      console.log();
    }

    // Ending scene
    if (scene.is_ending) {
      await this.renderEnding(scene);
      return null;
    }

    // Filter choices
    const available = (scene.choices || []).filter(c => this.choiceAvailable(c));

    if (available.length === 0) {
      if (scene.fallback_goto) return scene.fallback_goto;
      console.log(chalk.dim('\n  [ The story ends here — no paths remain. ]\n'));
      return null;
    }

    // Single forced choice (no prompt)
    if (available.length === 1 && available[0].auto) {
      this.applyEffects(available[0]);
      return available[0].goto;
    }

    const { idx } = await inquirer.prompt([{
      type: 'list',
      name: 'idx',
      message: chalk.cyan('What do you do?'),
      choices: available.map((c, i) => ({
        name: c.label,
        value: i,
        short: c.label,
      })),
      loop: false,
    }]);

    const picked = available[idx];
    this.applyEffects(picked);
    return picked.goto;
  }

  async renderEnding(scene) {
    const type = scene.ending_type || 'neutral';
    const palette = {
      good:    { color: 'green',   icon: '✦', label: 'GOOD ENDING' },
      bad:     { color: 'red',     icon: '✗', label: 'BAD ENDING' },
      neutral: { color: 'yellow',  icon: '◇', label: 'ENDING' },
      secret:  { color: 'magenta', icon: '★', label: 'SECRET ENDING' },
    };
    const p = palette[type] || palette.neutral;

    await this.sleep(400);
    console.log('\n' + chalk[p.color]('═'.repeat(60)));
    console.log(chalk[p.color].bold(`\n  ${p.icon}  ${p.label}  ${p.icon}\n`));
    console.log(chalk[p.color]('═'.repeat(60)) + '\n');

    if (scene.ending_text) {
      await this.typewrite(scene.ending_text, p.color);
    }

    console.log('\n' + chalk.dim('─'.repeat(60)));
    console.log(chalk.dim(`  Turns taken: ${this.state.turnCount}`));
    console.log(chalk.dim(`  Items found: ${this.state.inventory.length > 0 ? this.state.inventory.join(', ') : 'none'}`));
    console.log(chalk.dim('─'.repeat(60)));
    console.log('\n' + chalk.bold.cyan('  Thanks for playing NyanTales!') + '\n');
  }

  // ── Main loop ─────────────────────────────────────────────

  async run() {
    const spinner = ora({
      text: chalk.cyan('Loading story...'),
      color: 'cyan',
    }).start();

    try {
      await this.loadStory();
    } catch (err) {
      spinner.fail('Failed to load story: ' + err.message);
      process.exit(1);
    }

    await this.sleep(600);
    spinner.succeed(chalk.green('Story loaded!'));
    await this.sleep(300);

    // Story header
    console.log('\n' + chalk.bold.magenta(`  ${this.story.title || 'Untitled Story'}`));
    if (this.story.description) {
      console.log(chalk.dim(`  ${this.story.description}`));
    }
    if (this.story.author) {
      console.log(chalk.dim(`  by ${this.story.author}`));
    }
    console.log();

    const startScene = this.story.start;
    if (!startScene) {
      console.error(chalk.red('  Story has no "start" field.'));
      process.exit(1);
    }

    // Game loop
    let sceneId = startScene;
    while (sceneId) {
      sceneId = await this.showScene(sceneId);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Story discovery helpers
// ─────────────────────────────────────────────────────────────

export function discoverStories(storiesDir) {
  if (!fs.existsSync(storiesDir)) return [];

  const entries = fs.readdirSync(storiesDir, { withFileTypes: true });
  const stories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const storyFile = path.join(storiesDir, entry.name, 'story.yaml');
    if (!fs.existsSync(storyFile)) continue;

    try {
      const raw = fs.readFileSync(storyFile, 'utf8');
      const data = yaml.parse(raw);
      stories.push({
        slug: entry.name,
        title: data.title || entry.name,
        description: data.description || '',
        author: data.author || '',
        file: storyFile,
      });
    } catch {
      // Skip unparseable stories
    }
  }

  return stories;
}
