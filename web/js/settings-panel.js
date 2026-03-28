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
    const panelEl = document.createElement('div');
    panelEl.className = 'settings-panel';

    const header = document.createElement('div');
    header.className = 'settings-header';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'settings-title';
    titleDiv.textContent = '⚙️ Settings';
    header.appendChild(titleDiv);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-close';
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);
    panelEl.appendChild(header);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'settings-body';

    // Helper: create a settings row with label + control
    const mkRow = (labelText, controlContent, opts = {}) => {
      const row = document.createElement('div');
      row.className = 'settings-row';
      if (opts.id) row.id = opts.id;
      if (labelText) {
        const lbl = document.createElement('label');
        lbl.className = 'settings-label';
        lbl.textContent = labelText;
        row.appendChild(lbl);
      }
      const ctrl = document.createElement('div');
      ctrl.className = 'settings-control' + (opts.ctrlClass ? ' ' + opts.ctrlClass : '');
      if (opts.ctrlId) ctrl.id = opts.ctrlId;
      if (opts.role) { ctrl.setAttribute('role', opts.role); ctrl.setAttribute('aria-label', opts.ariaLabel || ''); }
      if (controlContent) ctrl.appendChild(controlContent);
      if (opts.extraChildren) opts.extraChildren.forEach(c => ctrl.appendChild(c));
      row.appendChild(ctrl);
      return row;
    };
    const mkSlider = (id, min, max, step) => {
      const frag = document.createDocumentFragment();
      const input = document.createElement('input');
      input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = step;
      input.className = 'settings-slider';
      frag.appendChild(input);
      const val = document.createElement('span');
      val.className = 'settings-value'; val.id = id + '-val';
      frag.appendChild(val);
      return { frag, input, val };
    };
    const mkToggle = (id) => {
      const btn = document.createElement('button');
      btn.id = id; btn.className = 'settings-toggle';
      return btn;
    };
    const mkGroup = (icon, title) => {
      const g = document.createElement('div');
      g.className = 'settings-group';
      const t = document.createElement('div');
      t.className = 'settings-group-title';
      t.textContent = icon + ' ' + title;
      g.appendChild(t);
      return g;
    };

    // ── Text group ──
    const textGrp = mkGroup('📝', 'Text');
    const speedSlider = mkSlider('set-text-speed', '2', '40', '2');
    const speedRow = mkRow('Text Speed', null);
    const speedCtrl = speedRow.querySelector('.settings-control');
    speedCtrl.appendChild(speedSlider.input);
    speedCtrl.appendChild(speedSlider.val);
    textGrp.appendChild(speedRow);

    const previewRow = document.createElement('div');
    previewRow.className = 'settings-row';
    const previewDiv = document.createElement('div');
    previewDiv.className = 'settings-text-preview';
    previewDiv.id = 'set-text-preview';
    previewDiv.setAttribute('aria-label', 'Text speed preview');
    previewRow.appendChild(previewDiv);
    textGrp.appendChild(previewRow);

    const autoPlayBtn = mkToggle('set-auto-play');
    textGrp.appendChild(mkRow('Auto-Play', autoPlayBtn));

    const delaySlider = mkSlider('set-auto-delay', '500', '6000', '250');
    const delayRow = mkRow('Auto-Play Delay', null, { id: 'row-auto-delay' });
    const delayCtrl = delayRow.querySelector('.settings-control');
    delayCtrl.appendChild(delaySlider.input);
    delayCtrl.appendChild(delaySlider.val);
    textGrp.appendChild(delayRow);

    textGrp.appendChild(mkRow('Skip Read Scenes', mkToggle('set-skip-read')));
    bodyEl.appendChild(textGrp);

    // ── Visual group ──
    const visGrp = mkGroup('🎨', 'Visual');
    const fontSlider = mkSlider('set-font-size', '80', '140', '5');
    const fontRow = mkRow('Font Size', null);
    const fontCtrl = fontRow.querySelector('.settings-control');
    fontCtrl.appendChild(fontSlider.input);
    fontCtrl.appendChild(fontSlider.val);
    visGrp.appendChild(fontRow);

    visGrp.appendChild(mkRow('Screen Effects', mkToggle('set-screen-shake')));
    visGrp.appendChild(mkRow('Particles', mkToggle('set-particles')));
    visGrp.appendChild(mkRow('Fullscreen', mkToggle('set-fullscreen')));

    // Color theme swatches
    const themeCtrl = document.createElement('div');
    themeCtrl.className = 'settings-control theme-swatches';
    themeCtrl.id = 'set-color-theme';
    themeCtrl.setAttribute('role', 'group');
    themeCtrl.setAttribute('aria-label', 'Color theme');
    for (const [theme, title] of [['cyan','Cyan (default)'],['magenta','Magenta'],['green','Green'],['amber','Amber'],['violet','Violet']]) {
      const sw = document.createElement('button');
      sw.className = 'theme-swatch theme-swatch-' + theme;
      sw.dataset.theme = theme;
      sw.title = title;
      sw.setAttribute('aria-label', 'Use ' + theme + ' color theme');
      themeCtrl.appendChild(sw);
    }
    const themeRow = mkRow('Color Theme', null);
    themeRow.querySelector('.settings-control').replaceWith(themeCtrl);
    visGrp.appendChild(themeRow);
    bodyEl.appendChild(visGrp);

    // ── Audio group ──
    const audioGrp = mkGroup('🔊', 'Audio');
    const volSlider = mkSlider('set-volume', '0', '100', '5');
    const volRow = mkRow('Volume', null);
    const volCtrl = volRow.querySelector('.settings-control');
    volCtrl.appendChild(volSlider.input);
    volCtrl.appendChild(volSlider.val);
    audioGrp.appendChild(volRow);
    bodyEl.appendChild(audioGrp);

    // ── Data group ──
    const dataGrp = mkGroup('💾', 'Data');
    const exportBtn = document.createElement('button');
    exportBtn.id = 'set-export';
    exportBtn.className = 'settings-toggle on settings-data-btn';
    exportBtn.textContent = '📤 Export';
    const importBtn = document.createElement('button');
    importBtn.id = 'set-import';
    importBtn.className = 'settings-toggle settings-data-btn';
    importBtn.textContent = '📥 Import';
    const importFile = document.createElement('input');
    importFile.type = 'file';
    importFile.id = 'set-import-file';
    importFile.accept = '.json';
    importFile.className = 'hidden';
    const backupRow = mkRow('Backup / Restore', null, { ctrlClass: 'settings-data-btns' });
    const backupCtrl = backupRow.querySelector('.settings-control');
    backupCtrl.appendChild(exportBtn);
    backupCtrl.appendChild(importBtn);
    backupCtrl.appendChild(importFile);
    dataGrp.appendChild(backupRow);

    const campaignResetBtn = document.createElement('button');
    campaignResetBtn.id = 'set-campaign-reset';
    campaignResetBtn.className = 'settings-toggle settings-data-btn settings-data-btn-warn';
    campaignResetBtn.textContent = '📖 Reset Campaign';
    const campaignRow = mkRow('Campaign', null, { ctrlClass: 'settings-data-btns' });
    campaignRow.querySelector('.settings-control').appendChild(campaignResetBtn);
    dataGrp.appendChild(campaignRow);

    const dataStats = document.createElement('div');
    dataStats.id = 'set-data-stats';
    dataStats.className = 'settings-data-stats';
    dataGrp.appendChild(dataStats);
    bodyEl.appendChild(dataGrp);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'settings-footer';
    const resetBtn = document.createElement('button');
    resetBtn.id = 'set-reset';
    resetBtn.className = 'settings-reset-btn';
    resetBtn.textContent = '↺ Reset Defaults';
    footer.appendChild(resetBtn);
    bodyEl.appendChild(footer);

    panelEl.appendChild(bodyEl);
    this.overlay.appendChild(panelEl);
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
