import { describe, expect, it } from 'vitest';
import {
  canUseHint,
  giveUp,
  hintTargetRevealed,
  hintsLeft,
  MAX_HINTS,
  newGame,
  pickHintTarget,
  revealedTiles,
  submit,
  useHint,
  type GameState,
  type Puzzle,
} from '../../../src/core';
import { puzzleFrom } from './helpers';

// 3×3 board:   N A M      NAMAS 0 1 2 5 4   (5 tiles)
//              O S A      NOKE  0 3 6 7     (4 tiles)
//              K E L      SELA  4 7 8 5     (4 tiles)
const board = (id = '2026-11-05'): Puzzle =>
  puzzleFrom(
    3,
    'NAMOSAKEL',
    [
      ['NAMAS', [0, 1, 2, 5, 4]],
      ['NOKE', [0, 3, 6, 7]],
      ['SELA', [4, 7, 8, 5]],
    ],
    { id },
  );

function hints(puzzle: Puzzle, count: number, state: GameState = newGame(puzzle)): GameState {
  for (let i = 0; i < count; i++) state = useHint(puzzle, state);
  return state;
}

describe('hint picker', () => {
  it('targets the shortest unfound word', () => {
    const p = board();
    expect(['NOKE', 'SELA']).toContain(pickHintTarget(p, newGame(p)));
  });

  it('breaks ties the same way for the same puzzle id', () => {
    const a = board('2026-11-05');
    expect(pickHintTarget(a, newGame(a))).toBe(pickHintTarget(board('2026-11-05'), newGame(a)));
    const targets = new Set(
      Array.from({ length: 20 }, (_, d) => {
        const p = board(`2026-12-${String(d + 1).padStart(2, '0')}`);
        return pickHintTarget(p, newGame(p));
      }),
    );
    expect(targets).toEqual(new Set(['NOKE', 'SELA'])); // different ids pick different ties
  });

  it('hint 1 reveals one tile, hint 2 two tiles of the same word (milestone 1)', () => {
    const p = board();
    const one = hints(p, 1);
    const target = p.words.find((w) => w.word === one.hintTarget)!;
    expect(revealedTiles(p, one)).toEqual(target.path.slice(0, 1));
    const two = useHint(p, one);
    expect(two.hintTarget).toBe(one.hintTarget);
    expect(revealedTiles(p, two)).toEqual(target.path.slice(0, 2));
  });

  it('allows at most 5 hints per puzzle (#82)', () => {
    expect(MAX_HINTS).toBe(5);
    const p = board();
    // Four hints reveal the whole 4-letter target; finding it frees the fifth for a new target.
    let state = hints(p, 4);
    const first = p.words.find((w) => w.word === state.hintTarget)!;
    state = useHint(p, submit(p, state, first.path).state);
    expect(state.hintsUsed).toBe(MAX_HINTS);
    expect(hintsLeft(state)).toBe(0);
    expect(canUseHint(p, state)).toBe(false);
    expect(hintTargetRevealed(p, state)).toBe(false);
    expect(useHint(p, state)).toBe(state);
  });

  it('waits once a short target is fully revealed, until it is found (#82)', () => {
    const p = board();
    const four = hints(p, 4);
    const target = p.words.find((w) => w.word === four.hintTarget)!;
    expect(target.path).toHaveLength(4);
    expect(revealedTiles(p, four)).toEqual(target.path);
    expect(hintsLeft(four)).toBe(1);
    expect(canUseHint(p, four)).toBe(false);
    expect(hintTargetRevealed(p, four)).toBe(true);
    expect(useHint(p, four)).toBe(four);

    const found = submit(p, four, target.path).state;
    expect(canUseHint(p, found)).toBe(true);
    expect(hintTargetRevealed(p, found)).toBe(false);
  });

  it('can be used on a fresh puzzle, not on a finished one', () => {
    const p = board();
    expect(canUseHint(p, newGame(p))).toBe(true);
    expect(canUseHint(p, giveUp(newGame(p)))).toBe(false);
    expect(hintTargetRevealed(p, giveUp(newGame(p)))).toBe(false);
  });

  it('keeps the target until found, then picks a new one', () => {
    const p = board();
    let state = hints(p, 1);
    const first = p.words.find((w) => w.word === state.hintTarget)!;
    state = submit(p, state, first.path).state;
    expect(state.hintTarget).toBeNull();
    expect(revealedTiles(p, state)).toEqual([]);
    state = useHint(p, state);
    expect(state.hintTarget).not.toBe(first.word);
    expect(state.hintRevealed).toBe(1);
    expect(state.hintsUsed).toBe(2);
  });

  it('does nothing once the puzzle is over', () => {
    const p = board();
    const over = giveUp(newGame(p));
    expect(useHint(p, over)).toBe(over);
    expect(revealedTiles(p, hints(p, 1, newGame(p)))).toHaveLength(1);
    expect(revealedTiles(p, giveUp(hints(p, 1)))).toEqual([]);
  });
});
