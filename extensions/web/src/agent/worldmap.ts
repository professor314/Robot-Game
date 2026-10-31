/**
 * A data-derived "objective map" for planner agents: where the bosses, components, install
 * sockets, key cards, the vendor, and recipe chips are, plus live progress flags. Everything is
 * computed from the live `WorldState` + the seed data (MISSIONS, GUARDIANS, KEY_CARDS, etc.), so
 * it stays correct as the game data changes. This is the "world observation" the planner reasons
 * over, distinct from the per-room `Observation` the simple agents use.
 */

import { WorldState } from '../core/state';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../core/room';
import { MISSIONS } from '../data/missions';
import { KEY_CARDS, ROOM_LOCKS, VENDOR_ROOM } from '../data/world';

/** The install socket tile in any install room (matches Core's tryInstallComponent). */
export const INSTALL_SOCKET = {
  x: Math.floor(ROOM_WIDTH / 2),
  y: Math.floor(ROOM_HEIGHT / 2) - 1,
} as const;

/** One mission's live status for the planner. */
export interface MissionView {
  id: string;
  componentName: string;
  guardianBossId: string;
  guardianRoomKey: string;
  installRoomKey: string;
  /** The guardian boss entity id is the same as guardianBossId; is it still alive? */
  guardianAlive: boolean;
  /** Has the component been recovered (guardian killed)? */
  recovered: boolean;
  /** Has the component been installed at its socket? */
  installed: boolean;
}

/** A key card and where to pick it up / what it unlocks. */
export interface KeyView {
  id: string;
  name: string;
  /** Room this key unlocks. */
  gatesRoomKey: string;
  /** Room the card is found in. */
  foundInRoomKey: string;
  /** Does the player already hold it? */
  held: boolean;
}

/** The full objective snapshot. */
export interface WorldMap {
  phase: string;
  installedCount: number;
  totalComponents: number;
  playerRoom: string;
  missions: MissionView[];
  keys: KeyView[];
  vendorRoom: string;
  majorBossId: string;
  majorBossRoom: string;
  majorBossActive: boolean;
  majorBossDefeated: boolean;
  /** True once all components are installed and the only thing left is the major boss. */
  readyForMajorBoss: boolean;
  won: boolean;
}

/** Build the objective map from the live world state. */
export function buildWorldMap(world: WorldState): WorldMap {
  const keysHeld = world.keys;
  const aliveBoss = (id: string): boolean =>
    world.hostiles.some((h) => h.bossId === id && !h.defeated);

  const missions: MissionView[] = MISSIONS.map((m) => ({
    id: m.id,
    componentName: m.componentName,
    guardianBossId: m.guardianBossId,
    guardianRoomKey: m.guardianRoomKey,
    installRoomKey: m.installRoomKey,
    guardianAlive: aliveBoss(m.guardianBossId),
    recovered: world.story.recovered.has(m.id),
    installed: world.story.installed.has(m.id),
  }));

  const keys: KeyView[] = KEY_CARDS.map((k) => ({
    id: k.id,
    name: k.name,
    gatesRoomKey: k.roomKey,
    foundInRoomKey: k.foundInRoomKey,
    held: keysHeld.has(k.id),
  }));

  const major = world.hostiles.find((h) => h.major);
  const majorDefeated = world.story.bossesDefeated.has('major-core');
  // The major boss is "active" once it's un-dormant (not defeated flag) and all installed.
  const majorActive = !!major && !major.defeated && world.story.allInstalled;

  return {
    phase: world.story.phase,
    installedCount: world.story.installed.size,
    totalComponents: MISSIONS.length,
    playerRoom: world.player.roomKey,
    missions,
    keys,
    vendorRoom: VENDOR_ROOM,
    majorBossId: 'major-core',
    majorBossRoom: major?.spawn.roomKey ?? 'Docking Port',
    majorBossActive: majorActive,
    majorBossDefeated: majorDefeated,
    readyForMajorBoss: world.story.allInstalled && !majorDefeated,
    won: world.story.phase === 'departed' || world.story.phase === 'freeRoam',
  };
}

/** Re-export lock map for planners that reason about gating. */
export { ROOM_LOCKS };
