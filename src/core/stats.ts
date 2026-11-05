/**
 * Player statistics, `zt:v1:stats` (spec §9 Stats and streak, decisions D3, D4, D6).
 *
 * - Played counts every puzzle started, and Solves every puzzle solved, daily or archive.
 * - The streak counts daily puzzles only: a puzzle counts if it was the daily puzzle when it was
 *   started (its date equals the local date it was started on) and it is solved before a later
 *   day's puzzle is started, so a solve just past midnight still counts.
 * - Days are puzzle days: a day with no published puzzle neither extends nor breaks the streak.
 * - Giving up the daily puzzle breaks the streak; archive solves and give-ups never touch it.
 */
export interface Stats {
  played: number;
  solves: number;
  /** The streak as of the last daily solve; see `currentStreak` for today's view. */
  streak: number;
  bestStreak: number;
  /** Date of the last daily puzzle that counted for the streak. */
  lastDailySolve: string | null;
  /** Date of the latest puzzle started as the daily puzzle. */
  lastDailyStarted: string | null;
}

export const EMPTY_STATS: Readonly<Stats> = {
  played: 0,
  solves: 0,
  streak: 0,
  bestStreak: 0,
  lastDailySolve: null,
  lastDailyStarted: null,
};

/** The published date just before `date`, or null if there is none. */
function previousPuzzleDate(published: readonly string[], date: string): string | null {
  let previous: string | null = null;
  for (const d of published) if (d < date && (previous === null || d > previous)) previous = d;
  return previous;
}

/** A puzzle was opened for the first time on local date `today`. */
export function recordStart(stats: Stats, puzzleId: string, today: string): Stats {
  const daily = puzzleId === today;
  return {
    ...stats,
    played: stats.played + 1,
    lastDailyStarted:
      daily && (stats.lastDailyStarted === null || puzzleId > stats.lastDailyStarted)
        ? puzzleId
        : stats.lastDailyStarted,
  };
}

export interface Finish {
  puzzleId: string;
  /** Local date the puzzle was started on. */
  startedOn: string;
  status: 'solved' | 'gaveUp';
  /** Every published puzzle date (from `index.json`). */
  published: readonly string[];
}

/** A puzzle was solved or given up. */
export function recordFinish(stats: Stats, finish: Finish): Stats {
  const { puzzleId, startedOn, status, published } = finish;
  const startedAsDaily = puzzleId === startedOn;
  const solved = status === 'solved';
  const next: Stats = { ...stats, solves: stats.solves + (solved ? 1 : 0) };
  if (!startedAsDaily) return next;

  if (!solved) return { ...next, streak: 0 };

  // A later day's puzzle was already started: this solve is too late to count.
  if (stats.lastDailyStarted !== null && stats.lastDailyStarted > puzzleId) return next;
  if (stats.lastDailySolve !== null && stats.lastDailySolve >= puzzleId) return next;

  const continues =
    stats.lastDailySolve !== null &&
    stats.lastDailySolve === previousPuzzleDate(published, puzzleId);
  const streak = continues ? stats.streak + 1 : 1;
  return {
    ...next,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastDailySolve: puzzleId,
  };
}

/**
 * The streak as the player sees it on `today`. It stays alive while the last counted solve is on
 * or after the last puzzle day before today: today's puzzle can still be solved, and days without
 * a puzzle don't count. Otherwise a puzzle day was missed and the streak is broken.
 */
export function currentStreak(stats: Stats, today: string, published: readonly string[]): number {
  if (stats.lastDailySolve === null || stats.streak === 0) return 0;
  const required = previousPuzzleDate(published, today);
  return required === null || stats.lastDailySolve >= required ? stats.streak : 0;
}
