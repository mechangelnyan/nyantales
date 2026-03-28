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
    this._searchEl = null;
    this._listEl = null;
    this._countEl = null;
    this._panelEl = null;
    this._visibleCount = 0;
    this._visitedCount = 0;
    this._sceneCount = 0;
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

    // Close: backdrop click or close button (single delegated listener)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.scene-select-close')) this.hide();
    });

    this._searchEl = this.overlay.querySelector('.scene-select-search');
    this._listEl = this.overlay.querySelector('.scene-select-list');
    this._countEl = this.overlay.querySelector('.scene-select-count');
    this._panelEl = this.overlay.querySelector('.scene-select-panel');

    // Search filter
    this._searchEl.addEventListener('input', (e) => {
      this._applyFilter(e.target.value);
    });

    // Delegated click/keydown on scene list (replaces per-item listeners)
    const listContainer = this._listEl;
    const jumpFromItem = (item) => {
      const sceneId = item?.dataset?.sceneId;
      if (sceneId && this.onJump) {
        this.hide();
        this.onJump(sceneId);
      }
    };
    listContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.scene-select-item');
      if (item) jumpFromItem(item);
    });
    listContainer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('.scene-select-item');
      if (item) { e.preventDefault(); jumpFromItem(item); }
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
    const listEl = this._listEl;
    const visitedArr = [...visited].filter(id => scenes[id]);

    this._visitedCount = visitedArr.length;
    this._sceneCount = Object.keys(scenes).length;
    this._visibleCount = visitedArr.length;

    if (visitedArr.length === 0) {
      listEl.innerHTML = '<div class="scene-select-empty">No visited scenes yet.</div>';
      this._syncCount();
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
      this._syncCount();
    }

    // Cache scene item NodeList for filter reuse (avoids querySelectorAll per keystroke)
    this._cachedItems = [...this._listEl.querySelectorAll('.scene-select-item')];

    // Reset search + visible state
    if (this._searchEl) this._searchEl.value = '';
    this._applyFilter('');

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));

    if (!this._focusTrap) {
      this._focusTrap = new FocusTrap(this._panelEl);
    }
    this._focusTrap.activate();
  }

  _syncCount() {
    if (!this._countEl) return;
    if (this._visitedCount === 0) {
      this._countEl.textContent = `0 / ${this._sceneCount} scenes visited`;
      return;
    }
    const visitedSummary = `${this._visitedCount} / ${this._sceneCount} scenes visited`;
    this._countEl.textContent = this._visibleCount === this._visitedCount
      ? visitedSummary
      : `${this._visibleCount} / ${this._visitedCount} matching · ${visitedSummary}`;
  }

  _applyFilter(query) {
    if (!this._listEl) return;
    const q = (query || '').toLowerCase().trim();
    const items = this._cachedItems || [];
    let visible = 0;

    items.forEach(item => {
      const text = (item.dataset.searchText || '').toLowerCase();
      const isVisible = !q || text.includes(q);
      item.classList.toggle('hidden-by-filter', !isVisible);
      if (isVisible) visible++;
    });

    this._visibleCount = visible;
    this._syncCount();

    const emptyEl = this._listEl.querySelector('.scene-select-empty');
    if (emptyEl) {
      emptyEl.textContent = q && this._visitedCount > 0
        ? 'No scenes match that search yet.'
        : 'No visited scenes yet.';
      emptyEl.classList.toggle('hidden', visible > 0);
    } else if (q && this._visitedCount > 0 && visible === 0) {
      this._listEl.insertAdjacentHTML('beforeend', '<div class="scene-select-empty scene-select-empty-search">No scenes match that search yet.</div>');
    } else {
      this._listEl.querySelector('.scene-select-empty-search')?.remove();
    }
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

  /** @private Escape HTML — reuses shared off-screen element */
  _esc(text) {
    if (typeof VNUI !== 'undefined' && VNUI._escapeDiv) {
      VNUI._escapeDiv.textContent = text || '';
      return VNUI._escapeDiv.innerHTML;
    }
    if (!SceneSelect._escDiv) SceneSelect._escDiv = document.createElement('div');
    SceneSelect._escDiv.textContent = text || '';
    return SceneSelect._escDiv.innerHTML;
  }
}
