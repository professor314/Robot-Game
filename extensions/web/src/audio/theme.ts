import { DrumKind, VoiceKind, note, playDrum, playNote } from './synth';

/**
 * The original Robot-Game theme, composed for this project in the spirit of late-1980s
 * Sunsoft NES soundtracks. It is NOT a copy of Blaster Master or any commercial track — only
 * the style is referenced.
 *
 * Music theory under the hood:
 *  - Key: A minor. Progression: Am – F – C – G (i – VI – III – VII), one bar each, looping.
 *    This is a driving, resolving loop common to the era.
 *  - Bass (triangle): roots and fifths with an eighth-note pulse, landing on chord tones so
 *    the harmony is always grounded.
 *  - Arp (pulse): a sixteenth-note arpeggio spelling each chord (root–third–fifth–octave),
 *    which is how NES chips imply chords with a single monophonic voice.
 *  - Lead (pulse): a melody drawn from each chord's tones plus passing scale notes, phrased
 *    over two bars so it doesn't just echo the arp.
 *  - Drums: kick on the downbeats, snare on the backbeat, hats on the offbeats — an actual
 *    beat rather than a single noise blip.
 * The combat variant keeps the same harmony but pushes tempo and drum density.
 */

/** One step in a pitched channel: a MIDI note (or null rest) held for `steps` sixteenth-steps. */
interface Step {
  midi: number | null;
  steps: number;
}

/** A pitched channel's pattern plus its voice and gain. */
interface Channel {
  voice: VoiceKind;
  gain: number;
  pattern: Step[];
}

/** A drum channel step: a hit (or null rest) lasting `steps` sixteenth-steps. */
interface DrumStep {
  hit: DrumKind | null;
  steps: number;
}

/** A full track: tempo, grid resolution, pitched channels, and a drum line. */
export interface Track {
  bpm: number;
  stepsPerBeat: number;
  channels: Channel[];
  drums: { gain: number; pattern: DrumStep[] };
}

const n = note;

// --- Harmony: Am, F, C, G (one bar = 4 beats = 16 sixteenth steps each) ---
// Chord tones used for bass, arp, and melody so everything agrees harmonically.

/** Bassline: root, fifth, octave, fifth per bar (eighth-note feel), across the four chords. */
const BASS: Step[] = [
  // Am: A E A E
  { midi: n('A', 2), steps: 2 }, { midi: n('E', 3), steps: 2 }, { midi: n('A', 3), steps: 2 }, { midi: n('E', 3), steps: 2 },
  { midi: n('A', 2), steps: 2 }, { midi: n('E', 3), steps: 2 }, { midi: n('A', 3), steps: 2 }, { midi: n('C', 3), steps: 2 },
  // F: F C F C
  { midi: n('F', 2), steps: 2 }, { midi: n('C', 3), steps: 2 }, { midi: n('F', 3), steps: 2 }, { midi: n('C', 3), steps: 2 },
  { midi: n('F', 2), steps: 2 }, { midi: n('C', 3), steps: 2 }, { midi: n('F', 3), steps: 2 }, { midi: n('A', 2), steps: 2 },
  // C: C G C G
  { midi: n('C', 3), steps: 2 }, { midi: n('G', 3), steps: 2 }, { midi: n('C', 4), steps: 2 }, { midi: n('G', 3), steps: 2 },
  { midi: n('C', 3), steps: 2 }, { midi: n('G', 3), steps: 2 }, { midi: n('C', 4), steps: 2 }, { midi: n('E', 3), steps: 2 },
  // G: G D G D
  { midi: n('G', 2), steps: 2 }, { midi: n('D', 3), steps: 2 }, { midi: n('G', 3), steps: 2 }, { midi: n('D', 3), steps: 2 },
  { midi: n('G', 2), steps: 2 }, { midi: n('D', 3), steps: 2 }, { midi: n('B', 3), steps: 2 }, { midi: n('D', 4), steps: 2 },
];

/** Sixteenth-note arpeggio spelling each chord (root-3rd-5th-oct, up and down). */
function arpBar(root: string, third: string, fifth: string, oct: number): Step[] {
  const seq: [string, number][] = [
    [root, oct], [third, oct], [fifth, oct], [root, oct + 1],
    [fifth, oct], [third, oct], [root, oct], [third, oct],
    [root, oct], [third, oct], [fifth, oct], [root, oct + 1],
    [fifth, oct], [third, oct], [fifth, oct], [root, oct + 1],
  ];
  return seq.map(([name, o]) => ({ midi: n(name, o), steps: 1 }));
}

const ARP: Step[] = [
  ...arpBar('A', 'C', 'E', 4), // Am
  ...arpBar('F', 'A', 'C', 4), // F
  ...arpBar('C', 'E', 'G', 4), // C
  ...arpBar('G', 'B', 'D', 4), // G
];

/** Lead melody over two bars, from chord tones plus passing tones; rests give it phrasing. */
const LEAD: Step[] = [
  // Bar 1 (Am)
  { midi: n('E', 5), steps: 4 }, { midi: n('A', 5), steps: 2 }, { midi: n('G', 5), steps: 2 },
  { midi: n('E', 5), steps: 4 }, { midi: n('C', 5), steps: 2 }, { midi: null, steps: 2 },
  // Bar 2 (F)
  { midi: n('F', 5), steps: 4 }, { midi: n('A', 5), steps: 2 }, { midi: n('C', 6), steps: 2 },
  { midi: n('A', 5), steps: 4 }, { midi: n('F', 5), steps: 2 }, { midi: null, steps: 2 },
  // Bar 3 (C)
  { midi: n('G', 5), steps: 4 }, { midi: n('E', 5), steps: 2 }, { midi: n('G', 5), steps: 2 },
  { midi: n('C', 6), steps: 4 }, { midi: n('B', 5), steps: 2 }, { midi: null, steps: 2 },
  // Bar 4 (G)
  { midi: n('D', 5), steps: 4 }, { midi: n('G', 5), steps: 2 }, { midi: n('B', 5), steps: 2 },
  { midi: n('D', 6), steps: 2 }, { midi: n('B', 5), steps: 2 }, { midi: n('A', 5), steps: 4 },
];

/** One bar of a kick/snare/hat beat (16 steps). */
const DRUM_BAR: DrumStep[] = [
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'snare', steps: 2 }, { hit: 'hat', steps: 2 },
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'snare', steps: 2 }, { hit: 'hat', steps: 2 },
];

/** Busier combat beat with a kick pickup before the backbeat. */
const DRUM_BAR_COMBAT: DrumStep[] = [
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 1 }, { hit: 'hat', steps: 1 }, { hit: 'snare', steps: 2 }, { hit: 'hat', steps: 2 },
  { hit: 'kick', steps: 1 }, { hit: 'kick', steps: 1 }, { hit: 'hat', steps: 2 }, { hit: 'snare', steps: 2 }, { hit: 'hat', steps: 2 },
];

const fourBars = <T,>(bar: T[]): T[] => [...bar, ...bar, ...bar, ...bar];

/** The calmer exploration theme: bass + sparse arp + lead + steady beat. */
export const EXPLORATION_THEME: Track = {
  bpm: 120,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.5, pattern: BASS },
    { voice: 'pulse', gain: 0.14, pattern: ARP },
    { voice: 'pulse', gain: 0.26, pattern: LEAD },
  ],
  drums: { gain: 0.3, pattern: fourBars(DRUM_BAR) },
};

/** The intenser combat theme: same harmony, faster, louder arp, busier drums. */
export const COMBAT_THEME: Track = {
  bpm: 150,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.55, pattern: BASS },
    { voice: 'pulse', gain: 0.2, pattern: ARP },
    { voice: 'pulse', gain: 0.3, pattern: LEAD },
  ],
  drums: { gain: 0.38, pattern: fourBars(DRUM_BAR_COMBAT) },
};

/** A heavy, slower-but-pounding boss theme: bass-forward, insistent drums, menacing lead. */
export const BOSS_THEME: Track = {
  bpm: 100,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.6, pattern: BASS },
    { voice: 'pulse', gain: 0.22, pattern: ARP },
    { voice: 'pulse', gain: 0.3, pattern: LEAD },
  ],
  drums: { gain: 0.45, pattern: fourBars(DRUM_BAR_COMBAT) },
};

/** The final-boss theme: fast and relentless, the busiest mix. */
export const MAJOR_BOSS_THEME: Track = {
  bpm: 168,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.6, pattern: BASS },
    { voice: 'pulse', gain: 0.26, pattern: ARP },
    { voice: 'pulse', gain: 0.34, pattern: LEAD },
  ],
  drums: { gain: 0.5, pattern: fourBars(DRUM_BAR_COMBAT) },
};

/** A calm, sparse title theme for the pick-your-bot screen. */
export const TITLE_THEME: Track = {
  bpm: 96,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.4, pattern: BASS },
    { voice: 'pulse', gain: 0.22, pattern: LEAD },
  ],
  drums: { gain: 0.12, pattern: fourBars(DRUM_BAR) },
};

/** Steps in the longest line of a track (its loop length). */
function trackSteps(track: Track): number {
  const channelMax = Math.max(...track.channels.map((c) => c.pattern.reduce((s, p) => s + p.steps, 0)));
  const drumMax = track.drums.pattern.reduce((s, d) => s + d.steps, 0);
  return Math.max(channelMax, drumMax);
}

/**
 * Schedule one loop of `track` starting at `startTime`, routed through `out`, scaled by
 * `volume`. Returns the loop duration in seconds so the caller can schedule the next loop.
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
        playNote(ctx, out, channel.voice, step.midi, t, dur * 0.9, channel.gain * volume);
      }
      t += dur;
    }
  }

  let dt = startTime;
  for (const step of track.drums.pattern) {
    if (step.hit !== null) playDrum(ctx, out, step.hit, dt, track.drums.gain * volume);
    dt += step.steps * stepDur;
  }

  return trackSteps(track) * stepDur;
}
