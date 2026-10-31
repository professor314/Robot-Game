/**
 * Minimal PSG-style (programmable sound generator) synthesis over the Web Audio API — the
 * classic NES-ish voice set: pulse/square leads, a triangle bass, and a noise channel for
 * percussion. All sound is generated at runtime; nothing is sampled or ripped. These helpers
 * are intentionally small building blocks the theme and SFX modules compose.
 */

/** Convert a MIDI note number to frequency in Hz (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Named note helpers for readable patterns (e.g. `note('A', 4)`). */
const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

/** MIDI number for a note name + octave (e.g. A,4 → 69). */
export function note(name: keyof typeof NOTE_INDEX | string, octave: number): number {
  return 12 * (octave + 1) + (NOTE_INDEX[name] ?? 0);
}

/** A oscillator voice kind. */
export type VoiceKind = 'pulse' | 'triangle' | 'noise';

/** Build a short noise buffer used by the percussion channel. */
function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2545f491;
  for (let i = 0; i < length; i++) {
    // Deterministic LCG noise so percussion is consistent.
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    data[i] = (seed / 0x3fffffff) - 1;
  }
  return buffer;
}

/**
 * Plays a single note on a voice at `time` for `duration` seconds through `out`, at `gain`
 * (0..1). Pulse/triangle use an oscillator (square approximates the NES pulse channel);
 * noise uses a buffer source. A short attack/release envelope avoids clicks.
 */
export function playNote(
  ctx: AudioContext,
  out: AudioNode,
  kind: VoiceKind,
  midi: number,
  time: number,
  duration: number,
  gain: number,
): void {
  const env = ctx.createGain();
  env.connect(out);
  const peak = Math.max(0.0001, gain);
  const attack = 0.005;
  const release = Math.min(0.08, duration * 0.4);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(peak, time + attack);
  env.gain.setValueAtTime(peak, time + Math.max(attack, duration - release));
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  if (kind === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    src.connect(hp).connect(env);
    src.start(time);
    src.stop(time + duration);
  } else {
    const osc = ctx.createOscillator();
    osc.type = kind === 'pulse' ? 'square' : 'triangle';
    osc.frequency.value = midiToFreq(midi);
    osc.connect(env);
    osc.start(time);
    osc.stop(time + duration);
  }
}

/** A percussion hit kind for the drum channel. */
export type DrumKind = 'kick' | 'snare' | 'hat';

/**
 * Play a single drum hit at `time` through `out` at `gain`. Kick is a fast pitch-dropping sine
 * (classic 8-bit thump); snare and hat are filtered noise bursts (snare lower/longer, hat
 * short/bright). This is what gives the music an actual beat.
 */
export function playDrum(
  ctx: AudioContext,
  out: AudioNode,
  kind: DrumKind,
  time: number,
  gain: number,
): void {
  const env = ctx.createGain();
  env.connect(out);
  const peak = Math.max(0.0001, gain);

  if (kind === 'kick') {
    const dur = 0.12;
    env.gain.setValueAtTime(peak, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + dur);
    osc.connect(env);
    osc.start(time);
    osc.stop(time + dur);
    return;
  }

  // Snare / hat: noise through a band/high-pass, short envelope.
  const dur = kind === 'snare' ? 0.14 : 0.05;
  env.gain.setValueAtTime(peak, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  const length = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  if (kind === 'snare') {
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;
  } else {
    filter.type = 'highpass';
    filter.frequency.value = 7000;
  }
  src.connect(filter).connect(env);
  src.start(time);
  src.stop(time + dur);
}
