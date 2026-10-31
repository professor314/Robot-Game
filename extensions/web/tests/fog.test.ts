import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { ROOM_HEIGHT } from '../src/core/room';
import { WorldState } from '../src/core/state';

describe('fog of war visited tracking', () => {
  it('reveals only the start room initially', () => {
    const world = new WorldState();
    const visited = [...world.graph.rooms.values()].filter((r) => r.visited);
    expect(visited).toHaveLength(1);
    expect(visited[0].key).toBe('Main Corridor');
  });

  it('marks a room visited once entered', () => {
    const world = new WorldState();
    expect(world.graph.rooms.get('Repair Bay')!.visited).toBe(false);
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north'));
    expect(world.graph.rooms.get('Repair Bay')!.visited).toBe(true);
  });

  it('keeps a room revealed after leaving it', () => {
    const world = new WorldState();
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north')); // enter Repair Bay
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('south')); // back to Main Corridor
    expect(world.player.roomKey).toBe('Main Corridor');
    expect(world.graph.rooms.get('Repair Bay')!.visited).toBe(true);
  });

  it('emits roomEntered with firstVisit true only the first time', () => {
    const world = new WorldState();
    const firstVisits: boolean[] = [];
    world.events.on((e) => {
      if (e.type === 'roomEntered' && e.roomKey === 'Repair Bay') {
        firstVisits.push(e.firstVisit);
      }
    });
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north')); // first entry
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('south'));
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north')); // second entry
    expect(firstVisits).toEqual([true, false]);
  });
});
