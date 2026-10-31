import {
  DELTA,
  Direction,
  HOSTILES,
  HostileSeed,
  OPPOSITE,
  START_ROOM,
} from '../data/world';
import { HostileBrain, WorldView } from './ai';
import { CombatSystem, ICombatSystem } from './combat';
import { Command } from './commands';
import { Entity, EntityKind, Facing } from './entity';
import { EventBus } from './events';
import { Progression } from './progression';
import { RoomGraph } from './roomGraph';
import { ROOM_HEIGHT, ROOM_WIDTH, Room } from './room';
import { Rng } from './rng';
import { clampIntegrity } from './stats';

/** Maps a travel direction to the facing the player should adopt. */
const FACING: Record<Direction, Facing> = {
  north: 'up',
  south: 'down',
  east: 'right',
  west: 'left',
};

/** Tunable rules for player defeat and respawn. */
export interface WorldConfig {
  /** Room the player respawns in after defeat. */
  safeRoom: string;
  /** Fraction of max integrity lost as a penalty on player defeat (0..1). */
  defeatPenalty: number;
  /** Delay before the player respawns after defeat, in ms. */
  playerRespawnDelayMs: number;
}

/** Default world rules. */
export const DEFAULT_CONFIG: WorldConfig = {
  safeRoom: START_ROOM,
  defeatPenalty: 0.25,
  playerRespawnDelayMs: 2000,
};

/** Options for constructing the world state. */
export interface WorldOptions {
  seed?: number;
  startRoom?: string;
  config?: Partial<WorldConfig>;
  combat?: ICombatSystem;
}

/**
 * The authoritative in-memory game state: the room graph, every entity (player + hostiles),
 * progression, the combat system, and the event bus. Advanced deterministically by `tick(dt)`
 * using an injected seeded PRNG. Carries no Phaser/DOM dependency so it runs headless under
 * Vitest and the agent API, and is the single state partition anticipated for Colyseus.
 */
export class WorldState {
  readonly graph: RoomGraph;
  readonly events = new EventBus();
  readonly rng: Rng;
  readonly player: Entity;
  readonly hostiles: Entity[] = [];
  readonly progression = new Progression();
  readonly config: WorldConfig;
  /** The seed this world was created with (persisted in saves for reproducibility). */
  readonly seed: number;

  private readonly combat: ICombatSystem;
  private readonly brain = new HostileBrain();
  /** Player commands queued since the last tick, resolved in order on tick. */
  private readonly commandQueue: Command[] = [];

  constructor(options: WorldOptions = {}) {
    this.seed = options.seed ?? 0xc0ffee;
    this.rng = new Rng(this.seed);
    this.graph = new RoomGraph();
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.combat = options.combat ?? new CombatSystem(this.events);

    const startKey = options.startRoom ?? START_ROOM;
    const center = { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };

    this.player = {
      id: 'player',
      kind: EntityKind.Player,
      name: 'Salvage Unit',
      roomKey: startKey,
      x: center.x,
      y: center.y,
      facing: 'down',
      stats: { integrity: 100, maxIntegrity: 100, processing: 10, shielding: 3 },
      attackCooldownMs: 0,
      respawnTimerMs: 0,
      defeated: false,
      brain: null,
      spawn: { roomKey: startKey, x: center.x, y: center.y },
    };

    this.spawnHostiles();

    const start = this.graph.rooms.get(startKey);
    if (start) start.visited = true;
  }

  /** Place each seeded hostile into its MUD room at the room center. */
  private spawnHostiles(): void {
    const center = { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };
    for (const seed of HOSTILES) {
      if (!this.graph.rooms.has(seed.location)) continue;
      this.hostiles.push(this.makeHostile(seed, center.x, center.y));
    }
  }

  private makeHostile(seed: HostileSeed, x: number, y: number): Entity {
    return {
      id: `hostile:${seed.key}`,
      kind: EntityKind.Hostile,
      name: seed.key,
      roomKey: seed.location,
      x,
      y,
      facing: 'down',
      stats: {
        integrity: seed.integrity,
        maxIntegrity: seed.maxIntegrity,
        processing: seed.processing,
        shielding: seed.shielding,
      },
      attackCooldownMs: 0,
      respawnTimerMs: 0,
      defeated: false,
      brain: 'hostile',
      spawn: { roomKey: seed.location, x, y },
      reward: { xp: seed.xpReward, credits: seed.creditsReward, salvage: seed.salvage },
      aggroRange: 5,
    };
  }

  /** Every entity (player + hostiles) for systems that iterate all actors. */
  allEntities(): Entity[] {
    return [this.player, ...this.hostiles];
  }

  /** The room the player is currently in. */
  get currentRoom(): Room {
    return this.graph.rooms.get(this.player.roomKey)!;
  }

  /** Hostiles that are alive and in the player's current room. */
  hostilesInCurrentRoom(): Entity[] {
    return this.hostiles.filter((h) => !h.defeated && h.roomKey === this.player.roomKey);
  }

  /** Queue a command to be resolved on the next tick (movement applies immediately). */
  apply(command: Command): void {
    if (command.type === 'move') {
      this.move(command.dir);
      return;
    }
    this.commandQueue.push(command);
  }

  /** Lookup a respawn timer for a defeated hostile, used by the render layer. */
  isDefeated(entityId: string): boolean {
    return this.allEntities().find((e) => e.id === entityId)?.defeated ?? false;
  }

  /**
   * Advance the whole world by `dtMs`: cooldowns, skill cooldowns, respawn timers, queued
   * player actions (attack/skill/pickup), and hostile AI. Deterministic given the same seed,
   * command sequence, and dt — the property the agent API and tests rely on.
   */
  tick(dtMs: number): void {
    this.combat.tickCooldowns(this.allEntities(), dtMs);
    this.progression.tickSkills(dtMs);
    this.tickRespawns(dtMs);

    // Resolve queued player commands.
    for (const cmd of this.commandQueue) this.resolvePlayerCommand(cmd);
    this.commandQueue.length = 0;

    if (!this.player.defeated) this.runHostileAi();
  }

  /** Decrement respawn timers; revive hostiles and the player when their timer elapses. */
  private tickRespawns(dtMs: number): void {
    for (const h of this.hostiles) {
      if (!h.defeated) continue;
      h.respawnTimerMs -= dtMs;
      if (h.respawnTimerMs <= 0) this.respawnHostile(h);
    }
    if (this.player.defeated) {
      this.player.respawnTimerMs -= dtMs;
      if (this.player.respawnTimerMs <= 0) this.respawnPlayer();
    }
  }

  private resolvePlayerCommand(cmd: Command): void {
    if (this.player.defeated) return;
    switch (cmd.type) {
      case 'attack':
        this.playerAttack();
        break;
      case 'useSkill':
        this.useSkill(cmd.skillId);
        break;
      case 'pickup':
        // Item pickup is wired with items.ts in a later task; currently a no-op.
        break;
      default:
        break;
    }
  }

  /** Player attacks the nearest adjacent hostile in the room, if any. */
  private playerAttack(): void {
    const target = this.hostilesInCurrentRoom().find((h) =>
      this.combat.isInRange(this.player, h),
    );
    if (!target) return;
    const result = this.combat.resolveAttack(this.player, target);
    if (result.defeated) this.onHostileDefeated(target);
  }

  private useSkill(skillId: string): void {
    if (!this.progression.useSkill(skillId)) return;
    this.events.emit({ type: 'log', message: `Activated skill: ${skillId}` });
    if (skillId === 'repair') {
      this.player.stats.integrity += 20;
      clampIntegrity(this.player.stats);
    }
  }

  /** Grant rewards, emit events, and schedule the hostile's respawn. */
  private onHostileDefeated(hostile: Entity): void {
    const reward = hostile.reward;
    if (reward) {
      const leveled = this.progression.addXp(reward.xp);
      this.progression.addCredits(reward.credits);
      this.progression.addSalvage(reward.salvage);
      this.events.emit({
        type: 'reward',
        xp: reward.xp,
        credits: reward.credits,
        salvage: reward.salvage,
      });
      if (leveled !== null) {
        this.events.emit({ type: 'leveledUp', level: leveled });
        this.progression.tryUnlockProfessions();
      }
    }
    const seed = HOSTILES.find((h) => `hostile:${h.key}` === hostile.id);
    hostile.respawnTimerMs = (seed?.respawnDelaySec ?? 60) * 1000;
  }

  private respawnHostile(hostile: Entity): void {
    hostile.defeated = false;
    hostile.respawnTimerMs = 0;
    hostile.stats.integrity = hostile.stats.maxIntegrity;
    hostile.roomKey = hostile.spawn.roomKey;
    hostile.x = hostile.spawn.x;
    hostile.y = hostile.spawn.y;
    hostile.attackCooldownMs = 0;
    this.events.emit({ type: 'respawned', entityId: hostile.id, roomKey: hostile.roomKey });
  }

  private respawnPlayer(): void {
    const p = this.player;
    p.defeated = false;
    p.respawnTimerMs = 0;
    p.roomKey = this.config.safeRoom;
    p.x = Math.floor(ROOM_WIDTH / 2);
    p.y = Math.floor(ROOM_HEIGHT / 2);
    p.attackCooldownMs = 0;
    const penalty = Math.round(p.stats.maxIntegrity * (1 - this.config.defeatPenalty));
    p.stats.integrity = Math.max(1, penalty);
    const safe = this.graph.rooms.get(this.config.safeRoom);
    if (safe) safe.visited = true;
    this.events.emit({ type: 'respawned', entityId: p.id, roomKey: p.roomKey });
  }

  /** Drive every alive hostile's brain and apply its chosen command. */
  private runHostileAi(): void {
    const view: WorldView = {
      player: this.player,
      isWalkable: (roomKey, x, y) => this.graph.rooms.get(roomKey)?.isWalkable(x, y) ?? false,
      rng: this.rng,
    };
    for (const h of this.hostiles) {
      if (h.defeated) continue;
      const cmd = this.brain.decide(h, view);
      if (!cmd) continue;
      this.applyHostileCommand(h, cmd);
    }
  }

  private applyHostileCommand(hostile: Entity, cmd: Command): void {
    if (cmd.type === 'move') {
      const { dx, dy } = DELTA[cmd.dir];
      const nx = hostile.x + dx;
      const ny = hostile.y + dy;
      const room = this.graph.rooms.get(hostile.roomKey);
      // Hostiles stay within their room (no door transitions) to keep them near home.
      if (room && room.isWalkable(nx, ny) && !this.isDoorTile(room, nx, ny)) {
        hostile.x = nx;
        hostile.y = ny;
      }
    } else if (cmd.type === 'attack') {
      const result = this.combat.resolveAttack(hostile, this.player);
      if (result.defeated) this.onPlayerDefeated(hostile);
    }
  }

  private isDoorTile(room: Room, x: number, y: number): boolean {
    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const d = room.doorTile(dir);
      if (d && d.x === x && d.y === y) return true;
    }
    return false;
  }

  private onPlayerDefeated(by: Entity): void {
    this.player.defeated = true;
    this.player.respawnTimerMs = this.config.playerRespawnDelayMs;
    this.events.emit({ type: 'defeated', entityId: this.player.id, byId: by.id });
  }

  /**
   * Move the player one tile in a direction. Stepping onto a door tile transitions to the
   * adjacent room, placing the player just inside the opposite door. Walls block movement.
   */
  private move(dir: Direction): void {
    const player = this.player;
    if (player.defeated) return;
    player.facing = FACING[dir];

    const room = this.currentRoom;
    const { dx, dy } = DELTA[dir];
    const nx = player.x + dx;
    const ny = player.y + dy;

    const door = room.doorTile(dir);
    if (door && nx === door.x && ny === door.y) {
      this.transition(dir);
      return;
    }

    if (!room.isWalkable(nx, ny)) return;

    player.x = nx;
    player.y = ny;
    this.events.emit({
      type: 'moved',
      entityId: player.id,
      roomKey: player.roomKey,
      x: nx,
      y: ny,
    });
  }

  /** Transition the player to the neighboring room through a door. */
  private transition(dir: Direction): void {
    const fromKey = this.player.roomKey;
    const toKey = this.graph.neighborOf(fromKey, dir);
    if (!toKey) return;
    const toRoom = this.graph.rooms.get(toKey);
    if (!toRoom) return;

    const back = OPPOSITE[dir];
    const entry = toRoom.doorTile(back);
    const inward = DELTA[dir];
    const x = (entry?.x ?? Math.floor(ROOM_WIDTH / 2)) + inward.dx;
    const y = (entry?.y ?? Math.floor(ROOM_HEIGHT / 2)) + inward.dy;

    this.player.roomKey = toKey;
    this.player.x = x;
    this.player.y = y;

    const firstVisit = !toRoom.visited;
    toRoom.visited = true;

    this.events.emit({ type: 'roomChanged', fromRoom: fromKey, toRoom: toKey, dir });
    this.events.emit({ type: 'roomEntered', roomKey: toKey, firstVisit });
    this.events.emit({
      type: 'moved',
      entityId: this.player.id,
      roomKey: toKey,
      x,
      y,
    });
  }
}
