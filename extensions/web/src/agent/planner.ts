/**
 * PlannerAgent: a goal-directed agent that plays Robot-Game to completion, used as a
 * winnability check. It drives the `WorldState` directly (it needs craft/buy, which the
 * Gym-style Action set doesn't expose).
 *
 * High-level loop each step: assess the world, pick the highest-priority objective, and take
 * one concrete action toward it (move / attack / dash / interact / craft / buy / skill).
 *
 * Priorities:
 *   0. Survive: retreat + heal when low; dodge boss telegraphs with a dash.
 *   1. Win: if the major boss is active, fight it.
 *   2. Install a recovered component at its socket.
 *   3. Fight the next guardian IF we're strong enough; guardians are taken in HP order.
 *   4. Prepare: grab recipe chips, mine materials, craft upgrades, buy from the vendor, and
 *      farm XP off respawning regular enemies until strong enough for the next guardian.
 *   5. Grab a needed key card; else explore to widen the frontier.
 *
 * The planner recomputes its plan every step from the live world, so a failure is easy to
 * trace. It is not optimal; it only has to reliably win so the regression test can assert the
 * game is beatable.
 */

import { Command, Commands } from '../core/commands';
import { Entity } from '../core/entity';
import { WorldState } from '../core/state';
import { Direction } from '../data/world';
import { GUARDIANS, MAJOR_BOSS } from '../data/bosses';
import { recipeById } from '../data/recipes';
import { VENDOR_GOODS } from '../data/vendor';
import { findRoomRoute } from './pathfind';
import { findTilePath } from './tilepath';
import { buildWorldMap, INSTALL_SOCKET, MissionView, WorldMap } from './worldmap';

/** A short description of the action taken this step, for transcripts/debugging. */
export interface PlannerStep {
  action: string;
  detail: string;
}

/** Recipes the planner wants to craft, in the order it values them (power spike first). */
const UPGRADE_RECIPES = ['plasma-edge', 'reinforced-plating', 'hardened-chassis', 'capacitor-cannon'];

export class PlannerAgent {
  /** Recent position signatures, to detect and break out of local loops. */
  private readonly recent: string[] = [];
  private escapeStepsLeft = 0;
  private escapeDir: Direction | null = null;

  constructor(private readonly world: WorldState) {}

  get won(): boolean {
    const phase = this.world.story.phase;
    return phase === 'departed' || phase === 'freeRoam';
  }

  get dead(): boolean {
    return this.world.player.defeated;
  }

  /** Decide + apply one action, advance the world, return a short description. */
  step(dtMs = 100): PlannerStep {
    const w = this.world;
    if (w.story.phase === 'intro') w.story.beginRestoring();

    // Loop detection: if we've been thrashing in the same spot, take random walkable steps for
    // a short burst to escape the local trap, then resume planning.
    const sig = `${w.player.roomKey}:${w.player.x},${w.player.y}`;
    this.recent.push(sig);
    if (this.recent.length > 40) this.recent.shift();
    const distinct = new Set(this.recent).size;
    if (this.recent.length >= 40 && distinct <= 3 && this.escapeStepsLeft === 0) {
      this.escapeStepsLeft = 8;
      this.escapeDir = null;
    }

    const decided = this.escapeStepsLeft > 0 ? this.escape() : this.decide();
    if (this.escapeStepsLeft > 0) this.escapeStepsLeft--;

    w.apply(decided.command);
    w.tick(dtMs);
    return { action: decided.action, detail: decided.detail };
  }

  /** Break a loop: walk a random legal direction (persist one dir a few steps to actually move). */
  private escape(): { command: Command; action: string; detail: string } {
    const w = this.world;
    const p = w.player;
    const dirs: Direction[] = ['north', 'south', 'east', 'west'];
    const delta: Record<Direction, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 }, south: { dx: 0, dy: 1 }, east: { dx: 1, dy: 0 }, west: { dx: -1, dy: 0 },
    };
    // Keep the current escape direction if still walkable (or a door), else pick a new one.
    const walkableDir = (d: Direction): boolean => {
      const { dx, dy } = delta[d];
      return w.currentRoom.isWalkable(p.x + dx, p.y + dy) || w.currentRoom.doors.has(d);
    };
    if (!this.escapeDir || !walkableDir(this.escapeDir)) {
      const options = dirs.filter(walkableDir);
      this.escapeDir = options.length ? options[w.rng.nextInt(0, options.length - 1)] : 'north';
      this.recent.length = 0; // reset the loop window after choosing a new escape heading
    }
    return { command: Commands.move(this.escapeDir), action: 'escape', detail: 'break loop' };
  }

  // ---- effective-power model -------------------------------------------------------------

  /** A rough "can I win this fight" score from current offense/defense/health. */
  private get attack(): number {
    return this.world.player.stats.processing;
  }
  private get shielding(): number {
    return this.world.player.stats.shielding;
  }
  private get maxHp(): number {
    return this.world.player.stats.maxIntegrity;
  }
  private get hp(): number {
    return this.world.player.stats.integrity;
  }

  /**
   * Estimate whether the player can beat a guardian: model the trade as DPS vs. incoming
   * damage over the time-to-kill. Conservative so the planner over-prepares rather than
   * throwing itself at a boss it can't beat.
   */
  private canBeatGuardian(bossId: string): boolean {
    const seed = GUARDIANS.find((g) => g.id === bossId);
    if (!seed) return true;
    const perHit = Math.max(1, this.attack - seed.shielding);
    const hitsToKill = Math.ceil(seed.integrity / perHit);
    // Boss heavy damage after our shielding, landing roughly every ~1.5s of real fight; we
    // trade hits roughly 1:1 in Core time. Require that we out-last it with margin.
    const incomingPerExchange = Math.max(1, seed.heavyDamage - this.shielding) * 0.5 +
      Math.max(1, seed.processing - this.shielding) * 0.5;
    const survivable = this.maxHp / incomingPerExchange;
    return hitsToKill <= survivable * 0.8;
  }

  // ---- decision --------------------------------------------------------------------------

  private decide(): { command: Command; action: string; detail: string } {
    const w = this.world;
    const map = buildWorldMap(w);
    const p = w.player;

    // 0a. Emergency survival: very low HP. Heal by any available means.
    if (this.hp < this.maxHp * 0.35) {
      const heal = this.tryHeal(map);
      if (heal) return heal;
    }

    // 1. Major boss: once all components are installed, nothing else matters. Go to its room
    //    and fight it. (Activation happens on a tick once allInstalled; it may be dormant for
    //    one tick while we approach.)
    if (map.readyForMajorBoss) {
      const boss = w.hostiles.find((h) => h.bossId === MAJOR_BOSS.id);
      if (boss && p.roomKey === boss.roomKey && !boss.defeated) {
        return this.fightBoss(boss, 'major');
      }
      // Heal up before the final fight if we can do it for free.
      if (this.hp < this.maxHp * 0.85 && w.progression.canUseSkill('repair')) {
        return { command: Commands.useSkill('repair'), action: 'heal', detail: 'pre-major repair' };
      }
      return this.travelToward(map.majorBossRoom, 'approach major');
    }

    // 2. Install a recovered component.
    const toInstall = map.missions.find(
      (m) => m.recovered && !m.installed && this.reachable(m.installRoomKey),
    );
    if (toInstall) {
      if (p.roomKey === toInstall.installRoomKey) return this.installHere(toInstall.installRoomKey);
      return this.travelToward(toInstall.installRoomKey, `install ${toInstall.id}`);
    }

    // 3. Fight the next guardian we can beat (easiest reachable first).
    const guardian = this.nextBeatableGuardian(map);
    if (guardian) {
      const boss = w.hostiles.find((h) => h.bossId === guardian.guardianBossId && !h.defeated);
      if (boss) {
        if (p.roomKey === boss.roomKey) {
          // Don't start the fight badly hurt.
          if (this.hp < this.maxHp * 0.6 && !this.bossEngaged(boss)) {
            const heal = this.tryHeal(map);
            if (heal) return heal;
          }
          return this.fightBoss(boss, `guardian:${guardian.id}`);
        }
        return this.travelToward(boss.roomKey, `hunt ${guardian.id}`);
      }
    }

    // 4. Prepare: craft an upgrade if we can, else mine, else farm XP, else grab recipes.
    const prep = this.prepare(map);
    if (prep) return prep;

    // 5. Keys / exploration.
    const key = this.neededKey(map);
    if (key) {
      if (p.roomKey === key.foundInRoomKey) return this.grabKeyHere(key.foundInRoomKey);
      return this.travelToward(key.foundInRoomKey, `key ${key.id}`);
    }
    const explore = this.exploreTarget();
    if (explore) return this.travelToward(explore, 'explore');

    return { command: Commands.wait(), action: 'wait', detail: 'idle' };
  }

  // ---- preparation -----------------------------------------------------------------------

  /** Craft / mine / shop / farm to get stronger. Returns an action or null if nothing to do. */
  private prepare(map: WorldMap): { command: Command; action: string; detail: string } | null {
    const w = this.world;
    const prog = w.progression;

    // Craft a wanted upgrade if we know it and can afford it.
    for (const id of UPGRADE_RECIPES) {
      const recipe = recipeById(id);
      if (!recipe) continue;
      if (!prog.knownRecipes.has(id)) continue;
      if (id === 'capacitor-cannon' && w.rangedUnlocked) continue;
      if (prog.hasMaterials(recipe.cost)) {
        return { command: Commands.craft(id), action: 'craft', detail: recipe.name };
      }
    }

    // Buy max-integrity from the vendor if we're flush (only in the vendor room).
    if (w.player.roomKey === map.vendorRoom) {
      const expansion = VENDOR_GOODS.find((g) => g.effect.kind === 'maxIntegrity');
      if (expansion && prog.credits >= expansion.price) {
        return { command: Commands.buy(expansion.id), action: 'buy', detail: expansion.name };
      }
      const repair = VENDOR_GOODS.find((g) => g.effect.kind === 'repair');
      if (repair && this.hp < this.maxHp * 0.5 && prog.credits >= repair.price) {
        return { command: Commands.buy(repair.id), action: 'buy', detail: repair.name };
      }
    }

    // Grab an uncollected recipe chip in this room (walking over it collects it).
    const chip = w.currentRoom.items.find((it) => it.kind === 'recipe' && !it.collected);
    if (chip) {
      const onIt = w.player.x === chip.x && w.player.y === chip.y;
      if (onIt) return { command: Commands.pickup(), action: 'pickup', detail: 'recipe chip' };
      const dir = this.stepTowardTile(chip.x, chip.y);
      if (dir) return { command: Commands.move(dir), action: 'walk', detail: 'to recipe chip' };
    }

    // Mine an ore deposit in this room for crafting materials.
    const ore = this.oreHere();
    if (ore) {
      const adjacent = Math.abs(ore.x - w.player.x) + Math.abs(ore.y - w.player.y) <= 1;
      if (adjacent) return { command: Commands.interact(), action: 'mine', detail: 'ore' };
      const dir = this.stepTowardTile(ore.x, ore.y);
      if (dir) return { command: Commands.move(dir), action: 'walk', detail: 'to ore' };
    }

    // Still under-leveled for the next guardian? Farm XP off a regular enemy in this room.
    const needPower = map.missions.some((m) => m.guardianAlive && !this.canBeatGuardian(m.guardianBossId));
    if (needPower) {
      const mob = this.weakestRegularHere();
      if (mob) {
        const dist = Math.abs(mob.x - w.player.x) + Math.abs(mob.y - w.player.y);
        if (this.hp < this.maxHp * 0.4) {
          const heal = this.tryHeal(map);
          if (heal) return heal;
        }
        if (dist === 1) return this.attackToward(mob, 'farm');
        const dir = this.stepTowardTile(mob.x, mob.y);
        if (dir) return { command: Commands.move(dir), action: 'approach', detail: 'farm xp' };
      }
      // No mob/ore/recipe here: roam to a room that has one (prefer unmined, enemy-holding).
      const target = this.farmTarget();
      if (target && target !== w.player.roomKey) return this.travelToward(target, 'seek farm');
    }

    return null;
  }

  /** The ore deposit prop in the current room, if any (and not mined out). */
  private oreHere(): { x: number; y: number } | null {
    const room = this.world.currentRoom;
    const ore = room.props.find((pr) => pr.kind === 'ore');
    return ore ? { x: ore.x, y: ore.y } : null;
  }

  /** Weakest alive non-boss hostile in the current room (best XP-per-risk farm target). */
  private weakestRegularHere(): Entity | null {
    const mobs = this.world
      .hostilesInCurrentRoom()
      .filter((h) => !h.bossId)
      .sort((a, b) => a.stats.integrity - b.stats.integrity);
    return mobs[0] ?? null;
  }

  /** A reachable room that has ore or a regular enemy to farm. */
  private farmTarget(): string | undefined {
    const w = this.world;
    for (const room of w.graph.rooms.values()) {
      if (!this.reachable(room.key)) continue;
      const hasOre = room.props.some((p) => p.kind === 'ore');
      const hasMob = w.hostiles.some((h) => !h.bossId && !h.defeated && h.roomKey === room.key);
      const hasChip = room.items.some((it) => it.kind === 'recipe' && !it.collected);
      if (hasOre || hasMob || hasChip) return room.key;
    }
    return undefined;
  }

  // ---- objective selection ---------------------------------------------------------------

  private reachable(roomKey: string): boolean {
    return findRoomRoute(this.world.graph, this.world.player.roomKey, roomKey, this.world.keys) !== null;
  }

  /** The next guardian to fight: reachable, alive, not recovered, and beatable now. Easiest first. */
  private nextBeatableGuardian(map: WorldMap): MissionView | undefined {
    const candidates = map.missions
      .filter((m) => m.guardianAlive && !m.recovered && this.reachable(m.guardianRoomKey))
      .filter((m) => this.canBeatGuardian(m.guardianBossId))
      .sort((a, b) => this.guardianHp(a.guardianBossId) - this.guardianHp(b.guardianBossId));
    return candidates[0];
  }

  private guardianHp(bossId: string): number {
    return GUARDIANS.find((g) => g.id === bossId)?.integrity ?? 0;
  }

  private neededKey(map: WorldMap) {
    for (const k of map.keys) {
      if (k.held || !this.reachable(k.foundInRoomKey)) continue;
      const gatedMission = map.missions.find(
        (m) =>
          (m.guardianRoomKey === k.gatesRoomKey && !m.recovered) ||
          (m.installRoomKey === k.gatesRoomKey && !m.installed),
      );
      const gatesMajor = k.gatesRoomKey === map.majorBossRoom && !map.majorBossDefeated;
      if (gatedMission || gatesMajor) return k;
    }
    return undefined;
  }

  private exploreTarget(): string | undefined {
    for (const room of this.world.graph.rooms.values()) {
      if (room.visited) continue;
      if (this.reachable(room.key)) return room.key;
    }
    return undefined;
  }

  // ---- movement --------------------------------------------------------------------------

  private travelToward(targetRoom: string, why: string): { command: Command; action: string; detail: string } {
    const w = this.world;
    const p = w.player;
    const route = findRoomRoute(w.graph, p.roomKey, targetRoom, w.keys);
    if (!route || route.directions.length === 0) {
      return { command: Commands.wait(), action: 'blocked', detail: `no route ${targetRoom}` };
    }
    const nextDir = route.directions[0];
    const door = w.currentRoom.doorTile(nextDir);
    if (!door) return { command: Commands.wait(), action: 'blocked', detail: `no ${nextDir} door` };

    // Core triggers a room transition when a move's DESTINATION tile is the door tile. So we
    // must stand one tile *inside* the door and then step onto it in `nextDir`. Standing on the
    // door itself and moving outward just walks into the wall/bounds (no transition).
    const inset = this.doorApproachTile(door, nextDir);
    const onApproach = p.x === inset.x && p.y === inset.y;
    if (onApproach) {
      return { command: Commands.move(nextDir), action: 'transit', detail: `${why}: ${route.rooms[1]}` };
    }
    const stepDir = this.stepTowardTile(inset.x, inset.y);
    if (stepDir) return { command: Commands.move(stepDir), action: 'walk', detail: `${why}` };

    // Blocked by hostiles inside the room; fight through.
    const adj = this.adjacentHostile();
    if (adj) return this.attackToward(adj, 'clear');
    return { command: Commands.wait(), action: 'blocked', detail: `${why}: stuck` };
  }

  /** The interior tile one step inward from a door, i.e. where you stand to step through it. */
  private doorApproachTile(door: { x: number; y: number }, dir: Direction): { x: number; y: number } {
    switch (dir) {
      case 'north': return { x: door.x, y: door.y + 1 };
      case 'south': return { x: door.x, y: door.y - 1 };
      case 'west': return { x: door.x + 1, y: door.y };
      case 'east': return { x: door.x - 1, y: door.y };
    }
  }

  private stepTowardTile(tx: number, ty: number): Direction | null {
    const w = this.world;
    const p = w.player;
    const obstacles = new Set(w.hostilesInCurrentRoom().map((h) => `${h.x},${h.y}`));
    const path = findTilePath(w.currentRoom, p.x, p.y, tx, ty, { obstacles });
    return path && path.length > 0 ? path[0] : null;
  }

  /** One step toward a tile adjacent to `target`, treating other hostiles (not the target) as
   *  obstacles. Used to close on a boss whose own tile is occupied. */
  private stepAdjacentTo(target: Entity): Direction | null {
    const w = this.world;
    const p = w.player;
    const obstacles = new Set(
      w.hostilesInCurrentRoom()
        .filter((h) => h.id !== target.id)
        .map((h) => `${h.x},${h.y}`),
    );
    const path = findTilePath(w.currentRoom, p.x, p.y, target.x, target.y, {
      obstacles,
      stopAdjacent: true,
    });
    return path && path.length > 0 ? path[0] : null;
  }

  // ---- combat ----------------------------------------------------------------------------

  private bossEngaged(boss: Entity): boolean {
    // Heuristic: the boss has taken damage (so we've committed to the fight).
    return boss.stats.integrity < boss.stats.maxIntegrity;
  }

  private fightBoss(boss: Entity, label: string): { command: Command; action: string; detail: string } {
    const w = this.world;
    const p = w.player;
    const dist = Math.abs(boss.x - p.x) + Math.abs(boss.y - p.y);

    // Retreat-heal if critically low mid-fight and a skill is ready.
    if (this.hp < this.maxHp * 0.3 && w.progression.canUseSkill('repair')) {
      return { command: Commands.useSkill('repair'), action: 'heal', detail: `${label}: repair` };
    }

    // Dodge an incoming heavy: dash out of the telegraph window if adjacent.
    if ((boss.windupMs ?? 0) > 0 && dist <= 1) {
      // Face away from the boss so the dash moves us clear.
      this.faceAway(boss);
      return { command: Commands.dash(), action: 'dash', detail: `${label}: dodge` };
    }

    // Overclock for extra DPS when healthy and it's ready.
    if (this.hp > this.maxHp * 0.55 && w.progression.canUseSkill('overclock')) {
      return { command: Commands.useSkill('overclock'), action: 'overclock', detail: `${label}: buff` };
    }

    // Adjacent: attack if our weapon is off cooldown; otherwise hold (don't waste the step).
    if (dist === 1) {
      if (p.attackCooldownMs <= 0) return this.attackToward(boss, label);
      return { command: Commands.wait(), action: 'wait', detail: `${label}: cooldown` };
    }

    // Ranged poke only when lined up, in range, AND the weapon is off cooldown. Otherwise close
    // the gap — never spam ranged on cooldown (it no-ops and burns the step budget).
    if (
      w.rangedUnlocked &&
      p.attackCooldownMs <= 0 &&
      (boss.x === p.x || boss.y === p.y) &&
      dist <= 6
    ) {
      this.faceToward(boss);
      return { command: Commands.rangedAttack(), action: 'ranged', detail: `${label}: ranged` };
    }

    // Path to a tile ADJACENT to the boss (not onto it — the boss tile is occupied).
    const stepDir = this.stepAdjacentTo(boss);
    if (stepDir) return { command: Commands.move(stepDir), action: 'approach', detail: `${label}: close` };
    // Can't path to the boss (blocked). If anything is adjacent, hit it; else wait.
    const adj = this.adjacentHostile();
    if (adj && p.attackCooldownMs <= 0) return this.attackToward(adj, `${label}: blocked`);
    return { command: Commands.wait(), action: 'wait', detail: `${label}: unreachable` };
  }

  private attackToward(target: Entity, label: string): { command: Command; action: string; detail: string } {
    this.faceToward(target);
    return { command: Commands.attack(), action: 'attack', detail: `${label}` };
  }

  private faceToward(target: Entity): void {
    const p = this.world.player;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (Math.abs(dx) >= Math.abs(dy)) p.facing = dx >= 0 ? 'right' : 'left';
    else p.facing = dy >= 0 ? 'down' : 'up';
  }

  private faceAway(target: Entity): void {
    const p = this.world.player;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (Math.abs(dx) >= Math.abs(dy)) p.facing = dx >= 0 ? 'left' : 'right';
    else p.facing = dy >= 0 ? 'up' : 'down';
  }

  private adjacentHostile(): Entity | null {
    const p = this.world.player;
    return (
      this.world.hostilesInCurrentRoom().find(
        (h) => Math.abs(h.x - p.x) + Math.abs(h.y - p.y) === 1,
      ) ?? null
    );
  }

  // ---- interactions ----------------------------------------------------------------------

  /** Walk to the install socket and install the recovered component. */
  private installHere(roomKey: string): { command: Command; action: string; detail: string } {
    const p = this.world.player;
    const dist = Math.abs(p.x - INSTALL_SOCKET.x) + Math.abs(p.y - INSTALL_SOCKET.y);
    if (dist <= 1) return { command: Commands.interact(), action: 'install', detail: `install @ ${roomKey}` };
    const dir = this.stepTowardTile(INSTALL_SOCKET.x, INSTALL_SOCKET.y);
    if (dir) return { command: Commands.move(dir), action: 'walk', detail: `to socket @ ${roomKey}` };
    return { command: Commands.wait(), action: 'blocked', detail: `socket blocked @ ${roomKey}` };
  }

  /** Collect the key card in this room (walking onto it auto-collects). */
  private grabKeyHere(roomKey: string): { command: Command; action: string; detail: string } {
    const w = this.world;
    const card = w.currentRoom.items.find((it) => it.kind === 'keycard' && !it.collected);
    if (!card) return { command: Commands.wait(), action: 'wait', detail: `key gone @ ${roomKey}` };
    if (w.player.x === card.x && w.player.y === card.y) {
      return { command: Commands.pickup(), action: 'pickup', detail: `key @ ${roomKey}` };
    }
    const dir = this.stepTowardTile(card.x, card.y);
    if (dir) return { command: Commands.move(dir), action: 'walk', detail: `to key @ ${roomKey}` };
    return { command: Commands.wait(), action: 'blocked', detail: `key blocked @ ${roomKey}` };
  }

  // ---- healing ---------------------------------------------------------------------------

  /** Best available heal action: skill if ready, else a heal station in this room, else null. */
  private tryHeal(map: WorldMap): { command: Command; action: string; detail: string } | null {
    const w = this.world;
    if (w.progression.canUseSkill('repair')) {
      return { command: Commands.useSkill('repair'), action: 'heal', detail: 'repair skill' };
    }
    // A heal station in this room.
    const station = w.currentRoom.props.find((pr) => pr.kind === 'healStation');
    if (station) {
      const adjacent = Math.abs(station.x - w.player.x) + Math.abs(station.y - w.player.y) <= 1;
      if (adjacent) return { command: Commands.interact(), action: 'heal', detail: 'heal station' };
      const dir = this.stepTowardTile(station.x, station.y);
      if (dir) return { command: Commands.move(dir), action: 'walk', detail: 'to heal station' };
    }
    // Use a stocked repair cell if we have one (carryable heal, works mid-fight).
    if (w.progression.countOf('repair cell') > 0) {
      return { command: Commands.useItem('repair cell'), action: 'heal', detail: 'repair cell' };
    }
    // Otherwise craft one if we can (it stocks a cell; we'll use it next step).
    const battery = recipeById('battery');
    if (battery && w.progression.knownRecipes.has('battery') && w.progression.hasMaterials(battery.cost)) {
      return { command: Commands.craft('battery'), action: 'craft', detail: 'craft repair cell' };
    }
    // Vendor repair if in the vendor room and affordable.
    if (w.player.roomKey === map.vendorRoom) {
      const repair = VENDOR_GOODS.find((g) => g.effect.kind === 'repair');
      if (repair && w.progression.credits >= repair.price) {
        return { command: Commands.buy(repair.id), action: 'buy', detail: 'vendor repair' };
      }
    }
    return null;
  }
}
