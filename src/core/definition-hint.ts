import { unfoundWords, type GameState } from './game';
import { seededChoice } from './hint';
import type { Puzzle } from './puzzle';

/** Definition hints per puzzle (spec §5 Definition hint, #83). */
export const MAX_DEFINITION_HINTS = 2;

/** A definition on show while its word is unfound: the text and the word's length, never the word. */
export interface ShownDefinition {
  definition: string;
  letters: number;
}

export function definitionHintsLeft(state: GameState): number {
  return Math.max(0, MAX_DEFINITION_HINTS - state.definitionsShown.length);
}

/**
 * The word whose definition the next definition hint shows: an unfound required word not shown
 * yet, chosen by a seed of the puzzle id and the uses so far, so every player sees the same one.
 */
export function pickDefinitionWord(puzzle: Puzzle, state: GameState): string | null {
  const candidates = unfoundWords(puzzle, state).filter(
    (w) => !state.definitionsShown.includes(w.word),
  );
  if (candidates.length === 0) return null;
  return seededChoice(candidates, `${puzzle.id}:definition:${state.definitionsShown.length}`).word;
}

export function canUseDefinitionHint(puzzle: Puzzle, state: GameState): boolean {
  return (
    state.status === 'playing' &&
    definitionHintsLeft(state) > 0 &&
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
