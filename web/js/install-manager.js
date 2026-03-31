/**
 * InstallManager — PWA install prompt handling.
 *
 * Manages: deferred install prompt, button state, iOS fallback,
 * beforeinstallprompt / appinstalled / standalone-mode events.
 *
 * Handles PWA install prompt, button visibility, and iOS guidance.
 */
class InstallManager {
  /**
   * @param {HTMLElement} btnEl — the install button element
   * @param {AppRouter}   router — for isStandaloneMode / isIOSInstallable
   */
  constructor(btnEl, router) {
    this._btn    = btnEl;
    this._router = router;
    this._prompt = null;

    // Wire browser events
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._prompt = e;
      this.updateButton();
    });

    window.addEventListener('appinstalled', () => {
      this._prompt = null;
      this.updateButton();
      Toast.show('NyanTales installed — the cat terminal now lives on your home screen.', { icon: '✨', duration: 4000 });
    });

    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (mq?.addEventListener) {
      mq.addEventListener('change', () => this.updateButton());
    } else if (mq?.addListener) {
      mq.addListener(() => this.updateButton());
    }
  }

  /** Update the install button visibility and label. */
  updateButton() {
    const btn = this._btn;
    if (!btn) return;

    const show = !this._router.isStandaloneMode() && (!!this._prompt || this._router.isIOSInstallable());
    btn.classList.toggle('hidden', !show);
    if (!show) return;

    if (this._prompt) {
      btn.textContent = '📲 Install App';
      btn.title = 'Install NyanTales for offline play';
      btn.setAttribute('aria-label', 'Install NyanTales as an app');
    } else {
      btn.textContent = '📲 Install';
      btn.title = 'Show iPhone/iPad install instructions';
      btn.setAttribute('aria-label', 'Show install instructions for iPhone or iPad');
    }
  }

  /** Handle install button click. */
  async handleAction() {
    if (this._prompt) {
      const promptEvent = this._prompt;
      this._prompt = null;
      this.updateButton();

      try {
        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result?.outcome === 'accepted') {
          Toast.show('NyanTales is installing… offline cat adventures unlocked.', { icon: '📲', duration: 3500 });
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
        Toast.show('Could not open the install prompt right now.', { icon: '⚠️', duration: 3000 });
      }
      return;
    }

    if (this._router.isIOSInstallable()) {
      Toast.show('On iPhone/iPad: tap Share, then choose "Add to Home Screen".', { icon: '📲', duration: 5000 });
      return;
    }

    Toast.show('Install is not available in this browser right now.', { icon: 'ℹ️', duration: 3000 });
  }
}
