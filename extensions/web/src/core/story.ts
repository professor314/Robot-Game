/**
 * The Story_Arc state machine: the "restore the ship and fly home" progression. Pure Core state
 * (no Phaser/DOM) owned by `WorldState`, serialized in the save. It tracks which of the 7 ship
 * components have been recovered and installed, which bosses are down, and which logs are read,
 * and it drives the overall phase of the game.
 */

import { EventBus } from './events';
import { MISSIONS } from '../data/missions';

/** The high-level phase of the playthrough. */
export type StoryPhase =
  | 'intro' // just woke up; intro not yet dismissed
  | 'restoring' // recovering/installing the 7 components
  | 'finalBoss' // all 7 installed; the Major_Boss is active
  | 'departed' // Major_Boss down; ending played
  | 'freeRoam'; // post-ending open play

/** Total ship components required to restore the ship. */
export const TOTAL_COMPONENTS = MISSIONS.length;

/** Serializable snapshot of story progress. */
export interface StorySnapshot {
  phase: StoryPhase;
  recovered: string[];
  installed: string[];
  bossesDefeated: string[];
  logsRead: string[];
  introSeen: boolean;
}

/**
 * Owns narrative progress and emits `storyAdvanced` / component / win events as it changes.
 * Transitions are intentionally one-way along the arc (intro → restoring → finalBoss →
 * departed → freeRoam), except that free-roam is terminal and re-enterable from a save.
 */
export class Story {
  phase: StoryPhase = 'intro';
  introSeen = false;
  readonly recovered = new Set<string>();
  readonly installed = new Set<string>();
  readonly bossesDefeated = new Set<string>();
  readonly logsRead = new Set<string>();

  constructor(private readonly events: EventBus) {}

  /** Dismiss the intro overlay and enter the main restoring phase. */
  beginRestoring(): void {
    this.introSeen = true;
    if (this.phase === 'intro') this.setPhase('restoring');
  }

  /** Record that a ship component has been recovered (dropped by its guardian boss). */
  recoverComponent(componentId: string, name: string): void {
    if (this.recovered.has(componentId)) return;
    this.recovered.add(componentId);
    this.events.emit({ type: 'componentRecovered', componentId, name });
  }

  /** True if a component has been recovered but not yet installed. */
  hasRecovered(componentId: string): boolean {
    return this.recovered.has(componentId) && !this.installed.has(componentId);
  }

  /**
   * Install a recovered component at its install point. Advances to the final-boss phase once
   * all components are installed. Returns true if newly installed.
   */
  installComponent(componentId: string): boolean {
    if (!this.recovered.has(componentId) || this.installed.has(componentId)) return false;
    this.installed.add(componentId);
    this.events.emit({
      type: 'componentInstalled',
      componentId,
      installed: this.installed.size,
      total: TOTAL_COMPONENTS,
    });
    if (this.installed.size >= TOTAL_COMPONENTS && this.phase === 'restoring') {
      this.setPhase('finalBoss');
    }
    return true;
  }

  /** True once every component is installed (the Major_Boss may be engaged). */
  get allInstalled(): boolean {
    return this.installed.size >= TOTAL_COMPONENTS;
  }

  /** Record a defeated boss; defeating the Major_Boss wins the game. */
  bossDefeated(bossId: string, major: boolean): void {
    this.bossesDefeated.add(bossId);
    if (major && this.phase === 'finalBoss') {
      this.setPhase('departed');
      this.events.emit({ type: 'gameWon' });
    }
  }

  /** Move from the departure ending into free-roam. */
  enterFreeRoam(): void {
    if (this.phase === 'departed') this.setPhase('freeRoam');
  }

  /** Mark a log entry as read (narrative only). Returns true if newly read. */
  readLog(logId: string): boolean {
    if (this.logsRead.has(logId)) return false;
    this.logsRead.add(logId);
    this.events.emit({ type: 'logRead', logId });
    return true;
  }

  private setPhase(phase: StoryPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.events.emit({ type: 'storyAdvanced', phase });
  }

  /** Serialize story progress for the save. */
  snapshot(): StorySnapshot {
    return {
      phase: this.phase,
      recovered: [...this.recovered],
      installed: [...this.installed],
      bossesDefeated: [...this.bossesDefeated],
      logsRead: [...this.logsRead],
      introSeen: this.introSeen,
    };
  }

  /** Restore story progress from a snapshot (in place). */
  restore(snap: StorySnapshot): void {
    this.phase = snap.phase;
    this.introSeen = snap.introSeen;
    this.recovered.clear();
    snap.recovered.forEach((c) => this.recovered.add(c));
    this.installed.clear();
    snap.installed.forEach((c) => this.installed.add(c));
    this.bossesDefeated.clear();
    snap.bossesDefeated.forEach((b) => this.bossesDefeated.add(b));
    this.logsRead.clear();
    snap.logsRead.forEach((l) => this.logsRead.add(l));
  }
}
