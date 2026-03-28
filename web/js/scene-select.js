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

    listEl.textContent = '';

    if (visitedArr.length === 0) {
      if (!this._emptyEl) {
        this._emptyEl = document.createElement('div');
        this._emptyEl.className = 'scene-select-empty';
        this._emptyEl.textContent = 'No visited scenes yet.';
      }
      listEl.appendChild(this._emptyEl);
      this._syncCount();
    } else {
      const frag = document.createDocumentFragment();
      for (const id of visitedArr) {
        const scene = scenes[id];
        const isCurrent = id === currentSceneId;
        const speaker = scene.speaker || '';
        const preview = (scene.text || '').slice(0, 100).replace(/\n/g, ' ');
        const location = scene.location || '';

        const item = document.createElement('div');
        item.className = 'scene-select-item' + (isCurrent ? ' current' : '');
        item.dataset.sceneId = id;
        item.dataset.searchText = (id + ' ' + speaker + ' ' + preview + ' ' + location).toLowerCase();
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', 'Jump to scene: ' + id);

        // Header row
        const hdr = document.createElement('div');
        hdr.className = 'scene-select-item-header';
        const idSpan = document.createElement('span');
        idSpan.className = 'scene-select-item-id';
        idSpan.textContent = id;
        hdr.appendChild(idSpan);
        if (isCurrent) {
          const badge = document.createElement('span');
          badge.className = 'scene-current-badge';
          badge.textContent = '◀ current';
          hdr.appendChild(badge);
        }
        if (scene.ending) {
          const endBadge = document.createElement('span');
          endBadge.className = 'scene-ending-badge';
          endBadge.textContent = '🏁';
          hdr.appendChild(endBadge);
        }
        item.appendChild(hdr);

        if (location) {
          const loc = document.createElement('div');
          loc.className = 'scene-select-item-location';
          loc.textContent = '📍 ' + location;
          item.appendChild(loc);
        }
        if (speaker) {
          const spk = document.createElement('div');
          spk.className = 'scene-select-item-speaker';
          spk.textContent = '🗣 ' + speaker;
          item.appendChild(spk);
        }
        const prev = document.createElement('div');
        prev.className = 'scene-select-item-preview';
        prev.textContent = preview + (preview.length >= 100 ? '…' : '');
        item.appendChild(prev);

        if (scene.choices && scene.choices.length > 0) {
          const meta = document.createElement('div');
          meta.className = 'scene-select-item-meta';
          meta.textContent = scene.choices.length + ' choices';
          item.appendChild(meta);
        }

        frag.appendChild(item);
      }
      listEl.appendChild(frag);
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

    // Manage empty/no-results state element
    if (!this._filterEmptyEl) {
      this._filterEmptyEl = document.createElement('div');
      this._filterEmptyEl.className = 'scene-select-empty scene-select-empty-search';
    }
    if (q && this._visitedCount > 0 && visible === 0) {
      this._filterEmptyEl.textContent = 'No scenes match that search yet.';
      if (!this._filterEmptyEl.parentNode) this._listEl.appendChild(this._filterEmptyEl);
      this._filterEmptyEl.classList.remove('hidden');
    } else if (this._filterEmptyEl.parentNode) {
      this._filterEmptyEl.classList.add('hidden');
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

}
