import Phaser from 'phaser';
import { CREDITS, CREDITS_FOOTER } from '../data/credits';
import { ENDING_LINES } from '../data/story';
import { texEnding } from './textures';

/** Scene key for the victory / departure ending. */
export const GAMEWON_SCENE = 'GameWon';

/** Data passed in when the ending is shown. */
export interface GameWonData {
  /** Called when the player leaves the ending to keep playing (free-roam). */
  onContinue: () => void;
  /** Called once, when the ship powers up, so the caller can start the victory song. */
  onPowerUp?: () => void;
}

// Timeline, in milliseconds from the start of the scene.
const SUBTITLE_START = 800;
/** How long each story line stays on screen (it fades in and out inside this time). */
const SUBTITLE_EACH = 4400;
const POWER_UP_AT = 1800;
const LAUNCH_AT = 4200;
const CREDITS_START_AT = 3000;
/** Credits scroll speed in pixels per second. */
const CREDITS_SPEED = 55;
/** Enter-to-skip is ignored this long, so mashing the attack key at the boss kill can't skip it. */
const SKIP_LOCKOUT = 2500;
const SHIP_DIM = 0x2b3050;

/**
 * The ending. A dead ship drifts in front of Earth. It powers up, lights its engines and flies
 * toward the planet while the (all-robot) credits scroll, set to the slow victory song. When the
 * credits finish, a THE END card offers a way back into free-roam. Enter skips ahead.
 */
export class GameWonScene extends Phaser.Scene {
  private payload!: GameWonData;
  private t0 = 0;
  private done = false;
  private poweredUp = false;
  private endReadyAt = 0;

  private shipBox!: Phaser.GameObjects.Container;
  private flame!: Phaser.GameObjects.Graphics;
  private hull: Phaser.GameObjects.Image | null = null;
  private earth: Phaser.GameObjects.Image | null = null;
  private heading!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private skipHint!: Phaser.GameObjects.Text;
  private creditsBox: Phaser.GameObjects.Container | null = null;
  private endCard: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];

  /** Flight progress 0..1 (0 = drifting at the start, 1 = arrived at Earth). */
  private flight = 0;
  /** Engine output 0..1 (0 = cold). */
  private thrust = 0;
  private flightTween: Phaser.Tweens.Tween | null = null;
  private creditsTween: Phaser.Tweens.Tween | null = null;

  // Layout, computed in create().
  private unit = 1;
  private start = new Phaser.Math.Vector2();
  private ctrl = new Phaser.Math.Vector2();
  private target = new Phaser.Math.Vector2();

  constructor() {
    super(GAMEWON_SCENE);
  }

  init(data: GameWonData): void {
    this.payload = data;
    this.done = false;
    this.poweredUp = false;
    this.flight = 0;
    this.thrust = 0;
    this.hull = null;
    this.earth = null;
    this.creditsBox = null;
    this.endCard = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.unit = Math.min(width / 800, height / 600);
    this.t0 = this.time.now;

    // Layout: Earth up and to the right, the ship dormant lower left of it, credits on the left.
    this.target.set(width * 0.76, height * 0.36);
    this.start.set(width * 0.5, height * 0.72);
    this.ctrl.set(width * 0.62, height * 0.74);

    this.add.rectangle(0, 0, width, height, 0x04060c, 1).setOrigin(0, 0).setDepth(0).setInteractive();

    if (this.textures.exists(texEnding('starfield'))) {
      const stars = this.add
        .image(cx, height / 2, texEnding('starfield'))
        .setAlpha(0.3)
        .setDisplaySize(Math.max(width, 512), Math.max(height, 512))
        .setDepth(1);
      // A slow push-in so the sky is never quite still.
      this.tweens.add({ targets: stars, scale: stars.scale * 1.18, duration: 45000, ease: 'Linear' });
    }
    if (this.textures.exists(texEnding('earth'))) {
      this.earth = this.add
        .image(this.target.x, this.target.y, texEnding('earth'))
        .setScale(0.7 * this.unit)
        .setDepth(2)
        .setAlpha(0);
      this.tweens.add({ targets: this.earth, alpha: 1, duration: 1500 });
    }

    // The ship: hull image (cropped so its baked-in flame is hidden) plus a live flame we draw.
    this.flame = this.add.graphics();
    this.shipBox = this.add.container(this.start.x, this.start.y, [this.flame]).setDepth(3);
    if (this.textures.exists(texEnding('ship'))) {
      this.hull = this.add.image(0, 0, texEnding('ship')).setTint(SHIP_DIM);
      this.hull.setCrop(38, 0, 218, 160);
      this.shipBox.add(this.hull);
    }
    this.shipBox.setScale(0.8 * this.unit).setAlpha(0);
    this.tweens.add({ targets: this.shipBox, alpha: 1, duration: 1500 });

    // Heading and subtitles across the top.
    this.heading = this.add
      .text(cx, 34, 'SHIP RESTORED', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(40 * this.unit)}px`,
        color: '#50fa7b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(6)
      .setAlpha(0);
    this.subtitle = this.add
      .text(cx, 34 + 52 * this.unit, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(12, Math.round(16 * this.unit))}px`,
        color: '#c8d0e0',
        align: 'center',
        wordWrap: { width: width - 120 },
        stroke: '#04060c',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(6);
    ENDING_LINES.forEach((line, i) => {
      this.time.delayedCall(SUBTITLE_START + i * SUBTITLE_EACH, () => {
        if (this.done) return;
        this.subtitle.setText(line).setAlpha(0);
        this.tweens.add({ targets: this.subtitle, alpha: 1, duration: 400 });
        this.tweens.add({
          targets: this.subtitle,
          alpha: 0,
          delay: SUBTITLE_EACH - 500,
          duration: 400,
        });
      });
    });

    // Credits scroll up the left side.
    const colX = width * 0.26;
    const colW = Math.max(220, width * 0.42);
    const startY = height + 20;
    const { box, contentHeight } = this.buildCredits(colX, colW, startY);
    this.creditsBox = box;
    const scrollMs = ((startY + contentHeight + 20) / CREDITS_SPEED) * 1000;
    this.creditsTween = this.tweens.add({
      targets: box,
      y: -contentHeight - 20,
      delay: CREDITS_START_AT,
      duration: scrollMs,
      ease: 'Linear',
      onComplete: () => this.finish(),
    });

    // The ship flies for as long as the credits roll, accelerating toward Earth.
    this.flightTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: LAUNCH_AT,
      duration: CREDITS_START_AT + scrollMs - LAUNCH_AT,
      ease: 'Linear',
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        this.flight = tw.getValue() ?? 0;
      },
    });

    this.time.delayedCall(POWER_UP_AT, () => this.powerUp(true));

    this.skipHint = this.add
      .text(width - 16, height - 14, 'ENTER: skip', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6c7693',
      })
      .setOrigin(1, 1)
      .setDepth(7);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const sinceStart = this.time.now - this.t0;
      if (!this.done) {
        if (ev.code === 'Enter' && sinceStart > SKIP_LOCKOUT) this.finish();
        return;
      }
      if ((ev.code === 'Enter' || ev.code === 'Space') && this.time.now > this.endReadyAt) this.leave();
    });
  }

  update(time: number): void {
    // Ship placement along a curved path toward Earth.
    const p = Phaser.Math.Clamp(this.flight, 0, 1);
    const q = 1 - p;
    const bob = p === 0 ? Math.sin(time / 650) * 3 * this.unit : 0;
    const x = q * q * this.start.x + 2 * q * p * this.ctrl.x + p * p * this.target.x;
    const y = q * q * this.start.y + 2 * q * p * this.ctrl.y + p * p * this.target.y + bob;
    const tx = 2 * q * (this.ctrl.x - this.start.x) + 2 * p * (this.target.x - this.ctrl.x);
    const ty = 2 * q * (this.ctrl.y - this.start.y) + 2 * p * (this.target.y - this.ctrl.y);
    this.shipBox.setPosition(x, y);
    this.shipBox.setRotation(Math.atan2(ty, tx));
    this.shipBox.setScale((0.8 * q + 0.08 * p) * this.unit);
    if (p > 0.93) this.shipBox.setAlpha(Math.max(0, 1 - (p - 0.93) / 0.07));
    if (this.done) this.shipBox.setAlpha(0);

    // Earth swells a little as the ship closes in.
    this.earth?.setScale((0.7 + 0.4 * p) * this.unit);

    // Engine flame: a flickering two-layer cone behind the hull.
    this.flame.clear();
    if (this.thrust > 0.01 && !this.done) {
      const flick = 0.85 + 0.15 * Math.sin(time / 35) + 0.1 * Math.sin(time / 17);
      const boost = 1 + 0.5 * p;
      const len = 70 * this.thrust * flick * boost;
      this.flame.fillStyle(0xffb86c, 0.9);
      this.flame.fillTriangle(-86, -9, -86, 9, -86 - len, 0);
      this.flame.fillStyle(0xff92d0, 0.8);
      this.flame.fillTriangle(-86, -5, -86, 5, -86 - len * 0.6, 0);
    }
  }

  /** Stack the credit blocks into a container placed at `y = startY`. Returns its content height. */
  private buildCredits(
    colX: number,
    colW: number,
    startY: number,
  ): { box: Phaser.GameObjects.Container; contentHeight: number } {
    const u = Math.max(0.8, this.unit);
    const box = this.add.container(colX, startY).setDepth(5);
    const stroke = { stroke: '#04060c', strokeThickness: 4 };
    let y = 0;
    for (const section of CREDITS) {
      box.add(
        this.add
          .text(0, y, section.role, {
            fontFamily: 'monospace',
            fontSize: `${Math.round(13 * u)}px`,
            color: '#8be9fd',
            ...stroke,
          })
          .setOrigin(0.5, 0),
      );
      y += 24 * u;
      for (const name of section.names) {
        box.add(
          this.add
            .text(0, y, name, {
              fontFamily: 'monospace',
              fontSize: `${Math.round(17 * u)}px`,
              color: '#50fa7b',
              ...stroke,
            })
            .setOrigin(0.5, 0),
        );
        y += 27 * u;
      }
      y += 36 * u;
    }
    y += 20 * u;
    for (const line of CREDITS_FOOTER) {
      const t = this.add
        .text(0, y, line, {
          fontFamily: 'monospace',
          fontSize: `${Math.round(14 * u)}px`,
          color: '#ff92d0',
          align: 'center',
          wordWrap: { width: colW },
          ...stroke,
        })
        .setOrigin(0.5, 0);
      box.add(t);
      y += t.height + 14 * u;
    }
    return { box, contentHeight: y };
  }

  /** Bring the ship to life: lights flicker on, a ring pulses out, the engines catch. */
  private powerUp(animated: boolean): void {
    if (this.poweredUp) return;
    this.poweredUp = true;
    this.payload.onPowerUp?.();

    if (!animated || !this.hull) {
      this.hull?.clearTint();
      this.thrust = 1;
      return;
    }

    const steps: [number, number][] = [
      [0, 0x6a7396],
      [120, SHIP_DIM],
      [240, 0xa6b0d6],
      [330, SHIP_DIM],
      [450, 0xffffff],
    ];
    for (const [delay, tint] of steps) {
      this.time.delayedCall(delay, () => {
        if (!this.hull) return;
        if (tint === 0xffffff) this.hull.clearTint();
        else this.hull.setTint(tint);
      });
    }
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: 450,
      duration: 700,
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        this.thrust = tw.getValue() ?? 0;
      },
    });

    // A ring of light expanding from the ship.
    const ring = this.add.graphics().setDepth(4);
    const origin = { x: this.shipBox.x, y: this.shipBox.y };
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: 450,
      duration: 900,
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        const v = tw.getValue() ?? 0;
        ring.clear();
        ring.lineStyle(3, 0x50fa7b, 1 - v);
        ring.strokeCircle(origin.x, origin.y, (20 + 160 * v) * this.unit);
      },
      onComplete: () => ring.destroy(),
    });

    // Title card for the restored ship: held for about twice as long as before.
    this.tweens.add({ targets: this.heading, alpha: 1, delay: 450, duration: 500 });
    this.tweens.add({ targets: this.heading, alpha: 0, delay: 7450, duration: 800 });
  }

  /** Jump to the end card (credits finished, or skipped). */
  private finish(): void {
    if (this.done) return;
    this.powerUp(false);
    this.done = true;
    this.creditsTween?.stop();
    this.flightTween?.stop();
    this.flight = 1;
    this.creditsBox?.setVisible(false);
    this.heading.setVisible(false);
    this.subtitle.setVisible(false);
    this.skipHint.setVisible(false);
    this.flame.clear();

    const { width, height } = this.scale;
    const cx = width / 2;
    const u = Math.max(0.8, this.unit);
    this.endReadyAt = this.time.now + 700;

    const title = this.add
      .text(cx, height * 0.5, 'THE END', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(64 * u)}px`,
        color: '#50fa7b',
        fontStyle: 'bold',
        stroke: '#04060c',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(6);
    const thanks = this.add
      .text(cx, height * 0.5 + 56 * u, 'Thanks for playing.', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(18 * u)}px`,
        color: '#c8d0e0',
        stroke: '#04060c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(6);
    const btn = this.add
      .rectangle(cx, height - 80, 260, 46, 0x1f6f6a)
      .setStrokeStyle(2, 0x3fd1c7)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(cx, height - 80, 'CONTINUE (free-roam)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#eafbf8',
      })
      .setOrigin(0.5)
      .setDepth(7);
    btn.on('pointerdown', () => {
      if (this.time.now > this.endReadyAt) this.leave();
    });

    this.endCard = [title, thanks, btn, label];
    for (const o of this.endCard) o.setAlpha(0);
    this.tweens.add({ targets: this.endCard, alpha: 1, duration: 700 });
  }

  /** Close the ending and hand control back to the world. */
  private leave(): void {
    this.payload.onContinue();
    this.scene.stop();
  }
}
