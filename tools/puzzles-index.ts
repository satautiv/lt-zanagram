// Rebuilds public/puzzles/index.json (dates + difficulty) from the puzzle files in that folder.
// Usage: npm run puzzles:index
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPuzzle, validatePuzzle } from '../src/core';

const dir = 'public/puzzles';
const entries = readdirSync(dir)
  .filter((name) => /^\d{4}-\d\d-\d\d\.json$/.test(name))
  .sort()
  .map((name) => {
    const puzzle = readPuzzle(JSON.parse(readFileSync(join(dir, name), 'utf8')));
    if (`${puzzle.id}.json` !== name) throw new Error(`${name} holds puzzle ${puzzle.id}`);
    const { ok, errors } = validatePuzzle(puzzle);
    if (!ok) throw new Error(`${name}: ${errors.map((e) => e.message).join('; ')}`);
    return { date: puzzle.id, difficulty: puzzle.difficulty };
  });

writeFileSync(join(dir, 'index.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`index.json: ${entries.length} puzzles, ${entries[0]?.date} … ${entries.at(-1)?.date}`);
