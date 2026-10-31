# Design — Robot-Game v3: "Restore the Ship"

## Overview

This spec adds a **narrative arc, objectives, bosses, and depth** on top of the existing
Robot-Game web foundation. The player is a salvage robot that wakes amnesiac on a derelict
station and must restore the ship to **fly home to Earth**. Restoration means recovering **7
ship components**, each guarded by a **large-robot guardian boss** and gated behind
**key-card-locked rooms**, then installing each at its matching **install point**. With all 7
installed, a **final major boss** guards departure — winnable only with several crafted
upgrades. Beating it plays the departure ending, then drops into free-roam (hook for later
content).

Everything targets `extensions/web/` and preserves the project's rules: **Core_Logic is pure
TypeScript with no Phaser/DOM imports**, deterministic under a seed, headless-testable; the
Render_Layer only draws state and forwards input; all art is original neon-SVG generated/kept
in-style.

The prior spec `dungeon-rpg-v2` remains the foundation record and is not modified.

---

## Guiding constraints (unchanged)

- **Core/Render split.** New systems (missions, keys, bosses, vendor, dash/ranged, brains, map
  data, story) live in `src/core/` and `src/data/`. Phaser scenes only render and forward
  input as Core commands.
- **Determinism.** All randomness goes through the injected seeded `Rng`. Combat, AI, bosses,
  and drops stay reproducible for tests and the agent API.
- **Serializable state.** Every new piece of progress (missions, installed components, keys
  held, bosses defeated, logs read, chassis, vendor purchases, upgrades) is added to the save
  schema (version bump) and restored safely.
- **Art.** New sprites (bosses, vendor, key cards, install points, projectiles, map markers)
  are generated in `scripts/make_art.py` in the neon palette and loaded via `textures.ts`.

---

## New / changed Core modules

```
src/core/
  story.ts        NEW  — Story_Arc state machine: components recovered/installed, bosses
                          defeated, ending trigger; emits story events.
  missions.ts     NEW  — runtime mission tracking (objectives, completion) over the mission data.
  keys.ts         NEW  — key-card model + room-keyed lock table; door gating helper.
  boss.ts         NEW  — Boss definition + BossBrain(s): telegraphed heavy attacks, phases.
  ai.ts           EDIT — split HostileBrain into per-type brains (Sentry/Drone/Crawler/Hunter);
                          add shared helpers (strafe, charge, ambush, hold).
  combat.ts       EDIT — ranged line attack, knockback, telegraph/wind-up state; keep ICombatSystem.
  commands.ts     EDIT — add dash, rangedAttack, install, useVendor commands.
  state.ts        EDIT — wire story/missions/keys/vendor/dash/ranged/telegraph/knockback; door
                          gating in move(); chassis stat application; max-integrity upgrades.
  progression.ts  EDIT — key-card holdings; max-integrity upgrade path; vendor purchase helpers.
  room.ts         EDIT — per-room lock (required key id) and install-point marker.
  events.ts       EDIT — new events (componentRecovered, componentInstalled, missionUpdated,
                          doorLocked/unlocked, keyFound, logRead, bossTelegraph, dashed, ranged,
                          purchased, storyAdvanced, gameWon).

src/data/
  world.ts        EDIT — mark which rooms are locked (and by which key), install-point rooms,
                          boss placements, vendor room.
  missions.ts     EDIT/REPLACE — the 7 restoration missions (component, guardian, install room,
                          required key, prerequisite order).
  recipes.ts      EDIT — add max-integrity + ranged-weapon recipes; upgrades the Major_Boss
                          expects.
  chassis.ts      NEW  — the 4 chassis stat profiles (balanced-but-flavored).
  bosses.ts       NEW  — the 7 guardians + 1 major boss (stats, attacks, art, music, drops).
  logs.ts         NEW  — environmental Log_Entries keyed by room.
  story.ts        NEW  — intro text, ending text, mission flavor.
```

### Render / UI

```
src/render/
  WorldScene.ts   EDIT — door-lock visuals, boss sprites + telegraph tells, dash/ranged FX,
                          knockback tweens, install-point markers, key-card pickups.
  HudScene.ts     EDIT — mission tracker + "N/7 installed", key-card list, dash/ranged cooldowns.
  MapScene.ts     NEW  — toggleable Map_Screen from the room graph's solved coords + POI markers.
  VendorScene.ts  NEW  — shop UI (buy with credits).
  LogScene.ts     NEW  — read/collected log entries viewer.
  SelectBotScene  EDIT — show each chassis's tradeoff.
  GameWonScene.ts NEW  — departure ending; continue to free-roam.
  textures.ts     EDIT — load new art (bosses, vendor, keys, install points, projectile, markers).
```

### Audio

```
src/audio/
  theme.ts        EDIT — add a title theme, a boss theme, and a distinct Major_Boss theme
                          (same original synth; chord-progression + beat as today).
  AudioManager.ts EDIT — 'title' | 'boss' | 'majorBoss' contexts + clean transitions.
  sfx.ts          EDIT — dash, ranged fire, telegraph, key unlock, install, purchase, boss defeat.
```

---

## Key designs

### Story arc (`story.ts`)

A small state machine the world owns:
- `componentsRecovered: Set<id>`, `componentsInstalled: Set<id>`, `bossesDefeated: Set<id>`,
  `logsRead: Set<id>`, `phase: 'intro' | 'restoring' | 'finalBoss' | 'departed' | 'freeRoam'`.
- Transitions emit events (`componentInstalled`, `storyAdvanced`, `gameWon`). The Major_Boss
  spawns/activates only when all 7 components are installed. Beating it → `departed` → ending →
  `freeRoam`. All fields serialized.

### Missions (`data/missions.ts` + `core/missions.ts`)

Seven missions, each: `{ id, name, componentId, guardianBossId, installRoomKey, requiredKey? }`.
Runtime tracking marks a mission `active/complete`. The HUD reads the active objective and the
"installed N/7" tally. Order is flexible except where a `requiredKey` forces sequencing; the
key dependency graph is validated at construction and logged.

### Key cards and locked doors (`keys.ts`, `room.ts`, `state.ts`)

- Each lockable **room** carries `requiredKey?: string` (data in `world.ts`). A door into that
  room is locked iff the destination room has a `requiredKey` the player lacks — so **all doors
  into the same room share one key** by construction (the lock is a property of the room, not
  the door).
- `move()`/`transition()` consult the lock before allowing passage: no card → blocked + "needs
  X card" event; has card → passes and the room is flagged opened.
- Key cards are found items (`keycard` item kind) shown in the inventory. A build-time check
  asserts each key's room is reachable without that key (solvable), logging the dependency
  order.

### Bosses (`boss.ts`, `data/bosses.ts`, `ai.ts`)

- Guardians are entities with a `BossBrain`: pursue in-room, periodically **telegraph** a heavy
  attack (wind-up ticks with a `bossTelegraph` event + SFX), then strike with knockback; higher
  integrity; no respawn; drop the Ship_Component on defeat.
- The Major_Boss adds **phases** (e.g. speeds up / new attack under 50% integrity) and is tuned
  so base stats + no upgrades ≈ unwinnable; several crafted upgrades ≈ winnable. Boss math uses
  the same `ICombatSystem` + seeded RNG.
- Boss rooms set the audio context to `boss` (Major_Boss → `majorBoss`).

### Combat depth (`combat.ts`, `commands.ts`, `state.ts`)

- **Dash**: a `dash` command moves the player up to N tiles in the facing direction (stopping
  at walls/blocked), with a cooldown and brief i-frames (a `dashInvulnMs` on the player that
  the combat system checks before applying damage).
- **Ranged**: a `rangedAttack` command (enabled once the ranged weapon is crafted) resolves a
  line from the player in the facing direction, hitting the first entity; damage via
  `computeDamage` + bell curve.
- **Telegraph**: entities gain an optional `windupMs`/`pendingAttack`; the combat/AI tick counts
  it down and only lands the hit at zero, emitting a telegraph event at the start so the render
  layer shows a tell and the player can dash out.
- **Knockback**: on heavy hits, push the target one tile away if free. Pure Core; render tweens
  the sprite to the new tile.

### Enemy brains (`ai.ts`)

Split today's single `HostileBrain` into: `SentryBrain` (holds ground, attacks in range),
`DroneBrain` (keeps distance / strafes), `CrawlerBrain` (ambush: idle then burst when the player
is close), `HunterBrain` (charges in straight lines). A `brainFor(enemyType)` factory maps type
→ brain. All pure and deterministic.

### Vendor (`VendorScene.ts`, `state.ts`, `progression.ts`)

One vendor room (data flag in `world.ts`). Interacting opens `VendorScene` with a credits-only
stock (materials, repairs, maybe a recipe or consumable). Purchases deduct credits via Core
(`buy(goodId)` validates affordability, grants the good). Distinct from the material-based
Fabricator.

### Chassis (`data/chassis.ts`, `SelectBotScene`, `state.ts`)

Four profiles with tradeoffs, e.g.:
- **Barrel** — high max integrity, higher attack, slower move/dash cooldown.
- **Spindle** — fast move/short dash cooldown, low max integrity.
- **Tread** — high shielding, average speed.
- **Dome** — balanced baseline.
Stats are data; applied at new-game start; shown on the select screen; saved.

### Map screen (`MapScene.ts`)

Reads `RoomGraph` solved `(gridX, gridY)`; draws visited rooms as cells with exits, the current
room highlighted, and POI icons (install points, vendor, locked doors) for known rooms. Toggled
with a key; respects fog (unvisited rooms shown as unknown).

### Max-integrity upgrades (`recipes.ts`, `progression.ts`)

Add crafted/found upgrades that raise `maxIntegrity` (the `maxIntegrity` recipe effect already
exists — extend with a found variant and a Vendor path), so the Major_Boss's difficulty curve
has a clear answer.

---

## Save/versioning

Bump `SAVE_VERSION`. Add: story phase + sets (recovered/installed/bossesDefeated/logsRead),
mission states, keys held, chassis id (already saved), vendor purchase effects (folded into
existing stat/inventory persistence), dash/ranged unlock flags. Keep the "reject
incompatible/corrupt → start fresh" behavior.

---

## Testing

Headless Vitest for: key-card gating (incl. solvability), mission recover→install flow, story
arc transitions + win condition, dash movement/i-frames, ranged line resolution, telegraph
wind-up timing, knockback, each enemy brain's signature behavior, boss defeat/no-respawn/drop,
Major_Boss gating, vendor purchase math, chassis stat application, map data derivation, log
read tracking, and save round-trip of all new state. Determinism preserved under fixed seeds.

---

## Deployment (last)

Only after everything above: `npm run build` → copy `dist/` into
`imadestuff-blog/static/robot-game/` → Hugo build folds it into `public/` → existing
`deploy.sh` (S3 `--delete` sync + CloudFront invalidation) publishes it. Add a play page
(link/iframe) and a small helper to refresh `static/robot-game/` from a fresh build.

---

## Risks / notes

- **Key-card solvability** on a non-planar MUD graph: validate at build and keep gating simple
  (room-keyed) so the dependency order is always satisfiable from the start room.
- **Major_Boss tuning**: needs playtesting; keep its stats and the required-upgrade math in data
  so balance is one edit.
- **Scope**: 7 guardians + 1 major boss + vendor + map + story is a lot of content; art is
  generated in-style to keep authoring cheap. Multiplayer stays out of scope.
