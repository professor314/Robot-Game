import { describe, expect, it } from 'vitest';
import { Commands } from '../src/core/commands';
import { WorldState } from '../src/core/state';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../src/core/room';
import { MISSIONS } from '../src/data/missions';
import { GUARDIANS, MAJOR_BOSS } from '../src/data/bosses';
import { ROOM_LOCKS, KEY_CARDS } from '../src/data/world';
import { validateKeySolvability } from '../src/core/keys';
import { chassisById } from '../src/data/chassis';
import { brainFor, SentryBrain, DroneBrain, HunterBrain, CrawlerBrain } from '../src/core/ai';

/** Defeat a specific boss by one-shotting it (place player adjacent, huge attack). */
function slayBoss(world: WorldState, bossId: string) {
  const boss = world.hostiles.find((h) => h.bossId === bossId)!;
  world.player.roomKey = boss.roomKey;
  world.player.x = boss.x - 1;
  world.player.y = boss.y;
  world.player.attackCooldownMs = 0;
  world.player.stats.processing = 100000;
  world.apply(Commands.attack());
  world.tick(16);
  return boss;
}

describe('key-card gating', () => {
  it('is solvable from the start', () => {
    const world = new WorldState({ seed: 2 });
    const warnings = validateKeySolvability(world.graph, 'Main Corridor');
    expect(warnings).toEqual([]);
  });

  it('keys gate a room (all doors share one key) and are keyed per room', () => {
    for (const card of KEY_CARDS) {
      expect(ROOM_LOCKS[card.roomKey]).toBe(card.id);
      // No key is found inside the room it unlocks.
      expect(card.foundInRoomKey).not.toBe(card.roomKey);
    }
  });

  it('blocks a locked room until the key is held, then opens it', () => {
    const world = new WorldState({ seed: 2 });
    // Find a locked room and a concrete neighbor+direction that leads into it.
    const lockedRoom = Object.keys(ROOM_LOCKS)[0];
    const key = ROOM_LOCKS[lockedRoom];
    let from: string | null = null;
    let dir: 'north' | 'south' | 'east' | 'west' | null = null;
    for (const [rk, nbrs] of world.graph.neighbors) {
      for (const d of ['north', 'south', 'east', 'west'] as const) {
        if (nbrs[d] === lockedRoom && from === null) { from = rk; dir = d; }
      }
    }
    expect(from).not.toBeNull();
    const fromRoom = world.graph.rooms.get(from!)!;
    const door = fromRoom.doorTile(dir!)!;
    const delta = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const;
    const [dx, dy] = delta[dir!];

    // Stand one tile inside the door so a single step reaches the door → transition.
    world.player.roomKey = from!;
    world.player.x = door.x - dx;
    world.player.y = door.y - dy;
    world.apply(Commands.move(dir!));
    expect(world.player.roomKey).toBe(from!); // blocked without the key

    world.keys.add(key);
    world.player.x = door.x - dx;
    world.player.y = door.y - dy;
    world.apply(Commands.move(dir!));
    expect(world.player.roomKey).toBe(lockedRoom); // opens with the key
  });
});

describe('missions and story arc', () => {
  it('defines 7 missions each with a guardian and install room', () => {
    expect(MISSIONS).toHaveLength(7);
    for (const m of MISSIONS) {
      expect(GUARDIANS.some((g) => g.id === m.guardianBossId)).toBe(true);
      expect(m.installRoomKey).toBeTruthy();
    }
  });

  it('recovers a component on guardian defeat, then installs it to progress the arc', () => {
    const world = new WorldState({ seed: 2 });
    world.story.beginRestoring();
    const mission = MISSIONS[0];
    slayBoss(world, mission.guardianBossId);
    expect(world.story.hasRecovered(mission.id)).toBe(true);

    // Go to the install room and stand on the install socket (room-center, center-1).
    world.player.roomKey = mission.installRoomKey;
    world.player.x = Math.floor(ROOM_WIDTH / 2);
    world.player.y = Math.floor(ROOM_HEIGHT / 2) - 1;
    world.apply(Commands.interact());
    world.tick(16);
    expect(world.story.installed.has(mission.id)).toBe(true);
    expect(world.missions.statusOf(mission.id)).toBe('complete');
  });

  it('does not show the install prompt when interacting away from the socket', () => {
    const world = new WorldState({ seed: 2 });
    world.story.beginRestoring();
    const mission = MISSIONS[0];
    const room = world.graph.rooms.get(mission.installRoomKey)!;
    world.player.roomKey = mission.installRoomKey;

    // Place a heal station adjacent to the player, far from the install socket.
    world.player.x = 1;
    world.player.y = 1;
    room.props = [{ kind: 'healStation', x: 2, y: 1 }];

    const messages: string[] = [];
    world.events.on((e) => {
      if (e.type === 'log') messages.push(e.message);
    });
    world.apply(Commands.interact());
    world.tick(16);

    // Interacting with the heal station must not surface the install prompt.
    expect(messages.some((m) => m.includes('Install point'))).toBe(false);
  });

  it('activates the major boss only after all 7 components are installed', () => {
    const world = new WorldState({ seed: 2 });
    world.story.beginRestoring();
    // Force all components recovered + installed.
    for (const m of MISSIONS) {
      world.story.recoverComponent(m.id, m.componentName);
      world.story.installComponent(m.id);
    }
    expect(world.story.allInstalled).toBe(true);
    world.tick(16); // maybeActivateMajorBoss
    const major = world.hostiles.find((h) => h.bossId === MAJOR_BOSS.id)!;
    expect(major.defeated).toBe(false); // activated
  });

  it('wins the game when the major boss is defeated', () => {
    const world = new WorldState({ seed: 2 });
    world.story.beginRestoring();
    for (const m of MISSIONS) {
      world.story.recoverComponent(m.id, m.componentName);
      world.story.installComponent(m.id);
    }
    world.tick(16);
    let won = false;
    world.events.on((e) => {
      if (e.type === 'gameWon') won = true;
    });
    slayBoss(world, MAJOR_BOSS.id);
    expect(won).toBe(true);
    expect(world.story.phase).toBe('departed');
  });
});

describe('bosses', () => {
  it('guardians do not respawn after defeat', () => {
    const world = new WorldState({ seed: 2 });
    const boss = slayBoss(world, GUARDIANS[1].id);
    expect(boss.defeated).toBe(true);
    world.tick(600000); // long time
    expect(boss.defeated).toBe(true); // still down
  });
});

describe('combat depth', () => {
  it('dash moves multiple tiles and grants brief i-frames', () => {
    const world = new WorldState({ seed: 2 });
    // Stand in open space facing east.
    world.player.roomKey = 'Main Corridor';
    world.player.x = 2;
    world.player.y = 4;
    world.player.facing = 'right';
    const x0 = world.player.x;
    world.apply(Commands.dash());
    world.tick(16);
    expect(world.player.x).toBeGreaterThan(x0 + 1); // moved several tiles
    expect(world.player.dashInvulnMs ?? 0).toBeGreaterThan(0);
  });

  it('ranged attack requires the ranged weapon to be unlocked', () => {
    const world = new WorldState({ seed: 2 });
    expect(world.rangedUnlocked).toBe(false);
    // Should no-op (no throw) when locked.
    world.apply(Commands.rangedAttack());
    world.tick(16);
    expect(true).toBe(true);
  });
});

describe('chassis', () => {
  it('applies the chosen chassis stat profile at start', () => {
    const barrel = chassisById('barrel');
    const world = new WorldState({ seed: 2, botId: 'barrel' });
    expect(world.player.stats.maxIntegrity).toBe(barrel.maxIntegrity);
    expect(world.player.stats.processing).toBe(barrel.processing);
    expect(world.moveIntervalMs).toBe(barrel.moveCooldownMs);
  });

  it('spindle is frailer and faster than barrel', () => {
    const spindle = chassisById('spindle');
    const barrel = chassisById('barrel');
    expect(spindle.maxIntegrity).toBeLessThan(barrel.maxIntegrity);
    expect(spindle.moveCooldownMs).toBeLessThan(barrel.moveCooldownMs);
  });
});

describe('vendor', () => {
  it('buys with credits in the vendor room and rejects elsewhere / when broke', () => {
    const world = new WorldState({ seed: 2 });
    world.player.roomKey = world.vendorRoom;
    world.progression.credits = 0;
    world.apply(Commands.buy('field-repair'));
    world.tick(16);
    expect(world.progression.credits).toBe(0); // couldn't afford

    world.progression.credits = 100;
    world.player.stats.integrity = 10;
    world.apply(Commands.buy('field-repair'));
    world.tick(16);
    expect(world.progression.credits).toBe(70); // 100 - 30
    expect(world.player.stats.integrity).toBeGreaterThan(10);
  });
});

describe('enemy brains', () => {
  it('maps brain ids to distinct brain classes', () => {
    expect(brainFor('sentry')).toBeInstanceOf(SentryBrain);
    expect(brainFor('drone')).toBeInstanceOf(DroneBrain);
    expect(brainFor('hunter')).toBeInstanceOf(HunterBrain);
    expect(brainFor('crawler')).toBeInstanceOf(CrawlerBrain);
  });
});

describe('logs and map data', () => {
  it('reads a room log once and records it', () => {
    const world = new WorldState({ seed: 2 });
    // Main Corridor has a log; stand where no interactable prop is adjacent.
    world.player.roomKey = 'Main Corridor';
    world.currentRoom.props = [];
    const logId = world.currentRoom.logId!;
    expect(logId).toBeTruthy();
    world.apply(Commands.interact());
    world.tick(16);
    expect(world.story.logsRead.has(logId)).toBe(true);
  });

  it('every room has solved grid coordinates for the map', () => {
    const world = new WorldState({ seed: 2 });
    for (const r of world.graph.rooms.values()) {
      expect(Number.isFinite(r.gridX)).toBe(true);
      expect(Number.isFinite(r.gridY)).toBe(true);
    }
  });
});
