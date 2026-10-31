import Phaser from 'phaser';
import { ENDING_LINES } from '../data/story';
import { texEnding } from './textures';

/** Scene key for the victory / departure ending. */
export const GAMEWON_SCENE = 'GameWon';

/** Data passed in when the ending is shown. */
export interface GameWonData {
  onContinue: () => void;
}

/**
 * The departure ending: shown when the ship is restored and the Station Core is defeated. Rolls
 * the ending lines, then lets the player continue into free-roam. Its own scene on top of the
 * world + HUD.
 */
export class GameWonScene extends Phaser.Scene {
  private payload!: GameWonData;

  constructor() {
    super(GAMEWON_SCENE);
  }

  init(data: GameWonData): void {
    this.payload = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(0, 0, width, height, 0x04060c, 0.95).setOrigin(0, 0).setInteractive();

    // Departure scene: a starfield backdrop, Earth in the distance, and the restored ship
    // flying toward it. Degrades to the text-only ending if the art isn't available.
    if (this.textures.exists(texEnding('starfield'))) {
      const stars = this.add.image(cx, height / 2, texEnding('starfield'))
        .setAlpha(0.5)
        .setDisplaySize(Math.max(width, 512), Math.max(height, 512));
      stars.setDepth(-2);
    }
    if (this.textures.exists(texEnding('earth'))) {
      this.add.image(width - 150, height - 160, texEnding('earth')).setScale(0.8).setDepth(-1);
    }
    if (this.textures.exists(texEnding('ship'))) {
      const ship = this.add.image(-120, height - 220, texEnding('ship')).setDepth(0);
      // Fly the ship across toward Earth, then gently bob.
      this.tweens.add({
        targets: ship,
        x: width - 320,
        y: height - 200,
        duration: 4000,
        ease: 'Sine.easeInOut',
      });
    }

    this.add
      .text(cx, 70, 'SHIP RESTORED', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#50fa7b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    ENDING_LINES.forEach((line, i) => {
      this.add
        .text(cx, 150 + i * 30, line, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#c8d0e0',
          align: 'center',
          wordWrap: { width: width - 120 },
        })
        .setOrigin(0.5, 0);
    });

    const btn = this.add
      .rectangle(cx, height - 80, 260, 46, 0x1f6f6a)
      .setStrokeStyle(2, 0x3fd1c7)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, height - 80, 'CONTINUE (free-roam)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#eafbf8',
      })
      .setOrigin(0.5);

    const go = (): void => {
      this.payload.onContinue();
      this.scene.stop();
    };
    btn.on('pointerdown', go);
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'Space') go();
    });
  }
}
