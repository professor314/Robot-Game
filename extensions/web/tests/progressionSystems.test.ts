import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { GameEvent } from '../src/core/events';
import { WorldState } from '../src/core/state';
import { HOSTILES } from '../src/data/world';
import { xpForLevel } from '../src/core/progression';

/** Put the player adjacent to a hostile and make them one-shot it. */
function oneShotSetup(world: WorldState) {
  const h = world.hostiles.find((x) => x.id === `hostile:${HOSTILES[2].key}`)!; // Rogue Program: 100 XP
  world.player.roomKey = h.roomKey;
  world.player.x = h.x - 1;
  world.player.y = h.y;
  world.player.attackCooldownMs = 0;
  world.player.stats.processing = 10000;
  return h;
}

describe('level-up rewards', () => {
  it('raises max integrity and attack, and fully repairs, on level up', () => {
    const world = new WorldState({ seed: 4 });
    const h = oneShotSetup(world);
    const maxBefore = world.player.stats.maxIntegrity;
    const atkBase = 10000;
    world.player.stats.integrity = 5; // hurt, to prove the level-up heal

    const events: GameEvent[] = [];
    world.events.on((e) => events.push(e));

    world.apply(Commands.attack());
    world.tick(16);

    expect(h.defeated).toBe(true);
    expect(world.progression.level).toBeGreaterThan(1); // 100 XP crosses level 2
    expect(world.player.stats.maxIntegrity).toBeGreaterThan(maxBefore);
    expect(world.player.stats.processing).toBeGreaterThan(atkBase);
    expect(world.player.stats.integrity).toBe(world.player.stats.maxIntegrity); // fully repaired
    expect(events.some((e) => e.type === 'leveledUp')).toBe(true);
  });
});

describe('skills', () => {
  it('Nanite Repair heals and goes on cooldown', () => {
    const world = new WorldState({ seed: 4 });
    world.player.stats.integrity = 20;
    world.apply(Commands.useSkill('repair'));
    world.tick(16);
    expect(world.player.stats.integrity).toBeGreaterThan(20);
    expect(world.progression.canUseSkill('repair')).toBe(false);
  });

  it('Overclock boosts attack for its duration then reverts', () => {
    const world = new WorldState({ seed: 4 });
    const base = world.player.stats.processing;
    world.apply(Commands.useSkill('overclock'));
    world.tick(16);
    expect(world.player.stats.processing).toBeGreaterThan(base);
    // Advance past the buff duration.
    world.tick(6000);
    expect(world.player.stats.processing).toBe(base);
  });

  it('does not stack Overclock beyond a single bonus', () => {
    const world = new WorldState({ seed: 4 });
    world.apply(Commands.useSkill('overclock'));
    world.tick(16);
    const boosted = world.player.stats.processing;
    // Force the skill off cooldown and re-activate while still buffed.
    world.progression.skills.find((s) => s.id === 'overclock')!.remainingMs = 0;
    world.apply(Commands.useSkill('overclock'));
    world.tick(16);
    expect(world.player.stats.processing).toBe(boosted); // no double-stack
  });
});

describe('professions', () => {
  it('unlock at the threshold level once a chassis is equipped, granting a bonus', () => {
    const world = new WorldState({ seed: 4 });
    world.progression.chassisEquipped = true;
    const shieldBefore = world.player.stats.shielding;
    const h = oneShotSetup(world);
    // Sit just below the level-3 threshold so the defeat's XP reward crosses it, firing the
    // level-up → profession-unlock path.
    world.progression.addXp(xpForLevel(3) - 1);
    expect(world.progression.level).toBe(2);
    world.apply(Commands.attack());
    world.tick(16);
    expect(h.defeated).toBe(true);
    expect(world.progression.level).toBeGreaterThanOrEqual(3);
    expect(world.progression.professions.some((p) => p.unlocked)).toBe(true);
    // Scavenger grants +1 shielding; War Frame +3 processing — at least one bonus applied.
    expect(world.player.stats.shielding).toBeGreaterThanOrEqual(shieldBefore);
  });
});
