import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isEncodedPuzzle, readPuzzle, validatePuzzle } from '../../../src/core';

const dir = new URL('../../../public/puzzles/', import.meta.url);
const files = readdirSync(dir).filter((n) => /^\d{4}-\d\d-\d\d\.json$/.test(n));

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
});
