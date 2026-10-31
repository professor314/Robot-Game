import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { GameEvent } from '../src/core/events';
import { Item, Prop } from '../src/core/props';
import { WorldState } from '../src/core/state';

/** Place a prop next to the player in the current room and clear the way. */
function putPropByPlayer(world: WorldState, prop: Prop): void {
  const room = world.currentRoom;
  room.props.push(prop);
  world.player.x = prop.x - 1;
  world.player.y = prop.y;
}

describe('mining', () => {
  it('equips the mining laser automatically at spawn (player lands on it)', () => {
    const world = new WorldState({ seed: 5 });
    expect(world.miningLaserEquipped).toBe(true);
  });

  it('takes multiple hits to break a junk deposit, then yields random materials', () => {
    const world = new WorldState({ seed: 5 });
    const room = world.currentRoom;
    room.props = [];
    // hp = 3: should survive the first two mine hits, break on the third.
    putPropByPlayer(world, { kind: 'ore', x: world.player.x + 1, y: world.player.y, junk: 'gear', hp: 3 });

    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));

    world.apply(Commands.interact());
    world.tick(16);
    expect(room.props.some((p) => p.kind === 'ore')).toBe(true); // still there after one hit

    world.apply(Commands.interact());
    world.tick(16);
    expect(room.props.some((p) => p.kind === 'ore')).toBe(true); // still there after two

    world.apply(Commands.interact());
    world.tick(16);
    expect(room.props.some((p) => p.kind === 'ore')).toBe(false); // broken on the third

    // Yielded at least one themed material.
    const totalMaterials = [...world.progression.inventory.values()].reduce((a, b) => a + b, 0);
    expect(totalMaterials).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === 'mined').length).toBe(3);
  });

  it('refuses to mine without a mining laser equipped', () => {
    const world = new WorldState({ seed: 5 });
    world.miningLaserEquipped = false;
    const room = world.currentRoom;
    room.props = [];
    putPropByPlayer(world, { kind: 'ore', x: world.player.x + 1, y: world.player.y, junk: 'scrap' });

    world.apply(Commands.interact());
    world.tick(16);

    expect(world.progression.countOf('ore')).toBe(0);
    expect(room.props.some((p) => p.kind === 'ore')).toBe(true);
  });
});

describe('heal station', () => {
  it('restores integrity to full when interacted with', () => {
    const world = new WorldState({ seed: 5 });
    const room = world.currentRoom;
    room.props = [];
    room.blocked.clear();
    world.player.stats.integrity = 30;
    // Place the heal station adjacent (it blocks, so stand next to it).
    const hx = world.player.x + 1;
    room.props.push({ kind: 'healStation', x: hx, y: world.player.y });
    room.blocked.add(`${hx},${world.player.y}`);

    world.apply(Commands.interact());
    world.tick(16);

    expect(world.player.stats.integrity).toBe(world.player.stats.maxIntegrity);
  });
});

describe('weapon upgrades', () => {
  it('auto-installs on pickup, raising attack output and tier', () => {
    const world = new WorldState({ seed: 5 });
    const room = world.currentRoom;
    const baseProcessing = world.player.stats.processing;
    const upgrade: Item = {
      id: 'item:test:upgrade',
      kind: 'weaponUpgrade',
      x: world.player.x,
      y: world.player.y,
      collected: false,
    };
    room.items.push(upgrade);

    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));

    world.apply(Commands.interact()); // pickup is auto on-tile, but interact also triggers nothing; use pickup
    world.apply(Commands.pickup());
    world.tick(16);

    expect(world.progression.weaponLevel).toBe(1);
    expect(world.player.stats.processing).toBeGreaterThan(baseProcessing);
    expect(events.some((e) => e.type === 'weaponUpgraded')).toBe(true);
    expect(upgrade.collected).toBe(true);
  });
});

describe('enemy loot drops', () => {
  it('drops a collectible loot item when a hostile is defeated', () => {
    const world = new WorldState({ seed: 5 });
    const hostile = world.hostiles[0];
    world.player.roomKey = hostile.roomKey;
    world.player.x = hostile.x - 1;
    world.player.y = hostile.y;
    world.player.attackCooldownMs = 0;
    world.player.stats.processing = 1000; // one-shot

    const room = world.graph.rooms.get(hostile.roomKey)!;
    const itemsBefore = room.items.length;

    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));

    world.apply(Commands.attack());
    world.tick(16);

    expect(hostile.defeated).toBe(true);
    expect(room.items.length).toBe(itemsBefore + 1);
    expect(room.items.some((it) => it.kind === 'loot')).toBe(true);
    expect(events.some((e) => e.type === 'lootDropped')).toBe(true);
  });
});
