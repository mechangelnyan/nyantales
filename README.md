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

# Validate stories
nyantales validate                        # check all stories
nyantales validate the-terminal-cat       # check one story
nyantales validate --pedantic             # extra warnings (self-loops, etc.)

# View ending discovery progress
nyantales progress

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
│   └── engine.js       Core engine (load, render, state, save/load)
├── stories/
│   ├── the-terminal-cat/
│   │   └── story.yaml  Story 1 — filesystem adventure
│   ├── cafe-debug/
│   │   └── story.yaml  Story 2 — café debugging mystery
│   ├── midnight-deploy/
│   └── server-room-stray/
│       └── story.yaml  Story 3 — data center exploration
├── saves/              Auto-generated save files (gitignored)
├── tests/
│   ├── engine.test.js  Engine + story integrity tests
│   └── save-load.test.js  Save/load system tests
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
