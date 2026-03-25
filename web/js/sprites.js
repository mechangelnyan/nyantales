/**
 * NyanTales — Procedural Cat Sprite Generator
 * Generates unique pixel-art cat portraits using Canvas API.
 * Each character gets a deterministic sprite based on their name.
 */

class CatSpriteGenerator {
  constructor() {
    this.cache = new Map();
    this.size = 128; // sprite size in pixels
    this.pixelSize = 4; // each "pixel" is 4x4 real pixels
  }

  /** Deterministic hash from string */
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /** Seeded pseudo-random */
  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /** HSL to RGB */
  _hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /** Generate color palette for a character */
  _getPalette(name, appearance) {
    const h = this._hash(name);
    const rng = this._seededRandom(h);

    // Parse appearance for color hints
    const app = (appearance || '').toLowerCase();
    let baseHue, baseSat, baseLit;

    if (app.includes('orange') || app.includes('tabby')) {
      baseHue = 25 + rng() * 15; baseSat = 70; baseLit = 55;
    } else if (app.includes('gray') || app.includes('grey')) {
      baseHue = 220; baseSat = 10; baseLit = 50;
    } else if (app.includes('black')) {
      baseHue = 0; baseSat = 0; baseLit = 20;
    } else if (app.includes('white')) {
      baseHue = 40; baseSat = 5; baseLit = 85;
    } else if (app.includes('calico')) {
      baseHue = 30; baseSat = 60; baseLit = 60;
    } else if (app.includes('golden') || app.includes('warm')) {
      baseHue = 45; baseSat = 65; baseLit = 55;
    } else {
      // Random based on name
      baseHue = (h % 360);
      baseSat = 40 + rng() * 30;
      baseLit = 40 + rng() * 25;
    }

    const [br, bg, bb] = this._hslToRgb(baseHue, baseSat, baseLit);
    const [dr, dg, db] = this._hslToRgb(baseHue, baseSat, baseLit - 15);
    const [lr, lg, lb] = this._hslToRgb(baseHue, baseSat - 10, baseLit + 15);

    return {
      body: `rgb(${br},${bg},${bb})`,
      dark: `rgb(${dr},${dg},${db})`,
      light: `rgb(${lr},${lg},${lb})`,
      eyes: rng() > 0.5 ? '#00d4ff' : (rng() > 0.5 ? '#ffd700' : '#00ff88'),
      nose: '#ff8888',
      bg: 'transparent'
    };
  }

  /** Draw a pixel-art cat on a canvas */
  _drawCat(ctx, name, appearance, personality) {
    const h = this._hash(name);
    const rng = this._seededRandom(h + 42);
    const pal = this._getPalette(name, appearance);
    const ps = this.pixelSize;
    const sz = this.size;

    // Grid is 32x32 "pixels"
    const gw = 32, gh = 32;
    const ox = (sz - gw * ps) / 2;
    const oy = (sz - gh * ps) / 2;

    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * ps, oy + y * ps, ps, ps);
    };

    // Ear style: 0=pointed, 1=round, 2=folded
    const earStyle = Math.floor(rng() * 3);
    // Eye style: 0=round, 1=slit, 2=wide
    const eyeStyle = Math.floor(rng() * 3);
    // Has markings
    const hasStripes = rng() > 0.5;
    const hasPatch = rng() > 0.6;

    // ── Draw ears ──
    const drawEar = (bx, flip) => {
      for (let row = 0; row < 5; row++) {
        const w = earStyle === 0 ? (5 - row) : (earStyle === 1 ? Math.min(row + 2, 4) : (row < 3 ? 4 - row : 0));
        for (let col = 0; col < w; col++) {
          const x = flip ? bx - col : bx + col;
          px(x, 6 - row, row < 3 ? pal.dark : pal.body);
          // Inner ear
          if (row > 0 && row < 4 && col < w - 1) {
            px(x, 6 - row, '#cc7799');
          }
        }
      }
    };
    drawEar(8, false);
    drawEar(23, true);

    // ── Draw head ──
    for (let y = 6; y < 17; y++) {
      const headWidth = y < 8 ? (6 + (y - 6) * 2) : (y < 14 ? 12 : 12 - (y - 13) * 2);
      const startX = 16 - Math.floor(headWidth / 2);
      for (let x = startX; x < startX + headWidth; x++) {
        const edge = (x === startX || x === startX + headWidth - 1);
        px(x, y, edge ? pal.dark : pal.body);
      }
    }

    // ── Draw eyes ──
    const eyeY = 10;
    const drawEye = (ex) => {
      if (eyeStyle === 0) {
        px(ex, eyeY, pal.eyes);
        px(ex + 1, eyeY, pal.eyes);
        px(ex, eyeY + 1, pal.eyes);
        px(ex + 1, eyeY + 1, pal.eyes);
        // Pupil
        px(ex + 1, eyeY, '#000');
      } else if (eyeStyle === 1) {
        px(ex, eyeY, pal.eyes);
        px(ex, eyeY + 1, pal.eyes);
        px(ex, eyeY + 2, pal.eyes);
        px(ex, eyeY + 1, '#000');
      } else {
        px(ex, eyeY, pal.eyes);
        px(ex + 1, eyeY, pal.eyes);
        px(ex + 2, eyeY, pal.eyes);
        px(ex + 1, eyeY, '#000');
      }
    };
    drawEye(11);
    drawEye(19);

    // ── Nose + mouth ──
    px(15, 13, pal.nose);
    px(16, 13, pal.nose);
    px(14, 14, pal.dark);
    px(17, 14, pal.dark);
    // Whiskers
    for (let i = 0; i < 3; i++) {
      px(8 - i, 12 + i, pal.dark);
      px(23 + i, 12 + i, pal.dark);
    }

    // ── Body ──
    for (let y = 16; y < 27; y++) {
      const bodyW = y < 19 ? (8 + (y - 16) * 2) : (y < 24 ? 14 : 14 - (y - 23) * 2);
      const startX = 16 - Math.floor(bodyW / 2);
      for (let x = startX; x < startX + bodyW; x++) {
        const edge = (x === startX || x === startX + bodyW - 1);
        let color = edge ? pal.dark : pal.body;
        // Belly (lighter)
        if (!edge && Math.abs(x - 16) < bodyW / 3 && y > 18 && y < 25) {
          color = pal.light;
        }
        px(x, y, color);
      }
    }

    // ── Stripes ──
    if (hasStripes) {
      for (let s = 0; s < 3; s++) {
        const sy = 8 + s * 2;
        px(12, sy, pal.dark);
        px(20, sy, pal.dark);
      }
      // Body stripes
      for (let s = 0; s < 2; s++) {
        const sy = 19 + s * 3;
        for (let x = 12; x < 20; x += 3) {
          px(x, sy, pal.dark);
        }
      }
    }

    // ── Calico patches ──
    if (hasPatch) {
      const patchColor = rng() > 0.5 ? '#cc6633' : '#333333';
      const py = 8 + Math.floor(rng() * 4);
      const ppx = 12 + Math.floor(rng() * 6);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if (rng() > 0.3) px(ppx + dx, py + dy, patchColor);
        }
      }
    }

    // ── Paws ──
    for (const fx of [11, 12, 19, 20]) {
      px(fx, 26, pal.light);
      px(fx, 27, pal.light);
    }

    // ── Tail ──
    const tailDir = rng() > 0.5 ? 1 : -1;
    let tx = tailDir > 0 ? 22 : 10;
    for (let i = 0; i < 6; i++) {
      px(tx, 23 - i, pal.body);
      if (i > 1) tx += tailDir;
    }

    // ── Glow outline ──
    ctx.shadowColor = pal.eyes;
    ctx.shadowBlur = 4;
  }

  /** Generate sprite as data URL */
  generate(name, appearance, personality) {
    const key = name;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = this.size;
    canvas.height = this.size;
    const ctx = canvas.getContext('2d');

    // Clear with transparency
    ctx.clearRect(0, 0, this.size, this.size);

    this._drawCat(ctx, name, appearance, personality);

    const url = canvas.toDataURL('image/png');
    this.cache.set(key, url);
    return url;
  }

  /** Generate a larger portrait (256x256) */
  generatePortrait(name, appearance, personality) {
    const key = `portrait-${name}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Save original pixel size
    const origPS = this.pixelSize;
    const origSz = this.size;
    this.pixelSize = 8;
    this.size = 256;

    this._drawCat(ctx, name, appearance, personality);

    this.pixelSize = origPS;
    this.size = origSz;

    const url = canvas.toDataURL('image/png');
    this.cache.set(key, url);
    return url;
  }
}

// Character data extracted from characters.yaml — keyed by story slug
const CHARACTER_DATA = {
  'the-terminal-cat': [
    { name: 'Nyan', appearance: 'Extremely fluffy cat', role: 'protagonist' }
  ],
  '404-not-found': [
    { name: 'Packet', appearance: 'Stray cat riding HTTP requests', role: 'protagonist' },
    { name: 'api-worker-7', appearance: 'Grizzled tomcat process', role: 'npc' },
    { name: 'The WAF', appearance: 'Web Application Firewall, stern female presence', role: 'npc' }
  ],
  'buffer-overflow': [
    { name: 'Byte', appearance: 'Small gray cat', role: 'protagonist' },
    { name: 'Stack Canary', appearance: 'Small, nervous-looking value', role: 'npc' }
  ],
  'cache-invalidation': [
    { name: 'Cache Cat', appearance: 'Cat curled in warm golden light', role: 'protagonist' }
  ],
  'cafe-debug': [
    { name: 'Mochi', appearance: 'Calico cat barista', role: 'protagonist' }
  ],
  'deadlock': [
    { name: 'Thread-A', appearance: 'Orange tabby', role: 'npc' },
    { name: 'Thread-B', appearance: 'Gray shorthair', role: 'npc' },
    { name: 'Thread-C', appearance: 'Black cat', role: 'npc' },
    { name: 'Thread-D', appearance: 'Calico', role: 'npc' }
  ],
  'dns-quest': [
    { name: 'Query', appearance: 'Small, determined tabby cat', role: 'protagonist' }
  ],
  'docker-escape': [
    { name: 'Mochi', appearance: 'Calico cat', role: 'protagonist' }
  ],
  'encoding-error': [
    { name: 'Glyph', appearance: 'A cat encoded in UTF-8', role: 'protagonist' }
  ],
  'floating-point': [
    { name: 'Mantissa', appearance: 'A cat made of 64 bits', role: 'protagonist' },
    { name: 'Epsilon', appearance: 'Tiny leftover bits', role: 'npc' }
  ],
  'fork-bomb': [
    { name: 'Fork Bomb Cat', appearance: 'Cat with root access', role: 'protagonist' }
  ],
  'garbage-collection': [
    { name: 'Whisker', appearance: 'Small object-cat on the managed heap', role: 'protagonist' }
  ],
  'git-blame': [
    { name: 'Inspector Whiskers', appearance: 'Cat detective noir style', role: 'protagonist' }
  ],
  'haunted-network': [
    { name: 'Pixel', appearance: 'Calico cat', role: 'protagonist' },
    { name: 'ARIA', appearance: 'Ghost in the cache', role: 'npc' }
  ],
  'infinite-loop': [
    { name: 'Loop', appearance: 'Small calico cat', role: 'protagonist' }
  ],
  'kernel-panic': [
    { name: 'Pixel', appearance: 'Process-cat PID 7', role: 'protagonist' }
  ],
  'memory-leak': [
    { name: 'Nibble', appearance: 'Small gray cat with one white paw', role: 'protagonist' },
    { name: 'Dangling', appearance: 'Freed pointer still referenced', role: 'npc' }
  ],
  'merge-conflict': [
    { name: 'Merge Cat', appearance: 'Simultaneously a black cat and a white cat', role: 'protagonist' }
  ],
  'midnight-deploy': [
    { name: 'Byte', appearance: 'Small gray cat', role: 'protagonist' },
    { name: 'Chairman Whiskers', appearance: 'Very large Maine Coon', role: 'npc' }
  ],
  'permission-denied': [
    { name: 'Sudo', appearance: 'Small gray cat', role: 'protagonist' }
  ],
  'pipeline-purrdition': [
    { name: 'Pippa', appearance: 'DevOps cat', role: 'protagonist' }
  ],
  'race-condition': [
    { name: 'Mutex', appearance: 'Small, black-and-white cat', role: 'protagonist' }
  ],
  'regex-catastrophe': [
    { name: 'Caret', appearance: 'Small, pointy-eared, perpetually startled', role: 'protagonist' }
  ],
  'segfault': [
    { name: 'Pointer', appearance: 'Sleek gray cat', role: 'protagonist' },
    { name: 'Dangling', appearance: 'Freed pointer still referenced', role: 'npc' }
  ],
  'server-room-stray': [
    { name: 'Server Room Cat', appearance: 'Small orange cat', role: 'protagonist' }
  ],
  'sql-injection': [
    { name: 'Pixel', appearance: 'Small orange cat', role: 'protagonist' }
  ],
  'stack-overflow': [
    { name: 'Recurse', appearance: 'Small orange cat', role: 'protagonist' },
    { name: 'Closure', appearance: 'A captured variable from outer scope', role: 'npc' }
  ],
  'tls-pawshake': [
    { name: 'TLS Cat', appearance: 'Cat riding TLS handshake packets', role: 'protagonist' },
    { name: 'Chroma', appearance: 'A nervous browser', role: 'npc' },
    { name: 'Serif', appearance: 'Scholarly calico cat', role: 'npc' },
    { name: 'Nginx', appearance: 'Large cat with name tag', role: 'npc' }
  ],
  'vim-escape': [
    { name: 'Tabby', appearance: 'Small, fluffy cat', role: 'protagonist' }
  ],
  'zombie-process': [
    { name: 'Zombie Cat', appearance: 'Dead but listed in process table', role: 'protagonist' }
  ]
};
