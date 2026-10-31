/**
 * Optional, non-mandatory missions seeded from the space MUD's missions data. The game is
 * open-ended with no win condition (Requirement 8); these exist only as self-directed goals
 * the player may pursue or ignore. Completion is tracked but never gates play.
 */

/** A kind of objective a mission tracks. */
export type MissionGoal =
  | { kind: 'defeat'; hostileKey: string; count: number }
  | { kind: 'visit'; roomKey: string }
  | { kind: 'collect'; salvage: string; count: number };

/** An optional mission definition. */
export interface MissionSeed {
  id: string;
  name: string;
  description: string;
  goal: MissionGoal;
  rewardCredits: number;
}

/** The optional missions available in the world. */
export const MISSIONS: MissionSeed[] = [
  {
    id: 'clear-cargo',
    name: 'Clear the Cargo Wreck',
    description: 'Neutralize the Corrupted Sentry haunting the Cargo Wreck.',
    goal: { kind: 'defeat', hostileKey: 'Corrupted Sentry', count: 1 },
    rewardCredits: 50,
  },
  {
    id: 'reach-array',
    name: 'Restore Contact',
    description: 'Make your way to the Communications Array.',
    goal: { kind: 'visit', roomKey: 'Communications Array' },
    rewardCredits: 30,
  },
  {
    id: 'salvage-run',
    name: 'Salvage Run',
    description: 'Recover an artifact from a defeated hostile.',
    goal: { kind: 'collect', salvage: 'artifact', count: 1 },
    rewardCredits: 40,
  },
];
