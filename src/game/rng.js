// ============================================================
// rng.js: a seeded random number generator ("mulberry32").
// Math.random() gives different numbers every time. A seeded
// generator gives the SAME sequence for the same seed, so the
// same seed always builds the same track. That is what makes
// story levels repeatable and ghost races fair.
// ============================================================

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (min, max) => min + next() * (max - min);
  next.pick = (list) => list[Math.floor(next() * list.length)];
  return next;
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
