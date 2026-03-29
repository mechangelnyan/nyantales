/**
 * TitleBrowser — Search, filter, sort, and persist title-screen story browsing state.
 *
 * Manages:
 *   - Search input (debounced, character-aware via search blobs)
 *   - Filter tabs (All / Completed / New / Favorites)
 *   - Sort dropdown (A-Z, Z-A, recent, progress, time, favorites)
 *   - Browser state persistence (survives reloads)
 *   - Clear/reset button
 *   - Filter count + empty state indicators
 *   - Mobile sticky filter panel sync
 */
class TitleBrowser {
  /**
   * @param {HTMLElement} storyGridEl — the #story-list container
   * @param {Object} [opts]
   * @param {HTMLElement} [opts.filterInput]  — search <input>
   * @param {HTMLElement} [opts.filterTagsContainer] — .filter-tags wrapper
   * @param {HTMLElement} [opts.sortSelect]   — <select> for sort mode
   * @param {HTMLElement} [opts.filterClearBtn] — reset (✕) button
   * @param {HTMLElement} [opts.storyFilter]  — #story-filter outer wrapper (for mobile sticky)
   * @param {HTMLElement} [opts.titleBg]      — .title-bg scroll container (for mobile sticky)
   */
  constructor(storyGridEl, opts = {}) {
    this._grid = storyGridEl;
    this._input = opts.filterInput || null;
    this._tagsContainer = opts.filterTagsContainer || null;
    this._tags = this._tagsContainer ? [...this._tagsContainer.querySelectorAll('.filter-tag')] : [];
    this._sortSelect = opts.sortSelect || null;
    this._clearBtn = opts.filterClearBtn || null;
    this._storyFilter = opts.storyFilter || null;
    this._titleBg = opts.titleBg || null;

    this._activeFilter = TitleBrowser.DEFAULTS.filter;
    this._activeSort = TitleBrowser.DEFAULTS.sort;
    this._cachedCards = null;
    this._filterTimer = null;

    // Pre-create count + empty state elements (hot path: avoid createElement per keystroke)
    this._countEl = this._createCountEl();
    this._emptyEl = this._createEmptyEl();

    this._wireEvents();
    this._loadState();
  }

  // ── Static ──

  static STORAGE_KEY = 'nyantales-title-browser';
  static DEFAULTS = { query: '', filter: 'all', sort: 'title-asc' };

  // ── Public API ──

  /** Current active filter tab name */
  get activeFilter() { return this._activeFilter; }
  /** Current active sort mode */
  get activeSort() { return this._activeSort; }

  /**
   * Rebuild cached card list (call after renderStoryList re-creates DOM).
   * @returns {HTMLElement[]}
   */
  refreshCards() {
    this._cachedCards = this._grid ? [...this._grid.querySelectorAll('.story-card')] : [];
    return this._cachedCards;
  }

  /** Apply current filter + sort to the grid. */
  apply() {
    this._applyFilter();
    this._applySortToGrid();
    this.syncMobileSticky();
  }

  /** Reset search, filter, and sort to defaults. */
  reset() {
    this._activeFilter = TitleBrowser.DEFAULTS.filter;
    this._activeSort = TitleBrowser.DEFAULTS.sort;
    if (this._input) this._input.value = TitleBrowser.DEFAULTS.query;
    if (this._sortSelect) this._sortSelect.value = TitleBrowser.DEFAULTS.sort;
    this._syncControls();
    this._persist();
    this.apply();
    this._input?.focus();
  }

  /** Sync mobile sticky filter positioning (call on scroll/resize/orientation). */
  syncMobileSticky() {
    if (!this._storyFilter || !this._titleBg) return;

    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const titleVisible = !this._titleBg.classList.contains('hidden');
    if (!mobile || !titleVisible) {
      this._storyFilter.classList.remove('mobile-stuck');
      this._storyFilter.style.removeProperty('--filter-sticky-top');
      this._storyFilter.style.removeProperty('--filter-sticky-left');
      this._storyFilter.style.removeProperty('--filter-sticky-width');
      return;
    }

    const rect = this._storyFilter.getBoundingClientRect();
    const titleRect = this._titleBg.getBoundingClientRect();
    const stickyTop = Math.round(titleRect.top + 8);
    const shouldStick = this._titleBg.scrollTop > Math.max(0, this._storyFilter.offsetTop - stickyTop);

    this._storyFilter.style.setProperty('--filter-sticky-top', `${stickyTop}px`);
    this._storyFilter.style.setProperty('--filter-sticky-left', `${Math.round(rect.left)}px`);
    this._storyFilter.style.setProperty('--filter-sticky-width', `${Math.round(rect.width)}px`);
    this._storyFilter.classList.toggle('mobile-stuck', shouldStick);
  }

  /** Whether the filter input has focus (for keyboard shortcut gating). */
  get isSearchFocused() {
    return this._input?.matches(':focus') ?? false;
  }

  // ── Private ──

  _createCountEl() {
    const el = document.createElement('span');
    el.id = 'filter-count';
    el.className = 'filter-count hidden';
    this._input?.parentElement?.appendChild(el);
    return el;
  }

  _createEmptyEl() {
    const el = document.createElement('div');
    el.id = 'filter-empty';
    el.className = 'filter-empty hidden';
    this._grid?.parentElement?.appendChild(el);
    return el;
  }

  _getCards() {
    if (!this._cachedCards || this._cachedCards.length === 0) {
      this._cachedCards = this._grid ? [...this._grid.querySelectorAll('.story-card')] : [];
    }
    return this._cachedCards;
  }

  // ── State persistence ──

  _loadState() {
    const stored = SafeStorage.getJSON(TitleBrowser.STORAGE_KEY, null);
    const next = { ...TitleBrowser.DEFAULTS, ...(stored || {}) };
    this._activeFilter = next.filter;
    this._activeSort = next.sort;
    if (this._input) this._input.value = next.query || '';
    if (this._sortSelect) this._sortSelect.value = next.sort || TitleBrowser.DEFAULTS.sort;
    this._syncControls();
  }

  _persist() {
    const state = {
      query: this._input?.value || '',
      filter: this._activeFilter,
      sort: this._activeSort
    };
    SafeStorage.setJSON(TitleBrowser.STORAGE_KEY, state);
    this._updateClearButton();
  }

  _syncControls() {
    if (this._sortSelect) this._sortSelect.value = this._activeSort;
    for (const tag of this._tags) {
      const isActive = tag.dataset.filter === this._activeFilter;
      tag.classList.toggle('active', isActive);
      tag.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    this._updateClearButton();
  }

  _updateClearButton() {
    if (!this._clearBtn) return;
    const isDirty = Boolean((this._input?.value || '').trim())
      || this._activeFilter !== TitleBrowser.DEFAULTS.filter
      || this._activeSort !== TitleBrowser.DEFAULTS.sort;
    this._clearBtn.classList.toggle('hidden', !isDirty);
    this._clearBtn.title = isDirty ? 'Reset search, filter, and sort' : '';
  }

  // ── Events ──

  _wireEvents() {
    // Debounced search
    this._input?.addEventListener('input', () => {
      this._updateClearButton();
      if (this._filterTimer) clearTimeout(this._filterTimer);
      this._filterTimer = setTimeout(() => {
        this._applyFilter();
        this._persist();
      }, 80);
    });

    // Clear/reset button
    this._clearBtn?.addEventListener('click', () => this.reset());

    // Filter tabs (delegated)
    this._tagsContainer?.addEventListener('click', (e) => {
      const tag = e.target.closest('.filter-tag');
      if (!tag) return;
      this._activeFilter = tag.dataset.filter;
      this._syncControls();
      this._applyFilter();
      this._persist();
    });

    // Sort dropdown
    this._sortSelect?.addEventListener('change', () => {
      this._activeSort = this._sortSelect.value;
      this._updateClearButton();
      this._applySortToGrid();
      this._persist();
    });

    // Mobile sticky sync
    this._titleBg?.addEventListener('scroll', () => this.syncMobileSticky(), { passive: true });
    window.addEventListener('resize', () => this.syncMobileSticky());
    window.addEventListener('orientationchange', () => this.syncMobileSticky());
  }

  // ── Filter logic ──

  _applyFilter() {
    const query = (this._input?.value || '').toLowerCase().trim();
    const cards = this._getCards();

    let visibleCount = 0;
    for (const card of cards) {
      let show = true;

      if (query && !card.dataset.search?.includes(query)) {
        show = false;
      }

      if (show && this._activeFilter === 'completed') {
        if (card.dataset.completed !== '1') show = false;
      } else if (show && this._activeFilter === 'new') {
        if (card.dataset.completed === '1') show = false;
      } else if (show && this._activeFilter === 'favorites') {
        if (card.dataset.favorite !== '1') show = false;
      }

      card.classList.toggle('hidden-by-filter', !show);
      if (show) visibleCount++;
    }

    // Count indicator
    if (query || this._activeFilter !== 'all') {
      this._countEl.textContent = `${visibleCount} stor${visibleCount === 1 ? 'y' : 'ies'}`;
      this._countEl.classList.remove('hidden');
    } else {
      this._countEl.classList.add('hidden');
    }

    // Empty state
    if (visibleCount === 0 && (query || this._activeFilter !== 'all')) {
      const hint = this._activeFilter === 'favorites' ? 'Tap 🤍 on a story card to favorite it!'
        : this._activeFilter === 'completed' ? 'No stories completed yet — start playing!'
        : 'No matches found. Try a different search.';
      if (!this._emptyIconEl) {
        this._emptyIconEl = document.createElement('span');
        this._emptyIconEl.className = 'filter-empty-icon';
        this._emptyIconEl.textContent = '🐱';
        this._emptyHintEl = document.createElement('span');
        this._emptyEl.textContent = '';
        this._emptyEl.appendChild(this._emptyIconEl);
        this._emptyEl.appendChild(this._emptyHintEl);
      }
      this._emptyHintEl.textContent = hint;
      this._emptyEl.classList.remove('hidden');
    } else {
      this._emptyEl.classList.add('hidden');
    }
  }

  // ── Sort logic ──

  _applySortToGrid() {
    const cards = [...this._getCards()];

    cards.sort((a, b) => {
      switch (this._activeSort) {
        case 'title-asc':
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        case 'title-desc':
          return (b.dataset.title || '').localeCompare(a.dataset.title || '');
        case 'recent': {
          const aTime = parseFloat(a.dataset.lastPlayed || '0');
          const bTime = parseFloat(b.dataset.lastPlayed || '0');
          return bTime - aTime;
        }
        case 'progress': {
          const aPct = parseFloat(a.dataset.progress || '0');
          const bPct = parseFloat(b.dataset.progress || '0');
          return bPct - aPct;
        }
        case 'time-short': {
          const aMin = parseInt(a.dataset.readMins || '0');
          const bMin = parseInt(b.dataset.readMins || '0');
          return aMin - bMin;
        }
        case 'time-long': {
          const aMin = parseInt(a.dataset.readMins || '0');
          const bMin = parseInt(b.dataset.readMins || '0');
          return bMin - aMin;
        }
        case 'favorites': {
          const aFav = a.dataset.favorite === '1' ? 1 : 0;
          const bFav = b.dataset.favorite === '1' ? 1 : 0;
          if (bFav !== aFav) return bFav - aFav;
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        }
        default:
          return 0;
      }
    });

    // Reorder DOM elements via DocumentFragment (1 reflow instead of 30 appendChild calls)
    const frag = document.createDocumentFragment();
    for (const card of cards) frag.appendChild(card);
    this._grid.appendChild(frag);
  }
}
