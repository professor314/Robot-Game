import {
  DELTA,
  Direction,
  HOSTILES,
  HostileSeed,
  OPPOSITE,
  START_ROOM,
} from '../data/world';
import {
  KEY_CARDS,
  ROOM_LOCKS,
  VENDOR_ROOM,
} from '../data/world';
import { Brain, WorldView, brainFor } from './ai';
import { BossBrain, makeBossEntity } from './boss';
import { ATTACK_COOLDOWN_MS, CombatSystem, ICombatSystem } from './combat';
import { Command } from './commands';
import { Entity, EntityKind, Facing } from './entity';
import { EventBus } from './events';
import { MissionLog } from './missions';
import { Progression } from './progression';
import { Item, MATERIALS, assignRoomStyle, furnishRoom, interactionOf } from './props';
import { RECIPES, recipeById } from '../data/recipes';
import { RoomGraph } from './roomGraph';
import { ROOM_HEIGHT, ROOM_WIDTH, Room } from './room';
import { Rng } from './rng';
import { clampIntegrity, computeDamage } from './stats';
import { Story } from './story';
import { GUARDIANS, MAJOR_BOSS, MAJOR_BOSS_PHASE2 } from '../data/bosses';
import { chassisById } from '../data/chassis';
import { MISSIONS, missionById } from '../data/missions';
import { validateKeySolvability } from './keys';
import { logInRoom } from '../data/logs';
import { vendorGoodById } from '../data/vendor';

/** Maps a travel direction to the facing the player should adopt. */
const FACING: Record<Direction, Facing> = {
  north: 'up',
  south: 'down',
  east: 'right',
  west: 'left',
};

/** Inverse of FACING: the travel direction implied by a facing. */
const FACING_TO_DIR: Record<Facing, Direction> = {
  up: 'north',
  down: 'south',
  right: 'east',
  left: 'west',
};

/** The direction an entity is facing, as a movement Direction. */
function facingToDir(facing: Facing): Direction {
  return FACING_TO_DIR[facing];
}

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
  /** Which player bot chassis was chosen on the pick-your-bot screen. */
  botId?: string;
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
  /** The chosen player bot chassis id (for the renderer). */
  readonly botId: string;
  /** Whether the mining laser has been picked up/equipped (required to mine junk). */
  miningLaserEquipped = false;
  /** Whether the ranged weapon (Capacitor Cannon) has been crafted/unlocked. */
  rangedUnlocked = false;

  /** v3: narrative arc + mission tracking. */
  readonly story = new Story(this.events);
  readonly missions = new MissionLog();
  /** Key-card ids the player holds. */
  readonly keys = new Set<string>();
  /** Per-chassis movement cadence (ms between steps) and dash cooldown. */
  private moveCooldownMs = 120;
  private dashCooldownMs = 1500;
  /** Live dash cooldown timer (ms remaining). */
  private dashTimerMs = 0;

  private readonly combat: ICombatSystem;
  private readonly bossBrain = new BossBrain();
  /** Player commands queued since the last tick, resolved in order on tick. */
  private readonly commandQueue: Command[] = [];
  /**
   * How often hostiles take an AI step, in ms, and the accumulator that gates it. Without this,
   * hostiles would act every frame (~60×/sec) and dart around; one step per ~450ms reads as a
   * deliberate pace while staying deterministic (driven only by dt).
   */
  private readonly aiStepMs = 450;
  private aiAccumulatorMs = 0;

  constructor(options: WorldOptions = {}) {
    this.seed = options.seed ?? 0xc0ffee;
    this.botId = options.botId ?? 'dome';
    this.rng = new Rng(this.seed);
    this.graph = new RoomGraph();
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.combat = options.combat ?? new CombatSystem(this.events, ATTACK_COOLDOWN_MS, this.rng);

    const startKey = options.startRoom ?? START_ROOM;
    const center = { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };

    // Apply the chosen chassis's balanced-but-flavored stat profile.
    const chassis = chassisById(this.botId);
    this.moveCooldownMs = chassis.moveCooldownMs;
    this.dashCooldownMs = chassis.dashCooldownMs;

    this.player = {
      id: 'player',
      kind: EntityKind.Player,
      name: 'Salvage Unit',
      roomKey: startKey,
      x: center.x,
      y: center.y,
      facing: 'down',
      stats: {
        integrity: chassis.maxIntegrity,
        maxIntegrity: chassis.maxIntegrity,
        processing: chassis.processing,
        shielding: chassis.shielding,
      },
      attackCooldownMs: 0,
      respawnTimerMs: 0,
      defeated: false,
      brain: null,
      spawn: { roomKey: startKey, x: center.x, y: center.y },
      dashInvulnMs: 0,
    };

    // Assign art styles to every room, and furnish all but the start room (props + items)
    // deterministically before placing actors, so nothing spawns on a blocked tile.
    for (const room of this.graph.rooms.values()) {
      assignRoomStyle(room, this.rng);
      if (room.key === startKey) continue;
      furnishRoom(room, this.rng);
    }

    // The start room holds the mining laser: the player lands on it and it auto-equips.
    const start = this.graph.rooms.get(startKey);
    if (start) {
      start.visited = true;
      start.items.push({
        id: 'item:mining-laser',
        kind: 'miningLaser',
        x: center.x,
        y: center.y,
        collected: false,
      });
    }

    this.scatterRecipes(startKey);
    this.placeKeyCards();
    this.placeLogs();

    this.spawnHostiles();
    this.spawnAmbientHostiles(startKey);
    this.spawnBosses();

    // The player spawns standing on the mining laser — equip it immediately.
    this.pickup();

    // Validate the key-card gating is solvable from the start; log any problems (dev aid).
    const keyWarnings = validateKeySolvability(this.graph, startKey);
    for (const w of keyWarnings) console.warn(`[keys] ${w.message}`);
  }

  /** The single vendor room key (for the render layer / vendor interaction). */
  get vendorRoom(): string {
    return VENDOR_ROOM;
  }

  /** Place each key card as a found item in its designated (open-reachable) room. */
  private placeKeyCards(): void {
    for (const card of KEY_CARDS) {
      const room = this.graph.rooms.get(card.foundInRoomKey);
      if (!room) continue;
      const tile = this.freeInteriorTile(room);
      if (!tile) continue;
      room.items.push({
        id: `keycard:${card.id}`,
        kind: 'keycard',
        x: tile.x,
        y: tile.y,
        collected: false,
        keyId: card.id,
      });
    }
  }

  /** Mark rooms that contain a log entry so the render layer can show a readable terminal. */
  private placeLogs(): void {
    for (const room of this.graph.rooms.values()) {
      const log = logInRoom(room.key);
      if (log) room.logId = log.id;
    }
  }

  /** Spawn the 7 guardian bosses and the (dormant) major boss into their rooms. */
  private spawnBosses(): void {
    const center = { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };
    for (const seed of GUARDIANS) {
      const room = this.graph.rooms.get(seed.roomKey);
      if (!room) continue;
      const tile = this.freeInteriorTile(room) ?? center;
      // Clear any blocking prop under the boss so it isn't stuck.
      room.blocked.delete(`${tile.x},${tile.y}`);
      this.hostiles.push(makeBossEntity(seed, tile.x, tile.y));
    }
    // Major boss starts defeated/dormant; activated when all components are installed.
    const major = makeBossEntity(MAJOR_BOSS, center.x, center.y);
    major.defeated = true; // hidden until activated
    this.hostiles.push(major);
  }

  /**
   * Scatter crafting-recipe chips across rooms — one recipe per room, so each recipe is
   * discovered one at a time as the player explores. Placed deterministically on a free
   * interior tile. Non-start rooms only, in graph order, until recipes run out.
   */
  private scatterRecipes(startKey: string): void {
    let idx = 0;
    for (const room of this.graph.rooms.values()) {
      if (idx >= RECIPES.length) break;
      if (room.key === startKey) continue;
      const tile = this.freeInteriorTile(room);
      if (!tile) continue;
      const recipe = RECIPES[idx++];
      room.items.push({
        id: `recipe:${recipe.id}`,
        kind: 'recipe',
        x: tile.x,
        y: tile.y,
        collected: false,
        recipeId: recipe.id,
      });
    }
  }

  /** Place each seeded hostile into its MUD room at the room center. */
  private spawnHostiles(): void {
    const center = { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };
    for (const seed of HOSTILES) {
      if (!this.graph.rooms.has(seed.location)) continue;
      this.hostiles.push(this.makeHostile(seed, center.x, center.y));
    }
  }

  /** Brain type for each named hostile, giving them distinct behavior. */
  private static readonly NAMED_BRAINS: Record<string, string> = {
    'Corrupted Sentry': 'sentry',
    'Haywire Drone': 'drone',
    'Rogue Program': 'hunter',
  };

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
      brain: WorldState.NAMED_BRAINS[seed.key] ?? 'hostile',
      spawn: { roomKey: seed.location, x, y },
      reward: { xp: seed.xpReward, credits: seed.creditsReward, salvage: seed.salvage },
      aggroRange: 5,
    };
  }

  /**
   * Seed a weaker "patrol drone" into most rooms that don't already hold a named hostile, so
   * the station feels inhabited. Placed on a free interior tile using the seeded RNG.
   */
  private spawnAmbientHostiles(startKey: string): void {
    const named = new Set(HOSTILES.map((h) => h.location));
    let n = 0;
    for (const room of this.graph.rooms.values()) {
      if (room.key === startKey || named.has(room.key)) continue;
      // ~70% of eligible rooms get a patrol drone.
      if (this.rng.next() > 0.7) continue;
      const tile = this.freeInteriorTile(room);
      if (!tile) continue;
      this.hostiles.push(this.makePatrolDrone(room.key, tile.x, tile.y, n++));
    }
  }

  /** Find a walkable interior tile with no actor on it, or null. */
  private freeInteriorTile(room: Room): { x: number; y: number } | null {
    for (let tries = 0; tries < 40; tries++) {
      const x = this.rng.nextInt(1, ROOM_WIDTH - 2);
      const y = this.rng.nextInt(1, ROOM_HEIGHT - 2);
      if (!room.isWalkable(x, y)) continue;
      if (this.hostiles.some((h) => h.roomKey === room.key && h.x === x && h.y === y)) continue;
      return { x, y };
    }
    return null;
  }

  private makePatrolDrone(roomKey: string, x: number, y: number, index: number): Entity {
    return {
      id: `patrol:${roomKey}:${index}`,
      kind: EntityKind.Hostile,
      name: 'Patrol Drone',
      roomKey,
      x,
      y,
      facing: 'down',
      stats: { integrity: 25, maxIntegrity: 25, processing: 6, shielding: 1 },
      attackCooldownMs: 0,
      respawnTimerMs: 0,
      defeated: false,
      // Patrols vary their behavior (seeded) so rooms don't all feel identical.
      brain: this.rng.pick(['drone', 'crawler', 'hunter', 'hostile']),
      spawn: { roomKey, x, y },
      reward: { xp: 30, credits: 10, salvage: [] },
      aggroRange: 4,
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

  /**
   * Advance the whole world by `dtMs`: cooldowns, skill cooldowns, respawn timers, queued
   * player actions (attack/skill/pickup), and hostile AI. Deterministic given the same seed,
   * command sequence, and dt — the property the agent API and tests rely on.
   */
  tick(dtMs: number): void {
    this.combat.tickCooldowns(this.allEntities(), dtMs);
    this.progression.tickSkills(dtMs);
    this.tickBuffs(dtMs);
    this.tickCooldownTimers(dtMs);
    this.tickTelegraphs(dtMs);
    this.tickRespawns(dtMs);
    this.maybeActivateMajorBoss();

    // Resolve queued player commands.
    for (const cmd of this.commandQueue) this.resolvePlayerCommand(cmd);
    this.commandQueue.length = 0;

    // Step hostile AI on a fixed cadence rather than every frame, so enemies move at a
    // readable pace. Accumulate dt and run one step per interval elapsed.
    if (!this.player.defeated) {
      this.aiAccumulatorMs += dtMs;
      while (this.aiAccumulatorMs >= this.aiStepMs) {
        this.aiAccumulatorMs -= this.aiStepMs;
        this.runHostileAi();
      }
    }
  }

  /** Advance the player's dash cooldown and dash invulnerability. */
  private tickCooldownTimers(dtMs: number): void {
    if (this.dashTimerMs > 0) this.dashTimerMs = Math.max(0, this.dashTimerMs - dtMs);
    const p = this.player;
    if ((p.dashInvulnMs ?? 0) > 0) p.dashInvulnMs = Math.max(0, (p.dashInvulnMs ?? 0) - dtMs);
  }

  /** The chassis's movement cadence (ms between held-key steps); read by the render layer. */
  get moveIntervalMs(): number {
    return this.moveCooldownMs;
  }

  /**
   * Count down any entity's telegraphed heavy attack; when the wind-up elapses, land the hit
   * (with knockback) if the player is still adjacent and not dashing through i-frames.
   */
  private tickTelegraphs(dtMs: number): void {
    for (const e of this.hostiles) {
      if (e.defeated || (e.windupMs ?? 0) <= 0) continue;
      e.windupMs = Math.max(0, (e.windupMs ?? 0) - dtMs);
      if (e.windupMs > 0) continue;
      // Wind-up finished: resolve the heavy hit.
      const heavy = e.pendingHeavy ?? 0;
      e.pendingHeavy = 0;
      const adjacent = Math.abs(e.x - this.player.x) + Math.abs(e.y - this.player.y) <= 1;
      if (e.roomKey === this.player.roomKey && adjacent) {
        this.landHeavy(e, heavy);
      }
    }
  }

  /** Activate the dormant major boss once all 7 components are installed. */
  private maybeActivateMajorBoss(): void {
    if (!this.story.allInstalled) return;
    const major = this.hostiles.find((h) => h.bossId === MAJOR_BOSS.id);
    if (major && major.defeated && !this.story.bossesDefeated.has(MAJOR_BOSS.id)) {
      major.defeated = false;
      major.stats.integrity = major.stats.maxIntegrity;
      major.roomKey = MAJOR_BOSS.roomKey;
      this.events.emit({ type: 'bossEngaged', bossId: MAJOR_BOSS.id, major: true });
      this.events.emit({ type: 'log', message: 'The Station Core awakens at the Docking Port.', tone: 'bad' });
    }
  }

  /**
   * Decrement respawn timers; revive non-boss hostiles when their timer elapses. Bosses never
   * respawn. Player defeat is terminal (game over), handled by the UI restart flow.
   */
  private tickRespawns(dtMs: number): void {
    for (const h of this.hostiles) {
      if (!h.defeated || h.bossId) continue; // bosses stay down
      h.respawnTimerMs -= dtMs;
      if (h.respawnTimerMs <= 0) this.respawnHostile(h);
    }
  }

  /** Respawn the player in place (used by tests / an optional non-game-over mode). */
  respawnPlayerInPlace(): void {
    this.respawnPlayer();
  }

  private resolvePlayerCommand(cmd: Command): void {
    if (this.player.defeated) return;
    switch (cmd.type) {
      case 'attack':
        this.playerAttack();
        break;
      case 'dash':
        this.dash();
        break;
      case 'rangedAttack':
        this.rangedAttack();
        break;
      case 'useSkill':
        this.useSkill(cmd.skillId);
        break;
      case 'pickup':
        this.pickup();
        break;
      case 'interact':
        this.interact();
        break;
      case 'craft':
        this.craft(cmd.recipeId);
        break;
      case 'buy':
        this.buy(cmd.goodId);
        break;
      default:
        break;
    }
  }

  /** Dash up to N tiles in the facing direction, stopping at walls/occupied tiles; i-frames. */
  private static readonly DASH_TILES = 3;
  private static readonly DASH_INVULN_MS = 350;

  private dash(): void {
    if (this.dashTimerMs > 0) return;
    const p = this.player;
    const dir = facingToDir(p.facing);
    const { dx, dy } = DELTA[dir];
    const room = this.currentRoom;
    let moved = 0;
    for (let i = 0; i < WorldState.DASH_TILES; i++) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (!room.isWalkable(nx, ny)) break;
      if (!this.tileFreeOfActors(p.roomKey, nx, ny, p.id)) break;
      p.x = nx;
      p.y = ny;
      moved++;
    }
    this.dashTimerMs = this.dashCooldownMs;
    p.dashInvulnMs = WorldState.DASH_INVULN_MS;
    if (moved > 0) {
      this.events.emit({ type: 'dashed', entityId: p.id, x: p.x, y: p.y });
      this.events.emit({ type: 'moved', entityId: p.id, roomKey: p.roomKey, x: p.x, y: p.y });
      this.pickup();
    }
  }

  /** Fire the ranged weapon along the facing line; hits the first hostile in the room. */
  private rangedAttack(): void {
    if (!this.rangedUnlocked) {
      this.events.emit({ type: 'log', message: 'No ranged weapon — craft the Capacitor Cannon', tone: 'bad' });
      return;
    }
    if (this.player.attackCooldownMs > 0) return;
    const p = this.player;
    const dir = facingToDir(p.facing);
    const { dx, dy } = DELTA[dir];
    const room = this.currentRoom;
    let x = p.x + dx;
    let y = p.y + dy;
    let hit: Entity | null = null;
    // March along the line until a wall or the first live hostile.
    for (let range = 0; range < Math.max(ROOM_WIDTH, ROOM_HEIGHT); range++) {
      if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) break;
      if (room.tiles[x][y] === undefined) break;
      const target = this.hostiles.find((h) => !h.defeated && h.roomKey === p.roomKey && h.x === x && h.y === y);
      if (target) { hit = target; break; }
      if (!room.isWalkable(x, y)) break; // blocked by wall/prop
      x += dx;
      y += dy;
    }
    this.player.attackCooldownMs = ATTACK_COOLDOWN_MS;
    this.events.emit({
      type: 'rangedFired', fromX: p.x, fromY: p.y, toX: x, toY: y, hitId: hit?.id ?? null,
    });
    if (hit) {
      const dmg = Math.max(1, computeDamage(p.stats, hit.stats));
      hit.stats.integrity -= dmg;
      this.events.emit({ type: 'attacked', attackerId: p.id, targetId: hit.id, damage: dmg });
      if (hit.stats.integrity <= 0) {
        hit.defeated = true;
        this.events.emit({ type: 'defeated', entityId: hit.id, byId: p.id });
        this.onHostileDefeated(hit);
      }
    }
  }

  /** Bonus attack output granted per installed weapon upgrade. */
  private static readonly WEAPON_BONUS = 4;

  /** Collect an item on or adjacent to the player's tile, if any. Auto-installs upgrades. */
  private pickup(): void {
    const room = this.currentRoom;
    const p = this.player;
    const item = room.items.find(
      (it) => !it.collected && Math.abs(it.x - p.x) + Math.abs(it.y - p.y) <= 1,
    );
    if (!item) return;
    item.collected = true;
    this.events.emit({ type: 'pickedUp', itemId: item.id });

    if (item.kind === 'weaponUpgrade') {
      this.installWeaponUpgrade();
      return;
    }

    if (item.kind === 'miningLaser') {
      this.miningLaserEquipped = true;
      this.events.emit({
        type: 'log',
        message: 'Mining laser equipped — press E next to junk to mine it',
        tone: 'good',
      });
      return;
    }

    if (item.kind === 'recipe') {
      const recipe = item.recipeId ? recipeById(item.recipeId) : undefined;
      if (recipe) {
        this.progression.knownRecipes.add(recipe.id);
        this.events.emit({ type: 'recipeLearned', recipeId: recipe.id, name: recipe.name });
        this.events.emit({
          type: 'log',
          message: `Recipe learned: ${recipe.name} (press C to craft)`,
          tone: 'good',
        });
      }
      return;
    }

    if (item.kind === 'keycard' && item.keyId) {
      this.keys.add(item.keyId);
      const card = KEY_CARDS.find((k) => k.id === item.keyId);
      this.events.emit({ type: 'keyFound', keyId: item.keyId, name: card?.name ?? item.keyId });
      this.events.emit({ type: 'log', message: `Found key card: ${card?.name ?? item.keyId}`, tone: 'good' });
      return;
    }

    if (item.kind === 'component') {
      // Recovering the component is handled on boss defeat; picking it up just confirms carry.
      this.events.emit({
        type: 'log',
        message: `Carrying ${missionById(item.componentId ?? '')?.componentName ?? 'component'} — install it at its bay (E)`,
        tone: 'good',
      });
      return;
    }

    // Everything else is a countable resource added to the inventory, plus a few credits.
    this.progression.addToInventory(item.kind);
    this.progression.addSalvage([item.kind]);
    this.progression.addCredits(5);
    this.events.emit({ type: 'log', message: `Salvaged ${item.kind}`, tone: 'good' });
  }

  /** Install a weapon upgrade: raise the weapon tier, boost attack output, announce it. */
  private installWeaponUpgrade(): void {
    const tier = this.progression.upgradeWeapon();
    this.player.stats.processing += WorldState.WEAPON_BONUS;
    // Installing a weapon module counts as equipping a chassis for profession eligibility.
    this.progression.chassisEquipped = true;
    this.events.emit({
      type: 'weaponUpgraded',
      name: `Weapon Mk.${tier + 1}`,
      weaponLevel: tier,
      processing: this.player.stats.processing,
    });
    this.events.emit({
      type: 'log',
      message: `Weapon upgrade installed — Mk.${tier + 1} (ATK ${this.player.stats.processing})`,
      tone: 'good',
    });
    this.tryUnlockProfessions();
  }

  /**
   * Roll a random handful of themed materials from mining a deposit: 1–3 distinct material
   * types, each in a small bell-curve quantity. Returns [material, quantity] pairs.
   */
  private rollMaterials(): [string, number][] {
    const count = 1 + this.rng.nextInt(0, 2);
    const chosen = new Set<string>();
    const drops: [string, number][] = [];
    for (let i = 0; i < count; i++) {
      const mat = MATERIALS[this.rng.nextInt(0, MATERIALS.length - 1)];
      if (chosen.has(mat)) continue;
      chosen.add(mat);
      drops.push([mat, this.rng.bellInt(1, 3)]);
    }
    return drops;
  }

  /**
   * Craft a known recipe: verify it's learned and affordable, spend the materials, and apply
   * its effect to the player. Emits `crafted` plus a log line. The single dispatch point for
   * recipe effects — add a new `RecipeEffect.kind` here when adding one to the data.
   */
  private craft(recipeId: string): void {
    const recipe = recipeById(recipeId);
    if (!recipe) return;
    if (!this.progression.knownRecipes.has(recipeId)) {
      this.events.emit({ type: 'log', message: 'Recipe not yet discovered', tone: 'bad' });
      return;
    }
    if (!this.progression.spendMaterials(recipe.cost)) {
      this.events.emit({ type: 'log', message: `Not enough materials for ${recipe.name}`, tone: 'bad' });
      return;
    }

    const p = this.player;
    const eff = recipe.effect;
    switch (eff.kind) {
      case 'battery':
        p.stats.integrity += eff.integrity;
        clampIntegrity(p.stats);
        break;
      case 'maxIntegrity':
        p.stats.maxIntegrity += eff.amount;
        p.stats.integrity += eff.amount;
        clampIntegrity(p.stats);
        break;
      case 'weapon':
        p.stats.processing += eff.processing;
        this.progression.upgradeWeapon();
        this.progression.chassisEquipped = true;
        break;
      case 'armor':
        p.stats.shielding += eff.shielding;
        this.progression.chassisEquipped = true;
        break;
      case 'miningLaser':
        this.progression.miningLevel += eff.speedup;
        break;
      case 'rangedWeapon':
        this.rangedUnlocked = true;
        p.stats.processing += eff.processing;
        this.progression.upgradeWeapon();
        this.progression.chassisEquipped = true;
        break;
    }
    if (eff.kind === 'maxIntegrity') {
      this.events.emit({ type: 'maxIntegrityRaised', amount: eff.amount, maxIntegrity: p.stats.maxIntegrity });
    }

    this.events.emit({ type: 'crafted', recipeId, name: recipe.name });
    this.events.emit({ type: 'log', message: `Crafted ${recipe.name}`, tone: 'good' });
    this.tryUnlockProfessions();
  }

  /**
   * Buy a vendor good with credits (only works in the vendor room). Validates affordability,
   * deducts credits, and applies the good's effect.
   */
  private buy(goodId: string): void {
    const good = vendorGoodById(goodId);
    if (!good) return;
    if (this.player.roomKey !== VENDOR_ROOM) {
      this.events.emit({ type: 'log', message: 'No vendor here', tone: 'bad' });
      return;
    }
    if (this.progression.credits < good.price) {
      this.events.emit({ type: 'log', message: `Not enough credits for ${good.name}`, tone: 'bad' });
      return;
    }
    this.progression.credits -= good.price;
    const p = this.player;
    switch (good.effect.kind) {
      case 'repair':
        p.stats.integrity += good.effect.integrity;
        clampIntegrity(p.stats);
        break;
      case 'material':
        this.progression.addToInventory(good.effect.resource, good.effect.amount);
        break;
      case 'maxIntegrity':
        p.stats.maxIntegrity += good.effect.amount;
        p.stats.integrity += good.effect.amount;
        clampIntegrity(p.stats);
        this.events.emit({ type: 'maxIntegrityRaised', amount: good.effect.amount, maxIntegrity: p.stats.maxIntegrity });
        break;
    }
    this.events.emit({ type: 'purchased', goodId, name: good.name, credits: this.progression.credits });
    this.events.emit({ type: 'log', message: `Purchased ${good.name}`, tone: 'good' });
  }

  /**
   * If the current room is the install point for a recovered-but-not-installed component,
   * install it: mark the room/mission/story, advance the arc. Returns true if it acted.
   */
  private tryInstallComponent(room: Room): boolean {
    const mission = MISSIONS.find((m) => m.installRoomKey === room.key);
    if (!mission) return false;
    if (room.componentInstalled) return false;
    // The install point is the socket at (room-center, center-1) — matches the rendered marker.
    // Only act when the player is standing on or next to it, so pressing E elsewhere in the
    // room (e.g. at a log terminal) falls through to the other interactions.
    const p = this.player;
    const ix = Math.floor(ROOM_WIDTH / 2);
    const iy = Math.floor(ROOM_HEIGHT / 2) - 1;
    if (Math.abs(p.x - ix) + Math.abs(p.y - iy) > 1) return false;
    if (!this.story.hasRecovered(mission.id)) {
      // In the install room but without the part yet.
      this.events.emit({
        type: 'log',
        message: `Install point for ${mission.componentName} — recover it first.`,
        tone: 'info',
      });
      return true;
    }
    this.story.installComponent(mission.id);
    this.missions.complete(mission.id);
    room.componentInstalled = true;
    this.events.emit({ type: 'missionUpdated', missionId: mission.id, status: 'complete' });
    this.events.emit({
      type: 'log',
      message: `Installed ${mission.componentName}. (${this.story.installed.size}/${MISSIONS.length})`,
      tone: 'good',
    });
    return true;
  }

  /** Read this room's log entry if present and unread. Returns true if it acted. */
  private tryReadLog(room: Room): boolean {
    if (!room.logId) return false;
    if (this.story.logsRead.has(room.logId)) return false;
    if (this.story.readLog(room.logId)) {
      this.events.emit({ type: 'log', message: 'Log entry recorded (see Logs).', tone: 'info' });
      return true;
    }
    return false;
  }

  /**
   * Interact with the nearest interactable prop on/adjacent to the player: mine ore (removes
   * the deposit, adds ore to inventory) or use a heal station (restores integrity). This is the
   * single dispatch point for prop interactions — new interactive props slot in here.
   */
  private interact(): void {
    const room = this.currentRoom;
    const p = this.player;

    // Priority: an adjacent interactable prop (mine/heal) wins; then installing a component;
    // then reading this room's log. This keeps "press E next to the heal bay" unambiguous.
    const prop = room.props.find(
      (pr) => interactionOf(pr.kind) !== null && Math.abs(pr.x - p.x) + Math.abs(pr.y - p.y) <= 1,
    );
    if (!prop) {
      if (this.tryInstallComponent(room)) return;
      if (this.tryReadLog(room)) return;
      return;
    }

    switch (interactionOf(prop.kind)) {
      case 'mine': {
        if (!this.miningLaserEquipped) {
          this.events.emit({ type: 'log', message: 'No mining laser equipped', tone: 'bad' });
          return;
        }
        // Each hit chips the deposit by (1 + mining-laser level), so a crafted Focused Laser
        // breaks junk faster. It only yields once hp reaches 0, so hit counts vary (bell-curve
        // 1–5 set when the room was furnished).
        prop.hp = (prop.hp ?? 1) - (1 + this.progression.miningLevel);
        if (prop.hp > 0) {
          this.events.emit({
            type: 'mined',
            roomKey: room.key,
            x: prop.x,
            y: prop.y,
            resource: 'spark',
            amount: 0,
          });
          this.events.emit({ type: 'log', message: 'Mining…', tone: 'info' });
          return;
        }

        // Broken: grant a random handful of themed materials, remove the deposit.
        const drops = this.rollMaterials();
        for (const [mat, qty] of drops) this.progression.addToInventory(mat, qty);
        room.props = room.props.filter((pr) => pr !== prop);
        room.blocked.delete(`${prop.x},${prop.y}`);
        const summary = drops.map(([m, q]) => `${q} ${m}`).join(', ');
        this.events.emit({
          type: 'mined',
          roomKey: room.key,
          x: prop.x,
          y: prop.y,
          resource: drops[0]?.[0] ?? 'scrap',
          amount: drops.reduce((n, d) => n + d[1], 0),
        });
        this.events.emit({ type: 'log', message: `Salvaged ${summary}`, tone: 'good' });
        break;
      }
      case 'heal': {
        const before = this.player.stats.integrity;
        this.player.stats.integrity = this.player.stats.maxIntegrity;
        clampIntegrity(this.player.stats);
        const amount = this.player.stats.integrity - before;
        this.events.emit({ type: 'healed', amount, integrity: this.player.stats.integrity });
        this.events.emit({
          type: 'log',
          message: amount > 0 ? `Repair bay: +${amount} integrity` : 'Integrity already full',
          tone: 'good',
        });
        break;
      }
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

  /** Remaining duration (ms) and amount of a temporary Overclock processing buff, 0 = inactive. */
  private overclockMs = 0;
  private overclockBonus = 0;
  private static readonly OVERCLOCK_BONUS = 6;
  private static readonly OVERCLOCK_MS = 5000;
  private static readonly REPAIR_AMOUNT = 30;

  /** Activate a skill: Overclock (timed attack buff) or Nanite Repair (heal). */
  private useSkill(skillId: string): void {
    if (!this.progression.canUseSkill(skillId)) {
      this.events.emit({ type: 'log', message: 'Skill on cooldown', tone: 'bad' });
      return;
    }
    if (skillId === 'repair') {
      const before = this.player.stats.integrity;
      this.player.stats.integrity += WorldState.REPAIR_AMOUNT;
      clampIntegrity(this.player.stats);
      const amount = this.player.stats.integrity - before;
      this.progression.useSkill(skillId);
      this.events.emit({ type: 'healed', amount, integrity: this.player.stats.integrity });
      this.events.emit({ type: 'log', message: `Nanite Repair: +${amount} integrity`, tone: 'good' });
      return;
    }
    if (skillId === 'overclock') {
      // Stack-safe: apply the bonus once and (re)start the timer.
      if (this.overclockMs <= 0) {
        this.overclockBonus = WorldState.OVERCLOCK_BONUS;
        this.player.stats.processing += this.overclockBonus;
      }
      this.overclockMs = WorldState.OVERCLOCK_MS;
      this.progression.useSkill(skillId);
      this.events.emit({ type: 'log', message: 'Overclock engaged — attack boosted', tone: 'good' });
      return;
    }
    // Unknown skill id: just consume the cooldown.
    this.progression.useSkill(skillId);
  }

  /** Decrement the Overclock buff timer and revert the bonus when it ends. */
  private tickBuffs(dtMs: number): void {
    if (this.overclockMs > 0) {
      this.overclockMs -= dtMs;
      if (this.overclockMs <= 0) {
        this.player.stats.processing -= this.overclockBonus;
        this.overclockBonus = 0;
        this.events.emit({ type: 'log', message: 'Overclock expired' });
      }
    }
  }

  /** Grant rewards, emit events, and (for non-bosses) schedule respawn. */
  private onHostileDefeated(hostile: Entity): void {
    const reward = hostile.reward;
    if (reward) {
      const before = this.progression.level;
      const leveled = this.progression.addXp(reward.xp);
      this.progression.addCredits(reward.credits);
      this.progression.addSalvage(reward.salvage);
      this.events.emit({
        type: 'reward',
        xp: reward.xp,
        credits: reward.credits,
        salvage: reward.salvage,
      });
      if (leveled !== null) this.onLevelUp(before, leveled);
    }

    // Bosses: drop their component, announce, and never respawn.
    if (hostile.bossId) {
      this.events.emit({ type: 'bossDefeated', bossId: hostile.bossId, major: !!hostile.major });
      this.story.bossDefeated(hostile.bossId, !!hostile.major);
      if (hostile.dropsComponent) {
        this.dropComponent(hostile, hostile.dropsComponent);
      }
      if (hostile.major) {
        this.events.emit({ type: 'log', message: 'The Station Core goes dark. The way home is open.', tone: 'good' });
      }
      hostile.respawnTimerMs = 0; // stays defeated
      return;
    }

    this.dropLoot(hostile);
    const seed = HOSTILES.find((h) => `hostile:${h.key}` === hostile.id);
    hostile.respawnTimerMs = (seed?.respawnDelaySec ?? 60) * 1000;
  }

  /** Drop a ship component item at a defeated guardian's tile and mark it recovered. */
  private dropComponent(boss: Entity, componentId: string): void {
    const room = this.graph.rooms.get(boss.roomKey);
    const mission = missionById(componentId);
    if (room) {
      room.items.push({
        id: `component:${componentId}`,
        kind: 'component',
        x: boss.x,
        y: boss.y,
        collected: false,
        componentId,
      });
    }
    this.story.recoverComponent(componentId, mission?.componentName ?? componentId);
    this.events.emit({
      type: 'log',
      message: `Recovered: ${mission?.componentName ?? componentId}. Install it at ${mission?.installRoomKey ?? 'its bay'}.`,
      tone: 'good',
    });
  }

  /** Per-level stat gains, so leveling actually makes the player stronger. */
  private static readonly LEVELUP_MAX_INTEGRITY = 10;
  private static readonly LEVELUP_PROCESSING = 1;

  /**
   * Apply level-up rewards for each level gained: raise max integrity and attack, fully repair,
   * announce it, and unlock professions once the level threshold is met. Professions grant a
   * one-time passive bonus so the unlock matters.
   */
  private onLevelUp(fromLevel: number, toLevel: number): void {
    const gained = toLevel - fromLevel;
    const p = this.player;
    p.stats.maxIntegrity += WorldState.LEVELUP_MAX_INTEGRITY * gained;
    p.stats.processing += WorldState.LEVELUP_PROCESSING * gained;
    p.stats.integrity = p.stats.maxIntegrity; // a fresh charge on level-up
    this.events.emit({ type: 'leveledUp', level: toLevel });
    this.events.emit({
      type: 'log',
      message: `LEVEL ${toLevel} — systems reinforced (+${WorldState.LEVELUP_MAX_INTEGRITY * gained} max integrity)`,
      tone: 'good',
    });
    this.tryUnlockProfessions();
  }

  /** Unlock professions when eligible and apply each one's one-time passive bonus. */
  private tryUnlockProfessions(): void {
    const newly = this.progression.tryUnlockProfessions();
    for (const id of newly) {
      if (id === 'warframe') this.player.stats.processing += 3;
      if (id === 'scavenger') this.player.stats.shielding += 1;
      const prof = this.progression.professions.find((x) => x.id === id);
      this.events.emit({
        type: 'log',
        message: `Profession unlocked: ${prof?.name ?? id}`,
        tone: 'good',
      });
    }
  }

  /** Counter so dropped-loot ids are unique across a run. */
  private lootCounter = 0;

  /** Drop a collectible loot item at a defeated hostile's tile for the player to grab. */
  private dropLoot(hostile: Entity): void {
    const room = this.graph.rooms.get(hostile.roomKey);
    if (!room) return;
    const item: Item = {
      id: `loot:${hostile.id}:${this.lootCounter++}`,
      kind: 'loot',
      x: hostile.x,
      y: hostile.y,
      collected: false,
    };
    room.items.push(item);
    this.events.emit({ type: 'lootDropped', itemId: item.id, roomKey: room.key });
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
      if ((h.windupMs ?? 0) > 0) continue; // mid-telegraph: don't also move/attack
      // Bosses use the boss brain; others use their per-type brain.
      const brain: Brain = h.bossId ? this.bossBrain : brainFor(h.brain);
      const cmd = brain.decide(h, view);
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
      // Hostiles stay within their room (no door transitions), can't walk onto the player, and
      // can't stack on another hostile.
      if (
        room &&
        room.isWalkable(nx, ny) &&
        !this.isDoorTile(room, nx, ny) &&
        this.tileFreeOfActors(hostile.roomKey, nx, ny, hostile.id)
      ) {
        hostile.x = nx;
        hostile.y = ny;
      }
    } else if (cmd.type === 'attack') {
      const result = this.combat.resolveAttack(hostile, this.player);
      if (result.defeated) this.onPlayerDefeated(hostile);
    } else if (cmd.type === 'heavyAttack') {
      this.beginHeavyAttack(hostile);
    }
  }

  /** Begin a telegraphed heavy attack: set the wind-up and announce it so the player can dodge. */
  private beginHeavyAttack(boss: Entity): void {
    const seed = [...GUARDIANS, MAJOR_BOSS].find((b) => b.id === boss.bossId);
    let windup = seed?.windupMs ?? 700;
    let heavy = seed?.heavyDamage ?? 18;
    // Major boss second phase: faster + harder once below the HP threshold.
    if (boss.major && boss.stats.integrity < boss.stats.maxIntegrity * MAJOR_BOSS_PHASE2) {
      windup = Math.round(windup * 0.6);
      heavy = Math.round(heavy * 1.3);
    }
    boss.windupMs = windup;
    boss.pendingHeavy = heavy;
    this.events.emit({ type: 'telegraph', entityId: boss.id, windupMs: windup });
  }

  /** Land a heavy hit: big damage (reduced by shielding, ignored during i-frames) + knockback. */
  private landHeavy(boss: Entity, heavy: number): void {
    const p = this.player;
    if ((p.dashInvulnMs ?? 0) > 0) {
      this.events.emit({ type: 'log', message: 'Dodged the heavy attack!', tone: 'good' });
      return;
    }
    const dmg = Math.max(1, heavy - p.stats.shielding);
    p.stats.integrity -= dmg;
    this.events.emit({ type: 'attacked', attackerId: boss.id, targetId: p.id, damage: dmg });
    // Knockback: push the player one tile away from the boss if that tile is free.
    const kx = p.x + Math.sign(p.x - boss.x);
    const ky = p.y + Math.sign(p.y - boss.y);
    const room = this.graph.rooms.get(p.roomKey);
    if (room && room.isWalkable(kx, ky) && this.tileFreeOfActors(p.roomKey, kx, ky, p.id)) {
      p.x = kx;
      p.y = ky;
      this.events.emit({ type: 'knockback', entityId: p.id, x: kx, y: ky });
      this.events.emit({ type: 'moved', entityId: p.id, roomKey: p.roomKey, x: kx, y: ky });
    }
    if (p.stats.integrity <= 0) this.onPlayerDefeated(boss);
  }

  /** True if no live actor (player or hostile, excluding `excludeId`) occupies the tile. */
  private tileFreeOfActors(roomKey: string, x: number, y: number, excludeId: string): boolean {
    if (this.player.id !== excludeId && !this.player.defeated &&
        this.player.roomKey === roomKey && this.player.x === x && this.player.y === y) {
      return false;
    }
    for (const h of this.hostiles) {
      if (h.id === excludeId || h.defeated) continue;
      if (h.roomKey === roomKey && h.x === x && h.y === y) return false;
    }
    return true;
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
    // Can't share a tile with an enemy — bump into it instead (attack with Space).
    if (!this.tileFreeOfActors(player.roomKey, nx, ny, player.id)) return;

    player.x = nx;
    player.y = ny;
    this.events.emit({
      type: 'moved',
      entityId: player.id,
      roomKey: player.roomKey,
      x: nx,
      y: ny,
    });
    this.pickup();
  }

  /** Transition the player to the neighboring room through a door. */
  private transition(dir: Direction): void {
    const fromKey = this.player.roomKey;
    const toKey = this.graph.neighborOf(fromKey, dir);
    if (!toKey) return;
    const toRoom = this.graph.rooms.get(toKey);
    if (!toRoom) return;

    // Key-card gating: a room is locked until the player holds its key (all doors into the
    // room share the same key by construction).
    const requiredKey = ROOM_LOCKS[toKey];
    if (requiredKey && !this.keys.has(requiredKey)) {
      const card = KEY_CARDS.find((k) => k.id === requiredKey);
      this.events.emit({ type: 'doorLocked', roomKey: toKey, requiredKey });
      this.events.emit({ type: 'log', message: `Locked — need ${card?.name ?? requiredKey}`, tone: 'bad' });
      return;
    }
    if (requiredKey) this.events.emit({ type: 'doorUnlocked', roomKey: toKey });

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
