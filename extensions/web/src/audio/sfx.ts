import { midiToFreq, note } from './synth';

/** The set of sound effects the game plays. */
export type SfxName =
  | 'move'
  | 'hit'
  | 'damage'
  | 'defeat'
  | 'pickup'
  | 'levelup';

/**
 * Short, generated 8-bit sound effects. Each is a tiny envelope over a square/triangle/noise
 * voice — no samples. Kept consistent in character with the theme (same PSG palette).
 */
export function playSfx(ctx: AudioContext, out: AudioNode, name: SfxName, volume: number): void {
  const now = ctx.currentTime;
  switch (name) {
    case 'move':
      blip(ctx, out, 'square', note('E', 5), 0.05, 0.25 * volume, now);
      break;
    case 'hit':
      sweep(ctx, out, 'square', note('A', 5), note('A', 4), 0.08, 0.3 * volume, now);
      break;
    case 'damage':
      sweep(ctx, out, 'triangle', note('C', 4), note('C', 3), 0.14, 0.35 * volume, now);
      noiseHit(ctx, out, 0.1, 0.2 * volume, now);
      break;
    case 'defeat':
      sweep(ctx, out, 'square', note('A', 4), note('A', 2), 0.3, 0.3 * volume, now);
      break;
    case 'pickup':
      blip(ctx, out, 'square', note('C', 5), 0.06, 0.3 * volume, now);
      blip(ctx, out, 'square', note('G', 5), 0.08, 0.3 * volume, now + 0.06);
      break;
    case 'levelup':
      blip(ctx, out, 'square', note('C', 5), 0.08, 0.3 * volume, now);
      blip(ctx, out, 'square', note('E', 5), 0.08, 0.3 * volume, now + 0.08);
      blip(ctx, out, 'square', note('G', 5), 0.08, 0.3 * volume, now + 0.16);
      blip(ctx, out, 'square', note('C', 6), 0.14, 0.3 * volume, now + 0.24);
      break;
  }
}

function envGain(ctx: AudioContext, out: AudioNode, peak: number, start: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.connect(out);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  return g;
}

function blip(
  ctx: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  midi: number,
  dur: number,
  peak: number,
  start: number,
): void {
  const g = envGain(ctx, out, peak, start, dur);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = midiToFreq(midi);
  osc.connect(g);
  osc.start(start);
  osc.stop(start + dur);
}

function sweep(
  ctx: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  fromMidi: number,
  toMidi: number,
  dur: number,
  peak: number,
  start: number,
): void {
  const g = envGain(ctx, out, peak, start, dur);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(midiToFreq(fromMidi), start);
  osc.frequency.exponentialRampToValueAtTime(midiToFreq(toMidi), start + dur);
  osc.connect(g);
  osc.start(start);
  osc.stop(start + dur);
}

function noiseHit(ctx: AudioContext, out: AudioNode, dur: number, peak: number, start: number): void {
  const length = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const g = envGain(ctx, out, peak, start, dur);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(g);
  src.start(start);
  src.stop(start + dur);
}
