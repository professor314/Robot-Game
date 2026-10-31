import { VoiceKind, note, playNote } from './synth';

/**
 * The original Robot-Game theme, composed for this project in the spirit of late-1980s
 * Sunsoft NES soundtracks (driving triangle bass, syncopated square lead). It is NOT a copy of
 * Blaster Master or any commercial track — only the style is referenced. Two variants share
 * the same harmony so they transition cleanly: a calmer "exploration" mix and a faster, busier
 * "combat" mix.
 */

/** One step in a channel pattern: a MIDI note (or null for a rest) held for `steps` steps. */
interface Step {
  midi: number | null;
  steps: number;
}

/** A single channel's pattern plus its voice and gain. */
interface Channel {
  voice: VoiceKind;
  gain: number;
  pattern: Step[];
}

/** A full track: tempo + channels. */
export interface Track {
  bpm: number;
  /** Steps per beat (16th-note grid at 4). */
  stepsPerBeat: number;
  channels: Channel[];
}

const A = (o: number) => note('A', o);
const C = (o: number) => note('C', o);
const D = (o: number) => note('D', o);
const E = (o: number) => note('E', o);
const F = (o: number) => note('F', o);
const G = (o: number) => note('G', o);

// A minor-flavored 8-bar bassline shared by both variants (triangle channel).
const BASS: Step[] = [
  { midi: A(2), steps: 2 }, { midi: A(2), steps: 2 }, { midi: E(2), steps: 2 }, { midi: E(2), steps: 2 },
  { midi: F(2), steps: 2 }, { midi: F(2), steps: 2 }, { midi: G(2), steps: 2 }, { midi: G(2), steps: 2 },
];

// Calmer lead for exploration: sparse, legato square line.
const EXPLORE_LEAD: Step[] = [
  { midi: A(4), steps: 4 }, { midi: C(5), steps: 4 }, { midi: E(5), steps: 4 }, { midi: D(5), steps: 4 },
  { midi: C(5), steps: 4 }, { midi: A(4), steps: 4 }, { midi: G(4), steps: 8 },
];

// Busier lead for combat: faster, more syncopated.
const COMBAT_LEAD: Step[] = [
  { midi: A(4), steps: 2 }, { midi: E(5), steps: 2 }, { midi: A(4), steps: 2 }, { midi: C(5), steps: 2 },
  { midi: E(5), steps: 2 }, { midi: G(5), steps: 2 }, { midi: E(5), steps: 2 }, { midi: D(5), steps: 2 },
  { midi: C(5), steps: 2 }, { midi: A(4), steps: 2 }, { midi: C(5), steps: 2 }, { midi: E(5), steps: 2 },
  { midi: D(5), steps: 2 }, { midi: C(5), steps: 2 }, { midi: A(4), steps: 4 },
];

// Noise percussion: a steady backbeat, heavier in combat.
const EXPLORE_PERC: Step[] = [
  { midi: 60, steps: 4 }, { midi: null, steps: 4 }, { midi: 60, steps: 4 }, { midi: null, steps: 4 },
];
const COMBAT_PERC: Step[] = [
  { midi: 60, steps: 2 }, { midi: null, steps: 2 }, { midi: 60, steps: 2 }, { midi: 60, steps: 2 },
];

/** The calmer exploration theme. */
export const EXPLORATION_THEME: Track = {
  bpm: 128,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.5, pattern: BASS },
    { voice: 'pulse', gain: 0.28, pattern: EXPLORE_LEAD },
    { voice: 'noise', gain: 0.12, pattern: EXPLORE_PERC },
  ],
};

/** The intenser combat theme (same harmony, faster feel). */
export const COMBAT_THEME: Track = {
  bpm: 148,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.55, pattern: BASS },
    { voice: 'pulse', gain: 0.32, pattern: COMBAT_LEAD },
    { voice: 'noise', gain: 0.18, pattern: COMBAT_PERC },
  ],
};

/** Total steps in the longest channel of a track (its loop length). */
function trackSteps(track: Track): number {
  return Math.max(
    ...track.channels.map((c) => c.pattern.reduce((n, s) => n + s.steps, 0)),
  );
}

/**
 * Schedule one loop of `track` starting at `startTime` on `ctx`, routed through `out`, scaled
 * by `volume`. Returns the loop duration in seconds so the caller can schedule the next loop.
 */
export function scheduleTrack(
  ctx: AudioContext,
  out: AudioNode,
  track: Track,
  startTime: number,
  volume: number,
): number {
  const stepDur = 60 / track.bpm / track.stepsPerBeat;
  for (const channel of track.channels) {
    let t = startTime;
    for (const step of channel.pattern) {
      const dur = step.steps * stepDur;
      if (step.midi !== null) {
        playNote(ctx, out, channel.voice, step.midi, t, dur * 0.95, channel.gain * volume);
      }
      t += dur;
    }
  }
  return trackSteps(track) * stepDur;
}
