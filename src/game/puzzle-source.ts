import { pickPuzzleDate, readPuzzle, validatePuzzle, type Puzzle } from '../core';

/** One row of `puzzles/index.json`. */
export interface PuzzleIndexEntry {
  date: string;
  difficulty: number;
}

const base = () => `${import.meta.env.BASE_URL}puzzles/`;

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function fetchIndex(): Promise<PuzzleIndexEntry[]> {
  const index = await getJson(`${base()}index.json`);
  if (!Array.isArray(index)) throw new Error('puzzles/index.json is not a list');
  return index as PuzzleIndexEntry[];
}

/** Fetches, decodes (ADR-0001) and validates one day's puzzle. */
export async function fetchPuzzle(date: string): Promise<Puzzle> {
  const puzzle = readPuzzle(await getJson(`${base()}${date}.json`));
  const { ok, errors } = validatePuzzle(puzzle);
  if (!ok) throw new Error(`Puzzle ${date} is invalid: ${errors[0]?.message}`);
  return puzzle;
}

/** Today's puzzle, or the latest available one (spec §9). `isDaily` is false for the fallback. */
export async function loadDailyPuzzle(
  today: string,
): Promise<{ puzzle: Puzzle; isDaily: boolean }> {
  const index = await fetchIndex();
  const date = pickPuzzleDate(
    index.map((e) => e.date),
    today,
  );
  if (date === null) throw new Error('No puzzles published');
  return { puzzle: await fetchPuzzle(date), isDaily: date === today };
}
