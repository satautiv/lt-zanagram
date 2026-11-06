/** A seeded random number generator: same seed, same sequence, on every machine (spec §8). */
export type Random = () => number;

/** Hashes any seed text to 32 bits (cyrb53, folded). */
function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Mulberry32 seeded from the text: numbers in [0, 1). */
export function seededRandom(seed: string | number): Random {
  let state = hashSeed(String(seed));
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher–Yates). */
export function shuffled<T>(random: Random, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** One item, chosen with probability proportional to its weight. */
export function weightedPick<T>(
  random: Random,
  items: readonly T[],
  weight: (item: T) => number,
): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let target = random() * total;
  for (const item of items) {
    target -= weight(item);
    if (target < 0) return item;
  }
  return items[items.length - 1]!;
}
