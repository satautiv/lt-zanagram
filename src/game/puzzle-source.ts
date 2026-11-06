import { pickPuzzleDate, readPuzzle, validatePuzzle, type Puzzle } from '../core';

/** One row of `puzzles/index.json`. */
export interface PuzzleIndexEntry {
  date: string;
  difficulty: number;
}

const base = () => `${import.meta.env.BASE_URL}puzzles/`;

const indexFile = () => `${base()}index.json`;
const puzzleFile = (date: string) => `${base()}${date}.json`;

/** The files a day's puzzle is loaded from: the index and the puzzle itself. */
export function puzzleFiles(date: string): string[] {
  return [indexFile(), puzzleFile(date)];
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function fetchIndex(): Promise<PuzzleIndexEntry[]> {
  const index = await getJson(indexFile());
  if (!Array.isArray(index)) throw new Error('puzzles/index.json is not a list');
  return index as PuzzleIndexEntry[];
}

/** Fetches, decodes (ADR-0001) and validates one day's puzzle. */
export async function fetchPuzzle(date: string): Promise<Puzzle> {
  const puzzle = readPuzzle(await getJson(puzzleFile(date)));
  const { ok, errors } = validatePuzzle(puzzle);
  if (!ok) throw new Error(`Puzzle ${date} is invalid: ${errors[0]?.message}`);
  return puzzle;
}

export interface DailyPuzzle {
  puzzle: Puzzle;
  /** False when today has no puzzle and the latest available one is shown instead. */
  isDaily: boolean;
  /** Every published date, for the streak's puzzle days. */
  published: string[];
}

/** Today's puzzle, or the latest available one (spec §9). */
export async function loadDailyPuzzle(today: string): Promise<DailyPuzzle> {
  const published = (await fetchIndex()).map((e) => e.date);
  const date = pickPuzzleDate(published, today);
  if (date === null) throw new Error('No puzzles published');
  return { puzzle: await fetchPuzzle(date), isDaily: date === today, published };
}

/**
 * The puzzle for a requested date (an archive link, `#YYYY-MM-DD`) if it is published and not in
 * the future; otherwise today's puzzle as usual.
 */
export async function loadPuzzleFor(requested: string | null, today: string): Promise<DailyPuzzle> {
  if (requested === null || requested > today) return loadDailyPuzzle(today);
  const published = (await fetchIndex()).map((e) => e.date);
  if (!published.includes(requested)) return loadDailyPuzzle(today);
  return { puzzle: await fetchPuzzle(requested), isDaily: requested === today, published };
}
