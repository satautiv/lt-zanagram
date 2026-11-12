import { unfoundWords, type GameState } from './game';
import { helpsFor, seededChoice } from './hint';
import type { Puzzle } from './puzzle';

/** A definition on show while its word is unfound: the text and the word's length, never the word. */
export interface ShownDefinition {
  definition: string;
  letters: number;
}

/** Definition hints left: as many per puzzle as hints, half the required words (#86). */
export function definitionHintsLeft(puzzle: Puzzle, state: GameState): number {
  return Math.max(0, helpsFor(puzzle) - state.definitionsShown.length);
}

/**
 * The word whose definition the next definition hint shows: an unfound required word not shown
 * yet. The hint target comes first, so a definition never pulls hints away from a half-revealed
 * word (#86); otherwise the word is chosen by a seed of the puzzle id and the uses so far, so
 * every player sees the same one.
 */
export function pickDefinitionWord(puzzle: Puzzle, state: GameState): string | null {
  const candidates = unfoundWords(puzzle, state).filter(
    (w) => !state.definitionsShown.includes(w.word),
  );
  if (candidates.length === 0) return null;
  if (candidates.some((w) => w.word === state.hintTarget)) return state.hintTarget;
  return seededChoice(candidates, `${puzzle.id}:definition:${state.definitionsShown.length}`).word;
}

export function canUseDefinitionHint(puzzle: Puzzle, state: GameState): boolean {
  return (
    state.status === 'playing' &&
    definitionHintsLeft(puzzle, state) > 0 &&
    pickDefinitionWord(puzzle, state) !== null
  );
}

/** Uses one definition hint; returns the same state when none can be used. */
export function useDefinitionHint(puzzle: Puzzle, state: GameState): GameState {
  if (!canUseDefinitionHint(puzzle, state)) return state;
  const word = pickDefinitionWord(puzzle, state)!;
  return { ...state, definitionsShown: [...state.definitionsShown, word] };
}

/** Definitions still on show: their words are unfound and the puzzle is being played. */
export function shownDefinitions(puzzle: Puzzle, state: GameState): ShownDefinition[] {
  if (state.status !== 'playing') return [];
  const unfound = new Map(unfoundWords(puzzle, state).map((w) => [w.word, w]));
  return state.definitionsShown.flatMap((word) => {
    const w = unfound.get(word);
    return w ? [{ definition: w.definition, letters: [...w.word].length }] : [];
  });
}
