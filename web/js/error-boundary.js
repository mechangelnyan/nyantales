/**
 * NyanTales — Error Boundary
 *
 * Global error / unhandled rejection handler: catches fatal JS errors
 * and surfaces a non-blocking toast so the player knows something went
 * wrong without losing the current screen.
 *
 * Loaded early (after Toast + SafeStorage) to catch errors in all modules.
 */

// ── Global Error Handler ──

window.addEventListener('error', (event) => {
  console.error('[NyanTales] Uncaught error:', event.error || event.message);
  // Show toast only if Toast system is loaded
  if (typeof Toast !== 'undefined') {
    Toast.show('Something went wrong — your saves are safe', {
      icon: '⚠️',
      className: 'nt-toast-warning',
      duration: 5000
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[NyanTales] Unhandled promise rejection:', event.reason);
  if (typeof Toast !== 'undefined') {
    Toast.show('A background task failed — gameplay continues', {
      icon: '⚠️',
      className: 'nt-toast-warning',
      duration: 4000
    });
  }
});
