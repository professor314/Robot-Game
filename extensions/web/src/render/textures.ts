import Phaser from 'phaser';

/** Logical/display tile size in pixels for the rendered grid. */
export const TILE = 32;

/** Texture keys used by the render layer (placeholder fallback). */
export const TextureKey = {
  Floor: 'tex-floor',
  Wall: 'tex-wall',
  Door: 'tex-door',
  Player: 'tex-player',
  Hostile: 'tex-hostile',
} as const;

/** Phaser texture key for the Kenney Sci-Fi RTS atlas. */
export const KENNEY_ATLAS = 'kenney-rts';

/** Paths (relative to `public/`) for the Kenney CC0 atlas (see ASSETS.md). */
const ATLAS_PNG = 'assets/kenney/Spritesheet/scifiRTS_spritesheet.png';
const ATLAS_XML = 'assets/kenney/Spritesheet/scifiRTS_spritesheet.xml';

/**
 * Maps each logical render role to a frame name in the Kenney atlas. Tiles are the 64×64
 * `scifiTile_*` frames; the player and hostiles use distinct `scifiUnit_*` vehicle frames so
 * each reads differently. These are the single place to retune which art a role uses.
 */
export const KenneyFrame = {
  Floor: 'scifiTile_42.png',
  Wall: 'scifiTile_01.png',
  Door: 'scifiTile_09.png',
  Player: 'scifiUnit_01.png',
  Hostiles: ['scifiUnit_08.png', 'scifiUnit_20.png', 'scifiUnit_32.png'],
} as const;

/** Queue the Kenney atlas for loading. Call from a scene's `preload()`. */
export function loadKenneyAtlas(scene: Phaser.Scene): void {
  scene.load.atlasXML(KENNEY_ATLAS, ATLAS_PNG, ATLAS_XML);
}

/** True once the Kenney atlas has loaded and its expected frames are present. */
export function kenneyAtlasReady(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(KENNEY_ATLAS)) return false;
  const tex = scene.textures.get(KENNEY_ATLAS);
  return tex.has(KenneyFrame.Floor) && tex.has(KenneyFrame.Player);
}

/**
 * Generate the placeholder textures used when the Kenney atlas is unavailable (graceful
 * degradation — the game stays playable with no art files). Each is an original 32×32
 * colored/shaped tile baked from a Phaser Graphics object.
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
    g.lineStyle(1, 0x20222e, 1).strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  });

  make(TextureKey.Door, (g) => {
    g.fillStyle(0x15161f, 1).fillRect(0, 0, TILE, TILE);
    g.lineStyle(3, 0x3fd1c7, 1).strokeRect(4, 4, TILE - 8, TILE - 8);
  });

  make(TextureKey.Player, (g) => {
    g.fillStyle(0x2fa8d8, 1).fillRoundedRect(4, 4, TILE - 8, TILE - 8, 5);
    g.fillStyle(0xbdeaf6, 1).fillRect(8, 10, TILE - 16, 5);
  });

  make(TextureKey.Hostile, (g) => {
    g.fillStyle(0xd8453f, 1);
    g.beginPath();
    g.moveTo(TILE / 2, 2);
    g.lineTo(TILE - 2, TILE / 2);
    g.lineTo(TILE / 2, TILE - 2);
    g.lineTo(2, TILE / 2);
    g.closePath();
    g.fillPath();
  });
}
