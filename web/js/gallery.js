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

  /** Format slug to nice title */
  _slugToTitle(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
    overlay.innerHTML = `
      <div class="gallery-panel">
        <div class="gallery-header">
          <h2 class="gallery-title">🐱 Character Gallery</h2>
          <div class="gallery-count">${characters.length} characters across 30 stories</div>
          <button class="gallery-close" title="Close">✕</button>
        </div>
        <div class="gallery-filter-row">
          <input type="text" class="gallery-search" placeholder="🔍 Search characters..." autocomplete="off" />
          <button class="gallery-filter-btn active" data-role="all">All</button>
          <button class="gallery-filter-btn" data-role="protagonist">⭐ Heroes</button>
          <button class="gallery-filter-btn" data-role="npc">👥 NPCs</button>
        </div>
        <div class="gallery-grid"></div>
      </div>
    `;

    this._grid = overlay.querySelector('.gallery-grid');
    const search = overlay.querySelector('.gallery-search');
    const filterBtns = overlay.querySelectorAll('.gallery-filter-btn');
    const closeBtn = overlay.querySelector('.gallery-close');

    // Build character cards (batch via DocumentFragment — 1 reflow instead of per-card)
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
    }
    this._grid.appendChild(cardFrag);

    // Single delegated click — handles close button + backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.gallery-close')) this.hide();
    });

    // Cache card NodeList after all cards are built
    this._cachedCards = [...this._grid.querySelectorAll('.gallery-card')];

    // Search (debounced at 80ms for smooth typing performance)
    let _searchTimer = null;
    search.addEventListener('input', () => {
      if (_searchTimer) clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        const q = search.value.toLowerCase().trim();
        const activeRole = overlay.querySelector('.gallery-filter-btn.active')?.dataset.role || 'all';
        this._applyFilters(q, activeRole);
      }, 80);
    });

    // Role filter — single delegated listener on filter row
    const filterRow = overlay.querySelector('.gallery-filter-row');
    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-filter-btn');
      if (!btn) return;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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
    this._panelEl = overlay.querySelector('.gallery-panel');
    this._built = true;
  }

  _applyFilters(query, role) {
    const cards = this._cachedCards || [];
    cards.forEach(card => {
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
    });
  }

  /** Show the gallery */
  show() {
    this._buildOverlay();
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (typeof FocusTrap !== 'undefined') {
      if (!this._focusTrap) this._focusTrap = new FocusTrap(this._panelEl);
      this._focusTrap.activate();
    }
  }

  /** Hide the gallery */
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

  /** Set callback for when a story tag is clicked */
  onStoryClick(cb) {
    this.onStorySelect = cb;
  }
}
