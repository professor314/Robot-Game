/**
 * Self-play runner: drives the PlannerAgent over one or more seeds until it beats the game, and
 * reports what happened. This is the winnability tool. Use it in a test (or a script) to assert
 * that a change to the game data/mechanics did not make the game impossible to finish.
 *
 * It is pure Core logic (no Phaser/DOM), so it runs fast and headless under Vitest.
 */

import { WorldState } from '../core/state';
import { GameEvent } from '../core/events';
import { PlannerAgent } from './planner';

/** Outcome of a single playthrough attempt. */
export interface RunResult {
  seed: number;
  botId: string;
  won: boolean;
  died: boolean;
  steps: number;
  /** Components installed by the end. */
  installed: number;
  /** Final story phase. */
  phase: string;
  /** Key milestone events in order (boss defeats, installs, keys, win). */
  milestones: string[];
  /** Why the run ended: 'won' | 'died' | 'budget' | 'stuck'. */
  reason: string;
}

/** Options for a single run. */
export interface RunOptions {
  seed?: number;
  botId?: string;
  /** Max planner steps before giving up this attempt. */
  maxSteps?: number;
  /** Fixed ms advanced per step. */
  dtMs?: number;
}

/** Play one full game with the planner from a fresh world. */
export function playOnce(opts: RunOptions = {}): RunResult {
  const seed = opts.seed ?? 1;
  const botId = opts.botId ?? 'barrel'; // tanky chassis gives the planner the best odds
  const maxSteps = opts.maxSteps ?? 20000;
  const dtMs = opts.dtMs ?? 100;

  const world = new WorldState({ seed, botId });
  const milestones: string[] = [];
  world.events.on((e: GameEvent) => {
    switch (e.type) {
      case 'bossDefeated':
        milestones.push(`boss:${e.bossId}`);
        break;
      case 'componentInstalled':
        milestones.push(`install:${e.componentId}(${e.installed}/${e.total})`);
        break;
      case 'keyFound':
        milestones.push(`key:${e.keyId}`);
        break;
      case 'gameWon':
        milestones.push('WON');
        break;
    }
  });

  const planner = new PlannerAgent(world);

  // Detect being stuck: if nothing meaningful changes for a long stretch, bail this attempt.
  let steps = 0;
  let lastProgress = 0;
  let lastSignature = '';
  for (; steps < maxSteps; steps++) {
    if (planner.won) break;
    if (planner.dead) break;
    planner.step(dtMs);

    // Progress signature: installs + bosses down + keys + room. If it stalls too long, stop.
    const sig =
      `${world.story.installed.size}|${world.story.bossesDefeated.size}|` +
      `${world.keys.size}|${world.player.roomKey}`;
    if (sig !== lastSignature) {
      lastSignature = sig;
      lastProgress = steps;
    } else if (steps - lastProgress > 2500) {
      // No change in room / progress for a long time — treat as stuck.
      break;
    }
  }

  const won = planner.won;
  const died = planner.dead;
  const reason = won ? 'won' : died ? 'died' : steps >= maxSteps ? 'budget' : 'stuck';

  return {
    seed,
    botId,
    won,
    died,
    steps,
    installed: world.story.installed.size,
    phase: world.story.phase,
    milestones,
    reason,
  };
}

/** Summary across many attempts. */
export interface SelfPlaySummary {
  attempts: number;
  wins: number;
  firstWin?: RunResult;
  results: RunResult[];
}

/**
 * Keep trying across the given seeds until the planner beats the game, or the seeds run out.
 * Returns the first winning run (if any) plus every run's result for diagnostics.
 */
export function playUntilWin(
  seeds: number[] = [1, 2, 3, 4, 5, 7, 11, 13, 42, 99],
  opts: Omit<RunOptions, 'seed'> = {},
): SelfPlaySummary {
  const results: RunResult[] = [];
  let firstWin: RunResult | undefined;
  for (const seed of seeds) {
    const r = playOnce({ ...opts, seed });
    results.push(r);
    if (r.won && !firstWin) {
      firstWin = r;
      break; // stop at the first win; the game is proven beatable
    }
  }
  return {
    attempts: results.length,
    wins: results.filter((r) => r.won).length,
    firstWin,
    results,
  };
}
