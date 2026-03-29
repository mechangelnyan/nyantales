/**
 * NyanTales — Story Route Map
 * Visual branching graph of story paths using Canvas 2D.
 * Shows visited vs unvisited nodes, current position, endings, and choices.
 *
 * Overlay is built once and reused across show/hide cycles (no DOM re-creation).
 * Canvas event handlers are bound on show and unbound on hide.
 *
 * @class RouteMap
 */

class RouteMap {
  constructor() {
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.isVisible = false;
    this._focusTrap = null;
    this._panelEl = null;
    this._nodes = [];      // { id, x, y, type, visited, current, label }
    this._edges = [];      // { from, to, choiceLabel }
    this._pan = { x: 0, y: 0 };
    this._zoom = 1;
    this._dragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._panStart = { x: 0, y: 0 };
    this._hoveredNode = null;
    this._tooltip = null;
    this._animFrame = null;
    this._boundHandlers = {};
    this._built = false;
  }

  /** Cache accent color RGB from CSS custom properties (call once per render frame) */
  _cacheAccentRGB() {
    const style = getComputedStyle(document.documentElement);
    this._accentR = parseInt(style.getPropertyValue('--accent-r')) || 0;
    this._accentG = parseInt(style.getPropertyValue('--accent-g')) || 212;
    this._accentB = parseInt(style.getPropertyValue('--accent-b')) || 255;
  }

  _accentRGBA(a) {
    return `rgba(${this._accentR}, ${this._accentG}, ${this._accentB}, ${a})`;
  }

  /**
   * Build a graph layout from a StoryEngine's scene data.
   * Uses a topological layering approach for clean branching display.
   */
  _buildGraph(engine) {
    const scenes = engine.scenes;
    const visited = engine.state.visited;
    const currentScene = engine.state.currentScene;
    const sceneIds = Object.keys(scenes);

    // Build adjacency list
    const adj = {};
    const inDeg = {};
    sceneIds.forEach(id => { adj[id] = []; inDeg[id] = 0; });

    sceneIds.forEach(id => {
      const scene = scenes[id];
      // Direct next
      if (scene.next && scenes[scene.next]) {
        adj[id].push({ to: scene.next, label: null });
      }
      // Choices
      if (scene.choices) {
        scene.choices.forEach(c => {
          const target = c.goto || c.next;
          if (target && scenes[target]) {
            adj[id].push({ to: target, label: c.label || c.text || '' });
          }
        });
      }
    });

    // Calculate in-degrees
    sceneIds.forEach(id => {
      adj[id].forEach(e => { inDeg[e.to] = (inDeg[e.to] || 0) + 1; });
    });

    // Topological layer assignment using BFS from start
    const layers = {};
    const startId = engine.story.start || sceneIds[0];
    const queue = [startId];
    layers[startId] = 0;
    const seen = new Set([startId]);

    while (queue.length > 0) {
      const id = queue.shift();
      const nextLayer = (layers[id] || 0) + 1;
      for (const edge of (adj[id] || [])) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          layers[edge.to] = nextLayer;
          queue.push(edge.to);
        }
      }
    }

    // Assign unreachable nodes to layer 0
    sceneIds.forEach(id => {
      if (layers[id] === undefined) layers[id] = 0;
    });

    // Group by layer
    const layerGroups = {};
    sceneIds.forEach(id => {
      const l = layers[id];
      if (!layerGroups[l]) layerGroups[l] = [];
      layerGroups[l].push(id);
    });

    // Position nodes
    const NODE_W = 160;
    const NODE_H = 80;
    const nodes = [];
    const nodeMap = {};

    const maxLayer = Math.max(...Object.keys(layerGroups).map(Number));

    Object.entries(layerGroups).forEach(([layer, ids]) => {
      const l = parseInt(layer);
      const count = ids.length;
      const totalWidth = count * NODE_W;
      const startX = -totalWidth / 2 + NODE_W / 2;

      ids.forEach((id, idx) => {
        const scene = scenes[id];
        const isEnding = !!scene.ending;
        const hasChoices = scene.choices && scene.choices.length > 0;
        const type = isEnding ? 'ending' : (hasChoices ? 'choice' : 'normal');

        const node = {
          id,
          x: startX + idx * NODE_W,
          y: l * NODE_H,
          type,
          visited: visited.has(id),
          current: id === currentScene,
          label: this._truncate(id.replace(/-/g, ' '), 18),
          endingType: isEnding ? (scene.ending.type || 'neutral') : null,
          speaker: scene.speaker || null,
          hasItems: !!(scene.choices && scene.choices.some(c => c.give_item || c.give_items))
        };
        nodes.push(node);
        nodeMap[id] = node;
      });
    });

    // Build edges
    const edges = [];
    sceneIds.forEach(id => {
      if (!nodeMap[id]) return;
      for (const edge of (adj[id] || [])) {
        if (nodeMap[edge.to]) {
          edges.push({
            from: nodeMap[id],
            to: nodeMap[edge.to],
            label: edge.label ? this._truncate(edge.label, 20) : null,
            visited: visited.has(id) && visited.has(edge.to)
          });
        }
      }
    });

    this._nodes = nodes;
    this._edges = edges;

    // Center pan on current scene
    const currentNode = nodes.find(n => n.current);
    if (currentNode) {
      this._pan.x = -currentNode.x;
      this._pan.y = -currentNode.y + 100;
    } else {
      this._pan.x = 0;
      this._pan.y = 50;
    }
    this._zoom = 1;
  }

  _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  /** Show the route map overlay */
  show(engine) {
    if (this.isVisible) return;
    if (!engine) return;

    this._buildGraph(engine);
    this._ensureOverlay();
    this.isVisible = true;

    // Size canvas now that overlay is visible
    this._resizeCanvas();

    // Setup event handlers
    this._bindEvents();
    this._render();

    this.overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
    if (this._focusTrap) this._focusTrap.activate();
  }

  /** Hide the route map overlay */
  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this._unbindEvents();
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
    if (this._tooltip) this._tooltip.classList.add('hidden');
    if (this._focusTrap) this._focusTrap.deactivate();
    this._hoveredNode = null;
  }

  /**
   * Build overlay DOM once; subsequent calls are no-ops.
   * Event delegation on overlay handles close + zoom button clicks.
   */
  _ensureOverlay() {
    if (this._built) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'route-map-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Story Route Map');
    this.overlay.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'route-map-panel';

    const header = document.createElement('div');
    header.className = 'route-map-header';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'route-map-title';
    titleDiv.textContent = '🗺️ Route Map';
    header.appendChild(titleDiv);

    const legend = document.createElement('div');
    legend.className = 'route-map-legend';
    for (const [cls, label] of [['legend-visited', 'Visited'], ['legend-unvisited', 'Unvisited'], ['legend-current', 'Current'], ['legend-ending', 'Ending']]) {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const dot = document.createElement('span');
      dot.className = 'legend-dot ' + cls;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(' ' + label));
      legend.appendChild(item);
    }
    header.appendChild(legend);

    const controls = document.createElement('div');
    controls.className = 'route-map-controls';
    for (const [zoom, title, text] of [['in', 'Zoom in', '+'], ['out', 'Zoom out', '−'], ['fit', 'Fit to view', '⊡']]) {
      const btn = document.createElement('button');
      btn.className = 'route-map-zoom-btn';
      btn.dataset.zoom = zoom;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.textContent = text;
      controls.appendChild(btn);
    }
    header.appendChild(controls);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'route-map-close';
    closeBtn.setAttribute('aria-label', 'Close route map');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'route-map-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'route-map-canvas';
    canvasWrap.appendChild(canvas);
    panel.appendChild(canvasWrap);

    const tooltip = document.createElement('div');
    tooltip.className = 'route-map-tooltip hidden';
    panel.appendChild(tooltip);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._tooltip = tooltip;
    this._panelEl = panel;

    // Delegated click listener for close + zoom buttons + backdrop
    this.overlay.addEventListener('click', (e) => {
      // Backdrop click
      if (e.target === this.overlay) { this.hide(); return; }
      // Close button
      if (e.target.closest('.route-map-close')) { this.hide(); return; }
      // Zoom buttons
      const zoomBtn = e.target.closest('.route-map-zoom-btn');
      if (zoomBtn) {
        const action = zoomBtn.dataset.zoom;
        if (action === 'in') this._zoom = Math.min(3, this._zoom * 1.3);
        else if (action === 'out') this._zoom = Math.max(0.2, this._zoom / 1.3);
        else if (action === 'fit') this._fitToView();
        this._render();
      }
    });

    // Focus trap (created once, activated/deactivated on show/hide)
    this._focusTrap = new FocusTrap(this._panelEl);

    this._built = true;
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    const wrap = this.canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._canvasW = rect.width;
    this._canvasH = rect.height;
  }

  _fitToView() {
    if (this._nodes.length === 0) return;

    const xs = this._nodes.map(n => n.x);
    const ys = this._nodes.map(n => n.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 50;
    const maxY = Math.max(...ys) + 50;

    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;

    this._zoom = Math.min(
      this._canvasW / graphW,
      this._canvasH / graphH,
      2
    ) * 0.85;

    this._pan.x = -(minX + graphW / 2);
    this._pan.y = -(minY + graphH / 2) + 20;
  }

  _bindEvents() {
    const canvas = this.canvas;
    if (!canvas) return;

    // Mouse pan
    this._boundHandlers.mousedown = (e) => {
      this._dragging = true;
      this._dragStart = { x: e.clientX, y: e.clientY };
      this._panStart = { ...this._pan };
      canvas.classList.add('route-map-grabbing');
    };
    this._boundHandlers.mousemove = (e) => {
      if (this._dragging) {
        const dx = (e.clientX - this._dragStart.x) / this._zoom;
        const dy = (e.clientY - this._dragStart.y) / this._zoom;
        this._pan.x = this._panStart.x + dx;
        this._pan.y = this._panStart.y + dy;
        this._render();
      } else {
        this._checkHover(e);
      }
    };
    this._boundHandlers.mouseup = () => {
      this._dragging = false;
      canvas.classList.remove('route-map-grabbing');
    };
    this._boundHandlers.wheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this._zoom = Math.max(0.15, Math.min(3, this._zoom * factor));
      this._render();
    };
    this._boundHandlers.keydown = (e) => {
      if (e.key === 'Escape') this.hide();
    };

    // Touch pan
    this._boundHandlers.touchstart = (e) => {
      if (e.touches.length === 1) {
        this._dragging = true;
        this._dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this._panStart = { ...this._pan };
      }
    };
    this._boundHandlers.touchmove = (e) => {
      if (this._dragging && e.touches.length === 1) {
        e.preventDefault();
        const dx = (e.touches[0].clientX - this._dragStart.x) / this._zoom;
        const dy = (e.touches[0].clientY - this._dragStart.y) / this._zoom;
        this._pan.x = this._panStart.x + dx;
        this._pan.y = this._panStart.y + dy;
        this._render();
      }
    };
    this._boundHandlers.touchend = () => { this._dragging = false; };

    canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    window.addEventListener('mousemove', this._boundHandlers.mousemove);
    window.addEventListener('mouseup', this._boundHandlers.mouseup);
    canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
    canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: true });
    canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    canvas.addEventListener('touchend', this._boundHandlers.touchend);
    document.addEventListener('keydown', this._boundHandlers.keydown);

    // Resize
    this._boundHandlers.resize = () => {
      this._resizeCanvas();
      this._render();
    };
    window.addEventListener('resize', this._boundHandlers.resize);
  }

  _unbindEvents() {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
    window.removeEventListener('mousemove', this._boundHandlers.mousemove);
    window.removeEventListener('mouseup', this._boundHandlers.mouseup);
    canvas.removeEventListener('wheel', this._boundHandlers.wheel);
    canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
    canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
    canvas.removeEventListener('touchend', this._boundHandlers.touchend);
    document.removeEventListener('keydown', this._boundHandlers.keydown);
    window.removeEventListener('resize', this._boundHandlers.resize);
  }

  _checkHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - this._canvasW / 2) / this._zoom - this._pan.x;
    const my = (e.clientY - rect.top - this._canvasH / 2) / this._zoom - this._pan.y;

    let hovered = null;
    for (const node of this._nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (Math.abs(dx) < 55 && Math.abs(dy) < 20) {
        hovered = node;
        break;
      }
    }

    if (hovered !== this._hoveredNode) {
      this._hoveredNode = hovered;
      if (hovered && this._tooltip) {
        this._tooltip.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = hovered.id;
        this._tooltip.appendChild(strong);
        if (hovered.speaker) { this._tooltip.appendChild(document.createElement('br')); this._tooltip.appendChild(document.createTextNode(`Speaker: ${hovered.speaker}`)); }
        if (hovered.type === 'ending') { this._tooltip.appendChild(document.createElement('br')); this._tooltip.appendChild(document.createTextNode(`🏁 Ending (${hovered.endingType})`)); }
        if (hovered.current) { this._tooltip.appendChild(document.createElement('br')); this._tooltip.appendChild(document.createTextNode('📍 You are here')); }
        if (!hovered.visited) { this._tooltip.appendChild(document.createElement('br')); this._tooltip.appendChild(document.createTextNode('❓ Not yet visited')); }
        this._tooltip.classList.remove('hidden');
        this._tooltip.style.left = `${e.clientX - this.overlay.getBoundingClientRect().left + 12}px`;
        this._tooltip.style.top = `${e.clientY - this.overlay.getBoundingClientRect().top - 10}px`;
      } else if (this._tooltip) {
        this._tooltip.classList.add('hidden');
      }
      this._render();
    }
  }

  /** Main render loop */
  _render() {
    if (!this.ctx || !this.canvas) return;

    // Cache accent color once per frame (avoids dozens of getComputedStyle calls)
    this._cacheAccentRGB();

    const ctx = this.ctx;
    const w = this._canvasW;
    const h = this._canvasH;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Transform: center + pan + zoom
    ctx.translate(w / 2, h / 2);
    ctx.scale(this._zoom, this._zoom);
    ctx.translate(this._pan.x, this._pan.y);

    // Draw edges first
    for (const edge of this._edges) {
      this._drawEdge(ctx, edge);
    }

    // Draw nodes on top
    for (const node of this._nodes) {
      this._drawNode(ctx, node);
    }

    ctx.restore();
  }

  _drawEdge(ctx, edge) {
    const { from, to, visited, label } = edge;

    ctx.beginPath();
    ctx.strokeStyle = visited ? this._accentRGBA(0.5) : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = visited ? 2.5 : 1.2;

    // Curved arrow
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cpX = from.x + dx * 0.5;
    const cpY = from.y + dy * 0.5;

    ctx.moveTo(from.x, from.y + 15);
    ctx.quadraticCurveTo(cpX, cpY, to.x, to.y - 15);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(to.y - 15 - cpY, to.x - cpX);
    ctx.save();
    ctx.translate(to.x, to.y - 15);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.fillStyle = visited ? this._accentRGBA(0.6) : 'rgba(255, 255, 255, 0.15)';
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.fill();
    ctx.restore();

    // Choice label on edge
    if (label) {
      ctx.save();
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = visited ? this._accentRGBA(0.5) : 'rgba(255, 255, 255, 0.2)';
      ctx.textAlign = 'center';
      ctx.fillText(label, cpX, cpY - 5);
      ctx.restore();
    }
  }

  _drawNode(ctx, node) {
    const { x, y, type, visited, current, label } = node;
    const isHovered = this._hoveredNode === node;

    // Node shape
    const w = 100;
    const h = 28;
    const radius = type === 'ending' ? 14 : 6;

    ctx.save();

    // Glow for current/hovered
    if (current || isHovered) {
      ctx.shadowColor = current ? '#00ff88' : this._accentRGBA(1);
      ctx.shadowBlur = 15;
    }

    // Background
    ctx.beginPath();
    this._roundRect(ctx, x - w / 2, y - h / 2, w, h, radius);

    if (current) {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.strokeStyle = '#00ff88';
    } else if (type === 'ending') {
      const endColors = {
        good: 'rgba(0, 255, 136, 0.15)',
        bad: 'rgba(255, 68, 68, 0.15)',
        secret: 'rgba(204, 102, 255, 0.15)',
        neutral: 'rgba(255, 215, 0, 0.15)'
      };
      ctx.fillStyle = endColors[node.endingType] || endColors.neutral;
      ctx.strokeStyle = visited ? '#ffd700' : 'rgba(255, 215, 0, 0.3)';
    } else if (visited) {
      ctx.fillStyle = this._accentRGBA(0.1);
      ctx.strokeStyle = this._accentRGBA(0.5);
    } else {
      ctx.fillStyle = 'rgba(30, 30, 50, 0.7)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    }

    ctx.lineWidth = current ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Icon
    let icon = '';
    if (current) icon = '📍';
    else if (type === 'ending') icon = '🏁';
    else if (type === 'choice') icon = '🔀';
    else if (visited) icon = '✓';

    // Label
    ctx.font = `${current ? 'bold ' : ''}10px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = current ? '#00ff88' : (visited ? '#e0e0e0' : '#666');

    const displayLabel = icon ? `${icon} ${label}` : label;
    ctx.fillText(displayLabel, x, y);

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
