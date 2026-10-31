import { Direction } from '../data/world';

/**
 * Discrete, serializable player/agent commands. Keeping input as data (rather than direct
 * state mutation) is what makes the game network-ready: a future Colyseus server can accept
 * these same command objects from clients.
 */
export type Command =
  | { type: 'move'; dir: Direction }
  | { type: 'attack' }
  | { type: 'heavyAttack' } // telegraphed boss heavy strike (AI only)
  | { type: 'dash' } // dash several tiles in the facing direction (i-frames)
  | { type: 'rangedAttack' } // fire a ranged weapon along the facing line
  | { type: 'useSkill'; skillId: string }
  | { type: 'pickup' }
  | { type: 'interact' } // mine / heal / install / read log / vendor (context)
  | { type: 'craft'; recipeId: string }
  | { type: 'buy'; goodId: string } // purchase from the vendor (credits)
  | { type: 'wait' };

/** Convenience constructors. */
export const Commands = {
  move: (dir: Direction): Command => ({ type: 'move', dir }),
  attack: (): Command => ({ type: 'attack' }),
  heavyAttack: (): Command => ({ type: 'heavyAttack' }),
  dash: (): Command => ({ type: 'dash' }),
  rangedAttack: (): Command => ({ type: 'rangedAttack' }),
  useSkill: (skillId: string): Command => ({ type: 'useSkill', skillId }),
  pickup: (): Command => ({ type: 'pickup' }),
  interact: (): Command => ({ type: 'interact' }),
  craft: (recipeId: string): Command => ({ type: 'craft', recipeId }),
  buy: (goodId: string): Command => ({ type: 'buy', goodId }),
  wait: (): Command => ({ type: 'wait' }),
};
