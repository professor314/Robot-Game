import { describe, expect, it } from 'vitest';
import {
  PROFESSION_UNLOCK_LEVEL,
  Progression,
  levelForXp,
  xpForLevel,
} from '../src/core/progression';

describe('progression math', () => {
  it('level 1 needs 0 xp and thresholds increase', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBeGreaterThan(0);
    expect(xpForLevel(3)).toBeGreaterThan(xpForLevel(2));
  });

  it('levelForXp maps xp to the correct level', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(2))).toBe(2);
    expect(levelForXp(xpForLevel(3) - 1)).toBe(2);
    expect(levelForXp(xpForLevel(3))).toBe(3);
  });

  it('addXp returns the new level only when leveling up', () => {
    const p = new Progression();
    expect(p.addXp(xpForLevel(2) - 1)).toBeNull();
    expect(p.level).toBe(1);
    const leveled = p.addXp(1);
    expect(leveled).toBe(2);
    expect(p.level).toBe(2);
  });

  it('tracks credits and salvage', () => {
    const p = new Progression();
    p.addCredits(25);
    p.addCredits(15);
    p.addSalvage(['artifact', 'scrap']);
    expect(p.credits).toBe(40);
    expect(p.salvage).toEqual(['artifact', 'scrap']);
  });

  it('skills go on cooldown and recover', () => {
    const p = new Progression();
    expect(p.canUseSkill('repair')).toBe(true);
    expect(p.useSkill('repair')).toBe(true);
    expect(p.canUseSkill('repair')).toBe(false);
    expect(p.useSkill('repair')).toBe(false);
    p.tickSkills(100000);
    expect(p.canUseSkill('repair')).toBe(true);
  });

  it('unlocks professions only at level 3 with a chassis', () => {
    const p = new Progression();
    p.addXp(xpForLevel(PROFESSION_UNLOCK_LEVEL));
    expect(p.level).toBe(PROFESSION_UNLOCK_LEVEL);
    // No chassis yet → no unlock.
    expect(p.tryUnlockProfessions()).toEqual([]);
    p.chassisEquipped = true;
    const unlocked = p.tryUnlockProfessions();
    expect(unlocked.length).toBeGreaterThan(0);
    expect(p.professions.every((x) => x.unlocked)).toBe(true);
    // Second call unlocks nothing new.
    expect(p.tryUnlockProfessions()).toEqual([]);
  });
});
