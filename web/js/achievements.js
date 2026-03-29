/**
 * NyanTales — Achievement System
 * Tracks milestones and unlocks across all stories.
 */

class AchievementSystem {
  constructor(tracker) {
    this.tracker = tracker;
    this.storageKey = 'nyantales-achievements';
    this.unlocked = this._load();
    this._toast = null;
    /** Tracked staggered toast timers — cancellable on story exit */
    this._toastTimers = [];

    // Achievement definitions
    this.achievements = [
      {
        id: 'first-boot',
        name: 'First Boot',
        icon: '🐱',
        desc: 'Start your first story',
        check: (ctx) => ctx.totalPlays >= 1
      },
      {
        id: 'curious-cat',
        name: 'Curious Cat',
        icon: '🔍',
        desc: 'Complete 5 different stories',
        check: (ctx) => ctx.storiesCompleted >= 5
      },
      {
        id: 'bookworm',
        name: 'Bookworm',
        icon: '📚',
        desc: 'Complete 15 different stories',
        check: (ctx) => ctx.storiesCompleted >= 15
      },
      {
        id: 'completionist',
        name: 'Completionist',
        icon: '👑',
        desc: 'Complete all 30 stories',
        check: (ctx) => ctx.storiesCompleted >= 30
      },
      {
        id: 'explorer',
        name: 'Path Explorer',
        icon: '🔮',
        desc: 'Discover 10 unique endings',
        check: (ctx) => ctx.totalEndings >= 10
      },
      {
        id: 'multiverse',
        name: 'Multiverse Traveler',
        icon: '🌌',
        desc: 'Discover 30 unique endings',
        check: (ctx) => ctx.totalEndings >= 30
      },
      {
        id: 'speedrun',
        name: 'Speedrunner',
        icon: '⚡',
        desc: 'Complete a story in under 5 turns',
        check: (ctx) => ctx.bestTurns !== null && ctx.bestTurns <= 5
      },
      {
        id: 'patient',
        name: 'Patient Explorer',
        icon: '🐌',
        desc: 'Take 20+ turns in a single story',
        check: (ctx) => ctx.maxTurns !== null && ctx.maxTurns >= 20
      },
      {
        id: 'replay',
        name: 'Replay Value',
        icon: '🔄',
        desc: 'Play 10 total games',
        check: (ctx) => ctx.totalPlays >= 10
      },
      {
        id: 'addict',
        name: 'Terminal Addict',
        icon: '💻',
        desc: 'Play 30 total games',
        check: (ctx) => ctx.totalPlays >= 30
      },
      {
        id: 'terminal-og',
        name: 'Terminal OG',
        icon: '🖥️',
        desc: 'Complete "The Terminal Cat"',
        check: (ctx) => ctx.completedSlugs.has('the-terminal-cat')
      },
      {
        id: 'debug-master',
        name: 'Debug Master',
        icon: '🐛',
        desc: 'Complete both "Café Debug" and "Segfault"',
        check: (ctx) => ctx.completedSlugs.has('cafe-debug') && ctx.completedSlugs.has('segfault')
      },
      {
        id: 'network-cat',
        name: 'Network Cat',
        icon: '🌐',
        desc: 'Complete "DNS Quest", "404 Not Found", and "TLS Pawshake"',
        check: (ctx) => ctx.completedSlugs.has('dns-quest') && ctx.completedSlugs.has('404-not-found') && ctx.completedSlugs.has('tls-pawshake')
      },
      {
        id: 'escape-artist',
        name: 'Escape Artist',
        icon: '🏃',
        desc: 'Complete "Vim Escape" and "Docker Escape"',
        check: (ctx) => ctx.completedSlugs.has('vim-escape') && ctx.completedSlugs.has('docker-escape')
      },
      {
        id: 'memory-expert',
        name: 'Memory Expert',
        icon: '🧠',
        desc: 'Complete "Memory Leak", "Buffer Overflow", and "Stack Overflow"',
        check: (ctx) => ctx.completedSlugs.has('memory-leak') && ctx.completedSlugs.has('buffer-overflow') && ctx.completedSlugs.has('stack-overflow')
      },
      {
        id: 'night-owl',
        name: 'Night Owl',
        icon: '🦉',
        desc: 'Complete "Midnight Deploy"',
        check: (ctx) => ctx.completedSlugs.has('midnight-deploy')
      }
    ];
  }

  _load() {
    const arr = SafeStorage.getJSON(this.storageKey, []);
    return new Set(arr);
  }

  _save() {
    SafeStorage.setJSON(this.storageKey, [...this.unlocked]);
  }

  /**
   * Build context object from tracker for checking achievements.
   * Uses tracker instance data directly instead of reading raw localStorage,
   * which avoids parsing overhead and ensures consistency with in-memory state.
   * Single-pass iteration avoids Object.entries() allocation and separate getStats() call.
   */
  _buildContext() {
    const completedSlugs = new Set();
    let storiesCompleted = 0, totalEndings = 0, totalPlays = 0;
    let bestTurns = null, maxTurns = null;

    const stories = this.tracker.data.stories;
    for (const slug in stories) {
      const info = stories[slug];
      if (info.completed) {
        storiesCompleted++;
        completedSlugs.add(slug);
      }
      totalEndings += info.endingsFound.length;
      totalPlays += info.totalPlays;
      if (info.bestTurns != null) {
        if (bestTurns === null || info.bestTurns < bestTurns) bestTurns = info.bestTurns;
        if (maxTurns === null || info.bestTurns > maxTurns) maxTurns = info.bestTurns;
      }
    }

    return { storiesCompleted, totalEndings, totalPlays, completedSlugs, bestTurns, maxTurns };
  }

  /** Check all achievements, return newly unlocked ones */
  checkAll() {
    const ctx = this._buildContext();
    const newlyUnlocked = [];

    for (const ach of this.achievements) {
      if (this.unlocked.has(ach.id)) continue;
      try {
        if (ach.check(ctx)) {
          this.unlocked.add(ach.id);
          newlyUnlocked.push(ach);
        }
      } catch { /* skip */ }
    }

    if (newlyUnlocked.length > 0) {
      this._save();
    }
    return newlyUnlocked;
  }

  /** Ensure the reusable toast element exists. */
  _ensureToast() {
    if (this._toast) return;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';

    const iconEl = document.createElement('div');
    iconEl.className = 'achievement-toast-icon';
    toast.appendChild(iconEl);

    const textWrap = document.createElement('div');
    textWrap.className = 'achievement-toast-text';
    const label = document.createElement('div');
    label.className = 'achievement-toast-label';
    label.textContent = 'Achievement Unlocked!';
    textWrap.appendChild(label);
    const nameEl = document.createElement('div');
    nameEl.className = 'achievement-toast-name';
    textWrap.appendChild(nameEl);
    const descEl = document.createElement('div');
    descEl.className = 'achievement-toast-desc';
    textWrap.appendChild(descEl);
    toast.appendChild(textWrap);

    this._toastIconEl = iconEl;
    this._toastNameEl = nameEl;
    this._toastDescEl = descEl;
    this._toast = toast;
  }

  /** Show toast notification for a newly unlocked achievement (reuses single DOM element). */
  showToast(ach) {
    this._ensureToast();
    const toast = this._toast;

    // Update content
    this._toastIconEl.textContent = ach.icon;
    this._toastNameEl.textContent = ach.name;
    this._toastDescEl.textContent = ach.desc;

    // Reset animation state
    toast.classList.remove('visible');
    if (!toast.parentNode) document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Auto-dismiss (tracked for cleanup)
    const id = setTimeout(() => {
      toast.classList.remove('visible');
      const id2 = setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500);
      this._toastTimers.push(id2);
    }, 3500);
    this._toastTimers.push(id);
  }

  /** Show all toasts for newly unlocked achievements (staggered) */
  showNewUnlocks(newlyUnlocked) {
    this.cancelPendingToasts();
    for (let i = 0; i < newlyUnlocked.length; i++) {
      const ach = newlyUnlocked[i];
      const id = setTimeout(() => this.showToast(ach), i * 4000);
      this._toastTimers.push(id);
    }
  }

  /** Cancel any pending staggered achievement toasts (e.g. on story exit) */
  cancelPendingToasts() {
    for (const id of this._toastTimers) clearTimeout(id);
    this._toastTimers.length = 0;
    if (this._toast && this._toast.parentNode) {
      this._toast.classList.remove('visible');
      this._toast.parentNode.removeChild(this._toast);
    }
  }

  /**
   * Get all achievements with current unlock status stamped on each object.
   * Mutates `.unlocked` on the original definitions (safe — they're stable singletons).
   * Avoids creating 16 spread-copy objects per call (called on every panel open).
   */
  getAll() {
    for (const ach of this.achievements) {
      ach.unlocked = this.unlocked.has(ach.id);
    }
    return this.achievements;
  }

  /** Get count stats */
  getStats() {
    return {
      unlocked: this.unlocked.size,
      total: this.achievements.length
    };
  }
}
