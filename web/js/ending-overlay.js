/**
 * NyanTales — Ending Overlay
 * Manages the ending screen: pre-built DOM, share, restart/menu actions,
 * "Continue ▶" prompt, and event delegation.
 *
 * Pre-built ending DOM, continue prompt, share, and event delegation.
 *
 * @class EndingOverlay
 */

class EndingOverlay {
  /**
   * @param {HTMLElement} endingEl - The #vn-ending container
   * @param {HTMLElement} choicesEl - The #vn-choices container (for continue prompt)
   * @param {SpriteManager} sprites - Sprite manager for ending state
   */
  constructor(endingEl, choicesEl, sprites) {
    this.endingEl = endingEl;
    this.choicesEl = choicesEl;
    this._sprites = sprites;

    // Callbacks (wired by main.js)
    this._onRestart = null;
    this._onMenu = null;

    /**
     * Called when the player clicks "Next Chapter" in campaign mode.
     * Wired once by main.js at init time.
     * @type {Function|null}
     */
    this.onCampaignEnding = null;

    /**
     * Called after the ending overlay is assembled — for injecting reading time,
     * recording stats, and showing campaign buttons.
     * @type {Function|null}
     * @param {Object} scene - The ending scene object
     * @param {StoryEngine} engine - The current engine instance
     */
    this.onEndingHook = null;

    // Share data stored for delegation handler
    this._endingShareData = null;

    /**
     * Total scene count for the current story (avoids Object.keys per ending).
     * Set by main.js after engine initialization.
     * @type {number}
     */
    this.totalScenes = 0;

    // Pre-built ending overlay child elements (avoids innerHTML per ending)
    this.refs = this._buildDOM();

    // Init ending event delegation (one-time, prevents listener leak)
    this._initDelegation();

    // Reusable continue button (lazy-created)
    this._continueBtn = null;
    this._continueResolve = null;
  }

  /** Ending type → icon map (static, avoids object literal allocation per ending). */
  static _ICONS = { good: '🌟', bad: '💀', neutral: '📋', secret: '🔮' };

  // ── DOM Construction ──

  /**
   * Build the ending overlay DOM tree once. Returns refs to dynamic elements
   * so show() can swap content via textContent/classList instead of innerHTML.
   * @private
   */
  _buildDOM() {
    const r = {};
    r.iconEl = document.createElement('div');
    r.iconEl.className = 'ending-icon';

    r.typeEl = document.createElement('div');
    r.typeEl.className = 'ending-type';

    r.textEl = document.createElement('div');
    r.textEl.className = 'ending-text';

    r.statsGrid = document.createElement('div');
    r.statsGrid.className = 'ending-stats-grid';
    r.statsGrid.id = 'ending-stats-grid';

    // Turns stat (always visible)
    r.turnsBox = document.createElement('div');
    r.turnsBox.className = 'ending-stat-box';
    r.turnsVal = document.createElement('span');
    r.turnsVal.className = 'ending-stat-value';
    const turnsLabel = document.createElement('span');
    turnsLabel.className = 'ending-stat-label';
    turnsLabel.textContent = 'Turns';
    r.turnsBox.appendChild(r.turnsVal);
    r.turnsBox.appendChild(turnsLabel);

    // Scenes stat (always visible)
    r.scenesBox = document.createElement('div');
    r.scenesBox.className = 'ending-stat-box';
    r.scenesVal = document.createElement('span');
    r.scenesVal.className = 'ending-stat-value';
    r.scenesLabel = document.createElement('span');
    r.scenesLabel.className = 'ending-stat-label';
    r.scenesBox.appendChild(r.scenesVal);
    r.scenesBox.appendChild(r.scenesLabel);

    // Inventory stat (conditionally shown)
    r.invBox = document.createElement('div');
    r.invBox.className = 'ending-stat-box ending-stat-wide';
    r.invVal = document.createElement('span');
    r.invVal.className = 'ending-stat-value';
    const invLabel = document.createElement('span');
    invLabel.className = 'ending-stat-label';
    invLabel.textContent = 'Items Collected';
    r.invBox.appendChild(r.invVal);
    r.invBox.appendChild(invLabel);

    // Actions row (always the same buttons)
    r.actionsRow = document.createElement('div');
    r.actionsRow.className = 'ending-actions';
    r.restartBtn = document.createElement('button');
    r.restartBtn.className = 'ending-btn';
    r.restartBtn.dataset.action = 'restart';
    r.restartBtn.textContent = '↻ Play Again';
    r.menuBtn = document.createElement('button');
    r.menuBtn.className = 'ending-btn ending-btn-secondary';
    r.menuBtn.dataset.action = 'menu';
    r.menuBtn.textContent = '⏎ Story List';
    r.shareBtn = document.createElement('button');
    r.shareBtn.className = 'ending-btn ending-btn-secondary ending-btn-share';
    r.shareBtn.dataset.action = 'share';
    r.shareBtn.title = 'Copy ending summary to clipboard';
    r.shareBtn.textContent = '📋 Share';
    r.actionsRow.appendChild(r.restartBtn);
    r.actionsRow.appendChild(r.menuBtn);
    r.actionsRow.appendChild(r.shareBtn);

    return r;
  }

  // ── Event Delegation ──

  /**
   * Initialize event delegation on the ending overlay (called once).
   * @private
   */
  _initDelegation() {
    this.endingEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'restart' && this._onRestart) {
        this._onRestart();
      } else if (action === 'menu' && this._onMenu) {
        this._onMenu();
      } else if (action === 'share') {
        await this._share();
      } else if (action === 'campaign-next' && this.onCampaignEnding) {
        this.onCampaignEnding();
      }
    });
  }

  // ── Continue Prompt ──

  /**
   * Show a "Continue ▶" button and wait for the player to click/tap it
   * before revealing the ending overlay.
   * @returns {Promise<void>}
   */
  waitForContinue() {
    return new Promise(resolve => {
      this.choicesEl.textContent = '';
      this.choicesEl.classList.remove('hidden');

      // Lazy-create the continue button with permanent handlers
      if (!this._continueBtn) {
        this._continueBtn = document.createElement('button');
        this._continueBtn.className = 'choice-btn ending-continue-btn fade-in';
        this._continueBtn.textContent = 'Continue ▶';

        // Permanent click handler — only fires when _continueResolve is set
        this._continueBtn.addEventListener('click', () => {
          if (this._continueResolve) this._dismissContinue();
        });

        // Permanent keydown handler — only fires when _continueResolve is set
        document.addEventListener('keydown', (e) => {
          if (!this._continueResolve) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._dismissContinue();
          }
        });
      }

      this._continueResolve = resolve;
      this.choicesEl.appendChild(this._continueBtn);
      this._continueBtn.focus();
    });
  }

  /** Dismiss the continue prompt and resolve the pending promise. */
  _dismissContinue() {
    const resolve = this._continueResolve;
    this._continueResolve = null;
    this.choicesEl.textContent = '';
    this.choicesEl.classList.add('hidden');
    if (resolve) resolve();
  }

  // ── Show / Hide ──

  /**
   * Show the ending overlay with pre-built DOM elements.
   * @param {Object} scene - Scene with ending data
   * @param {StoryEngine} engine - Current engine instance
   */
  show(scene, engine) {
    const ending = scene.ending;
    const type = ending.type || 'neutral';
    const icon = EndingOverlay._ICONS[type] || '📋';

    // Dim sprites with ending-state CSS class
    this._sprites.applyEndingState(type);

    // Use cached scene count (avoids Object.keys allocation per ending)
    let totalScenes = this.totalScenes;
    if (!totalScenes) { totalScenes = 0; for (const _ in engine.scenes) totalScenes++; }
    const visitPct = totalScenes > 0 ? Math.round((engine.state.visited.size / totalScenes) * 100) : 0;

    // Store share data for delegation handler
    const shareUrl = ShareHelper.storyUrl(engine.story?.slug);

    this._endingShareData = {
      icon,
      endingTitle: ending.title || type.toUpperCase(),
      storyTitle: engine.story.title || 'Unknown Story',
      storySlug: engine.story?.slug || '',
      turns: engine.state.turns,
      visitedSize: engine.state.visited.size,
      totalScenes,
      visitPct,
      inventory: [...engine.state.inventory],
      shareUrl
    };

    const r = this.refs;

    // Update pre-built elements with current ending data
    r.iconEl.textContent = icon;
    r.typeEl.className = `ending-type ${type}`;
    r.typeEl.textContent = (ending.title || type.toUpperCase()).toUpperCase();
    r.textEl.textContent = engine.interpolate(ending.text || scene.text || '');
    r.turnsVal.textContent = engine.state.turns;
    r.scenesVal.textContent = `${engine.state.visited.size}/${totalScenes}`;
    r.scenesLabel.textContent = `Scenes (${visitPct}%)`;

    // Rebuild stats grid (just re-append existing elements, no creation)
    r.statsGrid.textContent = '';
    r.statsGrid.appendChild(r.turnsBox);
    r.statsGrid.appendChild(r.scenesBox);
    if (engine.state.inventory.length) {
      r.invVal.textContent = `🎒 ${engine.state.inventory.join(', ')}`;
      r.statsGrid.appendChild(r.invBox);
    }

    // Assemble into endingEl (no innerHTML — just re-append pre-built children)
    this.endingEl.textContent = '';
    this.endingEl.appendChild(r.iconEl);
    this.endingEl.appendChild(r.typeEl);
    this.endingEl.appendChild(r.textEl);
    this.endingEl.appendChild(r.statsGrid);
    this.endingEl.appendChild(r.actionsRow);
    this.endingEl.classList.remove('hidden');

    this.endingEl.setAttribute('role', 'dialog');
    this.endingEl.setAttribute('aria-label', `Ending: ${ending.title || type}`);

    // Auto-focus the "Play Again" button for keyboard users
    requestAnimationFrame(() => r.restartBtn.focus());

    // Notify external hook (tracker, achievements)
    if (this.onEndingHook) this.onEndingHook(scene, engine);
  }

  hide() {
    this.endingEl.classList.add('hidden');
    this.endingEl.textContent = '';
  }

  // ── Share ──

  /** Share ending card via Web Share API → clipboard fallback */
  async _share() {
    const d = this._endingShareData;
    if (!d) return;

    const shareText = [
      `🐱 NyanTales — ${d.storyTitle}`,
      `${d.icon} Ending: ${d.endingTitle}`,
      `📊 ${d.turns} turns · ${d.visitedSize}/${d.totalScenes} scenes (${d.visitPct}%)`,
      d.inventory.length ? `🎒 Items: ${d.inventory.join(', ')}` : '',
      '',
      `🎮 Play this story: ${d.shareUrl}`
    ].filter(Boolean).join('\n');

    await ShareHelper.share({
      title: `NyanTales — ${d.storyTitle}`,
      text: shareText,
      url: d.shareUrl,
      successMessage: 'Copied to clipboard!',
      successIcon: '📋',
      errorMessage: 'Failed to copy'
    });
  }

  // ── Callback Setters ──

  onRestart(callback) { this._onRestart = callback; }
  onMenu(callback) { this._onMenu = callback; }
}
