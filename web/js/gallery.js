/**
 * NyanTales — Character Gallery
 * Browse all named characters with sprites, descriptions, and story links.
 */

class CharacterGallery {
  constructor(spriteGen, portraits) {
    this.spriteGen = spriteGen;
    this.portraits = portraits || null;
    this.overlay = null;
    this._built = false;
  }

  /** Build the gallery data from CHARACTER_DATA + characters list */
  _buildCharacterList() {
    const charMap = new Map(); // name -> merged info

    if (typeof CHARACTER_DATA === 'undefined') return [];
    for (const [slug, chars] of Object.entries(CHARACTER_DATA)) {
      for (const ch of chars) {
        const key = ch.name.toLowerCase();
        if (charMap.has(key)) {
          const existing = charMap.get(key);
          if (!existing.stories.includes(slug)) existing.stories.push(slug);
        } else {
          charMap.set(key, {
            name: ch.name,
            appearance: ch.appearance || '',
            role: ch.role || 'npc',
            stories: [slug],
            personality: ''
          });
        }
      }
    }

    // Sort: protagonists first, then alphabetical
    const all = [...charMap.values()];
    all.sort((a, b) => {
      if (a.role === 'protagonist' && b.role !== 'protagonist') return -1;
      if (b.role === 'protagonist' && a.role !== 'protagonist') return 1;
      return a.name.localeCompare(b.name);
    });

    return all;
  }

  /** Format slug to nice title (cached — called per story tag per character) */
  static _titleCache = new Map();
  _slugToTitle(slug) {
    let t = CharacterGallery._titleCache.get(slug);
    if (!t) {
      t = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      CharacterGallery._titleCache.set(slug, t);
    }
    return t;
  }

  /** Create the gallery overlay DOM */
  _buildOverlay() {
    if (this._built) return;

    const characters = this._buildCharacterList();

    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Character Gallery');
    overlay.setAttribute('aria-hidden', 'true');
    const panelEl = document.createElement('div');
    panelEl.className = 'gallery-panel';

    const headerEl = document.createElement('div');
    headerEl.className = 'gallery-header';
    const titleH2 = document.createElement('h2');
    titleH2.className = 'gallery-title';
    titleH2.textContent = '🐱 Character Gallery';
    headerEl.appendChild(titleH2);
    const countDiv = document.createElement('div');
    countDiv.className = 'gallery-count';
    countDiv.textContent = characters.length + ' characters across 30 stories';
    headerEl.appendChild(countDiv);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'gallery-close';
    closeBtn.title = 'Close';
    closeBtn.textContent = '✕';
    headerEl.appendChild(closeBtn);
    panelEl.appendChild(headerEl);

    const filterRow = document.createElement('div');
    filterRow.className = 'gallery-filter-row';
    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'gallery-search';
    search.placeholder = '🔍 Search characters...';
    search.autocomplete = 'off';
    filterRow.appendChild(search);
    const filterData = [['all', 'All'], ['protagonist', '⭐ Heroes'], ['npc', '👥 NPCs']];
    const filterBtns = [];
    let _activeRoleBtn = null;
    for (const [role, label] of filterData) {
      const btn = document.createElement('button');
      btn.className = 'gallery-filter-btn' + (role === 'all' ? ' active' : '');
      btn.dataset.role = role;
      btn.textContent = label;
      filterRow.appendChild(btn);
      filterBtns.push(btn);
      if (role === 'all') _activeRoleBtn = btn;
    }
    panelEl.appendChild(filterRow);

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    panelEl.appendChild(grid);

    overlay.appendChild(panelEl);

    this._grid = grid;

    // Build character cards (batch via DocumentFragment — 1 reflow instead of per-card)
    // Cache refs inline to avoid querySelectorAll after build
    this._cachedCards = [];
    const cardFrag = document.createDocumentFragment();
    for (const ch of characters) {
      const hasAI = this.portraits && this.portraits.hasPortrait(ch.name);
      const portrait = hasAI
        ? this.portraits.getPortrait(ch.name, ch.appearance)
        : this.spriteGen.generatePortrait(ch.name, ch.appearance, ch.personality);
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.dataset.name = ch.name.toLowerCase();
      card.dataset.role = ch.role;
      card.dataset.appearance = ch.appearance.toLowerCase();

      // Portrait section
      const portraitDiv = document.createElement('div');
      portraitDiv.className = 'gallery-card-portrait';
      const img = document.createElement('img');
      img.src = portrait;
      img.alt = ch.name;
      img.className = hasAI ? 'gallery-sprite ai-portrait' : 'gallery-sprite';
      portraitDiv.appendChild(img);
      card.appendChild(portraitDiv);

      // Info section
      const info = document.createElement('div');
      info.className = 'gallery-card-info';

      const header = document.createElement('div');
      header.className = 'gallery-card-header';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'gallery-card-name';
      nameSpan.textContent = ch.name;
      header.appendChild(nameSpan);
      const roleBadge = document.createElement('span');
      roleBadge.className = ch.role === 'protagonist'
        ? 'gallery-role-badge protagonist'
        : 'gallery-role-badge npc';
      roleBadge.textContent = ch.role === 'protagonist' ? '⭐ Hero' : 'NPC';
      header.appendChild(roleBadge);
      info.appendChild(header);

      const appDiv = document.createElement('div');
      appDiv.className = 'gallery-card-appearance';
      appDiv.textContent = ch.appearance;
      info.appendChild(appDiv);

      const storiesDiv = document.createElement('div');
      storiesDiv.className = 'gallery-card-stories';
      for (const s of ch.stories) {
        const tag = document.createElement('span');
        tag.className = 'gallery-story-tag';
        tag.dataset.slug = s;
        tag.textContent = this._slugToTitle(s);
        storiesDiv.appendChild(tag);
      }
      info.appendChild(storiesDiv);
      card.appendChild(info);

      cardFrag.appendChild(card);
      this._cachedCards.push(card);
    }
    this._grid.appendChild(cardFrag);

    // Single delegated click — handles close button + backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.gallery-close')) this.hide();
    });

    // Search (debounced at 80ms for smooth typing performance)
    let _searchTimer = null;
    search.addEventListener('input', () => {
      if (_searchTimer) clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        const q = search.value.toLowerCase().trim();
        this._applyFilters(q, _activeRoleBtn?.dataset.role || 'all');
      }, 80);
    });

    // Role filter — single delegated listener on filter row
    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-filter-btn');
      if (!btn) return;
      for (const b of filterBtns) b.classList.remove('active');
      btn.classList.add('active');
      _activeRoleBtn = btn;
      const q = search.value.toLowerCase().trim();
      this._applyFilters(q, btn.dataset.role);
    });

    // Story tag click → launch story
    this._grid.addEventListener('click', (e) => {
      const tag = e.target.closest('.gallery-story-tag');
      if (tag && this.onStorySelect) {
        this.hide();
        this.onStorySelect(tag.dataset.slug);
      }
    });

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this._panelEl = panelEl;
    this._built = true;
  }

  _applyFilters(query, role) {
    const cards = this._cachedCards || [];
    for (const card of cards) {
      let show = true;
      if (query) {
        const name = card.dataset.name || '';
        const app = card.dataset.appearance || '';
        if (!name.includes(query) && !app.includes(query)) show = false;
      }
      if (show && role !== 'all') {
        if (card.dataset.role !== role) show = false;
      }
      card.classList.toggle('hidden-by-filter', !show);
    }
  }

  /** Show the gallery */
  show() {
    this._buildOverlay();
    this._focusTrapTarget = this._panelEl;
    OverlayMixin.show(this);
  }

  /** Hide the gallery */
  hide() {
    OverlayMixin.hide(this);
  }

  get isVisible() {
    return OverlayMixin.isVisible(this);
  }

}
