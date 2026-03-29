/**
 * NyanTales — Text History / Backlog
 * Records all dialogue/narration during a playthrough for review.
 *
 * @class TextHistory
 */

class TextHistory {
  constructor() {
    this.entries = [];    // { speaker, text, sceneId, timestamp }
    this.maxEntries = 500;
  }

  /** Add a dialogue/narration entry */
  add(sceneId, speaker, text) {
    if (!text || !text.trim()) return;
    this.entries.push({
      sceneId,
      speaker: speaker || null,
      text: text.trim(),
      timestamp: Date.now()
    });
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /** Clear history (on story restart/exit) */
  clear() {
    this.entries = [];
  }

  /** Get all entries */
  getAll() {
    return this.entries;
  }

  /** Get entry count */
  get length() {
    return this.entries.length;
  }
}

/**
 * History Panel UI — modal overlay showing backlog
 */
class HistoryPanel {
  constructor(history) {
    this.history = history;
    this.overlay = null;
    this._focusTrap = null;
    this._create();
  }

  _create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'history-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Text History');
    this.overlay.setAttribute('aria-hidden', 'true');
    const panel = document.createElement('div');
    panel.className = 'history-panel';

    const header = document.createElement('div');
    header.className = 'history-header';
    const headerLeft = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'history-title';
    titleDiv.textContent = '📜 Text History';
    headerLeft.appendChild(titleDiv);
    const countDiv = document.createElement('div');
    countDiv.className = 'history-count';
    headerLeft.appendChild(countDiv);
    header.appendChild(headerLeft);

    const headerActions = document.createElement('div');
    headerActions.className = 'history-header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'history-export-btn';
    exportBtn.title = 'Export as text file';
    exportBtn.textContent = '📥 Export';
    headerActions.appendChild(exportBtn);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'history-close';
    closeBtn.textContent = '✕';
    headerActions.appendChild(closeBtn);
    header.appendChild(headerActions);
    panel.appendChild(header);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'history-search-wrap';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'history-search';
    searchInput.placeholder = '🔍 Search dialogue...';
    searchInput.autocomplete = 'off';
    searchInput.setAttribute('aria-label', 'Search text history');
    searchWrap.appendChild(searchInput);
    panel.appendChild(searchWrap);

    const listDiv = document.createElement('div');
    listDiv.className = 'history-list';
    panel.appendChild(listDiv);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    // Cache frequently accessed child elements
    this._listEl = listDiv;
    this._countEl = countDiv;
    this._panelEl = panel;

    // Single delegated click — handles close button, backdrop, and export
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.history-close')) { this.hide(); return; }
      if (e.target.closest('.history-export-btn')) this._exportHistory();
    });

    // Search filtering
    this._searchInput = searchInput;
    this._searchInput.addEventListener('input', () => this._filterEntries());

    // Permanent keyboard scroll handler — only fires when panel is visible
    // (avoids per-show addEventListener/removeEventListener churn)
    document.addEventListener('keydown', (e) => this._onKeydown(e));
  }

  show() {
    const entries = this.history.getAll();
    this._countEl.textContent = `${entries.length} entries`;

    // Clear search
    this._searchInput.value = '';

    this._listEl.textContent = '';

    if (entries.length === 0) {
      if (!this._emptyEl) {
        this._emptyEl = document.createElement('div');
        this._emptyEl.className = 'history-empty';
        this._emptyEl.textContent = 'No text yet — start reading!';
      }
      this._listEl.appendChild(this._emptyEl);
      this._cachedEntries = [];
    } else {
      const frag = document.createDocumentFragment();
      const cached = [];
      for (const e of entries) {
        const el = document.createElement('div');
        el.className = 'history-entry';
        el.dataset.searchable = ((e.speaker || '') + ' ' + e.text).toLowerCase();
        if (e.speaker) {
          const spk = document.createElement('div');
          spk.className = 'history-speaker';
          spk.textContent = e.speaker;
          el.appendChild(spk);
        }
        const txt = document.createElement('div');
        txt.className = 'history-text';
        txt.textContent = e.text;
        el.appendChild(txt);
        frag.appendChild(el);
        cached.push(el);
      }
      this._listEl.appendChild(frag);
      this._cachedEntries = cached;
      // Scroll to bottom
      requestAnimationFrame(() => { this._listEl.scrollTop = this._listEl.scrollHeight; });
    }

    this._focusTrapTarget = this._panelEl;
    OverlayMixin.show(this);
  }

  /**
   * Handle keyboard scrolling in the history panel.
   * Page Up/Down scroll the list by a large step, Arrow Up/Down by a small step.
   * Home/End jump to top/bottom of the backlog.
   */
  _onKeydown(e) {
    if (!this.isVisible) return;
    if (!this._listEl) return;

    const scrollStep = this._listEl.clientHeight * 0.8;  // ~80% of visible height
    const smallStep = 60;

    switch (e.key) {
      case 'PageUp':
        e.preventDefault();
        this._listEl.scrollBy({ top: -scrollStep, behavior: 'smooth' });
        break;
      case 'PageDown':
        e.preventDefault();
        this._listEl.scrollBy({ top: scrollStep, behavior: 'smooth' });
        break;
      case 'ArrowUp':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        this._listEl.scrollBy({ top: -smallStep, behavior: 'smooth' });
        break;
      case 'ArrowDown':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        this._listEl.scrollBy({ top: smallStep, behavior: 'smooth' });
        break;
      case 'Home':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        this._listEl.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        this._listEl.scrollTo({ top: this._listEl.scrollHeight, behavior: 'smooth' });
        break;
    }
  }

  /** Filter history entries by search query */
  _filterEntries() {
    const query = (this._searchInput.value || '').toLowerCase().trim();
    const entries = this._cachedEntries || [];
    let visible = 0;

    entries.forEach(el => {
      if (!query) {
        el.classList.remove('hidden');
        visible++;
      } else {
        const text = el.dataset.searchable || '';
        const match = text.includes(query);
        el.classList.toggle('hidden', !match);
        if (match) visible++;
      }
    });

    const total = entries.length;
    this._countEl.textContent = query
      ? `${visible}/${total} matching`
      : `${total} entries`;
  }

  hide() {
    OverlayMixin.hide(this);
  }

  get isVisible() {
    return OverlayMixin.isVisible(this);
  }

  /** Export text history as a downloadable .txt file */
  _exportHistory() {
    const entries = this.history.getAll();
    if (entries.length === 0) return;

    const lines = entries.map(e => {
      const prefix = e.speaker ? `[${e.speaker}] ` : '';
      return `${prefix}${e.text}`;
    });

    const content = `NyanTales — Text History Export\n${'═'.repeat(40)}\nExported: ${new Date().toLocaleString()}\nEntries: ${entries.length}\n${'═'.repeat(40)}\n\n${lines.join('\n\n')}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyantales-history-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof Toast !== 'undefined') {
      Toast.show('History exported!', { icon: '📥', duration: 2000 });
    }
  }

}
