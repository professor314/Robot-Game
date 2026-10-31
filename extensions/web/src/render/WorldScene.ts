import Phaser from 'phaser';
import { Commands } from '../core/commands';
import { GameEvent } from '../core/events';
import { ROOM_HEIGHT, ROOM_WIDTH, Room } from '../core/room';
import { WorldState } from '../core/state';
import { TileKind } from '../core/tiles';
import { Direction } from '../data/world';
import { MISSIONS } from '../data/missions';
import { ALL_BOSSES } from '../data/bosses';
import { AudioManager } from '../audio/AudioManager';
import { Persistence } from './persistence';
import { gameFeel, toggleGameFeel } from './settings';
import {
  EnemyArt,
  TILE,
  TextureKey,
  artReady,
  texDoor,
  texEnemy,
  texFloor,
  texItem,
  texJunk,
  texPlayer,
  texProp,
  texWall,
} from './textures';

/** Scene key for the world scene. */
export const WORLD_SCENE = 'World';

/** Pixel gap left between adjacent rooms so doorways read as corridors. */
const ROOM_GAP = TILE;
const ROOM_PX_W = ROOM_WIDTH * TILE;
const ROOM_PX_H = ROOM_HEIGHT * TILE;
const ROOM_STRIDE_X = ROOM_PX_W + ROOM_GAP;
const ROOM_STRIDE_Y = ROOM_PX_H + ROOM_GAP;

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
  /** Item sprite per item id (hidden when collected). */
  private readonly itemSprites = new Map<string, Phaser.GameObjects.Image>();
  /** Prop sprite keyed by "roomKey:x,y" so interactive props (ore) can be removed on mine. */
  private readonly propSprites = new Map<string, Phaser.GameObjects.Image>();
  /** Install-point marker per room, hidden once its component is installed. */
  private readonly installMarkers = new Map<string, Phaser.GameObjects.Image>();
  private offsetX = 0;
  private offsetY = 0;
  /** Whether SVG art is available (vs. placeholder textures). */
  private useArt = false;
  private readonly audio = new AudioManager();
  private audioStarted = false;
  /** True once the player is defeated; freezes the world until a restart. */
  private gameOver = false;
  /** Chosen bot id and whether to resume a save, passed in from the select screen. */
  private botId = 'dome';
  private resume = false;
  /** Timestamp of the last accepted movement, for chassis-speed input throttling. */
  private lastMoveAt = 0;

  constructor() {
    super(WORLD_SCENE);
  }

  init(data: { botId?: string; resume?: boolean }): void {
    this.botId = data.botId ?? this.botId;
    this.resume = data.resume ?? false;
  }

  create(): void {
    this.state = new WorldState({ botId: this.botId });
    // Resume a prior session only when asked (Continue from the select screen / reload).
    if (this.resume && Persistence.hasSave()) Persistence.load(this.state);
    this.useArt = artReady(this);

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

    this.cameras.main.setBackgroundColor('#06070d');
    // Continuously follow the player so they stay centered — including in edge rooms (the
    // padded bounds below let the camera scroll past the world edge). The lerp gives a smooth
    // glide on room transitions without the one-shot-pan getting stuck.
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitCamera();

    // Re-fit the camera whenever the window (and thus the canvas) resizes.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });

    // Launch the HUD as an overlay scene, handing it this scene so it can read Core state.
    this.scene.launch('Hud', { world: this });

    // Show the wake-up intro on a fresh game (not when resuming, and not if already seen).
    if (this.state.story.phase === 'intro' && !this.state.story.introSeen) {
      this.scene.launch('Intro', { world: this });
    }
  }

  /**
   * Zoom the camera so a full room (plus a margin for the doorway gaps and HUD) always fits the
   * current viewport, at any window size. This is what guarantees you can see the whole room
   * even on a small window.
   */
  private fitCamera(): void {
    const cam = this.cameras.main;
    // Target view: one room plus a tile of margin on each side, and headroom for the HUD.
    const viewW = ROOM_PX_W + ROOM_GAP * 2;
    const viewH = ROOM_PX_H + ROOM_GAP * 2 + 48;
    const zoom = Math.min(cam.width / viewW, cam.height / viewH);
    cam.setZoom(Math.max(0.25, zoom));

    // Pad the camera bounds by half a viewport (in world units) on every side. Without this,
    // Phaser clamps the scroll to the world rectangle, so the player can't be centered in an
    // edge room and gets stuck against the screen edge. The padding lets the camera scroll
    // past the world edge far enough to always center the player.
    const world = this.worldBounds();
    const padX = cam.width / cam.zoom / 2;
    const padY = cam.height / cam.zoom / 2;
    cam.setBounds(-padX, -padY, world.w + padX * 2, world.h + padY * 2);
  }

  /** Phaser render loop: advance the deterministic Core clock and sync hostile sprites. */
  update(_time: number, delta: number): void {
    if (this.gameOver) return;
    this.state.tick(delta);
    this.syncHostiles();
    // Music context: boss theme if a live boss shares the room (major boss → its own theme),
    // else combat if any hostile is here, else exploration.
    const here = this.state.hostilesInCurrentRoom();
    const boss = here.find((h) => h.bossId);
    if (boss) this.audio.setContext(boss.major ? 'majorBoss' : 'boss');
    else this.audio.setContext(here.length > 0 ? 'combat' : 'exploration');
  }

  /** Freeze the world and show the GAME OVER overlay with a restart option. */
  private showGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.audio.setContext('exploration');
    this.scene.launch('GameOver', {
      level: this.state.progression.level,
      credits: this.state.progression.credits,
      onRestart: () => this.restartGame(),
    });
  }

  /** Full reset: clear the save and return to the pick-your-bot screen. */
  private restartGame(): void {
    Persistence.clear();
    this.gameOver = false;
    this.scene.stop('Hud');
    this.scene.start('SelectBot');
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

  /**
   * Place an SVG texture at a tile, scaled to `fit` pixels, falling back to a placeholder key
   * if the art isn't loaded. SVGs are rasterized larger than a tile, so we always rescale.
   */
  private place(x: number, y: number, texKey: string, fallback: string, fit: number): Phaser.GameObjects.Image {
    const key = this.useArt && this.textures.exists(texKey) ? texKey : fallback;
    const img = this.add.image(x, y, key);
    const native = Math.max(img.width, img.height) || fit;
    img.setScale(fit / native);
    return img;
  }

  /** Texture key for a tile kind, honoring this room's chosen floor/wall/door style. */
  private tileTexture(room: Room, kind: TileKind): string | null {
    switch (kind) {
      case TileKind.Floor:
        return texFloor(room.floorStyle);
      case TileKind.Wall:
        return texWall(room.wallStyle);
      case TileKind.Door:
        return texDoor(room.doorStyle);
      default:
        return null;
    }
  }

  private placeholderForTile(kind: TileKind): string {
    if (kind === TileKind.Wall) return TextureKey.Wall;
    if (kind === TileKind.Door) return TextureKey.Door;
    return TextureKey.Floor;
  }

  /** Texture key for a prop; ore deposits use their junk-variant art, themed props their own. */
  private propTexture(kind: string, junk?: string): string {
    if (kind === 'ore') return texJunk(junk ?? 'ore');
    if (kind === 'healStation') return texItem('healStation');
    if (this.textures.exists(texProp(kind))) return texProp(kind);
    if (kind === 'debris') return texJunk('hull');
    return texProp('crate');
  }

  /** Texture key for an item kind. */
  private itemTexture(kind: string): string {
    if (
      kind === 'miningLaser' ||
      kind === 'weaponUpgrade' ||
      kind === 'loot' ||
      kind === 'recipe' ||
      kind === 'keycard' ||
      kind === 'component'
    ) {
      return texItem(kind);
    }
    // Salvage resource items reuse the matching junk art.
    return texJunk(kind === 'scrap' ? 'scrap' : kind === 'cell' ? 'cell' : 'crystal');
  }

  /** Build a container of tile images, props, and items for every room; fog hides it until visited. */
  private drawRooms(): void {
    for (const room of this.state.graph.rooms.values()) {
      const { ox, oy } = this.roomOrigin(room);
      const container = this.add.container(ox, oy);
      for (let x = 0; x < ROOM_WIDTH; x++) {
        for (let y = 0; y < ROOM_HEIGHT; y++) {
          const kind = room.tiles[x][y];
          const tex = this.tileTexture(room, kind);
          if (!tex) continue;
          const img = this.place(x * TILE + TILE / 2, y * TILE + TILE / 2, tex, this.placeholderForTile(kind), TILE);
          container.add(img);
        }
      }

      // Props: decorative/structural + mineable junk. Registered by position so interactive
      // props (ore/junk deposits) can be removed from the scene when mined.
      for (const prop of room.props) {
        const img = this.place(
          prop.x * TILE + TILE / 2,
          prop.y * TILE + TILE / 2,
          this.propTexture(prop.kind, prop.junk),
          TextureKey.Wall,
          TILE * 0.95,
        );
        img.setDepth(2);
        container.add(img);
        this.propSprites.set(`${room.key}:${prop.x},${prop.y}`, img);
      }

      // Items: interactive pickups, tracked so they can be hidden on pickup.
      for (const item of room.items) {
        const img = this.place(
          item.x * TILE + TILE / 2,
          item.y * TILE + TILE / 2,
          this.itemTexture(item.kind),
          TextureKey.Door,
          TILE * 0.75,
        );
        img.setDepth(3).setVisible(!item.collected);
        container.add(img);
        this.itemSprites.set(item.id, img);
      }

      // Install-point marker (if this room is a mission install point, near the room centre).
      if (MISSIONS.some((m) => m.installRoomKey === room.key)) {
        const cx = Math.floor(ROOM_WIDTH / 2);
        const cy = Math.floor(ROOM_HEIGHT / 2) - 1;
        const marker = this.place(
          cx * TILE + TILE / 2,
          cy * TILE + TILE / 2,
          texItem('installPoint'),
          TextureKey.Door,
          TILE,
        );
        marker.setDepth(1).setVisible(!room.componentInstalled);
        container.add(marker);
        this.installMarkers.set(room.key, marker);
      }

      container.setVisible(room.visited);
      this.roomLayers.set(room.key, container);
    }
  }

  /** Enemy art for a hostile: bosses use their data art; patrols/named map to a type. */
  private enemyArt(h: { id: string; bossId?: string; brain?: string | null }): EnemyArt {
    if (h.bossId) {
      const seed = ALL_BOSSES.find((b) => b.id === h.bossId);
      if (seed) return seed.art;
    }
    // Map the brain type to a matching sprite.
    const byBrain: Record<string, EnemyArt> = {
      sentry: 'sentry',
      drone: 'drone',
      crawler: 'crawler',
      hunter: 'hunter',
      hostile: 'crawler',
    };
    return byBrain[h.brain ?? 'hostile'] ?? 'crawler';
  }

  private drawHostiles(): void {
    for (const h of this.state.hostiles) {
      const room = this.state.graph.rooms.get(h.roomKey);
      if (!room) continue;
      const { ox, oy } = this.roomOrigin(room);
      // Bosses are rendered larger; the major boss larger still.
      const scale = h.bossId ? (h.major ? TILE * 2.2 : TILE * 1.7) : TILE * 1.15;
      const sprite = this.place(
        ox + h.x * TILE + TILE / 2,
        oy + h.y * TILE + TILE / 2,
        texEnemy(this.enemyArt(h)),
        TextureKey.Hostile,
        scale,
      )
        .setVisible(room.visited && !h.defeated)
        .setDepth(h.bossId ? 9 : 8);
      if (h.bossId) sprite.setTint(0xffb3b3); // bosses read redder/meaner
      this.hostileSprites.set(h.id, sprite);
    }
  }

  private drawPlayer(): void {
    const p = this.state.player;
    const room = this.state.currentRoom;
    const { ox, oy } = this.roomOrigin(room);
    this.player = this.place(
      ox + p.x * TILE + TILE / 2,
      oy + p.y * TILE + TILE / 2,
      texPlayer(this.state.botId),
      TextureKey.Player,
      TILE * 1.2,
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
      if (ev.code === 'KeyE') {
        ev.preventDefault();
        this.state.apply(Commands.interact());
        return;
      }
      if (ev.code === 'KeyQ') {
        ev.preventDefault();
        this.state.apply(Commands.useSkill('overclock'));
        return;
      }
      if (ev.code === 'KeyZ') {
        ev.preventDefault();
        this.state.apply(Commands.useSkill('repair'));
        return;
      }
      if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
        ev.preventDefault();
        this.state.apply(Commands.dash());
        return;
      }
      if (ev.code === 'KeyR') {
        ev.preventDefault();
        this.state.apply(Commands.rangedAttack());
        return;
      }
      if (ev.code === 'KeyT') {
        ev.preventDefault();
        if (!this.scene.isActive('Map')) this.scene.launch('Map', { world: this });
        return;
      }
      if (ev.code === 'KeyL') {
        ev.preventDefault();
        if (!this.scene.isActive('Logs')) this.scene.launch('Logs', { world: this });
        return;
      }
      if (ev.code === 'KeyV') {
        ev.preventDefault();
        if (this.state.player.roomKey === this.state.vendorRoom && !this.scene.isActive('Vendor')) {
          this.scene.launch('Vendor', { world: this });
        } else if (this.state.player.roomKey !== this.state.vendorRoom) {
          this.state.events.emit({ type: 'log', message: 'No vendor here', tone: 'bad' });
        }
        return;
      }
      const dir = KEY_DIR[ev.code];
      if (!dir) return;
      ev.preventDefault();
      // Throttle held/repeated movement to the chassis's cadence (its "speed").
      const now = this.time.now;
      if (now - this.lastMoveAt < this.state.moveIntervalMs) return;
      this.lastMoveAt = now;
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
    this.cameras.main.centerOn(this.player.x, this.player.y);
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
        // Camera follow (set up in create) smoothly glides to the player's new room.
        break;
      case 'attacked':
        this.playHitFeedback(e.targetId, e.damage);
        this.audio.sfx(e.targetId === this.state.player.id ? 'damage' : 'hit');
        break;
      case 'reward':
        this.audio.sfx('pickup');
        break;
      case 'leveledUp':
        this.audio.sfx('levelup');
        break;
      case 'pickedUp':
        this.itemSprites.get(e.itemId)?.setVisible(false);
        this.audio.sfx('pickup');
        break;
      case 'mined':
        this.onMined(e.roomKey, e.x, e.y);
        break;
      case 'healed':
        this.audio.sfx('levelup');
        this.floatText(this.player, `+${e.amount}`, '#5affa0', 22);
        break;
      case 'weaponUpgraded':
        this.audio.sfx('levelup');
        this.floatText(this.player, 'WEAPON +', '#8be0ff', 20);
        break;
      case 'lootDropped':
        this.spawnItemSprite(e.roomKey, e.itemId);
        break;
      case 'defeated':
        this.audio.sfx('defeat');
        if (e.entityId === this.state.player.id) this.showGameOver();
        break;
      // --- v3 ---
      case 'componentInstalled':
        this.installMarkers.get(this.state.currentRoom.key)?.setVisible(false);
        this.audio.sfx('levelup');
        this.floatText(this.player, 'INSTALLED', '#5affa0', 20);
        break;
      case 'keyFound':
        this.audio.sfx('pickup');
        this.floatText(this.player, 'KEY', '#ffb86c', 20);
        break;
      case 'componentRecovered':
        this.audio.sfx('levelup');
        break;
      case 'dashed':
        this.syncPlayerSprite();
        this.audio.sfx('move');
        this.flashSprite(this.player, 0x8be9fd);
        break;
      case 'rangedFired':
        this.audio.sfx('hit');
        this.drawProjectile(e.fromX, e.fromY, e.toX, e.toY);
        break;
      case 'knockback':
        this.syncPlayerSprite();
        this.cameras.main.shake(100, 0.008);
        break;
      case 'telegraph': {
        const s = this.hostileSprites.get(e.entityId);
        if (s) this.telegraphFlash(s, e.windupMs);
        this.audio.sfx('damage');
        break;
      }
      case 'bossEngaged':
        this.audio.setContext(e.major ? 'majorBoss' : 'boss');
        break;
      case 'bossDefeated':
        this.hostileSprites.get(`boss:${e.bossId}`)?.setVisible(false);
        this.audio.sfx('defeat');
        break;
      case 'purchased':
        this.audio.sfx('pickup');
        break;
      case 'gameWon':
        this.showGameWon();
        break;
      default:
        break;
    }
  }

  /** Brief tint flash on a sprite (dash cue, etc.). */
  private flashSprite(sprite: Phaser.GameObjects.Image, color: number): void {
    sprite.setTint(color);
    this.time.delayedCall(140, () => sprite.clearTint());
  }

  /** Pulse a boss sprite red during its heavy-attack wind-up so the player can dodge. */
  private telegraphFlash(sprite: Phaser.GameObjects.Image, windupMs: number): void {
    this.tweens.add({
      targets: sprite,
      alpha: 0.4,
      yoyo: true,
      repeat: Math.max(1, Math.floor(windupMs / 150)),
      duration: 150,
      onComplete: () => sprite.setAlpha(1),
    });
    sprite.setTint(0xff3b3b);
    this.time.delayedCall(windupMs, () => sprite.setTint(0xffb3b3));
  }

  /** Draw a short-lived projectile streak from one tile to another in the current room. */
  private drawProjectile(fx: number, fy: number, tx: number, ty: number): void {
    const { ox, oy } = this.roomOrigin(this.state.currentRoom);
    const a = { x: ox + fx * TILE + TILE / 2, y: oy + fy * TILE + TILE / 2 };
    const b = { x: ox + tx * TILE + TILE / 2, y: oy + ty * TILE + TILE / 2 };
    const shot = this.place(a.x, a.y, texItem('projectile'), TextureKey.Door, TILE * 0.6).setDepth(12);
    this.tweens.add({
      targets: shot,
      x: b.x,
      y: b.y,
      duration: 120,
      onComplete: () => shot.destroy(),
    });
  }

  /** Show the victory ending scene. */
  private showGameWon(): void {
    this.gameOver = true; // freeze world input/update
    this.audio.setContext('exploration');
    this.scene.launch('GameWon', {
      onContinue: () => {
        this.gameOver = false;
        this.state.story.enterFreeRoam();
      },
    });
  }

  /** Remove a mined ore prop's sprite from the scene. */
  private onMined(roomKey: string, x: number, y: number): void {
    const key = `${roomKey}:${x},${y}`;
    const sprite = this.propSprites.get(key);
    if (sprite) {
      sprite.destroy();
      this.propSprites.delete(key);
    }
    this.audio.sfx('pickup');
  }

  /** Spawn a sprite for an item that appeared at runtime (e.g. loot dropped by an enemy). */
  private spawnItemSprite(roomKey: string, itemId: string): void {
    const room = this.state.graph.rooms.get(roomKey);
    const container = this.roomLayers.get(roomKey);
    if (!room || !container) return;
    const item = room.items.find((it) => it.id === itemId);
    if (!item || this.itemSprites.has(itemId)) return;
    const img = this.place(
      item.x * TILE + TILE / 2,
      item.y * TILE + TILE / 2,
      this.itemTexture(item.kind),
      TextureKey.Door,
      TILE * 0.75,
    );
    img.setDepth(3).setVisible(!item.collected && room.visited);
    container.add(img);
    this.itemSprites.set(itemId, img);
  }

  /** Resolve the sprite for an entity id (player or a hostile). */
  private spriteFor(entityId: string): Phaser.GameObjects.Image | undefined {
    return entityId === this.state.player.id ? this.player : this.hostileSprites.get(entityId);
  }

  /**
   * Lightweight game feel on a hit: flash the struck sprite, float a big damage number, and
   * shake the camera when the player is struck. Player damage is red; enemy damage is purple
   * (easier to read than the old yellow). Respects the `gameFeel` settings toggle.
   */
  private playHitFeedback(targetId: string, damage: number): void {
    if (!gameFeel.enabled) return;
    const sprite = this.spriteFor(targetId);
    if (!sprite) return;

    // Hit flash.
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => sprite.clearTint());

    const isPlayer = targetId === this.state.player.id;
    this.floatText(sprite, `-${damage}`, isPlayer ? '#ff6b6b' : '#c77dff', 26);

    // Screen shake only when the player takes damage.
    if (isPlayer) this.cameras.main.shake(120, 0.006);
  }

  /**
   * Float a label upward above a target sprite, fading out. Used for damage numbers, heals, and
   * weapon-upgrade cues. Numbers are large and linger ~1.8s so hits are easy to read.
   */
  private floatText(
    target: Phaser.GameObjects.Image,
    text: string,
    color: string,
    fontSize: number,
  ): void {
    const label = this.add
      .text(target.x, target.y - TILE / 2, text, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: label,
      y: label.y - 34,
      alpha: 0,
      duration: 1800,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
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

}
