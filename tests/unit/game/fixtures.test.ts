import { describe, expect, it } from 'vitest';
import { MIN_WORD_LENGTH, validatePuzzle } from '../../../src/core';
import { FIXTURES } from '../../../src/game/fixtures';

describe('hand-made test puzzles', () => {
  it('there are three 4×4 puzzles', () => {
    expect(FIXTURES).toHaveLength(3);
    for (const puzzle of FIXTURES) expect(puzzle.size).toBe(4);
  });

  it.each(FIXTURES.map((p) => [p.id, p] as const))('%s passes validatePuzzle', (_, puzzle) => {
    expect(validatePuzzle(puzzle).errors).toEqual([]);
  });

  it.each(FIXTURES.map((p) => [p.id, p] as const))(
    '%s has a definition under 80 characters for every word, and a word of 8+ letters',
    (_, puzzle) => {
      for (const { word, definition } of puzzle.words) {
        expect(definition.length, word).toBeGreaterThan(0);
        expect(definition.length, word).toBeLessThan(80);
        expect(word.length).toBeGreaterThanOrEqual(MIN_WORD_LENGTH);
      }
      expect(Math.max(...puzzle.words.map((w) => [...w.word].length))).toBeGreaterThanOrEqual(8);
    },
  );

  it('extras never repeat a required word', () => {
    for (const puzzle of FIXTURES) {
      const required = new Set(puzzle.words.map((w) => w.word));
      expect(puzzle.extras.filter((w) => required.has(w))).toEqual([]);
    }
  });
});
