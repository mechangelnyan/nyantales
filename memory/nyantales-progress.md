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

## Phase 35: Reading Time Tracking, Visited Choice Hints, Code Quality ✅
- **Total reading time tracking** — persistent per-story and global reading time
  - `StoryTracker.recordReadingTime(slug, elapsedMs)` — accumulates reading time
  - `StoryTracker.getTotalReadingMs()` — global total across all stories
  - `StoryTracker.formatDuration(ms)` — static utility: `0s`, `3m 42s`, `1h 15m`
  - Recorded on endings AND mid-story menu returns (no lost time)
  - Title screen stats bar shows total reading time (e.g., `⏱ 2h 15m reading`)
  - Ending screen reading time refactored to use shared `formatDuration()`
- **Visited choice hints** — choices leading to previously explored scenes marked
  - `✓` badge appended to choice text for visited `goto` targets
  - Left green border accent on visited-path choice buttons
  - Helps players discover unexplored branches on replays
- **Achievement system code quality fix** — `_buildContext()` refactored
  - Was reading raw localStorage and re-parsing JSON (redundant + potentially stale)
  - Now reads `tracker.data.stories` directly — consistent with in-memory state
- **Title screen scroll reset** — smooth scroll-to-top on menu return
  - Prevents returning to a scrolled-down position after a long session
- **CSS additions** — `.choice-visited`, `.choice-visited-path`, `.title-bg` smooth scroll
- SW cache bumped to v20, production build regenerated (134KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 36: Theme-Aware Accent Colors + A11y ✅
- **CSS accent color RGB components** — added `--accent-r`, `--accent-g`, `--accent-b` custom properties
  - Replaced all 138 hardcoded `rgba(0, 212, 255, X)` values with `rgba(var(--accent-r), var(--accent-g), var(--accent-b), X)`
  - Color themes (cyan/magenta/green/amber/violet) now affect **all** UI elements: borders, glows, shadows, scrollbars, particles, grid overlay, sprite highlights
  - Previously only `var(--accent-cyan)` solid color swapped — all semi-transparent uses were stuck on cyan
- **Route map theme support** — canvas rendering reads accent color from CSS vars
  - `_cacheAccentRGB()` reads once per render frame (avoids dozens of `getComputedStyle` calls)
  - All edge/node/label colors now follow active theme
- **UI sprite highlight** — speaking character glow uses dynamic accent color
- **Ending screen accessibility** — `role="dialog"`, `aria-label` with ending title, auto-focus on "Play Again" button
- **Choices `aria-live="polite"`** — screen readers now announce when choices appear
- **JS `COLOR_THEMES` now stores RGB arrays** — `applyColorTheme()` sets all 4 CSS vars (hex + r/g/b)
- SW cache bumped to v21, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 37: Code Quality — Ending Listener Leak, CSS Sprite States, Engine Guards ✅
- **Ending event listener leak fix** — `_showEnding()` was creating 3 new `addEventListener` calls every time an ending was reached (restart, menu, share buttons). Over a multi-ending session, dozens of orphaned listeners accumulated on destroyed DOM elements.
  - Refactored to **event delegation**: single click listener on `endingEl` (initialized once in constructor) delegates via `data-action` attributes
  - Share data stored in `_endingShareData` object for delegation handler to access
  - `_shareEnding()` extracted as proper async method on VNUI
- **Sprite highlighting moved from inline JS to CSS** — speaking/non-speaking/ending states
  - Previously: `img.style.filter = 'drop-shadow(...)'` set inline on every sprite update (not theme-reactive, could conflict with CSS)
  - Now: `.vn-sprite-wrap.speaking .vn-sprite` CSS rule handles glow with `var(--accent-r/g/b)` — properly follows color theme changes
  - `.vn-sprite-wrap:not(.speaking) .vn-sprite` dims inactive characters via CSS
  - `.vn-sprite-wrap.ending-good/bad/neutral` CSS classes for ending sprite states (was inline JS)
- **Removed `VNUI._accentRGBA()` static method** — was only used for the inline sprite highlight that's now CSS. RouteMap keeps its own copy for canvas rendering.
- **Engine `goToScene()` safety** — now validates scene ID exists before processing
  - Returns `null` with console warning for missing scenes instead of silent undefined behavior
  - Prevents cascading errors if story YAML has a broken `goto` reference
- **Reading time injection fix** — ending stats grid now has `id="ending-stats-grid"`, allowing synchronous DOM insert instead of fragile `setTimeout(..., 50)` hack
- SW cache bumped to v22, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 38: Code Quality — Event Delegation, Cached DOM, CSS Classes ✅
- **Story grid event delegation** — single click listener on `#story-list` handles info + favorite button clicks for all 30 story cards
  - Previously: 60+ per-card `addEventListener` calls (2 per card × 30 cards)
  - Now: 1 delegated listener matches `.story-card-info-btn` and `.story-card-fav-btn` via `closest()`
  - Buttons still created in `decorateStoryCard()` but without inline click handlers
- **Extracted `decorateStoryCard()`** — 80+ lines of card decoration logic moved out of `renderTitleScreen()`
  - Clean separation: `renderTitleScreen()` handles stats + grid creation, `decorateStoryCard()` adds per-card UI
  - New `getStoryMeta(story)` helper computes scene count + reading time (DRY, reusable)
- **`ensureAudio()` helper** — centralizes the repeated `if (!audio.ctx) audio.init()` pattern
  - Replaced 7 identical call sites across main.js
- **Cached DOM refs** — eliminates repeated `querySelector` calls
  - `vnContainer` cached once at init, used by `updateProgressHUD`, `updateAutoPlayHUD`, `updateSkipIndicator`, and `TouchHandler`
  - `VNUI.containerEl` cached in constructor, used for shake effects (was querying twice per shake)
- **CSS classes for inline text formatting** — replaced inline `style=` attributes on formatted text
  - `<code style="color:...;font-family:...">` → `<code class="vn-inline-code">`
  - `<strong style="color:...">` → `<strong class="vn-bold">`
  - Both now use CSS custom properties — properly follow color theme changes
- SW cache bumped to v23, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 39: Critical Bug Fix — ensureAudio Recursion, DRY Escape, Cached DOM ✅
- **CRITICAL BUG FIX:** `ensureAudio()` was calling itself recursively instead of `audio.init()`
  - Caused infinite stack overflow on first audio-triggering interaction (story start, continue, random, gallery click)
  - Introduced in Phase 38 when the 7 call sites were DRYed into `ensureAudio()` — function body was `ensureAudio()` instead of `if (!audio.ctx) audio.init()`
  - Every click that triggered audio would crash the app with `RangeError: Maximum call stack size exceeded`
- **Escape key handler DRYed** — 10 repetitive if/return blocks replaced with array-based `find()` loop
  - Same behavior: closes topmost visible panel in priority order, syncs touch suspension, resumes auto-play
  - ~15 fewer lines, eliminates per-keypress closure allocation for `resumeAutoPlay`
- **Cached DOM refs expanded** — `btnAutoEl` and `statsEl` cached at init
  - `updateAutoPlayHUD()` was querying `getElementById('btn-auto')` on every call
  - `renderTitleScreen()` was querying `getElementById('title-stats')` on every menu return
- **`storyGrid` ref reused** in `applyFilter()`, `applySortToGrid()`, and boot error fallback
  - Was calling `getElementById('story-list')` 4 times (now 1)
- SW cache bumped to v24, production build regenerated (134KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 40: Event Delegation, Cached DOM Queries, Reusable Escape Element ✅
- **HUD event delegation** — single click listener on `.vn-hud` handles all 14 button clicks
  - Replaces 12 individual `getElementById().addEventListener()` calls for: back, rewind, save, more, fast, auto, history, scenes, settings, audio, routemap, help
  - Uses `switch` on `btn.id` for fast dispatch
- **Title bar event delegation** — single listener on `.title-actions` handles 6 buttons
  - Continue, Random, Gallery, Achievements, Stats, About — all via one delegated listener
  - Replaces 6 individual `getElementById().addEventListener()` calls
- **addEventListener count in main.js: 28 → 12** (57% reduction)
- **Cached `_escapeHtml` element** — `VNUI._escapeDiv` static property reused across all calls
  - Previously created a new `document.createElement('div')` on every invocation
  - Called hundreds of times per story session (every speaker name, choice label, text render)
- **Cached story card NodeList** — `getStoryCards()` helper avoids `querySelectorAll('.story-card')` on every filter keystroke and sort change
  - `_cachedCards` array built once per title screen render, reused by `applyFilter()` and `applySortToGrid()`
  - Invalidated and rebuilt in `renderTitleScreen()` when grid is re-created
- SW cache bumped to v25, production build regenerated (134KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 41: Story Card Delegation, Cached DOM, Sprite Optimization ✅
- **Story card event delegation** — card click + keydown events moved from per-card to grid-level
  - `renderStoryList()` no longer takes `onSelect` callback (pure DOM builder now)
  - Card click + Enter/Space handled by 2 delegated listeners on `#story-list`
  - Shared `storyFromCard()` + `selectStoryCard()` helpers for DRY card→story resolution
  - Eliminates 60 per-card listeners (2 × 30 cards) created every title screen render
- **Cached DOM refs** — `textboxEl`, `titleBg`, `themeColorMeta` cached at init
  - `returnToMenu()` no longer queries `.title-bg` on every menu return
  - `applyColorTheme()` no longer queries `meta[name="theme-color"]` on every theme change
  - Textbox click handler uses cached ref instead of `getElementById`
- **Sprite `_updateSprites()` optimization** — `toLowerCase()` on speaker/text/sceneId called once per render instead of per-character (was 3× per char × up to 5 chars = 15 calls → 3)
- **Fixed stale production SW version** — `build.sh` was generating `v23-prod` while dev SW was at `v25`; bumped to `v26-prod` / `v26` respectively
- **addEventListener count in main.js: 13** (down from 28 in Phase 39, from ~80+ originally)
- SW cache bumped to v26, production build regenerated (134KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 42: SaveManager Delegation, Shared _esc, Inline Style Cleanup ✅
- **SaveManager slot listener leak fix** — `_renderSlots()` was creating 3+ new `addEventListener` calls per slot on every re-render (save/load/delete buttons). Over a session with multiple save/load panel opens, dozens of orphaned listeners accumulated.
  - Refactored to **single delegated click listener** on `.save-slots` container, initialized once in `_buildOverlay()`
  - Buttons now use `data-action="save|load|delete"` attributes for delegation dispatch
- **Shared `_esc()` / `_escapeHtml()` element** — 3 modules were each creating new `document.createElement('div')` per escape call:
  - `SaveManager._esc()` → now static method reusing `SaveManager._escDiv`
  - `StoryInfoModal._esc()` → now reuses `VNUI._escapeDiv` (shared across all modules)
  - `StatsDashboard._escapeHtml()` → now reuses `VNUI._escapeDiv`
  - Zero new element allocations across all HTML escape calls
- **Inline `style.cssText` moved to CSS classes**:
  - `.new-ending-badge` — was inline on every ending discovery (color, font, size, animation)
  - `.story-card-save-badge` + `.save-badge-bottom` — was inline per card decoration
  - Both now theme-reactive via CSS custom properties
- **Save feedback fix** — save flash was setting `btn.textContent` after `_renderSlots()` which replaces innerHTML (btn was detached, feedback invisible). Now uses Toast notification.
- SW cache bumped to v27, production build regenerated (134KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 43: Reusable Transition Overlay, Cached Speaker Lookup, Style Cleanup ✅
- **Scene transition overlay reused** — `_transOverlay` created once in constructor, appended/detached per transition
  - Previously: `document.createElement('div')` + `.remove()` on every background change
  - Now: single element reused across all transitions (zero DOM allocation per scene)
- **Speaker character lookup cached** — `_findSpeakerChar()` with per-story `Map` cache
  - Previously: `chars.find()` + 2× `toLowerCase()` per render for speaker name plate
  - Now: single lookup per unique speaker per story, result cached
  - Cache reset on `setStorySlug()` (story change)
- **Inline styles moved to CSS classes**:
  - `ending-btn-secondary` — `margin-top: 0.5rem` for non-primary ending buttons (was inline `style=`)
  - `ending-stat-wide` — `grid-column: span 2` for inventory stat box (was inline `style=`)
- **Fixed stale production SW version** — build.sh was generating `v26-prod` while dev SW was at `v28`
- SW cache bumped to v28 (dev) and v28-prod (build)
- Production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 44: Choice Delegation, Shared Escape, Toast CSS ✅
- **Choice button event delegation** — `showChoices()` now uses single delegated listener on `choicesEl`
  - Previously: per-button `addEventListener` created on every `showChoices()` call (leaked on re-render)
  - Now: one-time delegation via `_initChoiceDelegation()`, buttons use `data-choice-idx` for lookup
  - `_currentChoices` array stored for delegation handler reference
- **Shared HTML escape element** — 3 modules now reuse `VNUI._escapeDiv` instead of creating new elements per call
  - `ConfirmDialog._esc()` — was creating `createElement('div')` per escape (called for title + message + buttons)
  - `HistoryPanel._esc()` — was creating new element per entry (called hundreds of times for full backlog)
  - `StoryIntro._esc()` — was creating new element per story intro (title + description)
  - All now check for `VNUI._escapeDiv` first, with local fallback for pre-UI-init calls
- **Toast inline styles → CSS classes** — moved 12-line `style.cssText` blob per toast to proper CSS
  - `.nt-toast` base class: border, padding, font, border-radius, shadow, transition
  - `.nt-toast.visible` / `.nt-toast.dismissing` for animation states
  - `.nt-toast-container` / `.nt-toast-bottom` / `.nt-toast-top` for container positioning
  - Only custom `background` set inline when non-default color is used
  - Toast overflow dismissal also uses CSS classes instead of inline style manipulation
- **CharacterGallery `isVisible` getter** — added for consistency with all other panel classes
  - Was the only panel without `isVisible` property; could cause issues if added to `isAnyPanelOpen()` later
- SW cache bumped to v29, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 45: CSS Classes, CSP Safety, Filter Delegation, Hidden Class Consistency ✅
- **HUD button inline styles → CSS classes** — replaced `style="opacity:0.35"` and `style="opacity:0.5"` with `.hud-dim` and `.hud-inactive` CSS classes
  - `updateAutoPlayHUD()`, `updateRewindButton()`, `toggleAudio()` now use `classList.toggle()` instead of `style.opacity`
  - HTML is now free of inline `style=` on HUD buttons
- **CSP-safe SW update banner** — replaced `onclick="location.reload()"` and `onclick="this.parentElement.remove()"` with proper `addEventListener` calls
  - No inline event handlers in the codebase anymore
- **Filter tag delegation** — 4 individual `addEventListener` calls on `.filter-tag` buttons → 1 delegated listener on `.filter-tags` container
- **`style.display` → `.hidden` class** — 12 direct `style.display = ''/='none'` toggles converted to `classList.add/remove('hidden')`
  - Auto-play indicator, skip indicator, progress HUD, progress bar, filter count, empty state
  - Consistent with existing `.hidden { display: none !important; }` utility class
- **Boot error inline styles → CSS class** — `<p style="color:...;padding:...;font-family:...">` → `.boot-error` with `a` color rule
- SW cache bumped to v30, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 46: Delegation & Accessibility — SceneSelect, StatsDashboard, Gallery ✅
- **SceneSelect event delegation** — per-item click/keydown listeners (created on every `show()`) replaced with single delegated listener on `.scene-select-list`, initialized once in `_build()`
  - Previously: N listeners per show (N = visited scene count), never cleaned up → leak on repeated opens
  - Now: 2 permanent delegated listeners (click + keydown) on the list container
- **SceneSelect._esc()** — reuses `VNUI._escapeDiv` instead of `document.createElement('div')` per call
  - Fallback to `SceneSelect._escDiv` if VNUI not yet initialized
- **StatsDashboard delegation** — close button + recent-item click handlers were re-bound on every `_render()` (called on every `show()`)
  - Extracted `_initDelegation()` — single delegated click listener on `_overlay`, called once on first `show()`
  - Matches `.stats-close` and `.stats-recent-item` via `closest()`
  - `cursor: pointer` on recent items moved from inline JS (`el.style.cursor`) to CSS rule on `.stats-recent-item`
- **Gallery filter delegation** — 3 per-button `addEventListener` calls → 1 delegated listener on `.gallery-filter-row`
- **Gallery focus trap** — `FocusTrap` activated on `show()`, deactivated on `hide()` (was the only panel without one)
- **Fast mode CSS class** — `ui.toggleFastMode()` now uses `classList.toggle('hud-inactive')` instead of `style.opacity`, consistent with all other HUD toggle buttons
- SW cache bumped to v31, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 47: StoryInfo Delegation, Inline Style Cleanup, History Filter Fix ✅
- **StoryInfoModal event listener leak fix** — `show()` was adding 3-4 new `addEventListener` calls per invocation (close, play, continue buttons + escape keydown). Over repeated info modal opens, dozens of orphaned listeners accumulated on destroyed innerHTML.
  - Refactored to **single delegated click listener** on overlay, initialized once in `_build()`
  - Buttons matched via CSS class (`story-info-close`, `story-info-play-btn`, `story-info-continue-btn`)
  - `_currentStory` ref stored for delegation handler to access
  - Removed per-show Escape keydown listener (already handled by main.js Escape priority chain)
- **HistoryPanel filter uses `.hidden` class** — replaced `style.display = ''|'none'` with `classList.toggle('hidden')` for consistency with the rest of the codebase
- **SettingsPanel inline styles → CSS classes**
  - Data buttons container: `style="gap:0.4rem"` → `.settings-data-btns` CSS class
  - Export/Import buttons: `style="font-size:0.68rem"` → `.settings-data-btn` CSS class
  - File input: `style="display:none"` → `.hidden` class
  - Auto-play delay row: `style.display` → `classList.toggle('hidden')`
- **HistoryPanel header inline style → CSS class** — `style="display:flex;gap:0.4rem;align-items:center"` → `.history-header-actions`
- **Production SW synced** — dev `v32`, prod `v32-prod` (was 4 versions behind)
- Production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 48: Cached DOM Refs, Achievement Delegation, Gallery Optimization ✅
- **AchievementPanel close listener leak fix** — `show()` was adding new `addEventListener` on `.achievements-panel-close` after every `innerHTML` rebuild (leaked on repeated opens)
  - Refactored to **single delegated click listener** on `_overlay` (initialized once in `_ensureOverlay`)
  - Matches close button via `.closest('.achievements-panel-close')` + backdrop click
- **HistoryPanel cached DOM refs** — `_listEl`, `_countEl`, `_panelEl` cached once in `_create()`
  - `show()` no longer queries `.history-list`, `.history-count`, `.history-panel` each time
  - `_filterEntries()` uses cached `_countEl` instead of querying `.history-count` per keystroke
  - `_onKeydown()` uses cached `_listEl` instead of querying `.history-list` per keypress
  - FocusTrap uses cached `_panelEl`
- **CharacterGallery cached refs** — `_grid`, `_panelEl`, `_cachedCards` cached after build
  - `_applyFilters()` uses `_cachedCards` array instead of `querySelectorAll('.gallery-card')` per filter change
  - FocusTrap uses cached `_panelEl` instead of re-querying `.gallery-panel` on every `show()`
  - `_applyFilters()` signature simplified (removed `grid` param, uses `this._grid`)
- SW cache bumped to v33, production build regenerated (136KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 49: RouteMap Reuse Overlay, AboutPanel Delegation, Tooltip Cleanup ✅
- **RouteMap overlay reuse** — overlay built once via `_ensureOverlay()` instead of destroyed/recreated every `show()`
  - Previously: `_createOverlay()` built full DOM + appended to body + bound close/zoom listeners per `show()`
  - `hide()` removed overlay from DOM entirely, forcing full rebuild next time
  - Now: overlay persists, show/hide toggles `.visible` class + `aria-hidden`
  - Close + zoom button clicks consolidated into **single delegated listener** on overlay
  - FocusTrap created once, activated/deactivated on show/hide
  - Canvas event handlers (mouse/touch/wheel/resize) still bound/unbound per show/hide (reference canvas element)
- **RouteMap tooltip** uses `.hidden` class instead of `style.display` (consistent with rest of codebase)
- **AboutPanel delegation** — 2 click listeners (close button + backdrop) merged into 1 delegated click on overlay
- **AboutPanel cached `_statsEl`** — was querying `getElementById('about-stats')` on every `show()`
- SW cache bumped to v34, production build regenerated (136KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 50: Accessibility & Listener Consolidation ✅
- **`aria-hidden` added to all remaining panels** — 3 overlays were missing toggle:
  - `AchievementPanel` — now sets `aria-hidden` on show/hide
  - `StatsDashboard` — now sets `aria-hidden` on show/hide
  - `CharacterGallery` — now sets `aria-hidden` on show/hide, plus added `role="dialog"` + `aria-label`
  - All 10 modal overlays now have consistent `aria-hidden` management for screen readers
- **Close/backdrop listener consolidation** — merged separate `addEventListener` calls into single delegated listeners:
  - `KeyboardHelp`: 2 listeners (close btn + backdrop) → 1 delegated
  - `SettingsPanel`: 2 listeners (close btn + backdrop) → 1 delegated
  - `CharacterGallery`: 2 listeners (close btn + backdrop) → 1 delegated
  - `HistoryPanel`: 3 listeners (close btn + backdrop + export btn) → 1 delegated
  - `ConfirmDialog`: 3 per-show listeners (cancel + ok + backdrop) → 1 delegated
- **addEventListener count**: 73 → 66 across all JS files (10% reduction)
- **Production SW version synced** — build.sh was generating `v32-prod` while dev was at `v35`; now `v35-prod`
- SW cache bumped to v35, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 51: One-Time Callbacks, Auto-Version Build, Minor Cleanup ✅
- **Gallery + StatsDashboard callbacks wired once at init** — were being re-assigned on every button click
  - `gallery.onStoryClick` moved from `btn-gallery` click handler to init block
  - `statsDashboard.onPlay` moved from `btn-stats` click handler to init block
  - Eliminates closure re-creation on every gallery/stats panel open
- **Pre-computed `_totalCharCount`** — About panel was rebuilding a `Set` from all CHARACTER_DATA on every click
  - Now computed once via IIFE at init, reused by About button handler
- **New-ending badge inserted synchronously** — removed `setTimeout(..., 100)` hack
  - The ending overlay is already rendered when `_onEndingHook` fires, so direct DOM insert works
- **SceneSelect close/backdrop consolidated** — 2 listeners → 1 delegated on overlay
  - addEventListener count: 66 → 65
- **build.sh auto-versions production SW** — extracts version number from dev `sw.js` via grep
  - Heredoc changed from `'SWEOF'` (no expansion) to `SWEOF` (expands `${SW_VERSION}`)
  - Prevents stale production cache names (was the #1 recurring bug across phases)
- SW cache bumped to v36, production build regenerated (135KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 52: SEO & Discoverability ✅
- **robots.txt** — allows all crawlers, points to sitemap
- **sitemap.xml** — lists root URL and `/web/` for search engine indexing
- **Canonical URL** — `<link rel="canonical">` on web/index.html prevents duplicate indexing of `/web/` vs `/web/dist/`
- **JSON-LD structured data** — WebApplication schema with name, description, category, price, author, genre, item count
  - Enables rich search result cards in Google/Bing
- **dns-prefetch** — `<link rel="dns-prefetch" href="https://fonts.googleapis.com">` (complements existing preconnect)
- **README** updated with SEO features in feature list
- SW cache bumped to v37, production build regenerated (136KB bundle)
- All 30 JS files pass `node --check` validation
- 2 commits pushed

## Phase 53: Cached DOM, Delegated Listeners, Engine Optimization ✅
- **SettingsPanel cached DOM refs** — `_els` object caches 17 frequently-accessed elements at construction
  - `_updateDataStats()` no longer queries `getElementById('set-data-stats')` on every show
  - `_runPreview()` uses `_els.preview` instead of `getElementById('set-text-preview')`
  - `_syncAll()` uses cached slider/value elements instead of 8 `getElementById` calls per sync
  - `_handleExport()` / `_handleImport()` use cached button refs for feedback text
  - `_els.autoDelayRow` cached for toggle visibility
  - `_els.themeContainer` cached for swatch queries
- **SettingsPanel delegated data section clicks** — export/import/reset buttons consolidated into 1 delegated listener on `.settings-body` (replaces 3 individual `addEventListener` calls)
- **SettingsPanel color theme delegation** — 5 per-swatch `addEventListener` calls → 1 delegated click on container
- **SettingsPanel `_speedLabel()` static method** — shared between `_wireSlider` and `_syncAll` (DRY, was duplicated)
- **SaveManager listener consolidation** — close button + backdrop + mode toggle merged into 1 delegated click on overlay (replaces 2 + 2 per-mode-btn listeners)
- **SaveManager cached refs** — `_slotsEl`, `_modeBtns`, `_panelEl` cached at build time
  - `_renderSlots()` no longer queries `.save-slots` on every re-render
  - `show()` uses cached `_modeBtns` and `_panelEl` instead of querying
- **Engine `interpolate()` optimization** — single pre-compiled regex with `switch` dispatch
  - Previously: 8 chained `.replace()` calls, each scanning the full string
  - Now: 1 `StoryEngine._INTERP_RE` static regex, single pass through the text
  - Same output, fewer string scans (especially for long narration text)
- **UI `_updateSprites` optimization** — eliminated object spread allocation
  - Was creating `{ ...char, isSpeaker }` spread objects for every visible character per render
  - Now uses parallel `speakerFlags` array alongside `visible` (zero object allocation)
  - `classList.toggle('speaking', isSpeaker)` replaces if/else add/remove pattern
- **UI character name cache** — `_charNameCache` Map avoids `.toLowerCase()` on character names every render
  - Cleared on story change via `setStorySlug()`
- addEventListener count: 65 → 61 (6% reduction)
- SW cache bumped to v38, production build regenerated (136KB bundle)
- All 30 JS files pass `node --check` validation

## Phase 54: Campaign Integration Polish ✅
- **Reverted broken title screen layout** — previous session redesigned index.html for campaign-centric layout, removing story list/filter/search/sort/continue/random buttons entirely. Reverted to working layout with all original UI intact + campaign button.
- **Fixed title-actions CSS regression** — was changed to `flex-direction: column` breaking the horizontal button row
- **Fixed boot error fallback** — was targeting nonexistent `#chapter-grid`, now uses `#story-list`
- **Fixed updateCampaignButton()** — was generating `campaign-hero-btn` class and `campaign-hero-tag` spans that don't exist in the actual HTML
- **Removed duplicate CampaignManager instantiation** — was declared at both init block and game state section
- **Campaign data in export/import** — `nyantales-campaign` added to `DataManager.DATA_KEYS`
- **Campaign reset in Settings** — new "📖 Reset Campaign" button in Settings → Data section with confirmation dialog
- **Campaign progress in Stats Dashboard** — `StatsDashboard` now accepts `campaign` param, shows chapters completed/total with progress bar when campaign is started
- **About panel** — added campaign feature mention (26 chapters across 5 acts)
- **CSS class** `.campaign-btn-ending` replaces inline `style.marginTop` on ending overlay campaign button
- **Error handling** — `.catch()` added to `startStory().then()` in campaign chapter play
- SW cache bumped to v39, production build regenerated (145KB bundle)
- All 30 JS files pass `node --check` validation
- Committed & pushed

## Phase 57: Shareable Story Deep Links ✅
- **Direct story URLs** — web app now supports `?story=<slug>` routes
  - Example: `https://mechangelnyan.github.io/nyantales/?story=the-terminal-cat`
  - On boot, the app reads the query param and launches that story automatically
  - Invalid slugs fail gracefully with a toast and URL reset to the main menu
- **URL sync during play** — starting a story updates the browser URL via `history.replaceState()`
  - Keeps the current `/web/` or `/web/dist/` app path intact (no navigation)
  - Returning to the menu clears the `story` query param
  - Makes copied browser URLs point at the currently open story
- **Ending share links improved** — ending share cards now include a real per-story play URL
  - Uses clean root URLs (`/?story=slug`) instead of generic repo home links
  - Passes `url` to the Web Share API when available
- **Root redirect preserves routes** — repo root `index.html` now uses JS redirect to carry query/hash into `web/dist/`
  - Clean root links like `/?story=slug` survive the GitHub Pages redirect instead of dropping params
- **Docs + build updates**
  - README now documents deep-link support and refreshed production bundle/request sizes
  - Service worker cache bumped to `v44`, production build regenerated (`150KB` JS, `80KB` CSS)
- All 31 JS files pass `node --check` validation

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
- 2026-03-26 (11:27 PM): Phase 54 — Campaign integration polish: reverted broken title screen redesign (story list/filter/search was removed), fixed title-actions CSS, fixed updateCampaignButton to match actual HTML, removed duplicate CampaignManager, added campaign to DataManager export/import, campaign reset in Settings, campaign progress in Stats Dashboard, .campaign-btn-ending CSS class, .catch() on campaign startStory. SW v39. 145KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (10:27 PM): Phase 53 — Cached DOM + delegation + engine optimization: SettingsPanel caches 17 DOM refs, delegates data/theme clicks, shares _speedLabel(). SaveManager consolidates close+mode into 1 listener, caches _slotsEl/_modeBtns/_panelEl. Engine.interpolate() uses single pre-compiled regex (8 chained .replace→1 pass). UI._updateSprites eliminates object spread allocation (parallel speakerFlags array), adds _charNameCache. addEventListener count 65→61. SW v38. 136KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (9:27 PM): Phase 52 — SEO & discoverability: robots.txt, sitemap.xml, canonical URL, JSON-LD WebApplication structured data, dns-prefetch. README updated. SW v37. 136KB bundle. All 30 JS pass. 2 commits pushed.
- 2026-03-26 (8:27 PM): Phase 51 — One-time callbacks: gallery.onStoryClick + statsDashboard.onPlay moved from per-click to init (eliminates closure re-creation). Pre-computed _totalCharCount for About panel. Synchronous new-ending badge (removed setTimeout). SceneSelect close consolidated (66→65 listeners). build.sh auto-versions prod SW (extracts version from dev sw.js, fixes recurring stale-cache bug). SW v36. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (7:27 PM): Phase 50 — Accessibility: added aria-hidden to AchievementPanel/StatsDashboard/Gallery (last 3 panels missing it). Added role="dialog"+aria-label to Gallery. Consolidated close/backdrop listeners: KeyboardHelp (2→1), SettingsPanel (2→1), Gallery (2→1), HistoryPanel (3→1), ConfirmDialog (3→1). addEventListener count 73→66. Fixed stale prod SW (v32→v35). 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (6:27 PM): Phase 49 — RouteMap overlay reuse (built once via _ensureOverlay instead of destroy/recreate per show; close+zoom delegated to single listener; FocusTrap created once). Tooltip uses .hidden class. AboutPanel delegation (2 listeners→1). AboutPanel cached _statsEl. SW v34. 136KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (5:27 PM): Phase 48 — AchievementPanel close listener leak fix (per-show addEventListener → delegated on _overlay). HistoryPanel cached DOM refs (_listEl, _countEl, _panelEl — eliminates 6+ querySelector calls per show/filter/keydown). Gallery cached refs (_grid, _panelEl, _cachedCards — eliminates querySelectorAll per filter). SW v33. 136KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (4:27 PM): Phase 47 — StoryInfoModal delegation (3-4 per-show listeners → single delegated click on overlay, fixes listener leak on repeated opens). HistoryPanel filter uses .hidden class. SettingsPanel inline styles→CSS classes (data-btns gap, btn font-size, file input hidden, auto-delay row toggle). History header inline style→.history-header-actions CSS. Prod SW synced to v32. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (3:27 PM): Phase 46 — SceneSelect delegation (per-item click/keydown listeners → delegated on list container, fixes leak on repeated opens). SceneSelect._esc() reuses VNUI._escapeDiv. StatsDashboard delegation (close + recent-item re-bound every render → _initDelegation once, cursor:pointer to CSS). Gallery filter delegation (3 per-button → 1 on row). Gallery focus trap added. Fast mode uses CSS class not style.opacity. SW v31. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (2:27 PM): Phase 45 — CSS classes for inline styles (HUD .hud-dim/.hud-inactive), CSP-safe SW update banner (no inline onclick), filter tag delegation (4→1 listener), 12 style.display toggles→.hidden class, boot error→.boot-error CSS. SW v30. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (1:27 PM): Phase 44 — Choice button delegation (single listener on choicesEl replaces per-button addEventListener leak). Shared _escapeHtml (ConfirmDialog, HistoryPanel, StoryIntro reuse VNUI._escapeDiv). Toast inline styles→CSS classes (.nt-toast base, .visible/.dismissing states, container positioning). Gallery isVisible getter. SW v29. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (12:27 PM): Phase 43 — Reusable transition overlay (single DOM element reused across all bg transitions instead of create/remove per change). Cached speaker character lookup (_findSpeakerChar with Map cache, reset per story). Moved ending button + stat inline styles to CSS classes (ending-btn-secondary, ending-stat-wide). Fixed stale prod SW (v26→v28). SW v28. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (11:27 AM): Phase 42 — SaveManager delegation: fixed slot listener leak (_renderSlots created new listeners per re-render → single delegated listener). Shared _esc element (SaveManager, StoryInfoModal, StatsDashboard all reuse VNUI._escapeDiv). Moved inline style.cssText to CSS classes (.new-ending-badge, .save-badge-bottom). Fixed save feedback (detached btn → Toast). SW v27. 134KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (10:27 AM): Phase 41 — Story card delegation: moved 60 per-card click/keydown listeners to 2 grid-level delegated listeners. Cached textboxEl, titleBg, themeColorMeta DOM refs. Optimized _updateSprites toLowerCase calls (15→3 per render). Fixed stale prod SW version (v23→v26). addEventListener count: 13. SW v26. 134KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (9:27 AM): Phase 40 — Event delegation: HUD toolbar + title bar buttons now use 2 delegated listeners instead of 18 individual ones (addEventListener count 28→12, 57% fewer). Cached VNUI._escapeDiv (reuses 1 element instead of creating hundreds). Cached story card NodeList for filter/sort reuse. SW v25. 134KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (8:27 AM): Phase 39 — CRITICAL FIX: ensureAudio() was infinitely recursive (called itself instead of audio.init()), crashing app on any audio-triggering click. DRYed Escape key handler (10 if/return blocks → array find loop). Cached btnAutoEl + statsEl + reused storyGrid ref (eliminates 6 repeated getElementById calls). SW v24. 134KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (7:27 AM): Phase 38 — Code quality: story grid event delegation (60+ per-card listeners → 1 delegated), extracted decorateStoryCard() + getStoryMeta() from renderTitleScreen(), ensureAudio() helper (7 call sites), cached vnContainer + containerEl DOM refs (eliminates 6 querySelector calls), replaced inline style= on formatted text with CSS classes (.vn-inline-code, .vn-bold) for theme-reactivity. SW v23. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (6:27 AM): Phase 37 — Code quality: fixed ending event listener leak (was creating 3 new listeners per ending, now uses event delegation), moved sprite speaking/ending highlights from inline JS styles to CSS classes (theme-reactive), removed dead VNUI._accentRGBA(), added goToScene null guard in engine, fixed reading time injection to use synchronous DOM instead of setTimeout. SW v22. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (5:27 AM): Phase 36 — Theme-aware accent colors: replaced 138 hardcoded rgba(0,212,255,...) with CSS var RGB components (--accent-r/g/b). All 5 color themes now affect every UI element (borders, glows, shadows, particles, grid, sprites, scrollbars, canvas route map). Route map caches accent RGB per render frame. Ending screen gets focus management + aria. Choices get aria-live. SW v21. 135KB bundle. All 30 JS pass. Committed & pushed.
- 2026-03-26 (4:27 AM): Phase 35 — Total reading time tracking (per-story + global, persistent), title stats show cumulative reading time, ending display uses shared formatter. Visited choice hints (✓ badge + green border on explored paths). Achievement _buildContext() now reads tracker data directly instead of raw localStorage. Title screen scroll-to-top on return. SW v20. All 30 JS pass. Committed & pushed.
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

## Phase 56: Campaign Module Extraction + Build Wiring ✅
- **Extracted `CampaignManager` into its own module** — moved campaign orchestration out of `web/js/engine.js` into new `web/js/campaign.js`
  - `engine.js` now focuses only on `StoryEngine` responsibilities
  - Cleaner separation of concerns: engine state/scene logic vs. campaign flow/persistence
  - `engine.js` shrank from 483 lines → 250 lines
- **App wiring updated**
  - Added `web/js/campaign.js` to `web/index.html` script chain (after `engine.js`, before `main.js` consumers)
  - Added `campaign.js` to `web/sw.js` pre-cache list for offline support
  - Added `campaign.js` to `web/build.sh` bundle order so production builds include it
- **Build metadata cleanup**
  - Corrected build summary from `30 → 3` requests to `31 → 4` (`index.html + js-yaml + bundle + css`)
  - Service worker cache bumped to `v43`
- Production build regenerated (148KB minified bundle)
- All 31 JS files pass `node --check` validation

## Phase 55: Title Screen Restoration + Campaign Cleanup ✅
- **Restored full title screen** — campaign-first redesign (commits 61c1e0b, d87222e) had removed:
  - `#story-list` grid (storyGrid was null, all 30 story cards gone)
  - Search bar, filter tabs (All/Favorites/Completed/New), sort dropdown
  - Continue and Random buttons
  - `renderTitleScreen()` stripped of story card rendering
  - These were NOT properly reverted in Phase 54
- **Combined layout** — campaign section (button + chapter grid) sits above full story grid
  - "── All Stories ──" section divider between campaign and story sections
  - Campaign section hides entirely when campaign data unavailable
- **Cached campaign DOM refs** — `chapterGridEl`, `sectionDivider`, `campaignBtnEl` at init
  - `renderChapterGrid()`, `updateCampaignButton()`, chapter grid delegation all use cached refs
  - Eliminates `getElementById`/`querySelector` calls on every title screen render
- **Dead CSS removed** — `.campaign-hero-btn`, `.campaign-hero-tag`, `.title-secondary-actions`
  - ~45 lines of orphan CSS from the reverted campaign-first redesign
- **Chapter grid CSS** — removed `max-height`/`overflow-y` (no longer needs own scroll container)
- **Campaign button uses `.campaign-btn`** style (not hero style)
- SW cache bumped to v42, production build regenerated (147KB bundle)
- All 30 JS files pass `node --check` validation
- 3 commits pushed

## Log (continued)
- 2026-03-27 (2:27 AM): Phase 57 — Added shareable `?story=slug` deep links: boot auto-opens requested story, browser URL syncs during play via replaceState, ending share cards include per-story play URLs, and root index redirect now preserves query/hash into `web/dist/`. README updated, SW v44, production build regenerated (150KB JS / 80KB CSS). All 31 JS pass. Committed & pushed.
- 2026-03-27 (1:27 AM): Phase 56 — Extracted CampaignManager from engine.js into new web/js/campaign.js, wired it into index.html + build.sh + service worker, corrected production request-count summary, bumped SW to v43. engine.js now 250 lines (down from 483). Production build regenerated (148KB bundle). All 31 JS pass.
- 2026-03-27 (12:27 AM): Phase 55 — Restored full title screen that was broken by campaign-first redesign. Story grid, search, filter, sort, continue, random all back. Campaign section shown above story grid with divider. Cached campaign DOM refs. Removed 45 lines dead CSS. SW v42. 147KB bundle. All 30 JS pass. 3 commits pushed.
