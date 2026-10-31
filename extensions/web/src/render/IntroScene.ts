import Phaser from 'phaser';
import { INTRO_LINES } from '../data/story';
import { WorldScene } from './WorldScene';

/** Scene key for the wake-up intro overlay. */
export const INTRO_SCENE = 'Intro';

/** Data passed in when the intro shows. */
export interface IntroData {
  world: WorldScene;
}

/**
 * The wake-up intro: a short, dismissable overlay that frames the restore-the-ship goal. Shown
 * once on a new game (not on resume). Dismissing it advances the story to the restoring phase.
 */
export class IntroScene extends Phaser.Scene {
  private world!: WorldScene;

  constructor() {
    super(INTRO_SCENE);
  }

  init(data: IntroData): void {
    this.world = data.world;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.rectangle(0, 0, width, height, 0x04060c, 0.95).setOrigin(0, 0).setInteractive();

    INTRO_LINES.forEach((line, i) => {
      this.add
        .text(cx, 120 + i * 40, line, {
          fontFamily: 'monospace',
          fontSize: i === 0 ? '22px' : '16px',
          color: i === 0 ? '#8be9fd' : '#c8d0e0',
          align: 'center',
          wordWrap: { width: width - 120 },
        })
        .setOrigin(0.5, 0);
    });

    this.add
      .text(cx, height - 70, 'press any key to begin', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#50fa7b',
      })
      .setOrigin(0.5);

    const dismiss = (): void => {
      this.world.state.story.beginRestoring();
      this.scene.stop();
    };
    this.input.keyboard?.once('keydown', dismiss);
    this.input.once('pointerdown', dismiss);
  }
}
