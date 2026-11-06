import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  difficulty,
  findWords,
  GENERATOR_LIMITS,
  PuzzleGenerator,
  seededRandom,
  validatePuzzle,
  WordList,
  type Puzzle,
} from '../../../src/core';

// valid.txt is not committed; the committed required list stands in for it here.
const required = readFileSync(new URL('../../../data/required.txt', import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean);
const lexicon = new WordList(required);
const generator = new PuzzleGenerator({ required, valid: lexicon, blocked: new WordList([]) });

const generate = (seed: string, avoid?: Set<string>) =>
  generator.generate({ id: '2026-12-01', random: seededRandom(seed), avoid });

describe('seeded random', () => {
  it('repeats for a seed and differs between seeds', () => {
    const a = seededRandom('42');
    const b = seededRandom('42');
    const c = seededRandom('43');
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
    expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('puzzle generator', () => {
  const boards = ['1', '2', '3', '4', '5'].map((seed) => generate(seed)!);

  it('the same seed gives the same puzzle', () => {
    expect(generate('1')).toEqual(boards[0]);
    expect(boards[1]!.puzzle.letters).not.toEqual(boards[0]!.puzzle.letters);
  });

  it.each(boards.map((b, i) => [i + 1, b] as const))('board %i passes every check', (_, board) => {
    const puzzle: Puzzle = board.puzzle;
    const { words, bridges, longWord, maxUnchosen } = GENERATOR_LIMITS;
    expect(validatePuzzle(puzzle, { requiredWords: new Set(required) }).errors).toEqual([]);
    expect(puzzle.letters.every((l) => l.length === 1)).toBe(true);
    expect(puzzle.words.length).toBeGreaterThanOrEqual(words.min);
    expect(puzzle.words.length).toBeLessThanOrEqual(words.max);
    expect(puzzle.bridges.length).toBeGreaterThanOrEqual(bridges.min);
    expect(puzzle.bridges.length).toBeLessThanOrEqual(bridges.max);
    expect(puzzle.words.some((w) => [...w.word].length >= longWord)).toBe(true);
    expect(puzzle.words.every((w) => w.definition === '')).toBe(true);
    expect(puzzle.difficulty).toBe(difficulty(puzzle));

    // Extras are every other traceable word; few required-list words are left out.
    const traceable = [...findWords(puzzle, lexicon).keys()];
    const chosen = new Set(puzzle.words.map((w) => w.word));
    expect(traceable.filter((w) => !chosen.has(w)).sort()).toEqual(puzzle.extras);
    expect(board.unchosen.length).toBeLessThanOrEqual(maxUnchosen);
  });

  it('picks an anchor that is not avoided', () => {
    const avoid = new Set(boards[0]!.puzzle.words.map((w) => w.word));
    const next = generate('1', avoid)!;
    const anchor = next.puzzle.words[0]!.word;
    expect(avoid.has(anchor)).toBe(false);
  });

  it('rejects boards on which a blocked word traces', () => {
    const board = boards[0]!.puzzle;
    const blockedWord = board.words[1]!.word;
    const strict = new PuzzleGenerator({
      required,
      valid: lexicon,
      blocked: new WordList([blockedWord]),
    });
    const result = strict.generate({ id: '2026-12-01', random: seededRandom('1') });
    expect(result).not.toBeNull();
    expect(findWords(result!.puzzle, new WordList([blockedWord])).size).toBe(0);
  });
});
