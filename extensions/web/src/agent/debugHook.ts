import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { WorldState } from '../core/state';
import { HeuristicAgent, RandomAgent } from './agents';
import { Action } from './api';

/** The shape exposed on `window.robotAgent` in dev builds. */
export interface DebugAgentHook {
  /** The live world state (read observations, inspect entities). */
  world: () => WorldState | null;
  /** Apply a single action to the live game. */
  act: (action: Action) => void;
  /** Run a built-in agent for N steps against the live game (one action per interval tick). */
  run: (which: 'random' | 'heuristic', steps: number) => void;
  /** Stop a running agent loop. */
  stop: () => void;
}

/**
 * Installs a dev-only debug hook on `window.robotAgent` so an external script (or the console)
 * can observe and drive the live browser game through the same Core commands the keyboard
 * uses. This complements the headless `AgentApi` (which owns its own world) by letting an AI
 * poke the on-screen game. No-op in production builds.
 */
export function installDebugAgentHook(
  game: Phaser.Game,
  getState: () => WorldState | null,
): void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const toCommand = (action: Action) => {
    switch (action.type) {
      case 'move':
        return Commands.move(action.dir);
      case 'attack':
        return Commands.attack();
      case 'useSkill':
        return Commands.useSkill(action.skillId);
      case 'pickup':
        return Commands.pickup();
      case 'wait':
        return Commands.wait();
    }
  };

  const observe = (state: WorldState): Action[] => {
    // Minimal legal-move probe for the console; the full observation lives in AgentApi.
    const p = state.player;
    const room = state.currentRoom;
    const acts: Action[] = [{ type: 'attack' }];
    const deltas = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const;
    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const [dx, dy] = deltas[dir];
      if (room.isWalkable(p.x + dx, p.y + dy)) acts.push({ type: 'move', dir });
    }
    return acts;
  };

  const hook: DebugAgentHook = {
    world: getState,
    act: (action) => {
      const state = getState();
      if (state) state.apply(toCommand(action));
    },
    run: (which, steps) => {
      hook.stop();
      const agent = which === 'random' ? new RandomAgent() : new HeuristicAgent();
      let remaining = steps;
      timer = setInterval(() => {
        const state = getState();
        if (!state || remaining-- <= 0) {
          hook.stop();
          return;
        }
        // Build a lightweight observation for the example agents.
        const obs = {
          tick: 0,
          player: {
            roomKey: state.player.roomKey,
            x: state.player.x,
            y: state.player.y,
            integrity: state.player.stats.integrity,
            maxIntegrity: state.player.stats.maxIntegrity,
            level: state.progression.level,
            xp: state.progression.totalXp,
            credits: state.progression.credits,
            defeated: state.player.defeated,
          },
          roomTiles: state.currentRoom.tiles,
          roomName: state.currentRoom.key,
          nearbyEntities: state.hostilesInCurrentRoom().map((h) => ({
            id: h.id,
            kind: h.kind,
            x: h.x,
            y: h.y,
            integrity: h.stats.integrity,
            defeated: h.defeated,
          })),
          visitedRooms: [],
          legalActions: observe(state),
        };
        hook.act(agent.decide(obs));
      }, 250);
    },
    stop: () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  };

  (window as unknown as { robotAgent: DebugAgentHook }).robotAgent = hook;
  void game;
}
