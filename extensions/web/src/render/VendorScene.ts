import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { VENDOR_GOODS } from '../data/vendor';
import { WorldScene } from './WorldScene';

/** Scene key for the vendor shop. */
export const VENDOR_SCENE = 'Vendor';

/** Data passed in when the vendor opens. */
export interface VendorData {
  world: WorldScene;
}

/**
 * The vendor shop — buy goods with credits (number keys). A single-room shop distinct from the
 * material-based fabricator. Re-renders each frame so credit totals and affordability update
 * live as purchases happen.
 */
export class VendorScene extends Phaser.Scene {
  private world!: WorldScene;
  private listText!: Phaser.GameObjects.Text;
  private creditText!: Phaser.GameObjects.Text;

  constructor() {
    super(VENDOR_SCENE);
  }

  init(data: VendorData): void {
    this.world = data.world;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.9).setOrigin(0, 0).setInteractive();
    this.add
      .text(width / 2, 40, 'VENDOR  (press a number to buy · V/Esc to close)', {
        fontFamily: 'monospace', fontSize: '16px', color: '#8be9fd',
      })
      .setOrigin(0.5);

    this.creditText = this.add.text(width / 2, 70, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffb86c',
    }).setOrigin(0.5);

    this.listText = this.add.text(width / 2 - 220, 110, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8d0e0', lineSpacing: 6,
    });

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyV' || ev.code === 'Escape') { this.scene.stop(); return; }
      const m = /^Digit([1-9])$/.exec(ev.code);
      if (m) {
        const good = VENDOR_GOODS[Number(m[1]) - 1];
        if (good) this.world.state.apply(Commands.buy(good.id));
      }
    });

    this.refresh();
  }

  update(): void {
    this.refresh();
  }

  private refresh(): void {
    const credits = this.world.state.progression.credits;
    this.creditText.setText(`Credits: ${credits}`);
    const lines = VENDOR_GOODS.map((g, i) => {
      const afford = credits >= g.price ? '' : '  [need credits]';
      return `${i + 1}. ${g.name} — ${g.price} CR${afford}\n     ${g.description}`;
    });
    this.listText.setText(lines.join('\n'));
  }
}
