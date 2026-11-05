import { describe, expect, it } from 'vitest';
import {
  currentStreak,
  EMPTY_STATS,
  recordFinish,
  recordStart,
  type Stats,
} from '../../../src/core';

// Puzzles every day from Nov 1 to Nov 10, except Nov 5 (nobody scheduled one).
const published = [
  '2026-11-01',
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-06',
  '2026-11-07',
  '2026-11-08',
  '2026-11-09',
  '2026-11-10',
];

/** Opens and finishes a puzzle the way a player would. */
function play(
  stats: Stats,
  puzzleId: string,
  { startedOn = puzzleId, status = 'solved' as 'solved' | 'gaveUp' } = {},
): Stats {
  const started = recordStart(stats, puzzleId, startedOn);
  return recordFinish(started, { puzzleId, startedOn, status, published });
}

function days(...ids: string[]): Stats {
  return ids.reduce((s, id) => play(s, id), EMPTY_STATS);
}

describe('played and solves', () => {
  it('count daily and archive puzzles alike (D6)', () => {
    let s = play(EMPTY_STATS, '2026-11-03'); // daily
    s = play(s, '2026-11-01', { startedOn: '2026-11-03' }); // archive, solved
    s = play(s, '2026-11-02', { startedOn: '2026-11-03', status: 'gaveUp' }); // archive, given up
    expect(s).toMatchObject({ played: 3, solves: 2 });
  });
});

describe('streak', () => {
  it('grows by one for each consecutive daily solve', () => {
    const s = days('2026-11-01', '2026-11-02', '2026-11-03');
    expect(s).toMatchObject({ streak: 3, bestStreak: 3, lastDailySolve: '2026-11-03' });
  });

  it('a day without a published puzzle neither extends nor breaks it (D3)', () => {
    const s = days('2026-11-03', '2026-11-04', '2026-11-06');
    expect(s.streak).toBe(3);
    // On Nov 5 itself (no puzzle) the streak still shows as alive.
    expect(currentStreak(days('2026-11-03', '2026-11-04'), '2026-11-05', published)).toBe(2);
  });

  it('a missed puzzle day breaks it: the next solve starts again at 1', () => {
    const s = days('2026-11-01', '2026-11-02', '2026-11-04');
    expect(s).toMatchObject({ streak: 1, bestStreak: 2 });
  });

  it('shows as broken once a puzzle day has passed unsolved', () => {
    const s = days('2026-11-01', '2026-11-02');
    expect(currentStreak(s, '2026-11-02', published)).toBe(2); // solved today
    expect(currentStreak(s, '2026-11-03', published)).toBe(2); // today still open
    expect(currentStreak(s, '2026-11-04', published)).toBe(0); // missed Nov 3
  });

  it('counts a solve just past midnight if started on its own day (D4)', () => {
    let s = days('2026-11-01');
    s = recordStart(s, '2026-11-02', '2026-11-02'); // started at 23:55 on Nov 2
    s = recordFinish(s, {
      puzzleId: '2026-11-02',
      startedOn: '2026-11-02',
      status: 'solved', // solved at 00:05 on Nov 3
      published,
    });
    expect(s.streak).toBe(2);
    expect(currentStreak(s, '2026-11-03', published)).toBe(2);
  });

  it('a late solve no longer counts once the next day’s puzzle was started', () => {
    let s = days('2026-11-01');
    s = recordStart(s, '2026-11-02', '2026-11-02');
    s = recordStart(s, '2026-11-03', '2026-11-03'); // next day's puzzle opened first
    s = recordFinish(s, {
      puzzleId: '2026-11-02',
      startedOn: '2026-11-02',
      status: 'solved',
      published,
    });
    expect(s).toMatchObject({ streak: 1, solves: 2, lastDailySolve: '2026-11-01' });
  });

  it('the fallback "latest available" puzzle never counts (D3)', () => {
    // Nov 5 has no puzzle, so the game shows Nov 4's: started on Nov 5, not a daily solve.
    let s = days('2026-11-03');
    s = play(s, '2026-11-04', { startedOn: '2026-11-05' });
    expect(s).toMatchObject({ streak: 1, solves: 2, lastDailySolve: '2026-11-03' });
  });

  it('archive solves never extend it', () => {
    let s = days('2026-11-06');
    s = play(s, '2026-11-04', { startedOn: '2026-11-06' });
    expect(s).toMatchObject({ streak: 1, lastDailySolve: '2026-11-06' });
  });

  it('giving up the daily puzzle breaks it; giving up an archive puzzle does not', () => {
    const before = days('2026-11-01', '2026-11-02');
    const archive = play(before, '2026-11-01', { startedOn: '2026-11-03', status: 'gaveUp' });
    expect(archive.streak).toBe(2);
    const daily = play(before, '2026-11-03', { status: 'gaveUp' });
    expect(daily).toMatchObject({ streak: 0, bestStreak: 2 });
    expect(currentStreak(daily, '2026-11-03', published)).toBe(0);
    expect(play(daily, '2026-11-04').streak).toBe(1);
  });

  it('solving the same daily puzzle twice does not count twice', () => {
    const s = days('2026-11-01');
    const again = recordFinish(s, {
      puzzleId: '2026-11-01',
      startedOn: '2026-11-01',
      status: 'solved',
      published,
    });
    expect(again.streak).toBe(1);
  });
});
