/**
 * NyanTales — Scene Select Panel
 * Allows jumping to any previously visited scene within the current story.
 * Accessible via 📍 HUD button or 'G' keyboard shortcut.
 *
 * @class SceneSelect
 * @param {Function} onJump - Callback: (sceneId) => void
 */
class SceneSelect {
  constructor(onJump) {
    this.onJump = onJump;
    this.overlay = null;
    this._focusTrap = null;
    this._built = false;
  }

  /** Lazily build the overlay DOM */
  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'scene-select-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Scene Select');
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="scene-select-panel">
        <div class="scene-select-header">
          <div>
            <div class="scene-select-title">📍 Scene Select</div>
            <div class="scene-select-count"></div>
          </div>
          <button class="scene-select-close">✕</button>
        </div>
        <input type="text" class="scene-select-search" placeholder="🔍 Filter scenes..." autocomplete="off" aria-label="Search scenes" />
        <div class="scene-select-list"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Close handlers
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.overlay.querySelector('.scene-select-close').addEventListener('click', () => this.hide());

    // Search filter
    this.overlay.querySelector('.scene-select-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      this.overlay.querySelectorAll('.scene-select-item').forEach(item => {
        const text = (item.dataset.searchText || '').toLowerCase();
        item.classList.toggle('hidden-by-filter', q && !text.includes(q));
      });
    });

    this._built = true;
  }

  /**
   * Show scene select panel for a given engine state.
   * @param {StoryEngine} engine - Current story engine
   * @param {string} currentSceneId - Currently active scene ID
   */
  show(engine, currentSceneId) {
    this._build();

    const visited = engine.state.visited;
    const scenes = engine.scenes;

    // Build scene list (visited only)
    const listEl = this.overlay.querySelector('.scene-select-list');
    const countEl = this.overlay.querySelector('.scene-select-count');

    const visitedArr = [...visited].filter(id => scenes[id]);

    countEl.textContent = `${visitedArr.length} / ${Object.keys(scenes).length} scenes visited`;

    if (visitedArr.length === 0) {
      listEl.innerHTML = '<div class="scene-select-empty">No visited scenes yet.</div>';
    } else {
      listEl.innerHTML = visitedArr.map(id => {
        const scene = scenes[id];
        const isCurrent = id === currentSceneId;
        const speaker = scene.speaker || '';
        const preview = (scene.text || '').slice(0, 100).replace(/\n/g, ' ');
        const location = scene.location || '';
        const hasEnding = scene.ending ? '🏁' : '';
        const hasChoices = scene.choices && scene.choices.length > 0 ? `${scene.choices.length} choices` : '';
        const currentBadge = isCurrent ? '<span class="scene-current-badge">◀ current</span>' : '';

        return `
          <div class="scene-select-item ${isCurrent ? 'current' : ''}" 
               data-scene-id="${this._esc(id)}" 
               data-search-text="${this._esc(id + ' ' + speaker + ' ' + preview + ' ' + location)}"
               tabindex="0"
               role="button"
               aria-label="Jump to scene: ${this._esc(id)}">
            <div class="scene-select-item-header">
              <span class="scene-select-item-id">${this._esc(id)}</span>
              ${currentBadge}
              ${hasEnding ? `<span class="scene-ending-badge">${hasEnding}</span>` : ''}
            </div>
            ${location ? `<div class="scene-select-item-location">📍 ${this._esc(location)}</div>` : ''}
            ${speaker ? `<div class="scene-select-item-speaker">🗣 ${this._esc(speaker)}</div>` : ''}
            <div class="scene-select-item-preview">${this._esc(preview)}${preview.length >= 100 ? '…' : ''}</div>
            ${hasChoices ? `<div class="scene-select-item-meta">${hasChoices}</div>` : ''}
          </div>
        `;
      }).join('');

      // Wire click handlers
      listEl.querySelectorAll('.scene-select-item').forEach(item => {
        const handler = () => {
          const sceneId = item.dataset.sceneId;
          if (sceneId && this.onJump) {
            this.hide();
            this.onJump(sceneId);
          }
        };
        item.addEventListener('click', handler);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    }

    // Reset search
    this.overlay.querySelector('.scene-select-search').value = '';

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));

    if (!this._focusTrap) {
      this._focusTrap = new FocusTrap(this.overlay.querySelector('.scene-select-panel'));
    }
    this._focusTrap.activate();
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
    if (this._focusTrap) this._focusTrap.deactivate();
  }

  get isVisible() {
    return this.overlay?.classList.contains('visible') || false;
  }

  /** @private */
  _esc(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }
}
