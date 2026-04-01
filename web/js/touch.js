/**
 * NyanTales — Touch Gesture Handler
 * Provides swipe-to-advance and tap-to-skip for mobile/tablet play.
 *
 * Gestures:
 *   - Tap on textbox → skip typewriter / advance
 *   - Swipe left  → advance (same as tap/Enter)
 *   - Swipe right → open history
 *   - Swipe down  → open settings
 *   - Swipe up    → open save/load panel
 *
 * Only active on the story screen (.vn-container).
 * Minimum swipe distance: 50px. Max swipe time: 400ms.
 */

class TouchHandler {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks; // { onAdvance, onOpenHistory, onOpenSettings, onOpenSave }
    this._touchStart = null;
    this._touchStartTime = 0;
    this.minSwipeDist = 50;  // px
    this.maxSwipeTime = 400; // ms
    this.enabled = true;
    this.suspended = false;

    // Arrow functions avoid .bind() allocation
    this._onTouchStart = (e) => this._handleTouchStart(e);
    this._onTouchEnd = (e) => this._handleTouchEnd(e);

    // AbortController for clean bulk unbind on destroy()
    this._evtCtrl = new AbortController();
    const sig = { signal: this._evtCtrl.signal };
    container.addEventListener('touchstart', this._onTouchStart, { passive: true, ...sig });
    container.addEventListener('touchend', this._onTouchEnd, { passive: false, ...sig });
  }

  _handleTouchStart(e) {
    if (!this.enabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    this._touchStart = { x: t.clientX, y: t.clientY };
    this._touchStartTime = Date.now();
  }

  _handleTouchEnd(e) {
    if (!this.enabled || this.suspended || !this._touchStart) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStart.x;
    const dy = t.clientY - this._touchStart.y;
    const dt = Date.now() - this._touchStartTime;
    this._touchStart = null;

    // Ignore slow drags
    if (dt > this.maxSwipeTime) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Must be clearly directional (not a tap)
    if (absDx < this.minSwipeDist && absDy < this.minSwipeDist) return;

    // Determine dominant direction
    if (absDx > absDy) {
      if (dx < -this.minSwipeDist) {
        // Swipe LEFT → advance
        e.preventDefault();
        this.callbacks.onAdvance?.();
      } else if (dx > this.minSwipeDist) {
        // Swipe RIGHT → history
        e.preventDefault();
        this.callbacks.onOpenHistory?.();
      }
    } else {
      if (dy > this.minSwipeDist) {
        // Swipe DOWN → settings
        e.preventDefault();
        this.callbacks.onOpenSettings?.();
      } else if (dy < -this.minSwipeDist) {
        // Swipe UP → save/load panel
        e.preventDefault();
        this.callbacks.onOpenSave?.();
      }
    }
  }

  /** Temporarily disable (e.g., during overlays) */
  disable() { this.enabled = false; }
  enable()  { this.enabled = true; }

  /**
   * Suspend gestures while panels are open.
   * Unlike disable(), suspend is checked alongside enabled so callers
   * don't need to manage enable/disable ordering.
   * @param {boolean} on
   */
  suspend(on) { this.suspended = !!on; }

  /** Remove listeners (single abort replaces 2 removeEventListener calls) */
  destroy() {
    this._evtCtrl.abort();
  }
}
