/**
 * NyanTales — Service Worker Registration
 *
 * Registers the service worker and shows an update banner
 * when a new version is detected.
 *
 * Extracted from main.js (Phase 144) for CSP compliance
 * (no inline scripts) and cleaner separation.
 */
class SWRegister {
  static init() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            SWRegister._showUpdateBanner();
          }
        });
      });
    }).catch(() => {});
  }

  static _showUpdateBanner() {
    const banner = document.createElement('div');
    banner.className = 'sw-update-banner';
    const text = document.createElement('span');
    text.className = 'sw-update-text';
    text.textContent = '🐱 NyanTales updated!';
    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'sw-update-btn';
    reloadBtn.textContent = 'Reload';
    reloadBtn.addEventListener('click', () => location.reload());
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'sw-dismiss-btn';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.textContent = '✕';
    dismissBtn.addEventListener('click', () => banner.remove());
    banner.append(text, reloadBtn, dismissBtn);
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('visible'));
  }
}
