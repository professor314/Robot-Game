# Implementation Plan — Robot-Game v3: "Restore the Ship"

Builds on the `dungeon-rpg-v2` foundation; all work in `extensions/web/`. Ordered so each phase
leaves the game buildable, tested, and playable. Deployment is intentionally last. Check tasks
off as completed.

## Phase 1 — Story & Objective Backbone

- [x] 1. `src/core/story.ts`: Story_Arc state (phase, components recovered/installed, bosses defeated, logs read) with transitions + events; wire into `WorldState`; serialize in save (bump `SAVE_VERSION`). (Req 1.2, 1.3, 13.4)
- [x] 2. `src/data/story.ts`: intro framing text, mission flavor, ending text (wake-up → restore → fly home to Earth). Non-blocking intro overlay shown on new game. (Req 1.1)
- [x] 3. `src/data/missions.ts` (replace stub) + `src/core/missions.ts`: the 7 restoration missions — `{ id, name, componentId, guardianBossId, installRoomKey, requiredKey? }` — with runtime active/complete tracking. (Req 2.1, 2.2)
- [x] 4. Install points: mark the 7 install rooms in `world.ts`; `install` command + Core handling (consume recovered component, mark mission complete, advance story, emit events). (Req 2.3, 2.4)
- [x] 5. HUD mission tracker: active objective + "N/7 components installed" in `HudScene`. (Req 2.5)
- [x] 6. Vitest: mission recover→install flow, story-arc transitions, 7/7 → finalBoss phase, save round-trip of story/mission state. (Req 13.1)

## Phase 2 — Key Cards & Locked Doors

- [x] 7. `src/core/keys.ts` + `room.ts`: room-keyed locks (`requiredKey` on the destination room so all doors into a room share one key); `keycard` item kind + inventory holding. (Req 3.1, 3.2, 3.5)
- [x] 8. Gate `move()`/`transition()` in `state.ts`: block locked rooms without the card (emit "needs X"), open on contact with the card, mark opened. (Req 3.3, 3.4)
- [x] 9. Place locks + key-card pickups in `world.ts`; build-time solvability check (no key gates its own room) with a deterministic dependency-order log. (Req 3.6)
- [x] 10. Render + HUD: locked-door visual, key-card pickup art, key-card list in inventory. New key-card SVG via `make_art.py`. (Req 3.5, 13.3)
- [x] 11. Vitest: locked-door blocking/opening, room-keyed multi-entrance consistency, solvability of the key graph. (Req 13.1)

## Phase 3 — Combat Depth & Enemy Variety

- [x] 12. `combat.ts`/`commands.ts`: `dash` (multi-tile move in facing, i-frames, cooldown) wired to a key; blocked by walls/occupancy. (Req 6.1, 6.2)
- [x] 13. Ranged attack: `rangedAttack` command (enabled by a crafted ranged weapon) resolving a line hit via `ICombatSystem` + bell curve; projectile FX. (Req 6.3)
- [x] 14. Telegraph + knockback: `windupMs`/pending-attack in combat tick (emit telegraph event at wind-up start, land at zero); knockback pushes a struck entity one free tile. (Req 6.4, 6.5, 6.6)
- [x] 15. `ai.ts`: split into `SentryBrain`/`DroneBrain`/`CrawlerBrain`/`HunterBrain` + `brainFor(type)`; assign per enemy type. (Req 7.1, 7.2, 7.3)
- [x] 16. Render/SFX for dash, ranged fire, telegraph tell, knockback; HUD cooldowns for dash/ranged. (Req 6, 11.4)
- [x] 17. Vitest: dash movement + i-frames, ranged line resolution, telegraph timing, knockback, each brain's signature behavior — all deterministic. (Req 13.1)

## Phase 4 — Bosses

- [x] 18. `src/core/boss.ts` + `src/data/bosses.ts`: Boss definitions (stats/attacks/art/music/drop) and `BossBrain` (pursue, telegraphed heavy attacks, knockback); large-robot art via `make_art.py`. (Req 4.1, 4.5, 13.3)
- [x] 19. 7 Guardian_Bosses: place one per mission; drop the Ship_Component on defeat; no respawn. Gate each behind its key/region as designed. (Req 4.2)
- [x] 20. Major_Boss: spawns/activates only when 7/7 installed; phase behavior; tuned (data) to require multiple crafted upgrades. Defeat → `departed`. (Req 4.3, 4.4)
- [x] 21. Boss rooms set `boss` audio context; Major_Boss uses its own `majorBoss` theme (see Phase 6). (Req 4.6)
- [x] 22. Vitest: guardian defeat → component drop + no respawn, Major_Boss gating (locked until 7/7), phase transition, boss determinism. (Req 13.1)

## Phase 5 — Economy, Chassis, Max-Health Upgrades

- [x] 23. `src/data/chassis.ts` + `SelectBotScene`/`state.ts`: 4 balanced-but-flavored chassis stat profiles (speed/maxIntegrity/attack/shielding), applied at new-game start, shown on select screen, saved. (Req 9)
- [x] 24. Max-integrity upgrades: found + crafted + vendor paths that raise max integrity (extend `recipes.ts`/`progression.ts`). (Req 8.3)
- [x] 25. Vendor: single vendor room (`world.ts` flag) + `VendorScene` + Core `buy` (credits-only, affordability check, grant good). Distinct from material Fabricator. (Req 8.1, 8.2, 8.4, 8.5)
- [x] 26. Vitest: chassis stat application, vendor purchase math (afford/deduct/grant), max-integrity upgrade effects. (Req 13.1)

## Phase 6 — Environmental Story, Map, Audio

- [x] 27. `src/data/logs.ts` + `src/core` tracking + `LogScene`: discoverable Log_Entries per room (themed), read-tracking persisted, re-readable logs view. (Req 5)
- [x] 28. `MapScene`: toggleable minimap from `RoomGraph` solved coords — visited rooms, current room, POI markers (install points, vendor, locked doors), fog-respecting. Marker art via `make_art.py`. (Req 10)
- [x] 29. Audio: title/pick-your-bot theme, boss theme, distinct Major_Boss theme (original synth); `AudioManager` contexts `title`/`boss`/`majorBoss` with clean transitions; SFX for dash/ranged/telegraph/unlock/install/purchase/boss-defeat. (Req 11)
- [x] 30. Vitest: log read-tracking + save round-trip; map data derivation from the room graph. (Req 13.1)

## Phase 7 — Ending, Agent API, Full Verification

- [x] 31. `GameWonScene` + ending flow: all 7 installed + Major_Boss defeated → departure ending → free-roam continue; structured for post-departure content. (Req 1.4, 1.5)
- [x] 32. Agent_API: expose new actions (dash, ranged, install, use key/door, vendor) + story/mission + POI in the observation; update example agent; keep the step loop deterministic; refresh the dev `window.robotAgent` hook. (Req 12)
- [x] 33. Full pass: build + lint clean, whole Vitest suite green; update `PLAYING.md` (new controls, missions, keys, bosses, vendor, map, chassis) and `ASSETS.md` (new art). (Req 13.2, 13.3)

## Phase 8 — Deployment (LAST)

- [x] 34. Build the web game; copy `dist/` into `imadestuff-blog/static/robot-game/`; add a small refresh helper so rebuilds are one command. (Req 14.1, 14.3)
- [x] 35. Add a play page on the Hugo site (link + iframe embed) and link it from the existing Robot-Game post. (Req 14.2)
- [x] 36. Deploy (S3 `--delete` sync + CloudFront invalidation); verify the game loads at its URL and the blog is intact. (Req 14.1, 14.3)

## Notes / carry-overs

- Keep the long-deferred **multiplayer (Colyseus)** out of this spec.
- Preserve Core/Render split, determinism under seed, and the neon-SVG art style throughout.
- Bosses: **7 guardians (one per ship component) + 1 major boss** = 8 total; the major boss is
  balanced to be very hard without several crafted upgrades (weapon, armor, max integrity).

### Shipping a game change to the live website

The playable game at `https://imadestuff.com/play/robot-game/` is a **built copy** hosted from a
separate repo (`imadestuff-blog`). Pushing THIS repo does NOT update the website. To update the
live game: (1) build + test + push here, (2) in the blog repo run `./refresh-robot-game.sh` to
rebuild and refresh `imadestuff-blog/static/robot-game/`, (3) run the blog's `./deploy.sh`,
(4) commit the blog repo. The blog's deploy uses `aws s3 sync --delete`, so the game survives
only because it lives in the blog's `static/robot-game/` (which Hugo copies into `public/`).
Full details are in the blog's steering doc: `.kiro-webpage/steering/imadestuff-blog.md`.
