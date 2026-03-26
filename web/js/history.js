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
    this.overlay.innerHTML = `
      <div class="history-panel">
        <div class="history-header">
          <div>
            <div class="history-title">📜 Text History</div>
            <div class="history-count"></div>
          </div>
          <div class="history-header-actions">
            <button class="history-export-btn" title="Export as text file">📥 Export</button>
            <button class="history-close">✕</button>
          </div>
        </div>
        <div class="history-search-wrap">
          <input type="text" class="history-search" placeholder="🔍 Search dialogue..." autocomplete="off" aria-label="Search text history" />
        </div>
        <div class="history-list"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.overlay.querySelector('.history-close').addEventListener('click', () => this.hide());
    this.overlay.querySelector('.history-export-btn').addEventListener('click', () => this._exportHistory());

    // Search filtering
    this._searchInput = this.overlay.querySelector('.history-search');
    this._searchInput.addEventListener('input', () => this._filterEntries());
  }

  show() {
    const entries = this.history.getAll();
    const listEl = this.overlay.querySelector('.history-list');
    const countEl = this.overlay.querySelector('.history-count');
    countEl.textContent = `${entries.length} entries`;

    // Clear search
    this._searchInput.value = '';

    if (entries.length === 0) {
      listEl.innerHTML = '<div class="history-empty">No text yet — start reading!</div>';
    } else {
      listEl.innerHTML = entries.map(e => {
        const searchable = ((e.speaker || '') + ' ' + e.text).toLowerCase();
        return `
          <div class="history-entry" data-searchable="${this._esc(searchable)}">
            ${e.speaker ? `<div class="history-speaker">${this._esc(e.speaker)}</div>` : ''}
            <div class="history-text">${this._esc(e.text)}</div>
          </div>
        `;
      }).join('');
      // Scroll to bottom
      requestAnimationFrame(() => { listEl.scrollTop = listEl.scrollHeight; });
    }

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) this._focusTrap = new FocusTrap(this.overlay.querySelector('.history-panel'));
    this._focusTrap.activate();

    // Attach keyboard scroll handler
    if (!this._keyHandler) {
      this._keyHandler = (e) => this._onKeydown(e);
    }
    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Handle keyboard scrolling in the history panel.
   * Page Up/Down scroll the list by a large step, Arrow Up/Down by a small step.
   * Home/End jump to top/bottom of the backlog.
   */
  _onKeydown(e) {
    if (!this.isVisible) return;
    const listEl = this.overlay.querySelector('.history-list');
    if (!listEl) return;

    const scrollStep = listEl.clientHeight * 0.8;  // ~80% of visible height
    const smallStep = 60;

    switch (e.key) {
      case 'PageUp':
        e.preventDefault();
        listEl.scrollBy({ top: -scrollStep, behavior: 'smooth' });
        break;
      case 'PageDown':
        e.preventDefault();
        listEl.scrollBy({ top: scrollStep, behavior: 'smooth' });
        break;
      case 'ArrowUp':
        if (document.activeElement === this._searchInput) return; // don't hijack search
        e.preventDefault();
        listEl.scrollBy({ top: -smallStep, behavior: 'smooth' });
        break;
      case 'ArrowDown':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        listEl.scrollBy({ top: smallStep, behavior: 'smooth' });
        break;
      case 'Home':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        listEl.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        if (document.activeElement === this._searchInput) return;
        e.preventDefault();
        listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
        break;
    }
  }

  /** Filter history entries by search query */
  _filterEntries() {
    const query = (this._searchInput.value || '').toLowerCase().trim();
    const entries = this.overlay.querySelectorAll('.history-entry');
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

    const countEl = this.overlay.querySelector('.history-count');
    const total = entries.length;
    countEl.textContent = query
      ? `${visible}/${total} matching`
      : `${total} entries`;
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this._focusTrap) this._focusTrap.deactivate();
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }

  get isVisible() {
    return this.overlay.classList.contains('visible');
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

  /** Reuses VNUI's shared escape element to avoid per-call allocations */
  _esc(text) {
    if (typeof VNUI !== 'undefined' && VNUI._escapeDiv) {
      VNUI._escapeDiv.textContent = text;
      return VNUI._escapeDiv.innerHTML;
    }
    if (!HistoryPanel._escDiv) HistoryPanel._escDiv = document.createElement('div');
    HistoryPanel._escDiv.textContent = text;
    return HistoryPanel._escDiv.innerHTML;
  }
}
