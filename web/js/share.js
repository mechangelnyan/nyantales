/**
 * NyanTales — Share helpers
 * Centralizes clean story URLs + Web Share API / clipboard fallback.
 */

class ShareHelper {
  /** Build a canonical root-level story URL like /?story=slug (works from /web/ and /web/dist/). */
  static storyUrl(slug) {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname
      .replace(/\/index\.html$/, '')
      .replace(/\/web\/dist\/?$/, '/')
      .replace(/\/web\/?$/, '/');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    if (slug) url.searchParams.set('story', slug);
    return url.toString();
  }

  /**
   * Share via native share sheet when available, else copy text to clipboard.
   * Falls back to clipboard even if the share sheet is cancelled.
   */
  static async share({ title = 'NyanTales', text = '', url = '', successMessage = 'Copied to clipboard!', successIcon = '📋', errorMessage = 'Failed to share' } = {}) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text || url);
        Toast.show(successMessage, { icon: successIcon, duration: 2000 });
        return true;
      } catch {
        Toast.error(errorMessage);
        return false;
      }
    }

    Toast.error('Clipboard not available');
    return false;
  }
}
