/**
 * Narrative text for the Story_Arc: the intro framing, the ending, and short mission flavor.
 * Pure data; the render layer displays it. Keeps the writing in one place so it reads
 * consistently and can be revised without touching logic.
 */

/** The wake-up intro, shown once on a new game (dismissable, non-blocking). */
export const INTRO_LINES: string[] = [
  'SYSTEM REBOOT…',
  'Unit online. Memory core: corrupted.',
  'You are a salvage robot. You do not remember why.',
  'The station around you is dark and derelict — and drifting.',
  'One ship remains at the docking port. Its systems are stripped and scattered.',
  'Restore its seven core components, and you can fly it home to Earth.',
];

/** The departure ending, shown when the ship is restored and the final boss is down. */
export const ENDING_LINES: string[] = [
  'Final component locked. Ship integrity: nominal.',
  'The core AI is silent. The way out is clear.',
  'Thrusters ignite. The station falls away behind you.',
  'Course laid in: Earth.',
  'You still do not remember who built you.',
  'But for the first time, you are going somewhere.',
];

/** Short flavor shown when a mission becomes active, keyed by mission id. */
export const MISSION_FLAVOR: Record<string, string> = {
  'reactor-core': 'Without power, nothing else matters. Find the core.',
  'nav-array': 'Blind flight is a short flight. The nav array is somewhere in the data stacks.',
  'life-support': 'The ship will need air for its passenger — you.',
  'comms-relay': 'If anyone is still out there, the relay will reach them.',
  'thruster-assembly': 'No thrust, no departure. The assembly is in the wreckage.',
  'shield-emitter': 'The void does not forgive. Raise the shields.',
  'flight-computer': 'The flight computer ties it all together. Recover it last.',
};
