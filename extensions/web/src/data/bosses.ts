/**
 * Boss definitions: the 7 Guardian_Bosses (one per ship component) and the 1 Major_Boss that
 * guards the ship's departure. Pure data — stats, behavior knobs, art key, and the component a
 * guardian drops. `core/boss.ts` turns these into entities with a boss brain; the major boss is
 * tuned so it is very hard without several crafted upgrades.
 */

/** Which enemy-art sprite a boss uses (reuses the enemy art set, scaled up). */
export type BossArt = 'sentry' | 'drone' | 'program' | 'crawler' | 'hunter';

/** A boss definition. */
export interface BossSeed {
  id: string;
  name: string;
  /** Room the boss occupies. */
  roomKey: string;
  art: BossArt;
  integrity: number;
  processing: number;
  shielding: number;
  /** Aggro range in tiles. */
  aggroRange: number;
  /** Wind-up (ms) before a telegraphed heavy attack lands. */
  windupMs: number;
  /** Heavy-attack damage (before the defender's shielding). */
  heavyDamage: number;
  xpReward: number;
  creditsReward: number;
  /** The ship component this guardian drops (undefined for the major boss). */
  dropsComponent?: string;
  /** True for the final major boss. */
  major: boolean;
}

/** The seven guardians, each guarding a ship component in its mission room. */
export const GUARDIANS: BossSeed[] = [
  {
    id: 'guardian-sentinel', name: 'Sentinel Frame', roomKey: 'Storage Hub', art: 'sentry',
    integrity: 160, processing: 14, shielding: 5, aggroRange: 6, windupMs: 900, heavyDamage: 18,
    xpReward: 200, creditsReward: 80, dropsComponent: 'reactor-core', major: false,
  },
  {
    id: 'guardian-watcher', name: 'Watcher Unit', roomKey: 'Data Core', art: 'program',
    integrity: 150, processing: 16, shielding: 4, aggroRange: 7, windupMs: 800, heavyDamage: 16,
    xpReward: 200, creditsReward: 80, dropsComponent: 'nav-array', major: false,
  },
  {
    id: 'guardian-warden', name: 'Shaft Warden', roomKey: 'Maintenance Shaft', art: 'crawler',
    integrity: 180, processing: 15, shielding: 6, aggroRange: 5, windupMs: 850, heavyDamage: 20,
    xpReward: 220, creditsReward: 90, dropsComponent: 'life-support', major: false,
  },
  {
    id: 'guardian-breaker', name: 'Lab Breaker', roomKey: 'Breached Lab', art: 'hunter',
    integrity: 170, processing: 18, shielding: 4, aggroRange: 7, windupMs: 750, heavyDamage: 19,
    xpReward: 240, creditsReward: 100, dropsComponent: 'comms-relay', major: false,
  },
  {
    id: 'guardian-hauler', name: 'Cargo Hauler', roomKey: 'Cargo Wreck', art: 'sentry',
    integrity: 220, processing: 17, shielding: 7, aggroRange: 6, windupMs: 950, heavyDamage: 22,
    xpReward: 260, creditsReward: 110, dropsComponent: 'thruster-assembly', major: false,
  },
  {
    id: 'guardian-bastion', name: 'Drift Bastion', roomKey: 'Debris Drift', art: 'crawler',
    integrity: 240, processing: 19, shielding: 8, aggroRange: 6, windupMs: 900, heavyDamage: 24,
    xpReward: 300, creditsReward: 130, dropsComponent: 'shield-emitter', major: false,
  },
  {
    id: 'guardian-cipher', name: 'Corridor Cipher', roomKey: 'Collapsed Corridor', art: 'program',
    integrity: 260, processing: 20, shielding: 7, aggroRange: 7, windupMs: 800, heavyDamage: 25,
    xpReward: 320, creditsReward: 140, dropsComponent: 'flight-computer', major: false,
  },
];

/**
 * The final Major_Boss, guarding departure at the Docking Port. Only engaged after all 7
 * components are installed. Tuned high: without several crafted upgrades (weapon, armor,
 * max-integrity) it out-damages and out-lasts the player. Has a second phase under 50% HP.
 */
export const MAJOR_BOSS: BossSeed = {
  id: 'major-core', name: 'Station Core', roomKey: 'Docking Port', art: 'hunter',
  integrity: 600, processing: 26, shielding: 10, aggroRange: 9, windupMs: 700, heavyDamage: 34,
  xpReward: 1000, creditsReward: 500, major: true,
};

/** Fraction of max integrity at which the Major_Boss enters its faster second phase. */
export const MAJOR_BOSS_PHASE2 = 0.5;

/** All bosses (guardians + major). */
export const ALL_BOSSES: BossSeed[] = [...GUARDIANS, MAJOR_BOSS];

/** Look up a boss by id. */
export function bossById(id: string): BossSeed | undefined {
  return ALL_BOSSES.find((b) => b.id === id);
}
