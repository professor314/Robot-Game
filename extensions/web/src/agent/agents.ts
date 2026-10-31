import { Rng } from '../core/rng';
import { Action, Observation } from './api';

/** An agent decides an action from an observation. */
export interface Agent {
  decide(obs: Observation): Action;
}

/**
 * Picks a uniformly random legal action using a seeded PRNG, so a run is reproducible. The
 * simplest possible Agent_API consumer — useful for smoke-testing the loop and as a baseline.
 */
export class RandomAgent implements Agent {
  private readonly rng: Rng;

  constructor(seed = 1) {
    this.rng = new Rng(seed);
  }

  decide(obs: Observation): Action {
    const actions = obs.legalActions;
    return actions[this.rng.nextInt(0, actions.length - 1)];
  }
}

/**
 * A simple heuristic: attack an adjacent hostile, else step toward the nearest hostile in the
 * room, else explore by moving toward an unexplored direction (any legal move), else wait.
 * Demonstrates reading the observation to make goal-directed decisions.
 */
export class HeuristicAgent implements Agent {
  decide(obs: Observation): Action {
    const { x, y } = obs.player;
    const alive = obs.nearbyEntities.filter((e) => !e.defeated);

    // Attack if a hostile is adjacent.
    const adjacent = alive.find((e) => Math.abs(e.x - x) + Math.abs(e.y - y) === 1);
    if (adjacent && obs.legalActions.some((a) => a.type === 'attack')) {
      return { type: 'attack' };
    }

    // Otherwise step toward the nearest hostile.
    if (alive.length > 0) {
      const target = alive.reduce((best, e) =>
        Math.abs(e.x - x) + Math.abs(e.y - y) < Math.abs(best.x - x) + Math.abs(best.y - y) ? e : best,
      );
      const move = this.stepToward(obs, target.x, target.y);
      if (move) return move;
    }

    // Otherwise explore: take any legal move, preferring one not reversing is not tracked here.
    const moves = obs.legalActions.filter((a) => a.type === 'move');
    if (moves.length > 0) return moves[0];

    return { type: 'wait' };
  }

  /** Choose a legal move that reduces distance toward (tx, ty), or null. */
  private stepToward(obs: Observation, tx: number, ty: number): Action | null {
    const { x, y } = obs.player;
    const moves = obs.legalActions.filter((a) => a.type === 'move') as Extract<
      Action,
      { type: 'move' }
    >[];
    const delta: Record<string, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };
    let best: Action | null = null;
    let bestDist = Math.abs(tx - x) + Math.abs(ty - y);
    for (const m of moves) {
      const { dx, dy } = delta[m.dir];
      const d = Math.abs(tx - (x + dx)) + Math.abs(ty - (y + dy));
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }
}
