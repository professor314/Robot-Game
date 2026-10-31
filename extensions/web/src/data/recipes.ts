/**
 * Crafting recipes. Each recipe is discovered as a data chip found in a room (one per chip),
 * then can be crafted from mined materials to produce an upgrade or consumable. Recipes are
 * pure data here; `WorldState.craft` applies a recipe's `effect` to the player. Add a new
 * recipe by appending an entry and (if needed) handling a new `effect.kind` in `craft`.
 */

/** A material cost: pairs of [material id, quantity]. Material ids come from props MATERIALS. */
export type RecipeCost = ReadonlyArray<readonly [string, number]>;

/** What crafting a recipe does. New upgrade types add a kind here and a handler in `craft`. */
export type RecipeEffect =
  | { kind: 'battery'; integrity: number } // craft a carryable repair cell (used later with B)
  | { kind: 'maxIntegrity'; amount: number } // permanently raise max integrity (+ heal)
  | { kind: 'weapon'; processing: number } // raise attack output / weapon tier
  | { kind: 'armor'; shielding: number } // raise damage reduction
  | { kind: 'miningLaser'; speedup: number } // improve the mining laser (fewer hits)
  | { kind: 'rangedWeapon'; processing: number }; // unlock the ranged attack (+attack)

/** A craftable recipe. */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  /** Material cost to craft. */
  cost: RecipeCost;
  /** The effect applied when crafted. */
  effect: RecipeEffect;
  /** If true, can be crafted repeatedly; otherwise once. */
  repeatable: boolean;
}

/**
 * All recipes in the game. The `found-in` placement is handled by the furnisher, which scatters
 * one recipe chip per eligible room (see props/state). Costs use the themed mining materials:
 * nut, bolt, circuit board, wire coil, servo, capacitor, alloy plate, coolant cell, rivet,
 * microchip.
 */
export const RECIPES: Recipe[] = [
  {
    id: 'battery',
    name: 'Repair Cell',
    description: 'A carryable charge. Craft one, then press B to restore 40 integrity mid-fight.',
    cost: [
      ['coolant cell', 2],
      ['wire coil', 1],
    ],
    effect: { kind: 'battery', integrity: 40 },
    repeatable: true,
  },
  {
    id: 'reinforced-plating',
    name: 'Reinforced Plating',
    description: 'Bolt-on armor. Permanently +2 shielding.',
    cost: [
      ['alloy plate', 3],
      ['rivet', 4],
      ['bolt', 2],
    ],
    effect: { kind: 'armor', shielding: 2 },
    repeatable: true,
  },
  {
    id: 'capacitor-cannon',
    name: 'Capacitor Cannon',
    description: 'A ranged weapon module. Unlocks the ranged attack and +4 attack output.',
    cost: [
      ['capacitor', 2],
      ['circuit board', 2],
      ['servo', 1],
    ],
    effect: { kind: 'rangedWeapon', processing: 4 },
    repeatable: false,
  },
  {
    id: 'plasma-edge',
    name: 'Plasma Edge',
    description: 'A heavier melee module. +6 attack output.',
    cost: [
      ['capacitor', 1],
      ['alloy plate', 2],
      ['microchip', 1],
    ],
    effect: { kind: 'weapon', processing: 6 },
    repeatable: true,
  },
  {
    id: 'focused-laser',
    name: 'Focused Mining Laser',
    description: 'Tunes the mining laser to break junk faster.',
    cost: [
      ['microchip', 2],
      ['capacitor', 1],
      ['wire coil', 2],
    ],
    effect: { kind: 'miningLaser', speedup: 1 },
    repeatable: false,
  },
  {
    id: 'hardened-chassis',
    name: 'Hardened Chassis',
    description: 'Structural rework. Permanently +25 max integrity.',
    cost: [
      ['alloy plate', 4],
      ['servo', 2],
      ['nut', 3],
      ['bolt', 3],
    ],
    effect: { kind: 'maxIntegrity', amount: 25 },
    repeatable: false,
  },
];

/** Look up a recipe by id. */
export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
