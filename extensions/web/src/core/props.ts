import { Rng } from './rng';
import { ROOM_HEIGHT, ROOM_WIDTH, Room } from './room';
import { DOOR_STYLES, FLOOR_STYLES, WALL_STYLES } from './tiles';

/**
 * Non-entity room contents: decorative/structural **props** (crates, tanks, consoles, pipes,
 * debris) and interactive **items** (salvage the player can pick up). These live in Core so
 * they serialize, test headlessly, and drive the render layer purely through data. The
 * furnisher places them deterministically from the seeded PRNG, so a given seed always
 * produces the same furnished station.
 */

/** A decorative/structural prop. Some props block movement (you can't walk through a tank). */
export type PropKind =
  | 'crate' // supply crate
  | 'crateGreen' // sealed container
  | 'tank' // fuel/storage tank (blocks)
  | 'console' // wall console / screen (blocks)
  | 'scanner' // radar/scanner dish (blocks)
  | 'turretWreck' // inert turret (blocks)
  | 'pipe' // floor conduit (walkable)
  | 'debris' // rubble pile (walkable, small)
  | 'ore' // mineral deposit (walkable, MINABLE)
  | 'healStation' // repair bay console (blocks; INTERACT to heal)
  // Room-themed furnishings (decorative, most block):
  | 'controlStation' // control room console bank (blocks)
  | 'telescope' // observatory telescope (blocks)
  | 'window' // viewport / porthole (blocks)
  | 'server' // data core server rack (blocks)
  | 'reactor' // reactor core column (blocks)
  | 'bunk' // crew quarters bunk (blocks)
  | 'dockingClamp' // docking port clamp (blocks)
  | 'antenna' // comms array antenna (blocks)
  | 'cargoStack'; // stacked cargo containers (blocks)

/**
 * What a prop does when the player interacts with it (interact key). Props without an
 * interaction are purely decorative. This is the extension point for new interactive objects:
 * add a kind here, map a prop to it, and handle it in `WorldState.interact`.
 */
export type Interaction = 'mine' | 'heal';

/** The interaction a prop offers, or null if it's decorative. */
export function interactionOf(kind: PropKind): Interaction | null {
  if (kind === 'ore') return 'mine';
  if (kind === 'healStation') return 'heal';
  return null;
}

/** An interactive item the player can pick up. */
export type ItemKind =
  | 'component' // generic salvage component
  | 'cell' // power cell
  | 'crystal' // rare crystal
  | 'scrap' // scrap metal
  | 'weaponUpgrade' // auto-installing weapon module
  | 'miningLaser' // equippable mining tool (needed to mine junk)
  | 'recipe' // a crafting-recipe data chip (unlocks a recipe on pickup)
  | 'loot'; // dropped by a defeated enemy

/**
 * The ten kinds of mineable "junk" an ore-deposit prop can be. Each yields resources when
 * mined with the mining laser. The renderer maps each to a distinct SVG.
 */
export const JUNK_KINDS = [
  'scrap',
  'circuit',
  'cell',
  'crystal',
  'hull',
  'bolts',
  'gear',
  'ore',
  'plating',
  'canister',
] as const;

export type JunkKind = (typeof JUNK_KINDS)[number];

/**
 * Raw materials the player salvages from mining junk. Themed small spaceship parts. Mining a
 * deposit yields a random handful of these (not just "ore"), so the inventory fills with a
 * mix of components.
 */
export const MATERIALS = [
  'nut',
  'bolt',
  'circuit board',
  'wire coil',
  'servo',
  'capacitor',
  'alloy plate',
  'coolant cell',
  'rivet',
  'microchip',
] as const;

export type Material = (typeof MATERIALS)[number];

/** A placed prop at an in-room tile. */
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  /** For `ore` props: which of the 10 junk variants this deposit is (drives art + resource). */
  junk?: JunkKind;
  /** For `ore` props: remaining hits before it breaks and yields materials (bell-curve 1–5). */
  hp?: number;
}

/** A placed, not-yet-collected item at an in-room tile. */
export interface Item {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  collected: boolean;
  /** For `recipe` items: the id of the recipe this chip unlocks. */
  recipeId?: string;
}

/** Props that block movement (the player and hostiles route around them). */
const BLOCKING: ReadonlySet<PropKind> = new Set<PropKind>([
  'tank',
  'console',
  'scanner',
  'turretWreck',
  'healStation',
  'controlStation',
  'telescope',
  'window',
  'server',
  'reactor',
  'bunk',
  'dockingClamp',
  'antenna',
  'cargoStack',
]);

/** True if a prop kind blocks movement. */
export function propBlocks(kind: PropKind): boolean {
  return BLOCKING.has(kind);
}

/** Interior (non-border, non-door-adjacent) tiles available for furnishing. */
function interiorTiles(): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let x = 1; x < ROOM_WIDTH - 1; x++) {
    for (let y = 1; y < ROOM_HEIGHT - 1; y++) {
      // Leave the room center and the tiles directly in front of each door clear so the
      // player always has somewhere to stand on entry and a path across the room.
      const cx = Math.floor(ROOM_WIDTH / 2);
      const cy = Math.floor(ROOM_HEIGHT / 2);
      if (x === cx && y === cy) continue;
      if ((x === cx && (y === 1 || y === ROOM_HEIGHT - 2)) ||
          (y === cy && (x === 1 || x === ROOM_WIDTH - 2))) {
        continue;
      }
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * Themed furniture per room, keyed by the room's name. Each room gets a signature prop set so
 * it reads as its function (the control room has control stations, the observatory has
 * telescopes and windows, etc.). Falls back to a generic palette by zone for unlisted rooms.
 * The first few entries are the room's "signature" props; the rest fill in supporting decor.
 */
const ROOM_THEMES: Record<string, PropKind[]> = {
  'Main Corridor': ['pipe', 'console', 'crate', 'pipe'],
  'Repair Bay': ['console', 'crate', 'tank', 'pipe'],
  'Storage Hub': ['cargoStack', 'crate', 'crateGreen', 'cargoStack', 'tank'],
  'Reactor Terminal': ['reactor', 'console', 'pipe', 'tank', 'reactor'],
  'Observation Deck': ['telescope', 'window', 'window', 'console'],
  'Maintenance Shaft': ['pipe', 'pipe', 'debris', 'tank', 'console'],
  'Data Core': ['server', 'server', 'console', 'server'],
  'Docking Port': ['dockingClamp', 'window', 'cargoStack', 'crate'],
  'Collapsed Corridor': ['debris', 'debris', 'pipe', 'turretWreck'],
  'Breached Lab': ['console', 'server', 'debris', 'window'],
  'Cargo Wreck': ['cargoStack', 'crate', 'debris', 'crateGreen'],
  'Crew Remnants': ['bunk', 'bunk', 'crate', 'debris'],
  'Communications Array': ['antenna', 'console', 'scanner', 'antenna'],
  'Airlock': ['window', 'dockingClamp', 'pipe', 'console'],
  'Debris Drift': ['debris', 'debris', 'turretWreck', 'debris'],
};

/** Prop set for a room: its themed signature if known, else a generic zone palette. */
function propPaletteFor(room: Room): PropKind[] {
  const themed = ROOM_THEMES[room.key];
  if (themed) return themed;
  if (room.zone === 'outer_zone') return ['debris', 'debris', 'pipe', 'turretWreck', 'crate', 'tank'];
  return ['crate', 'crateGreen', 'console', 'tank', 'pipe'];
}

/** Deterministic Fisher-Yates shuffle using the seeded RNG. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The furnished contents of a room. */
export interface RoomFurnishing {
  props: Prop[];
  items: Item[];
}

/** Assign this room's floor/wall/door art styles deterministically from the seeded RNG. */
export function assignRoomStyle(room: Room, rng: Rng): void {
  room.floorStyle = rng.nextInt(0, FLOOR_STYLES - 1);
  room.wallStyle = rng.nextInt(0, WALL_STYLES - 1);
  room.doorStyle = rng.nextInt(0, DOOR_STYLES - 1);
}

/**
 * Furnish a room: scatter a handful of props and one or two items across free interior tiles,
 * deterministically from `rng`. Returns the placements and records blocking props on the room
 * so movement respects them. Roughly a third of tiles are furnished so rooms feel occupied
 * without becoming mazes.
 */
export function furnishRoom(room: Room, rng: Rng): RoomFurnishing {
  const palette = propPaletteFor(room);
  const tiles = shuffle(interiorTiles(), rng);

  const props: Prop[] = [];
  const items: Item[] = [];
  let cursor = 0;

  const place = (kind: PropKind, junk?: JunkKind): void => {
    if (cursor >= tiles.length) return;
    const t = tiles[cursor++];
    const prop: Prop = { kind, x: t.x, y: t.y, junk };
    // Junk deposits take a bell-curved number of hits (1–5, usually ~3) before yielding.
    if (kind === 'ore') prop.hp = rng.bellInt(1, 5);
    props.push(prop);
    if (propBlocks(kind)) room.blocked.add(`${t.x},${t.y}`);
  };

  // Lay down this room's signature themed furniture (control stations, telescopes, servers…),
  // so each room reads as its function. The palette's leading entries are the signatures.
  const signatureCount = Math.min(palette.length, 2 + rng.nextInt(0, 2));
  for (let i = 0; i < signatureCount; i++) {
    place(palette[i % palette.length]);
  }

  // Guarantee a couple of mineable junk deposits per room (each a random one of 10 variants).
  const oreCount = 2 + rng.nextInt(0, 2);
  for (let i = 0; i < oreCount; i++) {
    place('ore', JUNK_KINDS[rng.nextInt(0, JUNK_KINDS.length - 1)]);
  }

  // Roughly a third of rooms get a heal station (repair bay).
  if (rng.next() < 0.33) place('healStation');

  // Fill out with a couple more supporting props from the room's palette.
  const extra = 1 + rng.nextInt(0, 2);
  for (let i = 0; i < extra; i++) {
    place(palette[rng.nextInt(0, palette.length - 1)]);
  }

  // One or two salvage items per room, with an occasional weapon upgrade.
  const itemKinds: ItemKind[] = ['component', 'cell', 'crystal', 'scrap'];
  const itemCount = rng.nextInt(0, 2);
  for (let i = 0; i < itemCount && cursor < tiles.length; i++) {
    const t = tiles[cursor++];
    items.push({
      id: `item:${room.key}:${i}`,
      kind: itemKinds[rng.nextInt(0, itemKinds.length - 1)],
      x: t.x,
      y: t.y,
      collected: false,
    });
  }

  // ~20% of rooms hide a weapon-upgrade module.
  if (rng.next() < 0.2 && cursor < tiles.length) {
    const t = tiles[cursor++];
    items.push({
      id: `item:${room.key}:upgrade`,
      kind: 'weaponUpgrade',
      x: t.x,
      y: t.y,
      collected: false,
    });
  }

  room.props = props;
  room.items = items;
  return { props, items };
}
