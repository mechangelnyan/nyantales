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

## Still Possible Future Work
- AI-generated character portrait images (replace procedural with hand-drawn/AI art)
- AI-generated scene background images
- Sound effects / ambient audio
- More advanced sprite animations (idle, emote variants)
- Achievement/collectible system across stories
- Story completion tracking in the grid view

## Log
- 2026-03-24: Built complete web visual novel engine (ui.js + main.js). All 30 stories load and play in browser. Core VN loop works: title screen → story select → scene rendering → choices → state tracking → endings → restart/menu.
- 2026-03-24 (late): Added procedural pixel cat sprite system (sprites.js). Characters appear as pixel-art cats during scenes, with speaking highlights and transitions. Story cards show protagonist thumbnails. Scene crossfade transitions. Extensive CSS polish: animations, particles, mood colors, responsive sprites, ending animations, choice number hints. Committed & pushed.
