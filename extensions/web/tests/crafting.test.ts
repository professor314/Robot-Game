import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { GameEvent } from '../src/core/events';
import { WorldState } from '../src/core/state';
import { RECIPES, recipeById } from '../src/data/recipes';

/** Give the player everything a recipe needs. */
function stock(world: WorldState, recipeId: string): void {
  const r = recipeById(recipeId)!;
  world.progression.knownRecipes.add(recipeId);
  for (const [mat, qty] of r.cost) world.progression.addToInventory(mat, qty);
}

describe('recipes data', () => {
  it('every recipe has a unique id, a cost, and an effect', () => {
    const ids = new Set(RECIPES.map((r) => r.id));
    expect(ids.size).toBe(RECIPES.length);
    for (const r of RECIPES) {
      expect(r.cost.length).toBeGreaterThan(0);
      expect(r.effect.kind).toBeTruthy();
    }
  });
});

describe('recipe discovery', () => {
  it('scatters recipe chips across rooms and learns one on pickup', () => {
    const world = new WorldState({ seed: 9 });
    // Find a recipe chip that was scattered, stand on it, pick it up.
    let found: { roomKey: string; recipeId: string; x: number; y: number } | null = null;
    for (const room of world.graph.rooms.values()) {
      const chip = room.items.find((it) => it.kind === 'recipe');
      if (chip) {
        found = { roomKey: room.key, recipeId: chip.recipeId!, x: chip.x, y: chip.y };
        break;
      }
    }
    expect(found).not.toBeNull();

    world.player.roomKey = found!.roomKey;
    world.player.x = found!.x;
    world.player.y = found!.y;
    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));
    world.apply(Commands.pickup());
    world.tick(16);

    expect(world.progression.knownRecipes.has(found!.recipeId)).toBe(true);
    expect(events.some((e) => e.type === 'recipeLearned')).toBe(true);
  });
});

describe('crafting', () => {
  it('refuses to craft an unknown recipe', () => {
    const world = new WorldState({ seed: 9 });
    const r = recipeById('battery')!;
    for (const [mat, qty] of r.cost) world.progression.addToInventory(mat, qty);
    // Known set is empty for this recipe.
    world.progression.knownRecipes.delete('battery');
    world.apply(Commands.craft('battery'));
    world.tick(16);
    // Materials not spent.
    expect(world.progression.hasMaterials(r.cost)).toBe(true);
  });

  it('refuses to craft without enough materials', () => {
    const world = new WorldState({ seed: 9 });
    world.progression.knownRecipes.add('battery');
    let crafted = false;
    world.events.on((e) => {
      if (e.type === 'crafted') crafted = true;
    });
    world.apply(Commands.craft('battery'));
    world.tick(16);
    expect(crafted).toBe(false);
  });

  it('crafts a battery: spends materials and restores integrity', () => {
    const world = new WorldState({ seed: 9 });
    stock(world, 'battery');
    world.player.stats.integrity = 40;
    world.apply(Commands.craft('battery'));
    world.tick(16);
    expect(world.player.stats.integrity).toBeGreaterThan(40);
    expect(world.progression.hasMaterials(recipeById('battery')!.cost)).toBe(false);
  });

  it('crafts armor: raises shielding', () => {
    const world = new WorldState({ seed: 9 });
    stock(world, 'reinforced-plating');
    const before = world.player.stats.shielding;
    world.apply(Commands.craft('reinforced-plating'));
    world.tick(16);
    expect(world.player.stats.shielding).toBe(before + 2);
  });

  it('crafts a weapon: raises processing and weapon tier', () => {
    const world = new WorldState({ seed: 9 });
    stock(world, 'plasma-edge');
    const before = world.player.stats.processing;
    const tierBefore = world.progression.weaponLevel;
    world.apply(Commands.craft('plasma-edge'));
    world.tick(16);
    expect(world.player.stats.processing).toBe(before + 6);
    expect(world.progression.weaponLevel).toBe(tierBefore + 1);
  });

  it('crafts the Capacitor Cannon: unlocks ranged and raises attack', () => {
    const world = new WorldState({ seed: 9 });
    stock(world, 'capacitor-cannon');
    const before = world.player.stats.processing;
    world.apply(Commands.craft('capacitor-cannon'));
    world.tick(16);
    expect(world.rangedUnlocked).toBe(true);
    expect(world.player.stats.processing).toBe(before + 4);
  });

  it('crafts a focused mining laser: raises mining level', () => {
    const world = new WorldState({ seed: 9 });
    stock(world, 'focused-laser');
    world.apply(Commands.craft('focused-laser'));
    world.tick(16);
    expect(world.progression.miningLevel).toBe(1);
  });
});
