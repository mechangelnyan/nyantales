# NyanTales Progress

## Phase 1: Character Catalog ✅
- Extracted all named cat characters from 30 stories into `characters.yaml` (408 lines)
- Includes: name, stories, role, appearance, personality, description, tags
- Protagonist cats, NPCs, antagonists, and environment entities cataloged

## Phase 2: Character Art ✅ (Procedural Pixel Sprites)
- Built `CatSpriteGenerator` in `web/js/sprites.js` — deterministic pixel-art cat portraits
- Uses Canvas API to generate unique cats based on character name hash + appearance keywords
- Color palette adapts to appearance (orange/tabby, gray, black, white, calico, golden, etc.)
- Each character gets: randomized ear style, eye style, stripes, patches, tail direction
- `CHARACTER_DATA` object maps all 30 story slugs to their cast (name + appearance + role)
- Both 128x128 sprites (for in-scene) and 256x256 portraits available
- Sprites cached in memory for performance
- Story card thumbnails show protagonist pixel sprites
- Speaker name plate includes mini pixel portrait icon

## Phase 3: Web Visual Novel Engine ✅ (Core + Sprites + Transitions)
- **HTML** (`web/index.html`): Title screen with story grid + VN reader screen with all UI layers
- **CSS** (`web/css/style.css`): Full dark-terminal cyberpunk theme, 12+ background themes, mood colors, typewriter, scanline effects, responsive design, character sprite styles, scene transitions, ending animations
- **Sprites** (`web/js/sprites.js`): Procedural pixel cat generator + character-to-story mapping
- **Engine** (`web/js/engine.js`): Full game state engine — scenes, choices, flags, inventory, conditions (compound all/any/not), save/load, text interpolation
- **YAML Parser** (`web/js/yaml-parser.js`): Loads js-yaml from CDN, parses story YAML files
- **UI Controller** (`web/js/ui.js`): DOM rendering, typewriter text effect, scene transitions with crossfade overlay, character sprite management (entrance/exit/speaking), choice display with number hints, inventory bar, conditional text, endings with animations, background inference, mood indicators, fast mode
- **Main** (`web/js/main.js`): App bootstrap — loads all 30 story YAMLs, renders story grid with sprites, wires engine↔UI, keyboard shortcuts (1-9 for choices, Space/Enter to skip, Esc for menu), save/load via localStorage, restart/menu flow

### How to run:
```bash
cd /tmp/nyantales && python3 -m http.server 9876
# Open http://localhost:9876/web/
```

## Phase 4: Scene Backgrounds ✅ (CSS Gradients + Particles)
- CSS gradient backgrounds for 10+ themes (terminal, server-room, network, memory, filesystem, database, cafe, danger, warm, void)
- Animated grid overlay scrolling effect
- Floating particles (radial gradient dots with slow drift animation)
- Background keyword matching expanded (docker, container, git, branch, regex, loop, deploy, tls, cipher, etc.)
- Scene transition crossfade overlay when background theme changes between scenes

## Phase 5: Polish ✅
- Responsive design ✅ (mobile breakpoints at 768px, 480px, sprites scale down)
- Typewriter text ✅ (18ms/char, skip on click/space/enter)
- Scene transitions ✅ (crossfade overlay on background change)
- Character sprite animations ✅ (speaking bob, entrance fade, exit fade, glow highlight)
- Title glow animation ✅
- Mood pulse animation ✅
- Item pop animation ✅
- Ending icon pop + staggered fade-in ✅
- Location bar slide-down ✅
- Choice number hints ✅ (keyboard 1-9 shortcuts)
- Choice click feedback ✅
- Speaker portrait icons ✅
- Floating particle effect ✅
- Selection color theming ✅
- Fade-in story cards with staggered delay ✅
- Scanline overlay ✅
- Glitch + shake effects ✅
- Grid scroll animation ✅
- Keyboard shortcuts ✅

## Phase 6: Story Completion Tracking ✅
- `StoryTracker` class (`web/js/tracker.js`) — localStorage-based progress persistence
- Tracks: completed stories, unique endings discovered, total plays, best turn count per story
- Title screen shows stats bar: stories complete / endings found / total plays
- Story cards get ✅ badge + ending count when completed
- Completed cards have green border accent
- "New Ending Discovered!" flash on finding previously-unseen endings

## Phase 7: Search & Filter ✅
- Search bar on title screen — filters by title, description, slug
- Filter tabs: All / ✅ Completed / 🆕 New
- Real-time filtering with CSS class toggle (no re-render)

## Phase 8: Procedural Ambient Audio ✅
- `AmbientAudio` class (`web/js/audio.js`) — Web Audio API synthesized backgrounds
- 9 themed soundscapes: digital, server, network, memory, database, cafe, warm, danger, void
- Uses filtered noise, oscillator pads, LFO modulation, random blip patterns
- Theme changes with crossfade on scene transitions (auto-detected from bg class)
- Audio toggle: HUD button (🔊/🔇) + M keyboard shortcut
- Auto-initializes on first user interaction (browser autoplay policy)

## Phase 9: Character Gallery ✅
- `CharacterGallery` class (`web/js/gallery.js`) — browse all 45 characters from CHARACTER_DATA
- Pixel sprite portraits generated per character via CatSpriteGenerator
- Search by name/appearance, filter by role (All / Heroes / NPCs)
- Story tags on each card — click to jump directly into that story
- Accessible from title screen via "🐱 Characters" button
- Responsive grid layout, modal overlay with backdrop blur

## Phase 10: Achievement System ✅
- `AchievementSystem` class (`web/js/achievements.js`) — 16 achievements
- Achievement categories: progress milestones, play count, speed/patience, specific story combos
- Animated toast notifications on unlock (slides in from top, icon pop animation)
- Achievement panel modal (🏆 button on title screen) — shows locked/unlocked state
- Stats bar on title screen now shows achievement progress (X/16)
- Checks after: story endings, story starts, and on boot
- Achievements: First Boot, Curious Cat, Bookworm, Completionist, Path Explorer, Multiverse Traveler, Speedrunner, Patient Explorer, Replay Value, Terminal Addict, Terminal OG, Debug Master, Network Cat, Escape Artist, Memory Expert, Night Owl

## Phase 11: AI Portrait Integration ✅
- `PortraitManager` class (`web/js/portraits.js`) — maps character names to AI-generated portrait images
- 6 characters have AI portraits: Nyan, Byte, Mochi, Pixel, Query, Inspector Whiskers
- Graceful fallback: characters without AI portraits use procedural pixel sprites
- Portrait integration points: story cards (circular crop), in-game sprites (rounded corners), speaker name plates (mini portrait), character gallery
- AI portraits render with smooth anti-aliasing (no pixelated), glow borders when speaking
- Responsive sizing at all breakpoints
- Portraits preloaded on boot to prevent flash of unstyled content
- Image generation scripts moved to `tools/` directory

## Phase 12: Visual Polish Round ✅
- Vignette overlay on VN container (radial gradient darkening edges for cinematic feel)
- Textbox subtle cyan glow above border for depth and atmosphere
- Blinking terminal cursor on title screen subtitle
- README updated with web visual novel documentation
- LoRA model files added to .gitignore

## Phase 13: Settings, Auto-Play, History, Skip-Read ✅
- `SettingsManager` class (`web/js/settings.js`) — persistent user preferences via localStorage
  - Text speed (slider: 2ms–40ms per chunk), auto-play on/off, auto-play delay (0.5s–6s)
  - Skip-read-scenes toggle, screen shake/glitch effects toggle, particles toggle
  - Audio volume slider, fullscreen toggle
  - Reset to defaults button
- `SettingsPanel` class (`web/js/settings-panel.js`) — full settings overlay UI
  - Grouped by: Text, Visual, Audio sections
  - Sliders with live value labels, styled ON/OFF toggle buttons
  - Responsive at all breakpoints
  - Opens via ⚙️ HUD button or 'S' key, closes with ✕ or Escape
- `TextHistory` + `HistoryPanel` classes (`web/js/history.js`) — text backlog system
  - Records all dialogue/narration: speaker name + text + scene ID
  - Scrollable modal panel, auto-scrolls to latest entry
  - Opens via 📜 HUD button or 'H' key
  - Clears on story restart or menu return
- **Auto-Play mode** — auto-advances narration scenes after configurable delay
  - Green pulsing "AUTO" indicator on screen when active
  - Pauses at choices and endings (requires manual selection)
  - Toggle via ▶️ HUD button or 'A' key
  - Delay configurable in settings (500ms–6000ms)
- **Skip-Read-Text** — fast-forwards through previously visited scenes
  - Temporarily enables fast mode for scenes in the `visited` set
  - Auto-advances no-choice scenes with only `next` links
  - Yellow "⏭ SKIP" indicator when active
  - Toggle in settings panel
- New HUD buttons: ▶️ Auto-Play, 📜 History, ⚙️ Settings
- New keyboard shortcuts: A (auto-play), H (history), S (settings)
- Settings react live: changing text speed immediately affects typewriter
- Particle overlay can be toggled off for performance (`.no-particles` body class)

## Phase 14: GitHub Pages Deployment ✅
- GitHub Actions workflow (`.github/workflows/deploy.yml`) — deploys on push to main
  - Uses `actions/deploy-pages@v4` with full repo artifact
  - Concurrency group prevents overlapping deploys
- Root `index.html` redirects to `web/` for clean URL on Pages
- README updated with live GitHub Pages link
- **URL:** https://mechangelnyan.github.io/nyantales/web/

## Phase 15: Save Slots, Touch Gestures, PWA ✅
- `SaveManager` class (`web/js/save-manager.js`) — multiple save slots per story
  - 3 manual slots + 1 auto-save slot per story
  - Auto-saves after every scene transition
  - Save/Load panel UI with mode toggle, slot preview (text, speaker, turns, scenes visited, timestamp)
  - Delete individual slots, flash feedback on save
  - Legacy save migration from old `nyantales-save-{slug}` format
  - `getMostRecentSave()` scans all stories for "Continue" button
  - Opens via 💾 HUD button or 'Q' keyboard shortcut
- `TouchHandler` class (`web/js/touch.js`) — mobile gesture support
  - Swipe left → advance text / go to next scene
  - Swipe right → open text history
  - Swipe down → open settings
  - Min 50px distance, max 400ms window for gesture detection
  - Single-touch only (ignores multi-touch)
- **PWA Support** — installable as app, offline-capable
  - `manifest.json` with app name, theme color, icons
  - `sw.js` service worker: cache-first for static, network-first for story YAML files
  - PWA icons (192x192, 512x512) generated as neon cat face on dark bg
  - Apple mobile web app meta tags
  - Viewport `viewport-fit=cover` for notch/island phones
- **"Continue" button** on title screen
  - Shows most recent save across all stories (title + turns)
  - Green pulsing accent, loads directly into saved state
  - Hidden when no saves exist
- **Bug Fixes**
  - `tracker.recordEnding()` — `isNewEnding` logic was inverted (always reported old endings as new)
  - `main.js` no longer monkey-patches `ui._showEnding` each time `startStory` runs — uses clean `_onEndingHook` callback
  - Save indicator (💾) shown on story cards that have existing saves
- **CSS Additions**
  - Continue button styles with pulse animation
  - Save/Load panel overlay with slot cards
  - Safe area padding for notch/island phones (`env(safe-area-inset-*)`)
- **Code Quality**
  - `startStory` and `initEngine` cleanly separated (no repeated event binding)
  - Audio theme update moved to `playScene` (not monkey-patched onto renderScene)
  - All 15 JS files pass `node --check` syntax validation

## Phase 16: Accessibility & Loading Polish ✅
- **Loading screen** — animated cat + progress bar during boot, smooth fade-out when ready
- **ARIA semantics throughout**:
  - `role="dialog"` + `aria-label` on all modal overlays (settings, history, save/load, achievements, gallery)
  - `role="toolbar"` on HUD and title action bars
  - `role="list"` / `role="listitem"` on story grid and cards
  - `role="tablist"` / `role="tab"` + `aria-selected` on filter tabs
  - `role="log"` + `aria-live="polite"` on textbox for screen reader narration
  - `role="status"` on location bar and inventory
  - `role="progressbar"` on story card completion bars
  - `aria-pressed` state tracked on toggle buttons (audio, auto-play)
- **Focus trap utility** (`web/js/focus-trap.js`) — Tab/Shift+Tab cycles within modal, restores focus on close
  - Integrated into: SettingsPanel, HistoryPanel, SaveManager
- **Keyboard navigation** — story cards are focusable with `tabindex="0"`, activate with Enter/Space
- **Screen reader support** — `sr-only` class for visually hidden labels, `h1` for title screen
- **`prefers-reduced-motion`** — all animations/transitions disabled when user prefers reduced motion
- **`prefers-contrast: more`** — high contrast mode: thicker borders, brighter text, opaque backgrounds
- **`color-scheme: dark`** meta tag for browser UI consistency
- **Keyboard shortcut hints** — toast shown on first story entry with key bindings (Space, 1-9, A, H, S, Q, Esc)
- **Story card progress bars** — thin bar at bottom of each card showing completion %
- **Service worker** cache bumped to v2 with focus-trap.js

## Phase 17: Rewind, Color Themes, Progress Tracking, QoL ✅
- **Rewind button** (⏪) — go back one scene using engine history
  - New HUD button between ⏎ and 💾, keyboard shortcut `B`
  - Visual opacity feedback (dim when no history, bright when rewind available)
  - Restores previous scene, decrements turn counter
- **Color theme selector** — 5 accent color themes in settings
  - Themes: Cyan (default), Magenta, Green, Amber, Violet
  - Swatch buttons in Visual section of settings panel
  - Live-updates `--accent-cyan` CSS variable + meta theme-color
  - Persisted to localStorage
- **Scene-level progress tracking** — story card progress bars now show actual % explored
  - `StoryTracker.recordVisitedScenes()` merges engine's visited set into persistent data
  - `getProgress(slug, totalScenes)` calculates real percentage
  - Progress bars update based on actual scenes visited (not just 0%/100%)
  - Migration: old tracker entries get `visitedScenes: []` on access
- **Reading time estimates** — story cards show `⏱ ~X min` and `📄 Y scenes`
  - Calculated from word count across all scenes (~200 wpm)
  - Displayed as `.story-card-meta` below description
- **Space/Enter advance** — now advances to next scene when text is fully displayed
  - Previously only skipped typewriter; now also progresses the story
- **Keyboard hints** updated with `B` for Back
- **Service worker** cache bumped to v3

## Phase 18: Story Sorting, Data Management, Offline Polish ✅
- **Story sorting** — 6 sort options in title screen dropdown
  - A → Z (default), Z → A, Recently Played, Most Progress, Shortest First, Longest First
  - Sorts by reordering DOM elements (no re-render needed)
  - Story cards carry `data-read-mins`, `data-progress`, `data-last-played` attributes
  - `<select>` dropdown styled to match cyberpunk theme
  - Works alongside search + filter (composable)
- **Data export/import** — `DataManager` class (`web/js/data-manager.js`)
  - Exports all NyanTales localStorage data (tracker, achievements, settings, all save slots) as JSON
  - Downloads as `nyantales-backup-YYYY-MM-DD.json`
  - Import reads JSON file, validates keys, merges into localStorage
  - Data stats: shows stories tracked, save file count, estimated storage usage
  - Export/Import buttons in Settings panel → Data section
- **Online/offline notifications** — toast messages for network state changes
  - "📶 Back online" / "📴 Offline — saves still work!"
  - Auto-dismissing, non-blocking toasts
- **Service worker** cache bumped to v4 with data-manager.js
- **Code quality** — all 17 JS files pass `node --check` syntax validation

## Phase 19: Scene Select + Safety Guardrails ✅
- **Confirmation dialog system** (`web/js/confirm-dialog.js`) — reusable modal for destructive actions
  - Delete-save confirmation in Save/Load panel
  - Settings reset confirmation
  - Data import confirmation before merge/overwrite risk
- **Scene Select panel** (`web/js/scene-select.js`) — jump to any previously visited scene in the current playthrough state
  - Opens via new 📍 HUD button or `G` keyboard shortcut
  - Search/filter scenes by ID, speaker, location, or preview text
  - Shows current scene badge, ending markers, and choice counts
  - Escape closes panel before exiting to menu
- **Engine support** — `StoryEngine.jumpToScene()` preserves current inventory/flags while revisiting unlocked scenes
- **UI polish**
  - New Scene Select HUD button added to `web/index.html`
  - Keyboard shortcut hints updated with `G` for Scenes
  - Added modal/panel styling for confirmation + scene select overlays
- **Code quality**
  - Added/expanded JSDoc in touched modules
  - All JS files pass `node --check`

## Phase 20: Rewind Fix, Font Size, Random Story, Progress HUD ✅
- **Accurate rewind** — `StoryEngine.rewindScene()` now uses state snapshots
  - Previous rewind only restored the scene ID; inventory/flags were left as-is (bug)
  - Now snapshots full state (scene, inventory, flags, turns) at each transition
  - Snapshots capped at 200 entries to prevent memory bloat
  - Save/load preserves snapshot history
- **Font Size setting** — adjustable text size (80%–140%) in Settings → Visual
  - CSS custom property `--text-scale` applied to `.vn-text` and `.choice-btn`
  - Live-reactive (changes immediately when slider moves)
  - Persisted to localStorage
- **Random Story button** — 🎲 on title screen, prefers unplayed stories
  - Falls back to any story if all completed
- **In-game Progress HUD** — bottom-right corner shows `📍 visited/total · Turn N`
  - Subtly faded (0.45 opacity), brightens on hover
  - Updates after every scene render
- **Code quality** — `_syncAll` in settings panel now uses correct formatter for text speed labels (was showing raw ms instead of "Fast"/"Normal" etc.)
- SW cache bumped to v6

## Phase 21: Story Info Modal, Mobile HUD, QoL ✅
- **Story Info Modal** (`web/js/story-info.js`) — detailed per-story statistics panel
  - Shows: protagonist portrait, title, description, reading time, scene count
  - 4-stat grid: exploration %, total plays, best turns, endings found
  - Lists all discovered ending names as styled tags
  - Last played timestamp
  - Quick-play and Continue (loads most recent save slot) buttons
  - Focus trap for keyboard accessibility, Escape to close
  - Responsive layout (2-col stats on small screens, stacked header on very small)
- **Story card info button** (ℹ) — appears on hover, opens info modal without starting the story
  - Stops click propagation (doesn't trigger story start)
- **Collapsible mobile HUD** — overflow toggle button (⋯) for screens < 600px
  - Core buttons always visible: Back, Rewind, Save/Load
  - Less-used buttons (Fast, Auto, History, Scenes, Settings, Audio) collapse behind toggle
  - Toggle switches between ⋯ and ✕ icons
- **Code quality** — .gitignore updated to exclude test artifacts (test-results/, playwright.config.js)
- SW cache bumped to v7 with story-info.js
- All JS files pass `node --check` validation

## Phase 22: Keyboard Help, About Panel, Code Quality ✅
- **Keyboard Help modal** (`web/js/keyboard-help.js`) — full shortcut reference
  - Shows all keyboard shortcuts + mobile gestures in categorized sections
  - Opens via `?` key or ❓ HUD button, closes with Escape or backdrop click
  - Focus-trapped for accessibility
  - First-time visitors get a brief toast pointing to `?` for help
- **About / Credits panel** (`web/js/about.js`) — project info and stats
  - Displays story count, character count, achievement progress
  - Feature list, tech stack summary, GitHub link
  - ASCII cat art, styled to match cyberpunk theme
  - Opens via ℹ️ About button on title screen
- **Bug fixes & code quality**
  - Removed `user-scalable=no` from viewport meta (accessibility anti-pattern)
  - Added `js-yaml.min.js` to service worker pre-cache (was missing → broke offline)
  - Removed duplicate `DataManager` instantiation in main.js
  - Added try/catch + scene validation to story YAML loader (prevents silent failures)
  - Added `<noscript>` fallback message for users without JavaScript
  - Escape key priority chain updated for new panels
- SW cache bumped to v8

## Phase 23: Statistics Dashboard, History Export, Mobile Polish ✅
- **Statistics Dashboard** (`web/js/stats-dashboard.js`) — comprehensive player analytics panel
  - Global summary cards: stories complete, endings found, scenes explored, total plays, achievements, active saves
  - Progress bars on each summary card with colored fills
  - "Recently Played" section with relative timestamps and quick-play clicks
  - Full per-story breakdown table: title, progress bar, endings found/total, play count, best turns
  - Completed stories highlighted in green, unplayed stories dimmed
  - Opens via 📊 Stats button on title screen
  - Focus trap for keyboard accessibility, Escape to close
- **History Export** — download text backlog as `.txt` file
  - New "📥 Export" button in history panel header
  - Generates formatted text with speaker names, timestamps, entry count
  - Downloads as `nyantales-history-YYYY-MM-DD.txt`
  - Toast notification on successful export
- **Landscape mobile optimizations** — `@media (max-height: 500px) and (orientation: landscape)`
  - Compact textbox (100px min-height, 45vh max), smaller text (0.82rem)
  - Smaller sprites (64px pixel / 96px AI), compact HUD buttons
  - Tighter title screen spacing (smaller ASCII art, subtitle, stats)
  - Compact ending overlay (smaller icon, text, buttons, stat grid)
  - Story grid uses full available height
- **CSS bug fix** — removed duplicate `max-height` declaration on `.vn-textbox` (60vh was being overridden by 40vh)
- **Service worker** cache bumped to v9 with stats-dashboard.js
- All 26 JS files pass `node --check` validation

## Phase 24: Favorites, History Search, Ending Share ✅
- **Story Favorites** — heart button on each story card
  - `StoryTracker.toggleFavorite()` / `isFavorite()` / `getFavorites()` — persisted in localStorage
  - Heart button (🤍/❤️) on story cards, visible on hover, always visible when favorited
  - Smooth scale animation on click, toast feedback on toggle
  - New "❤️ Favorites" filter tab on title screen
  - New "Favorites First" sort option (favorites sorted alphabetically, then non-favorites)
  - `data-favorite` attribute on cards for filter/sort integration
- **History Search** — search bar in the text history panel
  - `<input>` with real-time filtering by speaker name or dialogue text
  - Count label updates to show `X/Y matching` during search
  - `data-searchable` attribute on each entry for efficient filtering
  - Styled to match cyberpunk theme, focus border accent
- **Ending Share Card** — copy ending summary to clipboard or native share
  - New "📋 Share" button on ending overlay
  - Generates formatted text: story title, ending name, stats (turns, scenes, items), play URL
  - Uses Web Share API on mobile (native share sheet), clipboard fallback on desktop
  - Toast feedback on copy success/failure
- **CSS additions** — `.story-card-fav-btn` (positioned, hover reveal, pressed state), `.history-search-wrap`, `.ending-btn-share`
- **Service worker** cache bumped to v10
- All 26 JS files pass `node --check` validation

## Phase 25: Code Quality & QoL Polish ✅
- **Fullscreen synchronization** — `F` keyboard shortcut, settings panel toggle, and browser UI (Esc) all stay in sync
  - Settings panel fullscreen button now uses `settings.set('fullscreen')` instead of direct DOM
  - `fullscreenchange` event listener on `main.js` syncs setting when exiting via browser UI
  - Keyboard help modal updated with `F` shortcut
- **Debounced search** — filter input debounced at 80ms for smoother typing performance
- **Filter count indicator** — shows `X stories` label when search or filter is active
  - Positioned inside the search input area, auto-hidden when filter is clear
- **GPU animation hints** — `will-change: transform, opacity` on animated elements
  - Applied to: scene transitions, sprites, story cards, toasts, auto/skip indicators
- **Touch device polish** — `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`
  - Applied to: HUD buttons, choice buttons, gallery/achievement buttons, filter tags
  - Prevents double-tap-to-zoom delay on mobile
- **Code documentation** — `renderTitleScreen()` documented as safe for repeated calls
- SW cache bumped to v11
- All 26 JS files pass `node --check` validation

## Phase 26: Route Map & SW Update Banner ✅
- **Story Route Map** (`web/js/route-map.js`) — interactive canvas-based branching graph
  - Visualizes all scenes as nodes in a topologically-layered layout
  - Edges show connections with choice labels on branching paths
  - Node states: visited (cyan border), unvisited (dim), current (green glow), endings (gold)
  - Ending nodes distinguished by type: good (green), bad (red), secret (purple), neutral (gold)
  - Pan (mouse drag / touch), zoom (scroll wheel / buttons), fit-to-view (⊡ button)
  - Tooltip on hover with scene ID, speaker, type, visit status
  - Legend showing color meanings
  - Focus trap for keyboard accessibility
  - Opens via 🗺️ HUD button or `R` keyboard shortcut
- **Service Worker update notification** — banner when new version available
  - Detects `updatefound` → `installed` state change with existing controller
  - Shows non-blocking bottom banner with "Reload" button and dismiss ✕
  - Styled to match cyberpunk theme with slide-in animation
  - Responsive: full-width on mobile
- **Keyboard help** updated with `R` for Route Map
- SW cache bumped to v12 with route-map.js
- All 27 JS files pass `node --check` validation

## Phase 27: Code Quality Refactor + Polish ✅
- **Achievement Panel extraction** — moved inline achievement rendering from main.js into `AchievementPanel` class (`web/js/achievement-panel.js`)
  - Focus trap via `FocusTrap` utility for keyboard accessibility
  - `role="dialog"` + `aria-label` for screen readers
  - Progress bar showing unlock % at top of panel
  - Visual divider between unlocked and locked achievements
  - Escape key closes panel (added to priority chain)
- **Text Speed Preview** — live typewriter demo in settings panel
  - Shows "The terminal cat blinked at the blinking cursor…" at current speed
  - Reruns on speed slider change, clears on panel hide
  - Runs on panel open for immediate feedback
  - Styled with left border accent and monospace font
- **Textbox auto-scroll** — typewriter, skip, and fast mode all auto-scroll textbox to bottom
  - Keeps text visible during long passages (especially on mobile)
  - `scroll-behavior: smooth` on `.vn-textbox`
  - Custom scrollbar styling on textbox container
- **Debug cleanup** — removed `console.log` from PortraitManager
- **README** — updated feature list to cover all 28 features from Phases 1-27
- SW cache bumped to v13 with achievement-panel.js
- All 28 JS files pass `node --check` validation

## Phase 28: QoL Polish, Reading Time, Transitions ✅
- **Toast queue system** — max 3 visible toasts at once
  - Oldest toast auto-dismissed when new ones exceed the cap
  - Tracks active toasts in `Toast._activeToasts` array
  - Properly removes from tracking array on dismiss
- **History panel keyboard navigation** — scroll through text backlog with keyboard
  - `Page Up` / `Page Down` scrolls by ~80% of visible height (smooth)
  - `Arrow Up` / `Arrow Down` scrolls by 60px (small step)
  - `Home` / `End` jumps to start/end of backlog
  - Keyboard handler attached on show, removed on hide (no leaks)
  - Doesn't interfere with search input focus
- **Smooth screen transitions** — improved title ↔ story animation
  - New `.screen.entering` CSS class: subtle scale(1.02) + blur(2px) fade-in
  - `.screen.exiting` now uses scale(0.97) + blur(4px) fade-out
  - Uses double-rAF for clean animation without display:none flash
  - `will-change: opacity, transform` for GPU compositing
- **Thin top-of-screen progress bar** — accent-colored glowing bar
  - Shows story exploration % at the very top of the VN container
  - 2px height, expands to 3px on container hover
  - Smooth width transition, hidden on menu return
- **Auto-play pauses when panels are open**
  - `isAnyPanelOpen()` helper checks settings, history, save, scene select, route map, keyboard help
  - `scheduleAutoAdvance()` skips scheduling when any panel is visible
  - Auto-play resumes when panels are closed via Escape key
- **Swipe up gesture** on mobile opens save/load panel
  - New `onOpenSave` callback in `TouchHandler`
  - Documented in keyboard help modal under Mobile Gestures
- **Reading time on ending screen**
  - Tracks `storyStartTime` when entering a story
  - Displays elapsed time as first stat in ending overlay stats grid
  - Format: `Xm Ys` or `Ys` for short reads
- **Keyboard help updated** with history nav keys (PgUp/PgDn/Home/End) and swipe up gesture
- SW cache bumped to v14
- All 28 JS files pass `node --check` validation
- 2 commits pushed

## Phase 29: Error Boundary, SafeStorage, OG Tags, Bug Fixes ✅
- **Error Boundary** (`web/js/error-boundary.js`) — global error/rejection handler
  - Catches uncaught errors and unhandled promise rejections
  - Shows non-blocking toast ("Something went wrong — your saves are safe")
  - Doesn't crash the app or lose current state
- **SafeStorage class** — localStorage wrapper with quota-exceeded resilience
  - `SafeStorage.getJSON(key, fallback)` — parse + fallback on corrupt/missing data
  - `SafeStorage.setJSON(key, value)` — handles QuotaExceededError with auto-eviction
  - Evicts oldest auto-save slot when storage is full, then retries
  - `estimateUsage()` for NyanTales key byte count
  - Integrated into: SettingsManager, StoryTracker, SaveManager (with raw localStorage fallback)
- **Open Graph + Twitter Card meta tags** — rich link previews when sharing URL
  - og:title, og:description, og:image (512px icon), og:url, og:site_name
  - twitter:card (summary), twitter:title, twitter:description, twitter:image
- **Memory leak fixes**
  - `StoryIntro`: keydown handler now removed on click/timeout dismiss (was leaking)
  - `ConfirmDialog`: keydown handler now removed on button click (was leaking)
- **Progress HUD throttling** — skips DOM writes when pct/turns unchanged (reduces layout thrash during skip mode)
- **Empty filter state** — shows helpful message with contextual hints when search/filter returns no stories
  - Different messages for favorites ("Tap 🤍 to favorite"), completed ("Start playing!"), and search ("Try a different search")
- SW cache bumped to v15 with error-boundary.js
- All 29 JS files pass `node --check` validation
- README updated with error boundary + OG tag features
- 2 commits pushed

## Phase 30: Code Quality Refactor — Extract SafeStorage, Fix Panel State, DRY Toggles ✅
- **SafeStorage extraction** — moved `SafeStorage` class from `error-boundary.js` into its own `web/js/safe-storage.js`
  - Was sharing a file with unrelated global error handlers (confusing coupling)
  - Clean separation: `safe-storage.js` = localStorage wrapper, `error-boundary.js` = error handling
  - Added to index.html script chain (loads after toast.js, before error-boundary.js)
- **isAnyPanelOpen() fix** — added 4 missing panel checks: `achPanel`, `aboutPanel`, `statsDashboard`, `storyInfo`
  - Bug since Phase 28: auto-play could resume behind these open panels
  - Now all 10 overlay panels are checked before scheduling auto-advance
- **achPanel hoisted** — moved `const achPanel` from line 1050 to init block (line ~42)
  - Avoids temporal dead zone risk (was a `const` used in closure before declaration)
- **togglePanel() helper** — new DRY utility for show/hide toggle patterns
  - Replaced ~40 lines of repetitive `panel.isVisible ? panel.hide() : panel.show(...)` code
  - Used in all keyboard shortcut handlers and HUD button click handlers
- **Cleanup** — removed duplicate comment block ("Online/Offline Notifications" appeared twice)
- SW cache bumped to v16 with safe-storage.js
- All 30 JS files pass `node --check` validation

## Phase 31: Production Build Pipeline ✅
- **Build script** (`web/build.sh`) — concatenates & minifies all JS/CSS for production deployment
  - Bundles 29 app JS files into single `nyantales.bundle.js` (225KB uncompressed)
  - Minifies with terser: 225KB → 132KB (41% reduction)
  - CSS minification: 93KB → 68KB (Python fallback when csso unavailable)
  - HTTP requests reduced from 30+ to 3 (index.html + bundle.min.js + style.min.css)
  - Outputs to `web/dist/` directory
- **Production service worker** — caches the optimized single bundle instead of 30 files
  - Cache version `nyantales-v17-prod`
  - Same cache-first/network-first strategy as dev SW
- **GitHub Actions CI updated** — runs build step before deploying to Pages
  - Installs Node.js 20, runs `cd web && bash build.sh`
  - Full repo uploaded (dist/ + stories/)
- **Root redirect** updated to point to `web/dist/` (optimized build)
- **OG URLs** updated in dist build to reference correct dist path
- **README** updated with production build instructions and output sizes
- `web/dist/` added to `.gitignore` (CI generates it fresh)

## Phase 33: Touch Gesture Suspension, Skip Link, 404 Page, QoL ✅
- **Touch gesture suspension during panels** — fixes swipe gestures firing behind open overlays
  - `TouchHandler.suspend(bool)` — new method, checked alongside `enabled` in `_onTouchEnd`
  - `syncTouchSuspension()` in main.js — called on every panel show/hide/toggle
  - Previously: swiping while settings/history/save panels open could trigger advance/history/save actions underneath
- **Skip-to-content link** — accessibility improvement for keyboard/screen reader users
  - Visually hidden `<a href="#story-list">Skip to stories</a>` appears on Tab focus
  - CSS: `.skip-link` with focus-visible positioning at top of page
- **GitHub Pages 404 page** — themed 404.html at repo root
  - Styled to match NyanTales cyberpunk aesthetic (cat ASCII art, dark bg, cyan accent)
  - Links back to main page
- **Removed test artifact** — deleted `web/assets/test_cat.png` (420KB wasted space)
- **Story card lazy loading** — sprite `<img>` tags now use `loading="lazy" decoding="async"`
  - Defers offscreen sprite rendering for faster initial paint with 30 cards
- **CSS additions** — `.skip-link` styles, `.new-save-badge` pulse animation
- SW cache bumped to v18
- Production build regenerated (133KB bundle)
- All 30 JS files pass `node --check` validation

## Still Possible Future Work
- Generate remaining character portraits (GPU timeout issue — needs investigation, possibly during lower GPU load)
- AI-generated scene background images
- More advanced sprite animations (idle, emote variants)
- Style consistency pass on existing portraits (3 different styles detected: realistic cat, anime catgirl, victorian anthropomorphic)
- Chapter/route progress tracking (% completion per story)
- ~~Accessibility: screen reader support, high-contrast mode, reduced motion~~ ✅ Done in Phase 16

## Phase 32: Bug Fix — Dist Story Path + Code Quality ✅
- **Critical fix:** `storyBasePath()` now detects `/web/dist/` path and returns `../../stories`
  - Production build was broken — stories wouldn't load when served from `web/dist/` on GitHub Pages
  - Root cause: path check only looked for `/web/`, returning `../stories` which resolves to `web/stories/` (wrong)
  - Fix adds explicit `/web/dist` check that returns `../../stories` (correct: goes to repo root `stories/`)
- **Share URL simplified** — ending share text now uses root URL `https://mechangelnyan.github.io/nyantales/` (redirect handles routing)
- **README** — play link updated to root URL
- **Dead code removal** — removed unused `rgb` property from `COLOR_THEMES` object (was never referenced anywhere)
- **JSDoc** — added documentation to key VNUI public methods (showTitleScreen, showStoryScreen, renderStoryList, renderScene, typewriterText)
- **Service worker** cache bumped to v17
- Production build regenerated (133KB minified bundle)
- All 30 JS files pass `node --check` validation
- 2 commits pushed

## Phase 34: Code Quality — Dynamic Title, Debounced Tracker, Visibility Pause ✅
- **Dynamic document title** — browser tab shows current story name during play
  - `startStory()` sets `document.title` to `${story.title} — NyanTales`
  - `returnToMenu()` resets to `NyanTales — Visual Novel`
  - Helps distinguish multiple NyanTales tabs
- **Debounced StoryTracker saves** — coalesces rapid localStorage writes
  - `_save()` now debounced at 500ms — during skip mode, dozens of `recordVisitedScenes()` calls collapse into a single write
  - `_saveNow()` for immediate flush on critical actions: `recordEnding()`, `toggleFavorite()`
  - Reduces localStorage I/O during fast skip by ~90%
- **Auto-play pauses on tab visibility change** — `visibilitychange` listener
  - Hidden tab → clear auto-play timer (saves CPU, prevents unexpected advances)
  - Visible tab → resume auto-play if enabled and no panels open
- **CSS `contain: content`** on `.story-card` — paint isolation for 30+ card grid
  - Browser can skip re-painting off-screen cards during hover/animation
- **Resource preloading** — `<link rel="preload" href="js/js-yaml.min.js" as="script">`
  - Critical path: YAML parser is needed before stories can load
  - Added `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` (font files served from different origin than CSS)
- SW cache bumped to v19 (dev) and v19-prod (build)
- Production build regenerated (133KB bundle)
- All 30 JS files pass `node --check` validation

## Log (continued)
- 2026-03-26 (3:27 AM): Phase 34 — Dynamic document title, debounced StoryTracker saves (500ms coalesce for skip mode, immediate for endings/favorites), auto-play pause on tab hidden, CSS contain:content on story cards, preload hints, preconnect to gstatic. SW v19. All 30 JS pass. Committed & pushed.
- 2026-03-26 (2:27 AM): Phase 33 — Touch gesture suspension (swipe gestures now blocked behind open panels), skip-to-content link for a11y, GitHub Pages 404.html, removed test_cat.png (420KB), lazy loading for story card sprites. SW cache v18. All 30 JS pass. Committed & pushed.
- 2026-03-26 (1:27 AM): Phase 32 — Fixed critical bug: dist build couldn't load stories (storyBasePath returned wrong relative path for /web/dist/). Fixed share URL, removed dead code (COLOR_THEMES.rgb), added JSDoc to VNUI. SW cache v17. 2 commits pushed.
- 2026-03-26 (12:27 AM): Phase 31 — Production build pipeline: build.sh bundles 30 JS files into single minified bundle (225KB→132KB, 41% smaller), CSS minified (93KB→68KB), HTTP requests 30→3. Production service worker, CI updated with build step, root redirect to dist/, OG URL fixes. README updated. Committed & pushed.
- 2026-03-25 (11:27 PM): Phase 30 — Code quality refactor: extracted SafeStorage into own file (was crammed in error-boundary.js), fixed isAnyPanelOpen() missing 4 panels (achPanel/aboutPanel/statsDashboard/storyInfo — auto-play bug), hoisted achPanel to init block, added togglePanel() DRY helper (saves ~40 lines), removed duplicate comment. SW cache v16. All 30 JS pass. Committed & pushed.
- 2026-03-25 (10:27 PM): Phase 29 — Error boundary + SafeStorage (global error handler, localStorage quota handling with auto-eviction), Open Graph + Twitter Card meta tags for rich link previews, fixed memory leaks in StoryIntro + ConfirmDialog (keydown handlers), progress HUD throttling, empty filter state with contextual hints. SaveManager/Settings/Tracker all use SafeStorage. SW cache v15. All 29 JS pass. 2 commits pushed.
- 2026-03-25 (9:27 PM): Phase 28 — Toast queue (max 3 visible), history panel keyboard nav (PgUp/PgDn/Home/End/arrows), smooth screen transitions with scale+blur, top-of-screen progress bar, auto-play pauses when panels open, swipe up for save/load, reading time shown on endings, keyboard help updated. SW cache v14. All 28 JS pass. 2 commits pushed.
- 2026-03-25 (8:27 PM): Phase 27 — Code quality refactor: extracted AchievementPanel class from main.js (with focus trap + progress bar + a11y), added text speed preview in settings panel, textbox auto-scroll during typewriter, removed debug console.log, updated README with all 28 features. SW cache v13. All 28 JS pass. 3 commits pushed.
- 2026-03-25 (7:27 PM): Phase 26 — Story Route Map (canvas-based interactive branching graph with pan/zoom/tooltips), SW update notification banner, R keyboard shortcut. SW cache v12. All 27 JS pass. Committed & pushed.
- 2026-03-25 (6:27 PM): Phase 25 — Fullscreen sync (F key + settings + browser UI), debounced search, filter count indicator, GPU will-change hints, touch-action/tap-highlight polish, code docs. SW cache v11. All 26 JS pass. Committed & pushed.
- 2026-03-25 (5:27 PM): Phase 24 — Story favorites system (heart button + filter tab + sort option), history panel search bar for filtering dialogue, ending share card with Web Share API + clipboard fallback. CSS for new components. SW cache v10. All 26 JS files pass. Committed & pushed.
- 2026-03-25 (4:27 PM): Added Statistics Dashboard with per-story breakdown table, global progress cards, recently played section. Added history export as .txt download. Landscape mobile media queries for compact layout. Fixed duplicate max-height CSS bug on textbox. SW cache v9. All 26 JS files pass. Committed & pushed.
- 2026-03-25 (3:27 PM): Added keyboard help modal (? key + ❓ HUD button), about/credits panel (ℹ️ title button), fixed missing SW cache entry for js-yaml.min.js, removed user-scalable=no a11y issue, removed duplicate DataManager, added error handling to story loader, added <noscript> fallback. All 25 JS files pass. Committed & pushed.

## Log
- 2026-03-24: Built complete web visual novel engine (ui.js + main.js). All 30 stories load and play in browser. Core VN loop works: title screen → story select → scene rendering → choices → state tracking → endings → restart/menu.
- 2026-03-24 (late): Added procedural pixel cat sprite system (sprites.js). Characters appear as pixel-art cats during scenes, with speaking highlights and transitions. Story cards show protagonist thumbnails. Scene crossfade transitions. Extensive CSS polish: animations, particles, mood colors, responsive sprites, ending animations, choice number hints. Committed & pushed.
- 2026-03-25 (late): Added story completion tracking (tracker.js), search/filter on title screen, and procedural ambient audio engine (audio.js). 9 themed soundscapes synthesized via Web Audio API. Stats bar, completion badges, filter tabs. Committed & pushed.
- 2026-03-25 (12:27 AM): Added Character Gallery (gallery.js) — browse all 45 characters with pixel sprites, search/filter, click story tags to play. Added Achievement System (achievements.js) — 16 achievements with animated toast unlocks and modal panel. Stats bar shows achievement progress. Committed & pushed.
- 2026-03-25 (1:27 AM): Integrated AI character portraits into web VN engine. Created PortraitManager for 6 characters with graceful fallback. Added vignette, textbox glow, blinking cursor polish. Updated README. Moved generation scripts to tools/. Attempted new portrait generation but GPU hit Metal timeout errors — deferred to future session. Committed & pushed (3 commits: portrait integration, tools reorganization, visual polish).
- 2026-03-25 (6:27 AM): Major web engine polish — settings menu, auto-play mode, text history/backlog, skip-read-text. 3 new JS modules (settings.js, settings-panel.js, history.js). 3 new HUD buttons + keyboard shortcuts (A/H/S). Settings persist to localStorage with live reactivity. Set up GitHub Pages deployment via Actions workflow. Root index.html redirect. README updated with Pages link + new features. Committed & pushed.
- 2026-03-25 (7:27 AM): Save slots, touch gestures, PWA support. SaveManager with 3 manual + 1 auto slot per story, full save/load UI panel. TouchHandler for swipe gestures (left=advance, right=history, down=settings). PWA manifest + service worker for offline play. "Continue" button on title screen. Fixed isNewEnding bug in tracker. Fixed monkey-patching in main.js. Safe area CSS for notch phones. Code refactored for cleaner separation. Committed & pushed.
- 2026-03-25 (8:27 AM): Accessibility & loading polish — loading screen with progress bar, ARIA roles/labels/live regions throughout (dialogs, toolbars, lists, tabs), FocusTrap utility for modal focus management, keyboard-navigable story cards, prefers-reduced-motion (disables all animations), prefers-contrast high contrast mode, sr-only labels, keyboard shortcut hints toast, story card progress bars. SW cache bumped to v2. All 16 JS files pass syntax validation. Committed & pushed.
- 2026-03-25 (9:27 AM): Rewind button, color themes, scene progress tracking, reading time estimates, Space advance. 5 color theme options in settings. Progress bars now reflect actual scene exploration %. Story cards show reading time and scene count metadata. Rewind (B key) goes back one scene. SW cache v3. All 16 JS files pass. Committed & pushed.
- 2026-03-25 (10:27 AM): Story sorting (6 modes: A-Z, Z-A, recent, progress, shortest, longest), data export/import (full backup/restore of all game data as JSON), online/offline toast notifications. DataManager class for localStorage backup. Settings panel gained Data section with export/import buttons + usage stats. SW cache v4. All 17 JS files pass. Committed & pushed.
- 2026-03-25 (11:27 AM): Added reusable confirmation dialogs for destructive actions (delete save, reset settings, import data) and a Scene Select panel for jumping to previously visited scenes via new 📍 HUD button or `G` shortcut. Added `StoryEngine.jumpToScene()`, updated keyboard hints, and styled new overlays. All JS files pass syntax validation. Committed & pushed.
- 2026-03-25 (12:27 PM): Added a reusable `Toast` notification system (`web/js/toast.js`) to centralize lightweight UX messaging and migrated network online/offline notices to it. Added a cinematic `StoryIntro` splash (`web/js/story-intro.js`) with protagonist portrait, title, and description when starting a fresh story. Upgraded ending overlays with a cleaner stats grid (turns, scene exploration %, collected items). Updated `index.html`, `style.css`, and `sw.js` (cache v5) to wire in the new modules and offline support. All touched JS files + service worker pass `node --check`. Committed & pushed.
- 2026-03-25 (1:27 PM): Fixed critical rewind bug — rewind now restores inventory/flags from state snapshots instead of just rewinding scene ID. Added font size setting (80%-140%) with live CSS scaling. Added Random Story button (prefers unplayed). Added in-game progress HUD showing scene exploration and turn count. Fixed _syncAll text speed formatter. SW cache v6. All JS files pass. Committed & pushed.
- 2026-03-25 (2:27 PM): Story Info Modal — new StoryInfoModal class shows detailed per-story stats (exploration %, endings discovered, play count, best turns, last played, protagonist portrait) via ℹ button on story cards. Collapsible mobile HUD with overflow toggle for <600px screens. .gitignore cleanup for test artifacts. SW cache v7. All JS files pass. Committed & pushed.
