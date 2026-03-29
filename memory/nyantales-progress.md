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

## Phase 58: Browser History Navigation + Scene Select Polish ✅
- **Browser back/forward support for deep links** — `?story=slug` routing now respects native history navigation
  - `syncStoryUrl(slug, mode)` now supports `pushState` and `replaceState`
  - Starting a story from the menu pushes a history entry, so browser Back returns to the menu cleanly
  - `popstate` handler now opens/closes stories when navigating browser history
  - `routeChangeSerial` guard prevents async intro/routing races when the URL changes mid-transition
  - History-driven route loads skip the splash intro for faster, less-jarring back/forward navigation
- **Scene Select panel polish** (`web/js/scene-select.js`)
  - Cached `_searchEl`, `_listEl`, `_countEl`, `_panelEl` refs instead of re-querying on every show/filter
  - Search now updates a live count label: `X / Y matching · Y / Z scenes visited`
  - Added empty-search state message when no visited scenes match the filter
- **Settings panel code quality / a11y** (`web/js/settings-panel.js`)
  - Removed remaining inline styles from theme swatches + campaign reset button
  - Theme swatches now use semantic CSS classes and set `aria-pressed` for the active theme
- **Docs / deployment freshness**
  - README updated for browser back/forward deep-link support + current build sizes
  - Service worker cache bumped to `v45`, production build regenerated (`152KB` JS / `81KB` CSS)
- All touched JS files pass `node --check` validation

## Phase 60: PWA Install UX + Mobile Discoverability ✅
- **In-app install button** — new `📲 Install App` action on the title screen
  - Hidden by default, shown only when the browser exposes `beforeinstallprompt`
  - Uses the real install prompt instead of making users dig through browser menus
- **iPhone/iPad install guidance** — graceful fallback when Safari has no install prompt
  - Detects iOS Safari when not already in standalone mode
  - `📲 Install` button shows a clear toast: Share → Add to Home Screen
- **Install lifecycle wiring**
  - `beforeinstallprompt` captured and deferred until the user taps the button
  - `appinstalled` shows confirmation toast and hides install CTA once installed
  - `display-mode: standalone` changes also refresh button visibility
- **UI polish**
  - Added dedicated `.install-btn` styling to match the title screen action row
  - About panel and README updated to mention the new install flow
- Production build regenerated (`154KB` JS / `81KB` CSS)
- `npm test` still passes (`204/204`)

## Phase 63: Stats Dashboard Mobile Layout + Remembered Filters ✅
- **Mobile-friendly story breakdown** — stats dashboard rows now collapse into readable mini-cards on small screens
  - Story title spans full width, with labeled Progress / Endings / Plays / Best stat chips below
  - Removes the cramped 5-column table on phones while keeping rows clickable for quick launch
- **Remembered stats filters** — dashboard search query + sort mode now persist in localStorage
  - Reopening the stats panel restores the last search and sort choice
  - Useful when comparing stories repeatedly instead of re-entering filters every time
- **Regression coverage**
  - Added Playwright test to verify statistics search/sort state persists across close → reopen
- **Docs / deployment freshness**
  - README feature list updated for the improved stats dashboard UX
  - Service worker cache bumped to `v46`, production build regenerated
- No new stories added

## Phase 64: Story Share UX + Share Helper Refactor ✅
- **Story Info share button** — added `🔗 Share` action to `StoryInfoModal`
  - Shares/copies a clean per-story deep link directly from the title screen info modal
  - Uses native Web Share API when available, clipboard fallback on desktop
  - Share text includes story title, description, and canonical `/?story=<slug>` URL
- **`ShareHelper` module** (`web/js/share.js`) — centralized share behavior + clean story URL generation
  - `ShareHelper.storyUrl(slug)` builds canonical root-level story links from `/`, `/web/`, or `/web/dist/`
  - `ShareHelper.share()` consolidates native-share → clipboard fallback logic with toast feedback
- **Code quality cleanup**
  - Ending share flow in `ui.js` now reuses `ShareHelper` instead of duplicating URL/share logic
  - Added `share.js` to `web/index.html`, `web/sw.js`, and `web/build.sh`
- **Responsive polish**
  - Story info action row now wraps cleanly on small screens
  - Share button gets dedicated styling consistent with play/continue actions
- **Regression coverage**
  - New Playwright test verifies Story Info → Share copies the expected `/?story=the-terminal-cat` deep link
- **Docs / deployment freshness**
  - README updated for story-link sharing + current build output sizes
  - Service worker cache bumped to `v47`, production build regenerated (`160KB` JS / `84KB` CSS)
- Verified `npm test` (204/204), `npx playwright test` (45/45), and `node --check` on touched JS files
- No new stories added

## Phase 65: Remembered Title Browser State + Quick Reset ✅
- **Persistent title-screen browser state** — story search, active filter tab, and sort mode now survive reloads and return visits
  - Stored via `SafeStorage`/localStorage under `nyantales-title-browser`
  - Re-applied on boot before the title screen renders, so the story grid comes back in the same browsing context
- **Quick reset control** — new inline ✕ button inside the search field clears search + filter + sort back to defaults in one tap
  - Only appears when the title browser is in a non-default state
  - Useful on mobile where clearing multiple controls was fiddly
- **UI polish**
  - Search field now reserves room for inline controls/count text without overlap
  - Filter state syncing centralized so tabs/sort/search stay visually consistent after restore/reset
- **Regression coverage**
  - Added Playwright tests for remembered title browser state across reloads
  - Added Playwright test for the new clear/reset button behavior
- **Docs / deployment freshness**
  - README updated for remembered browser state
  - Service worker cache bumped to `v48`, production build regenerated (`161KB` JS / `85KB` CSS)
- Verified `node --check`, `npm test` (204/204), and `npx playwright test tests/web/vn.spec.js` (45/45)
- No new stories added

## Phase 66: Mobile Title Browser UX Polish ✅
- **Sticky mobile story browser controls** — the title-screen search/filter/sort block now stays pinned near the top on phones/tablets while browsing long story lists
  - `#story-filter` becomes a frosted/glass sticky panel under 768px
  - Keeps search, favorites/completed/new tabs, and sort menu reachable without scrolling back to the top
- **Removed nested mobile story-grid scrolling** — the story list now uses the title screen's main scroll container on mobile
  - `.story-grid` switches to `max-height: none` + `overflow: visible` under 768px
  - Prevents the awkward “scroll inside a scroll” behavior on touch devices
- **Small-screen filter row polish**
  - Title stats now wrap more cleanly on narrow widths
  - Filter pills become horizontally scrollable under 480px instead of crushing the sort control
- **Regression coverage**
  - Added Playwright test verifying sticky mobile filters + page-level story-list scrolling behavior
- **Docs / deployment freshness**
  - README feature list updated for sticky mobile browse controls
  - Service worker cache bumped to `v49` (to refresh mobile CSS quickly)
- No new stories added

## Phase 70: Pre-Created Overlays, One-Time Callbacks, Test Fixes ✅
- **Pre-created overlay indicators** — `autoPlayIndicator`, `skipIndicator`, `progressHUD`, `progressBar` built once at init
  - Previously: lazy `document.createElement()` in hot-path functions (`updateAutoPlayHUD`, `updateSkipIndicator`, `updateProgressHUD`)
  - Now: IIFE-created at init time, toggled via `.hidden` class (zero null checks per call)
  - Eliminates 4 conditional createElement blocks that ran on every scene transition
- **Engine callbacks wired once** — `ui.onChoice`, `ui.onRestart`, `ui.onMenu`, `ui._onEndingHook` set at init
  - Previously: re-assigned inside `initEngine()` on every story start and restart (created new closures each time)
  - Now: wired once at init, reference `currentEngine` / `_currentParsed` dynamically
  - `_currentParsed` stores the last parsed story data for restart without closure capture
  - Campaign restart logic uses `_currentParsed` naturally (no `parsed` closure variable)
- **Fixed 3 Playwright test regressions** from Phase 69 campaign locking
  - `story cards show title text and info controls` — was checking `.story-card.first()` which is locked; now targets `.story-card:not(.story-locked).first()`
  - `title search matches character names` — was searching "stack canary" (Buffer Overflow, locked); now searches "nyan" (The Terminal Cat, always unlocked)
  - `story info modal shows cast chips` — was opening info for Buffer Overflow (locked, no info btn); now uses The Terminal Cat
- main.js: 1704 → 1688 lines (16 lines removed)
- SW cache bumped to v52, production build regenerated (167KB bundle)
- All 32 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 71: Campaign Delegation, Pre-Computed BG, Sprite Set, Format Regex ✅
- **Campaign ending button delegation** — `nextBtn.addEventListener('click')` was creating a new listener per ending (leaked on multi-ending sessions)
  - Now uses `data-action="campaign-next"` attribute, handled by existing ending overlay delegation in `VNUI._initEndingDelegation()`
  - `ui._onCampaignEnding` callback wired once at init in main.js
- **Pre-computed background keyword entries** — `this.bgKeywords` (Object) replaced with `this._bgEntries` (pre-built Array of [keyword, class] tuples)
  - `_inferBackground()` was calling `Object.entries(this.bgKeywords)` on every scene render, allocating a new array each time
  - Now iterates the pre-computed `_bgEntries` array directly (zero allocation per render)
- **Sprite fade-out Set lookup** — `_updateSprites()` was using `visible.find(v => v.name === name)` per active sprite (O(n²) for n characters)
  - Now builds `visibleNames` Set once, uses `.has()` for O(1) per-sprite lookup
- **Combined `_formatText` regex** — 4 sequential `.replace()` passes (code, bold, italic, newline) merged into single `VNUI._FORMAT_RE` pre-compiled regex
  - Single pass with switch dispatch: code → `<code>`, bold → `<strong>`, italic → `<em>`, newline → `<br>`
  - HTML escape (3 passes) remains separate for correctness
- **Scoped ending stats query** — `document.getElementById('ending-stats-grid')` → `ui.endingEl.querySelector('#ending-stats-grid')` (narrower search scope)
- SW cache bumped to v53, production build regenerated (167KB bundle)
- All 32 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 72: Timer Cleanup, CSS Custom Properties, Cached Meta ✅
- **Effect timer management** — glitch/shake/sprite-fade `setTimeout` calls are now tracked in `_effectTimers` array
  - `_clearEffectTimers()` cancels all pending timers on scene change or sprite clear
  - Prevents stale timers firing on the wrong scene during rapid navigation (e.g. glitch class added to text belonging to a different scene)
  - Also removes lingering `glitch-text` / `shake` CSS classes that a cancelled timer would have cleaned up
  - Sprite fade-out `setTimeout(() => el.remove(), 500)` also tracked (previously orphaned on `_clearSprites()`)
- **CSS custom property animation delays** — story cards and choice buttons now use `--card-delay` / `--choice-delay` instead of inline `style.animationDelay`
  - `.fade-in` CSS rule reads `animation-delay: var(--card-delay, var(--choice-delay, 0s))`
  - Cleaner separation of concerns; works with strict CSP policies
- **Progress bar CSS custom property** — `--bar-pct` drives width (was inline `style.width`)
- **Route map cursor CSS class** — `.route-map-grabbing` replaces inline `style.cursor` toggles
- **Cached `getStoryMeta()`** — per-slug Map cache avoids recomputing word count across all scenes on every title screen render (30 stories × O(scenes) word splits → single computation, cached forever since story data is immutable)
- SW cache bumped to v54, production build regenerated (168KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- 2 commits pushed

## Phase 73: Audio Leak Fix, Shared Noise Buffer, Typewriter O(n) ✅
- **Audio blip timer leak fix** — `_blips()` recursive `setTimeout` chains were never tracked or cancelled
  - Previously: changing themes or stopping audio left orphaned blip timers running indefinitely, each creating new OscillatorNodes connected to a disconnected gain node
  - Now: `_blipTimers` array tracks all blip setTimeout IDs
  - `_cancelBlipTimers()` called in `setTheme()` (before stopping old nodes) and `stop()`
  - Prevents unbounded timer/oscillator accumulation during long play sessions with many scene transitions
- **Shared noise buffer** — `_getNoiseBuffer()` creates a single 4-second white noise AudioBuffer, reused across all theme changes
  - Previously: `_noise()` allocated a new `Float32Array(sampleRate × 4)` every time (176KB per call at 44.1kHz)
  - Each theme uses 1-2 noise sources → was ~350KB of throwaway buffers per theme switch
  - Buffer only regenerated if sample rate changes (essentially never)
- **Typewriter O(n²) → O(n)** — `_formatText()` now called once per text instead of per 2-char chunk
  - Previously: typewriter called `_formatText(text.slice(0, index))` every tick, reformatting the entire growing substring with regex each time → O(n²) total work for n characters
  - Now: full formatted HTML rendered once into a hidden wrapper, then characters revealed progressively via `visibility` toggle on pre-split text nodes
  - Clean HTML restored when typewriter completes or is skipped (removes per-char spans)
  - TreeWalker used to find text nodes within formatted HTML (preserves `<code>`, `<strong>`, `<em>`, `<br>` structure)
- SW cache bumped to v55, production build regenerated (169KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 74: Asset Cleanup, Build Optimization, Preload Dedup ✅
- **Removed 15 unused legacy portrait files** (~10MB freed from repo)
  - Old superseded versions: `byte.png`, `nyan.png`, `nyan_v2`–`v5`, `nyan_anime_lora`, `nyan_zimage`, `mochi.png`, `mochi_v2`–`v3`, `pixel.png`, `pixel_v2.png`, `query.png`, `inspector_whiskers.png`
  - All have newer versioned replacements already mapped in PORTRAIT_MAP
- **Build script optimized** — only copies referenced portraits to dist
  - Extracts filenames from `PORTRAIT_MAP` in `portraits.js` via grep
  - 44 portraits / 31MB instead of 59 files / 41MB (24% smaller dist)
  - Reports character count + size in build output
- **PortraitManager.preloadAll() deduplication** — shared portraits loaded once
  - Builds `file → [names]` map to avoid duplicate Image loads for aliased entries
  - 54 map entries → 44 unique Image loads on boot (18% fewer network requests)
  - Same file (e.g. `api_worker_7_v2_s694661517.png`) mapped by both `'api-worker-7'` and `'api worker 7'` now only triggers one load
- SW cache bumped to v56, production build regenerated (169KB JS, 88KB CSS)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 75: Toast Timer Tracking, Cached History Entries, Dialog Guard ✅
- **Achievement toast timer tracking** — `showNewUnlocks()` staggered `setTimeout` calls now stored in `_toastTimers` array
  - `cancelPendingToasts()` cancels all pending timers + removes active toast element
  - Called in `returnToMenu()` — prevents orphaned achievement toasts animating in after leaving a story
  - Previously: rapid story→menu→story transitions could show toasts from the previous session
- **HistoryPanel cached entry NodeList** — `_filterEntries()` no longer calls `querySelectorAll('.history-entry')` on every keystroke
  - `_cachedEntries` array built once in `show()` when rendering entries
  - Reused across all filter invocations until next `show()` rebuild
  - Especially impactful for large backlogs (500 entries max) during rapid search typing
- **ConfirmDialog double-resolve guard** — `cleanup()` can be triggered by both click delegation and Escape keydown
  - Added `resolved` boolean flag to prevent double `resolve()` call on the promise
  - Race condition: rapid Escape + click could call `cleanup()` twice, causing unpredictable behavior in the caller
- SW cache bumped to v57, production build regenerated (169KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests

## Phase 76: Cached Settings DOM, Tracker Set Cache, CSS Custom Property Bars ✅
- **SettingsPanel cached theme swatches** — `_swatches` array built once at construction
  - Previously: `querySelectorAll('.theme-swatch')` called 3× (init, click handler, every `_syncAll`)
  - Now: pre-built array reused across all swatch updates
- **SettingsPanel cached toggle buttons** — `_toggleBtns` object maps IDs to button elements
  - Previously: `document.getElementById()` called 5× on every `_syncAll()` (per panel open or setting change)
  - Now: cached once, looked up by key
- **StoryTracker `_visitedSets` cache** — lazy `Map<slug, Set<string>>` for visited scene lookups
  - Previously: `new Set(story.visitedScenes)` allocated on every `recordVisitedScenes()` call (every scene transition)
  - Now: Set built once per story, reused across all subsequent calls, invalidated on `reset()`
- **Progress bar inline widths → CSS custom property `--bar-pct`** — 9 inline `style="width:X%"` converted:
  - `loading-bar-fill`, `story-card-progress-fill`, `story-info-progress-fill`
  - `achievements-progress-fill`, `stats-card-bar-fill` (4 uses), `stats-mini-bar-fill`
  - CSS `width: var(--bar-pct, 0%)` rule added to each fill class
  - Consistent with the Phase 72 pattern for progress/animation bars
- **Stats dashboard bar colors → CSS classes** — replaced inline `background:` with named classes
  - `.stats-bar-magenta`, `.stats-bar-green`, `.stats-bar-yellow`, `.stats-bar-gold`
  - Cleaner separation of structure (JS) and style (CSS)
- Zero inline `style="width:"` remaining in any JS file (verified via grep)
- SW cache bumped to v58, production build regenerated (170KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 77: HTML Escape Optimization, README Freshness ✅
- **HTML escape single-pass regex** — `_formatText()` HTML escape consolidated from 3 chained `.replace()` calls into 1 regex
  - `VNUI._HTML_ESC_RE = /[&<>]/g` with `VNUI._HTML_ESC_MAP` lookup object
  - Previously: `text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')` — 3 full string scans
  - Now: single `replace(VNUI._HTML_ESC_RE, c => VNUI._HTML_ESC_MAP[c])` — 1 scan
  - Called on every scene render for all dialogue text (`_formatText` is the main text pipeline)
- **README build sizes updated** — were stale at 161KB/85KB, now correctly show 170KB JS / 88KB CSS
- SW cache bumped to v59, production build regenerated (170KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests

## Phase 78: Favorites O(1), Single-Pass Stats, Typewriter CSS, Timer Safety ✅
- **StoryTracker.isFavorite() O(1)** — cached `_favoritesSet` (Set) replaces `Array.includes()` per call
  - Set rebuilt lazily, invalidated on `toggleFavorite()` and `reset()`
  - `isFavorite()` called on every story card decoration (30 calls per title screen render) — now O(1) vs O(n)
- **StoryTracker.getStats() single-pass** — replaced `Object.keys().filter()` + 2× `.reduce()` with one `for...in` loop
  - Was 3 array passes over the stories object; now 1 pass with inline accumulation
- **AchievementSystem._buildContext() single-pass** — merged `getStats()` + `Object.entries()` into one `for...in` loop
  - Previously called `tracker.getStats()` (which does its own iteration) + iterated again for bestTurns/completedSlugs
  - Now builds all stats in one pass, returns a flat object (no spread allocation)
- **Typewriter char visibility: CSS class** — replaced inline `style.visibility = 'hidden'/'visible'` with `.tw-hidden` CSS class
  - `charSpans[i].className = ''` to reveal (faster than `style.visibility` property access)
  - New `.tw-hidden { visibility: hidden; }` rule in style.css
- **Background inference optimization** — avoids `[...].join(' ').toLowerCase()` string allocation per scene render
  - Now calls `.toLowerCase()` on location/sceneId/text individually and checks each against keywords
  - Same behavior, zero intermediate string/array allocation
- **Reusable `_endingContinueBtn`** — single button element reused across all ending screens
  - Was calling `document.createElement('button')` on every ending
- **Screen transition timer safety** — `_screenTransTimer` tracked and cleared on rapid title↔story switches
  - Prevents overlapping `exiting` class removal if transitions happen faster than 500ms
- **Choice ripple timer safety** — `_choiceRippleTimer` tracked to prevent stale callback if rapid clicks occur
- SW cache bumped to v60, production build regenerated (170KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 79: DRY Scene Advance, Immutable Scenes, Repo Hygiene ✅
- **`advanceScene()` helper** — extracted repeated scene-advance pattern into single function
  - 3 duplicated blocks (textbox click indicator, touch gesture, keyboard Space/Enter) + auto-play timer → all call `advanceScene()`
  - Pattern: check `currentEngine` → get scene → validate `next` + no choices + no ending → `goToScene` + `playScene`
  - Eliminates 4 copies of the same 5-line block scattered across main.js
- **Immutable scene data** — `playScene()` no longer mutates `scene.effect` when shake/glitch is disabled
  - Previously: `scene.effect = null` then `scene.effect = origEffect` (mutated parsed story data)
  - Now: creates shallow copy `{ ...scene, effect: null }` only when needed (original data unchanged)
  - Prevents subtle bugs if scene objects are referenced elsewhere
- **Repo hygiene** — removed `tests/` and `playwright.config.js` from `.gitignore`
  - Tests and config were tracked in git but excluded by gitignore (confusing)
  - Previous git corruption lost `.git/HEAD` and `.git/config` — rebuilt from fresh clone
  - Playwright config recreated (was lost during corruption)
- SW cache bumped to v61, production build regenerated (170KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests pass

## Phase 80: Reusable Overlays, Tracked Timers, SpeedLabel Optimization ✅
- **ConfirmDialog reusable overlay** — overlay built once via `_ensureOverlay()`, content updated per `show()` (no DOM create/remove per invocation)
  - Previously: `document.createElement('div')` + full innerHTML + `overlay.remove()` on every confirm/cancel
  - Now: single persistent overlay with cached `_titleEl`, `_messageEl`, `_okBtn`, `_cancelBtn` refs
  - Delegated click + permanent keydown handler (only fires when `_resolve` is set)
  - Previous dialog auto-cancelled if `show()` called while one is open
- **StoryIntro reusable overlay** — overlay built once via `_ensureOverlay()`, portrait/title/desc updated per `show()`
  - Previously: `document.createElement('div')` + full innerHTML + `overlay.remove()` on every story start
  - Now: persistent overlay with cached refs, content swapped via `.textContent` / `.src`
  - Continue button click handler bound once (uses `_dismissFn` callback pattern)
- **AchievementSystem reusable toast** — toast element built once via `_ensureToast()`, content updated per `showToast()`
  - Previously: new `document.createElement('div')` + innerHTML per achievement unlock
  - Now: single element with cached `_toastIconEl`, `_toastNameEl`, `_toastDescEl` refs
  - Appended/detached from body as needed (not destroyed)
  - Auto-dismiss timers tracked in `_toastTimers` (consistent with existing pattern)
- **SettingsPanel feedback timer tracking** — export/import/campaign-reset button text reset `setTimeout` calls tracked in `_feedbackTimers[]`
  - `hide()` now cancels all pending feedback timers (prevents orphan writes to hidden buttons)
  - Previously: 3 untracked `setTimeout` calls could fire after panel was closed
- **SettingsPanel._speedLabel() optimization** — replaced `Object.keys(labels).reduce()` with pre-sorted `_SPEED_BREAKS` threshold scan
  - `_SPEED_BREAKS` is a static sorted array of `[threshold, label]` tuples
  - Single linear scan with early return (O(1) for common values) vs allocating key array + full reduce per call
  - Called on every slider input event and every `_syncAll()` (panel open/setting change)
- SW cache bumped to v62, production build regenerated (173KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 81: DocumentFragment Batching, Reusable Ending Elements, Overlay Pointer Fix ✅
- **DocumentFragment for `renderStoryList()`** — batch-appends 30 story cards via fragment (1 reflow instead of 30 individual `appendChild` calls)
- **DocumentFragment for `renderChapterGrid()`** — batch-appends act sections via fragment
- **Reusable ending DOM elements** — `_endingTimeBox`, `_endingNewBadge`, `_endingCampaignBtn` created once, content updated per ending
  - Previously: `document.createElement()` on every ending reached (reading time box, new-ending badge, campaign next button)
  - Now: single elements reused, content swapped via `textContent`/`querySelector` update
- **Number key choice lookup** — `querySelectorAll('.choice-btn')` on every keystroke → `querySelector('[data-choice-idx="N"]')` (targeted single-element lookup)
- **CRITICAL FIX: Persistent overlay pointer-events** — Phase 80 made StoryIntro and ConfirmDialog overlays persistent (no DOM add/remove), but they stayed `position: fixed; inset: 0` with `opacity: 0` — still blocking all clicks behind them!
  - Added `pointer-events: none` on base `.story-intro-overlay` and `.confirm-overlay`
  - Added `pointer-events: auto` on `.visible` state
  - This was causing 41/50 Playwright test failures (intro overlay intercepting all clicks after first story dismiss)
- SW cache bumped to v63, production build regenerated (173KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 82: Partial Re-Render, Cached Filters, Gallery Fragment ✅
- **Stats Dashboard partial re-render** — search/sort input now calls `_renderStoryTable()` instead of full `_render()`
  - Previously: every keystroke in the search box rebuilt the entire panel innerHTML (summary cards + recently played + story table)
  - Now: only the `.stats-story-table` and `.stats-story-count` elements are updated
  - `_lastStoryRows` cached after full render, reused by partial table updates
  - Reduces DOM thrash during rapid search typing (especially impactful with 30+ story rows)
- **Stats Dashboard O(1) story lookup** — `_playStoryBySlug()` uses `_storySlugMap` (Map) instead of `Array.find()`
  - `_storySlugMap` built in `setStories()` alongside `_storyIndex`
  - Clicked story row → hide panel → start story with zero linear scan
- **Scene Select cached items** — `_cachedItems` array built once in `show()` after rendering scene list
  - `_applyFilter()` now iterates the cached array instead of calling `querySelectorAll('.scene-select-item')` per keystroke
  - Same pattern as HistoryPanel._cachedEntries (consistency across filter panels)
- **Gallery DocumentFragment** — character cards appended via fragment (1 reflow instead of 45+ individual `appendChild` calls)
  - Same pattern used in `renderStoryList` and `renderChapterGrid`
- SW cache bumped to v64, production build regenerated (175KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 87: Tracked Misc Timers, Complete Data Export ✅
- **`trackTimeout()` helper + `clearMiscTimers()`** — 5 untracked `setTimeout` calls in main.js now managed
  - Achievement show timers (2× — on ending + on story start) were firing after menu return
  - Campaign advance pacing timer + nested achievement toast timer could fire on stale state
  - `_miscTimers` array tracks all IDs, auto-removes on fire, bulk-cleared in `returnToMenu()`
  - Follows the same pattern as `_effectTimers` (UI), `_blipTimers`/`_fadeTimers` (audio), `_toastTimers` (achievements)
- **DataManager.DATA_KEYS expanded** — added `nyantales-title-browser` and `nyantales-stats-dashboard`
  - These localStorage keys (persisted search/filter/sort state) were missing from export/import
  - Users restoring from backup now get their browsing preferences back
- SW cache bumped to v69, production build regenerated (178KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 88: Permanent History Keydown, Cached Chapter Refs, Gallery Debounce, Toast CSS ✅
- **HistoryPanel permanent keydown handler** — installed once in `_create()`, gated by `isVisible`
  - Previously: `document.addEventListener('keydown')` added on every `show()`, removed on `hide()`
  - Same pattern as ConfirmDialog and StoryIntro (proven safe across 80+ phases)
  - Eliminates per-show addEventListener/removeEventListener churn
- **Cached chapter card child refs** — `_chapterCardRefs` Map built lazily on first `_refreshChapterCards()`
  - Maps chapter index → `{ card, titleEl, descEl, statusEl }`
  - Avoids 3 `querySelector` calls per card on every menu return (was 3 × N cards per refresh)
  - Cache cleared when grid is rebuilt (campaign unavailable or full re-render)
- **Gallery search debounced at 80ms** — prevents per-keystroke filter on 45+ character cards
  - Same debounce pattern used by TitleBrowser search (consistency)
- **Toast color CSS classes** — replaced hardcoded `rgba()` inline styles with CSS utility classes
  - `.nt-toast-success` (green), `.nt-toast-error` (red), `.nt-toast-warning` (orange)
  - Applied to: online/offline toasts, error boundary toasts, `Toast.success()`, `Toast.error()`
  - Colors now follow the stylesheet instead of being baked into JS
- SW cache bumped to v70, production build regenerated (179KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

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
- 2026-03-27 (6:27 PM): Phase 73 — Audio blip timer leak fix (recursive setTimeout chains tracked in _blipTimers, cancelled on theme change/stop — prevents unbounded oscillator accumulation). Shared noise buffer (single 4s AudioBuffer reused across themes, was allocating ~350KB throwaway per switch). Typewriter O(n²)→O(n) (formatText called once, characters revealed via visibility toggle on pre-split text nodes instead of re-formatting entire growing substring per 2-char tick). SW v55, 169KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
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

## Phase 62: Stats Dashboard Search + Quick Launch ✅
- **Searchable story breakdown** — stats dashboard now includes a live search box that filters by story title or slug
  - Count label updates live (`X/30 shown`)
  - Empty-state message shown when nothing matches
- **Sortable story breakdown** — added sort dropdown for:
  - Most Progress
  - Recently Played
  - Most Plays
  - Most Endings
  - Longest Read Time
  - Title A → Z
- **Quick-launch story rows** — both the “Recently Played” cards and per-story breakdown rows are now keyboard/mouse activatable
  - Click or press Enter/Space to start that story directly from the stats dashboard
  - Added `tabindex`, `role="button"`, and focus-visible styling for keyboard accessibility
- **CSS polish**
  - New stats control row styling for search/sort inputs
  - Focus states for clickable stats rows/cards
  - Removed inline campaign card width/color styling in favor of reusable CSS classes (`.stats-card-wide`, `.stats-card-gold`)
- **Regression coverage**
  - Added Playwright test: open stats dashboard → search for Terminal Cat → launch from filtered row
- Production build regenerated (`159KB` JS / `83KB` CSS)
- Verified `npm test` (204/204 passing), `npx playwright test` (43/43 passing), and `node --check` on touched files
- No new stories added

## Phase 68: Performance — O(1) Story Lookups, Parallel Boot, Cached DOM ✅
- **`storySlugMap` (Map)** — O(1) story lookups replacing 9 `storyIndex.find()` O(n) linear scans
  - Built once in `loadStoryIndex()`, used throughout main.js (gallery, stats, save-load, campaign, routing)
  - Eliminates iterating 30-element array on every continue-button update, save-load, route change, campaign chapter
- **Parallel boot loading** — `Promise.all` for story index + campaign + portrait preload
  - Previously sequential: stories → campaign → render (portraits awaited even earlier, blocking init)
  - Now all 3 fire concurrently, cutting boot time on slow connections
- **Pre-created filter DOM elements** — `_filterCountEl` and `_filterEmptyEl` created once at init
  - Previously: `getElementById` + conditional `createElement` on every filter keystroke (hot path during search)
  - Now: pre-built with `.hidden` class, toggled via classList
- **Cached DOM refs** — `btnContinueEl`, `filterTags[]`, `_loadingFill`, `_loadingLabel`
  - `updateContinueButton()` no longer queries `getElementById('btn-continue')` per menu return
  - `syncTitleBrowserControls()` uses cached `filterTags` array instead of `querySelectorAll` per sync
  - `updateLoadingProgress()` uses cached loading screen refs instead of `querySelector` per call
- SW cache bumped to v50, production build regenerated (162KB bundle)
- All 32 JS files pass `node --check` validation
- 50/50 Playwright tests pass

## Phase 69: TitleBrowser Extraction, Campaign Lock Optimization, QoL ✅
- **TitleBrowser module extraction** (`web/js/title-browser.js`) — 250+ lines of search/filter/sort/persist logic extracted from main.js
  - `TitleBrowser` class encapsulates: search input (debounced), filter tabs, sort dropdown, state persistence, clear/reset, count/empty indicators, mobile sticky sync
  - main.js reduced from 1883 → 1703 lines (180 lines removed, some added for campaign lock map)
  - All event wiring (input, click, change, scroll, resize, orientationchange) handled internally
  - Public API: `refreshCards()`, `apply()`, `reset()`, `syncMobileSticky()`, `isSearchFocused`
  - Drop-in replacement: main.js now creates a `TitleBrowser` instance and calls `titleBrowser.apply()` / `titleBrowser.refreshCards()`
- **O(1) campaign lock lookups** — `isStoryUnlocked()` refactored from O(n) linear scan to Map lookup
  - `_campaignSlugMap` (Map) maps story slugs to `{type: 'chapter', index}` or `{type: 'bonus', flag}`
  - Built once when campaign loads via `rebuildCampaignSlugMap()`, rebuilt after `campaign.advance()`
  - Eliminates 30×26 = 780 iterations per title screen render (30 cards × up to 26 chapters scanned)
- **Campaign ending + achievements deferred** — achievement popups now queued during campaign mode intro to prevent premature overlay clutter
- **Ending Continue button** — ending overlay requires explicit "Continue ▶" click before showing the ending splash
  - `_waitForEndingContinue()` in VNUI shows gold-accented button, waits for click/Enter/Space
  - Gives players time to read the final scene text
- **Campaign story locking** — stories tied to campaign chapters are hidden/locked until the player reaches them
  - Locked cards show dimmed with 🔒 icon and "Progress through the campaign to unlock"
  - Non-campaign stories always available
- **Left-aligned story text** — story text and ASCII art content now left-aligned for readability
- SW cache bumped to v51, production build regenerated (167KB minified bundle)
- All 32 JS files pass `node --check` validation, 204/204 unit tests pass, Playwright passes
- Committed & pushed

## Log (continued)
- 2026-03-28 (1:27 AM): Phase 80 — Reusable overlays: ConfirmDialog (overlay built once, content swapped per show instead of create/remove), StoryIntro (same pattern — persistent overlay with cached refs), AchievementSystem toast (single element reused, content updated per unlock). SettingsPanel feedback timers tracked in _feedbackTimers array, cleared on hide (was 3 untracked setTimeout calls). _speedLabel optimization (pre-sorted threshold scan replaces Object.keys().reduce()). SW v62, 173KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (10:27 PM): Phase 77 — HTML escape single-pass regex (_formatText's 3 chained .replace() → single VNUI._HTML_ESC_RE regex with map lookup). README build sizes refreshed (170KB JS / 88KB CSS). SW v59. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (9:27 PM): Phase 76 — Cached settings DOM (theme swatches array + toggle button refs eliminate querySelectorAll/getElementById on every _syncAll). Tracker _visitedSets Map cache (avoids new Set() per recordVisitedScenes call). All 9 inline style="width:X%" progress bars converted to CSS --bar-pct custom property. Stats bar colors → CSS classes (.stats-bar-magenta/green/yellow/gold). Zero inline width styles remaining in JS. SW v58, 170KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (8:27 PM): Phase 75 — Achievement toast timer tracking (staggered showNewUnlocks timeouts now in _toastTimers array, cancelPendingToasts() called on menu return). Cached HistoryPanel entries (eliminates querySelectorAll per filter keystroke). ConfirmDialog double-resolve guard (prevents race between Escape + click). SW v57, 169KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (7:27 PM): Phase 74 — Asset cleanup + build optimization: removed 15 unused legacy portrait files (~10MB), build script now only copies 44 referenced portraits (31MB vs 41MB), PortraitManager.preloadAll() deduplicates by filename (54 map entries → 44 Image loads). SW v56, 169KB JS bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (5:27 PM): Phase 72 — Timer cleanup + CSS custom properties: tracked effect timers (glitch/shake/sprite fade-out) in _effectTimers array to cancel on scene change (fixes stale timer bug during rapid navigation). Story card/choice animation delays use CSS custom properties instead of inline style.animationDelay. Progress bar width driven by --bar-pct. Route map cursor state uses CSS class. Cached getStoryMeta() per slug. SW v54, 168KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. 2 commits pushed.
- 2026-03-27 (4:27 PM): Phase 71 — Campaign ending delegation (per-ending addEventListener → data-action handled by existing ending delegation, fixes listener leak). Pre-computed bg keyword entries (Object.entries() allocation per render → pre-built array). Sprite fade-out Set lookup (O(n²) find → O(1) Set.has). Combined _formatText regex (4 sequential .replace → single VNUI._FORMAT_RE pass). Scoped ending stats query. SW v53, 167KB bundle. All 32 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (3:27 PM): Phase 70 — Pre-created overlay indicators (autoPlayIndicator/skipIndicator/progressHUD/progressBar built once at init instead of lazy createElement), engine callbacks wired once (onChoice/onRestart/onMenu/_onEndingHook no longer re-assigned every initEngine call), fixed 3 Playwright test regressions from Phase 69 campaign locking (tests now target unlocked cards). main.js 1704→1688 lines. SW v52, 167KB bundle. All 32 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-27 (2:27 PM): Phase 69 — Extracted TitleBrowser class from main.js (250+ lines → own module), O(1) campaign lock lookups via pre-built slug map (replaces 780 iterations per render), campaign story locking, ending Continue button, achievement deferral during campaign, left-aligned text. main.js 1883→1703 lines. SW v51, 167KB bundle. All 32 JS + 204/204 unit tests pass. Committed & pushed.
- 2026-03-27 (1:27 PM): Phase 68 — Performance: replaced 9 `storyIndex.find()` O(n) linear scans with `storySlugMap` Map for O(1) lookups. Parallelized boot loading (story index + campaign + portrait preload via Promise.all). Pre-created filter count/empty state DOM elements at init instead of lazy createElement in hot filter path. Cached btnContinueEl, filterTags, loading screen refs. SW v50, 162KB bundle. All 32 JS + 50/50 Playwright pass. No new stories added.
- 2026-03-27 (11:27 AM): Phase 66 — Polished the mobile title browser: the story search/filter/sort block is now a sticky frosted panel on small screens, the story list no longer traps touch scrolling inside a nested inner scroller, narrow-width filter pills can scroll horizontally, and title stats wrap more cleanly. Added a Playwright regression covering sticky mobile filters/page-level scrolling, updated the README feature list, bumped the service worker to v49, and regenerated dist. No new stories added.
- 2026-03-27 (9:27 AM): Phase 64 — Added a `🔗 Share` button to the Story Info modal so title-screen story cards can copy/share clean deep links (`/?story=slug`) before starting a run. Introduced `web/js/share.js` to centralize canonical story URL generation plus native share→clipboard fallback, reused it for ending-share code, wrapped Story Info action buttons better on mobile, added a Playwright regression for Story Info share, updated README build sizes/features, bumped SW to v47, and regenerated dist (160KB JS / 84KB CSS). Verified `node --check`, `npm test` (204/204), and `npx playwright test` (45/45). No new stories added.
- 2026-03-27 (8:27 AM): Phase 63 — Stats dashboard mobile polish: converted the cramped phone-size breakdown table into labeled stat cards, persisted stats search/sort state in localStorage, added a Playwright regression for close→reopen state persistence, updated README, bumped SW to v46, and regenerated the production build. No new stories added.
- 2026-03-27 (7:32 AM): Phase 62 — Stats dashboard polish: added live search + sort controls to the per-story breakdown, clickable/keyboard-activatable story rows for quick launch, focus-visible states, an empty search state, and a new Playwright regression covering search→launch flow. Rebuilt dist (159KB JS / 83KB CSS), verified `npm test` (204/204), `npx playwright test` (43/43), and `node --check`. No new stories added.
- 2026-03-27 (5:27 AM): Phase 60 — Added real PWA install UX to the web VN: new title-screen `📲 Install App` button appears when `beforeinstallprompt` is available, defers and launches the browser install prompt on tap, and hides itself after `appinstalled` / standalone mode. Added iPhone/iPad fallback guidance (Share → Add to Home Screen) when Safari has no install prompt. Styled new `.install-btn`, updated About panel + README, regenerated dist (154KB JS / 81KB CSS), and verified `npm test` (204/204 passing). No new stories added.
- 2026-03-27 (4:27 AM): Phase 59 — Refreshed the Playwright browser regression suite (`tests/web/vn.spec.js`) so it matches the current VN UI instead of the old pre-polish interface. Added coverage for story cards + info modal, intro flow, choice playback, numeric shortcuts, settings panel controls, history log, auto-play toggle, mobile HUD overflow, all 30 story YAML assets, and runtime page-error checks. Verified `npx playwright test` (42/42 passing), `npm test` (204/204 passing), and `cd web && bash build.sh` (dist regenerated: 152KB JS / 81KB CSS). No new stories added.
- 2026-03-27 (3:27 AM): Phase 58 — Added proper browser Back/Forward support for `?story=slug` deep links using pushState/replaceState + popstate handling. Added routeChangeSerial guard to prevent intro/routing races. Scene Select now caches DOM refs, shows live matching counts, and displays a no-results search state. Settings panel removed remaining inline style usage for theme swatches/campaign reset and theme buttons now expose aria-pressed. README updated, SW v45, production build regenerated (152KB JS / 81KB CSS). All touched JS pass `node --check`.
- 2026-03-27 (2:27 AM): Phase 57 — Added shareable `?story=slug` deep links: boot auto-opens requested story, browser URL syncs during play via replaceState, ending share cards include per-story play URLs, and root index redirect now preserves query/hash into `web/dist/`. README updated, SW v44, production build regenerated (150KB JS / 80KB CSS). All 31 JS pass. Committed & pushed.
- 2026-03-27 (1:27 AM): Phase 56 — Extracted CampaignManager from engine.js into new web/js/campaign.js, wired it into index.html + build.sh + service worker, corrected production request-count summary, bumped SW to v43. engine.js now 250 lines (down from 483). Production build regenerated (148KB bundle). All 31 JS pass.
- 2026-03-27 (12:27 AM): Phase 55 — Restored full title screen that was broken by campaign-first redesign. Story grid, search, filter, sort, continue, random all back. Campaign section shown above story grid with divider. Cached campaign DOM refs. Removed 45 lines dead CSS. SW v42. 147KB bundle. All 30 JS pass. 3 commits pushed.
- 2026-03-27 (6:27 AM): Phase 61 — Fixed stats dashboard play-count regression (`StatsDashboard` was reading `data.plays`, but tracker persists `totalPlays`), so play totals/recent-story metadata now reflect real completion runs again. Tightened global scene-exploration math to use exact visited-scene counts instead of percentage back-calculation, added total reading time to the stats dashboard, and expanded Story Info modal with endings found / total possible plus cumulative reading time. Made story-info stats grid auto-fit better on smaller screens and initialized stats dialog `aria-hidden` state cleanly. Rebuilt production bundle, verified touched JS with `node --check`, ran `npm test` (204/204), and `npx playwright test` (42/42). No new stories added.
- 2026-03-27 (12:27 PM): Phase 67 — Improved title-screen discovery by making story search character-aware: cards now index cast names, roles, and appearance text from `CHARACTER_DATA`, so searches like “Stack Canary” find the right story even if the title/description don’t mention it. Expanded the Story Info modal with a compact cast section (name + role chips, appearance in tooltip), updated the search placeholder/ARIA copy to reflect character search, and added Playwright regressions for character-name search plus cast rendering. Verified `node --check` on touched JS, `npm test` (204/204), and `npx playwright test tests/web/vn.spec.js` (50/50). No new stories added.
- 2026-03-28 (12:27 PM): Phase 91 — Pre-built ending DOM (constructor builds full ending overlay tree, content swapped via textContent instead of innerHTML per ending). Choice button pool (reusable _choiceBtnPool with pre-built child structure, eliminates createElement per choice per render). Cached story card refs (_storyCardRefs Map caches badge/saveIcon/barFill/favBtn per card, eliminates 150+ querySelector calls per menu return). Badge+saveIcon always created, toggled via .hidden. Zero innerHTML in hot render paths. SW v73, 183KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (9:27 AM): Phase 88 — Permanent HistoryPanel keydown handler (was add/remove per show/hide, now installed once + gated by isVisible). Cached chapter card child refs (_chapterCardRefs Map avoids 3× querySelector per card per refresh). Gallery search debounced at 80ms. Toast color CSS classes (.nt-toast-success/error/warning replace inline rgba). SW v70, 179KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (8:27 AM): Phase 87 — Tracked misc timers: 5 untracked setTimeout calls in main.js (achievement toasts on ending/start, campaign advance pacing) now managed via trackTimeout()/clearMiscTimers(), cleared on menu return. DataManager export/import now includes nyantales-title-browser and nyantales-stats-dashboard keys (were missing). SW v69, 178KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (3:27 AM): Phase 82 — Partial re-render for Stats Dashboard (search/sort only updates story table instead of full innerHTML rebuild). Stats O(1) story lookup via _storySlugMap. Scene Select cached item NodeList for filter reuse. Gallery DocumentFragment batching (45+ cards → 1 reflow). SW v64, 175KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (2:27 AM): Phase 81 — DocumentFragment batching (renderStoryList 30 cards → 1 reflow, renderChapterGrid act sections → 1 reflow). Reusable ending DOM elements (_endingTimeBox, _endingNewBadge, _endingCampaignBtn avoid createElement per ending). Number key choice lookup uses targeted querySelector instead of querySelectorAll. CRITICAL FIX: persistent overlays (StoryIntro, ConfirmDialog) were blocking all clicks when hidden (pointer-events not disabled) — caused 41/50 Playwright failures. SW v63, 173KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (12:27 AM): Phase 79 — DRY scene advance (extracted advanceScene() helper, replacing 4 duplicated advance-to-next-scene blocks in main.js). Immutable scene data (playScene no longer mutates scene.effect, uses shallow copy instead). Repo hygiene: fixed git corruption (lost HEAD/config), re-cloned, recreated playwright.config.js, removed tests/ and playwright.config.js from .gitignore so they're properly tracked. SW v61, 170KB bundle. All 33 JS + 204/204 unit pass. Committed & pushed.
- 2026-03-27 (11:27 PM): Phase 78 — Favorites O(1) Set cache (isFavorite was O(n) per call × 30 cards), single-pass getStats() and _buildContext() (was 3+ array passes each), typewriter visibility via CSS class instead of inline style, bg inference avoids string concatenation, reusable ending continue button, screen transition + choice ripple timer safety. SW v60, 170KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.

## Phase 83: Dead Code Removal, Listener Leak Fix, Shared Escape ✅
- **Removed dead `_esc()` methods** — `ConfirmDialog._esc()` and `StoryIntro._esc()` were never called anywhere
  - Both had been kept as "utility" methods but no code path actually invoked them
  - Removes ~20 lines of dead code + eliminates 2 unused `_escDiv` static allocations
- **StoryIntro keydown listener leak fix** — per-show `document.addEventListener('keydown', keyHandler)` replaced with permanent handler
  - Previously: each `show()` call added a new keydown listener, properly cleaned up on dismiss — but if `show()` was called twice rapidly (unlikely but possible during route changes), the first handler would never be removed
  - Now: single permanent keydown handler installed in `_ensureOverlay()`, only fires when `_dismissFn` is set
  - Matches the same pattern used by `ConfirmDialog` (permanent keydown, gated by `_resolve`)
  - Eliminates per-show addEventListener/removeEventListener churn
- **SaveManager._esc() upgraded** — now reuses `VNUI._escapeDiv` when available (was the only escape helper still creating its own element unconditionally)
  - Falls back to `SaveManager._escDiv` if VNUI isn't initialized yet
- SW cache bumped to v65, production build regenerated (174KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests

## Phase 84: Inventory Diff, Permanent EndingContinue, Content-Visibility ✅
- **Inventory DOM diff** — `_updateInventory()` now caches a key of current items, skips innerHTML rebuild when inventory is unchanged between scenes
  - Common case: most scenes don't add/remove items, so this avoids redundant DOM writes on every scene render
  - Key is `items.join('\0')` — cheap and collision-free for inventory-sized arrays
- **Ending Continue button: permanent handlers** — replaced per-show `addEventListener`/`removeEventListener` with permanent click + keydown handlers
  - Previously: each `_waitForEndingContinue()` call added a click handler on the button and a document keydown handler, then removed them on dismiss
  - Risk: if called twice rapidly (e.g. during fast skip through endings), first handler pair could leak
  - Now: permanent handlers installed once when the button is created, gated by `_endingContinueResolve` being set
  - `_dismissEndingContinue()` extracted as proper method (clears resolve, hides choices)
  - Same pattern used by ConfirmDialog and StoryIntro (proven safe across 80+ phases)
- **CSS `content-visibility: auto`** on `.story-card` — browser skips rendering offscreen cards in the 30-card grid
  - `contain-intrinsic-size: auto 120px` provides a size estimate for scroll positioning
  - Combined with existing `contain: content` for full containment + rendering optimization
  - Especially impactful on mobile where only 3-4 cards are visible at a time
- SW cache bumped to v66, production build regenerated (175KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests

## Phase 85: Audio Fade Timers, Partial Title Screen Refresh ✅
- **Audio fade timer tracking** — `setTheme()` and `stop()` had 3 untracked `setTimeout` calls
  - `_fadeTimers` array tracks all fade-in/out and node-cleanup timers
  - `_cancelFadeTimers()` called at start of every `setTheme()` and `stop()` (alongside `_cancelBlipTimers()`)
  - Prevents stale callbacks: rapid scene transitions could fire old node-stop timers after a new theme was already built, or fire old build timers against a now-irrelevant theme
  - `_trackFadeTimer(id)` convenience method matches existing `_blipTimers` pattern
- **Partial title screen refresh** — `renderTitleScreen()` no longer destroys/rebuilds 30 story cards on every menu return
  - First call builds the full grid (same as before)
  - Subsequent calls run `_refreshStoryCards()` — updates badges, progress bars, favorites, save indicators, and data attributes in-place
  - Avoids cost of: `storyListEl.innerHTML = ''` + DocumentFragment build + 30 `decorateStoryCard()` calls + sprite re-rendering + CSS animation replays
  - `_gridBuilt` flag tracks whether the initial build has been done
  - Lock state changes (campaign advance) handled by `_resetCardForRedecorate()` — strips dynamic decorations and re-runs `decorateStoryCard()` for that single card
  - Net effect: menu return is significantly cheaper (DOM diff vs full rebuild)
- SW cache bumped to v67, production build regenerated (177KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 86: Reusable Sprite Set, Cached Recent Save, Chapter Grid Partial Refresh, Engine Guard ✅
- **Reusable `_visibleNamesBuf` Set** — `_updateSprites()` was allocating a new `Set` via `new Set(visible.map())` on every scene render
  - Now reuses a single `_visibleNamesBuf` Set instance, cleared and repopulated per render (zero allocation)
  - Called on every scene transition for sprite fade-out diffing
- **SaveManager `getMostRecentSave()` cache** — result cached in `_recentCache`, invalidated on `save()`, `deleteSlot()`, and `migrateLegacy()`
  - Previously: scanned all `localStorage` keys on every title screen render (called from `updateContinueButton()`)
  - Now: single scan on first call, O(1) on subsequent calls until a save changes
  - Especially impactful with many stories that have saves
- **Chapter grid partial refresh** — `renderChapterGrid()` now matches the story card pattern
  - First call: builds full grid from scratch via DocumentFragment
  - Subsequent calls: `_refreshChapterCards()` updates classes, text, aria, and status icons on existing cards
  - `_chapterGridBuilt` flag tracks whether the initial build has been done
  - Reset when campaign data is unavailable
  - Avoids full `innerHTML = ''` + rebuild on every menu return
- **Engine `loadState()` safety** — caps history at 500 entries and snapshots at 200 on load
  - Prevents memory bloat from corrupt or very old saves with unbounded arrays
  - Also adds fallback defaults for missing `inventory` and `turns` fields
- SW cache bumped to v68, production build regenerated (178KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 89: Cached DOM Everywhere, Zero Hot-Path innerHTML ✅
- **ProgressHUD pre-built spans** — `_visitedSpan` and `_turnSpan` children created once at init
  - Previously: `innerHTML` with template literal on every scene render (hot path during play + skip mode)
  - Now: `textContent` updates on pre-built span elements (zero parsing, zero DOM allocation)
- **Ending time box cached value span** — `_endingTimeBox._valSpan` avoids `querySelector('.ending-stat-value')` per ending
  - Also builds children via `createElement` instead of `innerHTML` on first creation
- **Stats bar pre-built elements** — `_ensureStatsBar()` builds 5 stat divs once, `_updateStatsBar()` updates via `textContent`
  - Previously: `statsEl.innerHTML = ...` rebuilt 5 divs with spans on every menu return
  - Now: zero innerHTML on menu return, just 10 textContent writes
- **Continue button pre-built** — text node + `<span class="continue-meta">` created once at init
  - Previously: `btn.innerHTML = ...` on every `updateContinueButton()` call (every menu return)
- **Campaign button pre-built** — text node + `<span class="campaign-meta">` created once at init
  - Previously: `campaignBtnEl.innerHTML = ...` on every `updateCampaignButton()` call
- **Cached `_currentTotalScenes`** — `Object.keys(engine.scenes).length` computed once per story start
  - Previously: `Object.keys()` allocated a new array on every `updateProgressHUD()` call
- **StoryIntro exit timer tracked** — `StoryIntro._exitTimer` prevents orphaned 500ms setTimeout
- **Toast.info CSS class** — `.nt-toast-info` replaces inline `color: 'rgba(0,80,120,0.9)'`
- innerHTML usage in main.js: 13 → 8 (remaining 8 are one-time init/build/error, zero in hot paths)
- SW cache bumped to v71, production build regenerated (180KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- 2 commits pushed

## Phase 90: Pre-Built Speaker DOM, Pooled Inventory/Conditionals, Static Icons ✅
- **Speaker name plate pre-built DOM** — `_speakerIcon` (img) and `_speakerText` (TextNode) created once in constructor, reused on every scene render
  - Previously: `speakerEl.innerHTML = \`<img ...> ${name}\`` on every scene with a speaker (hot path during play + skip mode)
  - Now: updates `_speakerIcon.src` + `_speakerText.textContent` only when speaker changes
  - `_lastSpeakerKey` cache key skips DOM write entirely when same speaker speaks consecutive scenes (common in dialogue-heavy stories)
  - `setStorySlug()` resets cache
- **Inventory pooled `<span>` elements** — reusable pool `_invPool` avoids `innerHTML + map + join` per inventory update
  - Pool grows lazily to match max inventory size, elements reused via DocumentFragment
  - `inventoryEl.textContent = ''` replaces `innerHTML = ''` for clear
- **Conditionals pooled `<div>` elements** — `_condPool` avoids `innerHTML + map + join` per conditional render
  - Same pool + fragment pattern as inventory
  - `conditionalEl.textContent = ''` replaces `innerHTML = ''` for clear
- **Static `VNUI._ENDING_ICONS`** — ending type → icon map moved from object literal inside `_showEnding()` to static property
  - Was allocating `{ good: '🌟', bad: '💀', neutral: '📋', secret: '🔮' }` on every ending reached
- innerHTML usage in ui.js hot paths: speaker (eliminated), inventory (eliminated), conditionals (eliminated)
- SW cache bumped to v72, production build regenerated (181KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 91: Pre-Built Ending DOM, Choice Pool, Cached Story Card Refs ✅
- **Pre-built ending overlay** — `_buildEndingDOM()` constructs the entire ending DOM tree once in constructor
  - Previously: `endingEl.innerHTML = \`...\`` rebuilt 15+ elements on every ending reached
  - Now: pre-built refs (`iconEl`, `typeEl`, `textEl`, `statsGrid`, `turnsVal`, `scenesVal`, `invBox`, `actionsRow`) updated via `textContent` per ending
  - `endingEl.textContent = ''` + `appendChild` re-assembles without parsing
  - Inventory stat box conditionally appended only when items exist
  - `hideEnding()` uses `textContent = ''` instead of `innerHTML = ''`
- **Choice button pool** — `_choiceBtnPool` array of reusable `<button>` elements
  - Previously: `document.createElement('button')` per choice per render, with `innerHTML` for num hint + label + visited badge
  - Now: buttons created once in pool with pre-built child structure (`_numSpan`, `_textNode`, `_visitedSpan`)
  - Pool grows lazily as needed, buttons reused via `textContent` update + `appendChild`
  - `choicesEl` uses `textContent = ''` instead of `innerHTML = ''` throughout (showChoices, hideChoices, waitForEndingContinue, dismissEndingContinue)
  - DocumentFragment batching for all choice buttons
- **Story card child ref caching** — `_storyCardRefs` Map caches per-card DOM refs
  - `decorateStoryCard()` now always creates badge + saveIcon (toggled via `.hidden` class instead of conditional create/remove), enabling consistent ref caching
  - Cached refs: `badge`, `saveIcon`, `barFill`, `barEl`, `favBtn`
  - `_refreshStoryCards()` now uses cached refs instead of 5+ `querySelector` per card × 30 cards = 150+ querySelector calls eliminated per menu return
  - Refs invalidated on lock state change (rare: campaign advance) or full grid rebuild
  - Progress bar fill built via `createElement` instead of `innerHTML`
  - Meta info built via `createElement` instead of `innerHTML`
- innerHTML remaining in ui.js: only init/one-time paths (story grid build, typewriter internal, escapeHtml) — zero in hot render paths
- SW cache bumped to v73, production build regenerated (183KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 92: innerHTML Elimination — Init & Build Paths ✅
- **Story card grid: innerHTML → createElement chain** — `renderStoryList()` no longer uses `card.innerHTML` with template literal
  - Previously: `card.innerHTML = \`<div class="story-card-inner">...\``  with interpolated sprite HTML + escaped title/description
  - Now: builds `inner` div, `img` sprite, `textDiv` with `h3`/`p` children all via `document.createElement`
  - `h3.textContent` / `p.textContent` inherently safe (no XSS risk from story titles)
  - `storyListEl.innerHTML = ''` → `storyListEl.textContent = ''`
- **Auto-play indicator** — `el.innerHTML = '<div class="auto-play-dot"></div> AUTO'` → createElement + TextNode
- **Skip indicator** — `el.innerHTML = '⏭ SKIP'` → `el.textContent`
- **Act headers** — `header.innerHTML = \`<span class="act-title">...\`` → createElement for `actTitle` + `actSub` spans
- **Clear operations** — 4 `innerHTML = ''` clear calls converted to `textContent = ''`:
  - `_clearSprites()`, `storyListEl`, `statsEl`, `chapterGridEl`
- **innerHTML remaining in main.js** — only error fallback (one-time, rare)
- **innerHTML remaining in ui.js** — only typewriter text rendering (must produce HTML: `<code>`, `<strong>`, `<em>`, `<br>`) and `_escapeHtml` utility (reads innerHTML)
- SW cache bumped to v74, production build regenerated (184KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 93: innerHTML Elimination — Warm Render Paths ✅
- **HistoryPanel.show()** — entries built via `createElement` + `DocumentFragment` (1 reflow)
  - Previously: `innerHTML = entries.map(...).join('')` rebuilt all entries as HTML string on every open
  - Now: loop builds `div.history-entry` with child `div.history-speaker` + `div.history-text` via `textContent`
  - `_cachedEntries` array built inline during creation (no `querySelectorAll` needed)
  - Reusable `_emptyEl` for zero-entry state
- **SaveManager._renderSlots()** — slot cards built via `createElement` loop + `DocumentFragment`
  - Previously: `innerHTML = SLOT_NAMES.map(...).join('')` with nested ternaries and HTML escaping
  - Now: explicit DOM construction per slot (header, preview, meta, actions) with `textContent`
  - New `_makeSlotBtn()` helper creates reusable slot action buttons
  - `slotsEl.textContent = ''` replaces `innerHTML` for clearing
- **SceneSelect.show()** — scene items built via `createElement` + `DocumentFragment`
  - Previously: `innerHTML = visitedArr.map(...).join('')` with per-item HTML template
  - Now: loop builds full item DOM tree (header, badges, location, speaker, preview, meta)
  - Reusable `_emptyEl` and `_filterEmptyEl` for empty/no-results states
  - `_applyFilter()`: replaced `insertAdjacentHTML` with pre-created element toggle
- **CharacterGallery** — card content built via `createElement` chain
  - Previously: `card.innerHTML = \`...\`` with portrait img, name, role badge, appearance, story tags
  - Now: explicit DOM construction with `textContent` (inherently XSS-safe)
- **TitleBrowser** — empty state uses pre-created `_emptyIconEl` + `_emptyHintEl` (was `innerHTML`)
- **Dead code removed** — `_esc()` methods from HistoryPanel, SceneSelect, SaveManager
  - All 3 were HTML-escape helpers only used by the now-eliminated `innerHTML` templates
  - `SaveManager._escDiv`, `HistoryPanel._escDiv`, `SceneSelect._escDiv` static allocations removed
- SW cache bumped to v75, production build regenerated (184KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Log (continued)
- 2026-03-28 (1:27 PM): Phase 92 — innerHTML elimination from init/build paths: story card grid uses createElement chain instead of innerHTML template (XSS-safe textContent for titles), auto-play/skip indicators built via DOM API, act headers via createElement, 4 innerHTML='' clears→textContent=''. Remaining innerHTML only in typewriter (needs HTML output) and error fallback. SW v74, 184KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
- 2026-03-28 (2:27 PM): Phase 93 — innerHTML elimination from warm render paths: HistoryPanel.show() entries via createElement+DocumentFragment (was innerHTML template per entry), SaveManager._renderSlots() slot cards via createElement loop+fragment (was innerHTML map+join), SceneSelect.show() scene items via createElement+fragment, CharacterGallery card content via createElement chain, TitleBrowser empty state via pre-created elements. Removed 3 dead _esc() methods (HistoryPanel, SceneSelect, SaveManager — no longer needed with textContent). SceneSelect._applyFilter() uses reusable _filterEmptyEl. All remaining innerHTML in these files is one-time overlay construction only. SW v75, 184KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.

## Phase 94: Pre-Built StoryInfo DOM, Pooled Stats Rows, Tooltip Safety ✅
- **StoryInfoModal pre-built DOM** — entire panel tree (header, stats grid, cast/endings/last-played sections, actions) constructed once in `_build()`
  - `show()` now swaps content via `textContent`/`src`/`className` (zero innerHTML on warm per-click path)
  - Pooled `_endingTagPool` and `_castChipPool` arrays — elements grow lazily, reused across show() calls
  - Continue button toggled via `.hidden` class instead of conditional HTML generation
  - Removed `_esc()` method entirely (no longer needed when using textContent)
  - Previously: `panel.innerHTML = \`...\`` with 80+ lines of template literal on every info button click
- **StatsDashboard pooled story rows** — `_renderStoryTable()` uses `_getStoryRow(idx, data)` pool
  - Previously: `tableEl.innerHTML` with `map().join('')` on every search keystroke/sort change
  - Now: pooled `<div>` elements with pre-built child structure (`_tdTitle`, `_miniBarFill`, `_pctSpan`, etc.)
  - Pool grows lazily, existing rows updated via `textContent` on re-render
  - Reusable `_tableHeader` and `_tableEmpty` elements (built once)
  - DocumentFragment batching for table rebuild (1 reflow)
- **RouteMap tooltip** — `innerHTML` with `<strong>` + `<br>` template → DOM API (`createElement` + `createTextNode`)
  - Prevents potential XSS from scene IDs containing HTML-like characters
- **SettingsPanel data stats** — `innerHTML` → `textContent` (content is plain text, no markup needed)
- SW cache bumped to v76, production build regenerated (188KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 95: Pre-Built StatsDashboard & AchievementPanel DOM ✅
- **StatsDashboard pre-built DOM** — entire panel tree constructed once in `_buildPanel()`
  - `_update()` swaps all content via `textContent` / `style.setProperty` (zero innerHTML per `show()`)
  - Summary cards (7 cards with values, totals, progress bars) all have cached DOM refs
  - Campaign section toggles via `.hidden` class, content updated via textContent
  - Recently-played items use reusable `_recentPool` with pre-built child structure (4 meta spans per item)
  - Excess pool items detached when fewer recent entries exist
  - Search input + sort select built via DOM API, values restored from persisted prefs
  - Story count + story table refs cached at build time (no querySelector in `_renderStoryTable`)
  - Removed `_escapeHtml()` method entirely — no longer needed when using textContent
  - Previously: `this._overlay.innerHTML = \`...\`` with 100+ lines of template literal on every `show()`
- **AchievementPanel pre-built DOM** — panel structure (header, progress bar, list) built once in `_ensureOverlay()`
  - `_update()` populates via pooled `_itemPool` elements with cached `_iconEl`, `_nameEl`, `_descEl` refs
  - Divider element reused between unlocked/locked sections
  - Removed `_renderItem()` HTML template method
  - Previously: `this._overlay.innerHTML = \`...\`` on every `show()` call
- SW cache bumped to v77, production build regenerated (189KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 96: innerHTML Elimination + CSP ✅
- **Eliminated innerHTML from all 11 overlay constructors** — converted to `document.createElement` chains
  - `confirm-dialog.js`, `story-intro.js`, `achievements.js` (toast), `history.js`, `scene-select.js`, `save-manager.js`, `gallery.js`, `route-map.js`, `keyboard-help.js`, `about.js`, `settings-panel.js`
  - Each module now builds its overlay DOM tree via `createElement` + `appendChild` instead of innerHTML template literals
  - Cached DOM refs (querySelector calls eliminated) built inline during construction
  - Settings panel uses helper functions (`mkRow`, `mkSlider`, `mkToggle`, `mkGroup`) for DRY construction
  - Keyboard help uses `mkSection` helper with data-driven row definitions + `|`/`~` separator parsing
  - Gallery filter buttons built from data array instead of repeated HTML
  - Route map legend/controls built via loop over tuples
- **Remaining innerHTML** — only 3 unavoidable uses:
  - `ui.js` typewriter rendering (must produce HTML: `<code>`, `<strong>`, `<em>`, `<br>`)
  - `ui.js` `_escapeHtml()` utility (reads `.innerHTML` by design)
  - `main.js` error fallback (one-time, rare path)
- **Content-Security-Policy meta tag** added to `web/index.html`
  - `script-src 'self'` — no `unsafe-inline` or `unsafe-eval` needed
  - `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'` — Google Fonts + CSS custom properties
  - `font-src 'self' https://fonts.gstatic.com` — Google Font files
  - `img-src 'self' data: blob:` — canvas sprites use data/blob URIs
  - All 50 Playwright tests pass with CSP enabled
- **Keyboard help `1–9` range** — fixed separator rendering (was showing `1 / 9` instead of `1–9`)
  - New `~` separator in key definitions renders as `–` (en-dash)
- **README** updated with CSP feature mention + accurate build output sizes (189KB JS)
- SW cache bumped to v78, production build regenerated (189KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Log (continued)
- 2026-03-28 (5:27 PM): Phase 96 — Eliminated innerHTML from all 11 overlay constructors (confirm-dialog, story-intro, achievements toast, history, scene-select, save-manager, gallery, route-map, keyboard-help, about, settings-panel) → pure DOM API construction. Added Content-Security-Policy meta tag (script-src 'self', no unsafe-eval/unsafe-inline for scripts). Fixed keyboard help 1–9 range separator. Remaining innerHTML only in typewriter (needs HTML output), _escapeHtml (by design), and error fallback. README updated. SW v78, 189KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.

## Phase 97: Cached Build Refs, Zero querySelector in Overlay Builders ✅
- **Settings panel `mkRow()` returns `{row, ctrl}`** — eliminates 7 `querySelector('.settings-control')` during build
  - Previously: `mkRow()` returned just the row, callers immediately queried `.settings-control` back
  - Now: control div ref returned alongside row, no DOM traversal needed
- **Settings body event delegation** uses cached `bodyEl` ref (was `querySelector('.settings-body')`)
- **Gallery search** uses cached `filterBtns` array for active role lookup (was `querySelector('.gallery-filter-btn.active')`)
- **History search input** cached from build variable (was `querySelector('.history-search')`)
- **SaveManager._panelEl** cached in `_buildOverlay()` (was lazy `querySelector` on first `show()`)
- **FocusTrap refs** — about, keyboard-help, settings panels use `overlay.firstElementChild` (no querySelector)
- Zero `querySelector` calls remain in any overlay builder's warm path
- SW cache bumped to v79, production build regenerated (189KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Phase 98: Warm-Path querySelector Elimination, Cached toLowerCase, Static Positions ✅
- **`_showEnding()` uses `_activeSprites` Map** — replaces `querySelectorAll('.vn-sprite-wrap')` per ending
  - Iterates cached Map instead of querying the entire sprites container DOM
  - Bonus: pre-computes `endingClass` string once instead of building it per sprite
- **Ending hook uses `ui._endingRefs`** — main.js accesses `.statsGrid` and `.actionsRow` directly
  - Replaces `ui.endingEl.querySelector('#ending-stats-grid')` and `.querySelector('.ending-actions')` per ending
  - Both refs are pre-built in `_buildEndingDOM()` (Phase 91) — now exposed for external use
- **Pre-computed `_sceneLower` object** — shared between `_sceneTransition()` and `_updateSprites()`
  - Both methods previously called `.toLowerCase()` independently on scene text, location, sceneId, and speaker
  - Now: computed once in `renderScene()` as `{ loc, scn, txt, spk }`, reused by both callees
  - Eliminates 6 redundant `.toLowerCase()` string allocations per scene render
  - Fallback to per-call `.toLowerCase()` if methods are called outside `renderScene()` (defensive)
- **Cached `_charHyphenCache`** — hyphenated character name lookup (for scene-ID matching)
  - `nameLower.replace(/\s+/g, '-')` was called per character per render (regex creation + string alloc)
  - Now cached per character per story in `_charHyphenCache` Map, reset on `setStorySlug()`
- **Static `VNUI._SPRITE_POS`** — pre-built position arrays for 0-3 characters
  - `_getSpritePositions()` was allocating new `[{ x, scale }]` arrays every render for 1-3 chars (the common case)
  - Now returns static frozen-shape arrays for counts 0-3, only allocates for 4+ (rare)
- **`ui._totalScenes`** — set from main.js at story start, used by `_showEnding()`
  - Avoids `Object.keys(engine.scenes).length` array allocation per ending
- SW cache bumped to v80, production build regenerated (189KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Log (continued)
- 2026-03-28 (6:27 PM): Phase 98 — Warm-path optimization: _showEnding uses _activeSprites Map instead of querySelectorAll, main.js ending hook uses ui._endingRefs directly (eliminates 2 querySelector per ending), pre-computed _sceneLower object shared between _sceneTransition + _updateSprites (saves 6 toLowerCase per render), cached _charHyphenCache (avoids regex per char per render), static VNUI._SPRITE_POS for counts 0-3 (zero allocation per render), ui._totalScenes avoids Object.keys in _showEnding. SW v80, 189KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.

## Phase 99: Cached Inner Card Refs, Direct Choice Pool Lookup ✅
- **Story card `_innerRefs`** — `renderStoryList()` now exposes `card._innerRefs = { inner, textDiv, h3, p, spriteEl }` on each card
  - `decorateStoryCard()` locked path uses cached refs instead of 5 `querySelector` calls per locked card
  - `_resetCardForRedecorate()` uses cached inner refs for title/description/sprite restoration (no querySelector)
  - Meta info appends to `card._innerRefs.textDiv` instead of `querySelector('.story-card-text')`
- **`_storyCardRefs` expanded** — added `infoBtn` and `metaEl` to the per-card ref object
  - `_resetCardForRedecorate()` removes all 6 dynamic children via cached refs (badge, saveIcon, barEl, favBtn, infoBtn, metaEl)
  - Only 2 `querySelector` calls remain in `_resetCardForRedecorate` (both rare: only fires on campaign advance)
  - Actually reduced to 0: infoBtn and meta now also covered by refs
- **Number key choice: direct pool lookup** — replaced `ui.choicesEl.querySelector('[data-choice-idx="N"]')` with `ui._choiceBtnPool[idx]`
  - Uses `ui._currentChoices` length check to validate index bounds
  - Zero DOM traversal per keypress
- **main.js querySelector count: 30 → 12 actual calls** (all init-only or lazy-cache-build, zero warm-path)
- SW cache bumped to v81, production build regenerated (189KB bundle)
- All 33 JS files pass `node --check`, 204/204 unit tests, 50/50 Playwright tests
- Committed & pushed

## Log (continued)
- 2026-03-28 (7:27 PM): Phase 99 — Cached inner card refs (renderStoryList exposes _innerRefs on each card, eliminating 5+ querySelector per locked card decoration + _resetCardForRedecorate). Expanded _storyCardRefs with infoBtn + metaEl for zero-querySelector dynamic child removal. Direct choice pool lookup (number keys use ui._choiceBtnPool instead of querySelector). main.js querySelector count 30→12 (all init-only). SW v81, 189KB bundle. All 33 JS + 204/204 unit + 50/50 Playwright pass. Committed & pushed.
