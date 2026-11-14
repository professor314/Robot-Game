import Phaser from 'phaser';
import { gameAudio } from '../audio/shared';
import { chassisById } from '../data/chassis';
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
        .rectangle(x, y, spacing - 20, 260, 0x16161f)
        .setStrokeStyle(2, 0x44475a)
        .setInteractive({ useHandCursor: true });

      const sprite = this.add.image(x, y - 40, texPlayer(bot.id));
      // Scale the tall robot art to fit the card.
      const maxH = 130;
      if (sprite.height > 0) sprite.setScale(Math.min(1, maxH / sprite.height));

      const profile = chassisById(bot.id);
      const label = this.add
        .text(x, y + 62, profile.label, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#c8d0e0',
        })
        .setOrigin(0.5);
      // Tradeoff + key stats so the choice is informed.
      this.add
        .text(x, y + 84, `${profile.tagline}\nHP ${profile.maxIntegrity} · ATK ${profile.processing} · DEF ${profile.shielding}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#8892a6',
          align: 'center',
          wordWrap: { width: spacing - 32 },
        })
        .setOrigin(0.5, 0);

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

    this.startMusic(width, height);
  }

  /**
   * Play the "being built" song. Browsers keep audio locked until the first click or key press,
   * so if audio is still locked just after this screen opens, a "power on" prompt covers it.
   * The first click or key press unlocks audio and starts the song (and that click is used up
   * by the prompt, so it does not also pick a robot). If audio is already unlocked (coming back
   * from a game over) the song starts at once and no prompt shows.
   */
  private startMusic(width: number, height: number): void {
    if (!gameAudio.resume()) return; // no Web Audio in this browser: nothing to unlock

    let gate: Phaser.GameObjects.GameObject[] = [];
    let gestured = false;
    const closeGate = (): void => {
      gate.forEach((o) => o.destroy());
      gate = [];
    };

    const cancel = gameAudio.whenRunning(() => {
      closeGate();
      gameAudio.playFromStart('build');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cancel);

    const unlock = (): void => {
      gestured = true;
      gameAudio.resume();
      closeGate();
    };
    this.input.once('pointerdown', unlock);
    this.input.keyboard?.once('keydown', unlock);

    // A moment of grace so a browser that allows autoplay never flashes the prompt.
    this.time.delayedCall(250, () => {
      if (gestured || gameAudio.unlocked) return;
      const dim = this.add
        .rectangle(0, 0, width, height, 0x0d0d1a, 0.92)
        .setOrigin(0, 0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(width / 2, height / 2, '♪  CLICK OR PRESS ANY KEY\nTO POWER ON', {
          fontFamily: 'monospace',
          fontSize: '28px',
          color: '#8be9fd',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.tweens.add({ targets: label, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });
      gate = [dim, label];
    });
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
