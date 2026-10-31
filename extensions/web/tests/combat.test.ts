import { describe, expect, it } from 'vitest';
import { ATTACK_COOLDOWN_MS, CombatSystem } from '../src/core/combat';
import { Entity, EntityKind } from '../src/core/entity';
import { EventBus, GameEvent } from '../src/core/events';

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e',
    kind: EntityKind.Hostile,
    name: 'E',
    roomKey: 'R',
    x: 0,
    y: 0,
    facing: 'down',
    stats: { integrity: 10, maxIntegrity: 10, processing: 5, shielding: 1 },
    attackCooldownMs: 0,
    respawnTimerMs: 0,
    defeated: false,
    brain: null,
    spawn: { roomKey: 'R', x: 0, y: 0 },
    ...overrides,
  };
}

describe('CombatSystem', () => {
  it('deals processing minus shielding, at least 1', () => {
    const bus = new EventBus();
    const combat = new CombatSystem(bus);
    const a = makeEntity({ id: 'a', stats: { integrity: 10, maxIntegrity: 10, processing: 7, shielding: 0 } });
    const b = makeEntity({ id: 'b', x: 1, stats: { integrity: 10, maxIntegrity: 10, processing: 0, shielding: 2 } });
    const result = combat.resolveAttack(a, b);
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(5);
    expect(b.stats.integrity).toBe(5);
  });

  it('does nothing when out of range', () => {
    const combat = new CombatSystem(new EventBus());
    const a = makeEntity({ id: 'a', x: 0 });
    const b = makeEntity({ id: 'b', x: 3 });
    expect(combat.resolveAttack(a, b).hit).toBe(false);
    expect(b.stats.integrity).toBe(10);
  });

  it('enforces the attack cooldown', () => {
    const combat = new CombatSystem(new EventBus());
    const a = makeEntity({ id: 'a' });
    const b = makeEntity({ id: 'b', x: 1 });
    expect(combat.resolveAttack(a, b).hit).toBe(true);
    expect(a.attackCooldownMs).toBe(ATTACK_COOLDOWN_MS);
    // Immediate second attack blocked by cooldown.
    expect(combat.resolveAttack(a, b).hit).toBe(false);
    // After cooldown elapses it can attack again.
    combat.tickCooldowns([a], ATTACK_COOLDOWN_MS);
    expect(combat.canAttack(a)).toBe(true);
  });

  it('emits attacked and defeated events and marks defeat', () => {
    const bus = new EventBus();
    const combat = new CombatSystem(bus);
    const events: GameEvent[] = [];
    bus.on((e) => events.push(e));
    const a = makeEntity({ id: 'a', stats: { integrity: 10, maxIntegrity: 10, processing: 100, shielding: 0 } });
    const b = makeEntity({ id: 'b', x: 1, stats: { integrity: 10, maxIntegrity: 10, processing: 0, shielding: 0 } });
    const result = combat.resolveAttack(a, b);
    expect(result.defeated).toBe(true);
    expect(b.defeated).toBe(true);
    expect(b.stats.integrity).toBe(0);
    expect(events.map((e) => e.type)).toEqual(['attacked', 'defeated']);
  });
});
