#!/bin/bash
# NyanTales Build Script — Concatenates & minifies JS/CSS for production
# Usage: cd web && bash build.sh
# Output: dist/ directory with optimized files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

DIST="dist"
rm -rf "$DIST"
mkdir -p "$DIST/js" "$DIST/css" "$DIST/assets"

echo "🐱 NyanTales Build — Production Optimization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Bundle all JS files in dependency order ──
# Order matters: dependencies first, main.js last
JS_FILES=(
  "js/toast.js"
  "js/safe-storage.js"
  "js/error-boundary.js"
  "js/focus-trap.js"
  "js/confirm-dialog.js"
  "js/yaml-parser.js"
  "js/engine.js"
  "js/sprites.js"
  "js/portraits.js"
  "js/tracker.js"
  "js/audio.js"
  "js/achievements.js"
  "js/achievement-panel.js"
  "js/gallery.js"
  "js/settings.js"
  "js/settings-panel.js"
  "js/history.js"
  "js/story-intro.js"
  "js/story-info.js"
  "js/data-manager.js"
  "js/scene-select.js"
  "js/save-manager.js"
  "js/touch.js"
  "js/route-map.js"
  "js/stats-dashboard.js"
  "js/keyboard-help.js"
  "js/about.js"
  "js/ui.js"
  "js/main.js"
)

echo "📦 Bundling ${#JS_FILES[@]} JS files..."
BUNDLE="$DIST/js/nyantales.bundle.js"
echo "/* NyanTales — Bundled $(date -u +%Y-%m-%dT%H:%M:%SZ) */" > "$BUNDLE"
for f in "${JS_FILES[@]}"; do
  echo "" >> "$BUNDLE"
  echo "/* ── $(basename "$f") ── */" >> "$BUNDLE"
  cat "$f" >> "$BUNDLE"
done

# Copy js-yaml vendor lib separately (already minified)
cp js/js-yaml.min.js "$DIST/js/"

BUNDLE_SIZE=$(wc -c < "$BUNDLE")
echo "   Bundle: $(( BUNDLE_SIZE / 1024 ))KB (uncompressed)"

# ── 2. Minify JS (simple whitespace/comment removal if terser available) ──
if command -v npx &>/dev/null && npx --yes terser --version &>/dev/null 2>&1; then
  echo "🔧 Minifying JS with terser..."
  npx --yes terser "$BUNDLE" \
    --compress passes=2,dead_code=true \
    --mangle \
    --output "$DIST/js/nyantales.bundle.min.js" 2>/dev/null
  MIN_SIZE=$(wc -c < "$DIST/js/nyantales.bundle.min.js")
  echo "   Minified: $(( MIN_SIZE / 1024 ))KB ($(( (BUNDLE_SIZE - MIN_SIZE) * 100 / BUNDLE_SIZE ))% smaller)"
  USE_MIN=true
else
  echo "⚠️  terser not available — using unminified bundle"
  cp "$BUNDLE" "$DIST/js/nyantales.bundle.min.js"
  USE_MIN=false
fi

# ── 3. Copy & optionally minify CSS ──
echo "🎨 Processing CSS..."
cp css/style.css "$DIST/css/style.css"

CSS_ORIG=$(wc -c < css/style.css)
if command -v npx &>/dev/null && npx --yes csso --version &>/dev/null 2>&1; then
  echo "🔧 Minifying CSS with csso..."
  npx --yes csso css/style.css --output "$DIST/css/style.min.css" 2>/dev/null
else
  # Fallback: strip comments and collapse whitespace via Python
  echo "🔧 Minifying CSS (basic Python minifier)..."
  python3 -c "
import re, sys
with open('css/style.css') as f: css = f.read()
# Remove comments
css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
# Collapse whitespace around braces/colons/semicolons
css = re.sub(r'\s*{\s*', '{', css)
css = re.sub(r'\s*}\s*', '}', css)
css = re.sub(r'\s*;\s*', ';', css)
css = re.sub(r'\s*:\s*', ':', css)
css = re.sub(r'\s*,\s*', ',', css)
# Collapse runs of whitespace
css = re.sub(r'\s+', ' ', css).strip()
with open('$DIST/css/style.min.css', 'w') as f: f.write(css)
"
fi
CSS_MIN=$(wc -c < "$DIST/css/style.min.css")
echo "   CSS: $(( CSS_ORIG / 1024 ))KB → $(( CSS_MIN / 1024 ))KB"

# ── 4. Generate production index.html ──
echo "📄 Generating production index.html..."

python3 -c "
with open('index.html', 'r') as f:
    html = f.read()

html = html.replace('href=\"css/style.css\"', 'href=\"css/style.min.css\"')

lines = html.split('\n')
new_lines = []
in_js_block = False

for line in lines:
    stripped = line.strip()
    if stripped.startswith('<script src=\"js/') and stripped.endswith('</script>'):
        if not in_js_block:
            in_js_block = True
            new_lines.append('  <script src=\"js/js-yaml.min.js\"></script>')
            new_lines.append('  <script src=\"js/nyantales.bundle.min.js\"></script>')
        continue
    else:
        in_js_block = False
        new_lines.append(line)

result = '\n'.join(new_lines)
# Update OG/Twitter URLs for dist subdirectory
result = result.replace(
    'https://mechangelnyan.github.io/nyantales/web/',
    'https://mechangelnyan.github.io/nyantales/web/dist/'
)
with open('$DIST/index.html', 'w') as f:
    f.write(result)
"

# ── 5. Copy static assets ──
echo "📁 Copying assets..."
cp -r assets/* "$DIST/assets/" 2>/dev/null || true
cp manifest.json "$DIST/"

# ── 6. Generate production service worker ──
echo "⚡ Generating production service worker..."
cat > "$DIST/sw.js" << 'SWEOF'
/**
 * NyanTales — Production Service Worker
 * Single-bundle caching for optimal performance.
 */

const CACHE_NAME = 'nyantales-v19-prod';

const SHELL_FILES = [
  './',
  './index.html',
  './css/style.min.css',
  './js/js-yaml.min.js',
  './js/nyantales.bundle.min.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/stories/') && url.pathname.endsWith('.yaml')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
SWEOF

# ── 7. Summary ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Build complete!"
echo ""
echo "Files:"
ls -lh "$DIST/js/"*.js "$DIST/css/"*.css 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
echo ""
echo "HTTP requests: 30 → 3 (index.html + bundle + css)"
echo ""
echo "To test locally:"
echo "  cd $DIST && python3 -m http.server 9877"
echo "  open http://localhost:9877/"
