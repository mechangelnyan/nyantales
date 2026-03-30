/**
 * NyanTales — App Router
 *
 * Manages URL sync (?story=slug), browser history (pushState/replaceState),
 * story base path detection, and route parameter parsing.
 */

class AppRouter {
  constructor() {
    /** Monotonically increasing serial to detect stale route changes. */
    this.serial = 0;
    this.APP_TITLE = 'NyanTales — Visual Novel';
  }

  /** Detect the relative base path for story YAML files. */
  storyBasePath() {
    const path = window.location.pathname;
    if (path.includes('/web/dist')) return '../../stories';
    if (path.includes('/web/') || path.endsWith('/web')) return '../stories';
    return 'stories';
  }

  /** Build a shareable URL on the current app path. */
  buildStoryUrl(slug) {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    if (slug) url.searchParams.set('story', slug);
    return url.toString();
  }

  /** Keep the browser URL synced to the currently open story without navigating. */
  syncStoryUrl(slug, mode = 'replace') {
    const nextUrl = slug
      ? this.buildStoryUrl(slug)
      : `${window.location.pathname}${window.location.hash || ''}`;
    const state = slug ? { view: 'story', slug } : { view: 'menu' };
    const method = mode === 'push' ? 'pushState' : 'replaceState';
    window.history[method](state, '', nextUrl);
  }

  /** Get the `story` query parameter from the current URL. */
  getRequestedSlug() {
    return new URLSearchParams(window.location.search).get('story');
  }

  /** Bump and return a new route serial (used to detect stale async operations). */
  bump() {
    return ++this.serial;
  }

  /** Check if a given navId is still current (not stale from a later route change). */
  isCurrent(navId) {
    return navId === this.serial;
  }

  /** Detect standalone (installed PWA) mode. */
  isStandaloneMode() {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  /** Detect if running on iOS Safari (installable via "Add to Home Screen"). */
  isIOSInstallable() {
    const ua = window.navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    return isIOS && isSafari && !this.isStandaloneMode();
  }
}
