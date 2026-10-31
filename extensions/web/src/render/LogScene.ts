import Phaser from 'phaser';
import { LOG_ENTRIES } from '../data/logs';
import { WorldScene } from './WorldScene';

/** Scene key for the discovered-logs viewer. */
export const LOG_SCENE = 'Logs';

/** Data passed in when the logs viewer opens. */
export interface LogData {
  world: WorldScene;
}

/**
 * A reader for the environmental log entries the player has discovered. Narrative only; shows
 * the full text of each read log so the story can be pieced together and re-read.
 */
export class LogScene extends Phaser.Scene {
  private world!: WorldScene;

  constructor() {
    super(LOG_SCENE);
  }

  init(data: LogData): void {
    this.world = data.world;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.92).setOrigin(0, 0).setInteractive();
    this.add
      .text(width / 2, 30, 'DATA LOGS  (L/Esc to close)', {
        fontFamily: 'monospace', fontSize: '18px', color: '#8be9fd',
      })
      .setOrigin(0.5);

    const read = this.world.state.story.logsRead;
    const found = LOG_ENTRIES.filter((l) => read.has(l.id));

    if (found.length === 0) {
      this.add
        .text(width / 2, height / 2, 'No logs recovered yet.\nFind terminals in rooms (press E).', {
          fontFamily: 'monospace', fontSize: '14px', color: '#9aa4bd', align: 'center',
        })
        .setOrigin(0.5);
    } else {
      let y = 70;
      for (const log of found) {
        this.add.text(40, y, `◾ ${log.title} (${log.roomKey})`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#ff92d0',
        });
        y += 22;
        const body = this.add.text(56, y, log.text, {
          fontFamily: 'monospace', fontSize: '12px', color: '#c8d0e0',
          wordWrap: { width: width - 120 }, lineSpacing: 3,
        });
        y += body.height + 18;
      }
    }

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyL' || ev.code === 'Escape') this.scene.stop();
    });
  }
}
