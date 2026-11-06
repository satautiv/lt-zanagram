import type { Puzzle } from './puzzle';

/**
 * How often each letter appears in `required.txt`, per thousand letters. Used for letter rarity:
 * the generator prefers anchors with rare letters, and rare letters make a board harder.
 */
// prettier-ignore
export const LETTER_FREQUENCY: Readonly<Record<string, number>> = {
  A: 133.2, Ą: 1.0, B: 13.6, C: 6.3, Č: 1.5, D: 22.6, E: 45.8, Ę: 0.2, Ė: 21.6, F: 3.8,
  G: 21.9, H: 1.8, I: 132.3, Į: 1.4, Y: 16.3, J: 12.3, K: 49.3, L: 41.4, M: 26.5, N: 57.9,
  O: 40.5, P: 28.7, R: 52.4, S: 108.4, Š: 15.0, T: 73.4, U: 40.8, Ų: 0.5, Ū: 4.3, V: 21.1,
  Z: 4.8, Ž: 5.0,
};

/** 0 for the commonest letters, rising for rarer ones (log scale, about 0–8). */
export function letterRarity(letter: string): number {
  return Math.max(0, Math.log2(133.2 / (LETTER_FREQUENCY[letter] ?? 0.2)));
}

export interface DifficultyFactors {
  averageLength: number;
  longWords: number;
  rarity: number;
  extras: number;
}

/** The inputs to the difficulty score (spec §8 step 5). */
export function difficultyFactors(puzzle: Puzzle): DifficultyFactors {
  const lengths = puzzle.words.map((w) => [...w.word].length);
  return {
    averageLength: lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length),
    longWords: lengths.filter((n) => n >= 7).length,
    rarity: puzzle.letters.reduce((sum, l) => sum + letterRarity(l), 0) / puzzle.letters.length,
    extras: puzzle.extras.length,
  };
}

/**
 * A raw difficulty score: 0 is a typical generated board, each factor in steps of about one
 * typical spread. Longer words, more long words and rarer letters make a board harder; more
 * extras make it easier (more accepted words, more time back).
 */
export function difficultyScore(f: DifficultyFactors): number {
  return (
    (f.averageLength - 6.3) / 0.35 +
    (f.longWords - 5) / 2 +
    (f.rarity - 1.36) / 0.19 -
    (f.extras - 45) / 20
  );
}

/**
 * Upper bounds of difficulty 1–4 on the raw score: the quintiles of 100 generated boards (seed 7,
 * November 2026 lists), so a generated batch spreads roughly evenly over 1–5.
 */
const BANDS = [-2, -0.9, 0.4, 1.5];

/** Difficulty from 1 (easy) to 5 (hard), stored in the puzzle file (spec §8 step 5). */
export function difficulty(puzzle: Puzzle): number {
  const score = difficultyScore(difficultyFactors(puzzle));
  return 1 + BANDS.filter((bound) => score > bound).length;
}
