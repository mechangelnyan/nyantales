/**
 * NyanTales — Save Slot Manager
 * Provides multiple save slots per story (3 manual + 1 auto), with timestamps
 * and preview info for a save/load UI panel.
 *
 * Storage key format: nyantales-saves-{slug} → { slots: { auto, slot1, slot2, slot3 } }
 *
 * Each slot: { state: <engine JSON>, sceneId, sceneSpeaker, sceneTextPreview, timestamp, turns }
 * or null if empty.
 */

class SaveManager {
  constructor() {
    this.STORAGE_PREFIX = 'nyantales-saves-';
    this.SLOT_NAMES = ['auto', 'slot1', 'slot2', 'slot3'];
    this.overlay = null;
    this._built = false;

    // Callbacks set by main.js
    this.onLoad = null; // (slug, stateJson) => void
  }

  // ── Data Access ──

  /** Get all save slots for a story */
  getSlots(slug) {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + slug);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  /** Save to a specific slot */
  save(slug, slotName, engine, scene) {
    const slots = this.getSlots(slug);
    const textPreview = (scene?.text || '').slice(0, 80).replace(/\n/g, ' ');

    slots[slotName] = {
      state: engine.saveState(),
      sceneId: engine.state.currentScene,
      sceneSpeaker: scene?.speaker || null,
      sceneTextPreview: textPreview,
      timestamp: Date.now(),
      turns: engine.state.turns,
      visitedCount: engine.state.visited.size
    };

    try {
      localStorage.setItem(this.STORAGE_PREFIX + slug, JSON.stringify(slots));
    } catch { /* storage full */ }

    return slots[slotName];
  }

  /** Auto-save (called after each scene transition) */
  autoSave(slug, engine, scene) {
    return this.save(slug, 'auto', engine, scene);
  }

  /** Delete a slot */
  deleteSlot(slug, slotName) {
    const slots = this.getSlots(slug);
    delete slots[slotName];
    try {
      localStorage.setItem(this.STORAGE_PREFIX + slug, JSON.stringify(slots));
    } catch { /* noop */ }
  }

  /** Check if any save exists for a story */
  hasSave(slug) {
    const slots = this.getSlots(slug);
    return Object.keys(slots).length > 0;
  }

  /** Get the most recent save across ALL stories (for "Continue" button) */
  getMostRecentSave() {
    let best = null;
    let bestSlug = null;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.STORAGE_PREFIX)) continue;
        const slug = key.slice(this.STORAGE_PREFIX.length);
        const slots = JSON.parse(localStorage.getItem(key));

        for (const [name, slot] of Object.entries(slots)) {
          if (slot && slot.timestamp && (!best || slot.timestamp > best.timestamp)) {
            best = slot;
            bestSlug = slug;
          }
        }
      }
    } catch { /* noop */ }

    return best ? { slug: bestSlug, ...best } : null;
  }

  /** Migrate legacy saves (nyantales-save-{slug} format) to slot system */
  migrateLegacy() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('nyantales-save-')) continue;
        const slug = key.slice('nyantales-save-'.length);
        // Skip if already migrated
        if (localStorage.getItem(this.STORAGE_PREFIX + slug)) continue;

        const stateJson = localStorage.getItem(key);
        if (!stateJson) continue;

        const state = JSON.parse(stateJson);
        const slots = {
          auto: {
            state: stateJson,
            sceneId: state.currentScene || '?',
            sceneSpeaker: null,
            sceneTextPreview: `Migrated save · ${state.turns || 0} turns`,
            timestamp: Date.now(),
            turns: state.turns || 0,
            visitedCount: state.visited?.length || 0
          }
        };

        localStorage.setItem(this.STORAGE_PREFIX + slug, JSON.stringify(slots));
        localStorage.removeItem(key); // Clean up old format
      }
    } catch { /* migration is best-effort */ }
  }

  // ── UI Panel ──

  /** Build the save/load overlay (lazy) */
  _buildOverlay() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'save-overlay';
    this.overlay.innerHTML = `
      <div class="save-panel">
        <div class="save-panel-header">
          <div class="save-panel-title">💾 Save / Load</div>
          <button class="save-panel-close">✕</button>
        </div>
        <div class="save-panel-mode">
          <button class="save-mode-btn active" data-mode="save">Save</button>
          <button class="save-mode-btn" data-mode="load">Load</button>
        </div>
        <div class="save-slots"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.overlay.querySelector('.save-panel-close').addEventListener('click', () => this.hide());

    // Mode toggle
    const modeBtns = this.overlay.querySelectorAll('.save-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._currentMode = btn.dataset.mode;
        this._renderSlots();
      });
    });

    this._built = true;
  }

  /** Render slot cards for current story + mode */
  _renderSlots() {
    if (!this.overlay || !this._currentSlug) return;
    const slotsEl = this.overlay.querySelector('.save-slots');
    const slots = this.getSlots(this._currentSlug);
    const mode = this._currentMode || 'save';

    const slotLabels = {
      auto: '🔄 Auto Save',
      slot1: '1️⃣ Slot 1',
      slot2: '2️⃣ Slot 2',
      slot3: '3️⃣ Slot 3'
    };

    slotsEl.innerHTML = this.SLOT_NAMES.map(name => {
      const slot = slots[name];
      const isAuto = name === 'auto';
      const label = slotLabels[name];

      if (slot) {
        const date = new Date(slot.timestamp);
        const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
          ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const preview = slot.sceneTextPreview || slot.sceneId || '...';

        return `
          <div class="save-slot filled" data-slot="${name}">
            <div class="save-slot-header">
              <span class="save-slot-label">${label}</span>
              <span class="save-slot-time">${timeStr}</span>
            </div>
            <div class="save-slot-preview">${this._esc(preview)}</div>
            <div class="save-slot-meta">
              ${slot.sceneSpeaker ? `<span>🗣 ${this._esc(slot.sceneSpeaker)}</span>` : ''}
              <span>📍 ${slot.turns} turns</span>
              <span>👁 ${slot.visitedCount || '?'} scenes</span>
            </div>
            <div class="save-slot-actions">
              ${mode === 'save' && !isAuto
                ? `<button class="save-slot-btn save-action" data-slot="${name}">💾 Save</button>`
                : ''}
              ${mode === 'load'
                ? `<button class="save-slot-btn load-action" data-slot="${name}">📂 Load</button>`
                : ''}
              ${!isAuto
                ? `<button class="save-slot-btn delete-action" data-slot="${name}">🗑</button>`
                : ''}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="save-slot empty" data-slot="${name}">
            <div class="save-slot-header">
              <span class="save-slot-label">${label}</span>
            </div>
            <div class="save-slot-empty-msg">— Empty —</div>
            ${mode === 'save' && !isAuto
              ? `<div class="save-slot-actions"><button class="save-slot-btn save-action" data-slot="${name}">💾 Save</button></div>`
              : ''}
          </div>
        `;
      }
    }).join('');

    // Wire actions
    slotsEl.querySelectorAll('.save-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = btn.dataset.slot;
        if (this._currentEngine && this._currentSlug) {
          const scene = this._currentEngine.getCurrentScene();
          this.save(this._currentSlug, slotName, this._currentEngine, scene);
          this._renderSlots();
          // Flash feedback
          btn.textContent = '✅ Saved!';
          setTimeout(() => { btn.textContent = '💾 Save'; }, 800);
        }
      });
    });

    slotsEl.querySelectorAll('.load-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = btn.dataset.slot;
        const slot = slots[slotName];
        if (slot && this.onLoad) {
          this.hide();
          this.onLoad(this._currentSlug, slot.state);
        }
      });
    });

    slotsEl.querySelectorAll('.delete-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotName = btn.dataset.slot;
        this.deleteSlot(this._currentSlug, slotName);
        this._renderSlots();
      });
    });
  }

  /** Show the save/load panel for a story */
  show(slug, engine, mode = 'save') {
    this._buildOverlay();
    this._currentSlug = slug;
    this._currentEngine = engine;
    this._currentMode = mode;

    // Set active mode button
    const modeBtns = this.overlay.querySelectorAll('.save-mode-btn');
    modeBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    this._renderSlots();
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
  }

  /** Hide the panel */
  hide() {
    if (this.overlay) this.overlay.classList.remove('visible');
  }

  get isVisible() {
    return this.overlay?.classList.contains('visible') || false;
  }

  _esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
