// Proposes puzzles for a run of dates (spec §8 Generator). Deterministic: the same seed, word lists
// and existing puzzles give the same files.
// Usage: npm run generate -- --from 2026-12-01 --days 30 --seed 42 [--out public/puzzles] [--force]
//
// Writes obfuscated <date>.json files and index.json to --out, and a plain text report per board to
// data/reports/ (gitignored: it names every answer). Dates that already have a puzzle are skipped
// unless --force. Definitions are left empty for the drafting step.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  addDays,
  difficultyFactors,
  difficultyScore,
  isIsoDate,
  PuzzleGenerator,
  seededRandom,
  toUpper,
  WordList,
  type GeneratedPuzzle,
} from '../src/core';
import { readPuzzles, writeIndex, writePuzzle } from './puzzle-files';

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    days: { type: 'string', default: '1' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'public/puzzles' },
    reports: { type: 'string', default: 'data/reports' },
    force: { type: 'boolean', default: false },
  },
});

const from = values.from;
const days = Number(values.days);
if (!from || !isIsoDate(from) || !Number.isInteger(days) || days < 1) {
  console.error(
    'Usage: npm run generate -- --from YYYY-MM-DD --days N --seed S [--out dir] [--force]',
  );
  process.exit(1);
}

/** A word list from data/: one word per line, `#` comments, upper-cased. */
function wordFile(name: string, hint: string): string[] {
  const file = join('data', name);
  if (!existsSync(file)) {
    console.error(`${file} is missing: ${hint}`);
    process.exit(1);
  }
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map(toUpper);
}

const started = Date.now();
const rebuild = 'run `npm run wordlists` first';
const generator = new PuzzleGenerator({
  required: wordFile('required.txt', rebuild),
  valid: new WordList(wordFile('valid.txt', rebuild)),
  blocked: new WordList(wordFile('blocked-forms.txt', rebuild)),
});

const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
mkdirSync(values.out, { recursive: true });
mkdirSync(values.reports, { recursive: true });

// Keep words fresh: nothing required on another day already in the folder is reused.
const existing = readPuzzles(values.out);
const kept = existing.filter((p) => !dates.includes(p.id) || !values.force);
const avoid = new Set(kept.flatMap((p) => p.words.map((w) => w.word)));
const taken = new Set(kept.map((p) => p.id));

let written = 0;
for (const date of dates) {
  if (taken.has(date)) {
    console.log(`${date}  skipped: a puzzle exists (use --force to replace it)`);
    continue;
  }
  const result = generator.generate({
    id: date,
    random: seededRandom(`${values.seed}:${date}`),
    avoid,
  });
  if (!result) {
    console.log(`${date}  FAILED: no board passed the checks`);
    continue;
  }
  const { puzzle } = result;
  puzzle.words.forEach((w) => avoid.add(w.word));
  writePuzzle(values.out, puzzle);
  writeFileSync(join(values.reports, `${date}.txt`), report(result, values.seed));
  written++;
  const longest = puzzle.words.reduce((a, b) => ([...b.word].length > [...a.word].length ? b : a));
  console.log(
    `${date}  ${puzzle.words.length} words, ${puzzle.bridges.length} bridges, ` +
      `${puzzle.extras.length} extras, difficulty ${puzzle.difficulty}, anchor ${longest.word}`,
  );
}

if (written > 0) writeIndex(values.out);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${written} of ${dates.length} written to ${values.out} in ${seconds} s`);
if (written < dates.length - dates.filter((d) => taken.has(d)).length) process.exit(2);

/** The text report for one board: grid, words, checks and difficulty inputs. */
function report({ puzzle, unchosen, attempts }: GeneratedPuzzle, seed: string): string {
  const { size, letters } = puzzle;
  const grid = Array.from({ length: size }, (_, row) =>
    letters.slice(row * size, (row + 1) * size).join(' '),
  );
  const width = Math.max(...puzzle.words.map((w) => [...w.word].length));
  const f = difficultyFactors(puzzle);
  return [
    `${puzzle.id}  seed ${seed}  attempt ${attempts}`,
    '',
    ...grid.map((row) => `  ${row}`),
    '',
    `${puzzle.words.length} required words, ${puzzle.bridges.length} bridges:`,
    ...puzzle.words.map((w) => `  ${w.word.padEnd(width)}  [${w.path.join(' ')}]`),
    '',
    `Traceable required-list words left out (${unchosen.length}): ${unchosen.join(', ') || '–'}`,
    '',
    `Difficulty ${puzzle.difficulty} (score ${difficultyScore(f).toFixed(2)}): ` +
      `average length ${f.averageLength.toFixed(1)}, ${f.longWords} words of 7+ letters, ` +
      `letter rarity ${f.rarity.toFixed(2)}, ${f.extras} extras`,
    '',
    `${puzzle.extras.length} extras: ${puzzle.extras.join(', ')}`,
    '',
  ].join('\n');
}
