import { Command, Commands } from './commands';
import { Entity, tileDistance } from './entity';
import { Direction } from '../data/world';
import { Rng } from './rng';

/**
 * A read-only view of the world handed to a brain so it can decide without mutating state.
 * Keeping brains pure (view in, command out) makes AI deterministic and testable, and lets
 * smarter brains drop in later without touching the combat loop.
 */
export interface WorldView {
  /** The player entity (the hostiles' target). */
  player: Entity;
  /** Whether a tile in a room can be walked onto. */
  isWalkable(roomKey: string, x: number, y: number): boolean;
  /** Seeded RNG for reproducible wandering. */
  rng: Rng;
}

/** An AI brain: given an entity and a world view, choose a command (or null to idle). */
export interface Brain {
  decide(self: Entity, view: WorldView): Command | null;
}

/** All four movement directions, in a fixed order for deterministic iteration. */
const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

/** Tile delta for stepping one tile in a direction. */
const STEP: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/**
 * A basic hostile brain: when the player is in the same room and within aggro range, it steps
 * toward the player and attacks when adjacent; otherwise it wanders. Pluggable via the `Brain`
 * interface so a smarter pursuit/pathfinding brain can replace it later.
 */
export class HostileBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const player = view.player;

    const sameRoom = player.roomKey === self.roomKey;
    const dist = sameRoom ? tileDistance(self, player) : Infinity;
    const aggro = self.aggroRange ?? 0;

    if (sameRoom && dist <= aggro) {
      if (dist === 1) return Commands.attack();
      const dir = this.stepToward(self, player, view);
      if (dir) return Commands.move(dir);
      return Commands.wait();
    }

    return this.wander(self, view);
  }

  /** Pick a walkable direction that reduces distance to the target (greedy, deterministic). */
  private stepToward(self: Entity, target: Entity, view: WorldView): Direction | null {
    let best: Direction | null = null;
    let bestDist = tileDistance(self, target);
    for (const dir of DIRECTIONS) {
      const { dx, dy } = STEP[dir];
      const nx = self.x + dx;
      const ny = self.y + dy;
      if (!view.isWalkable(self.roomKey, nx, ny)) continue;
      const d = Math.abs(nx - target.x) + Math.abs(ny - target.y);
      if (d < bestDist) {
        bestDist = d;
        best = dir;
      }
    }
    return best;
  }

  /** Occasionally step to a random walkable neighbor; mostly idle to keep hostiles near home. */
  private wander(self: Entity, view: WorldView): Command | null {
    if (view.rng.next() > 0.25) return null;
    const dir = view.rng.pick(DIRECTIONS);
    const { dx, dy } = STEP[dir];
    if (view.isWalkable(self.roomKey, self.x + dx, self.y + dy)) return Commands.move(dir);
    return null;
  }
}
