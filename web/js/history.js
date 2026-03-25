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
          <button class="history-close">✕</button>
        </div>
        <div class="history-list"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.overlay.querySelector('.history-close').addEventListener('click', () => this.hide());
  }

  show() {
    const entries = this.history.getAll();
    const listEl = this.overlay.querySelector('.history-list');
    const countEl = this.overlay.querySelector('.history-count');
    countEl.textContent = `${entries.length} entries`;

    if (entries.length === 0) {
      listEl.innerHTML = '<div class="history-empty">No text yet — start reading!</div>';
    } else {
      listEl.innerHTML = entries.map(e => `
        <div class="history-entry">
          ${e.speaker ? `<div class="history-speaker">${this._esc(e.speaker)}</div>` : ''}
          <div class="history-text">${this._esc(e.text)}</div>
        </div>
      `).join('');
      // Scroll to bottom
      requestAnimationFrame(() => { listEl.scrollTop = listEl.scrollHeight; });
    }

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) this._focusTrap = new FocusTrap(this.overlay.querySelector('.history-panel'));
    this._focusTrap.activate();
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this._focusTrap) this._focusTrap.deactivate();
  }

  get isVisible() {
    return this.overlay.classList.contains('visible');
  }

  _esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
