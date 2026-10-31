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
| **Web game** | `extensions/web/` | The souped-up rewrite: TypeScript + Phaser 3, sci-fi themed, scrolling room-to-room exploration, real-time combat, progression, save/load, audio, and an AI agent API. |

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
│       ├── src/data/              # seed data derived from space-mud
│       ├── public/assets/kenney/  # Kenney CC0 sci-fi art (see ASSETS.md)
│       └── tests/                 # Vitest headless Core tests
├── .kiro/specs/dungeon-rpg-v2/    # requirements, design, tasks
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
| O / P | Save / load |
| M | Mute / unmute audio |
| G | Toggle game-feel (hit flash, damage numbers, screen shake) |

Audio starts on the first key press (browser autoplay policy). Music shifts to a combat
variant when a hostile shares your room.

## Theme & relationship to `space-mud`

The web game is sci-fi themed to match the author's Evennia space MUD. Its 14 rooms (two
zones), their N/S/E/W exits, and its three hostiles — Corrupted Sentry, Haywire Drone, Rogue
Program — are transcribed from the MUD's world data (`src/data/world.ts`). The MUD's stat
model carries over directly: **integrity** (health), **processing** (attack output), and
**shielding** (damage reduction), with XP, credits, salvage, levels, skills, and professions.
Rooms are rendered as explorable 2D tile areas rather than text, with fog of war and a
scrolling camera that keeps visited rooms on screen.

Art is the **Kenney "Sci-Fi RTS"** pack (CC0, public domain). Music and SFX are **original**
8-bit chiptune generated at runtime via the Web Audio API, composed in the *style* of
late-1980s Sunsoft NES soundtracks — no copyrighted audio, MIDI, or NSF data is included. See
`extensions/web/ASSETS.md` for every asset and its license.

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

## Deploying as a page on the blog

The build is configured with `base: './'` (relative asset paths) so it can be hosted under a
sub-path, not just a site root. To embed it as a page on the `imadestuff-blog` Hugo site:

1. `cd extensions/web && npm run build` to produce `dist/`.
2. Copy the contents of `dist/` into the Hugo site's `static/` under a sub-path, e.g.
   `static/robot-game/`.
3. Add a page that points at it — either link to `/robot-game/index.html` directly, or embed
   it in a page with an `<iframe src="/robot-game/" ...>`.
4. Because `base` is relative, the game loads correctly from `/robot-game/` without further
   config. Single-player ships as static files with no server-side runtime.

## Improvements over the original

- Database dependency removed; the game runs from in-code seed data with no startup crash.
- Fixed the original movement bug where stepping into a null cell left the player in place.
- Core game logic separated from the UI in both rewrites, making it unit-testable headlessly.
- The web game adds scrolling room-to-room exploration, fog of war, real-time combat with AI,
  the MUD's progression model, save/load, original chiptune audio, and an AI agent API.

## Known limitations

- The original game is not runnable as-is (missing SQL Server `.mdf`, dead toolchain); it is
  preserved for reference only.
- The WinForms port is Windows-only.
- Multiplayer is deferred: the web game's Core is architected for it (authoritative state,
  serializable commands/events, room-as-state-partition), but the Colyseus server is a later
  phase.
- Inventory/skills *panel views* in the web HUD are minimal; the underlying progression systems
  are complete.
```
