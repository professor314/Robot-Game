import Phaser from 'phaser';

/** Logical/display tile size in pixels for the rendered grid. */
export const TILE = 32;

/** Pixel size tiles are rasterized at (2× for crispness when the camera zooms in). */
const TILE_RES = 64;
/** Pixel size character/junk SVGs are rasterized at. */
const CHAR_RES = 96;
const JUNK_RES = 64;

/** Texture keys for the generated placeholder fallbacks. */
export const TextureKey = {
  Floor: 'tex-floor',
  Wall: 'tex-wall',
  Door: 'tex-door',
  Player: 'tex-player',
  Hostile: 'tex-hostile',
} as const;

/** Player bot chassis available on the pick-your-bot screen (id → art file + label). */
export const PLAYER_BOTS: { id: string; label: string; file: string }[] = [
  { id: 'dome', label: 'Dome Waver', file: 'players/dome.svg' },
  { id: 'spindle', label: 'Spindle Walker', file: 'players/spindle.svg' },
  { id: 'tread', label: 'Tread Hauler', file: 'players/tread.svg' },
  { id: 'barrel', label: 'Barrel Bot', file: 'players/barrel.svg' },
];

/** Enemy art: five hostile bot types. Named hostiles and patrols pick from these. */
export const ENEMY_KEYS = ['sentry', 'drone', 'program', 'crawler', 'hunter'] as const;
export type EnemyArt = (typeof ENEMY_KEYS)[number];

/** Texture key helpers (so scenes don't hardcode strings). */
export const texPlayer = (botId: string): string => `player-${botId}`;
export const texEnemy = (art: EnemyArt): string => `enemy-${art}`;
export const texFloor = (i: number): string => `floor-${i}`;
export const texWall = (i: number): string => `wall-${i}`;
export const texDoor = (i: number): string => `door-${i}`;
export const texJunk = (kind: string): string => `junk-${kind}`;
export const texItem = (name: string): string => `item-${name}`;

/** Floor/wall/door style files, indexed by the room's style index. */
const FLOOR_FILES = ['tiles/floor-plated.svg', 'tiles/floor-grid.svg', 'tiles/floor-hazard.svg'];
const WALL_FILES = ['tiles/wall-blue.svg', 'tiles/wall-purple.svg', 'tiles/wall-steel.svg', 'tiles/wall-rust.svg'];
const DOOR_FILES = ['tiles/door-blue.svg', 'tiles/door-green.svg', 'tiles/door-orange.svg'];

/** The ten mineable junk variants (must match core/props JUNK_KINDS). */
const JUNK_FILES: Record<string, string> = {
  scrap: 'junk/scrap.svg',
  circuit: 'junk/circuit.svg',
  cell: 'junk/cell.svg',
  crystal: 'junk/crystal.svg',
  hull: 'junk/hull.svg',
  bolts: 'junk/bolts.svg',
  gear: 'junk/gear.svg',
  ore: 'junk/ore.svg',
  plating: 'junk/plating.svg',
  canister: 'junk/canister.svg',
};

/** Special item art. */
const ITEM_FILES: Record<string, string> = {
  miningLaser: 'items/mining-laser.svg',
  weaponUpgrade: 'items/weapon-upgrade.svg',
  loot: 'items/loot.svg',
  healStation: 'items/heal-station.svg',
  recipe: 'items/recipe.svg',
  keycard: 'items/keycard.svg',
  component: 'items/component.svg',
  installPoint: 'items/install-point.svg',
  projectile: 'items/projectile.svg',
};

/** Room-themed furniture prop art, keyed by PropKind. */
const PROP_FILES: Record<string, string> = {
  controlStation: 'props/control-station.svg',
  telescope: 'props/telescope.svg',
  window: 'props/window.svg',
  server: 'props/server.svg',
  reactor: 'props/reactor.svg',
  bunk: 'props/bunk.svg',
  dockingClamp: 'props/docking-clamp.svg',
  antenna: 'props/antenna.svg',
  cargoStack: 'props/cargo-stack.svg',
  crate: 'props/crate.svg',
  crateGreen: 'props/cargo-stack.svg',
  console: 'props/console.svg',
  scanner: 'props/antenna.svg',
  tank: 'props/tank.svg',
  turretWreck: 'props/reactor.svg',
  pipe: 'props/pipe.svg',
};

/** Texture key for a themed prop. */
export const texProp = (kind: string): string => `prop-${kind}`;

const BASE = 'assets/art/';

/**
 * Queue every SVG texture for loading. Phaser rasterizes SVGs at the requested size, so the
 * neon robot art stays crisp. Call from a scene's `preload()`.
 */
export function loadArt(scene: Phaser.Scene): void {
  const svg = (key: string, file: string, w: number, h: number): void => {
    scene.load.svg(key, BASE + file, { width: w, height: h });
  };

  for (const bot of PLAYER_BOTS) svg(texPlayer(bot.id), bot.file, CHAR_RES, CHAR_RES);
  for (const e of ENEMY_KEYS) svg(texEnemy(e), `enemies/${e}.svg`, CHAR_RES, CHAR_RES);

  FLOOR_FILES.forEach((f, i) => svg(texFloor(i), f, TILE_RES, TILE_RES));
  WALL_FILES.forEach((f, i) => svg(texWall(i), f, TILE_RES, TILE_RES));
  DOOR_FILES.forEach((f, i) => svg(texDoor(i), f, TILE_RES, TILE_RES));

  for (const [kind, file] of Object.entries(JUNK_FILES)) svg(texJunk(kind), file, JUNK_RES, JUNK_RES);
  for (const [name, file] of Object.entries(ITEM_FILES)) svg(texItem(name), file, JUNK_RES, JUNK_RES);
  for (const [kind, file] of Object.entries(PROP_FILES)) svg(texProp(kind), file, JUNK_RES, JUNK_RES);
}

/** True once the core SVG art has loaded (checked via a representative texture). */
export function artReady(scene: Phaser.Scene): boolean {
  return scene.textures.exists(texFloor(0)) && scene.textures.exists(texPlayer('dome'));
}

/**
 * Generate placeholder textures used if the SVG art fails to load (graceful degradation — the
 * game stays playable). Plain 32×32 shapes for floor/wall/door/player/hostile.
 */
export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  };

  make(TextureKey.Floor, (g) => {
    g.fillStyle(0x15161f, 1).fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, 0x20222e, 1).strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  });
  make(TextureKey.Wall, (g) => {
    g.fillStyle(0x394056, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x4a5370, 1).fillRect(0, 0, TILE, 5);
  });
  make(TextureKey.Door, (g) => {
    g.fillStyle(0x15161f, 1).fillRect(0, 0, TILE, TILE);
    g.lineStyle(3, 0x3fd1c7, 1).strokeRect(4, 4, TILE - 8, TILE - 8);
  });
  make(TextureKey.Player, (g) => {
    g.fillStyle(0x8be9fd, 1).fillRoundedRect(4, 4, TILE - 8, TILE - 8, 5);
    g.fillStyle(0xff92d0, 1).fillRect(8, 10, TILE - 16, 5);
  });
  make(TextureKey.Hostile, (g) => {
    g.fillStyle(0xff5555, 1);
    g.beginPath();
    g.moveTo(TILE / 2, 2);
    g.lineTo(TILE - 2, TILE / 2);
    g.lineTo(TILE / 2, TILE - 2);
    g.lineTo(2, TILE / 2);
    g.closePath();
    g.fillPath();
  });
}
