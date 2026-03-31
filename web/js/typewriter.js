/**
 * NyanTales Visual Novel — Typewriter Controller
 *
 * Handles progressive text reveal with character-level animation.
 * Extracted from VNUI (Phase 152) to isolate text rendering logic.
 */

class TypewriterController {
  /**
   * @param {HTMLElement} textEl - The .vn-text element
   * @param {HTMLElement} textboxEl - The .vn-textbox scrollable container
   * @param {HTMLElement} clickIndicator - The click-to-continue indicator
   */
  constructor(textEl, textboxEl, clickIndicator) {
    this._textEl = textEl;
    this._textboxEl = textboxEl;
    this._clickIndicator = clickIndicator;

    this.speed = 18; // ms per 2-char chunk
    this.fastMode = false;
    this.isTyping = false;

    this._resolve = null;
    this._timeout = null;
    this._fullText = '';
  }

  /**
   * Display text with typewriter animation. Resolves when fully displayed or skipped.
   * Progressive reveal via per-character visibility toggle (O(n) total, not O(n²)).
   * @param {string} text - Raw text to display
   * @returns {Promise<void>}
   */
  run(text) {
    return new Promise(resolve => {
      this._cancel();
      this._fullText = text;
      this._resolve = resolve;
      this.isTyping = true;
      this._clickIndicator.classList.add('hidden');

      const formattedHtml = TypewriterController.formatText(text);

      if (this.fastMode) {
        this._textEl.innerHTML = formattedHtml;
        this.isTyping = false;
        this._clickIndicator.classList.remove('hidden');
        this._textboxEl.scrollTop = this._textboxEl.scrollHeight;
        resolve();
        return;
      }

      // Progressive reveal: render full formatted HTML, then show chars one-by-one.
      this._textEl.innerHTML = '';
      const wrapper = document.createElement('span');
      wrapper.className = 'vn-typewriter-reveal';
      wrapper.innerHTML = formattedHtml;
      this._textEl.appendChild(wrapper);

      // Walk text nodes and split into per-character spans
      const textNodes = [];
      const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      const charSpans = [];
      for (const tn of textNodes) {
        const parent = tn.parentNode;
        const chars = tn.textContent;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
          const span = document.createElement('span');
          span.textContent = chars[i];
          span.className = 'tw-hidden';
          charSpans.push(span);
          frag.appendChild(span);
        }
        parent.replaceChild(frag, tn);
      }

      let revealedLen = 0;
      const type = () => {
        const end = Math.min(revealedLen + 2, charSpans.length);
        for (let i = revealedLen; i < end; i++) {
          charSpans[i].className = '';
        }
        revealedLen = end;
        this._textboxEl.scrollTop = this._textboxEl.scrollHeight;

        if (revealedLen < charSpans.length) {
          this._timeout = setTimeout(type, this.speed);
        } else {
          // Replace char spans with clean formatted HTML
          this._textEl.innerHTML = formattedHtml;
          this.isTyping = false;
          this._clickIndicator.classList.remove('hidden');
          this._textboxEl.scrollTop = this._textboxEl.scrollHeight;
          resolve();
        }
      };
      type();
    });
  }

  /** Skip the current typewriter animation and show all text immediately. */
  skip() {
    if (!this.isTyping) return;
    this._cancel();
    this._textEl.innerHTML = TypewriterController.formatText(this._fullText);
    this.isTyping = false;
    this._clickIndicator.classList.remove('hidden');
    this._textboxEl.scrollTop = this._textboxEl.scrollHeight;
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  /** Cancel pending timeout without completing text. */
  _cancel() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  /**
   * Format VN text: escape HTML, then apply markdown (code, bold, italic, newlines).
   * Static so other modules can reuse it without a TypewriterController instance.
   * @param {string} text
   * @returns {string} Formatted HTML
   */
  static formatText(text) {
    const escaped = text.replace(TypewriterController._HTML_ESC_RE, c => TypewriterController._HTML_ESC_MAP[c]);
    return escaped.replace(TypewriterController._FORMAT_RE, (m, code, bold, italic) => {
      if (code !== undefined) return `<code class="vn-inline-code">${code}</code>`;
      if (bold !== undefined) return `<strong class="vn-bold">${bold}</strong>`;
      if (italic !== undefined) return `<em>${italic}</em>`;
      if (m === '\n') return '<br>';
      return m;
    });
  }

  /**
   * Escape HTML special characters (static utility).
   * Reuses a single off-screen element.
   * @param {string} text
   * @returns {string}
   */
  static escapeHtml(text) {
    if (!TypewriterController._escDiv) TypewriterController._escDiv = document.createElement('div');
    TypewriterController._escDiv.textContent = text;
    return TypewriterController._escDiv.innerHTML;
  }
}

/** @private Pre-compiled markdown regex: backtick code, **bold**, *italic*, newline */
TypewriterController._FORMAT_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\n/g;

/** @private HTML escape regex + lookup map */
TypewriterController._HTML_ESC_RE = /[&<>]/g;
TypewriterController._HTML_ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** @private Reusable element for escapeHtml */
TypewriterController._escDiv = null;
