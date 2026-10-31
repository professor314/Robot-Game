/**
 * Boss behavior: large-robot enemies that pursue the player and periodically wind up a
 * telegraphed heavy attack (knockback + big damage) that the player can dash out of. The Major
 * boss escalates in a second phase. Pure Core; the heavy attack lands via the combat system
 * when the wind-up timer (tracked on the entity) elapses — see state.ts.
 */

import { Brain, WorldView } from './ai';
import { Command, Commands } from './commands';
import { Entity, EntityKind, tileDistance } from './entity';
import { BossSeed } from '../data/bosses';

const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
const STEP = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
} as const;

/** Build a boss entity from its data seed, placed at (x,y) in its room. */
export function makeBossEntity(seed: BossSeed, x: number, y: number): Entity {
  return {
    id: `boss:${seed.id}`,
    kind: EntityKind.Hostile,
    name: seed.name,
    roomKey: seed.roomKey,
    x,
    y,
    facing: 'down',
    stats: {
      integrity: seed.integrity,
      maxIntegrity: seed.integrity,
      processing: seed.processing,
      shielding: seed.shielding,
    },
    attackCooldownMs: 0,
    respawnTimerMs: 0,
    defeated: false,
    brain: 'boss',
    spawn: { roomKey: seed.roomKey, x, y },
    reward: { xp: seed.xpReward, credits: seed.creditsReward, salvage: [] },
    aggroRange: seed.aggroRange,
    bossId: seed.id,
    major: seed.major,
    dropsComponent: seed.dropsComponent,
    windupMs: 0,
    pendingHeavy: 0,
  };
}

/**
 * The boss brain. Pursues the player in-room; when adjacent it issues a normal attack, and on a
 * timer it issues a `heavyAttack` command that the world turns into a telegraphed wind-up. The
 * command layer (state.ts) owns the actual wind-up/landing so the brain stays a pure chooser.
 */
export class BossBrain implements Brain {
  decide(self: Entity, view: WorldView): Command | null {
    if (self.defeated) return null;
    const player = view.player;
    if (self.roomKey !== player.roomKey) return null; // bosses hold their room

    const dist = tileDistance(self, player);

    // If a heavy attack is winding up, keep facing the target and don't act.
    if ((self.windupMs ?? 0) > 0) return Commands.wait();

    if (dist === 1) {
      // Mix in a telegraphed heavy occasionally; otherwise a normal strike.
      if (view.rng.next() < 0.35) return Commands.heavyAttack();
      return Commands.attack();
    }

    const dir = this.stepToward(self, player.x, player.y, view);
    if (dir) return Commands.move(dir);
    return Commands.wait();
  }

  private stepToward(self: Entity, tx: number, ty: number, view: WorldView): (typeof DIRECTIONS)[number] | null {
    let best: (typeof DIRECTIONS)[number] | null = null;
    let bestDist = Math.abs(tx - self.x) + Math.abs(ty - self.y);
    for (const dir of DIRECTIONS) {
      const { dx, dy } = STEP[dir];
      const nx = self.x + dx;
      const ny = self.y + dy;
      if (!view.isWalkable(self.roomKey, nx, ny)) continue;
      const d = Math.abs(tx - nx) + Math.abs(ty - ny);
      if (d < bestDist) {
        bestDist = d;
        best = dir;
      }
    }
    return best;
  }
}
