/**
 * Key-card gating. A lock is a property of a ROOM, not a door — so every door into a locked
 * room requires the same card, which keeps multi-entrance rooms consistent (Requirement 3.2).
 * Pure Core; the player's held keys live in `Progression.inventory`-adjacent state on the world.
 *
 * Also provides a build-time solvability check: no key may gate the room that contains it, and
 * each locked room's key must be reachable without passing that same lock from the start.
 */

import { KEY_CARDS, KeyCardSeed, ROOM_LOCKS } from '../data/world';
import { RoomGraph } from './roomGraph';

/** The key id required to enter a room, or undefined if it's open. */
export function requiredKeyFor(roomKey: string): string | undefined {
  return ROOM_LOCKS[roomKey];
}

/** The key-card seed whose card is found in a given room, if any. */
export function keyFoundIn(roomKey: string): KeyCardSeed | undefined {
  return KEY_CARDS.find((k) => k.foundInRoomKey === roomKey);
}

/** A warning produced while validating key-card solvability. */
export interface KeyWarning {
  message: string;
}

/**
 * Validate that the key gating is solvable from `startRoom`: walking only through currently
 * unlockable rooms, every key becomes reachable, and no key is locked inside the very room it
 * opens. Returns any problems (empty = solvable). Deterministic; logged at world construction.
 */
export function validateKeySolvability(graph: RoomGraph, startRoom: string): KeyWarning[] {
  const warnings: KeyWarning[] = [];

  // A key must not be found inside the room it unlocks.
  for (const card of KEY_CARDS) {
    if (card.foundInRoomKey === card.roomKey) {
      warnings.push({ message: `Key "${card.id}" is locked inside the room it opens ("${card.roomKey}").` });
    }
  }

  // BFS from start, picking up keys as their rooms become reachable, until no progress.
  const held = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    const reachable = reachableRooms(graph, startRoom, held);
    for (const card of KEY_CARDS) {
      if (!held.has(card.id) && reachable.has(card.foundInRoomKey)) {
        held.add(card.id);
        progressed = true;
      }
    }
  }
  for (const card of KEY_CARDS) {
    if (!held.has(card.id)) {
      warnings.push({ message: `Key "${card.id}" (for "${card.roomKey}") is unreachable from "${startRoom}".` });
    }
  }
  return warnings;
}

/** Rooms reachable from start given a set of held keys (locked rooms need their key). */
function reachableRooms(graph: RoomGraph, startRoom: string, held: ReadonlySet<string>): Set<string> {
  const seen = new Set<string>([startRoom]);
  const queue = [startRoom];
  while (queue.length > 0) {
    const key = queue.shift()!;
    const neighbors = graph.neighbors.get(key) ?? {};
    for (const dir of Object.keys(neighbors) as (keyof typeof neighbors)[]) {
      const next = neighbors[dir];
      if (!next || seen.has(next)) continue;
      const req = requiredKeyFor(next);
      if (req && !held.has(req)) continue; // locked and no key
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}
