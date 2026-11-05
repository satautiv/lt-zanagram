import { describe, expect, it } from 'vitest';
import { ALPHABET, findWords, WordList, type Bridge } from '../../../src/core';

describe('WordList', () => {
  const list = new WordList(['NAMAS', 'NAMAI', 'NAMO', 'ŠUO', 'ŠUNYS']);

  it('answers membership and prefixes', () => {
    expect(list.has('NAMO')).toBe(true);
    expect(list.has('NAM')).toBe(false);
    expect(list.hasPrefix('NAM')).toBe(true);
    expect(list.hasPrefix('NAMAS')).toBe(true);
    expect(list.hasPrefix('NAMASX')).toBe(false);
    expect(list.hasPrefix('ŠU')).toBe(true);
    expect(list.hasPrefix('Š')).toBe(true);
    expect(list.hasPrefix('ŽU')).toBe(false);
    expect(list.hasPrefix('')).toBe(true);
  });

  it('drops duplicates', () => {
    expect(new WordList(['A', 'A', 'B']).size).toBe(2);
  });
});

// 3×3:  N A M     bridges along NAMAS 0 1 2 5 4 and NOKE 0 3 6 7, plus 1–4
//       O S A
//       K E L
const bridges: Bridge[] = [
  [0, 1],
  [1, 2],
  [2, 5],
  [4, 5],
  [0, 3],
  [3, 6],
  [6, 7],
  [1, 4],
];
const board = { size: 3, letters: [...'NAMOSAKEL'], bridges };

describe('findWords', () => {
  it('finds every traceable word with all its paths', () => {
    const lexicon = new WordList(['NAMAS', 'NOKE', 'MASA', 'NASA', 'SAMA', 'KONA', 'ŽODIS']);
    const found = findWords(board, lexicon);
    expect([...found.keys()].sort()).toEqual(['KONA', 'MASA', 'NAMAS', 'NASA', 'NOKE', 'SAMA']);
    expect(found.get('NAMAS')).toEqual([[0, 1, 2, 5, 4]]);
    // SAMA traces two ways: S4–A5–M2–A1 and, over the 1–4 bridge, S4–A1–M2–A5.
    expect(found.get('SAMA')).toEqual([
      [4, 5, 2, 1],
      [4, 1, 2, 5],
    ]);
  });

  it('only follows declared bridges and never reuses a tile', () => {
    // NANA would need the single N twice.
    const lexicon = new WordList(['NASA', 'MASA', 'NANA']);
    const found = findWords(board, lexicon);
    expect(found.get('NASA')).toEqual([[0, 1, 4, 5]]);
    expect(found.get('MASA')).toEqual([
      [2, 1, 4, 5],
      [2, 5, 4, 1],
    ]);
    expect(found.has('NANA')).toBe(false);
  });

  it('respects the length limits', () => {
    const lexicon = new WordList(['NAM', 'NAMAS']);
    expect([...findWords(board, lexicon).keys()]).toEqual(['NAMAS']);
    expect([...findWords(board, lexicon, { minLength: 3, maxLength: 3 }).keys()]).toEqual(['NAM']);
  });

  it('finds several paths for the same word', () => {
    // 2×2 fully bridged: A A / A A — "AAAA" traces 4! = 24 ways.
    const full: Bridge[] = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];
    const found = findWords(
      { size: 2, letters: [...'AAAA'], bridges: full },
      new WordList(['AAAA']),
    );
    expect(found.get('AAAA')).toHaveLength(24);
  });

  it('is fast enough on a fully bridged 4×4 with a large word list', () => {
    // Every 8-neighbour bridge on a 4×4 board (42 bridges, far denser than a real puzzle).
    const dense: Bridge[] = [];
    for (let a = 0; a < 16; a++) {
      for (let b = a + 1; b < 16; b++) {
        const [ra, ca, rb, cb] = [a >> 2, a & 3, b >> 2, b & 3];
        if (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1) dense.push([a, b]);
      }
    }
    // A Lithuanian-flavoured synthetic lexicon of 300k words over the board's own letters,
    // so prefixes keep matching and pruning is as weak as it gets in practice.
    const letters = [...'NAMASKELIOTRUPĖŠ'];
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const words: string[] = [];
    for (let i = 0; i < 300_000; i++) {
      const length = 4 + Math.floor(rand() * 9);
      let w = '';
      for (let j = 0; j < length; j++) w += letters[Math.floor(rand() * letters.length)];
      words.push(w);
    }
    expect(letters.every((l) => (ALPHABET as readonly string[]).includes(l))).toBe(true);
    const lexicon = new WordList(words);
    const start = performance.now();
    findWords({ size: 4, letters, bridges: dense }, lexicon);
    const ms = performance.now() - start;
    // Budget: 30 boards in under 2 minutes, with many candidate boards per accepted one.
    expect(ms).toBeLessThan(1_000);
  });
});
