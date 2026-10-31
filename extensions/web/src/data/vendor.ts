/**
 * Vendor goods — bought with CREDITS only (crafting, separately, uses materials). The vendor is
 * a single room (see world.ts VENDOR_ROOM). Pure data; `state.ts` applies a good's effect on
 * purchase. Add a good by appending an entry and handling its `effect.kind` in `WorldState.buy`.
 */

/** What buying a good does. */
export type VendorEffect =
  | { kind: 'repair'; integrity: number } // restore integrity now
  | { kind: 'material'; resource: string; amount: number } // add materials to inventory
  | { kind: 'maxIntegrity'; amount: number }; // permanent +max integrity

/** A purchasable good. */
export interface VendorGood {
  id: string;
  name: string;
  description: string;
  price: number; // credits
  effect: VendorEffect;
  /** If false, buyable once per run. */
  repeatable: boolean;
}

/** The vendor's stock. */
export const VENDOR_GOODS: VendorGood[] = [
  {
    id: 'field-repair',
    name: 'Field Repair',
    description: 'Restore 50 integrity now.',
    price: 30,
    effect: { kind: 'repair', integrity: 50 },
    repeatable: true,
  },
  {
    id: 'alloy-pack',
    name: 'Alloy Pack',
    description: 'A bundle of 5 alloy plates.',
    price: 40,
    effect: { kind: 'material', resource: 'alloy plate', amount: 5 },
    repeatable: true,
  },
  {
    id: 'servo-pack',
    name: 'Servo Pack',
    description: 'A bundle of 5 servos.',
    price: 40,
    effect: { kind: 'material', resource: 'servo', amount: 5 },
    repeatable: true,
  },
  {
    id: 'chassis-expansion',
    name: 'Chassis Expansion',
    description: 'Permanent +20 max integrity.',
    price: 150,
    effect: { kind: 'maxIntegrity', amount: 20 },
    repeatable: true,
  },
];

/** Look up a good by id. */
export function vendorGoodById(id: string): VendorGood | undefined {
  return VENDOR_GOODS.find((g) => g.id === id);
}
