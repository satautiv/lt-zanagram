import { describe, expect, it } from 'vitest';
import { revealedTiles, submit, validatePuzzle, type GameState } from '../../../src/core';
import { TUTORIAL_PUZZLE, tutorialStart, tutorialStep } from '../../../src/game/tutorial';

const pathOf = (word: string) => TUTORIAL_PUZZLE.words.find((w) => w.word === word)!.path;

function find(state: GameState, word: string): GameState {
  const next = submit(TUTORIAL_PUZZLE, state, pathOf(word));
  expect(next.result).toMatchObject({ kind: 'required', word });
  return next.state;
}

describe('tutorial puzzle', () => {
  it('is a valid 3×3 board with two or three short words', () => {
    expect(validatePuzzle(TUTORIAL_PUZZLE).errors).toEqual([]);
    expect(TUTORIAL_PUZZLE.size).toBe(3);
    expect(TUTORIAL_PUZZLE.words.length).toBeGreaterThanOrEqual(2);
    expect(TUTORIAL_PUZZLE.words.length).toBeLessThanOrEqual(3);
    for (const { word } of TUTORIAL_PUZZLE.words) expect([...word].length).toBeLessThanOrEqual(5);
  });

  it('starts with the first word highlighted for dragging', () => {
    const start = tutorialStart();
    const first = TUTORIAL_PUZZLE.words[0]!;
    expect(revealedTiles(TUTORIAL_PUZZLE, start)).toEqual(first.path);
    expect(tutorialStep(start)).toEqual({ kind: 'drag', word: first.word });
  });

  it('guides drag, then typing, then the last word alone, then done', () => {
    const [a, b, c] = TUTORIAL_PUZZLE.words.map((w) => w.word) as [string, string, string];
    let state = find(tutorialStart(), a);
    expect(tutorialStep(state)).toEqual({ kind: 'type', word: b });
    state = find(state, b);
    expect(tutorialStep(state)).toEqual({ kind: 'last' });
    state = find(state, c);
    expect(tutorialStep(state)).toEqual({ kind: 'done' });
  });

  it('the first find leaves some tiles behind, so the player sees what disappears', () => {
    const [first, ...rest] = TUTORIAL_PUZZLE.words;
    const stillNeeded = new Set(rest.flatMap((w) => w.path));
    const gone = first!.path.filter((tile) => !stillNeeded.has(tile));
    const kept = first!.path.filter((tile) => stillNeeded.has(tile));
    expect(gone.length).toBeGreaterThan(0);
    expect(kept.length).toBeGreaterThan(0);
  });

  it('names the next unfound word when the player goes out of order', () => {
    const [a, b] = TUTORIAL_PUZZLE.words.map((w) => w.word) as [string, string];
    const state = find(tutorialStart(), b);
    expect(tutorialStep(state)).toEqual({ kind: 'type', word: a });
  });
});
