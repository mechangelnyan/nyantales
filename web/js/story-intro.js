/**
 * NyanTales — Story Intro Splash
 *
 * Shows a cinematic title card when entering a story, with the story title,
 * description, and protagonist portrait. Provides a brief atmospheric moment
 * before gameplay begins.
 *
 * @class StoryIntro
 */
class StoryIntro {
  /**
   * Show a story intro splash, returning a Promise that resolves when
   * the player explicitly presses Continue.
   *
   * @param {Object} story - Story data (title, description, slug)
   * @param {PortraitManager} portraits - For protagonist art
   * @returns {Promise<void>}
   */
  static show(story, portraits) {
    return new Promise(resolve => {
      const chars = CHARACTER_DATA[story.slug] || [];
      const protag = chars.find(c => c.role === 'protagonist') || chars[0];

      const overlay = document.createElement('div');
      overlay.className = 'story-intro-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', `Starting ${story.title}`);
      overlay.innerHTML = `
        <div class="story-intro-content">
          ${protag ? `<img
            src="${portraits.getPortrait(protag.name, protag.appearance)}"
            class="story-intro-portrait ${portraits.hasPortrait(protag.name) ? 'ai' : 'pixel'}"
            alt="${protag.name}"
          />` : ''}
          <h2 class="story-intro-title">${StoryIntro._esc(story.title)}</h2>
          ${story.description ? `<p class="story-intro-desc">${StoryIntro._esc(story.description)}</p>` : ''}
          <button class="story-intro-prompt" type="button">Continue ▶</button>
        </div>
      `;

      document.body.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('visible'));
      });

      let dismissed = false;
      const keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dismiss();
        }
      };
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        document.removeEventListener('keydown', keyHandler);
        overlay.classList.remove('visible');
        overlay.classList.add('exiting');
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 500);
      };

      const continueBtn = overlay.querySelector('.story-intro-prompt');
      continueBtn?.addEventListener('click', dismiss);
      continueBtn?.focus();
      document.addEventListener('keydown', keyHandler);
    });
  }

  /** @private — reuses VNUI's shared escape element when available */
  static _esc(text) {
    if (typeof VNUI !== 'undefined' && VNUI._escapeDiv) {
      VNUI._escapeDiv.textContent = text;
      return VNUI._escapeDiv.innerHTML;
    }
    if (!StoryIntro._escDiv) StoryIntro._escDiv = document.createElement('div');
    StoryIntro._escDiv.textContent = text;
    return StoryIntro._escDiv.innerHTML;
  }
}
