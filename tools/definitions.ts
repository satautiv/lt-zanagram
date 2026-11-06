// Drafting definitions for required words (spec §7 Definitions).
//   npm run definitions -- export [--from YYYY-MM-DD] [--out data/reports/definitions.tsv]
//     Lists every required word still without a definition, one `WORD<TAB>` line each; a word
//     already defined on another day comes pre-filled.
//   npm run definitions -- apply <file.tsv> [--overwrite]
//     Fills definitions in public/puzzles from `WORD<TAB>definition` lines, checking each one.
// The TSV names answers, so keep it in data/reports/ (gitignored).
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { toLower, type Puzzle } from '../src/core';
import { readPuzzles, writeIndex, writePuzzle } from './puzzle-files';

const DIR = 'public/puzzles';
const DEFINITION_MAX = 80;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: 'string', default: '0000-00-00' },
    out: { type: 'string', default: 'data/reports/definitions.tsv' },
    overwrite: { type: 'boolean', default: false },
  },
});

/** Why a definition can't be used, or null when it is fine. */
function definitionProblem(word: string, definition: string): string | null {
  const length = [...definition].length;
  if (length === 0) return 'empty';
  if (length >= DEFINITION_MAX) return `${length} characters (must be under ${DEFINITION_MAX})`;
  if (toLower(definition).includes(toLower(word))) return 'gives the word away';
  return null;
}

const puzzles = readPuzzles(DIR);
const [command, file] = positionals;

if (command === 'export') {
  const known = new Map<string, string>();
  for (const p of puzzles)
    for (const w of p.words) if (w.definition) known.set(w.word, w.definition);
  const missing = new Set(
    puzzles
      .filter((p) => p.id >= values.from)
      .flatMap((p) => p.words.filter((w) => !w.definition).map((w) => w.word)),
  );
  const lines = [...missing].sort().map((w) => `${w}\t${known.get(w) ?? ''}`);
  writeFileSync(values.out, lines.join('\n') + '\n');
  console.log(`${lines.length} words to define → ${values.out}`);
} else if (command === 'apply' && file) {
  const definitions = new Map<string, string>();
  const problems: string[] = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [word = '', definition = ''] = line.split('\t').map((s) => s.trim());
    const problem = definitionProblem(word, definition);
    if (problem) problems.push(`${word}: ${problem}`);
    else definitions.set(word, definition);
  }
  let filled = 0;
  const missing = new Set<string>();
  const changed: Puzzle[] = [];
  for (const puzzle of puzzles) {
    let touched = false;
    for (const w of puzzle.words) {
      if (w.definition && !values.overwrite) continue;
      const definition = definitions.get(w.word);
      if (definition === undefined) {
        if (!w.definition) missing.add(w.word);
        continue;
      }
      if (definition !== w.definition) {
        w.definition = definition;
        touched = true;
        filled++;
      }
    }
    if (touched) changed.push(puzzle);
  }
  for (const puzzle of changed) writePuzzle(DIR, puzzle);
  if (changed.length) writeIndex(DIR);
  console.log(`${filled} definitions written to ${changed.length} puzzles`);
  for (const p of problems) console.log(`  rejected  ${p}`);
  if (missing.size) console.log(`  still missing (${missing.size}): ${[...missing].join(', ')}`);
  process.exit(problems.length || missing.size ? 2 : 0);
} else {
  console.error('Usage: npm run definitions -- export | apply <file.tsv> [--overwrite]');
  process.exit(1);
}
