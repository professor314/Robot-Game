/**
 * Runtime mission tracking over the static mission data. A mission is `active` until its
 * component is installed, then `complete`. This is a thin view the HUD reads; the authoritative
 * recovered/installed sets live in `story.ts`. Pure Core, serialized via its simple status map.
 */

import { MISSIONS, MissionSeed } from '../data/missions';

/** Per-mission runtime status. */
export type MissionStatus = 'active' | 'complete';

/** Tracks which missions are complete and surfaces the current objective list. */
export class MissionLog {
  /** missionId → status. Missing = active (not yet complete). */
  private readonly status = new Map<string, MissionStatus>();

  /** Mark a mission complete (its component was installed). */
  complete(missionId: string): void {
    this.status.set(missionId, 'complete');
  }

  /** Status of a mission (defaults to active). */
  statusOf(missionId: string): MissionStatus {
    return this.status.get(missionId) ?? 'active';
  }

  /** Missions still to finish, in data order. */
  active(): MissionSeed[] {
    return MISSIONS.filter((m) => this.statusOf(m.id) === 'active');
  }

  /** Count of installed/complete missions. */
  get completedCount(): number {
    return MISSIONS.filter((m) => this.statusOf(m.id) === 'complete').length;
  }

  /** Total mission count. */
  get total(): number {
    return MISSIONS.length;
  }

  /** Serialize completed mission ids. */
  snapshot(): string[] {
    return MISSIONS.filter((m) => this.statusOf(m.id) === 'complete').map((m) => m.id);
  }

  /** Restore from a list of completed mission ids. */
  restore(completed: string[]): void {
    this.status.clear();
    for (const id of completed) this.status.set(id, 'complete');
  }
}
