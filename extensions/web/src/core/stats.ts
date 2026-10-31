/**
 * The MUD's stat model, shared by the player and hostiles:
 *  - integrity: health (0 = defeated)
 *  - processing: attack output
 *  - shielding: damage reduction
 * The damage formula is centralized here so combat balance is one edit.
 */
export interface Stats {
  integrity: number;
  maxIntegrity: number;
  processing: number;
  shielding: number;
}

/** Damage dealt by an attacker to a defender: processing minus shielding, at least 1. */
export function computeDamage(attacker: Stats, defender: Stats): number {
  return Math.max(1, attacker.processing - defender.shielding);
}

/** Apply damage to a stat block, clamping integrity at 0. Returns the amount actually dealt. */
export function applyDamage(target: Stats, amount: number): number {
  const dealt = Math.min(amount, target.integrity);
  target.integrity -= dealt;
  return dealt;
}

/** Clamp integrity into [0, maxIntegrity]. */
export function clampIntegrity(stats: Stats): void {
  stats.integrity = Math.max(0, Math.min(stats.integrity, stats.maxIntegrity));
}
