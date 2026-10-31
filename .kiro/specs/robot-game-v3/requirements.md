# Requirements — Robot-Game v3: "Restore the Ship"

## Introduction

Robot-Game's web version (`extensions/web/`) has a complete systems foundation: tile-built
rooms laid out from a room graph, fog of war, real-time combat, mining, crafting, an
XP/level/skill/profession progression, save/load, original neon-SVG art, chiptune audio, and a
headless agent API. What it lacks is a **reason to play** — there is no story, no objective,
and no payoff.

This spec turns the sandbox into a **game with an arc**: the player is a salvage robot that
wakes on a derelict station and must **restore the ship to fly home to Earth**. Restoration
requires recovering **7 ship components**, each held by a **guardian boss** and each gated
behind **key-card-locked doors**. Installing all 7 components powers the ship; a **final major
boss** then stands between the player and departure — a fight that is only winnable if the
player has crafted several upgrades along the way. The game ends when the restored ship departs
for Earth (with room for post-departure content later).

This builds on, and does not replace, the `dungeon-rpg-v2` spec (the foundation record). All
work targets `extensions/web/`; the Core_Logic / Render_Layer split, determinism, headless
testability, and the neon-SVG art style are preserved throughout.

## Glossary

- **Foundation**: the existing systems delivered under `dungeon-rpg-v2` (rooms, combat, mining,
  crafting, progression, save/load, agent API, audio, art).
- **Story_Arc**: the restore-the-ship narrative from wake-up to departure.
- **Ship_Component**: one of 7 parts needed to restore the ship (e.g. reactor core, nav
  computer). Recovered from a boss, then installed at its matching **Install_Point**.
- **Install_Point**: a fixed station location (one per component, in a themed room) where a
  recovered Ship_Component is installed. Installing all 7 powers the ship.
- **Mission**: the self-contained objective of recovering one Ship_Component and installing it.
  Seven missions, loosely from the space-MUD's missions data.
- **Key_Card**: a keyed access token that unlocks all doors into a specific room. One card per
  locked room; every door into that room uses the same card.
- **Locked_Door**: a door that will not open until the player holds the matching Key_Card.
- **Guardian_Boss**: a large-robot enemy that guards a Ship_Component; defeating it drops the
  component. One per mission (7 total).
- **Major_Boss**: the final large-robot enemy guarding the ship's departure, tuned to require
  multiple crafted upgrades to beat.
- **Vendor**: a single shop room where the player spends **credits** (only) on goods.
- **Fabricator**: the existing crafting system (consumes **materials**, not credits).
- **Chassis**: the player bot chosen at the start; each has a balanced-but-flavored stat
  tradeoff.
- **Log_Entry**: a discoverable terminal readout / data log that delivers environmental story.
- **Map_Screen**: a toggleable minimap derived from the room graph's solved coordinates.

---

## Requirements

### Requirement 1: Story Arc — Restore the Ship and Fly Home

**User Story:** As a player, I want a clear goal — restore the ship and leave — so that
exploration and combat build toward something.

#### Acceptance Criteria

1. THE game SHALL open with a short wake-up framing (amnesiac salvage robot on a derelict
   station) presented without blocking cutscenes (text/overlay the player dismisses).
2. THE Story_Arc SHALL define a primary objective: recover and install 7 Ship_Components to
   restore the ship, then defeat the Major_Boss to depart for Earth.
3. THE game SHALL track Story_Arc progress (components recovered, components installed, bosses
   defeated) in Core_Logic, serialized in the save.
4. WHEN all 7 Ship_Components are installed AND the Major_Boss is defeated, THE game SHALL play
   a departure ending (the ship leaves for Earth) and offer to continue in a free-roam state.
5. THE ending SHALL be structured so post-departure content can be added later without rework.

### Requirement 2: Missions and Ship Components

**User Story:** As a player, I want distinct missions that each restore a piece of the ship, so
that progress is legible and rewarding.

#### Acceptance Criteria

1. THE game SHALL define **7 missions**, each tied to one Ship_Component, seeded where practical
   from the space-MUD's missions data.
2. EACH mission SHALL be: reach the component's region (possibly behind a Locked_Door), defeat
   its Guardian_Boss, collect the Ship_Component, and install it at its Install_Point.
3. THE game SHALL place **7 Install_Points**, one in each of 7 distinct, thematically fitting
   rooms (e.g. the nav computer in the control room, the reactor core in the Reactor Terminal).
4. WHEN the player installs a Ship_Component at its Install_Point, THE game SHALL mark that
   mission complete, announce it, and update Story_Arc progress.
5. THE HUD SHALL show current mission objectives and overall restoration progress (e.g. "3/7
   components installed").
6. Missions SHALL be completable in a flexible order where the key-card gating allows.

### Requirement 3: Key Cards and Locked Doors

**User Story:** As a player, I want to find key cards that open new areas, so that exploration
unfolds progressively.

#### Acceptance Criteria

1. THE game SHALL support Locked_Doors that do not open until the player holds the matching
   Key_Card.
2. A Key_Card SHALL be keyed to a **room**, not an individual door: **every door into the same
   room uses the same Key_Card**, so multi-entrance rooms are consistent.
3. WHEN the player attempts to pass a Locked_Door without the Key_Card, THE game SHALL block the
   move and indicate the required card.
4. WHEN the player holds the matching Key_Card, THE Locked_Door SHALL open on contact (no
   separate "use" step required) and stay open.
5. Key_Cards SHALL be discoverable in rooms (found items) and SHALL be shown in the inventory.
6. THE Key_Card gating SHALL be solvable (no card is required to reach the room that contains
   it), and the dependency order SHALL be deterministic and logged for verification.

### Requirement 4: Guardian Bosses and the Major Boss

**User Story:** As a player, I want big-robot boss fights that gate each ship component and a
climactic final boss, so that progress has real stakes.

#### Acceptance Criteria

1. THE game SHALL define **7 Guardian_Bosses**, each a large-robot enemy with more integrity,
   distinct attacks, and a telegraphed pattern beyond the basic hostiles.
2. WHEN a Guardian_Boss is defeated, THE game SHALL drop its Ship_Component and SHALL NOT
   respawn that boss.
3. THE game SHALL define **1 Major_Boss** (a large robot) guarding the ship's departure, tuned
   so that it is very difficult without multiple crafted upgrades (weapon, armor, max-integrity,
   etc.).
4. THE Major_Boss encounter SHALL be reachable only after all 7 Ship_Components are installed.
5. Bosses SHALL use the pluggable `Brain` interface with boss-specific behavior (pursuit,
   telegraphed heavy attacks, phases where appropriate), remaining deterministic under a seed.
6. THE boss rooms SHALL play distinct **boss music**; the Major_Boss SHALL have its own theme.

### Requirement 5: Environmental Story (Log Entries)

**User Story:** As a player, I want to piece together what happened to the station, so that the
world feels authored and atmospheric.

#### Acceptance Criteria

1. THE game SHALL place discoverable Log_Entries (terminal readouts / data logs) across rooms,
   themed to each room's function and advancing the Story_Arc.
2. WHEN the player reads a Log_Entry, THE game SHALL display its text and record it as read
   (persisted in the save), so a log is not re-prompted.
3. THE game SHALL provide a way to re-read discovered Log_Entries (e.g. a logs view).
4. Log_Entries SHALL contain no gameplay gating (purely narrative/atmosphere).

### Requirement 6: Combat Depth

**User Story:** As a player, I want combat with more than bump-to-attack, so that fights
(especially bosses) are engaging.

#### Acceptance Criteria

1. THE combat SHALL remain tile-based (grid movement), extended with depth rather than replaced
   with free movement.
2. THE player SHALL have a **dash/dodge** action (short cooldown) that moves multiple tiles and
   grants brief invulnerability frames.
3. THE player SHALL have a **ranged attack** option (tied to a crafted weapon, e.g. the
   Capacitor Cannon) that fires along a line and resolves via the combat system.
4. Enemy and boss heavy attacks SHALL be **telegraphed** (a wind-up with a visible/audible cue)
   before they land, so they can be dodged.
5. Attacks SHALL apply **knockback** where appropriate (e.g. boss slams), moving the struck
   entity if the destination tile is free.
6. ALL new combat actions SHALL be expressed through Core commands and the `ICombatSystem`
   interface, remaining deterministic and headless-testable.

### Requirement 7: Varied Enemy AI

**User Story:** As a player, I want the different enemy types to behave differently, so that
fights stay interesting.

#### Acceptance Criteria

1. THE 5 existing enemy types SHALL use **distinct `Brain` behaviors** (e.g. the drone strafes
   and keeps distance, the crawler ambushes, the hunter charges, the sentry holds ground).
2. Enemy behaviors SHALL be selected per enemy type via the pluggable `Brain` interface.
3. Enemy behaviors SHALL remain deterministic under a fixed seed and dt (headless-testable).

### Requirement 8: Economy — Vendor and Upgrades

**User Story:** As a player, I want to spend credits and keep improving my robot, so that
combat rewards and exploration feel worthwhile.

#### Acceptance Criteria

1. THE game SHALL provide a **single Vendor room** where the player spends **credits only** on
   goods (e.g. materials, recipes, repairs, consumables).
2. THE Fabricator (crafting) SHALL continue to consume **materials** (not credits); the Vendor
   and Fabricator SHALL be distinct systems.
3. THE game SHALL provide upgrades (found and/or crafted) that raise **max integrity**, in
   addition to the existing weapon/armor/mining upgrades.
4. THE Vendor SHALL show prices, reject unaffordable purchases, and deduct credits on purchase.
5. Credits earned (combat, salvage) and spent (Vendor) SHALL be tracked in Core_Logic and
   persisted.

### Requirement 9: Chassis Identity

**User Story:** As a player, I want my starting bot choice to matter, so that runs feel
different.

#### Acceptance Criteria

1. EACH player Chassis SHALL have a **balanced-but-flavored** stat profile (no strictly-best
   option): tradeoffs such as the heavy bot being slower but sturdier/stronger, the spindly bot
   faster but frailer, etc.
2. Chassis stats (speed, max integrity, attack, carry/other) SHALL be data-driven in Core_Logic
   and applied at new-game start.
3. THE pick-your-bot screen SHALL communicate each chassis's tradeoff to the player.
4. Chassis choice SHALL be recorded in the save and SHALL affect gameplay (not purely cosmetic).

### Requirement 10: Map Screen

**User Story:** As a player, I want a map of the station, so that I can navigate a 15-room
station with fog of war.

#### Acceptance Criteria

1. THE game SHALL provide a toggleable Map_Screen derived from the room graph's solved
   coordinates.
2. THE Map_Screen SHALL show visited rooms, the player's current room, and known
   points-of-interest (Install_Points, the Vendor, Locked_Doors) without revealing unvisited
   rooms' interiors (respecting fog of war).
3. THE Map_Screen SHALL reflect room adjacency/direction consistent with in-world movement.

### Requirement 11: Audio Depth

**User Story:** As a player, I want the soundtrack to fit the moment, so that the game feels
alive.

#### Acceptance Criteria

1. THE game SHALL play context-appropriate music including: a title/pick-your-bot theme, the
   existing exploration and combat variants, and **distinct boss music** (with a unique
   Major_Boss theme).
2. Music transitions SHALL follow game context (explore ↔ combat ↔ boss) cleanly.
3. ALL music SHALL remain **original**, generated via the existing Web Audio synth; no
   copyrighted material.
4. SFX SHALL cover the new actions (dash, ranged fire, telegraph cue, key-card unlock, install,
   purchase, boss defeat).

### Requirement 12: Agent API Coverage and Demo

**User Story:** As the author, I want the AI agent to still be able to play, and to show it off,
so that the game's distinctive feature stays functional and visible.

#### Acceptance Criteria

1. THE Agent_API SHALL expose the new actions (dash, ranged attack, use key card/door, install
   component, interact with vendor) as discrete, serializable actions.
2. THE Agent_API observation SHALL include Story_Arc/mission state and nearby points-of-interest
   sufficient for a scripted agent to make progress.
3. THE game SHALL include a demo (script or dev hook) of an agent playing meaningfully, and the
   step loop SHALL remain deterministic under a fixed seed.

### Requirement 13: Testing and Quality

**User Story:** As the author, I want the new systems tested like the rest, so that the game
stays stable as it grows.

#### Acceptance Criteria

1. ALL new Core_Logic (missions, key cards, bosses, dash/ranged/telegraph/knockback, enemy
   brains, vendor, chassis, map data, story/log tracking) SHALL have headless Vitest coverage.
2. THE full suite SHALL pass and the project SHALL build and lint clean.
3. New art SHALL be generated in the existing neon-SVG style (via `make_art.py` where
   applicable) and recorded in `ASSETS.md`.
4. Core_Logic SHALL remain free of Phaser/DOM imports; determinism under a fixed seed SHALL be
   preserved.

### Requirement 14: Deployment (Last)

**User Story:** As the author, I want the finished game online, so that others can play it.

#### Acceptance Criteria

1. AFTER all preceding requirements are delivered, THE game SHALL be deployed to imadestuff.com
   as a static sub-path (built `dist/` copied into the Hugo site's `static/`, served via the
   existing S3 + CloudFront pipeline).
2. THE site SHALL provide a page to play the game (link and/or iframe embed).
3. THE deployment SHALL not break the blog's `aws s3 sync --delete` flow (game lives under
   `static/` so it is part of Hugo's `public/`).
