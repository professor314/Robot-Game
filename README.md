# Robot-Game

A tile-based dungeon RPG, preserved from 2014 and rebuilt twice. The project keeps the
original coursework intact and grows two modern rewrites beside it — mirroring the
`modeling-motion` / Physics-Modeling pattern of *preserve the original, build the best-fit
modern version*.

Three tracks live side by side:

| Track | Path | What it is |
|---|---|---|
| **Original** | `original/` | The 2014 C# WinForms game (.NET Framework 3.5), preserved exactly as submitted. |
| **WinForms port** | `extensions/csharp-winforms/` | A faithful .NET 8 WinForms port with the database removed — the original lineage, runnable on a modern machine. |
| **Web game** | `extensions/web/` | The souped-up rewrite: TypeScript + Phaser 3, sci-fi themed, with a full **"Restore the Ship"** story arc — 7 component missions, 8 bosses, key cards, dash/ranged combat, a vendor, a station map, logs, flavored chassis, progression, save/load, original audio, and an AI agent API. |

The two rewrites deliberately share no code (different languages, different platforms). What
they share is *lineage*: the web game inherits the original's tile-room idea and the author's
Evennia **space MUD** (`space-mud`) world and combat model.

## Why the original can't run as-is

The 2014 game depended on a SQL Server `.mdf` database (via typed DataSets) for its inventory,
items, and creatures. That database file is missing from the preserved copy, so the original
crashes on startup, and its .NET Framework 3.5 + Visual Studio 2010 toolchain is long gone.
The WinForms port fixes this by removing the database entirely and defining the dungeon,
treasure, inventory, and enemy roster as in-code seed data.

## Structure

```
Robot-Game/
├── original/                      # 2014 .NET Framework 3.5 WinForms game (untouched)
├── extensions/
│   ├── csharp-winforms/           # .NET 8 WinForms port
│   │   ├── RobotGame.Core/        # UI-independent game logic
│   │   ├── RobotGame.WinForms/    # WinForms executable
│   │   └── RobotGame.Tests/       # xUnit tests
│   └── web/                       # Phaser 3 + TypeScript web game
│       ├── src/core/              # Core_Logic: plain TS, no Phaser/DOM
│       ├── src/render/            # Phaser scenes, HUD, persistence, settings
│       ├── src/audio/             # chiptune synth, theme, SFX, AudioManager
│       ├── src/agent/             # Agent_API + example agents + debug hook
│       ├── src/data/              # seed data (missions, bosses, chassis, logs, vendor, world)
│       ├── public/assets/art/     # original neon-robot SVG art (see ASSETS.md)
│       └── tests/                 # Vitest headless Core tests
├── .kiro/specs/dungeon-rpg-v2/    # foundation spec: requirements, design, tasks
├── .kiro/specs/robot-game-v3/     # "Restore the Ship" spec: requirements, design, tasks
└── README.md
```

## Running

### Web game (`extensions/web/`)

```bash
cd extensions/web
npm install
npm run dev      # play at http://localhost:5173
npm run build    # static build to dist/
npm run preview  # serve the production build
npm test         # headless Vitest Core tests
npm run lint     # ESLint
```

### WinForms port (`extensions/csharp-winforms/`)

```bash
cd extensions/csharp-winforms
dotnet build
dotnet run --project RobotGame.WinForms
dotnet test      # xUnit tests over RobotGame.Core
```

> WinForms is Windows-only; that track targets `net8.0-windows` by design.

## Controls (web game)

| Input | Action |
|---|---|
| Arrow keys / WASD | Move one tile (through doors to scroll to the next room) |
| Space / F | Attack an adjacent hostile |
| Shift | Dash (i-frames, cooldown) |
| R | Ranged attack (once a ranged weapon is crafted) |
| B | Use a crafted Repair Cell (heal mid-fight) |
| E | Interact: mine / repair / install a component / read a log |
| Q / Z | Overclock / Nanite Repair |
| I / C | Inventory / Crafting panel |
| T / L | Station map / Data logs |
| V | Vendor (in the vendor room) |
| O / P | Save / load |
| M | Mute / unmute audio |
| G | Toggle game-feel (hit flash, damage numbers, screen shake) |

See `PLAYING.md` for the full player's guide. Audio starts on the first key press (browser
autoplay policy); the music shifts between title, exploration, combat, and boss themes.

## Theme & relationship to `space-mud`

The web game is sci-fi themed to match the author's Evennia space MUD. Its 14 rooms (two
zones), their N/S/E/W exits, and its three hostiles — Corrupted Sentry, Haywire Drone, Rogue
Program — are transcribed from the MUD's world data (`src/data/world.ts`). The MUD's stat
model carries over directly: **integrity** (health), **processing** (attack output), and
**shielding** (damage reduction), with XP, credits, salvage, levels, skills, and professions.
Rooms are rendered as explorable 2D tile areas rather than text, with fog of war and a
scrolling camera that keeps visited rooms on screen.

All art is **original**, authored for this project in the imadestuff.com neon-on-dark robot
style (SVGs in `public/assets/art/`, regenerated via `scripts/make_art.py`). Music and SFX are
also **original** 8-bit chiptune generated at runtime via the Web Audio API, composed in the
*style* of late-1980s Sunsoft NES soundtracks — no copyrighted art, audio, MIDI, or NSF data is
included. See `extensions/web/ASSETS.md` for every asset and its license.

## Agent API

The web game exposes a headless, deterministic interface over its Core logic so a script or AI
can play it. It follows a Gym-style `reset()` / `step()` loop.

```ts
import { AgentApi } from './src/agent/api';
import { HeuristicAgent } from './src/agent/agents';

const api = new AgentApi({ seed: 42 });
const agent = new HeuristicAgent();

let obs = api.observe();           // serializable snapshot: player, room tiles, nearby entities, legal actions
for (let i = 0; i < 1000; i++) {
  const { observation, events, done } = api.step(agent.decide(obs));
  obs = observation;               // events is the Core event stream for this step; done is always false (open-ended)
}
```

Given the same seed and action sequence, a run is reproducible. Two example agents ship:
`RandomAgent` (seeded random legal action) and `HeuristicAgent` (attack adjacent hostiles,
else pursue, else explore). In a dev build, `window.robotAgent` lets an external script drive
the *live* on-screen game through the same Core commands.

### Winnability guard

`src/agent/` also contains a goal-directed `PlannerAgent` (with room-graph + in-room
pathfinding and a data-derived objective map) that plays the game to completion. It is wired
into a regression guard so a change to the game data/mechanics can't silently make the game
impossible to finish:

```bash
npm run beat     # runs tests/winnability.test.ts (pathfinding + "the game is still beatable")
```

See `src/agent/README.md` for details.

## Deploying as a page on the blog

The build is configured with `base: './'` (relative asset paths) so it can be hosted under a
sub-path. It is deployed live as a page on the `imadestuff-blog` Hugo site at
**https://imadestuff.com/play/robot-game/** (embedded in an iframe), with the game bundle living
in the blog's `static/robot-game/`.

To ship a game update to the site: build + test here, then from the blog repo run
`./refresh-robot-game.sh` (rebuilds the game and refreshes `static/robot-game/`), then the
blog's `./deploy.sh`. The blog's deploy uses `aws s3 sync --delete`, so the live game survives
only because it lives in `static/robot-game/`; the full workflow and that caveat are documented
in the blog's steering doc (`.kiro-webpage/steering/imadestuff-blog.md`).

## Improvements over the original

- Database dependency removed; the game runs from in-code seed data with no startup crash.
- Fixed the original movement bug where stepping into a null cell left the player in place.
- Core game logic separated from the UI in both rewrites, making it unit-testable headlessly.
- The web game adds scrolling room-to-room exploration, fog of war, real-time combat with AI,
  the MUD's progression model, save/load, original chiptune audio, and an AI agent API.
- v3 ("Restore the Ship") layers on a full story arc with a win condition: 7 component-recovery
  missions, 8 bosses (7 guardians + 1 major), key-card-gated rooms, dash and ranged combat with
  telegraphs and knockback, a credits vendor, a station map, discoverable logs, and four
  balanced-but-flavored chassis.
- A self-play `PlannerAgent` + winnability test prove the game remains beatable end-to-end
  (`npm run beat`), guarding against changes that would make it impossible to finish.

## Known limitations

- The original game is not runnable as-is (missing SQL Server `.mdf`, dead toolchain); it is
  preserved for reference only.
- The WinForms port is Windows-only.
- Multiplayer is deferred: the web game's Core is architected for it (authoritative state,
  serializable commands/events, room-as-state-partition), but the Colyseus server is a later
  phase.
- The expansion art set in `public/assets/art/` (bosses, components, new enemies, second biome,
  pickups, weapon/status/UI icons) is authored ahead of the mechanics and not yet all wired into
  the game — see `ASSETS.md`.
```
