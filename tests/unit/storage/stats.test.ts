import { describe, expect, it } from 'vitest';
import { EMPTY_STATS } from '../../../src/core';
import { loadStats, saveStats } from '../../../src/storage/stats';
import { Store, type KeyValueStorage } from '../../../src/storage/store';

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('stats storage', () => {
  it('round-trips under zt:v1:stats', () => {
    const backend = memory();
    const store = new Store(backend);
    const stats = { ...EMPTY_STATS, played: 4, solves: 3, streak: 2, lastDailySolve: '2026-11-06' };
    saveStats(store, stats);
    expect(backend.data.has('zt:v1:stats')).toBe(true);
    expect(loadStats(store)).toEqual(stats);
  });

  it('drops values of the wrong type', () => {
    const backend = memory();
    backend.data.set('zt:v1:stats', JSON.stringify({ played: 'many', solves: -1, streak: 2 }));
    expect(loadStats(new Store(backend))).toEqual({ ...EMPTY_STATS, streak: 2 });
  });
});
