import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  findWords,
  GENERATOR_LIMITS,
  isEncodedPuzzle,
  readPuzzle,
  toLower,
  toUpper,
  validatePuzzle,
  WordList,
} from '../../../src/core';

const dir = new URL('../../../public/puzzles/', import.meta.url);
const files = readdirSync(dir).filter((n) => /^\d{4}-\d\d-\d\d\.json$/.test(n));
const puzzles = files.map((name) =>
  readPuzzle(JSON.parse(readFileSync(new URL(name, dir), 'utf8'))),
);

const lines = (path: string) =>
  readFileSync(new URL(`../../../data/${path}`, import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
const required = new WordList(lines('required.txt'));
const blocked = new WordList(lines('blocklist.txt').map(toUpper));

describe('published puzzles', () => {
  it('every file is listed in index.json, and vice versa', () => {
    const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')) as {
      date: string;
    }[];
    expect(index.map((e) => `${e.date}.json`).sort()).toEqual([...files].sort());
  });

  it.each(files)('%s is obfuscated, named after its date and valid', (name) => {
    const raw = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    expect(isEncodedPuzzle(raw)).toBe(true);
    const puzzle = readPuzzle(raw);
    expect(`${puzzle.id}.json`).toBe(name);
    expect(validatePuzzle(puzzle).errors).toEqual([]);
  });

  it.each(puzzles.map((p) => [p.id, p] as const))(
    '%s: every required word has a definition under 80 characters that does not give it away',
    (_, puzzle) => {
      for (const { word, definition } of puzzle.words) {
        expect(definition, word).not.toBe('');
        expect([...definition].length, word).toBeLessThan(80);
        expect(toLower(definition), word).not.toContain(toLower(word));
      }
    },
  );

  // The generator's post-checks (spec §8 step 4), re-checked on the files as committed.
  it.each(puzzles.filter((p) => p.author === 'generator').map((p) => [p.id, p] as const))(
    '%s passes the generator post-checks',
    (_, puzzle) => {
      const chosen = new Set(puzzle.words.map((w) => w.word));
      const unchosen = [...findWords(puzzle, required).keys()].filter((w) => !chosen.has(w));
      expect(unchosen.length).toBeLessThanOrEqual(GENERATOR_LIMITS.maxUnchosen);
      expect(puzzle.words.some((w) => [...w.word].length >= GENERATOR_LIMITS.longWord)).toBe(true);
      expect([...findWords(puzzle, blocked).keys()]).toEqual([]);
      expect(validatePuzzle(puzzle, { requiredWords: new Set(lines('required.txt')) }).ok).toBe(
        true,
      );
    },
  );
});
