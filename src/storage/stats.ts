import { EMPTY_STATS, type Stats } from '../core';
import type { Store } from './store';

const KEY = 'stats';

/** Stored stats over empty ones, keeping only fields of the right type. */
export function loadStats(store: Store): Stats {
  const stored = store.read<Partial<Record<keyof Stats, unknown>>>(KEY, {});
  const stats: Stats = { ...EMPTY_STATS };
  for (const key of ['played', 'solves', 'streak', 'bestStreak'] as const) {
    const value = stored[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) stats[key] = value;
  }
  for (const key of ['lastDailySolve', 'lastDailyStarted'] as const) {
    const value = stored[key];
    if (typeof value === 'string') stats[key] = value;
  }
  return stats;
}

export function saveStats(store: Store, stats: Stats): void {
  store.write(KEY, stats);
}
