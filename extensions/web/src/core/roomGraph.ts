import {
  DELTA,
  Direction,
  EXITS,
  ExitSeed,
  ROOMS,
  RoomSeed,
  START_ROOM,
} from '../data/world';
import { Room } from './room';

/** A warning produced while laying out rooms (e.g. a coordinate conflict). */
export interface LayoutWarning {
  message: string;
}

/**
 * The world's rooms plus their spatial layout. Built from the MUD seed data. Because the MUD
 * exits form a labeled graph rather than a strict grid, the layout solver assigns each room an
 * integer (gridX, gridY) by breadth-first walking exits from the start room, and resolves
 * conflicts deterministically (first assignment wins) while recording a warning.
 */
export class RoomGraph {
  readonly rooms = new Map<string, Room>();
  /** neighbors[roomKey][direction] = neighborKey */
  readonly neighbors = new Map<string, Partial<Record<Direction, string>>>();
  readonly warnings: LayoutWarning[] = [];

  constructor(
    roomSeeds: readonly RoomSeed[] = ROOMS,
    exitSeeds: readonly ExitSeed[] = EXITS,
    startRoom = START_ROOM,
  ) {
    for (const r of roomSeeds) {
      this.rooms.set(r.key, new Room(r.key, r.zone, r.blurb, r.pvpZone));
      this.neighbors.set(r.key, {});
    }

    for (const e of exitSeeds) {
      const from = this.rooms.get(e.from);
      const links = this.neighbors.get(e.from);
      if (!from || !links) continue;
      from.doors.add(e.direction);
      links[e.direction] = e.to;
    }

    this.layout(startRoom);

    for (const room of this.rooms.values()) room.buildTiles();
  }

  /** The neighbor of a room in a direction, or undefined. */
  neighborOf(roomKey: string, dir: Direction): string | undefined {
    return this.neighbors.get(roomKey)?.[dir];
  }

  /**
   * Assign (gridX, gridY) to every reachable room via BFS from the start room. If a room is
   * reached at a coordinate already taken by a different room, keep the first assignment and
   * record a warning (the MUD graph is not a guaranteed planar grid).
   */
  private layout(startRoom: string): void {
    const start = this.rooms.get(startRoom);
    if (!start) return;

    start.gridX = 0;
    start.gridY = 0;
    const placed = new Set<string>([startRoom]);
    const occupied = new Map<string, string>([['0,0', startRoom]]);
    const queue: string[] = [startRoom];

    while (queue.length > 0) {
      const key = queue.shift()!;
      const room = this.rooms.get(key)!;
      const links = this.neighbors.get(key) ?? {};

      for (const dir of Object.keys(links) as Direction[]) {
        const nextKey = links[dir];
        if (!nextKey || placed.has(nextKey)) continue;

        const { dx, dy } = DELTA[dir];
        const nx = room.gridX + dx;
        const ny = room.gridY + dy;
        const coordKey = `${nx},${ny}`;

        if (occupied.has(coordKey)) {
          this.warnings.push({
            message:
              `Layout conflict: "${nextKey}" (${dir} of "${key}") maps to ` +
              `(${nx}, ${ny}), already held by "${occupied.get(coordKey)}". ` +
              `Keeping it unplaced at this slot; it remains reachable via the graph.`,
          });
          // Still mark as placed so BFS terminates; park it at the conflicting coord.
          // Rendering can offset parked rooms; the connectivity is preserved.
        }

        const next = this.rooms.get(nextKey)!;
        next.gridX = nx;
        next.gridY = ny;
        placed.add(nextKey);
        if (!occupied.has(coordKey)) occupied.set(coordKey, nextKey);
        queue.push(nextKey);
      }
    }

    // Any rooms not reached from start (shouldn't happen with this data) get warned.
    for (const key of this.rooms.keys()) {
      if (!placed.has(key)) {
        this.warnings.push({ message: `Room "${key}" is unreachable from "${startRoom}".` });
      }
    }
  }
}
