/**
 * Seed data transcribed from the author's Evennia space MUD
 * (`space-mud/spacemud/world/data/*.json`). This defines the room graph, the hostiles, and
 * their placements. Rendered as a 2D tile world rather than text.
 *
 * The MUD's exit data is a labeled graph, not a strict 2D grid, so the room-graph layout
 * solver (`src/core/roomGraph.ts`) assigns consistent coordinates and resolves conflicts.
 */

/** Cardinal directions used for room exits. */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** The opposite of a direction. */
export const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** Unit grid delta for each direction (north is up: -y). */
export const DELTA: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/** A room definition from the MUD. */
export interface RoomSeed {
  key: string;
  zone: string;
  /** Short flavor line (trimmed from the MUD's longer descriptions). */
  blurb: string;
  pvpZone: boolean;
}

/** A directed exit from one room to another. */
export interface ExitSeed {
  from: string;
  to: string;
  direction: Direction;
}

/** A hostile NPC seeded into a room, with the MUD's stat/reward model. */
export interface HostileSeed {
  key: string;
  location: string;
  integrity: number;
  maxIntegrity: number;
  /** Attack output (the MUD's "processing"). */
  processing: number;
  /** Damage reduction (the MUD's "shielding"). */
  shielding: number;
  xpReward: number;
  creditsReward: number;
  respawnDelaySec: number;
  salvage: string[];
  blurb: string;
}

/** The 14 rooms across two zones (from rooms.json). */
export const ROOMS: RoomSeed[] = [
  { key: 'Main Corridor', zone: 'central_station', blurb: 'Lights: two of seven functional. Something moved here recently.', pvpZone: false },
  { key: 'Repair Bay', zone: 'central_station', blurb: 'Diagnostic cradles: three. Two occupied by inert chassis.', pvpZone: false },
  { key: 'Storage Hub', zone: 'central_station', blurb: 'Racks of components. Most slots empty. Manual retrieval only.', pvpZone: false },
  { key: 'Reactor Terminal', zone: 'central_station', blurb: 'Core output: 12% capacity. Coupling assembly shows damage.', pvpZone: false },
  { key: 'Observation Deck', zone: 'central_station', blurb: 'Viewport intact. Stars visible. No transmissions. Silence.', pvpZone: false },
  { key: 'Maintenance Shaft', zone: 'central_station', blurb: 'Narrow. Cable bundles line the walls. Intermittent sparking.', pvpZone: false },
  { key: 'Data Core', zone: 'central_station', blurb: 'Server racks of blinking indicators. One terminal draws power.', pvpZone: false },
  { key: 'Docking Port', zone: 'central_station', blurb: 'Airlock sealed. One vessel on external sensors. No response.', pvpZone: false },
  { key: 'Collapsed Corridor', zone: 'outer_zone', blurb: 'Structural failure. Path partially blocked. Something moves.', pvpZone: false },
  { key: 'Breached Lab', zone: 'outer_zone', blurb: 'Hull breach sealed with foam. One terminal draws power.', pvpZone: false },
  { key: 'Cargo Wreck', zone: 'outer_zone', blurb: 'Containers ruptured. Scorch marks. Combat occurred here.', pvpZone: false },
  { key: 'Crew Remnants', zone: 'outer_zone', blurb: 'Personal effects. Bunks overturned. Something scratched on the wall.', pvpZone: false },
  { key: 'Communications Array', zone: 'outer_zone', blurb: 'Receiver active. Transmitter offline. Signal buffer fragmented.', pvpZone: false },
  { key: 'Airlock', zone: 'outer_zone', blurb: 'Outer door sealed. Inner door ajar. Through the porthole: void.', pvpZone: false },
  { key: 'Debris Drift', zone: 'outer_zone', blurb: 'Wreckage rotates slowly. Dangerous. Scavengers reported.', pvpZone: true },
];

/** Directed exits (from exits.json). The solver uses these to lay out rooms. */
export const EXITS: ExitSeed[] = [
  { from: 'Main Corridor', to: 'Repair Bay', direction: 'north' },
  { from: 'Repair Bay', to: 'Main Corridor', direction: 'south' },
  { from: 'Main Corridor', to: 'Storage Hub', direction: 'east' },
  { from: 'Storage Hub', to: 'Main Corridor', direction: 'west' },
  { from: 'Main Corridor', to: 'Reactor Terminal', direction: 'south' },
  { from: 'Reactor Terminal', to: 'Main Corridor', direction: 'north' },
  { from: 'Main Corridor', to: 'Observation Deck', direction: 'west' },
  { from: 'Observation Deck', to: 'Main Corridor', direction: 'east' },
  { from: 'Storage Hub', to: 'Maintenance Shaft', direction: 'north' },
  { from: 'Maintenance Shaft', to: 'Storage Hub', direction: 'south' },
  { from: 'Maintenance Shaft', to: 'Data Core', direction: 'east' },
  { from: 'Data Core', to: 'Maintenance Shaft', direction: 'west' },
  { from: 'Reactor Terminal', to: 'Docking Port', direction: 'east' },
  { from: 'Docking Port', to: 'Reactor Terminal', direction: 'west' },
  { from: 'Docking Port', to: 'Collapsed Corridor', direction: 'south' },
  { from: 'Collapsed Corridor', to: 'Docking Port', direction: 'north' },
  { from: 'Collapsed Corridor', to: 'Breached Lab', direction: 'east' },
  { from: 'Breached Lab', to: 'Collapsed Corridor', direction: 'west' },
  { from: 'Collapsed Corridor', to: 'Cargo Wreck', direction: 'south' },
  { from: 'Cargo Wreck', to: 'Collapsed Corridor', direction: 'north' },
  { from: 'Collapsed Corridor', to: 'Crew Remnants', direction: 'west' },
  { from: 'Crew Remnants', to: 'Collapsed Corridor', direction: 'east' },
  { from: 'Crew Remnants', to: 'Communications Array', direction: 'south' },
  { from: 'Communications Array', to: 'Crew Remnants', direction: 'north' },
  { from: 'Breached Lab', to: 'Airlock', direction: 'north' },
  { from: 'Airlock', to: 'Breached Lab', direction: 'south' },
  { from: 'Cargo Wreck', to: 'Debris Drift', direction: 'south' },
  { from: 'Debris Drift', to: 'Cargo Wreck', direction: 'north' },
];

/** Hostiles (from hostiles.json), placed in their MUD rooms. */
export const HOSTILES: HostileSeed[] = [
  {
    key: 'Corrupted Sentry', location: 'Cargo Wreck',
    integrity: 60, maxIntegrity: 60, processing: 12, shielding: 4,
    xpReward: 75, creditsReward: 25, respawnDelaySec: 120, salvage: ['artifact'],
    blurb: 'Security model. Optics: red. Behaviour: erratic. Hostile.',
  },
  {
    key: 'Haywire Drone', location: 'Breached Lab',
    integrity: 40, maxIntegrity: 40, processing: 8, shielding: 6,
    xpReward: 50, creditsReward: 15, respawnDelaySec: 90, salvage: [],
    blurb: 'Aerial unit. Flight pattern: unstable. Approach not recommended.',
  },
  {
    key: 'Rogue Program', location: 'Debris Drift',
    integrity: 50, maxIntegrity: 50, processing: 15, shielding: 2,
    xpReward: 100, creditsReward: 30, respawnDelaySec: 150, salvage: [],
    blurb: 'No physical chassis. Manifests through station systems. Origin: unknown.',
  },
];

/** The room the player starts in. */
export const START_ROOM = 'Main Corridor';

// ---------------------------------------------------------------------------
// v3 station metadata: key-card locks, install points, vendor, key placements.
// Keys are keyed to a ROOM (all doors into that room share the key). Placements
// are chosen so no key gates the room that contains it — the chain is solvable
// from the start room (verified at build in core/keys.ts).
// ---------------------------------------------------------------------------

/** A key-card definition. */
export interface KeyCardSeed {
  id: string;
  name: string;
  /** The room the card unlocks (every door into it). */
  roomKey: string;
  /** The (open-reachable) room where the card is found. */
  foundInRoomKey: string;
  /**
   * The color (hex) shared by this key card and the doors it opens, so a player can match a
   * card to its locked door at a glance. Each key gets a distinct hue.
   */
  color: number;
}

/** Key cards and the rooms they gate. Each key/door pair has a matching color. */
export const KEY_CARDS: KeyCardSeed[] = [
  { id: 'dock-key', name: 'Docking Clearance', roomKey: 'Docking Port', foundInRoomKey: 'Reactor Terminal', color: 0xffb86c },
  { id: 'data-key', name: 'Data Core Pass', roomKey: 'Data Core', foundInRoomKey: 'Maintenance Shaft', color: 0x8be9fd },
  { id: 'drift-key', name: 'Drift Beacon', roomKey: 'Debris Drift', foundInRoomKey: 'Cargo Wreck', color: 0xff92d0 },
];

/** The color shared by a key card and the doors it opens, or undefined if unkeyed. */
export function keyColorFor(keyId: string): number | undefined {
  return KEY_CARDS.find((k) => k.id === keyId)?.color;
}

/** Map of roomKey → required key id for quick lookup. */
export const ROOM_LOCKS: Record<string, string> = Object.fromEntries(
  KEY_CARDS.map((k) => [k.roomKey, k.id]),
);

/** The single Vendor room. */
export const VENDOR_ROOM = 'Storage Hub';

