/**
 * Player progression: XP → level, a credits wallet, salvage inventory, activatable skills, and
 * professions that unlock at level 3 once a chassis is equipped (matching the MUD's model).
 * Lives in Core_Logic with no Phaser/DOM dependency so it is testable headlessly and
 * serializable for save/load and the agent API.
 */

/** An activatable skill with a cooldown. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldownMs: number;
  /** Remaining cooldown; 0 means ready. */
  remainingMs: number;
}

/** A profession (specialization) unlocked at level 3 with a chassis equipped. */
export interface Profession {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

/** Baseline skills available from the start (seeded, sci-fi themed). */
export function defaultSkills(): Skill[] {
  return [
    {
      id: 'overclock',
      name: 'Overclock',
      description: 'Temporarily boosts processing output.',
      cooldownMs: 8000,
      remainingMs: 0,
    },
    {
      id: 'repair',
      name: 'Nanite Repair',
      description: 'Restores a chunk of integrity.',
      cooldownMs: 12000,
      remainingMs: 0,
    },
  ];
}

/** Professions that can unlock at level 3 (seeded from the MUD's specializations). */
export function defaultProfessions(): Profession[] {
  return [
    { id: 'warframe', name: 'War Frame', description: 'Combat chassis specialization.', unlocked: false },
    { id: 'scavenger', name: 'Scavenger', description: 'Salvage and credit specialization.', unlocked: false },
  ];
}

/** Level at which professions may unlock (MUD rule). */
export const PROFESSION_UNLOCK_LEVEL = 3;

/**
 * XP required to reach each level (index 0 unused; level 1 is the start). A simple escalating
 * curve: level N needs 100 * (N-1)^1.5 cumulative XP. Centralized so the curve is one edit.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

/** The highest level whose XP threshold is satisfied by `totalXp`. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  return level;
}

/** The player's progression state. */
export class Progression {
  totalXp = 0;
  level = 1;
  credits = 0;
  readonly salvage: string[] = [];
  readonly skills: Skill[] = defaultSkills();
  readonly professions: Profession[] = defaultProfessions();
  /** Whether a chassis is equipped (required for profession unlock). */
  chassisEquipped = false;

  /**
   * Countable resources the player holds, keyed by resource id (e.g. 'ore', 'component',
   * 'cell'). A single general-purpose inventory so new collectible types don't need new fields.
   */
  readonly inventory = new Map<string, number>();

  /**
   * Weapon tier. Each upgrade found auto-installs and raises this, which the combat system
   * reads as bonus attack output (processing). Starts at 0 (base weapon).
   */
  weaponLevel = 0;

  /** Mining-laser tier (0 = base). Crafting a better laser raises it (faster mining). */
  miningLevel = 0;

  /** Recipe ids the player has discovered (found as data chips in rooms). */
  readonly knownRecipes = new Set<string>();

  /** Add `amount` of a countable resource to the inventory. Returns the new total. */
  addToInventory(resource: string, amount = 1): number {
    const next = (this.inventory.get(resource) ?? 0) + amount;
    this.inventory.set(resource, next);
    return next;
  }

  /** How much of a resource the player holds. */
  countOf(resource: string): number {
    return this.inventory.get(resource) ?? 0;
  }

  /** True if the player holds at least `amount` of every listed material. */
  hasMaterials(cost: ReadonlyArray<readonly [string, number]>): boolean {
    return cost.every(([res, qty]) => this.countOf(res) >= qty);
  }

  /** Deduct a material cost from the inventory. Returns false (no change) if unaffordable. */
  spendMaterials(cost: ReadonlyArray<readonly [string, number]>): boolean {
    if (!this.hasMaterials(cost)) return false;
    for (const [res, qty] of cost) this.inventory.set(res, this.countOf(res) - qty);
    return true;
  }

  /** Install a weapon upgrade (raise the weapon tier). Returns the new tier. */
  upgradeWeapon(): number {
    this.weaponLevel += 1;
    return this.weaponLevel;
  }

  /**
   * Award XP and recompute level. Returns the new level if the player leveled up (one or more
   * levels), otherwise null. Rewards come from defeated hostiles.
   */
  addXp(amount: number): number | null {
    if (amount <= 0) return null;
    const before = this.level;
    this.totalXp += amount;
    this.level = levelForXp(this.totalXp);
    return this.level > before ? this.level : null;
  }

  /** Add credits to the wallet. */
  addCredits(amount: number): void {
    if (amount > 0) this.credits += amount;
  }

  /** Add salvage items to the inventory. */
  addSalvage(items: readonly string[]): void {
    for (const item of items) this.salvage.push(item);
  }

  /** Advance skill cooldowns by dt. */
  tickSkills(dtMs: number): void {
    for (const s of this.skills) {
      if (s.remainingMs > 0) s.remainingMs = Math.max(0, s.remainingMs - dtMs);
    }
  }

  /** True if a skill is off cooldown and can be activated. */
  canUseSkill(skillId: string): boolean {
    const s = this.skills.find((k) => k.id === skillId);
    return !!s && s.remainingMs <= 0;
  }

  /** Put a skill on cooldown (called when activated). Returns false if unknown/on cooldown. */
  useSkill(skillId: string): boolean {
    const s = this.skills.find((k) => k.id === skillId);
    if (!s || s.remainingMs > 0) return false;
    s.remainingMs = s.cooldownMs;
    return true;
  }

  /**
   * Try to unlock professions. Requires level >= 3 and a chassis equipped. Returns the ids of
   * professions newly unlocked by this call.
   */
  tryUnlockProfessions(): string[] {
    if (this.level < PROFESSION_UNLOCK_LEVEL || !this.chassisEquipped) return [];
    const newly: string[] = [];
    for (const p of this.professions) {
      if (!p.unlocked) {
        p.unlocked = true;
        newly.push(p.id);
      }
    }
    return newly;
  }
}
