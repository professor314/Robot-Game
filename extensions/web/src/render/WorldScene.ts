import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { GameEvent } from '../core/events';
import { ROOM_HEIGHT, ROOM_WIDTH, Room } from '../core/room';
import { WorldState } from '../core/state';
import { TileKind } from '../core/tiles';
import { Direction } from '../data/world';
import { AudioManager } from '../audio/AudioManager';
import { Persistence } from './persistence';
import { gameFeel, toggleGameFeel } from './settings';
import {
  KENNEY_ATLAS,
  KenneyFrame,
  TILE,
  TextureKey,
  kenneyAtlasReady,
} from './textures';

/** Scene key for the world scene. */
export const WORLD_SCENE = 'World';

/** Pixel gap left between adjacent rooms so doorways read as corridors. */
const ROOM_GAP = TILE;
const ROOM_PX_W = ROOM_WIDTH * TILE;
const ROOM_PX_H = ROOM_HEIGHT * TILE;
const ROOM_STRIDE_X = ROOM_PX_W + ROOM_GAP;
const ROOM_STRIDE_Y = ROOM_PX_H + ROOM_GAP;

/** How long the camera takes to pan when entering a new room. */
const PAN_MS = 350;

/** Keyboard direction mapping. */
const KEY_DIR: Record<string, Direction> = {
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
  KeyW: 'north',
  KeyS: 'south',
  KeyA: 'west',
  KeyD: 'east',
};

/** Keys that trigger a player attack. */
const ATTACK_KEYS = new Set(['Space', 'KeyF']);

/**
 * Draws the solved room graph as a set of per-room tile grids at their layout coordinates,
 * renders the player, moves the player on a tile grid through Core commands (so wall
 * collision and room transitions live in the Core, not here), pans the camera toward the
 * travel direction on room change, and applies fog of war: unvisited rooms are hidden and
 * revealed permanently once entered.
 */
export class WorldScene extends Phaser.Scene {
  /** Public so the HUD scene can read state and subscribe to events. */
  state!: WorldState;
  private player!: Phaser.GameObjects.Image;
  /** Container per room key, holding that room's tile images. */
  private readonly roomLayers = new Map<string, Phaser.GameObjects.Container>();
  /** Hostile sprite per entity id. */
  private readonly hostileSprites = new Map<string, Phaser.GameObjects.Image>();
  private offsetX = 0;
  private offsetY = 0;
  /** Whether to render with the Kenney atlas (vs. placeholder textures). */
  private useAtlas = false;
  private readonly audio = new AudioManager();
  private audioStarted = false;

  constructor() {
    super(WORLD_SCENE);
  }

  create(): void {
    this.state = new WorldState();
    // Resume a prior session if one is stored (corrupt/incompatible saves are ignored).
    if (Persistence.hasSave()) Persistence.load(this.state);
    this.useAtlas = kenneyAtlasReady(this);

    // Normalize layout coords to non-negative so everything fits in world space.
    let minGX = Infinity;
    let minGY = Infinity;
    for (const room of this.state.graph.rooms.values()) {
      minGX = Math.min(minGX, room.gridX);
      minGY = Math.min(minGY, room.gridY);
    }
    this.offsetX = -minGX;
    this.offsetY = -minGY;

    this.drawRooms();
    this.drawHostiles();
    this.drawPlayer();

    this.state.events.on((e) => this.onGameEvent(e));
    this.bindInput();
    this.centerCameraOnPlayer(false);

    const bounds = this.worldBounds();
    this.cameras.main.setBounds(0, 0, bounds.w, bounds.h);
    this.cameras.main.setBackgroundColor('#06070d');

    // Launch the HUD as an overlay scene, handing it this scene so it can read Core state.
    this.scene.launch('Hud', { world: this });
  }

  /** Phaser render loop: advance the deterministic Core clock and sync hostile sprites. */
  update(_time: number, delta: number): void {
    this.state.tick(delta);
    this.syncHostiles();
    // Swap to combat music when a live hostile shares the player's room.
    this.audio.setContext(this.state.hostilesInCurrentRoom().length > 0 ? 'combat' : 'exploration');
  }

  /** Pixel origin of a room given its grid coordinates. */
  private roomOrigin(room: Room): { ox: number; oy: number } {
    return {
      ox: (room.gridX + this.offsetX) * ROOM_STRIDE_X,
      oy: (room.gridY + this.offsetY) * ROOM_STRIDE_Y,
    };
  }

  private worldBounds(): { w: number; h: number } {
    let maxGX = 0;
    let maxGY = 0;
    for (const room of this.state.graph.rooms.values()) {
      maxGX = Math.max(maxGX, room.gridX + this.offsetX);
      maxGY = Math.max(maxGY, room.gridY + this.offsetY);
    }
    return { w: (maxGX + 1) * ROOM_STRIDE_X, h: (maxGY + 1) * ROOM_STRIDE_Y };
  }

  /** Resolve the placeholder texture key for a tile kind. */
  private placeholderForTile(kind: TileKind): string | null {
    switch (kind) {
      case TileKind.Floor:
        return TextureKey.Floor;
      case TileKind.Wall:
        return TextureKey.Wall;
      case TileKind.Door:
        return TextureKey.Door;
      default:
        return null;
    }
  }

  /** Resolve the Kenney atlas frame for a tile kind. */
  private atlasFrameForTile(kind: TileKind): string | null {
    switch (kind) {
      case TileKind.Floor:
        return KenneyFrame.Floor;
      case TileKind.Wall:
        return KenneyFrame.Wall;
      case TileKind.Door:
        return KenneyFrame.Door;
      default:
        return null;
    }
  }

  /**
   * Create an image for a cell, using the Kenney atlas frame when available (scaled so its
   * larger native art fits the TILE grid) and falling back to the placeholder texture. `fit`
   * is the target size in pixels (full tile for terrain, slightly smaller for units); `tint`
   * optionally shades the frame so floor/wall/door read distinctly from the same tileset.
   */
  private makeSprite(
    x: number,
    y: number,
    atlasFrame: string | null,
    placeholderKey: string,
    fit: number,
    tint?: number,
  ): Phaser.GameObjects.Image {
    let img: Phaser.GameObjects.Image;
    if (this.useAtlas && atlasFrame && this.textures.get(KENNEY_ATLAS).has(atlasFrame)) {
      img = this.add.image(x, y, KENNEY_ATLAS, atlasFrame);
      const native = Math.max(img.width, img.height) || fit;
      img.setScale(fit / native);
      if (tint !== undefined) img.setTint(tint);
    } else {
      img = this.add.image(x, y, placeholderKey);
    }
    return img;
  }

  /** Tint applied to a tile kind when rendering from the atlas (undefined = no tint). */
  private tintForTile(kind: TileKind): number | undefined {
    switch (kind) {
      case TileKind.Wall:
        return 0x5a6072; // shade walls cool/dark so they read as structure
      case TileKind.Door:
        return 0x7fe0d6; // brighten doors
      default:
        return undefined;
    }
  }

  /** Build a container of tile images for every room, visibility driven by fog of war. */
  private drawRooms(): void {
    for (const room of this.state.graph.rooms.values()) {
      const { ox, oy } = this.roomOrigin(room);
      const container = this.add.container(ox, oy);
      for (let x = 0; x < ROOM_WIDTH; x++) {
        for (let y = 0; y < ROOM_HEIGHT; y++) {
          const kind = room.tiles[x][y];
          const placeholder = this.placeholderForTile(kind);
          if (!placeholder) continue;
          const img = this.makeSprite(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            this.atlasFrameForTile(kind),
            placeholder,
            TILE,
            this.tintForTile(kind),
          );
          container.add(img);
        }
      }
      container.setVisible(room.visited);
      this.roomLayers.set(room.key, container);
    }
  }

  private drawHostiles(): void {
    this.state.hostiles.forEach((h, i) => {
      const room = this.state.graph.rooms.get(h.roomKey);
      if (!room) return;
      const { ox, oy } = this.roomOrigin(room);
      const frame = KenneyFrame.Hostiles[i % KenneyFrame.Hostiles.length];
      const sprite = this.makeSprite(
        ox + h.x * TILE + TILE / 2,
        oy + h.y * TILE + TILE / 2,
        frame,
        TextureKey.Hostile,
        TILE * 0.9,
      )
        .setVisible(room.visited)
        .setDepth(8);
      this.hostileSprites.set(h.id, sprite);
    });
  }

  private drawPlayer(): void {
    const p = this.state.player;
    const room = this.state.currentRoom;
    const { ox, oy } = this.roomOrigin(room);
    this.player = this.makeSprite(
      ox + p.x * TILE + TILE / 2,
      oy + p.y * TILE + TILE / 2,
      KenneyFrame.Player,
      TextureKey.Player,
      TILE * 0.9,
    ).setDepth(10);
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      // Satisfy autoplay policy: start audio on the first key press.
      if (!this.audioStarted && this.audio.resume()) {
        this.audio.startMusic();
        this.audioStarted = true;
      }
      if (ev.code === 'KeyM') {
        ev.preventDefault();
        const muted = this.audio.toggleMute();
        this.state.events.emit({ type: 'log', message: `Audio ${muted ? 'muted' : 'on'}` });
        return;
      }
      if (ATTACK_KEYS.has(ev.code)) {
        ev.preventDefault();
        this.state.apply(Commands.attack());
        return;
      }
      if (ev.code === 'KeyG') {
        ev.preventDefault();
        const on = toggleGameFeel();
        this.state.events.emit({ type: 'log', message: `Game feel ${on ? 'on' : 'off'}` });
        return;
      }
      if (ev.code === 'KeyO') {
        ev.preventDefault();
        const ok = Persistence.save(this.state);
        this.state.events.emit({ type: 'log', message: ok ? 'Game saved' : 'Save failed' });
        return;
      }
      if (ev.code === 'KeyP') {
        ev.preventDefault();
        this.loadSave();
        return;
      }
      const dir = KEY_DIR[ev.code];
      if (!dir) return;
      ev.preventDefault();
      this.state.apply(Commands.move(dir));
    });
  }

  /** Load the stored save into the live world and resync all visuals. */
  private loadSave(): void {
    if (!Persistence.hasSave()) {
      this.state.events.emit({ type: 'log', message: 'No save found' });
      return;
    }
    const ok = Persistence.load(this.state);
    if (!ok) {
      this.state.events.emit({ type: 'log', message: 'Load failed (save cleared)' });
      return;
    }
    // Reapply fog visibility from restored visited flags.
    for (const [key, layer] of this.roomLayers) {
      layer.setVisible(this.state.graph.rooms.get(key)?.visited ?? false);
    }
    this.syncPlayerSprite();
    this.syncHostiles();
    this.centerCameraOnPlayer(false);
    this.state.events.emit({ type: 'log', message: 'Game loaded' });
  }

  /** Keep hostile sprites in sync with Core positions and alive/defeated state each frame. */
  private syncHostiles(): void {
    for (const h of this.state.hostiles) {
      const sprite = this.hostileSprites.get(h.id);
      if (!sprite) continue;
      const room = this.state.graph.rooms.get(h.roomKey);
      if (!room) continue;
      const { ox, oy } = this.roomOrigin(room);
      sprite.setPosition(ox + h.x * TILE + TILE / 2, oy + h.y * TILE + TILE / 2);
      sprite.setVisible(!h.defeated && room.visited);
    }
  }

  private onGameEvent(e: GameEvent): void {
    switch (e.type) {
      case 'moved':
        if (e.entityId === this.state.player.id) {
          this.syncPlayerSprite();
          this.audio.sfx('move');
        }
        break;
      case 'roomEntered':
        this.revealRoom(e.roomKey);
        break;
      case 'roomChanged':
        this.panToPlayer();
        break;
      case 'attacked':
        this.playHitFeedback(e.targetId, e.damage);
        this.audio.sfx(e.targetId === this.state.player.id ? 'damage' : 'hit');
        break;
      case 'defeated':
        this.audio.sfx('defeat');
        break;
      case 'reward':
        this.audio.sfx('pickup');
        break;
      case 'leveledUp':
        this.audio.sfx('levelup');
        break;
      default:
        break;
    }
  }

  /** Resolve the sprite for an entity id (player or a hostile). */
  private spriteFor(entityId: string): Phaser.GameObjects.Image | undefined {
    return entityId === this.state.player.id ? this.player : this.hostileSprites.get(entityId);
  }

  /**
   * Lightweight game feel on a hit: flash the struck sprite, float a damage number, and shake
   * the camera when the player is struck. All effects respect the `gameFeel` settings toggle.
   */
  private playHitFeedback(targetId: string, damage: number): void {
    if (!gameFeel.enabled) return;
    const sprite = this.spriteFor(targetId);
    if (!sprite) return;

    // Hit flash.
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => sprite.clearTint());

    // Floating damage number.
    const dmg = this.add
      .text(sprite.x, sprite.y - TILE / 2, `-${damage}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: targetId === this.state.player.id ? '#ff8a8a' : '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: dmg,
      y: dmg.y - 18,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => dmg.destroy(),
    });

    // Screen shake only when the player takes damage.
    if (targetId === this.state.player.id) this.cameras.main.shake(120, 0.006);
  }

  /** Reposition the player sprite to its current room/tile. */
  private syncPlayerSprite(): void {
    const p = this.state.player;
    const room = this.state.currentRoom;
    const { ox, oy } = this.roomOrigin(room);
    this.player.setPosition(ox + p.x * TILE + TILE / 2, oy + p.y * TILE + TILE / 2);
  }

  /** Make a room (and its hostiles) visible; fog of war reveal is permanent. */
  private revealRoom(roomKey: string): void {
    this.roomLayers.get(roomKey)?.setVisible(true);
    for (const h of this.state.hostiles) {
      if (h.roomKey === roomKey) this.hostileSprites.get(h.id)?.setVisible(true);
    }
  }

  private centerCameraOnPlayer(animate: boolean): void {
    if (animate) {
      this.panToPlayer();
    } else {
      this.cameras.main.centerOn(this.player.x, this.player.y);
    }
  }

  /** Pan the camera smoothly to center the player (used on room change). */
  private panToPlayer(): void {
    this.cameras.main.pan(this.player.x, this.player.y, PAN_MS, 'Sine.easeInOut');
  }
}
