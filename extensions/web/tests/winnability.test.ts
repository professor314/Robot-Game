import { describe, expect, it } from 'vitest';
import { WorldState } from '../src/core/state';
import { findRoomRoute, isRoomReachable, roomAccessible } from '../src/agent/pathfind';
import { findTilePath } from '../src/agent/tilepath';
import { buildWorldMap } from '../src/agent/worldmap';
import { playOnce, playUntilWin } from '../src/agent/selfplay';
import { MISSIONS } from '../src/data/missions';
import { KEY_CARDS } from '../src/data/world';

describe('room pathfinding', () => {
  it('finds a route between two rooms and reports the directions', () => {
    const world = new WorldState({ seed: 1 });
    const route = findRoomRoute(world.graph, 'Main Corridor', 'Reactor Terminal', new Set());
    expect(route).not.toBeNull();
    expect(route!.rooms[0]).toBe('Main Corridor');
    expect(route!.rooms[route!.rooms.length - 1]).toBe('Reactor Terminal');
    // One direction per room hop.
    expect(route!.directions.length).toBe(route!.rooms.length - 1);
  });

  it('refuses to route through a locked room without its key, and allows it with the key', () => {
    const world = new WorldState({ seed: 1 });
    // Docking Port is locked by dock-key.
    const locked = KEY_CARDS.find((k) => k.id === 'dock-key')!.roomKey;
    expect(roomAccessible(locked, new Set())).toBe(false);
    expect(roomAccessible(locked, new Set(['dock-key']))).toBe(true);

    const withoutKey = isRoomReachable(world.graph, 'Main Corridor', locked, new Set());
    const withKey = isRoomReachable(world.graph, 'Main Corridor', locked, new Set(['dock-key']));
    // With the key it must be reachable; the key strictly expands reachability.
    expect(withKey).toBe(true);
    expect(withKey && !withoutKey).toBe(true);
  });

  it('returns an empty route for same-room start and goal', () => {
    const world = new WorldState({ seed: 1 });
    const route = findRoomRoute(world.graph, 'Main Corridor', 'Main Corridor', new Set());
    expect(route).toEqual({ rooms: ['Main Corridor'], directions: [] });
  });
});

describe('in-room tile pathfinding', () => {
  it('paths across a room to a target floor tile', () => {
    const world = new WorldState({ seed: 1 });
    const room = world.currentRoom;
    const path = findTilePath(room, 1, 1, 5, 4);
    expect(path).not.toBeNull();
    // Each step is a cardinal direction.
    for (const d of path!) expect(['north', 'south', 'east', 'west']).toContain(d);
  });

  it('can stop adjacent to a non-walkable/occupied target', () => {
    const world = new WorldState({ seed: 1 });
    const room = world.currentRoom;
    // Target the center; stopAdjacent should land us one tile away.
    const path = findTilePath(room, 1, 1, 5, 4, { stopAdjacent: true });
    expect(path).not.toBeNull();
  });
});

describe('world objective map', () => {
  it('derives all 7 missions and 3 keys from the live world', () => {
    const world = new WorldState({ seed: 1 });
    const map = buildWorldMap(world);
    expect(map.missions.length).toBe(MISSIONS.length);
    expect(map.keys.length).toBe(KEY_CARDS.length);
    expect(map.totalComponents).toBe(7);
    expect(map.won).toBe(false);
    // Every guardian starts alive and no component installed.
    expect(map.missions.every((m) => m.guardianAlive && !m.installed)).toBe(true);
  });
});

describe('winnability guard', () => {
  // The core purpose of this tool: prove the game is still beatable end-to-end. If a change to
  // the game data/mechanics makes it impossible, the planner will fail to win any seed and this
  // test fails — a regression guard against an unwinnable game.
  it('the planner beats the game on a known-good seed', () => {
    const r = playOnce({ seed: 1, botId: 'barrel', maxSteps: 40000 });
    expect(r.installed).toBe(7);
    expect(r.won).toBe(true);
    expect(r.phase === 'departed' || r.phase === 'freeRoam').toBe(true);
  }, 60000);

  it('the game is beatable across a range of seeds (at least one win)', () => {
    const summary = playUntilWin([1, 2, 4, 5, 7], { botId: 'barrel', maxSteps: 40000 });
    expect(summary.firstWin).toBeDefined();
    expect(summary.firstWin!.won).toBe(true);
  }, 120000);
});
