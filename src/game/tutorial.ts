import { newGame, unfoundWords, type GameState, type Puzzle } from '../core';

/**
 * The 3×3 board of the first-visit tutorial (spec §5 Tutorial):
 *
 *     L A P
 *     K A S
 *     O J A
 *
 * KOJA comes first: finding it drops O, J and the bottom A but keeps K, which KAPAS still needs.
 * LAPAS is typed, and KAPAS (the same tiles in another order) is left for the player.
 */
export const TUTORIAL_PUZZLE: Puzzle = {
  id: 'tutorial',
  size: 3,
  letters: ['L', 'A', 'P', 'K', 'A', 'S', 'O', 'J', 'A'],
  bridges: [
    [0, 1],
    [1, 2],
    [1, 5],
    [2, 4],
    [3, 4],
    [3, 6],
    [4, 5],
    [6, 7],
    [7, 8],
  ],
  words: [
    { word: 'KOJA', path: [3, 6, 7, 8], definition: 'Kūno dalis, kuria vaikštoma.' },
    { word: 'LAPAS', path: [0, 1, 2, 4, 5], definition: 'Plokščia žalia augalo dalis.' },
    { word: 'KAPAS', path: [3, 4, 2, 1, 5], definition: 'Vieta, kur palaidotas žmogus.' },
  ],
  extras: [],
  difficulty: 1,
  author: 'Žodžių tiltai',
  version: 1,
};

export type TutorialStep =
  | { kind: 'drag'; word: string }
  | { kind: 'type'; word: string }
  | { kind: 'last' }
  | { kind: 'done' };

/** A fresh tutorial game with the first word's path lit up, like a fully used hint. */
export function tutorialStart(): GameState {
  const first = TUTORIAL_PUZZLE.words[0]!;
  return { ...newGame(TUTORIAL_PUZZLE), hintTarget: first.word, hintRevealed: first.path.length };
}

/** Which guided step the player is on: drag a word, type a word, find the last alone, done. */
export function tutorialStep(state: GameState): TutorialStep {
  const unfound = unfoundWords(TUTORIAL_PUZZLE, state);
  const next = unfound[0];
  if (!next) return { kind: 'done' };
  if (state.found.length === 0) return { kind: 'drag', word: next.word };
  if (unfound.length > 1) return { kind: 'type', word: next.word };
  return { kind: 'last' };
}
