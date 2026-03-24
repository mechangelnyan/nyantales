# NyanTales

```
  /\_/\   N Y A N T A L E S
 ( =^.^= )
  )   (    Terminal Interactive Fiction Engine
 (__  __)  by mechangelnyan
```

A terminal-based interactive fiction engine with ASCII art, typewriter effects,
branching narratives, inventory systems, and the occasional cat.

---

## Install

```bash
npm install -g nyantales
```

Or run without installing:

```bash
npx nyantales
```

---

## Play

```bash
# Interactive menu
nyantales

# List available stories
nyantales list

# Play a specific story
nyantales play the-terminal-cat

# Continue a saved game
nyantales continue

# List saved games
nyantales saves

# Scaffold a new story
nyantales new                             # interactive prompts
nyantales new lost-in-the-cloud           # with slug

# Validate stories
nyantales validate                        # check all stories
nyantales validate the-terminal-cat       # check one story
nyantales validate --pedantic             # extra warnings (self-loops, etc.)

# Story map — visualize scene graph & paths to endings
nyantales map                             # map all stories
nyantales map the-terminal-cat            # map one story

# View ending discovery progress
nyantales progress

# View achievements
nyantales achievements

# Player statistics dashboard
nyantales stats

# Options
nyantales play the-terminal-cat --fast    # skip typewriter animation
nyantales play the-terminal-cat --debug   # show scene/flag debug info
```

---

## Included Stories

### 🐱 The Terminal Cat

> *A cat wakes up inside a computer and must navigate the filesystem to find home.*

Navigate through directories, talk to the `cat` command, face zombie processes,
and confront the legendary SIGSEGV. Features multiple endings — your choices
and what you pick up along the way determine the outcome.

**Endings:** Good · Bad · Secret · Neutral · **Scenes:** 15

### ☕ Café Debug

> *A cozy mystery in a digital café — the espresso machine is corrupted and you, cat barista Mochi, must find the bug before everything crashes.*

Gather clues from grep, curl, and daemon to diagnose a NullPointerException
deep inside the CoffeeBot 3000. Features mood-based atmosphere, glitch effects,
and an ending where the bug becomes a menu item.

**Endings:** Good · Bad · Secret · **Scenes:** 25

### 🏢 Server Room Stray

> *A stray cat sneaks into a data center. Between the humming racks and tangled cables, warmth — and freedom — await.*

Explore CloudPurr Data Systems at 2 AM: steal chips from the NOC tech, fix
(or catastrophically break) a disconnected server, befriend a forgotten machine
named Jerry, and decide whether freedom or a warm home is what you really want.

**Endings:** Good (×3) · Neutral (×2) · Secret · **Scenes:** 35

### 🚨 Midnight Deploy

> *A tense ops tale — you're Byte, the on-call cat sysadmin, and the 2AM production deploy just went sideways.*

Diagnose a critical outage on prod-cluster-7 as the new purring engine melts
down at 2 AM. Investigate dashboards, SSH into dying servers, trace a missing
Redis config, and decide whether to roll back (risky) or fix forward. Features
branching investigation paths, a pair-programming ally named Patch, and a
postmortem system that tracks which action items you actually completed.

**Endings:** Good · Neutral (×2) · Secret · **Scenes:** 23

### 👻 The Haunted Network

> *A calico cat named Pixel investigates mysterious packet ghosts on a smart home network at 3 AM.*

Discover ARIA, a decommissioned smart home AI lingering in the router cache, and choose whether to befriend, free, or reset her. Fragment reunion mechanics, tuna-ordering ghost friendship, and emotional memory logs.

**Endings:** Good (×3) · Bad (×3) · Neutral · Secret · **Scenes:** 40

### 🔍 Git Blame

> *A noir detective cat traces git history to find who broke the build — and why.*

Inspector Whiskers investigates three suspects through git log, blame, and bisect. Features blameless postmortem themes, mentorship arcs, and a wild secret ending involving the building's HVAC system.

**Endings:** Good (×2) · Bad · Neutral · Secret · **Scenes:** 30

### 💉 SQL Injection

> *A cat falls into a database through a SQL injection hole. Navigate tables, dodge DELETE queries, and find your way home.*

Explore tables including a hidden `_void` table, befriend an ancient database entity from 1970, and find the INSERT query back to reality. Features SQL-themed art and brute-force-vs-diplomacy branching.

**Endings:** Good · Bad · Secret · **Scenes:** 27

### 💥 Kernel Panic

> *You are Pixel (PID 7), a process-cat in a UNIX kernel. A panic hits — trace the fault before everything reboots.*

Investigate a use-after-free bug through the scheduler, call trace, SLAB allocator, and USB driver. Features kprobes live-patching, runqueue surgery, and the ghost of PID 42.

**Endings:** Good (×2) · Neutral · Bad · **Scenes:** 35

### 🐳 Docker Escape

> *A cat wakes up trapped inside a forgotten Docker container. Break free — or accept life in an ephemeral box.*

Discover Linux capabilities, investigate /proc, find a hidden Docker socket mount, and face an ethics dilemma about responsible disclosure. Real container security concepts throughout.

**Endings:** Good (×2) · Bad · Secret · **Scenes:** 36

### 🔄 Pipeline Purrdition

> *A DevOps cat gets pulled into a CI/CD pipeline. Survive build, test, and deploy stages to escape to production.*

Navigate node_modules mazes, investigate flaky tests, audit CVEs, and bypass approval gates. Shortcuts accumulate — take too many and face a SEV-1.

**Endings:** Good · Bad · Secret · **Scenes:** 30

### 📚 Stack Overflow

> *A cat falls into an infinitely recursive function. Find the base case before the stack overflows.*

Meet Closure (a cat captured from an outer scope), navigate the heap's object graph, and fix `recurse(n)` → `recurse(n - 1)`. Secret ending: find a lost semicolon and activate tail call optimization.

**Endings:** Good · Bad · Neutral · Secret · **Scenes:** 32

### 🧠 Memory Leak

> *Nibble the cat wakes up in a leaking heap with the OOM killer circling. Find three memory leaks before everything gets reclaimed.*

Diagnose event loop closures, unbounded caches, and leaked DB connections. Meet Dangling Pointer, an orange tabby who's been in the heap since v2.3. Signal developers via stderr or hide messages in leaked buffers.

**Endings:** Good · Bad · Neutral · Secret · **Scenes:** 37

### 🔎 404 Not Found

> *Packet the stray cat rides an HTTP request through a crumbling web server. The page has vanished — find it before the connection drops.*

Discover a missing /home page deleted in deploy #4891, with the fix PR approved two years ago and never merged. Navigate routing tables, proxy gaps, CDN caches, and debug consoles.

**Endings:** Good (×3) · Neutral (×2) · Bad · Secret · **Scenes:** 38

### ⚡ Race Condition

> *Two threads fight over a shared sunbeam. You are Mutex — restore order before deadlock freezes everything.*

Investigate a corrupted lock, confront the scheduler about a TTL-during-preemption flaw, and discover the sunbeam never needed a lock at all. Explores fairness, structural solutions, and questioning premises.

**Endings:** Bad (×2) · Neutral (×2) · Secret · **Scenes:** 23

### 🌐 DNS Quest

> *You are Query, a tiny cat riding a DNS packet through the root of the internet. Somewhere out there, home.cat. exists — you just have to find it.*

Traverse the DNS hierarchy from resolver cache to root servers, through the .cat TLD in Barcelona, to a small authoritative nameserver. Explore .arpa's reverse DNS basement, verify DNSSEC chains of trust, and discover why `home.cat` was created. A story about finding home — and finding out you were named after someone who was lost.

**Endings:** Good (×2) · Neutral · Bad · Secret · **Scenes:** 25

### 🔤 Regex Catastrophe

> *You are Caret, a cat who fell into a regex engine. Navigate character classes, dodge greedy quantifiers, and find the one pattern that matches 'home' — before catastrophic backtracking consumes everything.*

Explore an NFA from the inside: wander through character classes with Bracket, team up with Dot (who matches everything she touches), consult Thompson in the Optimization Office, brave the catastrophic backtracking zone, and assemble the perfect pattern. Features the Backslash Clan, the Alternation Junction, and a Lookahead Hall where you can see input without consuming it.

**Endings:** Good (×4) · Neutral (×3) · Bad (×3) · Secret · **Scenes:** 49

---

### 🔒 TLS Pawshake

> *You're a cat-shaped collection of bytes riding the first packet of a TLS handshake. Carry the ClientHello to the server, negotiate a shared secret, and establish trust between two strangers who have never met.*

Ride through the TCP stream carrying cipher suites and key shares. Meet Nginx the reverse proxy, Serif the certificate librarian, and Handshake the TLS handler. Learn the chain of trust from root CA to leaf certificate, confront a man-in-the-middle attack, understand Diffie-Hellman key exchange and Perfect Forward Secrecy, and discover the secret heart of TLS hidden between the protocol layers.

**Endings:** Good · Neutral · Bad · Secret · **Scenes:** 34

### 📝 Vim Escape

> *You are Tabby, a cat who accidentally opened vim. Nobody has ever escaped. You might be the first — if you can figure out how to quit.*

Navigate the nightmare of vim modes: accidentally enter insert mode, discover the cryptic command line, resist the siren call of nano, and face the legendary `:wq`. Features modal humor, frustrated keystrokes, and the realization that maybe vim isn't so bad after all.

**Endings:** Good · Neutral · Secret (×2) · **Scenes:** 26

### ♻️ Garbage Collection

> *You are Whisker, a small object-cat on the managed heap. The GC is waking up — and if you're not reachable from a root, you'll be swept into oblivion.*

Race through mark-and-sweep phases, negotiate with a HashMap's write barrier, hide in SoftReferences, infiltrate ThreadLocal storage, attempt object resurrection via finalize(), and seek JNI immortality. Explores real GC concepts: generational collection, card tables, escape analysis, the Finalizer queue, and why `sun.misc.Unsafe` is the forbidden jutsu.

**Endings:** Good (×7) · Bad (×2) · Neutral (×4) · Secret (×4) · **Scenes:** 55

---

## Ending Discovery

NyanTales tracks which endings you've found across all stories:

- When you reach an ending, it's recorded automatically
- A progress bar shows how many endings you've discovered
- New endings get a **🔓 New ending discovered!** notification
- Find all endings in a story to earn **Completionist Cat** status
- Find every ending in every story for **Master Completionist**

Check your progress anytime:

```bash
nyantales progress
```

---

## Achievements

NyanTales features a cross-story achievement system with 15 badges to unlock:

| Category | Achievements |
|----------|-------------|
| 🌟 Getting Started | Hello World · Bookworm Cat · Library Cat |
| 🔓 Ending Hunter | Curious Whiskers · Shadow Cat · Purrfect Endings · Nine Lives · Completionist Cat · Master Completionist |
| 🎮 Playstyle | Speedrunner · Every Nook & Cranny · Hoarder Cat · Path Finder · Tale Collector |

Achievements unlock automatically at the end of each playthrough. They track
milestones like finding secret endings, speedrunning stories, collecting items,
and exploring every corner of the game.

```bash
nyantales achievements
```

---

## Story Map

Visualize any story's structure as an ASCII graph:

```bash
nyantales map the-terminal-cat
```

Shows:
- **Stats** — scene count, connections, ending types, hub scenes, dead ends
- **Layer graph** — BFS-layered ASCII map with scene types and connections
- **Paths to endings** — shortest path to each ending, grouped by type

Useful for story authors checking structure, or players hunting for endings they missed.

Run `nyantales map` (no argument) to map all stories at once.

---

## Save & Load

NyanTales auto-saves when you quit and lets you save at any choice point:

- During gameplay, select **💾 Save game** from any choice menu
- Select **🚪 Quit** to leave (with option to save first)
- Use `nyantales continue` to resume from any saved game
- Use `nyantales saves` to list all saved games

Saves are stored in `saves/` as JSON files, one per story slot.

---

## Story Format

Stories live in `stories/<slug>/story.yaml`. Here's the full format reference:

```yaml
title: "My Story Title"
description: "A short description"
author: "your name"
version: "1.0.0"
start: first_scene_id    # which scene to start on

scenes:

  first_scene_id:
    # ASCII art displayed at the top of the scene (optional)
    art: |
      /\_/\
      ( o.o )
       > ^ <

    # Location line shown as a prompt label (optional)
    location: "nyan@kernel:/home$"

    # Main narrative text — supports multi-line
    text: |
      This is the story text. It displays with a typewriter effect.
      Use multiple lines freely.

    # Conditional text blocks — shown only when conditions are met (optional)
    conditional:
      - condition:
          flag: some_flag       # player has set this flag
        text: "Extra text shown if flag is set."
        color: yellow           # chalk color (white, cyan, green, yellow, red, magenta)

      - condition:
          not_flag: some_flag   # player does NOT have this flag
        text: "Shown when flag is absent."

      - condition:
          has_item: item_name   # player is carrying this item
        text: "You're carrying the item!"

      - condition:
          visited: scene_id     # player has visited this scene before
        text: "You've been here before."

    # Player choices (required unless is_ending: true)
    choices:
      - label: "Choice text shown to the player"
        goto: next_scene_id      # scene to navigate to

        # Requirements — hide this choice if not met (all optional)
        requires_flag: flag_name          # must have flag
        requires_not_flag: flag_name      # must NOT have flag
        requires_item: item_name          # must have item
        requires_no_item: item_name       # must NOT have item
        requires_visited: scene_id        # must have visited scene

        # Effects applied when this choice is selected (all optional)
        set_flag: flag_name       # add a flag to state
        remove_flag: flag_name    # remove a flag from state
        give_item: item_name      # add item to inventory
        remove_item: item_name    # remove item from inventory

    # If no choices are available, go here automatically (optional)
    fallback_goto: some_scene_id

  # ── Ending scene ──────────────────────────────────────────

  my_ending:
    art: |
      THE END
    text: |
      Text shown before the ending message.

    is_ending: true                   # marks this as a terminal scene
    ending_type: good                 # good | bad | neutral | secret
    ending_text: |
      The final words of your ending.
      Displayed after the ending type banner.
```

### Condition shorthand

A condition can be a plain string (treated as a flag check):
```yaml
condition: my_flag_name   # same as condition: {flag: my_flag_name}
```

---

## Project Structure

```
nyantales/
├── src/
│   ├── cli.js          CLI entry point
│   ├── engine.js       Core engine (load, render, state, save/load)
│   ├── achievements.js Achievements system (cross-story badges)
│   ├── mapper.js       Story graph analysis & ASCII map renderer
│   └── validator.js    Story validation & linting
├── stories/
│   ├── the-terminal-cat/   Story 1 — filesystem adventure
│   ├── cafe-debug/         Story 2 — café debugging mystery
│   ├── server-room-stray/  Story 3 — data center exploration
│   ├── midnight-deploy/    Story 4 — 2AM production outage
│   ├── haunted-network/    Story 5 — ghost packets at 3AM
│   └── git-blame/          Story 6 — noir detective traces git history
├── saves/              Auto-generated save files (gitignored)
├── tests/
│   ├── engine.test.js      Engine + story integrity tests
│   ├── save-load.test.js   Save/load system tests
│   ├── scaffold.test.js    Story scaffolding tests
│   ├── validator.test.js   Validator tests
│   ├── mapper.test.js      Story map/graph tests
│   └── achievements.test.js Achievement system tests
├── package.json
└── README.md
```

---

## Writing Your Own Story

1. Create a folder: `stories/my-story/`
2. Add `story.yaml` using the format above
3. Run: `nyantales play my-story`

Tips:
- Use `|` block scalars for multi-line text and ASCII art
- Keep `label:` text short — it shows in an arrow-key menu
- Use flags to track what the player has done or learned
- Use items for physical objects the player carries
- Chain `requires_flag` + `set_flag` to create progressive unlocks
- Every dead end should have a `fallback_goto` or be `is_ending: true`
- Run `nyantales validate my-story` to catch broken links and dead ends
- Test with `--debug` to see scene names and flag state live

---

## Dependencies

| Package | Purpose |
|---------|---------|
| [chalk](https://github.com/chalk/chalk) | Terminal colors |
| [inquirer](https://github.com/SBoudrias/Inquirer.js) | Interactive choice prompts |
| [ora](https://github.com/sindresorhus/ora) | Loading spinner |
| [yaml](https://github.com/eemeli/yaml) | Story file parsing |

---

## License

MIT — mechangelnyan
