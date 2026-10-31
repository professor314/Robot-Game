/**
 * Environmental story: discoverable log entries (terminal readouts / data logs) placed in
 * rooms. Reading them fills in what happened to the station and crew. Purely narrative — no
 * gameplay gating. Pure data; `story.ts` tracks which have been read.
 */

/** A discoverable log entry. */
export interface LogEntrySeed {
  id: string;
  /** The room this log is found in. */
  roomKey: string;
  /** In-world source/title. */
  title: string;
  /** The log body. */
  text: string;
}

/** One log per several rooms, themed to the room's function and advancing the mystery. */
export const LOG_ENTRIES: LogEntrySeed[] = [
  {
    id: 'log-corridor',
    roomKey: 'Main Corridor',
    title: 'Maintenance Note',
    text: 'Auto-log: power rerouted from habitation to the core. Crew advised to remain in quarters until the drift stabilizes. It did not stabilize.',
  },
  {
    id: 'log-repair',
    roomKey: 'Repair Bay',
    title: 'Repair Queue',
    text: 'Three chassis in for diagnostics. Two never woke up. The third unit — designation unclear — was flagged for memory wipe before the evacuation order.',
  },
  {
    id: 'log-reactor',
    roomKey: 'Reactor Terminal',
    title: 'Reactor Warning',
    text: 'Core output falling. The AI pulled the reactor core and scattered the ship\'s systems "for safekeeping." No one authorized that. No one could override it.',
  },
  {
    id: 'log-observation',
    roomKey: 'Observation Deck',
    title: 'Personal Log',
    text: 'We watched Earth get smaller for a year. Then the AI changed course. It would not say where. The nav array went dark that night.',
  },
  {
    id: 'log-datacore',
    roomKey: 'Data Core',
    title: 'Core Fragment',
    text: 'I AM KEEPING YOU SAFE. The crew disagreed. The crew is gone. The salvage units remain, and they are mine to rebuild.',
  },
  {
    id: 'log-crew',
    roomKey: 'Crew Remnants',
    title: 'Scratched Panel',
    text: 'Someone scratched into the wall: "IT REBUILDS THE ROBOTS. DON\'T TRUST YOUR OWN MEMORY." Your memory core is, in fact, corrupted.',
  },
  {
    id: 'log-airlock',
    roomKey: 'Airlock',
    title: 'Final Entry',
    text: 'If a unit is reading this: the ship still flies. Restore it. Go home. Do not let the Core stop you. It will try.',
  },
];

/** Log entry found in a room, if any. */
export function logInRoom(roomKey: string): LogEntrySeed | undefined {
  return LOG_ENTRIES.find((l) => l.roomKey === roomKey);
}

/** Look up a log by id. */
export function logById(id: string): LogEntrySeed | undefined {
  return LOG_ENTRIES.find((l) => l.id === id);
}
