import { bridgeKey, pathBridges, type TileIndex } from './board';
import { MIN_WORD_LENGTH, type Puzzle } from './puzzle';

/** Each extra word takes this much off the displayed and final time (spec §2 rule 7). */
export const EXTRA_WORD_BONUS_MS = 10_000;

export type GameStatus = 'playing' | 'solved' | 'gaveUp';

export interface FoundWord {
  word: string;
  /** Adjusted time when it was found: elapsed time minus the extra-word bonuses earned so far (D5). */
  atMs: number;
}

/** Everything about one puzzle being played. Plain data, so it can be saved and restored as is. */
export interface GameState {
  puzzleId: string;
  /** Required words found, in the order found. */
  found: FoundWord[];
  /** Extra words found, in the order found. */
  extras: string[];
  hintsUsed: number;
  /** The unfound required word hints are revealing, if any. */
  hintTarget: string | null;
  /** How many tiles of the hint target are revealed. */
  hintRevealed: number;
  /** Raw elapsed play time; the adjusted time subtracts the extra-word bonuses. */
  elapsedMs: number;
  status: GameStatus;
}

/** How a submission was judged; one case per row of the spec §4 feedback table, plus two guards. */
export type SubmissionResult =
  | { kind: 'required'; word: string; solved: boolean }
  | { kind: 'extra'; word: string }
  | { kind: 'alreadyFound'; word: string }
  | { kind: 'tooShort'; word: string }
  | { kind: 'notInList'; word: string }
  /** The path uses tiles or bridges that aren't visible, repeats a tile, or skips a bridge. */
  | { kind: 'invalidPath' }
  /** The puzzle is already solved or given up. */
  | { kind: 'finished' };

export interface Visibility {
  tiles: ReadonlySet<TileIndex>;
  /** Keys from `bridgeKey`. */
  bridges: ReadonlySet<string>;
}

export function newGame(puzzle: Puzzle): GameState {
  return {
    puzzleId: puzzle.id,
    found: [],
    extras: [],
    hintsUsed: 0,
    hintTarget: null,
    hintRevealed: 0,
    elapsedMs: 0,
    status: 'playing',
  };
}

export function isFound(state: GameState, word: string): boolean {
  return state.found.some((f) => f.word === word);
}

/** Required words not yet found, in puzzle order. */
export function unfoundWords(puzzle: Puzzle, state: GameState) {
  return puzzle.words.filter((w) => !isFound(state, w.word));
}

export function wordsLeft(puzzle: Puzzle, state: GameState): number {
  return unfoundWords(puzzle, state).length;
}

/**
 * A tile or bridge is visible while at least one unfound required word's canonical path uses it
 * (spec §3). Once the puzzle is over, nothing is left to trace.
 */
export function visibility(puzzle: Puzzle, state: GameState): Visibility {
  const tiles = new Set<TileIndex>();
  const bridges = new Set<string>();
  if (state.status === 'playing') {
    for (const { path } of unfoundWords(puzzle, state)) {
      path.forEach((tile) => tiles.add(tile));
      pathBridges(path).forEach(([a, b]) => bridges.add(bridgeKey(a, b)));
    }
  }
  return { tiles, bridges };
}

/** True if the path only uses visible tiles and bridges and never repeats a tile. */
export function isTraceable(visible: Visibility, path: readonly TileIndex[]): boolean {
  if (path.length === 0 || new Set(path).size !== path.length) return false;
  if (!path.every((tile) => visible.tiles.has(tile))) return false;
  return pathBridges(path).every(([a, b]) => visible.bridges.has(bridgeKey(a, b)));
}

export function spell(puzzle: Puzzle, path: readonly TileIndex[]): string {
  return path.map((tile) => puzzle.letters[tile] ?? '').join('');
}

/** Elapsed time minus 10 s per extra word, never below 0 (spec §5 Timer). */
export function adjustedTime(elapsedMs: number, extraCount: number): number {
  return Math.max(0, elapsedMs - extraCount * EXTRA_WORD_BONUS_MS);
}

export function displayTime(state: GameState): number {
  return adjustedTime(state.elapsedMs, state.extras.length);
}

/**
 * Judges a submitted path and returns the next state. A submission counts as a required word if it
 * spells any unfound required word, whichever path was traced; removal always follows the stored
 * canonical path because visibility is derived from the unfound words (spec §3 matching rule).
 */
export function submit(
  puzzle: Puzzle,
  state: GameState,
  path: readonly TileIndex[],
): { state: GameState; result: SubmissionResult } {
  if (state.status !== 'playing') return { state, result: { kind: 'finished' } };
  if (!isTraceable(visibility(puzzle, state), path)) {
    return { state, result: { kind: 'invalidPath' } };
  }

  const word = spell(puzzle, path);
  if (path.length < MIN_WORD_LENGTH) return { state, result: { kind: 'tooShort', word } };
  if (isFound(state, word) || state.extras.includes(word)) {
    return { state, result: { kind: 'alreadyFound', word } };
  }

  if (puzzle.words.some((w) => w.word === word)) {
    const found = [...state.found, { word, atMs: displayTime(state) }];
    const solved = found.length === puzzle.words.length;
    const hintDone = state.hintTarget === word;
    return {
      state: {
        ...state,
        found,
        status: solved ? 'solved' : 'playing',
        hintTarget: hintDone ? null : state.hintTarget,
        hintRevealed: hintDone ? 0 : state.hintRevealed,
      },
      result: { kind: 'required', word, solved },
    };
  }

  if (puzzle.extras.includes(word)) {
    return {
      state: { ...state, extras: [...state.extras, word] },
      result: { kind: 'extra', word },
    };
  }

  return { state, result: { kind: 'notInList', word } };
}

/** Ends the puzzle as given up; the remaining words are revealed by `unfoundWords`. */
export function giveUp(state: GameState): GameState {
  return state.status === 'playing' ? { ...state, status: 'gaveUp' } : state;
}

/** Records play time; the timer itself lives outside the core. */
export function setElapsed(state: GameState, elapsedMs: number): GameState {
  return state.status === 'playing' ? { ...state, elapsedMs: Math.max(0, elapsedMs) } : state;
}
