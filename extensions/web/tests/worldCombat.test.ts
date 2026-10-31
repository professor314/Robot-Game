import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { GameEvent } from '../src/core/events';
import { WorldState } from '../src/core/state';
import { HOSTILES } from '../src/data/world';

/** Put the player next to a chosen hostile, in its room, both alive and ready. */
function engage(world: WorldState, hostileKey: string) {
  const hostile = world.hostiles.find((h) => h.id === `hostile:${hostileKey}`)!;
  world.player.roomKey = hostile.roomKey;
  world.player.x = hostile.x - 1;
  world.player.y = hostile.y;
  world.player.attackCooldownMs = 0;
  return hostile;
}

describe('world combat, rewards, and respawn', () => {
  it('defeats a hostile, grants rewards, and schedules respawn', () => {
    const world = new WorldState({ seed: 1 });
    const seed = HOSTILES[1]; // Haywire Drone: weaker, no salvage
    const hostile = engage(world, seed.key);
    // Make the player strong enough to one-shot for a deterministic test.
    world.player.stats.processing = 1000;

    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));

    world.apply(Commands.attack());
    world.tick(16);

    expect(hostile.defeated).toBe(true);
    expect(world.progression.totalXp).toBe(seed.xpReward);
    expect(world.progression.credits).toBe(seed.creditsReward);
    expect(hostile.respawnTimerMs).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'reward')).toBe(true);
  });

  it('respawns a defeated hostile at full integrity after its delay', () => {
    const world = new WorldState({ seed: 1 });
    const seed = HOSTILES[1];
    const hostile = engage(world, seed.key);
    world.player.stats.processing = 1000;

    world.apply(Commands.attack());
    world.tick(16);
    expect(hostile.defeated).toBe(true);

    // Advance past the respawn delay.
    world.tick(seed.respawnDelaySec * 1000 + 1);
    expect(hostile.defeated).toBe(false);
    expect(hostile.stats.integrity).toBe(hostile.stats.maxIntegrity);
    expect(hostile.roomKey).toBe(hostile.spawn.roomKey);
  });

  it('leaves the player defeated on death (terminal game over, no auto-respawn)', () => {
    const world = new WorldState({ seed: 1, config: { safeRoom: 'Main Corridor', defeatPenalty: 0.25, playerRespawnDelayMs: 1000 } });
    const seed = HOSTILES[2]; // Rogue Program: high processing
    engage(world, seed.key);
    // Weaken the player so the hostile defeats it, and let the hostile hit.
    world.player.stats.integrity = 1;
    world.player.stats.shielding = 0;

    // Several ticks so the hostile's AI (gated to one step per interval) attacks the player.
    const defeatEvents: GameEvent[] = [];
    world.events.on((e) => {
      if (e.type === 'defeated' && e.entityId === 'player') defeatEvents.push(e);
    });
    for (let i = 0; i < 20 && !world.player.defeated; i++) world.tick(500);
    expect(world.player.defeated).toBe(true);
    expect(defeatEvents.length).toBeGreaterThan(0);

    // Player defeat is terminal: further ticks do NOT auto-respawn (the UI offers restart).
    world.tick(5000);
    expect(world.player.defeated).toBe(true);
  });

  it('respawnPlayerInPlace restores the player at the safe room with a penalty', () => {
    const world = new WorldState({ seed: 1, config: { safeRoom: 'Main Corridor', defeatPenalty: 0.25, playerRespawnDelayMs: 1000 } });
    world.player.defeated = true;
    world.player.stats.integrity = 0;

    world.respawnPlayerInPlace();

    expect(world.player.defeated).toBe(false);
    expect(world.player.roomKey).toBe('Main Corridor');
    expect(world.player.stats.integrity).toBeGreaterThanOrEqual(1);
    expect(world.player.stats.integrity).toBeLessThan(world.player.stats.maxIntegrity);
  });

  it('is deterministic for the same seed and inputs', () => {
    const run = () => {
      const world = new WorldState({ seed: 42 });
      const hostile = engage(world, HOSTILES[0].key);
      world.player.stats.processing = 7;
      const integrities: number[] = [];
      for (let i = 0; i < 5; i++) {
        world.player.attackCooldownMs = 0;
        world.apply(Commands.attack());
        world.tick(16);
        integrities.push(hostile.stats.integrity);
      }
      return integrities;
    };
    expect(run()).toEqual(run());
  });
});
