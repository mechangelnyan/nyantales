/**
 * NyanTales — Confirmation Dialog
 * Reusable modal confirmation for destructive actions.
 * Overlay is created once and reused across all invocations (no DOM churn).
 *
 * Usage:
 *   const confirmed = await ConfirmDialog.show({
 *     title: 'Delete Save?',
 *     message: 'This cannot be undone.',
 *     confirmText: '🗑 Delete',
 *     cancelText: 'Cancel',
 *     danger: true
 *   });
 *   if (confirmed) { ... }
 *
 * @class ConfirmDialog
 */
class ConfirmDialog {
  static _overlay = null;
  static _titleEl = null;
  static _messageEl = null;
  static _okBtn = null;
  static _cancelBtn = null;
  static _resolve = null;
  static _keyHandler = null;

  /** Build the overlay once, attach permanent delegation. */
  static _ensureOverlay() {
    if (ConfirmDialog._overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-title"></div>
        <div class="confirm-message"></div>
        <div class="confirm-actions">
          <button class="confirm-btn cancel-btn"></button>
          <button class="confirm-btn ok-btn"></button>
        </div>
      </div>
    `;

    // Single delegated click — handles confirm, cancel, and backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('.ok-btn')) { ConfirmDialog._finish(true); return; }
      if (e.target.closest('.cancel-btn') || e.target === overlay) ConfirmDialog._finish(false);
    });

    // Permanent keydown handler (only active when dialog is visible)
    ConfirmDialog._keyHandler = (e) => {
      if (e.key === 'Escape' && ConfirmDialog._resolve) ConfirmDialog._finish(false);
    };
    document.addEventListener('keydown', ConfirmDialog._keyHandler);

    document.body.appendChild(overlay);

    ConfirmDialog._overlay = overlay;
    ConfirmDialog._titleEl = overlay.querySelector('.confirm-title');
    ConfirmDialog._messageEl = overlay.querySelector('.confirm-message');
    ConfirmDialog._okBtn = overlay.querySelector('.ok-btn');
    ConfirmDialog._cancelBtn = overlay.querySelector('.cancel-btn');
  }

  /** Resolve the current dialog and hide. */
  static _finish(result) {
    if (!ConfirmDialog._resolve) return;
    const resolve = ConfirmDialog._resolve;
    ConfirmDialog._resolve = null;

    const overlay = ConfirmDialog._overlay;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    resolve(result);
  }

  /**
   * Show a confirmation dialog and return a promise that resolves to true/false.
   * @param {Object} opts
   * @param {string} opts.title - Dialog title
   * @param {string} opts.message - Dialog body text
   * @param {string} [opts.confirmText='Confirm'] - Confirm button label
   * @param {string} [opts.cancelText='Cancel'] - Cancel button label
   * @param {boolean} [opts.danger=false] - Style as dangerous action (red confirm button)
   * @returns {Promise<boolean>}
   */
  static show(opts = {}) {
    const {
      title = 'Are you sure?',
      message = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      danger = false
    } = opts;

    // If a dialog is already open, resolve it as cancelled
    if (ConfirmDialog._resolve) ConfirmDialog._finish(false);

    ConfirmDialog._ensureOverlay();

    const overlay = ConfirmDialog._overlay;
    overlay.setAttribute('aria-label', title);

    // Update content (reusing existing elements)
    ConfirmDialog._titleEl.textContent = title;
    if (message) {
      ConfirmDialog._messageEl.textContent = message;
      ConfirmDialog._messageEl.classList.remove('hidden');
    } else {
      ConfirmDialog._messageEl.textContent = '';
      ConfirmDialog._messageEl.classList.add('hidden');
    }
    ConfirmDialog._cancelBtn.textContent = cancelText;
    ConfirmDialog._okBtn.textContent = confirmText;
    ConfirmDialog._okBtn.className = `confirm-btn ok-btn${danger ? ' danger' : ''}`;

    return new Promise(resolve => {
      ConfirmDialog._resolve = resolve;

      overlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
        ConfirmDialog._cancelBtn.focus();
      });
    });
  }

  /** @private — reuses VNUI's shared escape element when available */
  static _esc(text) {
    if (typeof VNUI !== 'undefined' && VNUI._escapeDiv) {
      VNUI._escapeDiv.textContent = text;
      return VNUI._escapeDiv.innerHTML;
    }
    if (!ConfirmDialog._escDiv) ConfirmDialog._escDiv = document.createElement('div');
    ConfirmDialog._escDiv.textContent = text;
    return ConfirmDialog._escDiv.innerHTML;
  }
}
