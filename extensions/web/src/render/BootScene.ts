import Phaser from 'phaser';
import { generatePlaceholderTextures, loadArt } from './textures';

/** Scene key for the boot scene. */
export const BOOT_SCENE = 'Boot';

/**
 * Boots the game: loads all original neon-robot SVG art (players, enemies, tiles, junk, items)
 * and also generates placeholder textures so the game still renders if art fails to load.
 * Hands off to the pick-your-bot screen.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE);
  }

  preload(): void {
    loadArt(this);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`Asset failed to load: ${file.key} (${file.url}); using placeholders.`);
    });
  }

  create(): void {
    generatePlaceholderTextures(this);
    this.scene.start('SelectBot');
  }
}
