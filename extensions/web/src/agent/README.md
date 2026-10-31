# Agent layer

Headless, deterministic ways to drive the Core game (no Phaser/DOM). Two things live here:
the Gym-style agent API for scripted/learning agents, and a goal-directed planner used as a
**winnability guard**.

## Winnability guard (the important one)

`PlannerAgent` plays a full game to completion. `selfplay.ts` loops it and reports whether it
won. The point: prove the game is still beatable end-to-end, so a change to the game data or
mechanics can't silently make it impossible to finish.

Run it:

```bash
npm run beat        # just the winnability + pathfinding tests (fast)
npm test            # the whole suite, which includes them
```

`tests/winnability.test.ts` asserts the planner beats a known-good seed and that the game is
beatable across a range of seeds. If someone rebalances a boss, relocates a key, or breaks a
room connection such that the game can't be finished, these tests fail.

Programmatic use:

```ts
import { playOnce, playUntilWin } from './selfplay';

playOnce({ seed: 1, botId: 'barrel' });          // one full attempt -> RunResult
playUntilWin([1, 2, 3, 4, 5]);                   // first win across seeds -> summary
```

### How the planner works

Each step it recomputes a plan from the live world and takes one concrete action:

1. survive (retreat/heal when low; dash out of boss telegraphs)
2. if the major boss is active, go to its room and fight it
3. install any recovered-but-not-installed component at its socket
4. fight the next reachable guardian it estimates it can beat (easiest first)
5. prepare: grab recipe chips, mine, craft upgrades, buy max-HP from the vendor, farm XP
6. fetch a needed key card; else explore

It is **not optimal** and does not win every seed. It only has to reliably win *some* seed so
the guard can assert beatability. A loop-detector injects a short random-walk burst to escape
local traps.

### Pieces

- `pathfind.ts` — BFS over the room graph, respecting key-card locks (`ROOM_LOCKS`).
- `tilepath.ts` — BFS over a room's walkable tiles (routes around walls/props/hostiles).
- `worldmap.ts` — a data-derived objective map (bosses, components, sockets, keys, vendor) built
  from the live world, so it tracks game changes automatically.
- `planner.ts` — the goal-directed agent.
- `selfplay.ts` — the run loop + result/summary types.

## Agent API (scripted/learning)

`api.ts` (`AgentApi`) is a `reset()`/`step()` loop with a serializable `Observation` and a
discrete `Action` set. `agents.ts` has `RandomAgent` and `HeuristicAgent` baselines. `debugHook.ts`
exposes `window.robotAgent` in dev builds to drive the live on-screen game.
