# Implementation Plan — Robot-Game (CSharpRPG v2)

Tasks are grouped by phase. Each phase leaves its deliverable buildable and runnable. Check off tasks as completed.

## Phase 1 — .NET 8 WinForms Port (`extensions/csharp-winforms/`)

- [x] 1. Scaffold the solution: `RobotGame.Core` (`net8.0`, Nullable on), `RobotGame.WinForms` (`net8.0-windows`, `UseWindowsForms`), `RobotGame.Tests` (xUnit); solution file; `dotnet build` succeeds empty. (Req 2.1, 2.5)
- [x] 2. Port Core domain to `RobotGame.Core`, logic only, no WinForms: `ISymbol`, `Wall`, `Floor`, `Door`, `LockedDoor`, `Treasure`; `Item`, `Weapon` (was `SimpleWeapon`); `Character` + `Player`/`Ant`/`Cthulhu`; `Map`. Modern C#, no dead code, XML docs. (Req 2.6, 2.7, 17.1)
- [x] 3. Replace the static attack event with an instance event stream on a new `GameWorld`; move map/characters/enemy roster into `GameWorld`; implement movement, combat, pickup, death as in-memory operations (no DB). Fix the null-cell movement bug. (Req 2.4, 2.6, 2.9, 17.1)
- [x] 4. Add `SeedData`: dungeon rooms/halls, locked door + key, treasure placements (from the original commented block), player start + starting inventory, and the Ant/Cthulhu roster. No database types anywhere. (Req 2.4, 3)
- [x] 5. Build `RobotGame.WinForms`: `Program`, `GameForm` (tile render via `FireBox`, arrow-key movement, enemy timer), `StatsForm` (HP/bar/inventory/equip/unequip/drop), `LogForm` (events + clear). Wire to `GameWorld` events. UI-side `TileSet` + `FireBox` image slicing. (Req 2.6, 2.8)
- [x] 6. Add `tiles32.png` as Content copied to output; load relative to `AppContext.BaseDirectory`. Confirm the dungeon renders. (Req 2.5)
- [x] 7. Write xUnit tests: map construction, position validity, symbol entry rules, combat math, movement-bug fix. `dotnet test` green. (Req 15.1)
- [x] 8. Verify end to end: build + run launches (window title confirmed), world builds from seed data with no database, 30/30 Core tests pass. (Req 2.2, 2.3)

## Phase 2 — Web Game Foundation (`extensions/web/`)

- [x] 9. Scaffold Vite + TypeScript + Phaser 3 project: `package.json` (dev/build/test/preview), strict `tsconfig`, ESLint + Prettier, `index.html`, Vitest. `npm run dev` serves Phaser canvas on localhost (HTTP 200 verified); `npm run build` emits static `dist/`. Project lives at the `#`-free path `My Drive\Programming\Robot-Game\web`. (Req 3.1, 3.2, 3.3, 17.2)
- [x] 10. Acquire Kenney CC0 sci-fi tiles/sprites into `public/assets/`; create `ASSETS.md` with sources/licenses. Define needed tile/sprite types (floor, walls, corners, doors, player robot, 3 hostiles, items/decor). (Req 9) — ASSETS.md documents the CC0 Kenney pack + a runtime-generated placeholder strategy (`src/render/textures.ts`) so gameplay builds before the manual art drop-in; tile/sprite roles defined.
- [x] 11. Transcribe `space-mud` seed data into typed TS (`src/data/`): rooms (14), exits (N/S/E/W), hostiles (3 with stats/rewards), items/skills/professions where they map. (Req 4.3, 7.6)
- [x] 12. Core_Logic foundations (no Phaser/DOM): `rng.ts` (seeded PRNG), `room.ts`, `roomGraph.ts` with the deterministic layout solver + conflict handling, `entity.ts`, `stats.ts`, `state.ts` skeleton, `commands.ts`/`events.ts`. (Req 3.4, 4, 13.1, 13.2, 13.3)
- [x] 13. Render_Layer: `BootScene` (load assets, build per-room tilemaps), `WorldScene` (draw rooms at solved coords, player sprite, tile-grid movement with wall collision via Core commands). (Req 4.1, 4.4, 5.1)
- [x] 14. Scroll_Transition + Fog_Of_War: camera pans in travel direction on room change; visited rooms stay drawn; unvisited rooms dark until entered; spatially consistent directions. (Req 5.2, 5.3, 5.4, 5.5)
- [x] 15. Vitest for room-graph layout (incl. conflict resolution), movement/collision, and fog visited-tracking — headless. 16/16 tests green. (Req 15.2, 15.3)

## Phase 3 — Combat, Progression, HUD, Open-Ended Play

- [x] 16. `combat.ts` behind `ICombatSystem`: real-time per-entity attack cooldowns; player attack action; damage from `stats.ts`; hit/defeat/reward events; deterministic under fixed seed/dt. (Req 6.1, 6.4, 6.5, 6.8, 7.2)
- [x] 17. `ai.ts` `Brain`/`HostileBrain`: pursue player in-room within aggro range, attack when adjacent, wander otherwise; hostiles hit back. Pluggable. (Req 6.2, 6.3)
- [x] 18. Defeat/reward/respawn: XP + credits + salvage on hostile defeat, respawn after delay; player defeat → respawn at safe room with penalty (configurable, in `WorldConfig`). (Req 6.6, 6.7)
- [x] 19. `progression.ts`: XP→level thresholds, credits wallet, salvage→inventory, skills (activatable), professions (unlock lvl 3 w/ chassis). Hostiles seeded into their MUD rooms by `WorldState`. (Req 7.1, 7.3, 7.4, 7.5, 7.6)
- [x] 20. `HudScene`: integrity bar, level/XP/credits, room name, scrolling event log — driven by Core events. (Inventory/skills panel views deferred to the save/load + items pass.) (Req 11)
- [x] 21. Open-ended play: no win/lose gate; optional non-mandatory missions in `src/data/missions.ts`. Game feel: hit flash / floating damage numbers / screen shake, toggleable (G key, persisted in `src/render/settings.ts`). (Req 8, 14.7)
- [x] 22. Vitest: combat damage/defeat/respawn (`combat.test.ts`, `worldCombat.test.ts`), progression math (`progression.test.ts`). 30/30 tests green. (Req 15.2)

## Phase 4 — Save/Load, Agent API, Audio

- [x] 23. Save/load: versioned `serialize`/`deserialize` in `src/core/save.ts`; localStorage adapter `src/render/persistence.ts` (O save / P load, auto-resume on boot); safe recovery from corrupt/incompatible saves (clears bad slot). (Req 10)
- [x] 24. Agent_API (`src/agent/`): `observe()`/`act()`/`reset()`/`step()` headless + deterministic; `RandomAgent` and `HeuristicAgent`; dev `window.robotAgent` debug hook to drive the live game. (Req 12)
- [x] 25. Audio (`src/audio/`): PSG synth voices (`synth.ts`); **original** theme (`theme.ts`, 128/148 BPM, Sunsoft spirit) with exploration/combat variants + context transitions; 8-bit SFX (`sfx.ts`: move/hit/damage/defeat/pickup/levelup); `AudioManager` with autoplay-resume (first keypress), M-key mute, persisted music/SFX volume, graceful degrade. No copyrighted audio. Verified in-browser: AudioContext runs, SFX/music fire on events. (Req 14)
- [x] 26. Vitest: save/load round-trip + corrupt-save recovery (`save.test.ts`), Agent_API step loop + determinism (`agent.test.ts`). 41/41 tests green. (Req 15.2)

## Phase 5 — Deployment & Docs

- [x] 27. Vite `base: './'` configured for sub-path hosting; `dist/` builds; README documents embedding Robot-Game as a page on the `imadestuff-blog` Hugo site (copy `dist/` to `static/robot-game/`, link or iframe). (Req 16)
- [x] 28. Root `README.md` (modeling-motion style): frames original / WinForms port / web game; structure diagram; run/build/test; controls; theme + `space-mud` relationship; improvements; known limitations; Agent_API example. (Req 18.1, 18.2, 18.3)
- [x] 29. Obsidian project note `Projects/Robot-Game.md` created with frontmatter (tags, status, code path, github) matching `modeling-motion.md`. (Req 18.4)
- [x] 30. Git repo initialized on `main`; root `.gitignore` (bin/obj/node_modules/dist/editor/OS/playwright); initial commit `e3dd756`, 388 files, clean tree. (Req 16.1)

## Phase 6 — Multiplayer (later)

- [ ] 31. Add Colyseus server (Node/TS): room-per-`Room` authoritative state, command intake, state-patch sync; migrate client to networked state; keep single-player path working. (Req 13 implementation)

## Consolidation / Housekeeping (do not forget)

- [x] C1. **Consolidated under one `#`-free root `Robot-Game`.** The workspace is now `C:\Users\profe\OneDrive\Desktop\Robot-Game` (no `#`), with `original/`, `extensions/csharp-winforms/`, `extensions/web/`, and `.kiro/` all under it; the web game builds/dev-serves from `extensions/web/`. Path references in `.kiro/steering/user-context.md` and `.kiro/specs/dungeon-rpg-v2/design.md` updated to the new root.
