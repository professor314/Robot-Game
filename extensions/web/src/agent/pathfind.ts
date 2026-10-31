/**
 * Room-graph pathfinding for planner agents. Pure Core logic (no Phaser/DOM): given the
 * `RoomGraph`, the set of key cards currently held, and `ROOM_LOCKS`, it finds a shortest room
 * sequence from one room to another, and the per-step compass directions to walk it.
 *
 * This is deliberately data-derived: it reads the live graph + `ROOM_LOCKS`, so if the map or
 * the locking changes, the pathfinder follows automatically (the point of the winnability tool).
 */

import { RoomGraph } from '../core/roomGraph';
import { Direction, ROOM_LOCKS } from '../data/world';

/** A planned route between rooms: the room keys to pass through and the directions to walk. */
export interface RoomRoute {
  /** Room keys from start to goal, inclusive of both ends. */
  rooms: string[];
  /** The compass direction to leave each room by (length = rooms.length - 1). */
  directions: Direction[];
}

/**
 * Whether a room may be entered given the keys currently held. A room is passable if it has no
 * lock, or the holder owns its required key. Used both as a routing filter and a solvability
 * check.
 */
export function roomAccessible(roomKey: string, keysHeld: ReadonlySet<string>): boolean {
  const required = ROOM_LOCKS[roomKey];
  return !required || keysHeld.has(required);
}

/**
 * Breadth-first shortest path from `fromKey` to `toKey` over the room graph, only routing
 * through rooms the agent can currently enter (locked rooms are traversable only if their key
 * is held). Returns null if no accessible route exists. The start room is always allowed even
 * if locked (you're already standing in it).
 */
export function findRoomRoute(
  graph: RoomGraph,
  fromKey: string,
  toKey: string,
  keysHeld: ReadonlySet<string>,
): RoomRoute | null {
  if (fromKey === toKey) return { rooms: [fromKey], directions: [] };
  if (!graph.rooms.has(fromKey) || !graph.rooms.has(toKey)) return null;

  // Standard BFS, tracking each room's predecessor and the direction taken to reach it.
  const prev = new Map<string, { room: string; dir: Direction }>();
  const visited = new Set<string>([fromKey]);
  const queue: string[] = [fromKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const links = graph.neighbors.get(current) ?? {};
    for (const dir of Object.keys(links) as Direction[]) {
      const next = links[dir];
      if (!next || visited.has(next)) continue;
      // Can only route through a room we're allowed to enter (unless it's the goal: we still
      // need the key to enter the goal, so the same rule applies there too).
      if (!roomAccessible(next, keysHeld)) continue;
      visited.add(next);
      prev.set(next, { room: current, dir });
      if (next === toKey) return reconstruct(prev, fromKey, toKey);
      queue.push(next);
    }
  }
  return null;
}

/** Rebuild the room list + direction list by walking predecessors back from the goal. */
function reconstruct(
  prev: Map<string, { room: string; dir: Direction }>,
  fromKey: string,
  toKey: string,
): RoomRoute {
  const rooms: string[] = [toKey];
  const directions: Direction[] = [];
  let cursor = toKey;
  while (cursor !== fromKey) {
    const step = prev.get(cursor)!;
    rooms.push(step.room);
    directions.push(step.dir);
    cursor = step.room;
  }
  rooms.reverse();
  directions.reverse();
  return { rooms, directions };
}

/**
 * Whether `toKey` is reachable from `fromKey` given the held keys. Convenience wrapper over
 * `findRoomRoute`.
 */
export function isRoomReachable(
  graph: RoomGraph,
  fromKey: string,
  toKey: string,
  keysHeld: ReadonlySet<string>,
): boolean {
  return findRoomRoute(graph, fromKey, toKey, keysHeld) !== null;
}
