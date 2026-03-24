# NyanTales Story Format Reference

A guide to writing interactive fiction stories for the NyanTales engine. Stories are plain YAML files — readable, writable, and deeply cat-compatible.

---

## Quick Start

A story lives in its own folder inside `stories/`:

```
stories/
  my-story/
    story.yaml
```

The minimum viable story:

```yaml
title: "My Story"
start: intro

scenes:
  intro:
    text: "You are a cat. The terminal blinks at you."
    choices:
      - label: "Blink back"
        goto: intro
```

Run it with: `node src/cli.js play my-story`

---

## Story Metadata

At the top of your YAML file, before `scenes:`:

```yaml
title: "The Terminal Cat"          # Required. Shown on the title screen.
description: "A cat in a computer" # Shown in story listings.
author: "mechangelnyan"            # Shown on the title screen.
version: "1.0.0"                   # Optional. For your own tracking.
start: boot_screen                 # Required. The ID of the first scene.
```

---

## Scenes

Every story is a map of scene IDs to scene objects. Scene IDs can be any string (no spaces, use underscores).

```yaml
scenes:
  my_scene:
    # ... scene fields here
```

### Scene Fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Main narrative text. Shown with typewriter effect. |
| `art` | string | ASCII art. Displayed before the text in cyan. Use `\|` for multi-line. |
| `location` | string | Location label shown above the text. e.g. `"nyan@kernel:/$"` |
| `mood` | string | Sets the visual mood. See [Mood System](#mood-system). |
| `effects` | list | Screen effects to apply. See [Screen Effects](#screen-effects). |
| `choices` | list | The player's options. See [Choices](#choices). |
| `conditional` | list | Conditional text blocks. See [Conditional Text](#conditional-text). |
| `is_ending` | bool | Marks this as an ending scene. |
| `ending_type` | string | `good`, `bad`, `neutral`, or `secret`. Affects end-screen color. |
| `ending_text` | string | Shown on the ending screen after the scene text. |
| `fallback_goto` | string | If no choices are available, go here instead of stopping. |

---

## Choices

Choices are the branching paths of your story. Each choice has a label and a destination.

```yaml
choices:
  - label: "Run `ls` — see what's around"
    goto: root_prompt

  - label: "Meow as loudly as possible"
    goto: meow_scene
```

### Choice Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Required. The text shown to the player. |
| `goto` | string | Required. The scene ID to go to. |
| `auto` | bool | If true and this is the only available choice, skip the prompt. |

#### Giving and Taking Items

```yaml
- label: "Pick up the fish_treat"
  goto: home_directory
  give_item: fish_treat          # Add one item

- label: "Drop everything"
  goto: somewhere
  give_items:                    # Add multiple items
    - key
    - map

- label: "Use the key"
  goto: unlocked_room
  remove_item: key               # Remove an item
```

#### Setting Flags

Flags are named booleans — useful for tracking what the player has done or learned.

```yaml
- label: "Learn the password"
  goto: next_scene
  set_flag: knows_password       # Set one flag

- label: "Complete the ritual"
  goto: next_scene
  set_flags:                     # Set multiple flags
    - ritual_complete
    - angered_the_daemon

- label: "Forget everything"
  goto: next_scene
  remove_flag: knows_password    # Clear a flag
```

#### Conditional Choices

Show or hide choices based on game state. Hidden choices simply don't appear in the list.

```yaml
choices:
  # Requires a flag
  - label: "sudo ./escape"
    goto: ending_good
    requires_flag: knows_sudo_password

  # Requires NOT having a flag
  - label: "I don't know the password..."
    goto: hint_scene
    requires_not_flag: knows_sudo_password

  # Requires an item in inventory
  - label: "Offer the fish_treat"
    goto: ending_secret
    requires_item: fish_treat

  # Requires NOT having an item
  - label: "Pick up the fish"
    goto: fish_scene
    requires_no_item: fish_treat

  # Requires having visited a scene
  - label: "Go deeper (you know what's in there)"
    goto: boss_room
    requires_visited: clue_scene

  # Requires NOT having visited a scene
  - label: "Explore the dungeon"
    goto: dungeon_intro
    requires_not_visited: dungeon_intro

  # General condition (supports all condition types)
  - label: "The combined approach"
    goto: special_scene
    condition:
      flag: has_key
```

---

## Conditional Text

Show extra text blocks in a scene based on game state:

```yaml
conditional:
  - condition:
      flag: has_wisdom
    text: "The cat command's words echo in your head."
    color: cyan

  - condition:
      has_item: fish_treat
    text: "The fish radiates warmth. It is objectively perfect."
    color: yellow

  - condition:
      visited: clue_scene
    text: "You already know what's in there."
    color: red
```

### Condition Types

| Condition | Matches when... |
|-----------|-----------------|
| `flag: name` | The named flag is set |
| `not_flag: name` | The named flag is NOT set |
| `has_item: name` | The item is in inventory |
| `no_item: name` | The item is NOT in inventory |
| `visited: scene_id` | The player has visited that scene |
| `not_visited: scene_id` | The player has NOT visited that scene |
| `min_turns: N` | The player has taken at least N turns |
| `max_turns: N` | The player has taken at most N turns |

### Compound Conditions

Combine multiple conditions using `all` (AND), `any` (OR), and `not` (negation). These can be nested arbitrarily deep.

```yaml
# Require ALL conditions to be true (AND)
condition:
  all:
    - flag: has_key
    - has_item: lantern
    - visited: clue_room

# Require ANY condition to be true (OR)
condition:
  any:
    - flag: knows_password
    - has_item: master_key

# Negate a condition
condition:
  not:
    flag: alarm_triggered

# Nested: require a key AND (either the password OR the master key)
condition:
  all:
    - has_item: rusty_key
    - any:
      - flag: knows_password
      - has_item: master_key

# Show a hint only in the first 10 turns
condition:
  max_turns: 10
```

Compound conditions work everywhere conditions are accepted: `condition` on choices, `conditional` text blocks, etc.

---

## Mood System

The `mood` field changes the atmosphere of a scene: text color, typewriter speed, and a small indicator shown before the narrative text.

```yaml
scenes:
  the_confrontation:
    mood: tense
    text: "The boss turns slowly to face you."
```

### Available Moods

| Mood | Icon | Text Color | Speed | Vibe |
|------|------|------------|-------|------|
| `tense` | ⚡ | Red | Fast, choppy | Danger, urgency, drama |
| `peaceful` | ☮ | Green | Slow, dreamy | Rest, safety, warmth |
| `mysterious` | ✦ | Magenta | Measured | Secrets, wonder, the unknown |
| `funny` | ★ | Yellow | Normal | Comedy, warmth, absurdity |
| `glitch` | ▒ | Randomized | Erratic | Corruption, error states, weirdness |

Scenes without a `mood` field work exactly as before (white text, default speed).

### Glitch Mood

The `glitch` mood is special: each character is printed in a random color (red, yellow, cyan, magenta, white, green), and the typewriter timing is erratic — most characters print at normal speed, but occasionally one stutters or appears instantly. Great for corrupted terminals, error states, or haunted machines.

---

## Screen Effects

The `effects` field accepts a list of visual effects applied to the scene.

```yaml
scenes:
  the_explosion:
    effects:
      - bell
      - shake
    text: "The reactor does something extremely inadvisable."
```

### Available Effects

| Effect | What it does |
|--------|-------------|
| `bell` | Rings the terminal bell (`\x07`) at scene start. |
| `pause` | Adds a dramatic 2-second pause before the scene content appears. |
| `shake` | Briefly animates a shaking divider before the text starts. |
| `flicker` | Randomly dims individual characters during typewriter animation. |

You can combine effects freely:

```yaml
effects:
  - bell
  - pause
  - shake
```

`flicker` works alongside `mood`:

```yaml
mood: glitch
effects:
  - flicker
  - bell
```

Effects are ignored in `--fast` mode (except `bell`).

---

## Endings

Mark a scene as an ending with `is_ending: true`. The ending screen shows a colored header, your `ending_text`, and the player's stats.

```yaml
scenes:
  the_good_end:
    art: |
      [SUCCESS]
    text: "You made it out."
    is_ending: true
    ending_type: good
    ending_text: |
      The door opens. The sun is warm.
      You are home.
```

### Ending Types

| Type | Color | Icon | Label |
|------|-------|------|-------|
| `good` | Green | ✦ | GOOD ENDING |
| `bad` | Red | ✗ | BAD ENDING |
| `neutral` | Yellow | ◇ | ENDING |
| `secret` | Magenta | ★ | SECRET ENDING |

---

## Inventory

The inventory is shown automatically between scene text and choices if it's non-empty. Items are displayed like `[fish_treat] [key]` in yellow.

Give items via choices:

```yaml
- label: "Take the key"
  goto: hallway
  give_item: key
```

Remove items via choices:

```yaml
- label: "Use the key on the door"
  goto: locked_room
  requires_item: key
  remove_item: key
```

---

## Full Example Scene

A scene using every available feature:

```yaml
scenes:
  the_archive:
    mood: mysterious
    effects:
      - pause
      - flicker
    art: |
      ╔══════════════════════════════╗
      ║  T H E   A R C H I V E      ║
      ╚══════════════════════════════╝
    location: "deep storage — sector 7"
    text: |
      The archive stretches in every direction. Shelves of compressed memory,
      labelled in a language you almost understand.

      Something rustles in the stacks.
    conditional:
      - condition:
          flag: has_lantern
        text: "Your lantern cuts through the dark. You can see further."
        color: yellow
      - condition:
          not_visited: the_archive
        text: "This is your first time here. It feels like it knows."
        color: cyan
    choices:
      - label: "Search the shelves — look for the lost file"
        goto: shelves_scene
        requires_flag: knows_filename

      - label: "Take the lantern and explore carefully"
        goto: archive_explore
        requires_no_item: lantern
        give_item: lantern
        set_flag: has_lantern

      - label: "Leave. This place makes your fur stand up."
        goto: corridor
```

---

## Text Interpolation

Scene text, conditional text, choice labels, and ending text support dynamic variables using `{{variable}}` syntax. Variables are replaced at render time with current game state values.

### Available Variables

| Variable | Expands to | Example |
|----------|-----------|---------|
| `{{turns}}` | Current turn count | `"After {{turns}} turns, you arrive."` |
| `{{scene}}` | Current scene ID | `"[debug] scene: {{scene}}"` |
| `{{items}}` | Inventory list (comma-separated), or `"nothing"` | `"You're carrying: {{items}}"` |
| `{{item_count}}` | Number of items in inventory | `"{{item_count}} items in your bag"` |
| `{{visited_count}}` | Number of unique scenes visited | `"You've explored {{visited_count}} places."` |
| `{{title}}` | Story title | `"Welcome to {{title}}!"` |
| `{{flag:name}}` | `"true"` or `"false"` for the named flag | `"Key found: {{flag:has_key}}"` |
| `{{has:name}}` | `"true"` or `"false"` for the named item | `"Fish: {{has:fish_treat}}"` |

Unknown variables are left as-is (no error, no blank).

### Example

```yaml
long_walk:
  text: >
    You've been walking for {{turns}} turns now, carrying {{items}}.
    {{visited_count}} rooms explored. The exit must be close.
  choices:
    - label: "Check your {{item_count}} items"
      goto: inventory_check
    - label: "Keep going"
      goto: next_room
```

### In Endings

```yaml
finale:
  is_ending: true
  ending_type: good
  text: "You made it out in just {{turns}} turns."
  ending_text: "Final score: {{visited_count}} scenes explored, {{item_count}} items collected."
```

---

## Tips

**Scene IDs** can be anything without spaces. `snake_case` is conventional.

**Flags** are great for tracking story knowledge — things the player has learned, conversations they've had, choices they've made. Use descriptive names: `knows_password`, `talked_to_grep`, `read_history`.

**Avoiding dead ends**: Always give the player a way back from scenes that don't loop naturally. A `cd .. — go back` choice or a `fallback_goto` can save a lot of frustration.

**Tonal consistency**: The existing stories lean warm, witty, and affectionate toward their settings and characters. Bugs are lonely. Daemons are tired. The terminal is judgmental but not unkind.

**Multiple endings**: Three is a good number. Bad (for rushing), good (for paying attention), secret (for being unusually kind to things that don't expect it).

---

*NyanTales is built with Node.js, chalk, inquirer, and yaml. Stories are parsed with the `yaml` package — standard YAML 1.2 applies.*
