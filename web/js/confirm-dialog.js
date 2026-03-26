/**
 * NyanTales — Confirmation Dialog
 * Reusable modal confirmation for destructive actions.
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

    return new Promise(resolve => {
      // Remove existing dialog if any
      if (ConfirmDialog._overlay) {
        ConfirmDialog._overlay.remove();
        ConfirmDialog._overlay = null;
      }

      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      const dangerClass = danger ? ' danger' : '';

      overlay.innerHTML = `
        <div class="confirm-panel">
          <div class="confirm-title">${ConfirmDialog._esc(title)}</div>
          ${message ? `<div class="confirm-message">${ConfirmDialog._esc(message)}</div>` : ''}
          <div class="confirm-actions">
            <button class="confirm-btn cancel-btn">${ConfirmDialog._esc(cancelText)}</button>
            <button class="confirm-btn ok-btn${dangerClass}">${ConfirmDialog._esc(confirmText)}</button>
          </div>
        </div>
      `;

      const keyHandler = (e) => {
        if (e.key === 'Escape') cleanup(false);
      };

      const cleanup = (result) => {
        document.removeEventListener('keydown', keyHandler);
        overlay.classList.remove('visible');
        setTimeout(() => {
          overlay.remove();
          ConfirmDialog._overlay = null;
        }, 250);
        resolve(result);
      };

      overlay.querySelector('.cancel-btn').addEventListener('click', () => cleanup(false));
      overlay.querySelector('.ok-btn').addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });

      document.addEventListener('keydown', keyHandler);

      document.body.appendChild(overlay);
      ConfirmDialog._overlay = overlay;

      // Focus the cancel button by default (safer default)
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
        overlay.querySelector('.cancel-btn').focus();
      });
    });
  }

  /** @private */
  static _esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
