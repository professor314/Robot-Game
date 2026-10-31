import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { ROOM_HEIGHT, ROOM_WIDTH } from '../src/core/room';
import { WorldState } from '../src/core/state';

const MIDX = Math.floor(ROOM_WIDTH / 2);
const MIDY = Math.floor(ROOM_HEIGHT / 2);

describe('player movement and collision', () => {
  it('starts the player at the center of the start room', () => {
    const world = new WorldState();
    expect(world.player.x).toBe(MIDX);
    expect(world.player.y).toBe(MIDY);
    expect(world.player.roomKey).toBe('Main Corridor');
  });

  it('moves one tile onto floor', () => {
    const world = new WorldState();
    const startX = world.player.x;
    world.apply(Commands.move('east'));
    expect(world.player.x).toBe(startX + 1);
    expect(world.player.y).toBe(MIDY);
  });

  it('blocks movement into a wall', () => {
    const world = new WorldState();
    // Walk west toward the wall; the west edge has a door at the mid row, so walk north first
    // onto a non-door row, then into the west wall.
    world.apply(Commands.move('north')); // now at (MIDX, MIDY-1)
    for (let i = 0; i < ROOM_WIDTH; i++) world.apply(Commands.move('west'));
    // Cannot pass the x=1 floor into the x=0 wall on a non-door row.
    expect(world.player.x).toBe(1);
    expect(world.player.roomKey).toBe('Main Corridor');
  });

  it('transitions to the neighboring room through a door', () => {
    const world = new WorldState();
    // Main Corridor -> Repair Bay is north. Walk up to and through the north door.
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north'));
    expect(world.player.roomKey).toBe('Repair Bay');
  });

  it('emits a moved event on each successful step', () => {
    const world = new WorldState();
    const moves: string[] = [];
    world.events.on((e) => {
      if (e.type === 'moved') moves.push(`${e.x},${e.y}`);
    });
    world.apply(Commands.move('east'));
    expect(moves).toContain(`${MIDX + 1},${MIDY}`);
  });

  it('updates facing even when blocked', () => {
    const world = new WorldState();
    world.apply(Commands.move('north'));
    for (let i = 0; i < ROOM_WIDTH; i++) world.apply(Commands.move('west'));
    expect(world.player.facing).toBe('left');
  });

  it('cannot move onto a tile occupied by an enemy', () => {
    const world = new WorldState({ seed: 3 });
    const h = world.hostiles[0];
    // Put the player in the hostile's room, directly west of it, and try to step east onto it.
    world.player.roomKey = h.roomKey;
    world.player.x = h.x - 1;
    world.player.y = h.y;
    const beforeX = world.player.x;
    world.apply(Commands.move('east'));
    expect(world.player.x).toBe(beforeX); // blocked by the enemy
  });
});
