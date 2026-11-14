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

// --- Victory song: the main theme's harmony and melodic shape, slowed down and opened up ---
// Eight bars of Am, F, C, G, Am, F, G, C. The last bar lands on C major so the loop ends on a
// resolved, hopeful chord. Same voices as the main theme (triangle bass, pulse arp and lead).

/** One slow bass bar: root, fifth, octave, fifth, a quarter note each. */
function victoryBassBar(root: string, rootOct: number, fifth: string, fifthOct: number): Step[] {
  return [
    { midi: n(root, rootOct), steps: 4 },
    { midi: n(fifth, fifthOct), steps: 4 },
    { midi: n(root, rootOct + 1), steps: 4 },
    { midi: n(fifth, fifthOct), steps: 4 },
  ];
}

/** One bar of eighth-note arpeggio (a gentler cousin of the main theme's sixteenths). */
function victoryArpBar(root: string, third: string, fifth: string, oct: number): Step[] {
  const seq: [string, number][] = [
    [root, oct], [third, oct], [fifth, oct], [root, oct + 1],
    [fifth, oct], [third, oct], [fifth, oct], [third, oct],
  ];
  return seq.map(([name, o]) => ({ midi: n(name, o), steps: 2 }));
}

const VICTORY_BASS: Step[] = [
  ...victoryBassBar('A', 2, 'E', 3), // Am
  ...victoryBassBar('F', 2, 'C', 3), // F
  ...victoryBassBar('C', 3, 'G', 3), // C
  ...victoryBassBar('G', 2, 'D', 3), // G
  ...victoryBassBar('A', 2, 'E', 3), // Am
  ...victoryBassBar('F', 2, 'C', 3), // F
  ...victoryBassBar('G', 2, 'D', 3), // G
  ...victoryBassBar('C', 3, 'G', 3), // C
];

const VICTORY_ARP: Step[] = [
  ...victoryArpBar('A', 'C', 'E', 4), // Am
  ...victoryArpBar('F', 'A', 'C', 4), // F
  ...victoryArpBar('C', 'E', 'G', 4), // C
  ...victoryArpBar('G', 'B', 'D', 4), // G
  ...victoryArpBar('A', 'C', 'E', 4), // Am
  ...victoryArpBar('F', 'A', 'C', 4), // F
  ...victoryArpBar('G', 'B', 'D', 4), // G
  ...victoryArpBar('C', 'E', 'G', 4), // C
];

/** The victory melody: the exploration lead's opening shape (E-A-G-E), stretched into a song. */
const VICTORY_LEAD: Step[] = [
  // Bar 1 (Am)
  { midi: n('E', 5), steps: 6 }, { midi: n('A', 5), steps: 2 }, { midi: n('G', 5), steps: 4 }, { midi: n('E', 5), steps: 4 },
  // Bar 2 (F)
  { midi: n('F', 5), steps: 6 }, { midi: n('A', 5), steps: 2 }, { midi: n('C', 6), steps: 4 }, { midi: n('A', 5), steps: 4 },
  // Bar 3 (C)
  { midi: n('G', 5), steps: 6 }, { midi: n('E', 5), steps: 2 }, { midi: n('G', 5), steps: 4 }, { midi: n('C', 6), steps: 4 },
  // Bar 4 (G)
  { midi: n('D', 6), steps: 6 }, { midi: n('B', 5), steps: 2 }, { midi: n('A', 5), steps: 4 }, { midi: n('G', 5), steps: 4 },
  // Bar 5 (Am), climbing higher this time
  { midi: n('E', 5), steps: 6 }, { midi: n('A', 5), steps: 2 }, { midi: n('C', 6), steps: 4 }, { midi: n('E', 6), steps: 4 },
  // Bar 6 (F)
  { midi: n('F', 6), steps: 6 }, { midi: n('E', 6), steps: 2 }, { midi: n('C', 6), steps: 4 }, { midi: n('A', 5), steps: 4 },
  // Bar 7 (G)
  { midi: n('D', 6), steps: 4 }, { midi: n('B', 5), steps: 4 }, { midi: n('G', 5), steps: 4 },
  { midi: n('A', 5), steps: 2 }, { midi: n('B', 5), steps: 2 },
  // Bar 8 (C): resolve and rest
  { midi: n('C', 6), steps: 12 }, { midi: null, steps: 4 },
];

/** A soft march: kick, hat, snare, hat, one hit per beat. */
const DRUM_BAR_VICTORY: DrumStep[] = [
  { hit: 'kick', steps: 4 }, { hit: 'hat', steps: 4 }, { hit: 'snare', steps: 4 }, { hit: 'hat', steps: 4 },
];

const eightBars = <T,>(bar: T[]): T[] => [...bar, ...bar, ...bar, ...bar, ...bar, ...bar, ...bar, ...bar];

/** The ending song: the main tune at a walking pace, played while the credits roll. */
export const VICTORY_THEME: Track = {
  bpm: 76,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.5, pattern: VICTORY_BASS },
    { voice: 'pulse', gain: 0.12, pattern: VICTORY_ARP },
    { voice: 'pulse', gain: 0.26, pattern: VICTORY_LEAD },
  ],
  drums: { gain: 0.2, pattern: eightBars(DRUM_BAR_VICTORY) },
};

// --- Build-a-robot song (the pick-your-bot screen) ---
// An assembly line, written as a song. Eight bars of A minor with a flat second (B-flat) for
// grit: only the machinery at first, then each loop the layers arrive, the way a robot goes
// together. Bass and drums run the whole time, the stiff arpeggio joins at bar 3, and the lead
// "voice" switches on at bar 5.

const rest = (steps: number): Step => ({ midi: null, steps });

/** The grinding bass riff (16 steps). */
const BUILD_RIFF: Step[] = [
  { midi: n('A', 2), steps: 2 }, { midi: n('A', 2), steps: 1 }, { midi: n('A', 2), steps: 1 }, { midi: n('C', 3), steps: 2 },
  { midi: n('A', 2), steps: 2 }, { midi: n('A', 2), steps: 2 }, { midi: n('A#', 2), steps: 2 }, { midi: n('A', 2), steps: 2 },
  { midi: n('E', 3), steps: 2 },
];

/** The riff's turnaround, used on the last bar of each four. */
const BUILD_TURN: Step[] = [
  { midi: n('A', 2), steps: 2 }, { midi: n('A', 2), steps: 1 }, { midi: n('A', 2), steps: 1 }, { midi: n('C', 3), steps: 2 },
  { midi: n('A', 2), steps: 2 }, { midi: n('D', 3), steps: 2 }, { midi: n('E', 3), steps: 2 }, { midi: n('A#', 2), steps: 2 },
  { midi: n('A', 2), steps: 2 },
];

const BUILD_BASS: Step[] = [
  ...BUILD_RIFF, ...BUILD_RIFF, ...BUILD_RIFF, ...BUILD_TURN,
  ...BUILD_RIFF, ...BUILD_RIFF, ...BUILD_RIFF, ...BUILD_TURN,
];

/** A machine-stiff sixteenth-note ostinato: A and E, with a flat-second twist at the end. */
const BUILD_ARP_BAR: Step[] = [
  'A3', 'E4', 'A3', 'E4', 'A3', 'E4', 'A3', 'F4',
  'A3', 'E4', 'A3', 'E4', 'A3', 'E4', 'A#3', 'B3',
].map((name) => {
  const m = /^([A-G]#?)(\d)$/.exec(name)!;
  return { midi: n(m[1], Number(m[2])), steps: 1 };
});

const BUILD_ARP: Step[] = [rest(32), ...BUILD_ARP_BAR, ...BUILD_ARP_BAR, ...BUILD_ARP_BAR, ...BUILD_ARP_BAR, ...BUILD_ARP_BAR, ...BUILD_ARP_BAR];

/** Call-and-response lead, bars 5 to 8 (the first four bars are silent). */
const BUILD_LEAD: Step[] = [
  rest(64),
  // Bar 5
  { midi: n('E', 5), steps: 2 }, rest(2), { midi: n('E', 5), steps: 2 }, rest(2),
  { midi: n('F', 5), steps: 2 }, { midi: n('E', 5), steps: 2 }, rest(2), { midi: n('C', 5), steps: 2 },
  // Bar 6
  { midi: n('A', 4), steps: 2 }, rest(2), { midi: n('A', 4), steps: 2 }, rest(2),
  { midi: n('B', 4), steps: 2 }, { midi: n('C', 5), steps: 2 }, rest(2), { midi: n('E', 5), steps: 2 },
  // Bar 7 (as bar 5)
  { midi: n('E', 5), steps: 2 }, rest(2), { midi: n('E', 5), steps: 2 }, rest(2),
  { midi: n('F', 5), steps: 2 }, { midi: n('E', 5), steps: 2 }, rest(2), { midi: n('C', 5), steps: 2 },
  // Bar 8: climbs, then holds
  { midi: n('A', 4), steps: 2 }, { midi: n('C', 5), steps: 2 }, { midi: n('E', 5), steps: 2 }, { midi: n('F', 5), steps: 2 },
  { midi: n('E', 5), steps: 4 }, { midi: n('C', 5), steps: 2 }, rest(2),
];

/** Bars 1 and 2: just kick and clank. */
const BUILD_DRUMS_SPARSE: DrumStep[] = [
  { hit: 'kick', steps: 4 }, { hit: 'clank', steps: 2 }, { hit: null, steps: 2 },
  { hit: 'kick', steps: 4 }, { hit: 'clank', steps: 2 }, { hit: null, steps: 2 },
];

/** Four on the floor, with clanks on the off-beats. */
const BUILD_DRUMS_FULL: DrumStep[] = [
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'kick', steps: 2 }, { hit: 'clank', steps: 2 },
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'kick', steps: 2 }, { hit: 'clank', steps: 2 },
];

/** The same beat, ending in a burst of steam. */
const BUILD_DRUMS_STEAM: DrumStep[] = [
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'kick', steps: 2 }, { hit: 'clank', steps: 2 },
  { hit: 'kick', steps: 2 }, { hit: 'hat', steps: 2 }, { hit: 'hiss', steps: 4 },
];

/** The pick-your-bot song: a robot being assembled, as music. */
export const BUILD_THEME: Track = {
  bpm: 112,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.5, pattern: BUILD_BASS },
    { voice: 'pulse', gain: 0.14, pattern: BUILD_ARP },
    { voice: 'pulse', gain: 0.24, pattern: BUILD_LEAD },
  ],
  drums: {
    gain: 0.34,
    pattern: [
      ...BUILD_DRUMS_SPARSE, ...BUILD_DRUMS_SPARSE,
      ...BUILD_DRUMS_FULL, ...BUILD_DRUMS_STEAM,
      ...BUILD_DRUMS_FULL, ...BUILD_DRUMS_FULL,
      ...BUILD_DRUMS_FULL, ...BUILD_DRUMS_STEAM,
    ],
  },
};

// --- Waking-up song (the opening, while the intro text is on screen) ---
// A robot coming online. A single low note, a slow heartbeat, a few high blips like systems
// powering on, then a slow arpeggio climbing under a melody that finally stands up. Same voices
// and the same Am-F-C-G harmony as the main theme, at a crawl.

const WAKE_BASS: Step[] = [
  { midi: n('A', 2), steps: 32 }, // bars 1-2: one low drone
  { midi: n('C', 3), steps: 16 }, // C
  { midi: n('G', 2), steps: 16 }, // G
  { midi: n('A', 2), steps: 16 }, // Am
  { midi: n('F', 2), steps: 16 }, // F
  { midi: n('G', 2), steps: 16 }, // G
  { midi: n('C', 3), steps: 16 }, // C
];

/** Four-note rising arpeggio, one note per beat, for each chord. */
function wakeArpBar(a: string, aOct: number, b: string, bOct: number, c: string, cOct: number, d: string, dOct: number): Step[] {
  return [
    { midi: n(a, aOct), steps: 4 }, { midi: n(b, bOct), steps: 4 },
    { midi: n(c, cOct), steps: 4 }, { midi: n(d, dOct), steps: 4 },
  ];
}

const WAKE_ARP: Step[] = [
  rest(32),
  ...wakeArpBar('C', 4, 'E', 4, 'G', 4, 'C', 5), // C
  ...wakeArpBar('G', 3, 'B', 3, 'D', 4, 'G', 4), // G
  ...wakeArpBar('A', 3, 'C', 4, 'E', 4, 'A', 4), // Am
  ...wakeArpBar('F', 3, 'A', 3, 'C', 4, 'F', 4), // F
  ...wakeArpBar('G', 3, 'B', 3, 'D', 4, 'G', 4), // G
  ...wakeArpBar('C', 4, 'E', 4, 'G', 4, 'C', 5), // C
];

/** Blips for four bars, then the melody for four. Every bar is 16 steps. */
const WAKE_LEAD: Step[] = [
  // Bars 1-4: sparse blips, like status lights coming on
  rest(6), { midi: n('E', 6), steps: 1 }, rest(5), { midi: n('E', 6), steps: 1 }, rest(3),
  rest(4), { midi: n('E', 6), steps: 1 }, rest(3), { midi: n('A', 5), steps: 1 }, rest(7),
  rest(2), { midi: n('C', 6), steps: 1 }, rest(5), { midi: n('E', 6), steps: 1 }, rest(2), { midi: n('A', 5), steps: 1 }, rest(4),
  rest(8), { midi: n('G', 5), steps: 1 }, rest(3), { midi: n('B', 5), steps: 1 }, rest(3),
  // Bars 5-8: the melody rises
  { midi: n('E', 5), steps: 8 }, { midi: n('A', 5), steps: 8 }, // Am
  { midi: n('A', 5), steps: 8 }, { midi: n('C', 6), steps: 8 }, // F
  { midi: n('D', 6), steps: 8 }, { midi: n('B', 5), steps: 8 }, // G
  { midi: n('C', 6), steps: 12 }, rest(4), // C
];

/** A heartbeat: lub-dub, once per bar. */
const WAKE_HEART: DrumStep[] = [
  { hit: 'kick', steps: 1 }, { hit: null, steps: 2 }, { hit: 'kick', steps: 1 }, { hit: null, steps: 12 },
];

/** The heartbeat plus soft hats, once the robot is up and moving. */
const WAKE_HEART_HATS: DrumStep[] = [
  { hit: 'kick', steps: 1 }, { hit: null, steps: 2 }, { hit: 'kick', steps: 1 }, { hit: null, steps: 4 },
  { hit: 'hat', steps: 2 }, { hit: null, steps: 2 }, { hit: 'hat', steps: 2 }, { hit: null, steps: 2 },
];

/** The opening song: a robot waking up. */
export const WAKE_THEME: Track = {
  bpm: 66,
  stepsPerBeat: 4,
  channels: [
    { voice: 'triangle', gain: 0.45, pattern: WAKE_BASS },
    { voice: 'pulse', gain: 0.13, pattern: WAKE_ARP },
    { voice: 'pulse', gain: 0.22, pattern: WAKE_LEAD },
  ],
  drums: {
    gain: 0.22,
    pattern: [
      { hit: null, steps: 16 },
      ...WAKE_HEART, ...WAKE_HEART, ...WAKE_HEART,
      ...WAKE_HEART_HATS, ...WAKE_HEART_HATS, ...WAKE_HEART_HATS, ...WAKE_HEART_HATS,
    ],
  },
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
