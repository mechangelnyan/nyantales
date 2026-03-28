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
    this._focusTrap = null;
    /** Cached most-recent-save result (invalidated on save/delete/migrate) */
    this._recentCache = undefined;
  }

  // ── Data Access ──

  /** Get all save slots for a story */
  getSlots(slug) {
    if (typeof SafeStorage !== 'undefined') {
      return SafeStorage.getJSON(this.STORAGE_PREFIX + slug, {});
    }
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

    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setJSON(this.STORAGE_PREFIX + slug, slots);
    } else {
      try { localStorage.setItem(this.STORAGE_PREFIX + slug, JSON.stringify(slots)); } catch { /* storage full */ }
    }

    this._recentCache = undefined; // invalidate
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
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setJSON(this.STORAGE_PREFIX + slug, slots);
    } else {
      try { localStorage.setItem(this.STORAGE_PREFIX + slug, JSON.stringify(slots)); } catch { /* noop */ }
    }
    this._recentCache = undefined; // invalidate
  }

  /** Check if any save exists for a story */
  hasSave(slug) {
    const slots = this.getSlots(slug);
    return Object.keys(slots).length > 0;
  }

  /**
   * Get the most recent save across ALL stories (for "Continue" button).
   * Result is cached and invalidated on save/delete/migrate to avoid
   * scanning all localStorage keys on every title screen render.
   */
  getMostRecentSave() {
    if (this._recentCache !== undefined) return this._recentCache;

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

    this._recentCache = best ? { slug: bestSlug, ...best } : null;
    return this._recentCache;
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
        this._recentCache = undefined; // invalidate
      }
    } catch { /* migration is best-effort */ }
  }

  // ── UI Panel ──

  /** Build the save/load overlay (lazy) */
  _buildOverlay() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'save-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Save and Load');
    this.overlay.setAttribute('aria-hidden', 'true');
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

    // Close + mode toggle — single delegated listener on overlay
    this._modeBtns = this.overlay.querySelectorAll('.save-mode-btn');
    this.overlay.addEventListener('click', (e) => {
      // Backdrop or close button
      if (e.target === this.overlay || e.target.closest('.save-panel-close')) {
        this.hide();
        return;
      }
      // Mode toggle (save/load)
      const modeBtn = e.target.closest('.save-mode-btn');
      if (modeBtn) {
        this._modeBtns.forEach(b => b.classList.remove('active'));
        modeBtn.classList.add('active');
        this._currentMode = modeBtn.dataset.mode;
        this._renderSlots();
      }
    });

    // Event delegation on save-slots container (one listener handles all slot actions)
    this._slotsEl = this.overlay.querySelector('.save-slots');
    this._slotsEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const slotName = btn.dataset.slot;
      const action = btn.dataset.action;

      if (action === 'save') {
        if (this._currentEngine && this._currentSlug) {
          const scene = this._currentEngine.getCurrentScene();
          this.save(this._currentSlug, slotName, this._currentEngine, scene);
          // Re-render updates slot preview; show feedback via toast (btn is replaced by re-render)
          this._renderSlots();
          if (typeof Toast !== 'undefined') Toast.show('Saved!', { icon: '💾', duration: 1000 });
        }
      } else if (action === 'load') {
        const slots = this.getSlots(this._currentSlug);
        const slot = slots[slotName];
        if (slot && this.onLoad) {
          this.hide();
          this.onLoad(this._currentSlug, slot.state);
        }
      } else if (action === 'delete') {
        const confirmed = await ConfirmDialog.show({
          title: 'Delete Save?',
          message: `This will permanently delete ${slotName === 'auto' ? 'the auto-save' : slotName.replace('slot', 'Slot ')}.`,
          confirmText: '🗑 Delete',
          cancelText: 'Keep',
          danger: true
        });
        if (confirmed) {
          this.deleteSlot(this._currentSlug, slotName);
          this._renderSlots();
        }
      }
    });

    this._built = true;
  }

  /** Render slot cards for current story + mode */
  _renderSlots() {
    if (!this.overlay || !this._currentSlug) return;
    const slotsEl = this._slotsEl;
    const slots = this.getSlots(this._currentSlug);
    const mode = this._currentMode || 'save';

    const slotLabels = {
      auto: '🔄 Auto Save',
      slot1: '1️⃣ Slot 1',
      slot2: '2️⃣ Slot 2',
      slot3: '3️⃣ Slot 3'
    };

    slotsEl.textContent = '';
    const frag = document.createDocumentFragment();

    for (const name of this.SLOT_NAMES) {
      const slot = slots[name];
      const isAuto = name === 'auto';
      const label = slotLabels[name];
      const card = document.createElement('div');
      card.className = slot ? 'save-slot filled' : 'save-slot empty';
      card.dataset.slot = name;

      // Header
      const header = document.createElement('div');
      header.className = 'save-slot-header';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'save-slot-label';
      labelSpan.textContent = label;
      header.appendChild(labelSpan);

      if (slot) {
        const date = new Date(slot.timestamp);
        const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
          ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const timeSpan = document.createElement('span');
        timeSpan.className = 'save-slot-time';
        timeSpan.textContent = timeStr;
        header.appendChild(timeSpan);
        card.appendChild(header);

        const preview = document.createElement('div');
        preview.className = 'save-slot-preview';
        preview.textContent = slot.sceneTextPreview || slot.sceneId || '...';
        card.appendChild(preview);

        const meta = document.createElement('div');
        meta.className = 'save-slot-meta';
        if (slot.sceneSpeaker) {
          const sp = document.createElement('span');
          sp.textContent = '🗣 ' + slot.sceneSpeaker;
          meta.appendChild(sp);
        }
        const turnSpan = document.createElement('span');
        turnSpan.textContent = '📍 ' + slot.turns + ' turns';
        meta.appendChild(turnSpan);
        const visitSpan = document.createElement('span');
        visitSpan.textContent = '👁 ' + (slot.visitedCount || '?') + ' scenes';
        meta.appendChild(visitSpan);
        card.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'save-slot-actions';
        if (mode === 'save' && !isAuto) {
          actions.appendChild(this._makeSlotBtn('💾 Save', 'save-action', name, 'save'));
        }
        if (mode === 'load') {
          actions.appendChild(this._makeSlotBtn('📂 Load', 'load-action', name, 'load'));
        }
        if (!isAuto) {
          actions.appendChild(this._makeSlotBtn('🗑', 'delete-action', name, 'delete'));
        }
        card.appendChild(actions);
      } else {
        card.appendChild(header);
        const empty = document.createElement('div');
        empty.className = 'save-slot-empty-msg';
        empty.textContent = '— Empty —';
        card.appendChild(empty);
        if (mode === 'save' && !isAuto) {
          const actions = document.createElement('div');
          actions.className = 'save-slot-actions';
          actions.appendChild(this._makeSlotBtn('💾 Save', 'save-action', name, 'save'));
          card.appendChild(actions);
        }
      }

      frag.appendChild(card);
    }
    slotsEl.appendChild(frag);
  }

  /** Helper: create a slot action button */
  _makeSlotBtn(text, cls, slotName, action) {
    const btn = document.createElement('button');
    btn.className = 'save-slot-btn ' + cls;
    btn.dataset.slot = slotName;
    btn.dataset.action = action;
    btn.textContent = text;
    return btn;
  }

  /** Show the save/load panel for a story */
  show(slug, engine, mode = 'save') {
    this._buildOverlay();
    this._currentSlug = slug;
    this._currentEngine = engine;
    this._currentMode = mode;

    // Set active mode button
    this._modeBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    this._renderSlots();
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._panelEl) this._panelEl = this.overlay.querySelector('.save-panel');
    if (!this._focusTrap) this._focusTrap = new FocusTrap(this._panelEl);
    this._focusTrap.activate();
  }

  /** Hide the panel */
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
