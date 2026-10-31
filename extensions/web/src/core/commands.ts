import { Direction } from '../data/world';

/**
 * Discrete, serializable player/agent commands. Keeping input as data (rather than direct
 * state mutation) is what makes the game network-ready: a future Colyseus server can accept
 * these same command objects from clients.
 */
export type Command =
  | { type: 'move'; dir: Direction }
  | { type: 'attack' }
  | { type: 'useSkill'; skillId: string }
  | { type: 'pickup' }
  | { type: 'wait' };

/** Convenience constructors. */
export const Commands = {
  move: (dir: Direction): Command => ({ type: 'move', dir }),
  attack: (): Command => ({ type: 'attack' }),
  useSkill: (skillId: string): Command => ({ type: 'useSkill', skillId }),
  pickup: (): Command => ({ type: 'pickup' }),
  wait: (): Command => ({ type: 'wait' }),
};
