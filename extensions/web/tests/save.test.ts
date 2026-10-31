import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import {
  SAVE_VERSION,
  SaveLoadError,
  deserialize,
  deserializeFromJson,
  serialize,
  serializeToJson,
} from '../src/core/save';
import { WorldState } from '../src/core/state';
import { ROOM_HEIGHT } from '../src/core/room';

describe('save/load round-trip', () => {
  it('serializes a tagged, versioned snapshot', () => {
    const world = new WorldState({ seed: 7 });
    const data = serialize(world);
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.seed).toBe(7);
    expect(data.visitedRooms).toContain('Main Corridor');
  });

  it('restores player position, progression, and fog after mutation', () => {
    const world = new WorldState({ seed: 7 });
    // Progress the world: move into another room and earn some XP/credits.
    for (let i = 0; i < ROOM_HEIGHT; i++) world.apply(Commands.move('north'));
    world.progression.addXp(120);
    world.progression.addCredits(45);
    const savedCredits = world.progression.credits; // may include auto-pickup credits
    const json = serializeToJson(world);

    // Mutate further, then load the snapshot back.
    world.apply(Commands.move('south'));
    world.progression.addCredits(100);
    deserializeFromJson(world, json);

    expect(world.player.roomKey).toBe('Repair Bay');
    expect(world.progression.credits).toBe(savedCredits);
    expect(world.progression.totalXp).toBe(120);
    expect(world.graph.rooms.get('Repair Bay')!.visited).toBe(true);
  });

  it('loads a snapshot into a fresh world', () => {
    const source = new WorldState({ seed: 7 });
    source.progression.addXp(300);
    source.player.x += 1;
    const data = serialize(source);

    const fresh = new WorldState({ seed: 7 });
    deserialize(fresh, data);
    expect(fresh.progression.totalXp).toBe(300);
    expect(fresh.player.x).toBe(source.player.x);
  });

  it('rejects malformed JSON with a SaveLoadError', () => {
    const world = new WorldState();
    expect(() => deserializeFromJson(world, '{not json')).toThrow(SaveLoadError);
  });

  it('rejects an incompatible version', () => {
    const world = new WorldState();
    const bad = JSON.stringify({ ...serialize(world), version: 999 });
    expect(() => deserializeFromJson(world, bad)).toThrow(SaveLoadError);
  });

  it('rejects a save missing required fields', () => {
    const world = new WorldState();
    expect(() => deserialize(world, { version: SAVE_VERSION })).toThrow(SaveLoadError);
  });

  it('round-trips v3 story / mission / key / ranged state', () => {
    const source = new WorldState({ seed: 7, botId: 'tread' });
    source.story.beginRestoring();
    source.story.recoverComponent('reactor-core', 'Reactor Core');
    source.story.installComponent('reactor-core');
    source.missions.complete('reactor-core');
    source.keys.add('dock-key');
    source.rangedUnlocked = true;
    const json = serializeToJson(source);

    const fresh = new WorldState({ seed: 7, botId: 'tread' });
    deserializeFromJson(fresh, json);
    expect(fresh.story.phase).toBe('restoring');
    expect(fresh.story.installed.has('reactor-core')).toBe(true);
    expect(fresh.missions.statusOf('reactor-core')).toBe('complete');
    expect(fresh.keys.has('dock-key')).toBe(true);
    expect(fresh.rangedUnlocked).toBe(true);
  });
});
