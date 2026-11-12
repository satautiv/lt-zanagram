import { describe, expect, it } from 'vitest';
import {
  canUseDefinitionHint,
  definitionHintsLeft,
  giveUp,
  helpsFor,
  newGame,
  pickDefinitionWord,
  shownDefinitions,
  revealedTiles,
  submit,
  useDefinitionHint,
  useHint,
  type Puzzle,
} from '../../../src/core';
import { puzzleFrom } from './helpers';

// 3×3 board:   N A M      NAMAS 0 1 2 5 4
//              O S A      NOKE  0 3 6 7
//              K E L      SELA  4 7 8 5
const DEFINITIONS: Record<string, string> = {
  NAMAS: 'Pastatas, kuriame gyvenama.',
  NOKE: 'Bandomasis apibrėžimas.',
  SELA: 'Kitas bandomasis apibrėžimas.',
};
const board = (id = '2026-11-05'): Puzzle => {
  const p = puzzleFrom(
    3,
    'NAMOSAKEL',
    [
      ['NAMAS', [0, 1, 2, 5, 4]],
      ['NOKE', [0, 3, 6, 7]],
      ['SELA', [4, 7, 8, 5]],
    ],
    { id },
  );
  return { ...p, words: p.words.map((w) => ({ ...w, definition: DEFINITIONS[w.word]! })) };
};
const pathOf = (p: Puzzle, word: string) => p.words.find((w) => w.word === word)!.path;

describe('definition hint (#83)', () => {
  it('gives as many as hints: half the required words, rounded up (#86)', () => {
    const p = board();
    expect(helpsFor(p)).toBe(2);
    let state = newGame(p);
    expect(definitionHintsLeft(p, state)).toBe(2);
    state = useDefinitionHint(p, state);
    expect(definitionHintsLeft(p, state)).toBe(1);
    state = useDefinitionHint(p, state);
    expect(definitionHintsLeft(p, state)).toBe(0);
    expect(canUseDefinitionHint(p, state)).toBe(false);
    expect(useDefinitionHint(p, state)).toBe(state);
  });

  it('shows two different unfound words, the same for every player', () => {
    const p = board();
    const twice = useDefinitionHint(p, useDefinitionHint(p, newGame(p)));
    expect(new Set(twice.definitionsShown).size).toBe(2);
    const again = useDefinitionHint(p, useDefinitionHint(p, newGame(p)));
    expect(again.definitionsShown).toEqual(twice.definitionsShown);
    const picks = new Set(
      Array.from({ length: 20 }, (_, d) => {
        const other = board(`2026-12-${String(d + 1).padStart(2, '0')}`);
        return pickDefinitionWord(other, newGame(other));
      }),
    );
    expect(picks.size).toBeGreaterThan(1); // the puzzle id seeds the choice
  });

  it('never picks a found word', () => {
    const p = board();
    let state = submit(p, newGame(p), pathOf(p, 'NAMAS')).state;
    state = submit(p, state, pathOf(p, 'NOKE')).state;
    expect(pickDefinitionWord(p, state)).toBe('SELA');
    state = useDefinitionHint(p, state);
    // Only shown or found words remain: nothing left to show.
    expect(canUseDefinitionHint(p, state)).toBe(false);
    expect(definitionHintsLeft(p, state)).toBe(1);
  });

  it('shows the definition and letter count, never the word, until it is found', () => {
    const p = board();
    let state = useDefinitionHint(p, newGame(p));
    const word = state.definitionsShown[0]!;
    expect(shownDefinitions(p, state)).toEqual([
      { definition: DEFINITIONS[word], letters: [...word].length },
    ]);
    expect(JSON.stringify(shownDefinitions(p, state))).not.toContain(word);
    state = submit(p, state, pathOf(p, word)).state;
    expect(shownDefinitions(p, state)).toEqual([]);
    expect(definitionHintsLeft(p, state)).toBe(1); // finding it doesn't give the use back
  });

  it('does nothing once the puzzle is over', () => {
    const p = board();
    const over = giveUp(useDefinitionHint(p, newGame(p)));
    expect(canUseDefinitionHint(p, over)).toBe(false);
    expect(useDefinitionHint(p, over)).toBe(over);
    expect(shownDefinitions(p, over)).toEqual([]);
  });
});

describe('definition hint and hint work on one word (#86)', () => {
  it('the next hint reveals the word whose definition is on show', () => {
    const p = board();
    // NAMAS is the longest word: without its definition the hint would never start there.
    const state = useHint(p, { ...newGame(p), definitionsShown: ['NAMAS'] });
    expect(state.hintTarget).toBe('NAMAS');
    expect(revealedTiles(p, state)).toEqual([0]);
  });

  it('takes the earliest shown definition first, then the next one', () => {
    const p = board();
    let state = useHint(p, { ...newGame(p), definitionsShown: ['NAMAS', 'SELA'] });
    expect(state.hintTarget).toBe('NAMAS');
    state = useHint(p, submit(p, state, pathOf(p, 'NAMAS')).state);
    expect(state.hintTarget).toBe('SELA');
  });

  it('ignores definitions of words already found', () => {
    const p = board();
    let state = { ...newGame(p), definitionsShown: ['NOKE'] };
    state = useHint(p, submit(p, state, pathOf(p, 'NOKE')).state);
    expect(state.hintTarget).toBe('SELA'); // the shortest word left
  });

  it('a definition hint shows the hint target first', () => {
    for (let d = 1; d <= 10; d++) {
      const p = board(`2026-12-${String(d).padStart(2, '0')}`);
      const hinted = useHint(p, newGame(p));
      expect(useDefinitionHint(p, hinted).definitionsShown).toEqual([hinted.hintTarget]);
    }
  });

  it('then picks another word once the target’s definition is on show', () => {
    const p = board();
    const shown = useDefinitionHint(p, useHint(p, newGame(p)));
    const next = useDefinitionHint(p, shown);
    expect(next.definitionsShown).toHaveLength(2);
    expect(next.definitionsShown[1]).not.toBe(shown.hintTarget);
  });
});
