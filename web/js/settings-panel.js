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
              <div class="settings-control theme-swatches" id="set-color-theme">
                <button class="theme-swatch" data-theme="cyan" title="Cyan (default)" style="--swatch-color:#00d4ff"></button>
                <button class="theme-swatch" data-theme="magenta" title="Magenta" style="--swatch-color:#ff36ab"></button>
                <button class="theme-swatch" data-theme="green" title="Green" style="--swatch-color:#00ff88"></button>
                <button class="theme-swatch" data-theme="amber" title="Amber" style="--swatch-color:#ffd700"></button>
                <button class="theme-swatch" data-theme="violet" title="Violet" style="--swatch-color:#cc66ff"></button>
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
              <div class="settings-control" style="gap:0.4rem">
                <button id="set-export" class="settings-toggle on" style="font-size:0.68rem">📤 Export</button>
                <button id="set-import" class="settings-toggle" style="font-size:0.68rem">📥 Import</button>
                <input type="file" id="set-import-file" accept=".json" style="display:none" />
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

    // Close handlers
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.overlay.querySelector('.settings-close').addEventListener('click', () => this.hide());

    // Wire up controls
    this._wireSlider('set-text-speed', 'textSpeed', v => {
      const labels = { 2: 'Instant', 6: 'Very Fast', 12: 'Fast', 18: 'Normal', 26: 'Slow', 34: 'Very Slow', 40: 'Crawl' };
      const closest = Object.keys(labels).reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
      return labels[closest] || `${v}ms`;
    });

    this._wireToggle('set-auto-play', 'autoPlay', (val) => {
      document.getElementById('row-auto-delay').style.display = val ? '' : 'none';
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

    // Color theme swatches
    this._wireColorTheme();

    // Data export/import
    this._dataManager = new DataManager();
    document.getElementById('set-export').addEventListener('click', () => {
      this._dataManager.downloadExport();
      const btn = document.getElementById('set-export');
      btn.textContent = '✅ Done!';
      setTimeout(() => { btn.textContent = '📤 Export'; }, 1500);
    });
    document.getElementById('set-import').addEventListener('click', () => {
      document.getElementById('set-import-file').click();
    });
    document.getElementById('set-import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const confirmed = await ConfirmDialog.show({
        title: 'Import Data?',
        message: `Import from "${file.name}"? This will merge with your existing data and may overwrite current saves.`,
        confirmText: '📥 Import',
        cancelText: 'Cancel',
        danger: false
      });
      if (!confirmed) {
        e.target.value = '';
        return;
      }
      try {
        const result = await this._dataManager.importFromFile(file);
        const btn = document.getElementById('set-import');
        btn.textContent = `✅ ${result.imported} items`;
        setTimeout(() => { btn.textContent = '📥 Import'; }, 2000);
        this._updateDataStats();
      } catch (err) {
        const btn = document.getElementById('set-import');
        btn.textContent = '❌ Error';
        setTimeout(() => { btn.textContent = '📥 Import'; }, 2000);
        console.warn('Import failed:', err);
      }
      e.target.value = ''; // Reset file input
    });

    // Reset button (with confirmation)
    document.getElementById('set-reset').addEventListener('click', async () => {
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
    });
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

  /** Wire color theme swatch buttons */
  _wireColorTheme() {
    const container = document.getElementById('set-color-theme');
    const swatches = container.querySelectorAll('.theme-swatch');
    const currentTheme = this.settings.get('colorTheme');

    swatches.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
      btn.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        this.settings.set('colorTheme', btn.dataset.theme);
      });
    });
  }

  _syncAll() {
    // Re-sync all controls to current settings
    const sync = (id, key, formatter, transform) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(id + '-val');
      if (el && el.type === 'range') {
        const fromSetting = transform?.fromSetting || (v => v);
        el.value = fromSetting(this.settings.get(key));
        if (valEl) valEl.textContent = formatter(parseInt(el.value));
      }
    };
    const syncToggle = (id, key) => {
      const btn = document.getElementById(id);
      if (btn) {
        const val = this.settings.get(key);
        btn.textContent = val ? 'ON' : 'OFF';
        btn.classList.toggle('on', val);
      }
    };

    sync('set-text-speed', 'textSpeed', v => {
      const labels = { 2: 'Instant', 6: 'Very Fast', 12: 'Fast', 18: 'Normal', 26: 'Slow', 34: 'Very Slow', 40: 'Crawl' };
      const closest = Object.keys(labels).reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
      return labels[closest] || `${v}ms`;
    });
    sync('set-auto-delay', 'autoPlayDelay', v => `${(v / 1000).toFixed(1)}s`);
    sync('set-font-size', 'fontSize', v => `${v}%`);
    sync('set-volume', 'audioVolume', v => `${v}%`, { fromSetting: v => Math.round(v * 100) });
    syncToggle('set-auto-play', 'autoPlay');
    syncToggle('set-skip-read', 'skipRead');
    syncToggle('set-screen-shake', 'screenShake');
    syncToggle('set-particles', 'particles');
    syncToggle('set-fullscreen', 'fullscreen');

    document.getElementById('row-auto-delay').style.display = this.settings.get('autoPlay') ? '' : 'none';

    // Sync color theme swatches
    const currentTheme = this.settings.get('colorTheme');
    document.querySelectorAll('#set-color-theme .theme-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
  }

  /** Update data usage stats display */
  _updateDataStats() {
    const statsEl = document.getElementById('set-data-stats');
    if (!statsEl || !this._dataManager) return;
    const stats = this._dataManager.getStats();
    const sizeKB = (stats.estimatedBytes / 1024).toFixed(1);
    statsEl.innerHTML = `${stats.stories} stories tracked · ${stats.saves} save files · ~${sizeKB} KB`;
  }

  show() {
    this._syncAll();
    this._updateDataStats();
    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (!this._focusTrap) this._focusTrap = new FocusTrap(this.overlay.querySelector('.settings-panel'));
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
}
