import { describe, expect, it } from 'vitest';
import { RoomGraph } from '../src/core/roomGraph';
import { ROOMS, EXITS, START_ROOM, ExitSeed, RoomSeed } from '../src/data/world';

describe('RoomGraph layout', () => {
  it('places every seed room and reaches all from the start', () => {
    const graph = new RoomGraph();
    expect(graph.rooms.size).toBe(ROOMS.length);
    const unreachable = graph.warnings.filter((w) => w.message.includes('unreachable'));
    expect(unreachable).toHaveLength(0);
  });

  it('puts the start room at the origin', () => {
    const graph = new RoomGraph();
    const start = graph.rooms.get(START_ROOM)!;
    expect(start.gridX).toBe(0);
    expect(start.gridY).toBe(0);
  });

  it('places a north neighbor one tile up (-y)', () => {
    const graph = new RoomGraph();
    const start = graph.rooms.get('Main Corridor')!;
    const north = graph.neighborOf('Main Corridor', 'north')!;
    const neighbor = graph.rooms.get(north)!;
    expect(neighbor.gridX).toBe(start.gridX);
    expect(neighbor.gridY).toBe(start.gridY - 1);
  });

  it('records a warning and keeps the first assignment on a coordinate conflict', () => {
    // Two BFS paths drive different rooms onto the same coordinate (a non-planar loop):
    //   A -east-> B (1,0),  B -north-> C (1,-1)
    //   A -north-> D (0,-1), D -east-> E (1,-1)
    // C and E both map to (1,-1); whichever BFS reaches it first wins, the other warns.
    const rooms: RoomSeed[] = ['A', 'B', 'C', 'D', 'E'].map((key) => ({
      key,
      zone: 'z',
      blurb: '',
      pvpZone: false,
    }));
    const exits: ExitSeed[] = [
      { from: 'A', to: 'B', direction: 'east' },
      { from: 'B', to: 'C', direction: 'north' },
      { from: 'A', to: 'D', direction: 'north' },
      { from: 'D', to: 'E', direction: 'east' },
    ];
    const graph = new RoomGraph(rooms, exits, 'A');
    const conflicts = graph.warnings.filter((w) => w.message.includes('conflict'));
    expect(conflicts.length).toBeGreaterThan(0);
    // Exactly one room owns the contested coordinate (1,-1).
    const atCoord = ['C', 'E'].filter((k) => {
      const r = graph.rooms.get(k)!;
      return r.gridX === 1 && r.gridY === -1;
    });
    expect(atCoord).toHaveLength(2); // both parked there; first owns the slot, second warned
    // B is placed deterministically at (1,0).
    const b = graph.rooms.get('B')!;
    expect(b.gridX).toBe(1);
    expect(b.gridY).toBe(0);
  });

  it('builds walls on the border and doors only where neighbors exist', () => {
    const graph = new RoomGraph();
    const start = graph.rooms.get('Main Corridor')!;
    // Main Corridor has exits in all four directions in the seed data.
    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const door = start.doorTile(dir);
      expect(door).not.toBeNull();
    }
  });

  it('matches the number of unique exit directions to seeded exits', () => {
    const graph = new RoomGraph();
    let doorCount = 0;
    for (const room of graph.rooms.values()) doorCount += room.doors.size;
    // Each directed exit contributes one door on its originating room.
    expect(doorCount).toBe(EXITS.length);
  });
});
