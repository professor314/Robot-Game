import { Direction } from '../data/world';

/**
 * Game events emitted by the Core as the world changes. The render layer, HUD, audio, and
 * agent API all subscribe to these rather than reading state directly, which keeps the Core
 * free of any Phaser/DOM dependency and makes behavior observable for tests and AI.
 */
export type GameEvent =
  | { type: 'moved'; entityId: string; roomKey: string; x: number; y: number }
  | { type: 'roomEntered'; roomKey: string; firstVisit: boolean }
  | { type: 'roomChanged'; fromRoom: string; toRoom: string; dir: Direction }
  | { type: 'attacked'; attackerId: string; targetId: string; damage: number }
  | { type: 'defeated'; entityId: string; byId: string }
  | { type: 'respawned'; entityId: string; roomKey: string }
  | { type: 'reward'; xp: number; credits: number; salvage: string[] }
  | { type: 'leveledUp'; level: number }
  | { type: 'pickedUp'; itemId: string }
  | { type: 'mined'; roomKey: string; x: number; y: number; resource: string; amount: number }
  | { type: 'healed'; amount: number; integrity: number }
  | { type: 'weaponUpgraded'; name: string; weaponLevel: number; processing: number }
  | { type: 'lootDropped'; itemId: string; roomKey: string }
  | { type: 'recipeLearned'; recipeId: string; name: string }
  | { type: 'crafted'; recipeId: string; name: string }
  // v3 — story / missions
  | { type: 'storyAdvanced'; phase: string }
  | { type: 'missionUpdated'; missionId: string; status: 'active' | 'complete' }
  | { type: 'componentRecovered'; componentId: string; name: string }
  | { type: 'componentInstalled'; componentId: string; installed: number; total: number }
  | { type: 'gameWon' }
  // v3 — keys / doors
  | { type: 'doorLocked'; roomKey: string; requiredKey: string }
  | { type: 'doorUnlocked'; roomKey: string }
  | { type: 'keyFound'; keyId: string; name: string }
  // v3 — combat depth
  | { type: 'dashed'; entityId: string; x: number; y: number }
  | { type: 'rangedFired'; fromX: number; fromY: number; toX: number; toY: number; hitId: string | null }
  | { type: 'telegraph'; entityId: string; windupMs: number }
  | { type: 'knockback'; entityId: string; x: number; y: number }
  // v3 — bosses
  | { type: 'bossEngaged'; bossId: string; major: boolean }
  | { type: 'bossDefeated'; bossId: string; major: boolean }
  // v3 — economy / logs
  | { type: 'purchased'; goodId: string; name: string; credits: number }
  | { type: 'logRead'; logId: string }
  | { type: 'maxIntegrityRaised'; amount: number; maxIntegrity: number }
  | { type: 'log'; message: string; tone?: 'info' | 'good' | 'bad' };

/** A listener for game events. */
export type GameEventListener = (event: GameEvent) => void;

/**
 * A tiny synchronous event bus. Listeners are invoked in registration order. Errors in one
 * listener are isolated so a failing subscriber cannot break the game loop.
 */
export class EventBus {
  private readonly listeners = new Set<GameEventListener>();

  /** Subscribe; returns an unsubscribe function. */
  on(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Emit an event to all current listeners. */
  emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Never let a subscriber break the loop; report and continue.
        console.error('EventBus listener threw:', err);
      }
    }
  }

  /** Remove all listeners (used when tearing down a world). */
  clear(): void {
    this.listeners.clear();
  }
}
