/**
 * A small, fast, seedable pseudo-random number generator (mulberry32). Injected into the
 * game world so that all randomness (enemy movement, spawns, combat variance) is
 * reproducible given the same seed — essential for deterministic tests and AI play.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Ensure a non-zero 32-bit state.
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Pick a random element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }
}
