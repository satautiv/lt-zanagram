// Reading and writing the puzzle folder (public/puzzles): obfuscated files (ADR-0001) and index.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePuzzle, readPuzzle, validatePuzzle, type Puzzle } from '../src/core';

const PUZZLE_FILE = /^\d{4}-\d\d-\d\d\.json$/;

/** Every puzzle in the folder, decoded, in date order. */
export function readPuzzles(dir: string): Puzzle[] {
  return readdirSync(dir)
    .filter((name) => PUZZLE_FILE.test(name))
    .sort()
    .map((name) => {
      const puzzle = readPuzzle(JSON.parse(readFileSync(join(dir, name), 'utf8')));
      if (`${puzzle.id}.json` !== name) throw new Error(`${name} holds puzzle ${puzzle.id}`);
      return puzzle;
    });
}

/** Writes one puzzle, obfuscated, as `<date>.json`. */
export function writePuzzle(dir: string, puzzle: Puzzle): void {
  writeFileSync(
    join(dir, `${puzzle.id}.json`),
    JSON.stringify(encodePuzzle(puzzle), null, 2) + '\n',
  );
}

/** Rebuilds index.json (dates + difficulty), checking every puzzle on the way. */
export function writeIndex(dir: string): { date: string; difficulty: number }[] {
  const entries = readPuzzles(dir).map((puzzle) => {
    const { ok, errors } = validatePuzzle(puzzle);
    if (!ok) throw new Error(`${puzzle.id}: ${errors.map((e) => e.message).join('; ')}`);
    return { date: puzzle.id, difficulty: puzzle.difficulty };
  });
  writeFileSync(join(dir, 'index.json'), JSON.stringify(entries, null, 2) + '\n');
  return entries;
}
