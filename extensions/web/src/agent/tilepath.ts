/**
 * In-room tile pathfinding for planner agents. BFS over a room's walkable tiles (respecting
 * walls and prop-blocked tiles) to produce a list of compass steps from one tile to another.
 * Optionally treats live hostiles as obstacles so the agent doesn't try to walk through them.
 */

import { Room, ROOM_WIDTH, ROOM_HEIGHT } from '../core/room';
import { Direction } from '../data/world';

const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/** A set of "x,y" tile keys to treat as temporarily impassable (e.g. hostiles). */
export type Obstacles = ReadonlySet<string>;

/**
 * BFS the shortest sequence of compass steps from (sx,sy) to (tx,ty) inside a room. Returns the
 * directions to walk, or null if unreachable. The target tile itself need not be walkable when
 * `stopAdjacent` is true (used to path *next to* a boss or socket rather than onto it).
 */
export function findTilePath(
  room: Room,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  opts: { obstacles?: Obstacles; stopAdjacent?: boolean } = {},
): Direction[] | null {
  const obstacles = opts.obstacles ?? new Set<string>();
  const stopAdjacent = opts.stopAdjacent ?? false;

  const atGoal = (x: number, y: number): boolean =>
    stopAdjacent ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : x === tx && y === ty;

  if (atGoal(sx, sy)) return [];

  const key = (x: number, y: number): string => `${x},${y}`;
  const prev = new Map<string, { x: number; y: number; dir: Direction }>();
  const visited = new Set<string>([key(sx, sy)]);
  const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
      const { dx, dy } = DELTAS[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= ROOM_WIDTH || ny >= ROOM_HEIGHT) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      const isGoalTile = nx === tx && ny === ty;
      // The goal tile may be non-walkable when we only need to reach an adjacent tile.
      if (!isGoalTile && (!room.isWalkable(nx, ny) || obstacles.has(k))) continue;
      visited.add(k);
      prev.set(k, { x, y, dir });
      if (atGoal(nx, ny)) return reconstruct(prev, key(sx, sy), k);
      // Don't expand out of a non-walkable goal tile.
      if (room.isWalkable(nx, ny) && !obstacles.has(k)) queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function reconstruct(
  prev: Map<string, { x: number; y: number; dir: Direction }>,
  startKey: string,
  goalKey: string,
): Direction[] {
  const dirs: Direction[] = [];
  let cursor = goalKey;
  while (cursor !== startKey) {
    const step = prev.get(cursor)!;
    dirs.push(step.dir);
    cursor = `${step.x},${step.y}`;
  }
  dirs.reverse();
  return dirs;
}
