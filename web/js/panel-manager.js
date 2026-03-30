/**
 * PanelManager — centralized overlay panel orchestration.
 *
 * Manages: toggle visibility, Escape close priority, isAnyOpen checks,
 * and touch gesture suspension.
 *
 * Panels are registered with a priority (lower = closes first on Escape).
 * Each panel must expose: isVisible (getter), show(...), hide().
 */
class PanelManager {
  constructor() {
    /** @type {Array<{panel: Object, priority: number}>} sorted by priority ascending */
    this._entries = [];
    /** @type {Function|null} optional callback when any panel opens/closes */
    this.onPanelChange = null;
  }

  /**
   * Register a panel with a close priority.
   * Lower priority = closes first on Escape (lightweight overlays).
   * @param {Object} panel — must have isVisible, show(), hide()
   * @param {number} priority — close order (0 = first to close)
   */
  register(panel, priority) {
    this._entries.push({ panel, priority });
    this._entries.sort((a, b) => a.priority - b.priority);
  }

  /** Check if any registered panel is currently visible. */
  isAnyOpen() {
    for (const { panel } of this._entries) {
      if (panel.isVisible) return true;
    }
    return false;
  }

  /**
   * Toggle a panel's visibility.
   * @param {Object} panel
   * @param {...*} showArgs — passed to panel.show() when opening
   */
  toggle(panel, ...showArgs) {
    panel.isVisible ? panel.hide() : panel.show(...showArgs);
    if (this.onPanelChange) this.onPanelChange();
  }

  /**
   * Close the topmost open panel (lowest priority first).
   * @returns {boolean} true if a panel was closed, false if none were open
   */
  closeTopmost() {
    for (const { panel } of this._entries) {
      if (panel.isVisible) {
        panel.hide();
        if (this.onPanelChange) this.onPanelChange();
        return true;
      }
    }
    return false;
  }
}
