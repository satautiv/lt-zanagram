import type { TileIndex } from './board';
import { unfoundWords, type GameState } from './game';
import type { Puzzle } from './puzzle';

/**
 * Uses of each help per puzzle: half the required words, rounded up (spec §5 Hint, #86). Hints and
 * definition hints get the same count; published puzzles have 9–16 words, so 5–8 of each.
 */
export function helpsFor(puzzle: Puzzle): number {
  return Math.ceil(puzzle.words.length / 2);
}

/** FNV-1a: a small, stable string hash for seeding. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 step: one deterministic float in [0, 1) from a 32-bit seed. */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** One item picked by a seed string, the same for every player (spec §5 Hint tie-breaks). */
export function seededChoice<T>(items: readonly T[], seed: string): T {
  return items[Math.floor(seededRandom(hash(seed)) * items.length)]!;
}

export function hintsLeft(puzzle: Puzzle, state: GameState): number {
  return Math.max(0, helpsFor(puzzle) - state.hintsUsed);
}

/**
 * True while a hint would reveal something: hints are left, the puzzle is still being played, and
 * the hint target (if any) still has hidden tiles. With 5 or more hints a 4-letter target can be
 * fully revealed; the next hint waits until that word is found.
 */
export function canUseHint(puzzle: Puzzle, state: GameState): boolean {
  if (state.status !== 'playing' || hintsLeft(puzzle, state) === 0) return false;
  if (state.hintTarget === null) return pickHintTarget(puzzle, state) !== null;
  const word = puzzle.words.find((w) => w.word === state.hintTarget);
  return word !== undefined && state.hintRevealed < word.path.length;
}

/** The hint target is fully revealed and hints are left: the player has to find it first. */
export function hintTargetRevealed(puzzle: Puzzle, state: GameState): boolean {
  return state.status === 'playing' && hintsLeft(puzzle, state) > 0 && !canUseHint(puzzle, state);
}

/**
 * The next hint target. A word whose definition is on show comes first, the earliest shown, so the
 * hint and the definition hint work on one word (#86). Otherwise the unfound required word with
 * the shortest path; ties are broken by a choice seeded with the puzzle id (and how many hints
 * were used), so every player sees the same hint (spec §5 Hint).
 */
export function pickHintTarget(puzzle: Puzzle, state: GameState): string | null {
  const unfound = unfoundWords(puzzle, state);
  if (unfound.length === 0) return null;
  const defined = state.definitionsShown.find((word) => unfound.some((w) => w.word === word));
  if (defined !== undefined) return defined;
  const shortest = Math.min(...unfound.map((w) => w.path.length));
  const ties = unfound.filter((w) => w.path.length === shortest);
  return seededChoice(ties, `${puzzle.id}:${state.hintsUsed}`).word;
}

/**
 * Uses one hint: picks a target if there is none, otherwise reveals one more tile of it. Returns
 * the same state when no hints are left, the puzzle is over, or the target is fully revealed.
 */
export function useHint(puzzle: Puzzle, state: GameState): GameState {
  if (state.status !== 'playing' || hintsLeft(puzzle, state) === 0) return state;
  if (state.hintTarget === null) {
    const target = pickHintTarget(puzzle, state);
    if (target === null) return state;
    return { ...state, hintTarget: target, hintRevealed: 1, hintsUsed: state.hintsUsed + 1 };
  }
  const word = puzzle.words.find((w) => w.word === state.hintTarget);
  if (!word || state.hintRevealed >= word.path.length) return state;
  return { ...state, hintRevealed: state.hintRevealed + 1, hintsUsed: state.hintsUsed + 1 };
}

/** The tiles hints have revealed so far, in path order. */
export function revealedTiles(puzzle: Puzzle, state: GameState): TileIndex[] {
  if (state.hintTarget === null || state.status !== 'playing') return [];
  const word = puzzle.words.find((w) => w.word === state.hintTarget);
  return word ? word.path.slice(0, state.hintRevealed) : [];
}
