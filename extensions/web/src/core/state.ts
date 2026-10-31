import {
  DELTA,
  Direction,
  HOSTILES,
  HostileSeed,
  OPPOSITE,
  START_ROOM,
} from '../data/world';
import { HostileBrain, WorldView } from './ai';
import { ATTACK_COOLDOWN_MS, CombatSystem, ICombatSystem } from './combat';
import { Command } from './commands';
import { Entity, EntityKind, Facing } from './entity';
import { EventBus } from './events';
import { Progression } from './progression';
import { Item, MATERIALS, assignRoomStyle, furnishRoom, interactionOf } from './props';
import { RECIPES, recipeById } from '../data/recipes';
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

  private readonly combat: ICombatSystem;
  private readonly brain = new HostileBrain();
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

    this.spawnHostiles();
    this.spawnAmbientHostiles(startKey);

    // The player spawns standing on the mining laser — equip it immediately.
    this.pickup();
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
      brain: 'hostile',
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
    this.tickRespawns(dtMs);

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

  /**
   * Decrement respawn timers; revive hostiles when their timer elapses. Player defeat is
   * terminal (game over) and handled by the UI restart flow rather than an auto-respawn — but
   * `respawnPlayer()` remains available for a configurable in-place respawn if re-enabled.
   */
  private tickRespawns(dtMs: number): void {
    for (const h of this.hostiles) {
      if (!h.defeated) continue;
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
      default:
        break;
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
        break;
      case 'armor':
        p.stats.shielding += eff.shielding;
        break;
      case 'miningLaser':
        this.progression.miningLevel += eff.speedup;
        break;
    }

    this.events.emit({ type: 'crafted', recipeId, name: recipe.name });
    this.events.emit({ type: 'log', message: `Crafted ${recipe.name}`, tone: 'good' });
  }

  /**
   * Interact with the nearest interactable prop on/adjacent to the player: mine ore (removes
   * the deposit, adds ore to inventory) or use a heal station (restores integrity). This is the
   * single dispatch point for prop interactions — new interactive props slot in here.
   */
  private interact(): void {
    const room = this.currentRoom;
    const p = this.player;
    const prop = room.props.find(
      (pr) => interactionOf(pr.kind) !== null && Math.abs(pr.x - p.x) + Math.abs(pr.y - p.y) <= 1,
    );
    if (!prop) return;

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
    this.dropLoot(hostile);
    const seed = HOSTILES.find((h) => `hostile:${h.key}` === hostile.id);
    hostile.respawnTimerMs = (seed?.respawnDelaySec ?? 60) * 1000;
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
    }
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
