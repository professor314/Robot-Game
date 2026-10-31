/**
 * Player chassis stat profiles. Each is balanced-but-flavored — a tradeoff, not a strict
 * upgrade. Applied at new-game start from the pick-your-bot screen. Pure data.
 *
 * `moveCooldownMs` gates how fast the chassis can step (lower = faster). `dashCooldownMs` gates
 * the dash. Base combat stats seed the player entity.
 */

export interface ChassisProfile {
  id: string;
  label: string;
  /** One-line tradeoff shown on the select screen. */
  tagline: string;
  maxIntegrity: number;
  processing: number;
  shielding: number;
  /** Minimum ms between steps (movement speed). */
  moveCooldownMs: number;
  /** Dash cooldown in ms. */
  dashCooldownMs: number;
}

/** The four chassis. Dome is the balanced baseline; the others trade strengths for weaknesses. */
export const CHASSIS: ChassisProfile[] = [
  {
    id: 'dome',
    label: 'Dome Waver',
    tagline: 'Balanced — a solid all-rounder.',
    maxIntegrity: 100,
    processing: 10,
    shielding: 3,
    moveCooldownMs: 120,
    dashCooldownMs: 1500,
  },
  {
    id: 'spindle',
    label: 'Spindle Walker',
    tagline: 'Fast and nimble, but fragile.',
    maxIntegrity: 75,
    processing: 9,
    shielding: 2,
    moveCooldownMs: 80,
    dashCooldownMs: 1000,
  },
  {
    id: 'tread',
    label: 'Tread Hauler',
    tagline: 'Heavily shielded, average pace.',
    maxIntegrity: 115,
    processing: 10,
    shielding: 6,
    moveCooldownMs: 130,
    dashCooldownMs: 1800,
  },
  {
    id: 'barrel',
    label: 'Barrel Bot',
    tagline: 'Tough and hard-hitting, but slow.',
    maxIntegrity: 130,
    processing: 13,
    shielding: 4,
    moveCooldownMs: 160,
    dashCooldownMs: 2200,
  },
];

/** Look up a chassis profile by id, defaulting to Dome. */
export function chassisById(id: string): ChassisProfile {
  return CHASSIS.find((c) => c.id === id) ?? CHASSIS[0];
}
