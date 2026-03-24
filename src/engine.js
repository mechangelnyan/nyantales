import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { recordPlaythrough, checkAchievements, gatherStats, renderNewAchievements } from './achievements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TYPEWRITER_SPEED = 18; // ms per character
const SAVES_DIR = path.join(__dirname, '..', 'saves');

// ─────────────────────────────────────────────────────────────
// Mood system
// ─────────────────────────────────────────────────────────────

const MOOD_CONFIG = {
  tense:      { color: 'red',      icon: '⚡', label: 'tense',       speedMult: 0.55 },
  peaceful:   { color: 'green',    icon: '☮',  label: 'peaceful',    speedMult: 1.9  },
  mysterious: { color: 'magenta',  icon: '✦',  label: 'mysterious',  speedMult: 1.4  },
  funny:      { color: 'yellow',   icon: '★',  label: 'funny',       speedMult: 1.0  },
  glitch:     { color: 'cyan',     icon: '▒',  label: 'glitch',      speedMult: null },
};

const GLITCH_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'white', 'greenBright'];

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

  serialize() {
    return {
      visited: [...this.visited],
      inventory: [...this.inventory],
      flags: [...this.flags],
      currentScene: this.currentScene,
      turnCount: this.turnCount,
    };
  }

  static deserialize(data) {
    const state = new GameState();
    state.visited = new Set(data.visited || []);
    state.inventory = [...(data.inventory || [])];
    state.flags = new Set(data.flags || []);
    state.currentScene = data.currentScene || null;
    state.turnCount = data.turnCount || 0;
    return state;
  }
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
    this._glitchMode = false;
  }

  // ── Loading ──────────────────────────────────────────────

  async loadStory() {
    const content = fs.readFileSync(this.storyPath, 'utf8');
    this.story = yaml.parse(content);
  }

  // ── Save / Load ─────────────────────────────────────────

  get storySlug() {
    return path.basename(path.dirname(this.storyPath));
  }

  getSavePath(slot = 'auto') {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
    return path.join(SAVES_DIR, `${this.storySlug}_${slot}.json`);
  }

  saveGame(slot = 'auto') {
    const data = {
      version: 1,
      storySlug: this.storySlug,
      storyTitle: this.story?.title || 'Unknown',
      savedAt: new Date().toISOString(),
      state: this.state.serialize(),
    };
    const savePath = this.getSavePath(slot);
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf8');
    return savePath;
  }

  // ── Ending Discovery Tracking ─────────────────────────────

  getEndingsLogPath() {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
    return path.join(SAVES_DIR, `${this.storySlug}_endings.json`);
  }

  /** Returns all ending scene IDs from the loaded story */
  getEndingScenes() {
    if (!this.story?.scenes) return [];
    return Object.entries(this.story.scenes)
      .filter(([, s]) => s.is_ending)
      .map(([id, s]) => ({ id, type: s.ending_type || 'neutral' }));
  }

  loadEndingsLog() {
    const logPath = this.getEndingsLogPath();
    if (!fs.existsSync(logPath)) return { discovered: {} };
    try {
      return JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch {
      return { discovered: {} };
    }
  }

  saveEndingsLog(log) {
    fs.writeFileSync(this.getEndingsLogPath(), JSON.stringify(log, null, 2), 'utf8');
  }

  /** Record a discovered ending and return { found, total, isNew } */
  recordEnding(sceneId) {
    const log = this.loadEndingsLog();
    const isNew = !log.discovered[sceneId];
    if (isNew) {
      const scene = this.story.scenes[sceneId];
      log.discovered[sceneId] = {
        type: scene?.ending_type || 'neutral',
        discoveredAt: new Date().toISOString(),
      };
      this.saveEndingsLog(log);
    }
    const total = this.getEndingScenes().length;
    const found = Object.keys(log.discovered).length;
    return { found, total, isNew };
  }

  loadGame(slot = 'auto') {
    const savePath = this.getSavePath(slot);
    if (!fs.existsSync(savePath)) return false;
    const raw = fs.readFileSync(savePath, 'utf8');
    const data = JSON.parse(raw);
    this.state = GameState.deserialize(data.state);
    return true;
  }

  static listSaves() {
    if (!fs.existsSync(SAVES_DIR)) return [];
    return fs.readdirSync(SAVES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(SAVES_DIR, f), 'utf8');
          const data = JSON.parse(raw);
          return {
            file: f,
            storySlug: data.storySlug,
            storyTitle: data.storyTitle,
            savedAt: data.savedAt,
            scene: data.state?.currentScene,
            turns: data.state?.turnCount || 0,
          };
        } catch { return null; }
      })
      .filter(Boolean);
  }

  // ── Output helpers ───────────────────────────────────────

  async typewrite(text, color, opts = {}) {
    if (!text) return;
    const str = String(text);
    const { flicker = false } = opts;

    if (this.skipAnimation) {
      const painted = color && color !== 'glitch' && chalk[color] ? chalk[color](str) : str;
      process.stdout.write(painted + '\n');
      return;
    }

    for (const char of str) {
      let painted;
      if (color === 'glitch') {
        const rc = GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)];
        painted = chalk[rc](char);
      } else if (color && chalk[color]) {
        painted = (flicker && Math.random() < 0.12) ? chalk.dim(char) : chalk[color](char);
      } else {
        painted = (flicker && Math.random() < 0.12) ? chalk.dim(char) : char;
      }

      process.stdout.write(painted);

      let delay;
      if (char === '\n') {
        delay = 0;
      } else if (char === ' ') {
        delay = this.speed * 0.4;
      } else if (this._glitchMode) {
        // Erratic timing for glitch mood
        const r = Math.random();
        delay = r < 0.04 ? this.speed * 10 : r < 0.12 ? 0 : this.speed;
      } else {
        delay = this.speed;
      }

      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }
    process.stdout.write('\n');
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async applyShake() {
    if (this.skipAnimation) return;
    for (let i = 0; i < 5; i++) {
      const pad = i % 2 === 0 ? '' : '   ';
      process.stdout.write(`\r${pad}${chalk.dim('≋'.repeat(28))}    `);
      await this.sleep(80);
    }
    process.stdout.write('\r' + ' '.repeat(35) + '\n');
  }

  displayArt(art) {
    if (!art) return;
    const lines = String(art).split('\n');
    for (const line of lines) {
      console.log(chalk.cyan(line));
    }
  }

  renderProgressBar(current, total, width = 20) {
    const filled = total > 0 ? Math.round((current / total) * width) : 0;
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
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

    // Compound conditions — AND / OR
    if (Array.isArray(cond.all)) return cond.all.every(c => this.checkCondition(c));
    if (Array.isArray(cond.any)) return cond.any.some(c => this.checkCondition(c));

    // Negation wrapper
    if (cond.not != null) return !this.checkCondition(cond.not);

    // Atomic conditions
    if (cond.flag)          return this.state.hasFlag(cond.flag);
    if (cond.not_flag)      return !this.state.hasFlag(cond.not_flag);
    if (cond.has_item)      return this.state.hasItem(cond.has_item);
    if (cond.no_item)       return !this.state.hasItem(cond.no_item);
    if (cond.visited)       return this.state.hasVisited(cond.visited);
    if (cond.not_visited)   return !this.state.hasVisited(cond.not_visited);
    // Turn-count comparisons
    if (cond.min_turns != null) return this.state.turnCount >= cond.min_turns;
    if (cond.max_turns != null) return this.state.turnCount <= cond.max_turns;
    return true;
  }

  // ── Text interpolation ────────────────────────────────

  interpolate(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{(\w[\w.:]*)\}\}/g, (match, key) => {
      // Built-in variables
      if (key === 'turns')     return String(this.state.turnCount);
      if (key === 'scene')     return this.state.currentScene || '';
      if (key === 'items')     return this.state.inventory.length > 0 ? this.state.inventory.join(', ') : 'nothing';
      if (key === 'item_count') return String(this.state.inventory.length);
      if (key === 'visited_count') return String(this.state.visited.size);
      if (key === 'title')     return this.story?.title || '';

      // Flag check: {{flag:name}} → "true" / "false"
      if (key.startsWith('flag:')) return String(this.state.hasFlag(key.slice(5)));

      // Item check: {{has:name}} → "true" / "false"
      if (key.startsWith('has:'))  return String(this.state.hasItem(key.slice(4)));

      // Unknown → leave as-is
      return match;
    });
  }

  choiceAvailable(choice) {
    if (choice.requires_flag && !this.state.hasFlag(choice.requires_flag)) return false;
    if (choice.requires_not_flag && this.state.hasFlag(choice.requires_not_flag)) return false;
    if (choice.requires_item && !this.state.hasItem(choice.requires_item)) return false;
    if (choice.requires_no_item && this.state.hasItem(choice.requires_no_item)) return false;
    if (choice.requires_visited && !this.state.hasVisited(choice.requires_visited)) return false;
    // requires_items: list variant for requiring multiple items
    if (choice.requires_items) {
      const items = Array.isArray(choice.requires_items) ? choice.requires_items : [choice.requires_items];
      if (items.some(i => !this.state.hasItem(i))) return false;
    }
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

    // ── Mood setup ────────────────────────────────────────────
    const mood = scene.mood || null;
    const moodCfg = mood ? (MOOD_CONFIG[mood] || null) : null;
    const savedSpeed = this.speed;

    if (moodCfg && !this.skipAnimation) {
      if (mood === 'glitch') {
        this._glitchMode = true;
        this.speed = DEFAULT_TYPEWRITER_SPEED;
      } else if (moodCfg.speedMult != null) {
        this.speed = Math.round(DEFAULT_TYPEWRITER_SPEED * moodCfg.speedMult);
      }
    }

    // ── Scene effects ─────────────────────────────────────────
    const effects = Array.isArray(scene.effects) ? scene.effects : [];
    const hasFlicker = effects.includes('flicker');
    const hasShake   = effects.includes('shake');

    // Bell and pause trigger at scene start
    if (effects.includes('bell'))  process.stdout.write('\x07');
    if (effects.includes('pause')) await this.sleep(2000);

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

    // Mood indicator
    if (moodCfg) {
      console.log(chalk[moodCfg.color](`  ${moodCfg.icon} ${moodCfg.label}`));
      console.log();
    }

    // Shake effect just before text
    if (hasShake) await this.applyShake();

    // Main narrative text
    const textColor = moodCfg ? moodCfg.color : 'white';
    if (scene.text) {
      await this.typewrite(this.interpolate(scene.text), textColor, { flicker: hasFlicker });
      console.log();
    }

    // Conditional text blocks
    if (Array.isArray(scene.conditional)) {
      for (const block of scene.conditional) {
        if (this.checkCondition(block.condition)) {
          await this.typewrite(this.interpolate(block.text), block.color || 'yellow');
          console.log();
        }
      }
    }

    // Inventory display
    this.displayInventory();

    // Debug info
    if (this.debug) {
      console.log(chalk.dim(`  [scene: ${sceneId} | mood: ${mood || 'none'} | flags: ${[...this.state.flags].join(',')} | items: ${this.state.inventory.join(',')}]`));
      console.log();
    }

    // Restore mood/speed before choices or ending
    this.speed = savedSpeed;
    this._glitchMode = false;

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

    const storyChoices = available.map((c, i) => ({
      name: this.interpolate(c.label),
      value: i,
      short: this.interpolate(c.label),
    }));

    // Add save/quit meta-choices
    storyChoices.push(new inquirer.Separator(chalk.dim('───')));
    storyChoices.push({ name: chalk.dim('💾 Save game'),  value: '__save__', short: 'Save' });
    storyChoices.push({ name: chalk.dim('🚪 Quit'),       value: '__quit__', short: 'Quit' });

    // Loop to handle save (re-prompt after saving)
    while (true) {
      const { idx } = await inquirer.prompt([{
        type: 'list',
        name: 'idx',
        message: chalk.cyan('What do you do?'),
        choices: storyChoices,
        loop: false,
      }]);

      if (idx === '__save__') {
        const savePath = this.saveGame();
        console.log(chalk.green(`  💾 Game saved!`) + chalk.dim(` (${path.basename(savePath)})`));
        console.log();
        continue;
      }

      if (idx === '__quit__') {
        const { confirmQuit } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmQuit',
          message: chalk.yellow('Save before quitting?'),
          default: true,
        }]);
        if (confirmQuit) {
          this.saveGame();
          console.log(chalk.green('  💾 Game saved!'));
        }
        console.log(chalk.dim('\n  Until next time, little cat. 🐱\n'));
        return null;
      }

      const picked = available[idx];
      this.applyEffects(picked);
      return picked.goto;
    }
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
      await this.typewrite(this.interpolate(scene.ending_text), p.color);
    }

    // Record ending discovery
    const discovery = this.recordEnding(this.state.currentScene);

    console.log('\n' + chalk.dim('─'.repeat(60)));
    console.log(chalk.dim(`  Turns taken: ${this.state.turnCount}`));
    console.log(chalk.dim(`  Items found: ${this.state.inventory.length > 0 ? this.state.inventory.join(', ') : 'none'}`));

    // Ending discovery progress
    if (discovery.isNew) {
      console.log(chalk.green(`  🔓 New ending discovered!`));
    }
    const progressBar = this.renderProgressBar(discovery.found, discovery.total);
    console.log(chalk.dim(`  Endings: `) + progressBar + chalk.dim(` ${discovery.found}/${discovery.total}`));
    if (discovery.found === discovery.total) {
      console.log(chalk.magenta.bold(`  ★ All endings discovered! Completionist cat! ★`));
    } else {
      const remaining = discovery.total - discovery.found;
      console.log(chalk.dim(`  ${remaining} more ending${remaining === 1 ? '' : 's'} to find...`));
    }

    console.log(chalk.dim('─'.repeat(60)));

    // Record playthrough stats and check achievements
    try {
      recordPlaythrough(this.state);
      const stories = discoverStories(path.join(path.dirname(this.storyPath), '..', 'stories'))
        .map(s => {
          const raw = fs.readFileSync(s.file, 'utf8');
          const data = yaml.parse(raw);
          const endings = Object.entries(data.scenes || {})
            .filter(([, sc]) => sc.is_ending)
            .map(([id, sc]) => ({ id, type: sc.ending_type || 'neutral' }));
          return { ...s, _endings: endings };
        });
      const storiesDir = path.join(path.dirname(this.storyPath), '..', 'stories');
      const stats = gatherStats(storiesDir, stories);
      const newAch = checkAchievements(stats);
      renderNewAchievements(newAch);
    } catch {
      // Non-critical — don't break the game if achievements fail
    }

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
