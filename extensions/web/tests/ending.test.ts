import { describe, expect, it } from 'vitest';
import { CREDITS, CREDITS_FOOTER } from '../src/data/credits';
import {
  BOSS_THEME,
  COMBAT_THEME,
  EXPLORATION_THEME,
  MAJOR_BOSS_THEME,
  TITLE_THEME,
  VICTORY_THEME,
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
    const voice = CREDITS.find((s) => s.role === 'VOICE ACTING');
    expect(voice).toBeDefined();
    const text = voice!.names
      .join(' ')
      .split(' ')
      .map((byte) => String.fromCharCode(parseInt(byte, 2)))
      .join('');
    expect(text).toBe('BEEP');
  });

  it('has a footer', () => {
    expect(CREDITS_FOOTER.length).toBeGreaterThan(0);
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
