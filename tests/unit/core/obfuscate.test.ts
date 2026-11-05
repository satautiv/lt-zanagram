import { describe, expect, it } from 'vitest';
import { decodePuzzle, encodePuzzle, readPuzzle, validatePuzzle } from '../../../src/core';
import { puzzleFrom } from './helpers';

const puzzle = () =>
  puzzleFrom(
    3,
    'NAMOSAKEL',
    [
      ['NAMAS', [0, 1, 2, 5, 4]],
      ['NOKE', [0, 3, 6, 7]],
      ['SELA', [4, 7, 8, 5]],
    ],
    { extras: ['MASE', 'ŠAUKŠTAS'] },
  );

describe('puzzle obfuscation', () => {
  it('round-trips a puzzle exactly, including Lithuanian letters', () => {
    const p = puzzle();
    p.words[0]!.definition = 'Pastatas, kuriame gyvenama — su ąčęėįšųūž.';
    expect(decodePuzzle(encodePuzzle(p))).toEqual(p);
  });

  it('hides required words, extras and definitions in the file', () => {
    const p = puzzle();
    p.words[1]!.definition = 'Slaptas apibrėžimas';
    const file = JSON.stringify(encodePuzzle(p));
    for (const word of ['NAMAS', 'NOKE', 'SELA', 'MASE', 'ŠAUKŠTAS', 'Slaptas']) {
      expect(file).not.toContain(word);
    }
    expect(file).not.toContain('"path"');
  });

  it('keeps the board readable', () => {
    const encoded = encodePuzzle(puzzle());
    expect(encoded.letters).toEqual([...'NAMOSAKEL']);
    expect(encoded.bridges).toEqual(puzzle().bridges);
    expect(encoded.id).toBe('2026-11-05');
  });

  it('depends on the date: the same words encode differently on another day', () => {
    const a = encodePuzzle(puzzle());
    const b = encodePuzzle({ ...puzzle(), id: '2026-11-06' });
    expect(a.secret).not.toBe(b.secret);
  });

  it('reads fixtures in either form', () => {
    const p = puzzle();
    expect(readPuzzle(p)).toEqual(p);
    expect(readPuzzle(encodePuzzle(p))).toEqual(p);
    expect(validatePuzzle(readPuzzle(JSON.parse(JSON.stringify(encodePuzzle(p))))).ok).toBe(true);
  });

  it('rejects a corrupted secret', () => {
    const encoded = encodePuzzle(puzzle());
    expect(() => decodePuzzle({ ...encoded, secret: '%%%' })).toThrow();
  });
});
