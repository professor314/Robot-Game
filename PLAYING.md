# Robot-Game — Player's Guide

You're a salvage robot waking up on a derelict space station. There's no win screen and no
forced objective — explore, fight, salvage, and upgrade for as long as you like. This guide
lists everything the game currently does. It's a living document and will grow as the game
does.

## Starting the game

```bash
cd extensions/web
npm run dev
```

Then open the printed localhost URL (usually http://localhost:5173) in your browser.

## Pick your bot

The game opens on a **pick-your-bot** screen. Choose one of four salvage-unit chassis (Dome
Waver, Spindle Walker, Tread Hauler, Barrel Bot) — it's purely cosmetic for now. If you have a
saved game, a **Continue** option resumes it. You start landed on your **mining laser**, which
equips automatically (you need it to mine).

## Controls

| Input | Action |
|---|---|
| **W A S D** or **Arrow keys** | Move one tile. Walk through a doorway to travel to the next room. |
| **Space** or **F** | Attack an adjacent enemy (the tile directly up/down/left/right of you). |
| **E** | Interact: mine a junk deposit, or use a repair bay — when you're next to one. |
| **Q** | Overclock — a temporary attack boost (has a cooldown). |
| **Z** | Nanite Repair — restores integrity (has a cooldown). |
| **I** | Open/close your inventory. |
| **C** | Open/close the crafting panel (then press a number to craft). |
| *(walk over an item)* | Pick-up is automatic; stepping onto or beside salvage grabs it. |

The on-screen **CONTROLS** box (bottom-left) always lists these, and an **INVENTORY** panel
(press **I**) shows your weapon tier, mining laser, credits, and salvaged materials. You can't
walk onto an enemy's tile — bump up against it and press attack.
| **O** | Save your game. |
| **P** | Load your last save. |
| **M** | Mute / unmute audio. |
| **G** | Toggle game-feel effects (hit flash, damage numbers, screen shake). |
| **Enter** or **R** | On the GAME OVER screen: start over. |

## The HUD

Across the top-left you'll see:

- **Integrity bar** — your health. It turns yellow, then red as it drops. At zero, it's game over.
- **LV / XP** — your level and experience. Defeating enemies grants XP; enough XP levels you up.
- **CR** — credits, earned from salvage and defeated enemies.
- **ORE** — raw ore you've mined.
- **WPN Mk.N** — your current weapon tier (appears once you've installed an upgrade).
- **Room name** — the station room you're currently in.

The bottom-left shows a scrolling **event log** (hits, pickups, mining, level-ups, and more).

## Exploring the station

- The station is a connected set of rooms across two zones. Rooms are laid out spatially, so
  going north then south brings you back where you started.
- **Fog of war:** rooms are dark until you enter them. Once visited, they stay revealed, and
  the camera keeps previously seen rooms on screen as you move.
- The camera follows you and keeps the whole room in view at any window size.

## Combat

- Walk up next to an enemy and press **Space** to hit it. Get adjacent first — attacks only
  reach the tile right beside you.
- Enemies pursue you when you're in their room and within range, and hit back when adjacent.
- **Damage numbers** float up on each hit: **red** when you take damage, **purple** when you
  deal it.
- Enemy types so far: roaming **Patrol Drones** (weak) and tougher named hostiles — the
  **Corrupted Sentry**, **Haywire Drone**, and **Rogue Program**.
- Defeating an enemy grants XP and credits and **drops loot** on the ground where it fell —
  walk over it to collect it. Defeated enemies respawn after a delay.

## Things to do in each room

Rooms are furnished with sci-fi props and interactive objects:

- **Junk deposits** — ten kinds of mineable debris (scrap, circuit boards, power cells,
  crystals, hull fragments, bolts, gears, ore veins, plating, canisters). Stand next to one and
  press **E** to **mine** with your laser. A deposit takes a variable number of hits to break
  (usually a few), then yields a random handful of **materials** — nuts, bolts, circuit boards,
  wire coils, servos, capacitors, alloy plates, coolant cells, rivets, microchips — into your
  inventory. (Mining requires the mining laser, which you pick up at the start.)

Each room is themed to its name — the Observation Deck has telescopes and viewports, the Data
Core has server racks, the Reactor Terminal has a glowing core, Crew Remnants has bunks, and so
on. Combat damage varies on a bell curve (sometimes you hit harder, sometimes softer).
- **Repair bays / heal stations** — stand next to one and press **E** to restore your integrity
  to full.
- **Salvage items** (components, power cells, crystals, scrap) — collected automatically as you
  move over them; each adds to your inventory and a few credits.
- **Weapon upgrades** — hidden in some rooms. Picking one up **auto-installs** it, raising your
  attack output, with an on-screen confirmation. Your weapon tier shows as **WPN Mk.N** in the HUD.
- **Recipe chips** — scattered one per room. Pick one up to **learn a crafting recipe**.
- **Decorative/structural props** (crates, tanks, consoles, scanners, pipes, debris) — some are
  solid and block your path; route around them.

## Crafting

Find **recipe chips** in rooms to learn recipes, then press **C** to open the crafting panel
and a number key to build one if you have the materials. Current recipes:

- **Power Battery** — restores integrity (a quick heal).
- **Reinforced Plating** — permanent armor (+shielding).
- **Capacitor Cannon** — a heavier weapon (+attack).
- **Focused Mining Laser** — breaks junk in fewer hits.
- **Hardened Chassis** — permanent +max integrity.

Materials come from mining (nuts, bolts, circuit boards, servos, capacitors, alloy plates,
coolant cells, and more). More recipes will be added over time.

## Progression

- **Leveling:** XP from defeating enemies raises your level. Each level permanently raises your
  max integrity and attack, and fully repairs you.
- **Skills:** **Overclock** (Q) temporarily boosts your attack; **Nanite Repair** (Z) heals you.
  Both have cooldowns, shown in the inventory panel.
- **Professions:** unlock at level 3 once you've installed or crafted a weapon/chassis upgrade,
  granting a permanent bonus (War Frame = +attack, Scavenger = +shielding).
- **Credits & materials:** spendable/collectible resources. Materials feed crafting; a shop for
  credits is planned.

## Saving, dying, and starting over

- Press **O** to save and **P** to load. Your save also loads automatically when you reopen the
  game.
- If your integrity hits zero, you get a **GAME OVER** screen with your final level and credits.
  Choose **START OVER** (or press Enter/R) to reset and begin a fresh run — this clears the
  current save.

## Audio

Original 8-bit chiptune plays as you explore, switching to a more intense track when an enemy is
in your room. Sound effects cover movement, hits, taking damage, defeats, pickups, and
level-ups. Press **M** to mute. (Audio starts on your first key press, per browser rules.)

---

*Planned next: shops/crafting with credits and ore, more enemy and prop variety, usable skills
and professions, and mission objectives. This guide will be updated as those land.*
