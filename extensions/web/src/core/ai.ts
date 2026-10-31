import { Command, Commands } from './commands';
import { Entity, tileDistance } from './entity';
import { Direction } from '../data/world';
import { Rng } from './rng';

/**
 * A read-only view of the world handed to a brain so it can decide without mutating state.
 * Keeping brains pure (view in, command out) makes AI deterministic and testable, and lets
 * smarter brains drop in without touching the combat loop.
 */
export interface WorldView {
  player: Entity;
  isWalkable(roomKey: string, x: number, y: number): boolean;
  rng: Rng;
}

/** An AI brain: given an entity and a world view, choose a command (or null to idle). */
export interface Brain {
  decide(self: Entity, view: WorldView): Command | null;
}

const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

const STEP: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

// --- shared helpers (pure, deterministic) -------------------------------------------------

/** True if `self` and the player are in the same room. */
function sameRoom(self: Entity, view: WorldView): boolean {
  return self.roomKey === view.player.roomKey;
}

/** Distance to the player, or Infinity if in another room. */
function distToPlayer(self: Entity, view: WorldView): number {
  return sameRoom(self, view) ? tileDistance(self, view.player) : Infinity;
}

/** A walkable step that reduces distance to (tx,ty), or null. */
function stepToward(self: Entity, tx: number, ty: number, view: WorldView): Direction | null {
  let best: Direction | null = null;
  let bestDist = Math.abs(tx - self.x) + Math.abs(ty - self.y);
  for (const dir of DIRECTIONS) {
    const { dx, dy } = STEP[dir];
    const nx = self.x + dx;
    const ny = self.y + dy;
    if (!view.isWalkable(self.roomKey, nx, ny)) continue;
    const d = Math.abs(tx - nx) + Math.abs(ty - ny);
    if (d < bestDist) {
      bestDist = d;
      best = dir;
    }
  }
  return best;
}

/** A walkable step that increases distance from (tx,ty) — fleeing — or null. */
function stepAway(self: Entity, tx: number, ty: number, view: WorldView): Direction | null {
  let best: Direction | null = null;
  let bestDist = Math.abs(tx - self.x) + Math.abs(ty - self.y);
  for (const dir of DIRECTIONS) {
    const { dx, dy } = STEP[dir];
    const nx = self.x + dx;
    const ny = self.y + dy;
    if (!view.isWalkable(self.roomKey, nx, ny)) continue;
    const d = Math.abs(tx - nx) + Math.abs(ty - ny);
    if (d > bestDist) {
      bestDist = d;
      best = dir;
    }
  }
  return best;
}

/** Occasionally step to a random walkable neighbor; mostly idle. */
function wander(self: Entity, view: WorldView): Command | null {
  if (view.rng.next() > 0.25) return null;
  const dir = view.rng.pick(DIRECTIONS);
  const { dx, dy } = STEP[dir];
  if (view.isWalkable(self.roomKey, self.x + dx, self.y + dy)) return Commands.move(dir);
  return null;
}

// --- per-type brains ----------------------------------------------------------------------

/** Sentry: holds ground, attacks anything adjacent, only steps toward a nearby player. */
export class SentryBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const d = distToPlayer(self, view);
    const aggro = self.aggroRange ?? 0;
    if (d === 1) return Commands.attack();
    if (sameRoom(self, view) && d <= aggro) {
      const dir = stepToward(self, view.player.x, view.player.y, view);
      // Sentry is sticky: only closes if the player is quite near, else holds.
      if (dir && d <= 3) return Commands.move(dir);
      return Commands.wait();
    }
    return null; // fully stationary when idle
  }
}

/** Drone: a kiter — attacks when adjacent but prefers to keep ~2 tiles of distance. */
export class DroneBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const d = distToPlayer(self, view);
    const aggro = self.aggroRange ?? 0;
    if (!sameRoom(self, view) || d > aggro) return wander(self, view);
    if (d === 1) return Commands.attack();
    if (d < 2) {
      const away = stepAway(self, view.player.x, view.player.y, view);
      if (away) return Commands.move(away);
    }
    if (d > 3) {
      const toward = stepToward(self, view.player.x, view.player.y, view);
      if (toward) return Commands.move(toward);
    }
    // Strafe: sidestep deterministically to feel evasive.
    const side = view.rng.pick(DIRECTIONS);
    const { dx, dy } = STEP[side];
    if (view.isWalkable(self.roomKey, self.x + dx, self.y + dy)) return Commands.move(side);
    return Commands.wait();
  }
}

/** Crawler: ambush — idle until the player comes close, then bursts into a chase. */
export class CrawlerBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const d = distToPlayer(self, view);
    if (!sameRoom(self, view)) return null;
    // Lurk until the player is within 3 tiles.
    if (d > 3) return null;
    if (d === 1) return Commands.attack();
    const dir = stepToward(self, view.player.x, view.player.y, view);
    return dir ? Commands.move(dir) : Commands.wait();
  }
}

/** Hunter: aggressive straight-line charger with a wide aggro range. */
export class HunterBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const d = distToPlayer(self, view);
    const aggro = self.aggroRange ?? 0;
    if (sameRoom(self, view) && d <= aggro) {
      if (d === 1) return Commands.attack();
      const dir = stepToward(self, view.player.x, view.player.y, view);
      return dir ? Commands.move(dir) : Commands.wait();
    }
    return wander(self, view);
  }
}

/** The default brain (used by ambient patrols): pursue in range, wander otherwise. */
export class HostileBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const d = distToPlayer(self, view);
    const aggro = self.aggroRange ?? 0;
    if (sameRoom(self, view) && d <= aggro) {
      if (d === 1) return Commands.attack();
      const dir = stepToward(self, view.player.x, view.player.y, view);
      return dir ? Commands.move(dir) : Commands.wait();
    }
    return wander(self, view);
  }
}

/** Shared brain instances (stateless, so one each is fine). */
const BRAINS: Record<string, Brain> = {
  sentry: new SentryBrain(),
  drone: new DroneBrain(),
  crawler: new CrawlerBrain(),
  hunter: new HunterBrain(),
  hostile: new HostileBrain(),
};

/** Resolve a brain by its id (enemy type), defaulting to the basic hostile brain. */
export function brainFor(brainId: string | null | undefined): Brain {
  return (brainId && BRAINS[brainId]) || BRAINS.hostile;
}
