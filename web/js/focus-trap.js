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
   * @param {HTMLElement} container - The modal/overlay element to trap focus within
   */
  constructor(container) {
    this.container = container;
    this._previousFocus = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /** Get all focusable elements within the container */
  _getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ];
    return [...this.container.querySelectorAll(selectors.join(', '))].filter(
      el => el.offsetParent !== null // visible only
    );
  }

  /** Handle Tab key to cycle focus within container */
  _onKeyDown(e) {
    if (e.key !== 'Tab') return;

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
    document.addEventListener('keydown', this._onKeyDown);

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
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._previousFocus && this._previousFocus.focus) {
      this._previousFocus.focus();
    }
  }
}
