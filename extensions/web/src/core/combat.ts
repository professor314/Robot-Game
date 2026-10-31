import { Entity, tileDistance } from './entity';
import { EventBus } from './events';
import { Rng } from './rng';
import { applyDamage, computeDamage } from './stats';

/** Fixed attack cooldown per entity, in milliseconds. Tunable; see design (real-time combat). */
export const ATTACK_COOLDOWN_MS = 600;

/** Max fraction the bell-curve roll swings damage above/below the base value (±40%). */
const DAMAGE_VARIANCE = 0.4;

/** The outcome of resolving a single attack. */
export interface AttackResult {
  hit: boolean;
  damage: number;
  defeated: boolean;
}

/**
 * The combat subsystem interface. Combat is real-time with per-entity attack cooldowns rather
 * than global turns, and is defined behind this interface so timing/damage can be tuned or
 * swapped (e.g. for an optimized or networked implementation) without touching the render
 * layer. All methods are deterministic given the same entities, events, and dt.
 */
export interface ICombatSystem {
  /** Advance all per-entity attack cooldowns by dt. */
  tickCooldowns(entities: readonly Entity[], dtMs: number): void;
  /** True if `attacker` may attack right now (alive, cooldown elapsed). */
  canAttack(attacker: Entity): boolean;
  /** True if `target` is adjacent to `attacker` (same room, Manhattan distance 1). */
  isInRange(attacker: Entity, target: Entity): boolean;
  /**
   * Resolve a single melee attack. Applies damage, resets the attacker's cooldown, emits
   * `attacked` and (on kill) `defeated`. Returns what happened. No-op if out of range,
   * on cooldown, or either party is defeated.
   */
  resolveAttack(attacker: Entity, target: Entity): AttackResult;
}

/** The default real-time combat system. */
export class CombatSystem implements ICombatSystem {
  constructor(
    private readonly events: EventBus,
    private readonly cooldownMs: number = ATTACK_COOLDOWN_MS,
    /** Optional seeded RNG for bell-curve damage variance; omit for deterministic base damage. */
    private readonly rng?: Rng,
  ) {}

  /** Apply bell-curve variance (±DAMAGE_VARIANCE) around a base damage value, min 1. */
  private vary(base: number): number {
    if (!this.rng) return base;
    // bell() in [0,1) → factor in [1-v, 1+v], clustered at 1.0.
    const factor = 1 - DAMAGE_VARIANCE + this.rng.bell() * (2 * DAMAGE_VARIANCE);
    return Math.max(1, Math.round(base * factor));
  }

  tickCooldowns(entities: readonly Entity[], dtMs: number): void {
    for (const e of entities) {
      if (e.attackCooldownMs > 0) e.attackCooldownMs = Math.max(0, e.attackCooldownMs - dtMs);
    }
  }

  canAttack(attacker: Entity): boolean {
    return !attacker.defeated && attacker.attackCooldownMs <= 0;
  }

  isInRange(attacker: Entity, target: Entity): boolean {
    return attacker.roomKey === target.roomKey && tileDistance(attacker, target) === 1;
  }

  resolveAttack(attacker: Entity, target: Entity): AttackResult {
    const miss: AttackResult = { hit: false, damage: 0, defeated: false };
    if (attacker.defeated || target.defeated) return miss;
    if (!this.canAttack(attacker)) return miss;
    if (!this.isInRange(attacker, target)) return miss;

    const amount = this.vary(computeDamage(attacker.stats, target.stats));
    const dealt = applyDamage(target.stats, amount);
    attacker.attackCooldownMs = this.cooldownMs;

    this.events.emit({
      type: 'attacked',
      attackerId: attacker.id,
      targetId: target.id,
      damage: dealt,
    });

    const defeated = target.stats.integrity <= 0;
    if (defeated) {
      target.defeated = true;
      this.events.emit({ type: 'defeated', entityId: target.id, byId: attacker.id });
    }

    return { hit: true, damage: dealt, defeated };
  }
}
