import Phaser from 'phaser';
import { GameEvent } from '../core/events';
import { WorldScene } from './WorldScene';

/** Scene key for the HUD overlay. */
export const HUD_SCENE = 'Hud';

/** Max lines kept in the scrolling event log. */
const LOG_LINES = 6;

/**
 * A transparent overlay scene that draws the HUD on top of the world: an integrity bar,
 * level/XP/credits, the current room name, and a scrolling event log. It never reads or
 * mutates Core state directly beyond rendering — it is driven by the Core event stream plus a
 * once-per-frame read of the player's stats, keeping game rules entirely in Core_Logic.
 */
export class HudScene extends Phaser.Scene {
  private world!: WorldScene;
  private barFill!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private readonly logLines: string[] = [];

  constructor() {
    super(HUD_SCENE);
  }

  init(data: { world: WorldScene }): void {
    this.world = data.world;
  }

  create(): void {
    const style = { fontFamily: 'monospace', fontSize: '14px', color: '#c8d0e0' };

    // Integrity bar (top-left).
    this.add.text(10, 8, 'INTEGRITY', { ...style, fontSize: '11px', color: '#8892a6' });
    this.add.rectangle(10, 24, 180, 14, 0x20222e).setOrigin(0, 0);
    this.barFill = this.add.rectangle(11, 25, 178, 12, 0x3fd1c7).setOrigin(0, 0);

    this.statusText = this.add.text(10, 44, '', style);
    this.roomText = this.add.text(10, 64, '', { ...style, color: '#bdeaf6' });

    // Event log (bottom-left).
    this.logText = this.add.text(10, this.scale.height - 110, '', {
      ...style,
      fontSize: '12px',
      color: '#9aa4bd',
      lineSpacing: 2,
    });

    this.add.text(
      this.scale.width - 430,
      8,
      'move: WASD/arrows  attack: space  save: O  load: P  mute: M',
      { ...style, fontSize: '11px', color: '#6b7488' },
    );

    this.world.state.events.on((e) => this.onGameEvent(e));
    this.refresh();
  }

  update(): void {
    this.refresh();
  }

  private refresh(): void {
    const p = this.world.state.player;
    const prog = this.world.state.progression;
    const frac = Math.max(0, p.stats.integrity / p.stats.maxIntegrity);
    this.barFill.width = 178 * frac;
    this.barFill.fillColor = frac > 0.5 ? 0x3fd1c7 : frac > 0.25 ? 0xe0b43f : 0xd8453f;

    this.statusText.setText(
      `LV ${prog.level}   XP ${prog.totalXp}   CR ${prog.credits}` +
        (p.defeated ? '   [OFFLINE — rebooting]' : ''),
    );
    this.roomText.setText(this.world.state.currentRoom.key);
  }

  private onGameEvent(e: GameEvent): void {
    switch (e.type) {
      case 'attacked':
        this.pushLog(`${this.shortId(e.attackerId)} hits ${this.shortId(e.targetId)} for ${e.damage}`);
        break;
      case 'defeated':
        this.pushLog(`${this.shortId(e.entityId)} defeated`);
        break;
      case 'reward':
        this.pushLog(`+${e.xp} XP, +${e.credits} CR${e.salvage.length ? `, salvage: ${e.salvage.join(', ')}` : ''}`);
        break;
      case 'leveledUp':
        this.pushLog(`LEVEL UP → ${e.level}`);
        break;
      case 'respawned':
        this.pushLog(`${this.shortId(e.entityId)} back online`);
        break;
      case 'roomEntered':
        if (e.firstVisit) this.pushLog(`entered ${e.roomKey}`);
        break;
      case 'log':
        this.pushLog(e.message);
        break;
      default:
        break;
    }
  }

  /** Trim the "hostile:" prefix / "player" id down to a readable label. */
  private shortId(id: string): string {
    if (id === 'player') return 'you';
    return id.replace(/^hostile:/, '');
  }

  private pushLog(line: string): void {
    this.logLines.push(line);
    while (this.logLines.length > LOG_LINES) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }
}
