// Prints a decoded puzzle for review, since committed puzzle files are obfuscated (ADR-0001).
// Usage: npm run puzzle:show -- 2026-12-01   (or a path to any puzzle file)
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readPuzzle, validatePuzzle } from '../src/core';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run puzzle:show -- <YYYY-MM-DD | path/to/puzzle.json>');
  process.exit(1);
}

const file = existsSync(arg) ? arg : resolve('public/puzzles', `${arg}.json`);
if (!existsSync(file)) {
  console.error(`No puzzle file at ${file}`);
  process.exit(1);
}

const puzzle = readPuzzle(JSON.parse(readFileSync(file, 'utf8')));
const { size, letters } = puzzle;

console.log(
  `${puzzle.id}  ${size}×${size}  difficulty ${puzzle.difficulty}  by ${puzzle.author}\n`,
);
for (let row = 0; row < size; row++) {
  console.log('  ' + letters.slice(row * size, (row + 1) * size).join(' '));
}
console.log(`\n${puzzle.bridges.length} bridges, ${puzzle.words.length} required words:\n`);
const width = Math.max(...puzzle.words.map((w) => w.word.length));
for (const { word, path, definition } of puzzle.words) {
  console.log(`  ${word.padEnd(width)}  [${path.join(' ')}]  ${definition}`);
}
console.log(`\n${puzzle.extras.length} extra words: ${puzzle.extras.join(', ')}`);

const { ok, errors } = validatePuzzle(puzzle);
console.log(ok ? '\nvalidatePuzzle: ok' : `\nvalidatePuzzle: ${errors.length} problems`);
for (const error of errors) console.log(`  - ${error.message}`);
process.exit(ok ? 0 : 2);
