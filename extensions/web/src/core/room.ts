import { Direction } from '../data/world';
import { TileKind, isWalkable } from './tiles';

/** Fixed room dimensions in tiles. All rooms are the same size. */
export const ROOM_WIDTH = 11;
export const ROOM_HEIGHT = 9;

/**
 * A single room: a fixed-size tile grid with doors only on the edges that have a neighbor.
 * The room is the unit of state partitioning (one authoritative room state), anticipating a
 * future Colyseus room-per-`Room` multiplayer model.
 */
export class Room {
  /** Room key (matches the MUD room name). */
  readonly key: string;
  /** The zone this room belongs to. */
  readonly zone: string;
  /** Short flavor text. */
  readonly blurb: string;
  /** Whether player-vs-player combat is allowed here. */
  readonly pvpZone: boolean;

  /** Grid position in room-space (assigned by the layout solver). */
  gridX = 0;
  gridY = 0;

  /** Directions that have a door (a neighbor exists that way). */
  readonly doors = new Set<Direction>();

  /** The tile grid, indexed [x][y]. */
  readonly tiles: TileKind[][];

  /** Whether the player has visited (revealed) this room. */
  visited = false;

  constructor(key: string, zone: string, blurb: string, pvpZone: boolean) {
    this.key = key;
    this.zone = zone;
    this.blurb = blurb;
    this.pvpZone = pvpZone;
    this.tiles = [];
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const col: TileKind[] = [];
      for (let y = 0; y < ROOM_HEIGHT; y++) col.push(TileKind.Floor);
      this.tiles.push(col);
    }
  }

  /**
   * Build the room's walls and doors once its doors are known. Border cells become walls,
   * except the middle cell of each edge with a door, which becomes a door tile.
   */
  buildTiles(): void {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      for (let y = 0; y < ROOM_HEIGHT; y++) {
        const border = x === 0 || y === 0 || x === ROOM_WIDTH - 1 || y === ROOM_HEIGHT - 1;
        this.tiles[x][y] = border ? TileKind.Wall : TileKind.Floor;
      }
    }

    const midX = Math.floor(ROOM_WIDTH / 2);
    const midY = Math.floor(ROOM_HEIGHT / 2);
    if (this.doors.has('north')) this.tiles[midX][0] = TileKind.Door;
    if (this.doors.has('south')) this.tiles[midX][ROOM_HEIGHT - 1] = TileKind.Door;
    if (this.doors.has('west')) this.tiles[0][midY] = TileKind.Door;
    if (this.doors.has('east')) this.tiles[ROOM_WIDTH - 1][midY] = TileKind.Door;
  }

  /** The tile coordinate of the door on the given edge, if present. */
  doorTile(dir: Direction): { x: number; y: number } | null {
    if (!this.doors.has(dir)) return null;
    const midX = Math.floor(ROOM_WIDTH / 2);
    const midY = Math.floor(ROOM_HEIGHT / 2);
    switch (dir) {
      case 'north': return { x: midX, y: 0 };
      case 'south': return { x: midX, y: ROOM_HEIGHT - 1 };
      case 'west': return { x: 0, y: midY };
      case 'east': return { x: ROOM_WIDTH - 1, y: midY };
    }
  }

  /** True if the given in-room tile can be walked onto. */
  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) return false;
    return isWalkable(this.tiles[x][y]);
  }
}
