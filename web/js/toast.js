/**
 * NyanTales — Toast Notification System
 *
 * Centralized, reusable toast notifications. Supports multiple concurrent toasts
 * with auto-dismiss, icons, color theming, and stacking.
 *
 * Usage:
 *   Toast.show('Hello!');
 *   Toast.show('Saved!', { icon: '💾', color: 'var(--accent-green)', duration: 2000 });
 *   Toast.show('Error', { color: 'var(--accent-red)', position: 'top' });
 *
 * @class Toast
 */
class Toast {
  static _container = null;
  static _topContainer = null;
  static _activeToasts = [];
  /** @type {Map<HTMLElement, number>} — tracks auto-dismiss timers per toast element */
  static _dismissTimers = new Map();
  /** @type {Map<HTMLElement, number>} — tracks remove-animation timers (post-dismiss fade-out) */
  static _removeTimers = new Map();
  static MAX_VISIBLE = 3;

  /**
   * Show a toast notification.
   * Caps visible toasts to MAX_VISIBLE — oldest are auto-dismissed when exceeded.
   *
   * @param {string} message - Text to display
   * @param {Object} [opts] - Options
   * @param {string} [opts.icon] - Emoji/icon prefix
   * @param {string} [opts.color] - Background color (CSS value)
   * @param {number} [opts.duration=3000] - Auto-dismiss time in ms (0 = manual)
   * @param {'bottom'|'top'} [opts.position='bottom'] - Screen position
   * @param {string} [opts.className] - Extra CSS class
   * @returns {HTMLElement} The toast element (for manual removal)
   */
  static show(message, opts = {}) {
    const {
      icon = '',
      color = 'rgba(20, 20, 40, 0.92)',
      duration = 3000,
      position = 'bottom',
      className = ''
    } = opts;

    // Enforce max visible toasts — dismiss oldest if at capacity
    while (Toast._activeToasts.length >= Toast.MAX_VISIBLE) {
      const oldest = Toast._activeToasts.shift();
      // Cancel its auto-dismiss timer (prevents orphaned callback)
      const oldTimer = Toast._dismissTimers.get(oldest);
      if (oldTimer) { clearTimeout(oldTimer); Toast._dismissTimers.delete(oldest); }
      // Cancel any pending remove-animation timer for evicted toast
      const oldRemove = Toast._removeTimers.get(oldest);
      if (oldRemove) { clearTimeout(oldRemove); Toast._removeTimers.delete(oldest); }
      if (oldest && oldest.parentNode) {
        oldest.classList.remove('visible');
        oldest.classList.add('dismissing');
        const rid = setTimeout(() => { Toast._removeTimers.delete(oldest); oldest.remove(); }, 300);
        Toast._removeTimers.set(oldest, rid);
      }
    }

    const container = Toast._getContainer(position);
    const el = document.createElement('div');
    el.className = `nt-toast ${position === 'top' ? 'nt-toast-top' : ''} ${className}`.trim();
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    // Only set background if custom color (default is in CSS class)
    if (color !== 'rgba(20, 20, 40, 0.92)') {
      el.style.background = color;
    }
    el.textContent = icon ? `${icon} ${message}` : message;

    container.appendChild(el);
    Toast._activeToasts.push(el);

    // Animate in via CSS class
    requestAnimationFrame(() => el.classList.add('visible'));

    // Auto dismiss (tracked so early dismiss cancels the timer)
    if (duration > 0) {
      const tid = setTimeout(() => Toast.dismiss(el), duration);
      Toast._dismissTimers.set(el, tid);
    }

    return el;
  }

  /**
   * Dismiss a specific toast element.
   * @param {HTMLElement} el
   */
  static dismiss(el) {
    if (!el || !el.parentNode) return;
    // Cancel auto-dismiss timer if still pending
    const tid = Toast._dismissTimers.get(el);
    if (tid) { clearTimeout(tid); Toast._dismissTimers.delete(el); }
    // Cancel any existing remove-animation timer (prevents double-remove)
    const rid = Toast._removeTimers.get(el);
    if (rid) { clearTimeout(rid); Toast._removeTimers.delete(el); }
    // Remove from active tracking
    const idx = Toast._activeToasts.indexOf(el);
    if (idx !== -1) Toast._activeToasts.splice(idx, 1);
    el.classList.remove('visible');
    el.classList.add('dismissing');
    const newRid = setTimeout(() => { Toast._removeTimers.delete(el); el.remove(); }, 400);
    Toast._removeTimers.set(el, newRid);
  }

  /**
   * Show a success toast (green, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static success(message, opts = {}) {
    return Toast.show(message, { icon: '✅', className: 'nt-toast-success', ...opts });
  }

  /**
   * Show an error toast (red, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static error(message, opts = {}) {
    return Toast.show(message, { icon: '❌', className: 'nt-toast-error', ...opts });
  }

  /**
   * Show an info toast (cyan tint, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static info(message, opts = {}) {
    return Toast.show(message, { icon: 'ℹ️', className: 'nt-toast-info', ...opts });
  }

  /** @private Get or create the toast container for a position (styled via CSS class) */
  static _getContainer(position) {
    const key = position === 'top' ? '_topContainer' : '_container';
    if (!Toast[key]) {
      const el = document.createElement('div');
      el.className = `nt-toast-container nt-toast-${position}`;
      document.body.appendChild(el);
      Toast[key] = el;
    }
    return Toast[key];
  }
}
