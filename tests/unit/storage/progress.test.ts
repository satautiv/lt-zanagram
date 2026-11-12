import { describe, expect, it } from 'vitest';
import { localDate, newGame, rotate, submit, type GameState } from '../../../src/core';
import { loadProgress, saveProgress } from '../../../src/storage/progress';
import { Store, type KeyValueStorage } from '../../../src/storage/store';
import { puzzleFrom } from '../core/helpers';

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const puzzle = puzzleFrom(
  3,
  'NAMOSAKEL',
  [
    ['NAMAS', [0, 1, 2, 5, 4]],
    ['NOKE', [0, 3, 6, 7]],
    ['SELA', [4, 7, 8, 5]],
  ],
  { extras: ['MASE'] },
);

describe('progress', () => {
  it('round-trips a game in progress under zt:v1:progress:<date>', () => {
    const backend = memory();
    const store = new Store(backend);
    let state = submit(puzzle, newGame(puzzle), [0, 3, 6, 7]).state;
    state = rotate(state);
    saveProgress(store, { state, startedOn: '2026-11-05' });
    expect([...backend.data.keys()]).toEqual(['zt:v1:progress:2026-11-05']);
    expect(loadProgress(store, '2026-11-05')).toEqual({ state, startedOn: '2026-11-05' });
  });

  it('ignores saves for another puzzle or with the wrong shape', () => {
    const backend = memory();
    const store = new Store(backend);
    backend.data.set('zt:v1:progress:2026-11-05', JSON.stringify({ state: { puzzleId: 'x' } }));
    expect(loadProgress(store, '2026-11-05')).toBeNull();
    backend.data.set('zt:v1:progress:2026-11-05', '"nonsense"');
    expect(loadProgress(store, '2026-11-05')).toBeNull();
    expect(loadProgress(store, '2026-11-06')).toBeNull();
  });

  it('fills fields added after the save was written', () => {
    const backend = memory();
    const store = new Store(backend);
    const old: Partial<GameState> = newGame(puzzle);
    delete old.rotation;
    delete old.definitionsShown;
    backend.data.set(
      'zt:v1:progress:2026-11-05',
      JSON.stringify({ state: old, startedOn: '2026-11-05' }),
    );
    expect(loadProgress(store, '2026-11-05')?.state.rotation).toBe(0);
    expect(loadProgress(store, '2026-11-05')?.state.definitionsShown).toEqual([]);
  });
});

describe('localDate', () => {
  it('formats the local calendar date', () => {
    expect(localDate(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    expect(localDate(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  });
});
