import Phaser from 'phaser';

/** Scene key for the game-over overlay. */
export const GAMEOVER_SCENE = 'GameOver';

/** Data passed in when the overlay is launched. */
export interface GameOverData {
  /** Final level reached. */
  level: number;
  /** Credits accumulated this run. */
  credits: number;
  /** Called when the player chooses to start over. */
  onRestart: () => void;
}

/**
 * A modal "GAME OVER" overlay shown when the player's integrity hits zero. It dims the game,
 * reports the run, and offers a restart that fully resets the world. Clicking the button or
 * pressing Enter/R restarts. Rendered as its own scene on top of the world + HUD.
 */
export class GameOverScene extends Phaser.Scene {
  private payload!: GameOverData;

  constructor() {
    super(GAMEOVER_SCENE);
  }

  init(data: GameOverData): void {
    this.payload = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dim backdrop that also swallows input to the game underneath.
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.78).setOrigin(0, 0).setInteractive();

    this.add
      .text(cx, cy - 70, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#ff5a5a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 10, 'Unit integrity depleted. Station systems offline.', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#c8d0e0',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 20, `Reached level ${this.payload.level} · ${this.payload.credits} credits salvaged`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8892a6',
      })
      .setOrigin(0.5);

    // Restart button.
    const btnW = 220;
    const btnH = 48;
    const btn = this.add
      .rectangle(cx, cy + 90, btnW, btnH, 0x1f6f6a)
      .setStrokeStyle(2, 0x3fd1c7)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(cx, cy + 90, 'START OVER', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#eafbf8',
      })
      .setOrigin(0.5);

    const restart = (): void => this.restart();
    btn.on('pointerover', () => btn.setFillStyle(0x2a8f88));
    btn.on('pointerout', () => btn.setFillStyle(0x1f6f6a));
    btn.on('pointerdown', restart);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', restart);

    this.add
      .text(cx, cy + 140, 'press Enter or R', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7488',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'KeyR') {
        ev.preventDefault();
        this.restart();
      }
    });
  }

  private restart(): void {
    this.payload.onRestart();
    this.scene.stop();
  }
}
