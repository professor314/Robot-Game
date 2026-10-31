# Robot-Game — Player's Guide

You're a salvage robot that wakes up on a derelict space station. Your core AI pulled the
ship's systems apart and scattered them "for safekeeping," then went silent. Your goal:
**restore the ship and fly it home to Earth.** Recover the seven ship components from their
guardians, install each in its room, then face the thing that took the station apart. Beat it
and you depart — after that the station is yours to free-roam.

This guide covers everything the game currently does. It's a living document.

## Starting the game

```bash
cd extensions/web
npm run dev
```

Then open the printed localhost URL (usually http://localhost:5173) in your browser.

## Pick your bot

The game opens on a **pick-your-bot** screen. The four salvage chassis are **balanced but
flavored** — they trade speed, toughness, and hitting power differently, so your pick shapes how
the run feels:

| Chassis | Feel | HP / ATK / DEF | Speed |
|---|---|---|---|
| **Dome Waver** | Balanced all-rounder | 100 / 10 / 3 | normal |
| **Spindle Walker** | Fast and nimble, but fragile | 75 / 9 / 2 | fastest |
| **Tread Hauler** | Heavily shielded, average pace | 115 / 10 / 6 | normal |
| **Barrel Bot** | Tough and hard-hitting, but slow | 130 / 13 / 4 | slowest |

Your choice is saved with the run. If a save exists, a **Continue** option resumes it. You start
holding your **mining laser**, which equips automatically.

## The goal: restore the ship

The HUD shows your current objective and a **RESTORE THE SHIP: N/7 installed** tracker. Each of
the seven components follows the same loop:

1. **Find the guardian.** Each component is held by a **Guardian Boss** in a specific room.
2. **Defeat it to recover the component** — guardians drop their component and never respawn.
3. **Install it** at its matching room (reactor core → Reactor Terminal, nav array →
   Observation Deck, and so on). Stand on the install point and press **E**.

The seven components: reactor core, navigation array, life-support unit, comms relay, thruster
assembly, shield emitter, and flight computer.

Once all seven are installed, the **Major Boss** — a massive station core robot — activates at
the Docking Port. It's tuned to be very hard without several crafted upgrades (weapon, armor,
and max-integrity). Defeat it and the ship departs for Earth. The ending leads into **free-roam**.

## Controls

| Input | Action |
|---|---|
| **W A S D** / **Arrow keys** | Move one tile. Walk through a doorway to the next room. |
| **Space** / **F** | Attack an adjacent enemy. |
| **Shift** | **Dash** — lunge several tiles in your facing direction with brief invulnerability (i-frames). Has a cooldown; blocked by walls. |
| **R** | **Ranged attack** — fire down your facing line. Unlocked by crafting a ranged weapon. |
| **E** | Interact: mine junk, use a repair bay, **install a component**, or **read a log terminal** — whichever you're next to. |
| **Q** | Overclock — temporary attack boost (cooldown). |
| **Z** | Nanite Repair — restore integrity (cooldown). |
| **I** | Inventory (weapon tier, mining laser, credits, materials, **key cards**, ranged status). |
| **C** | Crafting panel (then a number to craft). |
| **T** | **Station map** overlay (toggle). |
| **L** | **Data logs** — re-read everything you've discovered. |
| **V** | **Vendor** — open the shop (only in the vendor room). |
| **O** / **P** | Save / Load. |
| **M** | Mute / unmute audio. |
| **G** | Toggle game-feel effects (hit flash, damage numbers, shake). |
| **Enter** / **R** | GAME OVER screen: start over. |

Item pickup is automatic — stepping onto or beside salvage grabs it. The on-screen **CONTROLS**
box (bottom-left) always lists the binds.

## The HUD

- **Objective** (top-center) — your active mission and the **N/7 installed** tracker.
- **Integrity bar** — health; turns yellow then red. Zero is game over.
- **LV / XP** — level and experience.
- **CR** — credits.
- **WPN Mk.N** — weapon tier.
- **Room name** — where you are.
- **Dash / Ranged cooldowns** — shown when on cooldown.
- **Event log** (bottom-left) — hits, pickups, unlocks, installs, and more.

## Key cards & locked doors

Some rooms are sealed behind a **key card**. The lock belongs to the *room*, so **every door
into a locked room uses the same key** — find the card once and all its entrances open. Pick up
a key card (shown in your inventory) and walking into the locked room unlocks it. Key cards are
always placed so the station is solvable from the start — no key is ever locked behind the room
it opens.

## Combat depth

- **Melee:** get adjacent and press **Space**. Damage varies on a bell curve.
- **Dash (Shift):** cover ground fast and punch through an enemy's wind-up with i-frames —
  good for repositioning and dodging telegraphed hits.
- **Ranged (R):** once you craft a ranged weapon, fire down your facing line; a projectile
  resolves the first hit.
- **Telegraphs:** tougher enemies and bosses **wind up** heavy attacks — you'll see the tell
  before it lands. Dash or step out of the way.
- **Knockback:** heavy hits shove whatever they strike back a tile.
- **Enemy brains:** different hostiles behave differently — stationary **sentries**, drifting
  **drones**, scuttling **crawlers**, and relentless **hunters** that chase you between tiles.
- Defeated regular enemies drop loot and respawn after a delay. **Bosses never respawn.**

## Bosses

- **7 Guardian Bosses** — one per ship component, each a scaled-up, red-tinted robot with
  telegraphed heavy attacks and knockback. Defeat one to recover its component.
- **1 Major Boss** — the station core, the largest robot in the game. It only activates once all
  seven components are installed, has a second, nastier phase at half health, and is balanced to
  demand several crafted upgrades. Boss rooms get their own music; the Major Boss has a distinct
  theme.

## The vendor

A single **vendor room** sells goods for **credits only** (crafting, separately, uses
materials). Press **V** inside it, then a number key to buy:

- **Field Repair** — restore integrity now.
- **Alloy Pack / Servo Pack** — bundles of crafting materials.
- **Chassis Expansion** — permanent **+max integrity**.

## Crafting

Find **recipe chips** in rooms to learn recipes, then press **C** and a number to build. Current
recipes include:

- **Power Battery** — a quick heal.
- **Reinforced Plating** — permanent +shielding.
- **Plasma Edge** — a heavier melee weapon (+attack).
- **Capacitor Cannon** — unlocks your **ranged attack**.
- **Focused Mining Laser** — breaks junk in fewer hits.
- **Hardened Chassis** — permanent +max integrity.

Materials come from mining junk deposits (nuts, bolts, circuit boards, servos, capacitors, alloy
plates, coolant cells, and more).

## The map & logs

- **Map (T):** a station minimap built from the room layout. Visited rooms are drawn (current
  room highlighted), unvisited rooms show as unknown, and points of interest are marked —
  install points (◎ / ✓ installed), the vendor ($), and locked doors (🔒).
- **Logs (L):** the station's crew left **log terminals** in themed rooms. Press **E** at a
  terminal to read one; press **L** anytime to re-read everything you've found and piece the
  story together.

## Exploring & props

- The station is a connected set of rooms laid out spatially (go north then south and you're
  back where you started). **Fog of war** hides rooms until you enter them.
- Rooms are themed and furnished: telescopes on the Observation Deck, server racks in the Data
  Core, a glowing reactor, crew bunks, and so on. Some props are solid — route around them.
- **Junk deposits** — mine with **E** for a random handful of materials.
- **Repair bays** — press **E** to restore integrity to full.

## Progression

- **Leveling:** XP from defeating enemies raises your level, permanently boosting max integrity
  and attack and fully repairing you.
- **Skills:** **Overclock (Q)** boosts attack; **Nanite Repair (Z)** heals. Both have cooldowns.
- **Professions:** unlock at level 3 once you've installed or crafted a weapon/chassis upgrade
  (War Frame = +attack, Scavenger = +shielding).
- **Max-integrity upgrades:** raise your ceiling via the Hardened Chassis recipe or the vendor's
  Chassis Expansion.

## Saving, dying, winning

- **O** saves, **P** loads; your save also loads automatically on reopen.
- Integrity at zero → **GAME OVER** with your final level and credits. **START OVER** (Enter/R)
  resets and clears the save.
- Install all seven components and defeat the Major Boss → **SHIP RESTORED** ending → **CONTINUE
  (free-roam)** to keep playing the open station.

## Audio

Original chiptune scores each context — a title theme, calm exploration, tense combat, boss
music, and a distinct Major Boss theme — with clean transitions. Sound effects cover movement,
hits, dashes, ranged fire, telegraph tells, unlocks, installs, purchases, and boss defeats.
Press **M** to mute. (Audio starts on your first key press, per browser rules.)

---

*Planned next: more post-departure free-roam content and additional enemy/prop variety.
Multiplayer remains on the long-term roadmap.*
