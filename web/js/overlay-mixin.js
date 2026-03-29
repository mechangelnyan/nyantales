/**
 * NyanTales — Overlay Mixin
 *
 * Shared show/hide/isVisible/aria-hidden/FocusTrap helpers for modal overlays.
 * Eliminates ~6 lines of identical boilerplate per module across 11+ panels.
 *
 * Convention: the host object must have:
 *   - `overlay` or `_overlay` (HTMLElement) — the outermost overlay
 *   - `_focusTrap` (FocusTrap | null) — lazily created
 *   - `_focusTrapTarget` (HTMLElement, optional) — element to trap focus in
 *     (defaults to overlay.firstElementChild if not set)
 *
 * Usage in a panel class:
 *   show() { OverlayMixin.show(this); /* additional logic * / }
 *   hide() { OverlayMixin.hide(this); }
 *   get isVisible() { return OverlayMixin.isVisible(this); }
 *
 * @namespace OverlayMixin
 */
// eslint-disable-next-line no-unused-vars
const OverlayMixin = {
  /**
   * Resolve the overlay element from the host (supports .overlay or ._overlay).
   * @param {Object} host
   * @returns {HTMLElement|null}
   */
  _el(host) {
    return host.overlay || host._overlay || null;
  },

  /**
   * Show the overlay: set aria-hidden false, add .visible via rAF,
   * lazily create and activate FocusTrap.
   * @param {Object} host — the panel instance
   */
  show(host) {
    const el = OverlayMixin._el(host);
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => el.classList.add('visible'));
    const target = host._focusTrapTarget || el.firstElementChild || el;
    if (!host._focusTrap) host._focusTrap = new FocusTrap(target);
    host._focusTrap.activate();
  },

  /**
   * Hide the overlay: remove .visible, set aria-hidden true, deactivate FocusTrap.
   * @param {Object} host — the panel instance
   */
  hide(host) {
    const el = OverlayMixin._el(host);
    if (!el) return;
    el.classList.remove('visible');
    el.setAttribute('aria-hidden', 'true');
    if (host._focusTrap) host._focusTrap.deactivate();
  },

  /**
   * Check if the overlay is currently visible.
   * @param {Object} host — the panel instance
   * @returns {boolean}
   */
  isVisible(host) {
    const el = OverlayMixin._el(host);
    return el ? el.classList.contains('visible') : false;
  }
};
