import { describe, expect, it } from 'vitest';
import {
  adjustedTime,
  bridgeKey,
  displayTime,
  giveUp,
  newGame,
  setElapsed,
  submit,
  unfoundWords,
  validatePuzzle,
  visibility,
  wordsLeft,
  type GameState,
  type Puzzle,
} from '../../../src/core';
import { puzzleFrom } from './helpers';

// 3×3 board:   N A M      NAMAS 0 1 2 5 4
//              O S A      NOKE  0 3 6 7
//              K E L      SELA  4 7 8 5     extra: MASE 2 5 4 7
const board = (): Puzzle =>
  puzzleFrom(
    3,
    'NAMOSAKEL',
    [
      ['NAMAS', [0, 1, 2, 5, 4]],
      ['NOKE', [0, 3, 6, 7]],
      ['SELA', [4, 7, 8, 5]],
    ],
    { extras: ['MASE'] },
  );

function play(puzzle: Puzzle, ...paths: number[][]): GameState {
  let state = newGame(puzzle);
  for (const path of paths) state = submit(puzzle, state, path).state;
  return state;
}

describe('game fixture', () => {
  it('is a valid puzzle', () => {
    expect(validatePuzzle(board()).errors).toEqual([]);
  });
});

describe('visibility', () => {
  it('shows every tile and bridge before the first find', () => {
    const p = board();
    const v = visibility(p, newGame(p));
    expect(v.tiles.size).toBe(9);
    expect(v.bridges.size).toBe(p.bridges.length);
  });

  it('keeps a shared tile while any unfound word uses it, and drops it with the last one', () => {
    const p = board();
    const afterNamas = visibility(p, play(p, [0, 1, 2, 5, 4]));
    expect(afterNamas.tiles.has(0)).toBe(true); // NOKE still needs N
    expect(afterNamas.tiles.has(1)).toBe(false); // only NAMAS used A at 1
    expect(afterNamas.tiles.has(2)).toBe(false);
    expect(afterNamas.bridges.has(bridgeKey(0, 1))).toBe(false);
    expect(afterNamas.bridges.has(bridgeKey(4, 5))).toBe(false); // SELA uses 8–5, not 4–5

    const afterNoke = visibility(p, play(p, [0, 1, 2, 5, 4], [0, 3, 6, 7]));
    expect(afterNoke.tiles.has(0)).toBe(false);
    expect([...afterNoke.tiles].sort()).toEqual([4, 5, 7, 8]);
  });

  it('is empty once the puzzle is solved or given up', () => {
    const p = board();
    expect(visibility(p, play(p, [0, 1, 2, 5, 4], [0, 3, 6, 7], [4, 7, 8, 5])).tiles.size).toBe(0);
    expect(visibility(p, giveUp(newGame(p))).tiles.size).toBe(0);
  });
});

describe('submit', () => {
  it('finds a required word', () => {
    const p = board();
    const { state, result } = submit(p, newGame(p), [0, 3, 6, 7]);
    expect(result).toEqual({ kind: 'required', word: 'NOKE', solved: false });
    expect(state.found.map((f) => f.word)).toEqual(['NOKE']);
    expect(wordsLeft(p, state)).toBe(2);
  });

  it('finds an extra word', () => {
    const p = board();
    const { state, result } = submit(p, newGame(p), [2, 5, 4, 7]);
    expect(result).toEqual({ kind: 'extra', word: 'MASE' });
    expect(state.extras).toEqual(['MASE']);
  });

  it('reports words already found, required or extra', () => {
    const p = board();
    const state = play(p, [0, 3, 6, 7], [2, 5, 4, 7]);
    expect(submit(p, state, [2, 5, 4, 7]).result.kind).toBe('alreadyFound');
    // A found required word usually can't be retraced: its own tiles (3 and 6 here) are gone.
    expect(submit(p, state, [0, 3, 6, 7]).result.kind).toBe('invalidPath');
  });

  it('rejects submissions under 4 letters', () => {
    const p = board();
    expect(submit(p, newGame(p), [0, 1, 2]).result).toEqual({ kind: 'tooShort', word: 'NAM' });
  });

  it('rejects words in no list', () => {
    const p = board();
    // N-A-M-A is traceable but not a word on this board.
    expect(submit(p, newGame(p), [0, 1, 2, 5]).result).toEqual({ kind: 'notInList', word: 'NAMA' });
  });

  it('rejects paths over missing bridges, repeated tiles or hidden tiles', () => {
    const p = board();
    expect(submit(p, newGame(p), [0, 4, 8, 5]).result.kind).toBe('invalidPath'); // no 0–4 bridge
    expect(submit(p, newGame(p), [0, 1, 0, 1]).result.kind).toBe('invalidPath');
    const afterNamas = play(p, [0, 1, 2, 5, 4]);
    expect(submit(p, afterNamas, [1, 2, 5, 4]).result.kind).toBe('invalidPath'); // 1 and 2 gone
  });

  it('solves the puzzle when the last required word is found', () => {
    const p = board();
    const before = play(p, [0, 1, 2, 5, 4], [0, 3, 6, 7]);
    const { state, result } = submit(p, before, [4, 7, 8, 5]);
    expect(result).toEqual({ kind: 'required', word: 'SELA', solved: true });
    expect(state.status).toBe('solved');
    expect(submit(p, state, [4, 7, 8, 5]).result.kind).toBe('finished');
  });

  it('does not change the state for rejected submissions', () => {
    const p = board();
    const state = newGame(p);
    expect(submit(p, state, [0, 1, 2]).state).toBe(state);
    expect(submit(p, state, [0, 1, 2, 5]).state).toBe(state);
  });
});

describe('matching rule', () => {
  // 2×2 board:  N A     NAMA canonical 0 1 3 2, but 0 2 3 1 also spells NAMA.
  //             A M     MANA 3 2 0 1
  const twoWays = () =>
    puzzleFrom(2, 'NAAM', [
      ['NAMA', [0, 1, 3, 2]],
      ['MANA', [3, 2, 0, 1]],
    ]);

  it('counts a required word traced along a different path, and removes its canonical path', () => {
    const p = twoWays();
    const { state, result } = submit(p, newGame(p), [0, 2, 3, 1]);
    expect(result.kind).toBe('required');
    const v = visibility(p, state);
    expect(v.bridges.has(bridgeKey(1, 3))).toBe(false); // only NAMA's canonical path used 1–3
    expect(v.bridges.has(bridgeKey(0, 2))).toBe(true); // MANA still needs it
    expect(unfoundWords(p, state).map((w) => w.word)).toEqual(['MANA']);
  });
});

describe('time', () => {
  it('subtracts 10 s per extra word, never below 0', () => {
    expect(adjustedTime(124_000, 2)).toBe(104_000);
    expect(adjustedTime(5_000, 1)).toBe(0);
  });

  it('records the adjusted time when each word is found (decision D5)', () => {
    const p = board();
    let state = setElapsed(newGame(p), 60_000);
    state = submit(p, state, [2, 5, 4, 7]).state; // extra: −10 s
    state = setElapsed(state, 90_000);
    state = submit(p, state, [0, 3, 6, 7]).state;
    expect(state.found[0]).toEqual({ word: 'NOKE', atMs: 80_000 });
    expect(displayTime(state)).toBe(80_000);
  });

  it('stops recording time once finished', () => {
    const p = board();
    const over = giveUp(setElapsed(newGame(p), 1_000));
    expect(setElapsed(over, 50_000).elapsedMs).toBe(1_000);
  });
});

describe('give up', () => {
  it('ends the puzzle and leaves the remaining words to reveal', () => {
    const p = board();
    const state = giveUp(play(p, [0, 3, 6, 7]));
    expect(state.status).toBe('gaveUp');
    expect(unfoundWords(p, state).map((w) => w.word)).toEqual(['NAMAS', 'SELA']);
    expect(submit(p, state, [0, 1, 2, 5, 4]).result.kind).toBe('finished');
    expect(giveUp(state)).toBe(state);
  });

  it('state survives a JSON round trip', () => {
    const p = board();
    const state = play(p, [0, 3, 6, 7], [2, 5, 4, 7]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
