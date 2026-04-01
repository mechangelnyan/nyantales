/**
 * NyanTales — Choice Renderer
 * Manages choice button rendering with a reusable button pool and event delegation.
 * Manages choice button pool, delegation, visited hints, and click handling.
 *
 * @class ChoiceRenderer
 */

class ChoiceRenderer {
  /**
   * @param {HTMLElement} choicesEl - The choices container element
   */
  constructor(choicesEl) {
    this._el = choicesEl;
    this._pool = [];          // reusable <button> elements
    this._poolRefs = [];      // parallel array: { numSpan, textNode, visitedSpan } per button
    this._current = null;     // current choices array (for delegation lookup)
    this._onChoice = null;    // callback: (choice) => void
    this._rippleTimer = null; // tracked timer for click ripple effect
    this._delegated = false;
  }

  /**
   * Show choices using pooled button elements + single delegated listener.
   * @param {Array} choices - Available choices from engine
   * @param {StoryEngine} engine - Game engine for interpolation + state
   */
  show(choices, engine) {
    this._el.textContent = '';
    this._el.classList.remove('hidden');
    this._current = choices;

    // Grow pool as needed
    while (this._pool.length < choices.length) {
      const btn = document.createElement('button');
      const numSpan = document.createElement('span');
      numSpan.className = 'choice-num';
      const textNode = document.createTextNode('');
      const visitedSpan = document.createElement('span');
      visitedSpan.className = 'choice-visited';
      visitedSpan.title = 'Previously visited';
      visitedSpan.textContent = '✓';
      this._pool.push(btn);
      this._poolRefs.push({ numSpan, textNode, visitedSpan });
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const btn = this._pool[i];
      const refs = this._poolRefs[i];
      btn.className = 'choice-btn fade-in';
      btn.style.setProperty('--choice-delay', `${i * 0.08}s`);
      btn.dataset.choiceIdx = i;

      let label = engine.interpolate(choice.label || choice.text || `Choice ${i + 1}`);
      if (choice.requires_item) {
        const hasItem = engine.state.inventory.includes(choice.requires_item);
        if (hasItem) label += ` [${choice.requires_item}]`;
      }

      const visited = choice.goto && engine.state.visited.has(choice.goto);
      if (visited) btn.classList.add('choice-visited-path');

      // Update pre-built children
      btn.textContent = '';
      if (i < 9) {
        refs.numSpan.textContent = i + 1;
        btn.appendChild(refs.numSpan);
      }
      refs.textNode.textContent = label;
      btn.appendChild(refs.textNode);
      if (visited) btn.appendChild(refs.visitedSpan);

      frag.appendChild(btn);
    }
    this._el.appendChild(frag);

    this._ensureDelegation();
  }

  /** Hide choices and clear current state. */
  hide() {
    this._el.classList.add('hidden');
    this._el.textContent = '';
    this._current = null;
  }

  /**
   * Set the choice callback.
   * @param {Function} fn - Called with the selected choice object
   */
  onChoice(fn) { this._onChoice = fn; }

  /** @returns {Array|null} Current choices (for number-key lookup) */
  get current() { return this._current; }

  /** @returns {Array} The button pool (for direct index access from keyboard shortcuts) */
  get pool() { return this._pool; }

  /**
   * Set up a single delegated click listener on choicesEl (called once).
   * @private
   */
  _ensureDelegation() {
    if (this._delegated) return;
    this._delegated = true;

    this._el.addEventListener('click', (e) => {
      const btn = e.target.closest('.choice-btn');
      if (!btn || !this._current) return;
      const idx = parseInt(btn.dataset.choiceIdx, 10);
      const choice = this._current[idx];
      if (!choice) return;

      btn.classList.add('chosen');
      clearTimeout(this._rippleTimer);
      this._rippleTimer = setTimeout(() => {
        this._el.classList.add('hidden');
        if (this._onChoice) this._onChoice(choice);
      }, 200);
    });
  }
}
