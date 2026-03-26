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
      if (oldest && oldest.parentNode) {
        oldest.style.opacity = '0';
        oldest.style.transform = 'translateY(8px)';
        setTimeout(() => oldest.remove(), 300);
      }
    }

    const container = Toast._getContainer(position);
    const el = document.createElement('div');
    el.className = `nt-toast ${className}`.trim();
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = `
      background: ${color};
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 0.45rem 1rem;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: #fff;
      opacity: 0;
      transform: translateY(${position === 'top' ? '-8px' : '8px'});
      transition: opacity 0.35s ease, transform 0.35s ease;
      pointer-events: auto;
      max-width: 360px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;
    el.textContent = icon ? `${icon} ${message}` : message;

    container.appendChild(el);
    Toast._activeToasts.push(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => Toast.dismiss(el), duration);
    }

    return el;
  }

  /**
   * Dismiss a specific toast element.
   * @param {HTMLElement} el
   */
  static dismiss(el) {
    if (!el || !el.parentNode) return;
    // Remove from active tracking
    const idx = Toast._activeToasts.indexOf(el);
    if (idx !== -1) Toast._activeToasts.splice(idx, 1);
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 400);
  }

  /**
   * Show a success toast (green, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static success(message, opts = {}) {
    return Toast.show(message, { icon: '✅', color: 'rgba(0,255,136,0.88)', ...opts });
  }

  /**
   * Show an error toast (red, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static error(message, opts = {}) {
    return Toast.show(message, { icon: '❌', color: 'rgba(255,68,68,0.88)', ...opts });
  }

  /**
   * Show an info toast (cyan tint, bottom).
   * @param {string} message
   * @param {Object} [opts]
   */
  static info(message, opts = {}) {
    return Toast.show(message, { icon: 'ℹ️', color: 'rgba(0,80,120,0.9)', ...opts });
  }

  /** @private Get or create the toast container for a position */
  static _getContainer(position) {
    const key = position === 'top' ? '_topContainer' : '_container';
    if (!Toast[key]) {
      const el = document.createElement('div');
      el.className = `nt-toast-container nt-toast-${position}`;
      el.style.cssText = `
        position: fixed;
        ${position}: 1rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: ${position === 'top' ? 'column' : 'column-reverse'};
        gap: 0.5rem;
        pointer-events: none;
        align-items: center;
      `;
      document.body.appendChild(el);
      Toast[key] = el;
    }
    return Toast[key];
  }
}
