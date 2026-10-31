import { Entity, Facing } from './entity';
import { Progression } from './progression';
import { Item, Prop, propBlocks } from './props';
import { WorldState } from './state';

/** Current save schema version. Bump when the shape changes incompatibly. */
export const SAVE_VERSION = 5;

/** Serialized stats. */
interface StatsSnapshot {
  integrity: number;
  maxIntegrity: number;
  processing: number;
  shielding: number;
}

/** Serialized entity (player or hostile). */
interface EntitySnapshot {
  id: string;
  roomKey: string;
  x: number;
  y: number;
  facing: Facing;
  stats: StatsSnapshot;
  attackCooldownMs: number;
  respawnTimerMs: number;
  defeated: boolean;
}

/** Serialized progression, including the general inventory and weapon tier. */
interface ProgressionSnapshot {
  totalXp: number;
  level: number;
  credits: number;
  salvage: string[];
  chassisEquipped: boolean;
  weaponLevel: number;
  miningLevel: number;
  knownRecipes: string[];
  inventory: [string, number][];
  skills: { id: string; remainingMs: number }[];
  professions: { id: string; unlocked: boolean }[];
}

/** Serialized room contents (props + items), so mining and dropped loot persist. */
interface RoomContentSnapshot {
  key: string;
  props: Prop[];
  items: Item[];
}

/** The complete, versioned, serializable game state. */
export interface SaveData {
  version: number;
  seed: number;
  botId: string;
  miningLaserEquipped: boolean;
  player: EntitySnapshot;
  hostiles: EntitySnapshot[];
  visitedRooms: string[];
  /** Full room contents (props + items) so mined ore and dropped loot survive a reload. */
  rooms: RoomContentSnapshot[];
  progression: ProgressionSnapshot;
}

function snapshotEntity(e: Entity): EntitySnapshot {
  return {
    id: e.id,
    roomKey: e.roomKey,
    x: e.x,
    y: e.y,
    facing: e.facing,
    stats: { ...e.stats },
    attackCooldownMs: e.attackCooldownMs,
    respawnTimerMs: e.respawnTimerMs,
    defeated: e.defeated,
  };
}

function restoreEntity(target: Entity, snap: EntitySnapshot): void {
  target.roomKey = snap.roomKey;
  target.x = snap.x;
  target.y = snap.y;
  target.facing = snap.facing;
  target.stats.integrity = snap.stats.integrity;
  target.stats.maxIntegrity = snap.stats.maxIntegrity;
  target.stats.processing = snap.stats.processing;
  target.stats.shielding = snap.stats.shielding;
  target.attackCooldownMs = snap.attackCooldownMs;
  target.respawnTimerMs = snap.respawnTimerMs;
  target.defeated = snap.defeated;
}

function snapshotProgression(p: Progression): ProgressionSnapshot {
  return {
    totalXp: p.totalXp,
    level: p.level,
    credits: p.credits,
    salvage: [...p.salvage],
    chassisEquipped: p.chassisEquipped,
    weaponLevel: p.weaponLevel,
    miningLevel: p.miningLevel,
    knownRecipes: [...p.knownRecipes],
    inventory: [...p.inventory.entries()],
    skills: p.skills.map((s) => ({ id: s.id, remainingMs: s.remainingMs })),
    professions: p.professions.map((x) => ({ id: x.id, unlocked: x.unlocked })),
  };
}

function restoreProgression(p: Progression, snap: ProgressionSnapshot): void {
  p.totalXp = snap.totalXp;
  p.level = snap.level;
  p.credits = snap.credits;
  p.salvage.length = 0;
  p.salvage.push(...snap.salvage);
  p.chassisEquipped = snap.chassisEquipped;
  p.weaponLevel = snap.weaponLevel ?? 0;
  p.miningLevel = snap.miningLevel ?? 0;
  p.knownRecipes.clear();
  for (const id of snap.knownRecipes ?? []) p.knownRecipes.add(id);
  p.inventory.clear();
  for (const [k, v] of snap.inventory ?? []) p.inventory.set(k, v);
  for (const s of snap.skills) {
    const skill = p.skills.find((k) => k.id === s.id);
    if (skill) skill.remainingMs = s.remainingMs;
  }
  for (const pr of snap.professions) {
    const prof = p.professions.find((k) => k.id === pr.id);
    if (prof) prof.unlocked = pr.unlocked;
  }
}

/** Build a versioned snapshot of the world. Lives in Core so it works headless and serverside. */
export function serialize(world: WorldState): SaveData {
  const rooms: RoomContentSnapshot[] = [...world.graph.rooms.values()].map((room) => ({
    key: room.key,
    props: room.props.map((p) => ({ ...p })),
    items: room.items.map((it) => ({ ...it })),
  }));
  return {
    version: SAVE_VERSION,
    seed: world.seed,
    botId: world.botId,
    miningLaserEquipped: world.miningLaserEquipped,
    player: snapshotEntity(world.player),
    hostiles: world.hostiles.map(snapshotEntity),
    visitedRooms: [...world.graph.rooms.values()].filter((r) => r.visited).map((r) => r.key),
    rooms,
    progression: snapshotProgression(world.progression),
  };
}

/** Serialize the world to a JSON string. */
export function serializeToJson(world: WorldState): string {
  return JSON.stringify(serialize(world));
}

/** Thrown when a save payload is missing, malformed, or an incompatible version. */
export class SaveLoadError extends Error {}

/** Validate that an unknown value is a SaveData of a supported version. */
function validate(data: unknown): SaveData {
  if (typeof data !== 'object' || data === null) {
    throw new SaveLoadError('Save is not an object.');
  }
  const d = data as Partial<SaveData>;
  if (d.version !== SAVE_VERSION) {
    throw new SaveLoadError(`Unsupported save version: ${String(d.version)} (expected ${SAVE_VERSION}).`);
  }
  if (
    !d.player ||
    !Array.isArray(d.hostiles) ||
    !Array.isArray(d.visitedRooms) ||
    !Array.isArray(d.rooms) ||
    !d.progression
  ) {
    throw new SaveLoadError('Save is missing required fields.');
  }
  return d as SaveData;
}

/**
 * Apply a snapshot onto an existing world (restoring in place). Unknown hostiles/rooms in the
 * save are ignored so an older save still loads into a newer world without crashing.
 */
export function deserialize(world: WorldState, data: unknown): void {
  const save = validate(data);

  world.miningLaserEquipped = save.miningLaserEquipped ?? false;

  restoreEntity(world.player, save.player);

  for (const snap of save.hostiles) {
    const hostile = world.hostiles.find((h) => h.id === snap.id);
    if (hostile) restoreEntity(hostile, snap);
  }

  const visited = new Set(save.visitedRooms);
  for (const room of world.graph.rooms.values()) room.visited = visited.has(room.key);

  // Restore room contents (props + items), rebuilding each room's blocked-tile set so movement
  // and mining stay consistent with the saved state.
  const byKey = new Map(save.rooms.map((r) => [r.key, r]));
  for (const room of world.graph.rooms.values()) {
    const snap = byKey.get(room.key);
    if (!snap) continue;
    room.props = snap.props.map((p) => ({ ...p }));
    room.items = snap.items.map((it) => ({ ...it }));
    room.blocked.clear();
    for (const p of room.props) if (propBlocks(p.kind)) room.blocked.add(`${p.x},${p.y}`);
  }

  restoreProgression(world.progression, save.progression);
}

/** Parse a JSON save string and apply it. Throws SaveLoadError on malformed input. */
export function deserializeFromJson(world: WorldState, json: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SaveLoadError('Save is not valid JSON.');
  }
  deserialize(world, parsed);
}
