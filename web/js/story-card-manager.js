/**
 * StoryCardManager — manages story card decoration, refresh, and metadata.
 *
 * Extracted from main.js to separate card-level UI concerns (badges, progress bars,
 * favorites, save indicators, meta info, lock state) from app orchestration.
 *
 * Dependencies: StoryTracker, SaveManager, CampaignUI, CHARACTER_DATA (global)
 */
class StoryCardManager {
  /**
   * @param {Object} deps
   * @param {StoryTracker} deps.tracker
   * @param {SaveManager} deps.saveManager
   * @param {CampaignUI} deps.campaignUI
   * @param {Map<string, Object>} deps.storySlugMap — slug → story (for search blob)
   * @param {Map<Object, number>} deps.storyIdxMap — story → index position
   */
  constructor(deps) {
    this._tracker = deps.tracker;
    this._saveManager = deps.saveManager;
    this._campaignUI = deps.campaignUI;
    this._storyIdxMap = deps.storyIdxMap;

    /** @type {Map<string, Object>} slug → { sceneCount, readMins, wordCount, totalEndings } */
    this._metaCache = new Map();

    /**
     * Cached story card child refs to avoid querySelector per card on every refresh.
     * Maps card index → { badge, saveIcon, barFill, barEl, favBtn, infoBtn, metaEl }.
     * @type {Map<number, Object>}
     */
    this._cardRefs = new Map();

    /**
     * Inner DOM refs for story cards (title h3, description p, sprite img, textDiv).
     * Set by VNUI.renderStoryList via setInnerRefs(), used by decorate/reset for lock state.
     * Replaces custom `card._innerRefs` DOM property — keeps app state off DOM elements.
     * @type {Map<number, {inner: HTMLElement, textDiv: HTMLElement, h3: HTMLElement, p: HTMLElement, spriteEl: HTMLImageElement|null}>}
     */
    this._innerRefs = new Map();
  }

  /**
   * Compute reading-time estimate, scene count, and total endings for a story (cached per slug).
   * Uses pre-computed manifest meta if available (avoids needing _parsed).
   * @param {Object} story - Story index entry
   * @returns {{ sceneCount: number, readMins: number, wordCount: number, totalEndings: number }}
   */
  getMeta(story) {
    const cached = this._metaCache.get(story.slug);
    if (cached) return cached;

    if (story._meta) {
      this._metaCache.set(story.slug, story._meta);
      return story._meta;
    }

    const scenes = story._parsed?.scenes;
    let sceneCount = 0, wordCount = 0, totalEndings = 0;
    if (scenes) {
      for (const id in scenes) {
        sceneCount++;
        const s = scenes[id];
        if (s.text) wordCount += s.text.split(/\s+/).length;
        if (s.is_ending || s.ending) totalEndings++;
      }
    }
    const readMins = Math.max(1, Math.ceil(wordCount / 200));
    const meta = { sceneCount, readMins, wordCount, totalEndings };
    this._metaCache.set(story.slug, meta);
    return meta;
  }

  /**
  /**
   * Store inner DOM refs for a story card (set by VNUI.renderStoryList during grid build).
   * @param {Object} story
   * @param {Object} refs - { inner, textDiv, h3, p, spriteEl }
   */
  setInnerRefs(story, refs) {
    const idx = this._storyIdxMap.get(story);
    if (idx !== undefined) this._innerRefs.set(idx, refs);
  }

  /**
   * Get inner DOM refs for a story card.
   * @param {Object} story
   * @returns {Object|undefined}
   */
  getInnerRefs(story) {
    const idx = this._storyIdxMap.get(story);
    return idx !== undefined ? this._innerRefs.get(idx) : undefined;
  }

  /**
   * Build a lowercase search blob for a story (title + description + character names/roles/appearance).
   * Used for story grid filtering.
   * @param {Object} story - Story index entry
   * @returns {string}
   */
  buildSearchBlob(story) {
    const chars = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA[story.slug]) || [];
    const parts = [story.slug, story.title, story.description || ''];
    for (const char of chars) {
      parts.push(char.name || '');
      parts.push(char.appearance || '');
      parts.push(char.role || '');
    }
    return parts.join(' ').toLowerCase();
  }

  /**
   * Decorate a freshly-created story card with badges, progress, meta, and buttons.
   * Called once per card during initial grid build.
   * @param {HTMLElement} card - The story card DOM element
   * @param {Object} story - Story index entry
   */
  decorate(card, story) {
    const locked = !this._campaignUI.isStoryUnlocked(story.slug);
    if (locked) {
      card.classList.add('story-locked');
      card.setAttribute('tabindex', '-1');
      card.setAttribute('aria-label', `${story.title}: Locked — progress through the campaign to unlock`);
      const ir = this.getInnerRefs(story);
      if (ir) {
        if (ir.h3) ir.h3.textContent = '🔒 ' + story.title;
        if (ir.p) ir.p.textContent = 'Progress through the campaign to unlock';
        if (ir.spriteEl) ir.spriteEl.classList.add('locked-sprite');
      }
      card.dataset.slug = story.slug;
      card.dataset.locked = '1';
      return;
    }

    card.dataset.locked = '0';
    const tracker = this._tracker;
    const completed = tracker.isCompleted(story.slug);
    const endings = tracker.endingCount(story.slug);
    const { sceneCount, readMins } = this.getMeta(story);

    const refs = { badge: null, saveIcon: null, barFill: null, barEl: null, favBtn: null, infoBtn: null, metaEl: null };

    // Completion badge
    const badge = document.createElement('div');
    badge.className = 'story-card-badge';
    if (completed) {
      card.classList.add('completed');
      badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
    } else {
      badge.classList.add('hidden');
    }
    card.appendChild(badge);
    refs.badge = badge;

    // Save indicator
    const saveIcon = document.createElement('div');
    saveIcon.textContent = '💾';
    if (this._saveManager.hasSave(story.slug)) {
      saveIcon.className = completed
        ? 'story-card-badge story-card-save-badge save-badge-bottom'
        : 'story-card-badge story-card-save-badge';
    } else {
      saveIcon.className = 'story-card-badge story-card-save-badge hidden';
    }
    card.appendChild(saveIcon);
    refs.saveIcon = saveIcon;

    // Progress bar
    const bar = document.createElement('div');
    bar.className = 'story-card-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const barFill = document.createElement('div');
    barFill.className = 'story-card-progress-fill';
    if (sceneCount > 0) {
      const pct = tracker.getProgress(story.slug, sceneCount);
      barFill.style.setProperty('--bar-pct', `${pct}%`);
      bar.setAttribute('aria-valuenow', pct);
      bar.setAttribute('aria-label', `${pct}% explored`);
    } else {
      barFill.style.setProperty('--bar-pct', '0%');
      bar.setAttribute('aria-valuenow', 0);
      bar.setAttribute('aria-label', '0% explored');
    }
    bar.appendChild(barFill);
    card.appendChild(bar);
    refs.barFill = barFill;
    refs.barEl = bar;

    // Meta info
    if (sceneCount > 0 || readMins > 0) {
      const metaEl = document.createElement('div');
      metaEl.className = 'story-card-meta';
      const timeSpan = document.createElement('span');
      timeSpan.textContent = `⏱ ~${readMins} min`;
      const sceneSpan = document.createElement('span');
      sceneSpan.textContent = `📄 ${sceneCount} scenes`;
      metaEl.appendChild(timeSpan);
      metaEl.appendChild(sceneSpan);
      const textContainer = this.getInnerRefs(story)?.textDiv;
      if (textContainer) textContainer.appendChild(metaEl);
      refs.metaEl = metaEl;
    }

    // Info button
    const infoBtn = document.createElement('button');
    infoBtn.className = 'story-card-info-btn';
    infoBtn.textContent = 'ℹ';
    infoBtn.title = 'Story details';
    infoBtn.setAttribute('aria-label', `Details for ${story.title}`);
    card.appendChild(infoBtn);
    refs.infoBtn = infoBtn;

    // Favorite button
    const isFav = tracker.isFavorite(story.slug);
    const favBtn = document.createElement('button');
    favBtn.className = 'story-card-fav-btn';
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    favBtn.setAttribute('aria-label', isFav ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`);
    favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    card.appendChild(favBtn);
    refs.favBtn = favBtn;

    // Cache refs
    const cardIdx = this._storyIdxMap.get(story);
    if (cardIdx !== undefined) this._cardRefs.set(cardIdx, refs);

    // Data attributes for filtering/sorting
    card.dataset.slug = story.slug;
    card.dataset.title = story.title.toLowerCase();
    card.dataset.desc = (story.description || '').toLowerCase();
    card.dataset.search = this.buildSearchBlob(story);
    card.dataset.completed = completed ? '1' : '0';
    card.dataset.favorite = isFav ? '1' : '0';
    card.dataset.readMins = readMins;
    card.dataset.progress = sceneCount > 0 ? tracker.getProgress(story.slug, sceneCount) : 0;
    card.dataset.lastPlayed = tracker.getStory(story.slug).lastPlayed || 0;
  }

  /**
   * Partial refresh of story cards: updates badges, progress, favorites, and data
   * attributes without destroying/recreating DOM elements.
   * @param {Object[]} storyIndex - Array of story entries
   * @param {HTMLElement[]} cards - Corresponding card DOM elements
   */
  refresh(storyIndex, cards) {
    const tracker = this._tracker;
    for (let idx = 0; idx < storyIndex.length; idx++) {
      const story = storyIndex[idx];
      const card = cards[idx];
      if (!card) continue;

      const locked = !this._campaignUI.isStoryUnlocked(story.slug);
      const wasLocked = card.dataset.locked === '1';

      if (locked !== wasLocked) {
        this._cardRefs.delete(idx);
        this.reset(card, story);
        this.decorate(card, story);
        continue;
      }

      if (locked) continue;

      const completed = tracker.isCompleted(story.slug);
      const endings = tracker.endingCount(story.slug);
      const { sceneCount } = this.getMeta(story);
      const isFav = tracker.isFavorite(story.slug);
      const hasSave = this._saveManager.hasSave(story.slug);
      const pct = sceneCount > 0 ? tracker.getProgress(story.slug, sceneCount) : 0;

      const refs = this._cardRefs.get(idx);

      card.classList.toggle('completed', completed);
      if (refs?.badge) {
        if (completed) {
          refs.badge.classList.remove('hidden');
          refs.badge.textContent = `✅ ${endings} ending${endings !== 1 ? 's' : ''}`;
        } else {
          refs.badge.classList.add('hidden');
        }
      }

      if (refs?.saveIcon) {
        if (hasSave) {
          refs.saveIcon.classList.remove('hidden');
          refs.saveIcon.classList.toggle('save-badge-bottom', completed);
        } else {
          refs.saveIcon.classList.add('hidden');
        }
      }

      if (refs?.barFill) {
        refs.barFill.style.setProperty('--bar-pct', `${pct}%`);
        if (refs.barEl) refs.barEl.setAttribute('aria-valuenow', pct);
      }

      if (refs?.favBtn) {
        refs.favBtn.textContent = isFav ? '❤️' : '🤍';
        refs.favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        refs.favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      }

      card.dataset.completed = completed ? '1' : '0';
      card.dataset.favorite = isFav ? '1' : '0';
      card.dataset.progress = pct;
      card.dataset.lastPlayed = tracker.getStory(story.slug).lastPlayed || 0;
    }
  }

  /**
   * Strip dynamic decorations from a card so it can be re-decorated from scratch.
   * Used when lock state changes (rare: campaign advance).
   * @param {HTMLElement} card
   * @param {Object} story
   */
  reset(card, story) {
    const refs = this._cardRefs.get(this._storyIdxMap.get(story));
    if (refs) {
      if (refs.badge) refs.badge.remove();
      if (refs.saveIcon) refs.saveIcon.remove();
      if (refs.barEl) refs.barEl.remove();
      if (refs.favBtn) refs.favBtn.remove();
      if (refs.infoBtn) refs.infoBtn.remove();
      if (refs.metaEl) refs.metaEl.remove();
    }
    card.classList.remove('completed', 'story-locked');
    card.removeAttribute('data-locked');

    const ir = this.getInnerRefs(story);
    if (ir) {
      if (ir.h3) ir.h3.textContent = story.title;
      if (ir.p) ir.p.textContent = story.description || '';
      if (ir.spriteEl) ir.spriteEl.classList.remove('locked-sprite');
    }
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${story.title}: ${story.description || 'Interactive story'}`);
  }

  /** Clear all cached refs (call before full grid rebuild). */
  clearRefs() {
    this._cardRefs.clear();
    this._innerRefs.clear();
  }
}
