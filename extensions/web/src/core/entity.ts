import { Stats } from './stats';

/** What kind of entity this is, for rendering and rules. */
export enum EntityKind {
  Player = 'player',
  Hostile = 'hostile',
  Npc = 'npc',
}

/** Facing/movement direction in tile space. */
export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * Any actor in the world: the player, a hostile, or an NPC. Position is a room key plus an
 * in-room tile coordinate. Behavior (AI) is attached via an optional brain id resolved by the
 * combat/AI systems, keeping the entity a plain data holder for easy serialization and
 * network sync later.
 */
export interface Entity {
  id: string;
  kind: EntityKind;
  /** Display name (e.g. "Corrupted Sentry"). */
  name: string;
  /** The room this entity is currently in. */
  roomKey: string;
  /** In-room tile coordinates. */
  x: number;
  y: number;
  facing: Facing;
  stats: Stats;
  /** Milliseconds remaining until this entity can attack again. */
  attackCooldownMs: number;
  /** For hostiles: ms until respawn when defeated (0 = alive). */
  respawnTimerMs: number;
  /** True while defeated and waiting to respawn. */
  defeated: boolean;
  /** AI brain id, or null for no autonomous behavior (e.g. the player). */
  brain: string | null;
  /** Spawn home (room + tile) used on respawn. */
  spawn: { roomKey: string; x: number; y: number };
  /** Rewards granted when this entity is defeated (hostiles only). */
  reward?: { xp: number; credits: number; salvage: string[] };
  /** Aggro range in tiles (hostiles only). */
  aggroRange?: number;

  // --- v3 fields ---
  /** Boss id (set for guardian/major bosses); drives boss behavior + no-respawn. */
  bossId?: string;
  /** True for the final major boss. */
  major?: boolean;
  /** Ship component this entity drops when defeated (guardian bosses). */
  dropsComponent?: string;
  /** Remaining wind-up (ms) before a telegraphed heavy attack lands; 0 = none pending. */
  windupMs?: number;
  /** Damage of the pending heavy attack once the wind-up elapses. */
  pendingHeavy?: number;
  /** Remaining dash invulnerability (ms); while > 0 the entity ignores incoming damage. */
  dashInvulnMs?: number;
}

/** Manhattan distance between two entities assumed to be in the same room. */
export function tileDistance(a: Entity, b: Entity): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
