# NyanTales: The Connected Campaign

## Core Premise

**Nyan**, a fluffy cat, chases a red dot across a keyboard and falls into a computer. To find her way home, she must traverse every layer of the system — from filesystem to memory to network to kernel. Along the way, she meets the cats who live in each layer, helps them with their crises, and pieces together a larger mystery: **the system is dying**, and someone (or something) is causing it.

## The Overarching Mystery

The computer Nyan fell into is being decommissioned. **Jake** (the sysadmin referenced across multiple stories) has been neglecting it — leaving TODO items unfinished, not calling wait() on processes, letting memory leak. The machine is falling apart from within. Nyan's journey isn't just about getting home — it's about whether to save the system and its inhabitants, or escape before it's too late.

**ARIA** (the decommissioned AI from haunted-network) is the ghost in the machine who knows the truth. She's been trying to warn everyone, but nobody can see her except Pixel (who sees network ghosts) and eventually Nyan.

## Act Structure

### ACT I — BOOT (Chapters 1-5)
*Nyan enters the system, learns the basics, explores the filesystem and local environment.*

**Chapter 1: The Terminal Cat** *(the-terminal-cat)*
- Nyan wakes up inside the computer. Tutorial chapter — learn movement, choices, the world.
- **Connector:** After finding /home, Nyan discovers it's empty. A message on the terminal: `WARNING: memory pressure critical`. The floor shakes. She falls deeper.

**Chapter 2: Permission Denied** *(permission-denied)*  
- Nyan is now running as uid 65534 (nobody). She meets **Sudo**, a gray cat locked out of /home.
- Together they navigate UNIX permissions. Nyan learns about the system's access controls.
- **Connector:** After gaining permissions, they find a corrupted directory. Sudo stays behind to guard it. Nyan follows the corruption deeper — into memory.

**Chapter 3: Vim Escape** *(vim-escape)*
- Nyan accidentally opens vim. Meets **Tabby**, a cat trapped inside.
- Comic relief chapter. Lighthearted before things get heavier.
- **Connector:** Escaping vim drops them into a buffer. The buffer is... overflowing.

**Chapter 4: Buffer Overflow** *(buffer-overflow)*
- Nyan meets **Byte**, a tiny cat in a 64-byte buffer, and the **Stack Canary**.
- First real danger — the stack is being smashed. Nyan learns memory isn't safe.
- **Connector:** The overflow tears a hole in memory. Nyan falls through into the heap.

**Chapter 5: Garbage Collection** *(garbage-collection)*
- Nyan meets **Whisker**, desperately trying to stay reachable.
- The GC is coming. Nyan must help Whisker maintain references or be collected.
- **Connector:** Surviving the GC sweep, Nyan sees something glinting in the freed memory — a fragment of a message from ARIA. "The system is —" (corrupted). Nyan pushes deeper.

### ACT II — RUNTIME (Chapters 6-12)
*Nyan goes deeper into the system's internals. The problems get worse. She starts meeting recurring characters.*

**Chapter 6: Memory Leak** *(memory-leak)*
- Nyan meets **Nibble**, hunting the source of a massive memory leak.
- They encounter **Dangling**, a freed pointer still being referenced — tragic, not malicious.
- **Connector:** Fixing the leak temporarily relieves pressure, but Nyan finds another ARIA fragment: "Jake stopped maintaining —". She needs to find the network layer to learn more.

**Chapter 7: Segmentation Fault** *(segfault)*
- Nyan meets **Pointer**, who dereferenced null and fell into forbidden memory.
- Dangling appears again — same character from the memory leak, still lost.
- **Connector:** Navigating forbidden memory, Nyan finds a path to the process table.

**Chapter 8: Stack Overflow** *(stack-overflow)*
- Nyan meets **Recurse**, trapped in infinite recursion, and **Closure**, who remembers the base case.
- **Connector:** Breaking the recursion creates a stack frame that opens into the process scheduler.

**Chapter 9: Zombie Process** *(zombie-process)*
- Nyan meets **Zombie Cat** — called exit(0) cleanly, but Jake never called wait().
- A quieter, more emotional chapter. Zombie Cat is at peace. Nyan is shaken.
- **Connector:** Zombie Cat tells Nyan about the network — "There's someone out there trying to tell us something. A ghost. She calls herself ARIA."

**Chapter 10: Fork Bomb** *(fork-bomb)*
- Nyan encounters chaos — someone set off :(){ :|:& };: 
- Meets **Fork Bomb Cat**, who's deeply regretful. The system is choking.
- **Connector:** In the chaos, the process table nearly fills. Nyan barely escapes into the kernel.

**Chapter 11: Kernel Panic** *(kernel-panic)*
- Nyan plays as/with **Pixel** (PID 7), trying to prevent a full kernel panic.
- The stakes are existential — if the kernel dies, everyone dies.
- **Connector:** Stabilizing the kernel, Nyan gains access to the network stack. Pixel says: "I've seen things on the network. Ghosts. One of them knows your name."

**Chapter 12: Deadlock** *(deadlock)*
- The four philosopher cats are deadlocked over shared fish.
- Nyan must help as the scheduler to break the deadlock.
- **Connector:** Resolving the deadlock frees up resources. The network interfaces come back online. Nyan can finally reach the network layer.

### ACT III — NETWORK (Chapters 13-19)
*Nyan enters the network. Meets ARIA. Learns the truth. The outside world comes into view.*

**Chapter 13: DNS Quest** *(dns-quest)*
- Nyan rides a DNS packet with **Query**, searching for home.cat.
- **Connector:** The DNS resolution reveals the machine's hostname — and its status: `DECOMISSION_SCHEDULED`. Nyan pushes on.

**Chapter 14: 404 Not Found** *(404-not-found)*
- Nyan meets **Packet**, searching for a vanished page.
- Meets **api-worker-7**, **The WAF** — the network's inhabitants.
- **Connector:** The vanished page was ARIA's status dashboard. Someone deleted it. Nyan must find ARIA directly.

**Chapter 15: The Haunted Network** *(haunted-network)*
- Nyan meets **Pixel** again (the calico who sees ghosts) and finally **ARIA**.
- ARIA reveals the truth: Jake is decommissioning the server. Everything inside will be destroyed.
- **Connector:** ARIA gives Nyan a choice — try to save the system, or find a way out. Either way, she needs to go through the security layer.

**Chapter 16: TLS Pawshake** *(tls-pawshake)*
- Nyan helps negotiate trust between **Chroma** (the browser) and the server.
- Meets **Serif** (certificates) and **Nginx** (the gateway).
- **Connector:** The TLS connection opens a tunnel to the outside. But it's encrypted — Nyan needs the right keys.

**Chapter 17: SQL Injection** *(sql-injection)*
- Nyan plays as/with **Pixel** (the orange cat trapped in a database).
- The database holds the system's records — including Jake's decommission order.
- **Connector:** In the database, Nyan finds Jake's notes: "Migrate data to new server by Friday. TODO: actually do this." There's still hope.

**Chapter 18: Encoding Error** *(encoding-error)*
- Nyan meets **Glyph**, a UTF-8 cat in an ASCII world.
- Theme: identity, being seen, being understood even when the system can't render you.
- **Connector:** Glyph helps Nyan encode a message that can pass through any system. They compose a distress signal.

**Chapter 19: Regex Catastrophe** *(regex-catastrophe)*
- Nyan meets **Caret** inside a regex engine.
- They must survive catastrophic backtracking to get the distress signal through a pattern matcher (firewall rule).
- **Connector:** The signal gets through. But will anyone see it in time?

### ACT IV — DEPLOY (Chapters 20-24)
*The endgame. Save the system or escape. All threads converge.*

**Chapter 20: Race Condition** *(race-condition)*
- Two threads fight over the last sunbeam. **Mutex** is exhausted.
- The race condition is a metaphor — Nyan is racing against the decommission clock.
- **Connector:** Resolving the race reveals the system has one last deploy queued.

**Chapter 21: Merge Conflict** *(merge-conflict)*
- **Merge Cat** is caught between two realities — the old server and the new one.
- Nyan must help reconcile the branches. This is the migration.
- **Connector:** The merge creates a path between old and new.

**Chapter 22: Café Debug** *(cafe-debug)*
- Lighter chapter amid the tension. **Mochi** the barista, the broken espresso machine.
- The café is a waypoint — a place where the system's cats gather before the final push.
- **Connector:** Mochi gives Nyan a caffeine boost (metaphor for a resource allocation) and joins the effort.

**Chapter 23: Pipeline Purrdition** *(pipeline-purrdition)*
- **Pippa** the DevOps cat. The CI/CD pipeline is the migration pipeline.
- Build → Test → Deploy. Each stage is a gauntlet.
- **Connector:** The pipeline succeeds. The migration is ready. One last step.

**Chapter 24: Midnight Deploy** *(midnight-deploy)*
- **Byte** returns (from chapter 4!) as the on-call sysadmin cat.
- It's 2AM. The final deploy. Everything Nyan has done comes together.
- **Connector:** The deploy succeeds. The data migrates. But Nyan is still inside the old system...

### ACT V — HOME (Chapters 25-26)
*Resolution.*

**Chapter 25: Docker Escape** *(docker-escape)*
- **Mochi** again — the calico cat escaping a container.
- Nyan must escape the old system before it shuts down. The container is collapsing.
- The characters she's helped along the way assist her — callbacks to every chapter.

**Chapter 26: Cache Invalidation** *(cache-invalidation)*
- The final chapter. **Cache Cat** — memories that aren't real, cached and stale.
- Nyan must decide: hold onto the cached memories of her journey, or let them be invalidated?
- Bittersweet ending. The system shuts down, but the data was saved. The cats live on in the new server.
- Nyan wakes up on the keyboard. The red dot blinks.

### BONUS: Infinite Loop *(infinite-loop)* & Floating Point *(floating-point)* & Server Room Stray *(server-room-stray)* & Git Blame *(git-blame)*

These four can work as **optional side-quests** or **hidden chapters** that unlock based on exploration:

- **Infinite Loop** — Found if Nyan backtracks too many times (meta!)
- **Floating Point** — Hidden chapter accessible from the memory sections
- **Server Room Stray** — Epilogue from Jake's physical perspective
- **Git Blame** — Unlockable detective chapter investigating who caused the original crash

---

## Recurring Character Threads

| Character | Appearances | Arc |
|-----------|-------------|-----|
| **Nyan** | All chapters | Protagonist. Grows from confused cat to system savior. |
| **Byte** | Ch 4, Ch 24 | Small buffer cat → on-call hero. Bookend character. |
| **Pixel** | Ch 11, Ch 15, Ch 17 | The one who sees ghosts. Nyan's guide to the network. |
| **Mochi** | Ch 22, Ch 25 | The reliable one. Café comfort → escape partner. |
| **Dangling** | Ch 6, Ch 7 | The tragic pointer. A thread about letting go. |
| **ARIA** | Fragments (Ch 5, 6), full (Ch 15) | The ghost who knows the truth. |
| **Jake** | Referenced throughout | The absent god. Never seen. Felt everywhere. |

## Persistent State Across Chapters

- **Items** collected in earlier chapters can unlock dialogue/choices in later ones
- **Flags** track who Nyan has helped — affects the finale
- A "friendship" system: cats you've helped appear in the Docker Escape to help you
- Chapter select available after completion (replay individual chapters)

## Tone

Warm, witty, sometimes bittersweet. The computer isn't just a machine — it's a world with inhabitants who have feelings, fears, and friendships. The technical concepts are real, but the emotional core is what matters. It's a story about a cat trying to get home, and all the friends she makes along the way.
