# Requirements Document

## Introduction

This document specifies the modernization and extension of a tile-based dungeon RPG originally written in 2014 as C# coursework (.NET Framework 3.5 WinForms). The original renders a dungeon of rooms and halls, lets the player walk with the arrow keys, pick up items, equip weapons, and fight timer-driven enemies (Ant, Cthulhu). It depended on a SQL Server `.mdf` database (via typed DataSets) that is missing from the preserved copy and would crash the game today.

The project has **three tracks**, mirroring the `modeling-motion` / Physics-Modeling pattern of preserving the original while building modern, best-fit rewrites:

- **`original/`** — the 2014 C# WinForms code, preserved exactly, untouched.
- **`extensions/csharp-winforms/`** — **Phase 1**: a faithful port of the original to **.NET 8 WinForms** with the database removed. Keeps the C# lineage and proves the port on the desktop.
- **`extensions/web/`** — **Phase 2+**: the souped-up game, rewritten in **TypeScript + Phaser 3** as a browser game. Sci-fi themed to match the author's Evennia **space MUD** (`space-mud`), with tile-built rooms, scrolling room-to-room reveal with fog-of-war, active real-time combat, the MUD's stat/progression model, local playability for testing and AI play, and an architecture ready for multiplayer via **Colyseus** in a later phase.

The web game reuses the room graph, hostiles, and combat model of the space MUD (`space-mud/spacemud/world/data/*.json` and `commands/combat.py`) but renders them as an explorable 2D tile world rather than text.

The project/repo and website page are named **Robot-Game**. Art uses the open-source **Kenney** CC0 sci-fi tilesets (public domain, no attribution required). Audio is original 8-bit chiptune in the spirit of Sunsoft/Blaster Master NES soundtracks, generated with open-source tooling (no copyrighted material shipped).

## Glossary

- **Original_Game**: The preserved 2014 project in `original/` (.NET Framework 3.5, SQL Server dependency). Not modified by this spec.
- **WinForms_Port**: The Phase 1 rewrite in `extensions/csharp-winforms/`, targeting `net8.0-windows`, database removed, gameplay parity with the Original_Game.
- **Web_Game**: The Phase 2+ TypeScript + Phaser 3 browser game in `extensions/web/`.
- **Core_Logic**: The UI-independent game logic (map, rooms, entities, items, combat, AI, state) in the Web_Game, written in plain TypeScript with no Phaser/DOM dependency so it is testable headlessly and reusable by a future server.
- **Render_Layer**: The Phaser 3 layer that draws the Core_Logic state (tilemaps, sprites, camera, HUD) and translates input into Core_Logic commands.
- **Room**: A fixed-size, tile-built area with up to four doors (N/S/E/W) on its walls. Doors exist only in directions where an adjacent Room exists in the room graph.
- **Room_Graph**: The set of Rooms and their N/S/E/W connections, seeded from the space MUD's rooms/exits data.
- **Scroll_Transition**: When the player moves through a door, the camera scrolls in the movement direction from the current Room to the adjacent Room; previously visited Rooms remain rendered.
- **Fog_Of_War**: Unvisited Rooms render dark/hidden until first entered.
- **Entity**: Any actor in a Room: the Player, a Hostile, or an NPC/terminal.
- **Hostile**: A hostile Entity with integrity/processing/shielding stats and rewards, seeded from the MUD's hostiles data.
- **Stat_Model**: The MUD's stat system — integrity (health), processing (attack output), shielding (damage reduction), plus XP, credits, level, and respawn.
- **Combat_System**: The real-time combat subsystem: the Player and Hostiles can strike adjacent targets; hostile AI pursues and attacks the Player. Defined behind a clean interface so timing, damage, and AI can be tuned later.
- **Progression**: XP, leveling, credits, salvage drops, skills, and professions (professions unlock at level 3 as in the MUD).
- **Game_State**: The complete serializable runtime state of a playthrough (player, rooms visited, entity positions/stats, inventory, progression).
- **Headless_Mode**: Running Core_Logic without rendering, driven programmatically — used by tests and by an AI agent.
- **Agent_API**: A programmatic interface exposing observations (current state) and accepting actions (move/attack/use), enabling an AI or script to play the Web_Game.
- **Local_Server**: A local dev server that serves the Web_Game for play and testing in a browser on the author's machine.
- **Tileset**: An open-source, permissively licensed (CC0 or similar) sci-fi tile/sprite pack used for rooms, the player, hostiles, items, and doors.

---

## Requirements

### Requirement 1: Preserve the Original

**User Story:** As the author, I want the original 2014 project kept intact, so that the coursework is preserved exactly as submitted.

#### Acceptance Criteria

1. THE Original_Game SHALL remain in `original/` with its source unmodified by this spec.
2. THE `original/` directory SHALL retain the original project file, source `.cs` files, designer files, resources, and `tiles32.png`.
3. THE repository README SHALL distinguish the Original_Game from the rewrites and explain why the original cannot run as-is (missing SQL Server `.mdf`, .NET Framework 3.5 toolchain).

---

### Requirement 2: Phase 1 — WinForms Port Builds and Runs on .NET 8

**User Story:** As the author, I want a faithful port of the original on .NET 8, so that I can run my original game on a modern machine without Visual Studio 2010 or SQL Server.

#### Acceptance Criteria

1. THE WinForms_Port SHALL use an SDK-style project targeting `net8.0-windows` with `UseWindowsForms` enabled.
2. THE WinForms_Port SHALL build via `dotnet build` and run via `dotnet run` with zero errors, launching the game window.
3. THE WinForms_Port SHALL NOT reference SQL Server DataSets, `.mdf`/`.ldf` files, or `System.Deployment`.
4. THE WinForms_Port SHALL define the dungeon layout, treasure, player inventory, and enemies as in-code seed data (restoring what the original loaded from the database and its commented-out block), with no database access and no startup crash.
5. THE WinForms_Port SHALL load `tiles32.png` reliably relative to the executable, replacing the fragile `../../tiles32.png` path.
6. THE WinForms_Port SHALL preserve the original gameplay: tile-rendered dungeon of rooms and halls; arrow-key movement one cell per press; walls and closed doors block; locked door requires the key item; two-step door open/pass; treasure pickup respecting capacity and no duplicates; timer-driven enemies that move randomly and pursue the Player when orthogonally adjacent; bump-to-attack combat with weapon or level-scaled unarmed damage; death removes enemies and ends the game on Player death.
7. THE WinForms_Port SHALL preserve the original roster and item set with the same tile ids: Player (HP 10, capacity 5, unarmed 3×level), Ant (HP 3, unarmed 1×level), Cthulhu (HP 35, level 5, unarmed round(1.5×level)); items camera, Mace (+5), staff (+3), SpellBook, Diamond, Scroll, Key.
8. THE WinForms_Port SHALL provide the original stats window (HP, max HP, HP bar, inventory icon list, equip/unequip, drop) and log window (pickups, HP changes, equips, attacks, clear), updating live via change notifications.
9. THE WinForms_Port SHALL fix the original movement bug where entering a null cell left the Player in place.
10. THE WinForms_Port SHALL organize game logic separately from WinForms so it is unit-testable headlessly.

---

### Requirement 3: Web Game — Project, Stack, and Local Play

**User Story:** As the author, I want a Phaser browser game I can run locally, so that I can test it easily and let an AI play it.

#### Acceptance Criteria

1. THE Web_Game SHALL be a TypeScript project using **Phaser 3** for rendering and input, with a modern bundler (Vite) and a `package.json` with scripts for dev, build, test, and preview.
2. THE Web_Game SHALL run locally via a Local_Server (e.g., `npm run dev`) and open a playable game in the browser on `localhost`.
3. THE Web_Game SHALL build to static files (`npm run build`) that can be hosted on any static web host with no server-side runtime (for the single-player phase).
4. THE Web_Game SHALL separate Core_Logic (plain TypeScript, no Phaser/DOM imports) from the Render_Layer, so Core_Logic runs in Headless_Mode.
5. THE Web_Game SHALL target evergreen browsers and provide a canvas that scales responsively to the viewport.
6. THE Web_Game SHALL include a README with local setup, run, build, and test instructions.

---

### Requirement 4: Web Game — Rooms Built From Tiles

**User Story:** As a player, I want rooms built from tiles like the original, so that the world feels like an explorable tile dungeon.

#### Acceptance Criteria

1. THE Web_Game SHALL build each Room from a tile grid (walls, floor, doors, decor) using the sci-fi Tileset, with all Rooms the same size.
2. THE Web_Game SHALL place doors only on the N/S/E/W walls where an adjacent Room exists in the Room_Graph; walls without an adjacent Room SHALL have no door.
3. THE Web_Game SHALL seed the Room_Graph from the space MUD's room and exit data (14 rooms across `central_station` and `outer_zone`, N/S/E/W connections), preserving which rooms connect in which directions.
4. THE Web_Game SHALL render the Player, Hostiles, items, and interactables as sprites positioned on the tile grid.
5. THE Web_Game SHALL carry over each MUD room's identity (name and flavor) so rooms are recognizable (e.g., Main Corridor, Reactor Terminal, Cargo Wreck).

---

### Requirement 5: Web Game — Movement, Scrolling Reveal, and Fog of War

**User Story:** As a player, I want moving between rooms to scroll the view while keeping rooms I've seen, so that exploration feels continuous and I build a mental map.

#### Acceptance Criteria

1. THE Web_Game SHALL move the Player within a Room on a tile grid via keyboard input (arrows/WASD), blocking movement into walls.
2. WHEN the Player moves through a door into an adjacent Room, THE Web_Game SHALL scroll the camera in the direction of travel from the current Room to the adjacent Room (Scroll_Transition).
3. THE Web_Game SHALL keep previously visited Rooms rendered after the Player leaves them (they remain visible as the camera scrolls).
4. THE Web_Game SHALL render unvisited Rooms as dark/hidden (Fog_Of_War) until the Player first enters them.
5. THE Web_Game SHALL lay out Rooms in world space according to their N/S/E/W relationships so that scrolling directions are spatially consistent (north is up, etc.).
6. WHEN the Room_Graph contains a direction conflict (a room reachable at inconsistent relative positions), THE Web_Game SHALL resolve layout deterministically and log a warning rather than overlapping rooms.

---

### Requirement 6: Web Game — Active Real-Time Combat

**User Story:** As a player, I want to run up and hit enemies and have them hit back, so that combat is active rather than turn-based or passive.

#### Acceptance Criteria

1. THE Combat_System SHALL let the Player attack an adjacent Hostile with an attack action (key press), applying damage based on the Stat_Model.
2. THE Combat_System SHALL let Hostiles attack the Player when adjacent, applying damage based on the Stat_Model.
3. THE Combat_System SHALL drive hostile behavior via an AI interface: hostile Entities pursue and attack the Player when the Player is in the same Room and within range; non-hostile Entities do not attack.
4. THE Combat_System SHALL be defined behind a clean interface (damage calculation, attack timing/cooldowns, and AI decisions as replaceable components) so gameplay can be tuned and optimized later without rewriting the Render_Layer.
5. THE Combat_System SHALL run in real time with per-entity attack cooldowns rather than fixed global turns, while remaining deterministic given the same inputs and seed (for testing and AI play).
6. WHEN a Hostile's integrity reaches zero, THE Combat_System SHALL defeat it, grant its XP and credits, drop its salvage, and schedule respawn after its respawn delay.
7. WHEN the Player's integrity reaches zero, THE Web_Game SHALL handle Player defeat (e.g., respawn at a safe room with a penalty), configurable in Core_Logic.
8. THE Combat_System SHALL emit combat events (hit, miss, defeat, reward) consumable by the HUD/log and by the Agent_API.

---

### Requirement 7: Web Game — Stat and Progression Model (from the MUD)

**User Story:** As a player, I want the MUD's stats and progression, so that the game has depth and growth.

#### Acceptance Criteria

1. THE Stat_Model SHALL use integrity (health), processing (attack output), and shielding (damage reduction), matching the MUD's hostile stats and extending to the Player.
2. THE Combat_System SHALL compute damage from the attacker's processing reduced by the defender's shielding (exact formula defined in design and tunable).
3. THE Progression SHALL award XP and credits on Hostile defeat using the MUD's reward values, and SHALL level the Player up on XP thresholds.
4. THE Progression SHALL support credits as a currency and salvage items dropped by Hostiles.
5. THE Progression SHALL support skills (activatable abilities) and professions (specializations unlocking at level 3 with a chassis equipped), seeded from the MUD's skills/professions data where applicable.
6. THE Hostiles SHALL be seeded from the MUD's hostiles data (Corrupted Sentry in Cargo Wreck, Haywire Drone in Breached Lab, Rogue Program in Debris Drift) with their integrity, processing, shielding, XP, credits, respawn, and salvage.
7. THE Stat_Model and Progression SHALL live in Core_Logic so they are testable headlessly.

---

### Requirement 8: Web Game — Open-Ended Exploration (No Win Goal)

**User Story:** As a player, I want the robot to simply exist and explore, so that play is open-ended with no forced objective.

#### Acceptance Criteria

1. THE Web_Game SHALL have no win condition or forced end state; play continues indefinitely.
2. THE Web_Game SHALL support continued exploration, combat, and progression without a goal gate.
3. THE Web_Game SHALL provide optional, non-mandatory objectives or missions (seedable from the MUD's missions data) that the player may ignore.

---

### Requirement 9: Web Game — Sci-Fi Open-Source Tileset

**User Story:** As the author, I want the art to be a free, properly licensed sci-fi set matching the MUD theme, so that the game looks cohesive and is legally shippable.

#### Acceptance Criteria

1. THE Web_Game SHALL use an open-source, permissively licensed (CC0 or equivalent) sci-fi Tileset for rooms, player, hostiles, items, and doors.
2. THE Web_Game SHALL record the Tileset source URL and license in the repo (e.g., an `ASSETS.md` or credits section), and SHALL comply with any attribution requirement.
3. THE Tileset SHALL cover the needed tile types: floors, walls/corners, doors (open/closed), the player robot, the three hostiles, and item/salvage/decor sprites; placeholders may be used where a specific sprite is unavailable, documented as such.

---

### Requirement 10: Web Game — Save/Load State

**User Story:** As a player, I want my progress saved, so that I can resume exploration later.

#### Acceptance Criteria

1. THE Web_Game SHALL serialize Game_State (player position and stats, rooms visited, entity states, inventory, progression) to JSON.
2. THE Web_Game SHALL persist Game_State to browser storage (localStorage/IndexedDB) and restore it on load.
3. THE Web_Game SHALL support explicit save and load actions and SHALL recover gracefully from corrupt/incompatible saves without crashing.
4. THE serialization SHALL be defined in Core_Logic so the same format works in Headless_Mode and (later) server-side.

---

### Requirement 11: Web Game — HUD, Log, and Status

**User Story:** As a player, I want on-screen stats and an event log, so that I can follow the action without opening separate windows.

#### Acceptance Criteria

1. THE Web_Game SHALL display a HUD showing integrity (with a bar), level, XP, credits, current room name, and equipped/active item.
2. THE Web_Game SHALL display a scrolling event log of combat and pickup events (reusing Combat_System and progression events).
3. THE Web_Game SHALL provide an inventory/equipment view and a skills view accessible in-game.
4. THE HUD SHALL update live as Game_State changes.

---

### Requirement 12: Web Game — Agent API for AI / Automated Play

**User Story:** As the author, I want an AI or script to be able to play the game, so that I can test and demo it automatically.

#### Acceptance Criteria

1. THE Web_Game SHALL expose an Agent_API over the Core_Logic providing an observation (serializable snapshot: player state, visible room layout, nearby entities, legal actions) and accepting discrete actions (move N/S/E/W, attack, use skill, pick up, wait).
2. THE Agent_API SHALL run in Headless_Mode without rendering, advancing the game deterministically given a fixed seed and action sequence.
3. THE Agent_API SHALL expose a step function suitable for a scripted or learning agent (observation in, action out, reward/event stream), modeled loosely on a step/observe loop.
4. THE Web_Game SHALL include at least one example automated player (a simple scripted or random agent) demonstrating the Agent_API end to end.
5. THE Agent_API SHALL be usable both in-process (tests, Node) and, where practical, from the running browser build (e.g., a debug hook) so an AI can drive the live game.

---

### Requirement 13: Web Game — Multiplayer-Ready Architecture (Deferred Implementation)

**User Story:** As the author, I want the game architected for multiplayer later, so that adding it does not require a rewrite.

#### Acceptance Criteria

1. THE Core_Logic SHALL keep authoritative game state separate from rendering and input, so a server could own the state in the future.
2. THE Core_Logic SHALL model player actions as discrete, serializable commands and state changes as serializable events/patches suitable for network sync (aligning with a Colyseus-style room/state model).
3. THE Room SHALL be the unit of state partitioning (one authoritative state per room), anticipating Colyseus rooms.
4. THE Web_Game SHALL NOT hard-code single-player assumptions that would block adding a second player (e.g., it SHALL support multiple player entities in Core_Logic even if only one is active now).
5. Multiplayer networking (Colyseus server, client sync) SHALL be explicitly out of scope for the initial phases and planned as a later phase.

---

### Requirement 14: Web Game — 8-Bit Audio, Original Theme Tune, and Game Feel

**User Story:** As a player, I want 8-bit chiptune music and sound with an original theme tune in the spirit of Blaster Master, so that the game has a classic NES feel.

#### Acceptance Criteria

1. THE Web_Game SHALL play 8-bit/chiptune background music, including an **original theme tune** composed for this game in the style of late-1980s Sunsoft NES soundtracks (Blaster Master's "Area 1" by Naoki Kodaka as a stylistic reference only): driving bassline, melodic lead, roughly 100–150 BPM, using classic PSG-style voices (pulse/square leads, triangle bass, noise percussion).
2. THE theme music SHALL be **100% original composition**. THE Web_Game SHALL NOT embed, ship, or reproduce copyrighted material from Blaster Master or any other commercial game (no ripped MIDI/NSF/audio). Reference tracks are for inspiration only and SHALL NOT be included in the repo.
3. THE Web_Game SHALL generate or play chiptune audio using an open-source approach (e.g., a Web Audio chiptune synthesis library, or CC0 chiptune assets), with all third-party tools/assets and their licenses recorded in `ASSETS.md`.
4. THE Web_Game SHALL play 8-bit sound effects for key events (move/bump, attack hit, taking damage, enemy defeat, item pickup, level up) in a style consistent with the theme.
5. THE Web_Game SHALL support multiple music tracks or variations (e.g., calmer exploration theme vs. more intense combat theme) and transition between them based on game context, with the architecture allowing more tracks to be added later.
6. THE Web_Game SHALL provide mute and volume controls (separate music and SFX volume where practical) persisted across sessions.
7. THE Web_Game SHALL provide lightweight game-feel feedback (hit flash, damage numbers, and/or screen shake on hit) toggleable in settings.
8. Audio SHALL comply with browser autoplay policies (start/resume audio on first user interaction) and SHALL degrade gracefully (the game remains playable with audio disabled or assets missing).

---

### Requirement 15: Testing

**User Story:** As the author, I want automated tests for both rewrites, so that mechanics stay correct as the game grows.

#### Acceptance Criteria

1. THE WinForms_Port SHALL include an xUnit test project covering map construction, symbol entry rules, combat math, and the movement-bug fix, passing via `dotnet test`.
2. THE Web_Game SHALL include a test suite (Vitest or equivalent) over Core_Logic covering: room-graph layout, movement/collision, fog-of-war visited tracking, combat damage and defeat/respawn, progression (XP/level/rewards), save/load round-trip, and the Agent_API step loop.
3. THE Web_Game Core_Logic tests SHALL run headlessly with no browser or Phaser dependency.
4. Both test suites SHALL be runnable from documented single commands.

---

### Requirement 16: Deployment to the Author's Website

**User Story:** As the author, I want the game in my repo and as a new page on my website, so that others can play it online.

#### Acceptance Criteria

1. THE Web_Game SHALL build to static assets deployable to a static host.
2. THE project SHALL document how to embed the built Web_Game as a new page on the author's site (the `imadestuff-blog` Hugo site, unless the author specifies otherwise).
3. THE deployment SHALL work for the single-player build with no server-side runtime; the later multiplayer phase MAY add a server deployment.
4. THE build SHALL support hosting under a sub-path (not only site root) so it can live at a page URL.

---

### Requirement 17: Code Quality

**User Story:** As the author, I want clean, modern code in both rewrites, so that the project reads as current professional work.

#### Acceptance Criteria

1. THE WinForms_Port Core logic SHALL enable nullable reference types, use modern C#, carry no dead/commented-out blocks from the original, and keep game logic free of WinForms types.
2. THE Web_Game SHALL use TypeScript in strict mode, ESLint + Prettier, and SHALL keep Core_Logic free of Phaser/DOM imports.
3. Public types and modules SHALL carry doc comments describing intent.
4. THE Web_Game SHALL organize Core_Logic into cohesive modules (room, entity, combat, progression, state, agent) with clear boundaries.

---

### Requirement 18: Documentation and Project Note

**User Story:** As a reader of the repo, I want clear docs and a project note, so that the project and its two-track structure are easy to understand.

#### Acceptance Criteria

1. THE repository SHALL include a root README framing the Original_Game, the WinForms_Port, and the Web_Game, with a structure diagram and run instructions, in the style of the modeling-motion README.
2. THE README SHALL document controls, the sci-fi/MUD theme and its relationship to `space-mud`, the improvements made, and known limitations (original not runnable as-is; multiplayer deferred).
3. THE Web_Game SHALL document the Agent_API with a usage example.
4. An Obsidian project note SHALL be created in the vault under `Projects/` with frontmatter (tags, status, code path, github) matching the `modeling-motion.md` convention.

---

### Requirement 19: Phased Delivery

**User Story:** As the author, I want a phased plan, so that I get working software early and layer improvements on.

#### Acceptance Criteria

1. **Phase 1** SHALL deliver the WinForms_Port: .NET 8 WinForms, database removed, seed data, tile loading fixed, gameplay parity, stats/log windows, and the movement-bug fix — building and running via `dotnet run` (Requirements 1, 2, 15.1, 17.1).
2. **Phase 2** SHALL deliver the Web_Game foundation: Phaser + TypeScript project, Local_Server, Core_Logic/Render_Layer split, tile-built rooms seeded from the MUD room graph, movement with scrolling reveal and fog of war, and the sci-fi tileset (Requirements 3, 4, 5, 9).
3. **Phase 3** SHALL deliver active combat, the MUD stat/progression model, hostiles, HUD/log, and open-ended play (Requirements 6, 7, 8, 11).
4. **Phase 4** SHALL deliver save/load, the Agent_API with an example agent, audio/game-feel, and the Web_Game test suite (Requirements 10, 12, 14, 15.2).
5. **Phase 5** SHALL deliver deployment to the website and documentation/project note (Requirements 16, 18).
6. **Phase 6 (later)** SHALL deliver multiplayer via Colyseus on the multiplayer-ready architecture (Requirement 13 implementation).
7. EACH phase SHALL leave its deliverable in a buildable, runnable state.
