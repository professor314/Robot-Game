/**
 * Render-layer settings that the player can toggle. Kept out of Core_Logic (these are purely
 * presentational) and persisted to localStorage so preferences survive reloads. Audio volume
 * settings join this module in the audio task.
 */

const STORAGE_KEY = 'robot-game.settings';

/** Game-feel feedback toggle (hit flash, damage numbers, screen shake). */
export interface GameFeelSettings {
  enabled: boolean;
}

/** The live, mutable game-feel settings object read by the render layer. */
export const gameFeel: GameFeelSettings = loadGameFeel();

function loadGameFeel(): GameFeelSettings {
  const fallback: GameFeelSettings = { enabled: true };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GameFeelSettings>;
    return { enabled: parsed.enabled ?? true };
  } catch {
    return fallback;
  }
}

/** Persist the current game-feel settings. */
export function saveGameFeel(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameFeel));
    }
  } catch {
    // Non-fatal: settings just won't persist.
  }
}

/** Toggle game-feel feedback on/off and persist. Returns the new value. */
export function toggleGameFeel(): boolean {
  gameFeel.enabled = !gameFeel.enabled;
  saveGameFeel();
  return gameFeel.enabled;
}
