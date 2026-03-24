// ─────────────────────────────────────────────────────────────
// Achievements — cross-story badges and milestones
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = path.join(__dirname, '..', 'saves');
const ACHIEVEMENTS_FILE = path.join(SAVES_DIR, 'achievements.json');

// ─────────────────────────────────────────────────────────────
// Achievement definitions
// ─────────────────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  // ── First steps ────────────────────────────────────────────
  {
    id: 'first_ending',
    name: 'Hello World',
    icon: '🌱',
    description: 'Reach your first ending in any story',
    category: 'basics',
    check: (stats) => stats.totalEndingsFound >= 1,
  },
  {
    id: 'three_stories',
    name: 'Bookworm Cat',
    icon: '📚',
    description: 'Complete at least 3 different stories',
    category: 'basics',
    check: (stats) => stats.storiesCompleted >= 3,
  },
  {
    id: 'all_stories',
    name: 'Library Cat',
    icon: '🏛️',
    description: 'Complete every available story at least once',
    category: 'basics',
    check: (stats) => stats.storiesCompleted >= stats.totalStories && stats.totalStories > 0,
  },

  // ── Ending hunters ─────────────────────────────────────────
  {
    id: 'first_secret',
    name: 'Curious Whiskers',
    icon: '🔮',
    description: 'Discover your first secret ending',
    category: 'endings',
    check: (stats) => stats.secretEndingsFound >= 1,
  },
  {
    id: 'all_secrets',
    name: 'Shadow Cat',
    icon: '🌑',
    description: 'Find every secret ending across all stories',
    category: 'endings',
    check: (stats) => stats.secretEndingsFound >= stats.totalSecretEndings && stats.totalSecretEndings > 0,
  },
  {
    id: 'good_endings_5',
    name: 'Purrfect Endings',
    icon: '✨',
    description: 'Discover 5 good endings',
    category: 'endings',
    check: (stats) => stats.goodEndingsFound >= 5,
  },
  {
    id: 'bad_endings_3',
    name: 'Nine Lives',
    icon: '💀',
    description: 'Discover 3 bad endings (you can take it)',
    category: 'endings',
    check: (stats) => stats.badEndingsFound >= 3,
  },
  {
    id: 'completionist_one',
    name: 'Completionist Cat',
    icon: '🏆',
    description: 'Find all endings in any single story',
    category: 'endings',
    check: (stats) => stats.storiesFullyCompleted >= 1,
  },
  {
    id: 'master_completionist',
    name: 'Master Completionist',
    icon: '👑',
    description: 'Find every ending in every story',
    category: 'endings',
    check: (stats) => stats.totalEndingsFound >= stats.totalEndings && stats.totalEndings > 0,
  },

  // ── Playstyle ──────────────────────────────────────────────
  {
    id: 'speedrun',
    name: 'Speedrunner',
    icon: '⚡',
    description: 'Reach an ending in 5 turns or fewer',
    category: 'playstyle',
    check: (stats) => stats.minTurns > 0 && stats.minTurns <= 5,
  },
  {
    id: 'explorer',
    name: 'Every Nook & Cranny',
    icon: '🔍',
    description: 'Visit 30+ scenes in a single playthrough',
    category: 'playstyle',
    check: (stats) => stats.maxScenesVisited >= 30,
  },
  {
    id: 'hoarder',
    name: 'Hoarder Cat',
    icon: '🎒',
    description: 'Collect 5+ items in a single playthrough',
    category: 'playstyle',
    check: (stats) => stats.maxItems >= 5,
  },
  {
    id: 'ten_endings',
    name: 'Path Finder',
    icon: '🗺️',
    description: 'Discover 10 endings total across all stories',
    category: 'playstyle',
    check: (stats) => stats.totalEndingsFound >= 10,
  },
  {
    id: 'twenty_endings',
    name: 'Tale Collector',
    icon: '📖',
    description: 'Discover 20 endings total across all stories',
    category: 'playstyle',
    check: (stats) => stats.totalEndingsFound >= 20,
  },
];

// ─────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────

export function loadAchievements() {
  if (!fs.existsSync(ACHIEVEMENTS_FILE)) return { unlocked: {}, playStats: {} };
  try {
    return JSON.parse(fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8'));
  } catch {
    return { unlocked: {}, playStats: {} };
  }
}

export function saveAchievements(data) {
  if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
  fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─────────────────────────────────────────────────────────────
// Stats gathering — reads ending logs to build cross-story stats
// ─────────────────────────────────────────────────────────────

export function gatherStats(storiesDir, stories) {
  const data = loadAchievements();
  const playStats = data.playStats || {};

  let totalEndingsFound = 0;
  let totalEndings = 0;
  let totalSecretEndings = 0;
  let secretEndingsFound = 0;
  let goodEndingsFound = 0;
  let badEndingsFound = 0;
  let storiesCompleted = 0;
  let storiesFullyCompleted = 0;

  for (const story of stories) {
    // Read ending discovery log
    const logPath = path.join(SAVES_DIR, `${story.slug}_endings.json`);
    let endingLog = { discovered: {} };
    if (fs.existsSync(logPath)) {
      try { endingLog = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch { /* skip */ }
    }

    // Count endings from the story file
    const storyEndings = story._endings || [];
    const total = storyEndings.length;
    const found = Object.keys(endingLog.discovered).length;

    totalEndings += total;
    totalEndingsFound += found;

    if (found > 0) storiesCompleted++;
    if (found >= total && total > 0) storiesFullyCompleted++;

    // Count by type
    for (const e of storyEndings) {
      if (e.type === 'secret') totalSecretEndings++;
    }
    for (const d of Object.values(endingLog.discovered)) {
      if (d.type === 'secret') secretEndingsFound++;
      if (d.type === 'good') goodEndingsFound++;
      if (d.type === 'bad') badEndingsFound++;
    }
  }

  return {
    totalEndingsFound,
    totalEndings,
    totalSecretEndings,
    secretEndingsFound,
    goodEndingsFound,
    badEndingsFound,
    storiesCompleted,
    storiesFullyCompleted,
    totalStories: stories.length,
    // Per-playthrough stats from playStats tracking
    minTurns: playStats.minTurns || 0,
    maxScenesVisited: playStats.maxScenesVisited || 0,
    maxItems: playStats.maxItems || 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Record per-playthrough stats (called at end of each game)
// ─────────────────────────────────────────────────────────────

export function recordPlaythrough(state) {
  const data = loadAchievements();
  if (!data.playStats) data.playStats = {};

  const turns = state.turnCount || 0;
  const visited = state.visited ? state.visited.size || 0 : 0;
  const items = state.inventory ? state.inventory.length : 0;

  // Track extremes
  if (turns > 0 && (data.playStats.minTurns === undefined || data.playStats.minTurns === 0 || turns < data.playStats.minTurns)) {
    data.playStats.minTurns = turns;
  }
  if (visited > (data.playStats.maxScenesVisited || 0)) {
    data.playStats.maxScenesVisited = visited;
  }
  if (items > (data.playStats.maxItems || 0)) {
    data.playStats.maxItems = items;
  }

  data.playStats.totalPlaythroughs = (data.playStats.totalPlaythroughs || 0) + 1;
  data.playStats.lastPlayedAt = new Date().toISOString();

  saveAchievements(data);
}

// ─────────────────────────────────────────────────────────────
// Check and unlock achievements — returns newly unlocked ones
// ─────────────────────────────────────────────────────────────

export function checkAchievements(stats) {
  const data = loadAchievements();
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (data.unlocked[ach.id]) continue; // already unlocked

    try {
      if (ach.check(stats)) {
        data.unlocked[ach.id] = {
          unlockedAt: new Date().toISOString(),
        };
        newlyUnlocked.push(ach);
      }
    } catch {
      // Skip broken checks
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievements(data);
  }

  return newlyUnlocked;
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

export function renderNewAchievements(newlyUnlocked) {
  if (newlyUnlocked.length === 0) return;

  console.log();
  console.log(chalk.yellow.bold('  🏅 Achievement Unlocked!'));
  console.log(chalk.dim('  ─'.repeat(28)));

  for (const ach of newlyUnlocked) {
    console.log(`  ${ach.icon}  ${chalk.bold.yellow(ach.name)}`);
    console.log(`     ${chalk.dim(ach.description)}`);
  }

  console.log(chalk.dim('  ─'.repeat(28)));
}

export function renderAllAchievements() {
  const data = loadAchievements();

  const categories = [
    { key: 'basics', label: 'Getting Started', icon: '🌟' },
    { key: 'endings', label: 'Ending Hunter', icon: '🔓' },
    { key: 'playstyle', label: 'Playstyle', icon: '🎮' },
  ];

  const unlockedCount = Object.keys(data.unlocked).length;
  const totalCount = ACHIEVEMENTS.length;

  console.log(chalk.bold('  Achievements\n'));

  // Progress bar
  const filled = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 20) : 0;
  const empty = 20 - filled;
  const bar = chalk.yellow('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  console.log(`  ${bar} ${chalk.dim(`${unlockedCount}/${totalCount}`)}\n`);

  for (const cat of categories) {
    const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.key);
    console.log(chalk.bold(`  ${cat.icon} ${cat.label}`));
    console.log(chalk.dim('  ─'.repeat(28)));

    for (const ach of catAchievements) {
      const unlocked = !!data.unlocked[ach.id];
      if (unlocked) {
        const when = new Date(data.unlocked[ach.id].unlockedAt).toLocaleDateString();
        console.log(`  ${ach.icon}  ${chalk.bold(ach.name)} ${chalk.dim(`— ${when}`)}`);
        console.log(`     ${chalk.dim(ach.description)}`);
      } else {
        console.log(`  ${chalk.dim('🔒')}  ${chalk.dim(ach.name)}`);
        console.log(`     ${chalk.dim.italic(ach.description)}`);
      }
    }
    console.log();
  }

  // Fun stat if play stats exist
  const ps = data.playStats || {};
  if (ps.totalPlaythroughs) {
    console.log(chalk.bold('  📊 Play Stats'));
    console.log(chalk.dim('  ─'.repeat(28)));
    console.log(`  Total playthroughs: ${chalk.cyan(ps.totalPlaythroughs)}`);
    if (ps.minTurns) console.log(`  Fastest ending:     ${chalk.cyan(ps.minTurns)} turns`);
    if (ps.maxScenesVisited) console.log(`  Most scenes visited: ${chalk.cyan(ps.maxScenesVisited)}`);
    if (ps.maxItems) console.log(`  Most items held:    ${chalk.cyan(ps.maxItems)}`);
    console.log();
  }
}
