/**
 * NyanTales — Settings Panel UI
 * In-game settings overlay with sliders, toggles, and controls.
 */

class SettingsPanel {
  constructor(settings) {
    this.settings = settings;
    this.overlay = null;
    this._focusTrap = null;
    this._create();
  }

  _create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Settings');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <div class="settings-title">⚙️ Settings</div>
          <button class="settings-close">✕</button>
        </div>
        <div class="settings-body">

          <div class="settings-group">
            <div class="settings-group-title">📝 Text</div>

            <div class="settings-row">
              <label class="settings-label">Text Speed</label>
              <div class="settings-control">
                <input type="range" id="set-text-speed" min="2" max="40" step="2" class="settings-slider" />
                <span class="settings-value" id="set-text-speed-val"></span>
              </div>
            </div>
            <div class="settings-row">
              <div class="settings-text-preview" id="set-text-preview" aria-label="Text speed preview"></div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Auto-Play</label>
              <div class="settings-control">
                <button id="set-auto-play" class="settings-toggle"></button>
              </div>
            </div>

            <div class="settings-row" id="row-auto-delay">
              <label class="settings-label">Auto-Play Delay</label>
              <div class="settings-control">
                <input type="range" id="set-auto-delay" min="500" max="6000" step="250" class="settings-slider" />
                <span class="settings-value" id="set-auto-delay-val"></span>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Skip Read Scenes</label>
              <div class="settings-control">
                <button id="set-skip-read" class="settings-toggle"></button>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">🎨 Visual</div>

            <div class="settings-row">
              <label class="settings-label">Font Size</label>
              <div class="settings-control">
                <input type="range" id="set-font-size" min="80" max="140" step="5" class="settings-slider" />
                <span class="settings-value" id="set-font-size-val"></span>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Screen Effects</label>
              <div class="settings-control">
                <button id="set-screen-shake" class="settings-toggle"></button>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Particles</label>
              <div class="settings-control">
                <button id="set-particles" class="settings-toggle"></button>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Fullscreen</label>
              <div class="settings-control">
                <button id="set-fullscreen" class="settings-toggle"></button>
              </div>
            </div>

            <div class="settings-row">
              <label class="settings-label">Color Theme</label>
              <div class="settings-control theme-swatches" id="set-color-theme" role="group" aria-label="Color theme">
                <button class="theme-swatch theme-swatch-cyan" data-theme="cyan" title="Cyan (default)" aria-label="Use cyan color theme"></button>
                <button class="theme-swatch theme-swatch-magenta" data-theme="magenta" title="Magenta" aria-label="Use magenta color theme"></button>
                <button class="theme-swatch theme-swatch-green" data-theme="green" title="Green" aria-label="Use green color theme"></button>
                <button class="theme-swatch theme-swatch-amber" data-theme="amber" title="Amber" aria-label="Use amber color theme"></button>
                <button class="theme-swatch theme-swatch-violet" data-theme="violet" title="Violet" aria-label="Use violet color theme"></button>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">🔊 Audio</div>

            <div class="settings-row">
              <label class="settings-label">Volume</label>
              <div class="settings-control">
                <input type="range" id="set-volume" min="0" max="100" step="5" class="settings-slider" />
                <span class="settings-value" id="set-volume-val"></span>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">💾 Data</div>
            <div class="settings-row">
              <label class="settings-label">Backup / Restore</label>
              <div class="settings-control settings-data-btns">
                <button id="set-export" class="settings-toggle on settings-data-btn">📤 Export</button>
                <button id="set-import" class="settings-toggle settings-data-btn">📥 Import</button>
                <input type="file" id="set-import-file" accept=".json" class="hidden" />
              </div>
            </div>
            <div class="settings-row">
              <label class="settings-label">Campaign</label>
              <div class="settings-control settings-data-btns">
                <button id="set-campaign-reset" class="settings-toggle settings-data-btn settings-data-btn-warn">📖 Reset Campaign</button>
              </div>
            </div>
            <div id="set-data-stats" class="settings-data-stats"></div>
          </div>

          <div class="settings-footer">
            <button id="set-reset" class="settings-reset-btn">↺ Reset Defaults</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Single delegated click — handles close button + backdrop
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.settings-close')) this.hide();
    });

    // Cache DOM refs used repeatedly (avoids getElementById on every show/sync/action)
    this._previewTimer = null;
    /** Tracked feedback timers for button text reset (cleared on hide to prevent orphan writes) */
    this._feedbackTimers = [];
    this._els = {
      textSpeed:    document.getElementById('set-text-speed'),
      textSpeedVal: document.getElementById('set-text-speed-val'),
      preview:      document.getElementById('set-text-preview'),
      autoDelay:    document.getElementById('set-auto-delay'),
      autoDelayVal: document.getElementById('set-auto-delay-val'),
      autoDelayRow: document.getElementById('row-auto-delay'),
      fontSize:     document.getElementById('set-font-size'),
      fontSizeVal:  document.getElementById('set-font-size-val'),
      volume:       document.getElementById('set-volume'),
      volumeVal:    document.getElementById('set-volume-val'),
      exportBtn:    document.getElementById('set-export'),
      importBtn:    document.getElementById('set-import'),
      importFile:   document.getElementById('set-import-file'),
      dataStats:    document.getElementById('set-data-stats'),
      themeContainer: document.getElementById('set-color-theme')
    };

    // Cache theme swatch elements (avoids querySelectorAll on every theme change / sync)
    this._swatches = this._els.themeContainer
      ? Array.from(this._els.themeContainer.querySelectorAll('.theme-swatch'))
      : [];

    // Cache toggle button refs (avoids getElementById on every _syncAll)
    this._toggleBtns = {
      'set-auto-play': document.getElementById('set-auto-play'),
      'set-skip-read': document.getElementById('set-skip-read'),
      'set-screen-shake': document.getElementById('set-screen-shake'),
      'set-particles': document.getElementById('set-particles'),
      'set-fullscreen': document.getElementById('set-fullscreen')
    };

    // Wire up controls
    this._wireSlider('set-text-speed', 'textSpeed', v => {
      this._runPreview(parseInt(v));
      return SettingsPanel._speedLabel(v);
    });

    this._wireToggle('set-auto-play', 'autoPlay', (val) => {
      this._els.autoDelayRow.classList.toggle('hidden', !val);
    });

    this._wireSlider('set-auto-delay', 'autoPlayDelay', v => `${(v / 1000).toFixed(1)}s`);
    this._wireToggle('set-skip-read', 'skipRead');
    this._wireSlider('set-font-size', 'fontSize', v => `${v}%`);
    this._wireToggle('set-screen-shake', 'screenShake');
    this._wireToggle('set-particles', 'particles');

    // Fullscreen toggle — uses settings key so F key and panel stay in sync
    this._wireToggle('set-fullscreen', 'fullscreen');

    this._wireSlider('set-volume', 'audioVolume', v => `${v}%`, {
      toSetting: v => v / 100,
      fromSetting: v => Math.round(v * 100)
    });

    // Color theme swatches — single delegated listener (replaces 5 per-swatch listeners)
    this._wireColorTheme();

    // Data section — single delegated listener on settings body for export/import/reset
    this._dataManager = new DataManager();
    this.overlay.querySelector('.settings-body').addEventListener('click', (e) => {
      const target = e.target;
      if (target === this._els.exportBtn || target.closest('#set-export')) {
        this._handleExport();
      } else if (target === this._els.importBtn || target.closest('#set-import')) {
        this._els.importFile.click();
      } else if (target.closest('#set-campaign-reset')) {
        this._handleCampaignReset();
      } else if (target.closest('#set-reset')) {
        this._handleReset();
      }
    });

    this._els.importFile.addEventListener('change', (e) => this._handleImport(e));
  }

  /** Pre-sorted speed breakpoints for O(1)-ish label lookup (avoids Object.keys+reduce per call). */
  static _SPEED_BREAKS = [
    [4,  'Instant'],   // 2–4
    [9,  'Very Fast'], // 5–9
    [15, 'Fast'],      // 10–15
    [22, 'Normal'],    // 16–22
    [30, 'Slow'],      // 23–30
    [37, 'Very Slow'], // 31–37
    [Infinity, 'Crawl'] // 38+
  ];

  /** Map speed value to human-readable label. Shared by _wireSlider + _syncAll. */
  static _speedLabel(v) {
    for (const [threshold, label] of SettingsPanel._SPEED_BREAKS) {
      if (v <= threshold) return label;
    }
    return `${v}ms`;
  }

  /** Schedule a feedback timer (auto-cleared on panel hide). */
  _feedbackTimer(fn, ms) {
    const id = setTimeout(() => {
      fn();
      const idx = this._feedbackTimers.indexOf(id);
      if (idx !== -1) this._feedbackTimers.splice(idx, 1);
    }, ms);
    this._feedbackTimers.push(id);
  }

  async _handleExport() {
    this._dataManager.downloadExport();
    this._els.exportBtn.textContent = '✅ Done!';
    this._feedbackTimer(() => { this._els.exportBtn.textContent = '📤 Export'; }, 1500);
  }

  async _handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const confirmed = await ConfirmDialog.show({
      title: 'Import Data?',
      message: `Import from "${file.name}"? This will merge with your existing data and may overwrite current saves.`,
      confirmText: '📥 Import',
      cancelText: 'Cancel',
      danger: false
    });
    if (!confirmed) { e.target.value = ''; return; }
    try {
      const result = await this._dataManager.importFromFile(file);
      this._els.importBtn.textContent = `✅ ${result.imported} items`;
      this._feedbackTimer(() => { this._els.importBtn.textContent = '📥 Import'; }, 2000);
      this._updateDataStats();
    } catch (err) {
      this._els.importBtn.textContent = '❌ Error';
      this._feedbackTimer(() => { this._els.importBtn.textContent = '📥 Import'; }, 2000);
      console.warn('Import failed:', err);
    }
    e.target.value = '';
  }

  async _handleCampaignReset() {
    const confirmed = await ConfirmDialog.show({
      title: 'Reset Campaign Progress?',
      message: 'This will erase all campaign progress. Your individual story saves and achievements are not affected.',
      confirmText: '📖 Reset Campaign',
      cancelText: 'Cancel',
      danger: true
    });
    if (confirmed) {
      SafeStorage.setJSON('nyantales-campaign', null);
      localStorage.removeItem('nyantales-campaign');
      Toast.show('Campaign progress reset', { icon: '📖' });
    }
  }

  async _handleReset() {
    const confirmed = await ConfirmDialog.show({
      title: 'Reset All Settings?',
      message: 'This will restore all settings to their default values.',
      confirmText: '↺ Reset',
      cancelText: 'Cancel',
      danger: true
    });
    if (confirmed) {
      this.settings.reset();
      this._syncAll();
    }
  }

  _wireSlider(id, key, formatter, transform) {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + '-val');
    const fromSetting = transform?.fromSetting || (v => v);
    const toSetting = transform?.toSetting || (v => parseInt(v));

    el.value = fromSetting(this.settings.get(key));
    valEl.textContent = formatter(parseInt(el.value));

    el.addEventListener('input', () => {
      valEl.textContent = formatter(parseInt(el.value));
      this.settings.set(key, toSetting(el.value));
    });
  }

  _wireToggle(id, key, onChange) {
    const btn = document.getElementById(id);
    const val = this.settings.get(key);
    btn.textContent = val ? 'ON' : 'OFF';
    btn.classList.toggle('on', val);

    btn.addEventListener('click', () => {
      const newVal = !this.settings.get(key);
      this.settings.set(key, newVal);
      btn.textContent = newVal ? 'ON' : 'OFF';
      btn.classList.toggle('on', newVal);
      if (onChange) onChange(newVal);
    });
  }

  /** Wire color theme swatch buttons — single delegated listener on container */
  _wireColorTheme() {
    const container = this._els.themeContainer;
    const currentTheme = this.settings.get('colorTheme');

    this._swatches.forEach(btn => {
      const isActive = btn.dataset.theme === currentTheme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    container.addEventListener('click', (e) => {
      const swatch = e.target.closest('.theme-swatch');
      if (!swatch) return;
      this._swatches.forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-pressed', 'false');
      });
      swatch.classList.add('active');
      swatch.setAttribute('aria-pressed', 'true');
      this.settings.set('colorTheme', swatch.dataset.theme);
    });
  }

  _syncAll() {
    // Re-sync all controls to current settings using cached refs
    const syncSlider = (el, valEl, key, formatter, transform) => {
      if (!el) return;
      const fromSetting = transform?.fromSetting || (v => v);
      el.value = fromSetting(this.settings.get(key));
      if (valEl) valEl.textContent = formatter(parseInt(el.value));
    };
    const syncToggle = (id, key) => {
      const btn = this._toggleBtns[id];
      if (!btn) return;
      const val = this.settings.get(key);
      btn.textContent = val ? 'ON' : 'OFF';
      btn.classList.toggle('on', val);
    };

    syncSlider(this._els.textSpeed, this._els.textSpeedVal, 'textSpeed', SettingsPanel._speedLabel);
    syncSlider(this._els.autoDelay, this._els.autoDelayVal, 'autoPlayDelay', v => `${(v / 1000).toFixed(1)}s`);
    syncSlider(this._els.fontSize, this._els.fontSizeVal, 'fontSize', v => `${v}%`);
    syncSlider(this._els.volume, this._els.volumeVal, 'audioVolume', v => `${v}%`, { fromSetting: v => Math.round(v * 100) });
    syncToggle('set-auto-play', 'autoPlay');
    syncToggle('set-skip-read', 'skipRead');
    syncToggle('set-screen-shake', 'screenShake');
    syncToggle('set-particles', 'particles');
    syncToggle('set-fullscreen', 'fullscreen');

    this._els.autoDelayRow.classList.toggle('hidden', !this.settings.get('autoPlay'));

    // Sync color theme swatches (uses cached _swatches array)
    const currentTheme = this.settings.get('colorTheme');
    this._swatches.forEach(btn => {
      const isActive = btn.dataset.theme === currentTheme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /** Update data usage stats display */
  _updateDataStats() {
    if (!this._els.dataStats || !this._dataManager) return;
    const stats = this._dataManager.getStats();
    const sizeKB = (stats.estimatedBytes / 1024).toFixed(1);
    this._els.dataStats.textContent = `${stats.stories} stories tracked · ${stats.saves} save files · ~${sizeKB} KB`;
  }

  /** Run a typewriter preview in the settings panel at the given speed (ms per 2-char chunk) */
  _runPreview(speedMs) {
    if (this._previewTimer) clearTimeout(this._previewTimer);
    const el = this._els.preview;
    if (!el) return;

    const text = 'The terminal cat blinked at the blinking cursor…';
    let idx = 0;
    el.textContent = '';

    if (speedMs <= 2) {
      el.textContent = text;
      return;
    }

    const step = () => {
      if (idx < text.length) {
        idx += 2;
        el.textContent = text.slice(0, idx);
        this._previewTimer = setTimeout(step, speedMs);
      }
    };
    step();
  }

  show() {
    this._syncAll();
    this._updateDataStats();
    this._runPreview(this.settings.get('textSpeed'));
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) this._focusTrap = new FocusTrap(this.overlay.querySelector('.settings-panel'));
    this._focusTrap.activate();
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this._focusTrap) this._focusTrap.deactivate();
    if (this._previewTimer) { clearTimeout(this._previewTimer); this._previewTimer = null; }
    // Cancel pending feedback timers (prevents orphan writes to detached/hidden button refs)
    for (const id of this._feedbackTimers) clearTimeout(id);
    this._feedbackTimers.length = 0;
  }

  get isVisible() {
    return this.overlay.classList.contains('visible');
  }
}
