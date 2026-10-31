import { Command, Commands } from '../core/commands';
import { GameEvent } from '../core/events';
import { ROOM_HEIGHT, ROOM_WIDTH } from '../core/room';
import { WorldOptions, WorldState } from '../core/state';
import { TileKind } from '../core/tiles';
import { Direction } from '../data/world';

/** A discrete agent action, mirroring the serializable Core commands. */
export type Action =
  | { type: 'move'; dir: Direction }
  | { type: 'attack' }
  | { type: 'useSkill'; skillId: string }
  | { type: 'pickup' }
  | { type: 'wait' };

/** A nearby entity as seen by an agent. */
export interface EntityObservation {
  id: string;
  kind: string;
  x: number;
  y: number;
  integrity: number;
  defeated: boolean;
}

/** A serializable snapshot of everything an agent can perceive. */
export interface Observation {
  tick: number;
  player: {
    roomKey: string;
    x: number;
    y: number;
    integrity: number;
    maxIntegrity: number;
    level: number;
    xp: number;
    credits: number;
    defeated: boolean;
  };
  /** The current room's tile grid as kinds, indexed [x][y]. */
  roomTiles: TileKind[][];
  roomName: string;
  /** Entities in the player's current room (excluding the player). */
  nearbyEntities: EntityObservation[];
  /** Keys of rooms the player has visited. */
  visitedRooms: string[];
  /** Actions that are legal from this observation. */
  legalActions: Action[];
}

/** The result of applying one action: the next observation, events, and whether done. */
export interface StepResult {
  observation: Observation;
  events: GameEvent[];
  /** Always false — the game is open-ended with no terminal state. */
  done: boolean;
}

/** Fixed timestep (ms) advanced per agent step, for determinism. */
export const AGENT_STEP_MS = 100;

/** Convert an agent action to a Core command. */
function toCommand(action: Action): Command {
  switch (action.type) {
    case 'move':
      return Commands.move(action.dir);
    case 'attack':
      return Commands.attack();
    case 'useSkill':
      return Commands.useSkill(action.skillId);
    case 'pickup':
      return Commands.pickup();
    case 'wait':
      return Commands.wait();
  }
}

/**
 * A headless, deterministic interface over the Core game for scripted or learning agents.
 * Modeled on a Gym-style `reset()`/`step()` loop: `observe()` returns a serializable snapshot,
 * `act()`/`step()` apply a discrete action and return the resulting observation plus the Core
 * events emitted during that step. Determinism holds given a fixed seed and action sequence.
 */
export class AgentApi {
  private world: WorldState;
  private tickCount = 0;
  private buffer: GameEvent[] = [];
  private unsubscribe: () => void;

  constructor(private readonly options: WorldOptions = {}) {
    this.world = new WorldState(options);
    this.unsubscribe = this.world.events.on((e) => this.buffer.push(e));
  }

  /** The underlying world (for a debug hook that drives the live game). */
  get state(): WorldState {
    return this.world;
  }

  /** Reset to a fresh world (same options unless overridden) and return the first observation. */
  reset(options?: WorldOptions): Observation {
    this.unsubscribe();
    this.world = new WorldState({ ...this.options, ...options });
    this.unsubscribe = this.world.events.on((e) => this.buffer.push(e));
    this.tickCount = 0;
    this.buffer = [];
    return this.observe();
  }

  /** The directions the player can currently move (has a door or walkable neighbor tile). */
  private legalActions(): Action[] {
    const actions: Action[] = [{ type: 'wait' }, { type: 'attack' }, { type: 'pickup' }];
    const room = this.world.currentRoom;
    const p = this.world.player;
    const deltas: Record<Direction, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };
    for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
      const { dx, dy } = deltas[dir];
      if (room.isWalkable(p.x + dx, p.y + dy)) actions.push({ type: 'move', dir });
    }
    for (const s of this.world.progression.skills) {
      if (this.world.progression.canUseSkill(s.id)) actions.push({ type: 'useSkill', skillId: s.id });
    }
    return actions;
  }

  /** Build a serializable observation of the current state. */
  observe(): Observation {
    const p = this.world.player;
    const prog = this.world.progression;
    const room = this.world.currentRoom;
    const tiles: TileKind[][] = [];
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const col: TileKind[] = [];
      for (let y = 0; y < ROOM_HEIGHT; y++) col.push(room.tiles[x][y]);
      tiles.push(col);
    }
    return {
      tick: this.tickCount,
      player: {
        roomKey: p.roomKey,
        x: p.x,
        y: p.y,
        integrity: p.stats.integrity,
        maxIntegrity: p.stats.maxIntegrity,
        level: prog.level,
        xp: prog.totalXp,
        credits: prog.credits,
        defeated: p.defeated,
      },
      roomTiles: tiles,
      roomName: room.key,
      nearbyEntities: this.world.hostilesInCurrentRoom().map((h) => ({
        id: h.id,
        kind: h.kind,
        x: h.x,
        y: h.y,
        integrity: h.stats.integrity,
        defeated: h.defeated,
      })),
      visitedRooms: [...this.world.graph.rooms.values()].filter((r) => r.visited).map((r) => r.key),
      legalActions: this.legalActions(),
    };
  }

  /** Apply an action, advance one fixed step, and return the result. */
  act(action: Action): StepResult {
    this.buffer = [];
    this.world.apply(toCommand(action));
    this.world.tick(AGENT_STEP_MS);
    this.tickCount++;
    return { observation: this.observe(), events: this.buffer, done: false };
  }

  /** Alias for `act`, matching the Gym-style `step` name. */
  step(action: Action): StepResult {
    return this.act(action);
  }
}
