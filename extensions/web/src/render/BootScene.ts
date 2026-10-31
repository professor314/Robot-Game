import Phaser from 'phaser';
import { generatePlaceholderTextures, loadKenneyAtlas } from './textures';

/** Scene key for the boot scene. */
export const BOOT_SCENE = 'Boot';

/**
 * Boots the game: loads the Kenney CC0 Sci-Fi RTS atlas (see ASSETS.md) and also generates
 * placeholder textures so the game still renders if the atlas fails to load. Hands off to the
 * world scene once assets are ready.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE);
  }

  preload(): void {
    loadKenneyAtlas(this);
    // If the atlas (or any asset) fails to load, carry on with placeholders.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`Asset failed to load: ${file.key} (${file.url}); using placeholders.`);
    });
  }

  create(): void {
    // Placeholders act as a fallback; the world scene prefers Kenney frames when present.
    generatePlaceholderTextures(this);
    this.scene.start('World');
  }
}
