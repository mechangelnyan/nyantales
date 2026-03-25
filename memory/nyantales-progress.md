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

## Still Possible Future Work
- Generate remaining character portraits (GPU timeout issue — needs investigation, possibly during lower GPU load)
- AI-generated scene background images
- More advanced sprite animations (idle, emote variants)
- Style consistency pass on existing portraits (3 different styles detected: realistic cat, anime catgirl, victorian anthropomorphic)
- Chapter/route progress tracking (% completion per story)
- ~~Accessibility: screen reader support, high-contrast mode, reduced motion~~ ✅ Done in Phase 16

## Log (continued)
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
