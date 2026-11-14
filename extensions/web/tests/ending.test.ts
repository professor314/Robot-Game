import { describe, expect, it } from 'vitest';
import { CREDITS, CREDITS_FOOTER, CREDITS_HIDDEN_MESSAGE, VOICE_ROLE } from '../src/data/credits';
import {
  BOSS_THEME,
  BUILD_THEME,
  COMBAT_THEME,
  EXPLORATION_THEME,
  MAJOR_BOSS_THEME,
  TITLE_THEME,
  VICTORY_THEME,
  WAKE_THEME,
  Track,
} from '../src/audio/theme';

/** Total sixteenth-steps in a channel's pattern. */
const steps = (pattern: { steps: number }[]): number => pattern.reduce((s, p) => s + p.steps, 0);

describe('ending credits', () => {
  it('lists every credit as binary (the game was made by robots)', () => {
    expect(CREDITS.length).toBeGreaterThan(10);
    for (const section of CREDITS) {
      expect(section.role.length).toBeGreaterThan(0);
      expect(section.names.length).toBeGreaterThan(0);
      for (const name of section.names) {
        expect(name).toMatch(/^[01]+( [01]{8})*$/);
        expect(name.length).toBeLessThanOrEqual(17);
      }
    }
  });

  it('spells BEEP in ASCII for the voice acting credit', () => {
    const voice = CREDITS.find((s) => s.role === VOICE_ROLE);
    expect(voice).toBeDefined();
    const text = voice!.names
      .join(' ')
      .split(' ')
      .map((byte) => String.fromCharCode(parseInt(byte, 2)))
      .join('');
    expect(text).toBe('BEEP');
  });

  it('hides the message in the names: one 8-bit ASCII letter per name, skipping the voice lines', () => {
    const decoded = CREDITS.filter((s) => s.role !== VOICE_ROLE)
      .flatMap((s) => s.names)
      .map((name) => {
        expect(name).toMatch(/^[01]{8}$/);
        return String.fromCharCode(parseInt(name, 2));
      })
      .join('');
    expect(decoded).toBe(CREDITS_HIDDEN_MESSAGE);
    expect(CREDITS_HIDDEN_MESSAGE).toBe('THANKYOUROBOTSWELOVEYOU');
  });

  it('has a footer', () => {
    expect(CREDITS_FOOTER.length).toBeGreaterThan(0);
  });
});

describe('opening songs', () => {
  const songs: [string, Track][] = [
    ['build-a-robot', BUILD_THEME],
    ['waking up', WAKE_THEME],
  ];

  it.each(songs)('%s has every channel and the drums the same length so the loop lines up', (_name, track) => {
    const lengths = [...track.channels.map((c) => steps(c.pattern)), steps(track.drums.pattern)];
    expect(new Set(lengths).size).toBe(1);
    expect(lengths[0]).toBe(8 * 16);
  });

  it.each(songs)('%s only uses real MIDI notes', (_name, track) => {
    for (const channel of track.channels) {
      for (const step of channel.pattern) {
        if (step.midi !== null) {
          expect(step.midi).toBeGreaterThanOrEqual(24);
          expect(step.midi).toBeLessThanOrEqual(108);
        }
      }
    }
  });

  it('the waking-up song is the slowest of the main-style themes', () => {
    for (const other of [EXPLORATION_THEME, COMBAT_THEME, BOSS_THEME, MAJOR_BOSS_THEME, TITLE_THEME, BUILD_THEME]) {
      expect(WAKE_THEME.bpm).toBeLessThan(other.bpm);
    }
  });

  it('the build song starts with machinery only: the lead is silent for its first four bars', () => {
    const lead = BUILD_THEME.channels[2].pattern;
    let consumed = 0;
    for (const step of lead) {
      if (consumed >= 64) break;
      expect(step.midi).toBeNull();
      consumed += step.steps;
    }
  });
});

describe('victory theme', () => {
  const themes: [string, Track][] = [
    ['exploration', EXPLORATION_THEME],
    ['combat', COMBAT_THEME],
    ['boss', BOSS_THEME],
    ['major boss', MAJOR_BOSS_THEME],
    ['title', TITLE_THEME],
  ];

  it('is slower than every other theme', () => {
    for (const [, track] of themes) expect(VICTORY_THEME.bpm).toBeLessThan(track.bpm);
  });

  it('has every channel and the drums the same length so the loop lines up', () => {
    const lengths = [...VICTORY_THEME.channels.map((c) => steps(c.pattern)), steps(VICTORY_THEME.drums.pattern)];
    expect(new Set(lengths).size).toBe(1);
    expect(lengths[0]).toBe(8 * 16); // eight bars of sixteen steps
  });
});
