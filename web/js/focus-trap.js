/**
 * NyanTales — Focus Trap Utility
 * Traps keyboard focus within a modal/overlay element for accessibility.
 *
 * Usage:
 *   const trap = new FocusTrap(overlayElement);
 *   trap.activate();   // Start trapping focus
 *   trap.deactivate(); // Restore focus to previous element
 *
 * @class FocusTrap
 */

class FocusTrap {
  /**
   * Focusable element selector string (shared across all instances).
   * @type {string}
   */
  static _FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
  ].join(', ');

  /**
   * @param {HTMLElement} container - The modal/overlay element to trap focus within
   */
  constructor(container) {
    this.container = container;
    this._active = false;
    this._previousFocus = null;
    // Arrow function — avoids .bind() allocation; permanent listener gated by _active flag
    this._onKeyDown = (e) => this._handleKeyDown(e);
    document.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Get all focusable elements within the container.
   * Reuses `_focusableBuf` array to avoid allocation per Tab keypress.
   */
  _getFocusableElements() {
    const buf = this._focusableBuf || (this._focusableBuf = []);
    buf.length = 0;
    const nodes = this.container.querySelectorAll(FocusTrap._FOCUSABLE);
    for (let i = 0, n = nodes.length; i < n; i++) {
      if (nodes[i].offsetParent !== null) buf.push(nodes[i]);
    }
    return buf;
  }

  /** Handle Tab key to cycle focus within container */
  _handleKeyDown(e) {
    if (!this._active || e.key !== 'Tab') return;

    const focusable = this._getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: wrap to last element
      if (document.activeElement === first || !this.container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wrap to first element
      if (document.activeElement === last || !this.container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /** Activate the focus trap */
  activate() {
    this._previousFocus = document.activeElement;
    this._active = true;

    // Focus the first focusable element (or the close button)
    requestAnimationFrame(() => {
      const closeBtn = this.container.querySelector('[class*="close"]');
      const focusable = this._getFocusableElements();
      if (closeBtn) closeBtn.focus();
      else if (focusable.length > 0) focusable[0].focus();
    });
  }

  /** Deactivate the focus trap and restore previous focus */
  deactivate() {
    this._active = false;
    if (this._previousFocus && this._previousFocus.focus) {
      this._previousFocus.focus();
    }
  }
}
