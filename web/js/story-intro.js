/**
 * NyanTales — Story Intro Splash
 *
 * Shows a cinematic title card when entering a story, with the story title,
 * description, and protagonist portrait. Provides a brief atmospheric moment
 * before gameplay begins.
 *
 * Overlay is created once and reused across all story starts (no DOM churn).
 *
 * @class StoryIntro
 */
class StoryIntro {
  static _overlay = null;
  static _portraitEl = null;
  static _titleEl = null;
  static _descEl = null;
  static _continueBtn = null;
  static _dismissFn = null;
  static _exitTimer = null;

  /** Build the persistent overlay structure once. */
  static _ensureOverlay() {
    if (StoryIntro._overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'story-intro-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'story-intro-content';

    const portrait = document.createElement('img');
    portrait.className = 'story-intro-portrait';
    portrait.alt = '';
    content.appendChild(portrait);

    const titleEl = document.createElement('h2');
    titleEl.className = 'story-intro-title';
    content.appendChild(titleEl);

    const descEl = document.createElement('p');
    descEl.className = 'story-intro-desc';
    content.appendChild(descEl);

    const continueBtn = document.createElement('button');
    continueBtn.className = 'story-intro-prompt';
    continueBtn.type = 'button';
    continueBtn.textContent = 'Continue ▶';
    content.appendChild(continueBtn);

    overlay.appendChild(content);

    StoryIntro._overlay = overlay;
    StoryIntro._portraitEl = portrait;
    StoryIntro._titleEl = titleEl;
    StoryIntro._descEl = descEl;
    StoryIntro._continueBtn = continueBtn;

    // Permanent click handler on the continue button
    StoryIntro._continueBtn.addEventListener('click', () => {
      if (StoryIntro._dismissFn) StoryIntro._dismissFn();
    });

    // Permanent keydown handler (only fires when _dismissFn is set)
    document.addEventListener('keydown', (e) => {
      if (!StoryIntro._dismissFn) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        StoryIntro._dismissFn();
      }
    });

    document.body.appendChild(overlay);
  }

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
      StoryIntro._ensureOverlay();

      const chars = CHARACTER_DATA[story.slug] || [];
      const protag = chars.find(c => c.role === 'protagonist') || chars[0];

      const overlay = StoryIntro._overlay;
      const portrait = StoryIntro._portraitEl;
      const titleEl = StoryIntro._titleEl;
      const descEl = StoryIntro._descEl;

      // Update content
      if (protag) {
        portrait.src = portraits.getPortrait(protag.name, protag.appearance);
        portrait.className = `story-intro-portrait ${portraits.hasPortrait(protag.name) ? 'ai' : 'pixel'}`;
        portrait.alt = protag.name;
        portrait.classList.remove('hidden');
      } else {
        portrait.classList.add('hidden');
      }

      titleEl.textContent = story.title || '';
      if (story.description) {
        descEl.textContent = story.description;
        descEl.classList.remove('hidden');
      } else {
        descEl.classList.add('hidden');
      }

      overlay.setAttribute('aria-label', `Starting ${story.title}`);
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.remove('exiting');

      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        StoryIntro._dismissFn = null;
        overlay.classList.remove('visible');
        overlay.classList.add('exiting');
        overlay.setAttribute('aria-hidden', 'true');
        if (StoryIntro._exitTimer) clearTimeout(StoryIntro._exitTimer);
        StoryIntro._exitTimer = setTimeout(() => {
          StoryIntro._exitTimer = null;
          overlay.classList.remove('exiting');
          resolve();
        }, 500);
      };

      StoryIntro._dismissFn = dismiss;

      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.classList.add('visible');
          StoryIntro._continueBtn.focus();
        });
      });
    });
  }

}
