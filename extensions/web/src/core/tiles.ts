/**
 * Logical tile kinds that make up a room's grid. The render layer maps these to concrete
 * sprites/textures; the core only reasons about kinds and passability.
 */
export enum TileKind {
  /** Empty space outside the room footprint (not drawn as floor). */
  Empty = 'empty',
  /** Walkable floor. */
  Floor = 'floor',
  /** Impassable wall. */
  Wall = 'wall',
  /** A doorway on a room edge leading to an adjacent room. */
  Door = 'door',
}

/** True if a tile kind can be walked onto. */
export function isWalkable(kind: TileKind): boolean {
  return kind === TileKind.Floor || kind === TileKind.Door;
}

/** Number of visual style variants available per tile kind (the renderer holds the art). */
export const FLOOR_STYLES = 3;
export const WALL_STYLES = 4;
export const DOOR_STYLES = 3;
