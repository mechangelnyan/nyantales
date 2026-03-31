/**
 * NyanTales Visual Novel — Background Manager
 *
 * Handles scene background inference from keywords and crossfade transitions.
 * Manages scene background CSS class inference and crossfade transitions.
 */

class BackgroundManager {
  /**
   * @param {HTMLElement} bgEl - The .vn-bg element
   */
  constructor(bgEl) {
    this._bgEl = bgEl;
    this._lastBgClass = '';

    // Reusable crossfade overlay (single element, avoids create/remove per transition)
    this._overlay = document.createElement('div');
    this._overlay.className = 'scene-transition-overlay';
  }

  /** @returns {string} The current background CSS class */
  get lastBgClass() { return this._lastBgClass; }

  /**
   * Transition to the appropriate background for a scene.
   * Uses crossfade overlay when background changes, instant swap otherwise.
   * @param {Object} scene - Scene data
   * @param {Object} engine - StoryEngine instance
   * @param {Object} sceneLower - Pre-lowercased { loc, scn, txt } from renderScene
   * @param {boolean} fastMode - Skip transition animation
   */
  async transition(scene, engine, sceneLower, fastMode) {
    const newBg = this._infer(scene, engine, sceneLower);

    if (newBg !== this._lastBgClass && this._lastBgClass) {
      const overlay = this._overlay;
      this._bgEl.parentElement.appendChild(overlay);

      requestAnimationFrame(() => overlay.classList.add('active'));
      await this._wait(300, fastMode);

      this._bgEl.className = 'vn-bg';
      if (newBg) this._bgEl.classList.add(newBg);
      await this._wait(100, fastMode);

      overlay.classList.remove('active');
      await this._wait(300, fastMode);
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
    } else {
      this._bgEl.className = 'vn-bg';
      if (newBg) this._bgEl.classList.add(newBg);
    }

    this._lastBgClass = newBg;
  }

  /** Reset background state (e.g. on menu return). */
  reset() {
    this._lastBgClass = '';
  }

  /**
   * Infer background class from scene data using keyword matching.
   * @param {Object} scene
   * @param {Object} engine
   * @param {Object|null} sceneLower - Pre-lowercased strings from renderScene
   * @returns {string} CSS class name (e.g. 'bg-terminal') or ''
   */
  _infer(scene, engine, sceneLower) {
    if (scene.background) return `bg-${scene.background}`;

    const sl = sceneLower;
    const loc = sl ? sl.loc : (scene.location || '').toLowerCase();
    const scn = sl ? sl.scn : (engine.state.currentScene || '').toLowerCase();
    const txt = sl ? sl.txt : (scene.text || '').toLowerCase();

    for (const [keyword, bgClass] of BackgroundManager._KEYWORDS) {
      if (loc.includes(keyword) || scn.includes(keyword) || txt.includes(keyword)) return bgClass;
    }
    return '';
  }

  /** @private — resolves immediately in fast mode (zero Promise allocation). */
  _wait(ms, fast) {
    if (fast) return;
    return new Promise(r => setTimeout(r, ms));
  }
}

/** Pre-built keyword → CSS class tuples. */
BackgroundManager._KEYWORDS = [
  ['terminal', 'bg-terminal'], ['shell', 'bg-terminal'],
  ['filesystem', 'bg-filesystem'], ['directory', 'bg-filesystem'],
  ['/home', 'bg-filesystem'], ['/root', 'bg-filesystem'], ['/bin', 'bg-filesystem'],
  ['/tmp', 'bg-filesystem'], ['/etc', 'bg-filesystem'], ['/proc', 'bg-danger'], ['/var', 'bg-filesystem'],
  ['server', 'bg-server-room'], ['rack', 'bg-server-room'], ['datacenter', 'bg-server-room'],
  ['network', 'bg-network'], ['http', 'bg-network'], ['dns', 'bg-network'],
  ['tcp', 'bg-network'], ['packet', 'bg-network'],
  ['memory', 'bg-memory'], ['heap', 'bg-memory'], ['stack', 'bg-memory'], ['buffer', 'bg-memory'],
  ['database', 'bg-database'], ['sql', 'bg-database'], ['table', 'bg-database'],
  ['café', 'bg-cafe'], ['cafe', 'bg-cafe'], ['coffee', 'bg-cafe'],
  ['warm', 'bg-warm'], ['home', 'bg-warm'], ['cozy', 'bg-warm'],
  ['danger', 'bg-danger'], ['kernel', 'bg-danger'], ['panic', 'bg-danger'], ['crash', 'bg-danger'],
  ['void', 'bg-void'], ['null', 'bg-void'], ['empty', 'bg-void'],
  ['docker', 'bg-server-room'], ['container', 'bg-server-room'],
  ['git', 'bg-terminal'], ['branch', 'bg-terminal'],
  ['regex', 'bg-danger'], ['loop', 'bg-memory'],
  ['process', 'bg-server-room'], ['pipe', 'bg-terminal'],
  ['deploy', 'bg-server-room'], ['production', 'bg-danger'],
  ['cache', 'bg-memory'], ['tls', 'bg-network'], ['ssl', 'bg-network'],
  ['cipher', 'bg-network'], ['handshake', 'bg-network']
];
