// Small deterministic PRNG so the test suite can seed reproducible shoes.

export interface RNG {
  // Float in [0, 1).
  next(): number;
}

// Mulberry32 — fast, decent statistical quality, fully deterministic from a seed.
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return {
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

// Non-deterministic RNG backed by Math.random, for real play.
export const systemRng: RNG = {
  next: () => Math.random(),
};
