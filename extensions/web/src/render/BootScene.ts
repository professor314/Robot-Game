import Phaser from 'phaser';
import { gameAudio } from '../audio/shared';
import { generatePlaceholderTextures, loadArt } from './textures';

/** Scene key for the boot scene. */
export const BOOT_SCENE = 'Boot';

/**
 * Boots the game: loads all original neon-robot SVG art (players, enemies, tiles, junk, items)
 * and also generates placeholder textures so the game still renders if art fails to load.
 * Hands off to the pick-your-bot screen, or, when the page URL has `?ending`, to a preview of
 * the ending so it can be watched without beating the game.
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
    if (new URLSearchParams(window.location.search).has('ending')) {
      this.previewEnding();
      return;
    }
    this.scene.start('SelectBot');
  }

  /**
   * Show a start prompt (the click or key press also unlocks browser audio), then play the real
   * ending scene. When it finishes, return to the pick-your-bot screen.
   */
  private previewEnding(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d0d1a');
    this.add
      .text(width / 2, height / 2, 'ENDING PREVIEW\n\npress any key or click to start', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#8be9fd',
        align: 'center',
      })
      .setOrigin(0.5);

    const go = (): void => {
      gameAudio.resume();
      const manager = this.game.scene;
      this.scene.start('GameWon', {
        onPowerUp: () => gameAudio.playFromStart('victory'),
        onContinue: () => manager.start('SelectBot'),
      });
    };
    this.input.keyboard?.once('keydown', go);
    this.input.once('pointerdown', go);
  }
}
