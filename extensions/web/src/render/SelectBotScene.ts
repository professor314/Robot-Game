import Phaser from 'phaser';
import { Persistence } from './persistence';
import { PLAYER_BOTS, texPlayer } from './textures';

/** Scene key for the pick-your-bot screen. */
export const SELECT_BOT_SCENE = 'SelectBot';

/**
 * The opening "pick your bot" screen. Shows the available player chassis (original neon-robot
 * art from the blog's robot library) and starts a new game with the chosen one. If a save
 * already exists, a "Continue" option resumes it with whatever bot it was started with.
 */
export class SelectBotScene extends Phaser.Scene {
  constructor() {
    super(SELECT_BOT_SCENE);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d0d1a');

    this.add
      .text(width / 2, 70, 'ROBOT-GAME', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#8be9fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 120, 'Select your salvage unit', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff92d0',
      })
      .setOrigin(0.5);

    // Lay the four bots out in a row.
    const n = PLAYER_BOTS.length;
    const spacing = Math.min(220, (width - 80) / n);
    const startX = width / 2 - (spacing * (n - 1)) / 2;
    const y = height / 2 + 10;

    PLAYER_BOTS.forEach((bot, idx) => {
      const x = startX + idx * spacing;
      const card = this.add
        .rectangle(x, y, spacing - 24, 220, 0x16161f)
        .setStrokeStyle(2, 0x44475a)
        .setInteractive({ useHandCursor: true });

      const sprite = this.add.image(x, y - 20, texPlayer(bot.id));
      // Scale the tall robot art to fit the card.
      const maxH = 150;
      if (sprite.height > 0) sprite.setScale(Math.min(1, maxH / sprite.height));

      const label = this.add
        .text(x, y + 88, bot.label, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#c8d0e0',
        })
        .setOrigin(0.5);

      const pick = (): void => this.choose(bot.id);
      for (const obj of [card, sprite.setInteractive({ useHandCursor: true }), label.setInteractive({ useHandCursor: true })]) {
        obj.on('pointerover', () => card.setStrokeStyle(3, 0x50fa7b));
        obj.on('pointerout', () => card.setStrokeStyle(2, 0x44475a));
        obj.on('pointerdown', pick);
      }
    });

    // Continue button if a save exists.
    if (Persistence.hasSave()) {
      const cont = this.add
        .text(width / 2, height - 48, '▶ Continue saved game', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#50fa7b',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cont.on('pointerdown', () => this.continueSaved());
    }
  }

  /** Start a fresh game with the chosen bot. */
  private choose(botId: string): void {
    Persistence.clear();
    this.scene.start('World', { botId, resume: false });
  }

  /** Resume the existing save (bot id comes from however that run started). */
  private continueSaved(): void {
    this.scene.start('World', { resume: true });
  }
}
