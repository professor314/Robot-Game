import { SaveLoadError, deserializeFromJson, serializeToJson } from '../core/save';
import { WorldState } from '../core/state';

/** localStorage key under which the single save slot is stored. */
const SAVE_KEY = 'robot-game.save';

/**
 * Browser persistence for the game state. The serialization format lives in Core (`save.ts`)
 * so it is identical headless and serverside; this adapter only moves the JSON in and out of
 * localStorage and recovers gracefully from corrupt or incompatible saves (clearing the bad
 * slot rather than crashing the game).
 */
export const Persistence = {
  /** True if a save slot exists. */
  hasSave(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  },

  /** Serialize and store the world. Returns false if storage is unavailable. */
  save(world: WorldState): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(SAVE_KEY, serializeToJson(world));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Load the save into the given world. Returns true on success. On a missing, corrupt, or
   * incompatible save it clears the bad slot and returns false — the caller keeps playing the
   * fresh world rather than crashing.
   */
  load(world: WorldState): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const json = localStorage.getItem(SAVE_KEY);
      if (json === null) return false;
      deserializeFromJson(world, json);
      return true;
    } catch (err) {
      if (err instanceof SaveLoadError) {
        console.warn(`Discarding unreadable save: ${err.message}`);
        this.clear();
      }
      return false;
    }
  },

  /** Delete the save slot. */
  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage errors.
    }
  },
};
