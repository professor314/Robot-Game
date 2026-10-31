# Design Document — Robot-Game (CSharpRPG v2)

## Overview

Robot-Game has three tracks that live side by side, mirroring the `modeling-motion` convention of preserving the original and building best-fit rewrites:

```
Robot-Game/
├── original/                     # 2014 .NET Framework 3.5 WinForms game (preserved, untouched)
├── extensions/
│   ├── csharp-winforms/          # Phase 1: faithful .NET 8 WinForms port (desktop, C#)
│   │   ├── RobotGame.Core/       # UI-independent game logic (class library)
│   │   ├── RobotGame.WinForms/   # WinForms executable referencing Core
│   │   └── RobotGame.Tests/      # xUnit tests over Core
│   └── web/                      # Phase 2+: TypeScript + Phaser 3 browser game (souped-up)
│       ├── src/core/             # Core_Logic: plain TS, no Phaser/DOM (rooms, entities, combat, progression, state, agent)
│       ├── src/render/           # Render_Layer: Phaser scenes, sprites, camera, HUD
│       ├── src/audio/            # chiptune synth + theme tune + sfx
│       ├── src/data/             # seed data derived from space-mud (rooms, exits, hostiles, items)
│       ├── src/agent/            # Agent_API + example agents
│       ├── public/assets/        # Kenney CC0 tiles/sprites, generated/CC0 audio
│       ├── tests/                # Vitest headless Core_Logic tests
│       ├── index.html, vite.config.ts, package.json, tsconfig.json
│       └── ASSETS.md             # asset sources + licenses
├── .kiro/specs/dungeon-rpg-v2/   # this spec
├── .kiro/steering/user-context.md
└── README.md                     # frames original vs. ports, in modeling-motion style
```

The two rewrites deliberately do not share code (different languages, different platforms). What they share is lineage: the Web_Game inherits the original's tile-room idea and the author's `space-mud` world/combat model.

---

## Track 1 — Phase 1: .NET 8 WinForms Port

### Goals

Faithful parity with the Original_Game, minus the database, building on the installed .NET 8 SDK.

### Architecture

Split the monolithic WinForms project into a testable core plus a thin UI:

- **RobotGame.Core** (`net8.0`, no WinForms): `Map`, `TileSet` (logic only — image slicing stays in UI via a thin abstraction), `Character` (+ `Player`, `Ant`, `Cthulhu`), `Item`/`Weapon`, the `ISymbol` family (`Wall`, `Floor`, `Door`, `LockedDoor`, `Treasure`), combat, and a `GameState`/`GameWorld` that owns the map, characters, and the enemy-turn clock abstraction. Game events (attack, pickup, HP change) surface via an observable on the world rather than the original's `static` event.
- **RobotGame.WinForms** (`net8.0-windows`): `Program`, main form (renamed from `Form1` → `GameForm`), `StatsForm`, `LogForm`, and the `FireBox` tile-rendering `PictureBox`. The UI references Core, subscribes to its events, and translates key input into Core commands.

### Porting decisions

| Original concern | v2 decision |
|---|---|
| `.csproj` ToolsVersion 3.5, non-SDK | New SDK-style `.csproj`, `net8.0` / `net8.0-windows`, `Nullable` enabled |
| SQL Server `.mdf` + typed DataSets for inventory/items/creatures | Removed. `SeedData` static class defines the dungeon layout, treasure placements, player starting inventory, and enemy roster in code (the original's commented-out block is the reference for placements). |
| `nt_PropertyChanged` → `DeleteByPos` DB writes on pickup | In-memory only: remove treasure symbol from map. |
| `UpdateHealth`/`UpdatePosition`/`DeleteCreature` DB writes | In-memory only on `GameWorld`. |
| `Bitmap("../../tiles32.png")` | `tiles32.png` added to project as `Content`, `CopyToOutputDirectory`; load via path relative to `AppContext.BaseDirectory`. |
| `static event attackHappened` | Instance event on `GameWorld` (e.g., `event EventHandler<CombatEvent>`), so multiple games/tests don't cross-talk. |
| `TileSet` constructs `Bitmap` in Core | Keep image work in the WinForms project; Core references tiles by id only. `FireBox` and forms use a UI-side `TileSet`. |
| Movement bug: `character.Position = character.Position` on null cell | Treat out-of-room/null as blocked; valid floor/open cells always move. |
| `Form1`, `frmStats`, `frmLog` names | `GameForm`, `StatsForm`, `LogForm` (keep designer parity, update `.resx`). |

### Seed data (restoring original intent)

From `Form1.cs` the original rooms/halls and the commented treasure block define the parity layout:

- Rooms: (1,2)-(5,4), (8,1)-(11,13), (2,9)-(4,11). Halls: (3,4)-(3,9), (5,3)-(8,3). Player start (4,3). Locked door at (5,3) needing Key(592).
- Treasure (from the commented block): camera@(3,10),(3,7); Mace@(10,5),(10,4); staff@(10,7); SpellBook@(10,10); Diamond@(9,9); Scroll@(10,8); Key@(3,5).
- Enemies: Ant and Cthulhu (original DB rows) placed on the map and added to the moving-enemy set.

### Tests (RobotGame.Tests, xUnit)

Map construction (corners/walls/floor/doors), `PositionValid`, symbol entry rules (wall blocks, floor allows, door two-step, locked door needs key, treasure once + capacity), combat math (weapon vs. unarmed, HP floor at 0, death removal), and the movement-bug fix.

---

## Track 2 — Phase 2+: Phaser Web Game (Robot-Game)

### Design principle: Core_Logic vs. Render_Layer

The single most important rule: **all authoritative game state and rules live in `src/core/` as plain TypeScript with zero Phaser/DOM imports.** Phaser only renders state and forwards input as commands. This makes the game headless-testable, AI-playable, and server-portable (multiplayer later) without rewrites.

```
Input (keyboard / Agent_API)
      │  commands (MoveCommand, AttackCommand, UseSkillCommand, …)
      ▼
┌─────────────────────────────┐        events/patches
│  Core_Logic (deterministic) │ ───────────────────────────► Render_Layer (Phaser)
│  World, Rooms, Entities,    │                               HUD, Log, Audio
│  Combat, Progression, State │ ◄─────────────────────────── observation requests (Agent_API)
└─────────────────────────────┘
```

### Core_Logic modules (`src/core/`)

- **world.ts** — `GameWorld`: owns all rooms and entities, the authoritative clock, the command queue, and the event stream. A single `tick(dtMs)` advances everything deterministically. A seeded PRNG (injected) drives all randomness so runs are reproducible.
- **room.ts** — `Room`: fixed `W×H` tile grid, wall/floor/door tiles, door set keyed by direction (N/S/E/W), room id/name/zone/flavor. Doors exist only where `Room_Graph` has a neighbor. Each room holds its own entity list — the **unit of state partitioning** for future Colyseus rooms.
- **roomGraph.ts** — builds rooms + neighbor links from seed data; **layout solver** assigns each room an integer grid coordinate by walking the N/S/E/W graph from a root (Main Corridor at origin), so scroll directions are spatially consistent. Detects/logs conflicts (a room pinned to two coordinates) and resolves deterministically.
- **entity.ts** — base `Entity` with position (room + tile), `Stats` (integrity, processing, shielding), facing, and an optional `brain` (AI). Subtypes via composition: `PlayerEntity`, `HostileEntity`, `NpcEntity`.
- **stats.ts** — `Stats` and the damage formula: `damage = max(1, attacker.processing - defender.shielding)` (tunable; centralized so balancing is one edit). Integrity clamped `[0, max]`.
- **combat.ts** — `CombatSystem`: real-time with **per-entity attack cooldowns** (not global turns). On a tick, resolves queued attack commands and AI-initiated attacks for entities whose cooldown elapsed. Emits `HitEvent`, `DefeatEvent`, `RewardEvent`. Handles defeat → XP/credits/salvage → respawn timer. Designed as an interface (`ICombatSystem`) with the default implementation swappable for tuning/optimization.
- **ai.ts** — `Brain` interface: `decide(entity, worldView): Command | null`. `HostileBrain` pursues the player when in the same room and within aggro range, attacks when adjacent, wanders otherwise. Pluggable so smarter AI can drop in later.
- **progression.ts** — XP thresholds → level; credits wallet; salvage → inventory; skills (activatable, cooldowns) and professions (unlock at level 3 with a chassis). Seeded from MUD skills/professions where applicable.
- **items.ts** — items, equippable chassis/weapons, inventory with capacity.
- **state.ts** — `GameState` snapshot: full serializable state (schema-versioned). `serialize()`/`deserialize()` with version check and safe failure. Used by save/load and the Agent_API observation.
- **commands.ts / events.ts** — discrete serializable command and event unions (network-ready for Colyseus state sync).
- **rng.ts** — seedable PRNG (e.g., mulberry32) injected into the world for determinism.

### Render_Layer (`src/render/`, Phaser 3)

- **BootScene** — load Kenney tiles/sprites + audio; build Phaser tilemaps per room.
- **WorldScene** — draw all rooms at their solved world coordinates; draw entity sprites; run the camera. On player room change, `camera.pan()` in the travel direction (Scroll_Transition). Visited rooms stay drawn; unvisited rooms drawn under a dark fog overlay removed on first entry (Fog_Of_War). Subscribes to Core events for sprite updates; sends input as Core commands. Phaser runs the render loop; Core's `tick` is called from `update(dt)`.
- **HudScene** — integrity bar, level/XP/credits, room name, active item; scrolling event log; inventory/skills panels. Driven entirely by Core events.
- **Camera** — follows the player's current room; smooth pan on transitions; fog overlay management.

### Audio (`src/audio/`)

- Chiptune via an open-source Web Audio synth approach (e.g., a small PSG/tracker-style library or hand-rolled oscillator voices: two pulse/square leads, a triangle bass, a noise channel for percussion), so music is **generated, not ripped**.
- **theme.ts** — the original theme tune: a note/pattern sequence (our own composition) in a Sunsoft/Blaster-Master spirit — driving triangle bassline, syncopated square lead, ~130 BPM, looped. An "exploration" variant (calmer) and a "combat" variant (faster/intenser) with context-based transitions.
- **sfx.ts** — short generated blips for move/bump, hit, damage, defeat, pickup, level up.
- **AudioManager** — resume-on-first-interaction (autoplay policy), music/SFX volume (persisted), graceful no-op if disabled.

### Seed data (`src/data/`)

Transcribed from `space-mud` JSON into typed TS:
- **rooms**: the 14 rooms (name, zone, flavor) from `rooms.json`.
- **exits**: N/S/E/W links from `exits.json` → Room_Graph edges.
- **hostiles**: Corrupted Sentry (Cargo Wreck), Haywire Drone (Breached Lab), Rogue Program (Debris Drift) with integrity/processing/shielding/xp/credits/respawn/salvage from `hostiles.json`.
- **items/skills/professions**: derived from the MUD's prototypes/skills/professions where they map cleanly; placeholders documented otherwise.

### Agent_API (`src/agent/`)

- `observe(): Observation` — serializable snapshot (player stats, current room tile layout, visible/known rooms, nearby entities, legal actions).
- `act(action: Action): StepResult` — apply a discrete action (`moveN/S/E/W`, `attack`, `useSkill`, `pickup`, `wait`); returns `{ observation, events, done }`.
- Deterministic in Headless_Mode given a fixed seed; a Gym-like `reset()/step()` shape for scripted or learning agents.
- Example agents: `RandomAgent` and a simple `HeuristicAgent` (explore unvisited rooms, attack adjacent hostiles).
- A debug hook exposes the Agent_API on `window` in dev builds so an external AI can drive the live browser game.

### Multiplayer-ready seams (implemented now, networked later)

- Core holds authoritative state; render/input never mutate state directly, only via commands.
- Commands and events are serializable unions → directly mappable to Colyseus message/state-patch flow.
- `Room` is the state-partition unit → maps to a Colyseus room.
- Core supports **N player entities** even though the UI drives one, so a second player is additive.

### Determinism & testing

Injected seeded PRNG + fixed `dt` ticks make combat, AI, and spawns reproducible. Vitest covers room-graph layout (incl. conflict handling), movement/collision, fog visited-tracking, combat damage/defeat/respawn, progression math, save/load round-trip, and the Agent_API step loop — all headless (no Phaser/DOM).

### Deployment

Vite build → static `dist/`. Configured with a relative/`base` path so it hosts under a sub-path (a Robot-Game page on the `imadestuff-blog` Hugo site). Single-player ships as static files, no server. A later phase adds a Colyseus Node server for multiplayer.

---

## Assets & licensing

- **Tiles/sprites**: Kenney sci-fi/roguelike packs (CC0). Recorded in `ASSETS.md` with URLs.
- **Audio**: generated chiptune (our code) and/or CC0 chiptune tooling; **no copyrighted game audio/MIDI/NSF shipped**. Blaster Master is a *style reference only*.
- `ASSETS.md` lists every third-party asset/tool, its source URL, and its license.

## Risks / open points

- Room-graph layout conflicts (MUD exits are not guaranteed to form a clean grid — e.g., Main Corridor has two different "south"/"west" targets across the data). The layout solver must resolve deterministically and may need manual coordinate overrides for a clean map; this is handled in `roomGraph.ts` and surfaced via warnings.
- Chiptune quality in-browser depends on the synth approach; the theme is iterative and will be tuned by ear.
- WinForms is Windows-only; that track is desktop-only by design.
