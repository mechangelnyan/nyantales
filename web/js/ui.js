/**
 * NyanTales Visual Novel — UI Controller
 * Handles DOM updates, typewriter text, scene rendering, transitions.
 */

class VNUI {
  constructor() {
    // Screens
    this.titleScreen = document.getElementById('title-screen');
    this.storyScreen = document.getElementById('story-screen');

    // VN elements
    this.bgEl = document.getElementById('vn-background');
    this.spritesEl = document.getElementById('vn-sprites');
    this.locationEl = document.getElementById('vn-location');
    this.moodEl = document.getElementById('vn-mood');
    this.artEl = document.getElementById('vn-art');
    this.textboxEl = document.getElementById('vn-textbox');
    this.speakerEl = document.getElementById('vn-speaker');
    this.textEl = document.getElementById('vn-text');
    this.clickIndicator = document.getElementById('vn-click-indicator');
    this.inventoryEl = document.getElementById('vn-inventory');
    this.choicesEl = document.getElementById('vn-choices');
    this.conditionalEl = document.getElementById('vn-conditional');
    this.endingEl = document.getElementById('vn-ending');
    this.storyListEl = document.getElementById('story-list');

    // HUD
    this.btnBack = document.getElementById('btn-back');
    this.btnSave = document.getElementById('btn-save');
    this.btnFast = document.getElementById('btn-fast');

    // State
    this.typewriterSpeed = 20; // ms per character
    this.fastMode = false;
    this.isTyping = false;
    this._typewriterResolve = null;
    this._typewriterTimeout = null;
    this._fullText = '';

    // Mood emoji map
    this.moodEmojis = {
      tense: '😰',
      peaceful: '😌',
      mysterious: '🔮',
      funny: '😹',
      glitch: '⚡',
      danger: '💀',
      warm: '☀️',
      sad: '😿',
      excited: '✨',
      spooky: '👻'
    };

    // Background keyword map — tries to pick background from scene location/mood
    this.bgKeywords = {
      'terminal': 'bg-terminal',
      'shell': 'bg-terminal',
      'filesystem': 'bg-filesystem',
      'directory': 'bg-filesystem',
      '/home': 'bg-filesystem',
      '/root': 'bg-filesystem',
      '/bin': 'bg-filesystem',
      '/tmp': 'bg-filesystem',
      '/etc': 'bg-filesystem',
      '/proc': 'bg-danger',
      '/var': 'bg-filesystem',
      'server': 'bg-server-room',
      'rack': 'bg-server-room',
      'datacenter': 'bg-server-room',
      'network': 'bg-network',
      'http': 'bg-network',
      'dns': 'bg-network',
      'tcp': 'bg-network',
      'packet': 'bg-network',
      'memory': 'bg-memory',
      'heap': 'bg-memory',
      'stack': 'bg-memory',
      'buffer': 'bg-memory',
      'database': 'bg-database',
      'sql': 'bg-database',
      'table': 'bg-database',
      'café': 'bg-cafe',
      'cafe': 'bg-cafe',
      'coffee': 'bg-cafe',
      'warm': 'bg-warm',
      'home': 'bg-warm',
      'cozy': 'bg-warm',
      'danger': 'bg-danger',
      'kernel': 'bg-danger',
      'panic': 'bg-danger',
      'crash': 'bg-danger',
      'void': 'bg-void',
      'null': 'bg-void',
      'empty': 'bg-void'
    };
  }

  // ── Screen Transitions ──

  showTitleScreen() {
    this.storyScreen.classList.remove('active');
    this.titleScreen.classList.add('active');
  }

  showStoryScreen() {
    this.titleScreen.classList.remove('active');
    this.storyScreen.classList.add('active');
  }

  // ── Story List ──

  renderStoryList(stories, onSelect) {
    this.storyListEl.innerHTML = '';
    stories.forEach(story => {
      const card = document.createElement('div');
      card.className = 'story-card fade-in';
      card.innerHTML = `
        <h3>${this._escapeHtml(story.title)}</h3>
        <p>${this._escapeHtml(story.description || '')}</p>
      `;
      card.addEventListener('click', () => onSelect(story));
      this.storyListEl.appendChild(card);
    });
  }

  // ── Scene Rendering ──

  async renderScene(scene, engine) {
    if (!scene) return;

    // Reset
    this.hideChoices();
    this.hideEnding();
    this.hideConditional();
    this.clickIndicator.classList.add('hidden');

    // Background
    this._updateBackground(scene, engine);

    // Location
    if (scene.location) {
      this.locationEl.textContent = `📍 ${scene.location}`;
      this.locationEl.classList.remove('hidden');
    } else {
      this.locationEl.classList.add('hidden');
    }

    // Mood
    if (scene.mood) {
      const emoji = this.moodEmojis[scene.mood] || '';
      this.moodEl.textContent = emoji;
      this.moodEl.classList.remove('hidden');
      // Apply mood text color
      this.textEl.className = 'vn-text';
      if (scene.mood) this.textEl.classList.add(`mood-${scene.mood}`);
    } else {
      this.moodEl.classList.add('hidden');
      this.textEl.className = 'vn-text';
    }

    // ASCII Art
    if (scene.art) {
      this.artEl.textContent = scene.art;
      this.artEl.classList.remove('hidden');
    } else {
      this.artEl.classList.add('hidden');
    }

    // Speaker
    if (scene.speaker) {
      this.speakerEl.textContent = scene.speaker;
      this.speakerEl.classList.remove('hidden');
    } else {
      this.speakerEl.classList.add('hidden');
    }

    // Inventory
    this._updateInventory(engine.state.inventory);

    // Conditional text
    const conditionals = engine.getConditionalText();
    if (conditionals.length > 0) {
      this._showConditionals(conditionals, engine);
    }

    // Interpolate and display text
    const text = engine.interpolate(scene.text || '');
    await this.typewriterText(text);

    // Effects
    if (scene.effect === 'glitch') {
      this.textEl.classList.add('glitch-text');
      setTimeout(() => this.textEl.classList.remove('glitch-text'), 1000);
    }
    if (scene.effect === 'shake') {
      document.querySelector('.vn-container').classList.add('shake');
      setTimeout(() => document.querySelector('.vn-container').classList.remove('shake'), 500);
    }

    // Check for ending
    if (scene.ending) {
      this._showEnding(scene, engine);
      return;
    }

    // Show choices
    const choices = engine.getAvailableChoices();
    if (choices.length > 0) {
      this.showChoices(choices, engine);
    }
  }

  // ── Typewriter Effect ──

  typewriterText(text) {
    return new Promise(resolve => {
      // Cancel any existing typewriter
      this._cancelTypewriter();

      this._fullText = text;
      this._typewriterResolve = resolve;
      this.isTyping = true;
      this.clickIndicator.classList.add('hidden');

      if (this.fastMode) {
        this.textEl.innerHTML = this._formatText(text);
        this.isTyping = false;
        this.clickIndicator.classList.remove('hidden');
        resolve();
        return;
      }

      let index = 0;
      this.textEl.innerHTML = '';

      const type = () => {
        if (index < text.length) {
          // Add characters in small chunks for performance
          const chunk = text.slice(index, index + 2);
          index += 2;
          this.textEl.innerHTML = this._formatText(text.slice(0, index));
          this._typewriterTimeout = setTimeout(type, this.typewriterSpeed);
        } else {
          this.isTyping = false;
          this.clickIndicator.classList.remove('hidden');
          resolve();
        }
      };
      type();
    });
  }

  skipTypewriter() {
    if (this.isTyping) {
      this._cancelTypewriter();
      this.textEl.innerHTML = this._formatText(this._fullText);
      this.isTyping = false;
      this.clickIndicator.classList.remove('hidden');
      if (this._typewriterResolve) {
        this._typewriterResolve();
        this._typewriterResolve = null;
      }
    }
  }

  _cancelTypewriter() {
    if (this._typewriterTimeout) {
      clearTimeout(this._typewriterTimeout);
      this._typewriterTimeout = null;
    }
  }

  // ── Choices ──

  showChoices(choices, engine) {
    this.choicesEl.innerHTML = '';
    this.choicesEl.classList.remove('hidden');
    this.textboxEl.style.display = 'none';

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn fade-in';
      btn.style.animationDelay = `${i * 0.1}s`;
      
      let label = engine.interpolate(choice.label || choice.text || `Choice ${i + 1}`);
      
      // Show required item hint
      if (choice.requires_item) {
        const hasItem = engine.state.inventory.includes(choice.requires_item);
        if (hasItem) label += ` [${choice.requires_item}]`;
      }
      
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.choicesEl.classList.add('hidden');
        this.textboxEl.style.display = '';
        if (this._onChoice) this._onChoice(choice);
      });
      this.choicesEl.appendChild(btn);
    });
  }

  hideChoices() {
    this.choicesEl.classList.add('hidden');
    this.choicesEl.innerHTML = '';
    this.textboxEl.style.display = '';
  }

  onChoice(callback) {
    this._onChoice = callback;
  }

  // ── Inventory ──

  _updateInventory(items) {
    if (items.length === 0) {
      this.inventoryEl.classList.add('hidden');
      return;
    }
    this.inventoryEl.classList.remove('hidden');
    this.inventoryEl.innerHTML = items
      .map(i => `<span class="inv-item">🎒 ${this._escapeHtml(i)}</span>`)
      .join('');
  }

  // ── Conditionals ──

  _showConditionals(conditionals, engine) {
    this.conditionalEl.classList.remove('hidden');
    this.conditionalEl.innerHTML = conditionals
      .map(ct => `<div class="cond-text">${this._escapeHtml(engine.interpolate(ct.text))}</div>`)
      .join('');
  }

  hideConditional() {
    this.conditionalEl.classList.add('hidden');
    this.conditionalEl.innerHTML = '';
  }

  // ── Ending ──

  _showEnding(scene, engine) {
    const ending = scene.ending;
    const type = ending.type || 'neutral';
    const icon = { good: '🌟', bad: '💀', neutral: '📋', secret: '🔮' }[type] || '📋';

    this.endingEl.classList.remove('hidden');
    this.endingEl.innerHTML = `
      <div class="ending-icon">${icon}</div>
      <div class="ending-type ${type}">${(ending.title || type.toUpperCase()).toUpperCase()}</div>
      <div class="ending-text">${this._escapeHtml(engine.interpolate(ending.text || scene.text || ''))}</div>
      <div class="ending-stats">
        Scenes visited: ${engine.state.visited.size} | Turns: ${engine.state.turns}
        ${engine.state.inventory.length ? ' | Items: ' + engine.state.inventory.join(', ') : ''}
      </div>
      <button class="ending-btn" id="btn-restart">↻ Play Again</button>
      <button class="ending-btn" id="btn-menu" style="margin-top:0.5rem">⏎ Story List</button>
    `;

    document.getElementById('btn-restart').addEventListener('click', () => {
      if (this._onRestart) this._onRestart();
    });
    document.getElementById('btn-menu').addEventListener('click', () => {
      if (this._onMenu) this._onMenu();
    });
  }

  hideEnding() {
    this.endingEl.classList.add('hidden');
    this.endingEl.innerHTML = '';
  }

  onRestart(callback) { this._onRestart = callback; }
  onMenu(callback) { this._onMenu = callback; }

  // ── Background ──

  _updateBackground(scene, engine) {
    // Remove all bg- classes
    this.bgEl.className = 'vn-bg';

    // Try explicit background
    if (scene.background) {
      this.bgEl.classList.add(`bg-${scene.background}`);
      return;
    }

    // Infer from location, scene id, or text
    const haystack = [
      scene.location || '',
      engine.state.currentScene || '',
      scene.text || ''
    ].join(' ').toLowerCase();

    for (const [keyword, bgClass] of Object.entries(this.bgKeywords)) {
      if (haystack.includes(keyword)) {
        this.bgEl.classList.add(bgClass);
        return;
      }
    }
  }

  // ── Text Formatting ──

  _formatText(text) {
    // Convert backticks to code, *bold*, newlines
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code style="color:var(--accent-cyan);font-family:var(--font-mono);font-size:0.9em">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-bright)">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Fast Mode ──

  toggleFastMode() {
    this.fastMode = !this.fastMode;
    this.btnFast.style.opacity = this.fastMode ? '1' : '0.5';
    return this.fastMode;
  }
}
