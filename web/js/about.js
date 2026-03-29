/**
 * NyanTales — About / Credits Panel
 *
 * Displays project info, version, and credits in a styled overlay.
 * Accessible from title screen via the "About" button.
 *
 * @class AboutPanel
 */
class AboutPanel {
  constructor() {
    this.overlay = null;
    this._focusTrap = null;
    this._statsEl = null;
    this._built = false;
  }

  _build() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'about-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'About NyanTales');
    this.overlay.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'about-panel';

    const header = document.createElement('div');
    header.className = 'about-header';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'about-title';
    titleDiv.textContent = '🐱 About NyanTales';
    header.appendChild(titleDiv);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'about-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'about-body';

    const ascii = document.createElement('pre');
    ascii.className = 'about-ascii';
    ascii.setAttribute('aria-hidden', 'true');
    ascii.textContent = ' /\\_/\\\n( o.o )\n > ^ <';
    body.appendChild(ascii);

    const desc = document.createElement('p');
    desc.className = 'about-desc';
    const strong = document.createElement('strong');
    strong.textContent = 'NyanTales';
    desc.appendChild(strong);
    desc.appendChild(document.createTextNode(' is an interactive visual novel collection featuring 30 stories of cats navigating the world of computer science — from kernel panics to merge conflicts, from DNS quests to Docker escapes.'));
    body.appendChild(desc);

    const statsDiv = document.createElement('div');
    statsDiv.className = 'about-stats';
    statsDiv.id = 'about-stats';
    body.appendChild(statsDiv);

    // Features section
    const featSec = document.createElement('div');
    featSec.className = 'about-section';
    const featTitle = document.createElement('div');
    featTitle.className = 'about-section-title';
    featTitle.textContent = 'Features';
    featSec.appendChild(featTitle);
    const featList = document.createElement('ul');
    featList.className = 'about-features';
    for (const f of [
      '🎮 30 branching interactive stories',
      '📖 Connected campaign mode (26 chapters across 5 acts)',
      '🐱 45+ unique cat characters',
      '🎨 Procedural pixel sprite system',
      '🔊 Synthesized ambient soundscapes',
      '💾 Multiple save slots with auto-save',
      '🏆 16 unlockable achievements',
      '📱 Mobile touch gestures + installable PWA',
      '📲 One-tap install prompt + iPhone home-screen help',
      '♿ Full keyboard + screen reader support'
    ]) {
      const li = document.createElement('li');
      li.textContent = f;
      featList.appendChild(li);
    }
    featSec.appendChild(featList);
    body.appendChild(featSec);

    // Tech section
    const techSec = document.createElement('div');
    techSec.className = 'about-section';
    const techTitle = document.createElement('div');
    techTitle.className = 'about-section-title';
    techTitle.textContent = 'Tech';
    techSec.appendChild(techTitle);
    const techP = document.createElement('p');
    techP.className = 'about-tech';
    techP.textContent = 'Vanilla JS · No frameworks · Web Audio API · Canvas pixel art · Service Worker offline · CSS gradient backgrounds · localStorage persistence';
    techSec.appendChild(techP);
    body.appendChild(techSec);

    const footer = document.createElement('div');
    footer.className = 'about-footer-text';
    footer.appendChild(document.createTextNode('Made with 😻 by '));
    const link = document.createElement('a');
    link.href = 'https://github.com/mechangelnyan/nyantales';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'NyanTales';
    footer.appendChild(link);
    body.appendChild(footer);

    panel.appendChild(body);
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
    this._statsEl = statsDiv;

    // Pre-build stat value elements so show() can update textContent instead of innerHTML
    this._statVals = {};
    for (const key of ['stories', 'characters', 'achievements']) {
      const div = document.createElement('div');
      div.className = 'about-stat';
      const valEl = document.createElement('span');
      valEl.className = 'about-stat-val';
      const lblEl = document.createElement('span');
      lblEl.className = 'about-stat-lbl';
      lblEl.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      div.appendChild(valEl);
      div.appendChild(lblEl);
      this._statsEl.appendChild(div);
      this._statVals[key] = valEl;
    }

    // Single delegated click listener for close + backdrop
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.closest('.about-close')) this.hide();
    });

    this._built = true;
  }

  /**
   * Show the about panel. Accepts optional stats to display.
   * @param {{ stories: number, characters: number, achievements: string }} [stats]
   */
  show(stats) {
    this._build();

    if (stats && this._statVals) {
      this._statVals.stories.textContent = stats.stories;
      this._statVals.characters.textContent = stats.characters;
      this._statVals.achievements.textContent = stats.achievements;
    }

    OverlayMixin.show(this);
  }

  hide() {
    OverlayMixin.hide(this);
  }

  get isVisible() {
    return OverlayMixin.isVisible(this);
  }
}
