// The puzzle generator (spec §8): proposes boards from the word lists, deterministically for a
// seed. DOM-free and Node-free, so the CLI and the editor's Generate button share it.
import { toLetters } from './alphabet';
import { areNeighbours, bridgeKey, normaliseBridge, pathBridges, type TileIndex } from './board';
import { difficulty, letterRarity } from './difficulty';
import { validatePuzzle, type Puzzle, type PuzzleWord } from './puzzle';
import { shuffled, weightedPick, type Random } from './random';
import { findWords, WordList, type Lexicon } from './words';

/** Board-shape targets (spec §8 step 3). */
export const GENERATOR_LIMITS = {
  anchorLength: { min: 9, max: 12 },
  wordLength: { min: 4, max: 9 },
  words: { min: 10, max: 16 },
  bridges: { min: 18, max: 26 },
  /** Required-list words traceable on the board but not required ("players would feel cheated"). */
  maxUnchosen: 5,
  /** At least one required word this long. */
  longWord: 8,
} as const;

export interface GeneratorLists {
  /** `required.txt`: upper case. */
  required: readonly string[];
  /** `valid.txt`, for the extras. */
  valid: Lexicon;
  /** Every form of every blocked word; none may be traceable. */
  blocked: Lexicon;
}

export interface GenerateOptions {
  id: string;
  random: Random;
  /** Words to keep off this board, e.g. ones used on recent days. */
  avoid?: ReadonlySet<string>;
  size?: number;
  /** Fresh boards to try before giving up. */
  attempts?: number;
  author?: string;
}

export interface GeneratedPuzzle {
  puzzle: Puzzle;
  /** Required-list words traceable but not required. */
  unchosen: string[];
  /** Boards started before this one passed every check. */
  attempts: number;
}

interface Placed {
  word: string;
  path: TileIndex[];
}

interface BoardState {
  letters: (string | null)[];
  bridges: Set<string>;
}

/** How many search steps one placement search may take: keeps every step quick. */
const SEARCH_BUDGET = 40_000;
/** Words taken back when no word fits, before starting over. */
const BACKTRACKS = 4;

/** Placement scoring weights (spec §8 step 2). */
const SCORE = { shared: 3, filled: 2, reusedBridge: 2, newBridge: -3, length: 0.3, noise: 1.5 };

const wordLength = (word: string) => [...word].length;

/**
 * Generates puzzles from one set of word lists. Build it once: preparing the lists takes a moment,
 * each `generate` call is then quick.
 */
export class PuzzleGenerator {
  private readonly anchors: string[];
  private readonly candidates: WordList;
  private readonly requiredLexicon: WordList;
  private readonly requiredSet: ReadonlySet<string>;

  constructor(private readonly lists: GeneratorLists) {
    const words = lists.required.filter((w) => toLetters(w) !== null);
    const { anchorLength, wordLength: length } = GENERATOR_LIMITS;
    this.anchors = words.filter((w) => {
      const n = wordLength(w);
      return n >= anchorLength.min && n <= anchorLength.max;
    });
    this.candidates = new WordList(
      words.filter((w) => wordLength(w) >= length.min && wordLength(w) <= length.max),
    );
    this.requiredLexicon = new WordList(words);
    this.requiredSet = new Set(words);
  }

  generate(options: GenerateOptions): GeneratedPuzzle | null {
    const { random, size = 4, attempts = 200 } = options;
    const avoid = options.avoid ?? new Set<string>();
    const neighbours = kingNeighbours(size);
    const anchors = this.anchors.filter((w) => !avoid.has(w));

    for (let attempt = 1; attempt <= attempts; attempt++) {
      // Rarer letters make a more interesting anchor (spec §8 step 1).
      const anchor = weightedPick(random, anchors, (w) => 1 + rarityOf(w));
      const path = placeAnchor(anchor, size, neighbours, random);
      if (!path) continue;
      const placed: Placed[] = [{ word: anchor, path }];
      const result = this.grow(placed, size, neighbours, random, avoid, options, attempt);
      if (result) return result;
    }
    return null;
  }

  /** Adds words until the board is full and well-sized, then runs the post-checks. */
  private grow(
    placed: Placed[],
    size: number,
    neighbours: readonly TileIndex[][],
    random: Random,
    avoid: ReadonlySet<string>,
    options: GenerateOptions,
    attempt: number,
  ): GeneratedPuzzle | null {
    const { words, bridges } = GENERATOR_LIMITS;
    let backtracks = 0;
    for (;;) {
      const state = boardState(placed, size);
      const filled = state.letters.every((l) => l !== null);
      if (filled && placed.length >= words.min && state.bridges.size >= bridges.min) {
        return this.finish(placed, state, size, options, attempt);
      }
      if (placed.length >= words.max) return null;
      const used = new Set([...placed.map((p) => p.word), ...avoid]);
      const best = this.bestPlacement(state, placed.length, neighbours, random, used);
      if (best) {
        placed.push(best);
      } else if (backtracks < BACKTRACKS && placed.length > 1) {
        backtracks++;
        placed.pop();
      } else {
        return null;
      }
    }
  }

  /**
   * The best-scoring placement of any candidate word: a king-move path whose tiles are empty or
   * already hold the right letter. Searches from shuffled tiles with a step budget, so each call
   * samples a different part of the word list.
   */
  private bestPlacement(
    state: BoardState,
    wordsPlaced: number,
    neighbours: readonly TileIndex[][],
    random: Random,
    used: ReadonlySet<string>,
  ): Placed | null {
    const { letters, bridges } = state;
    const maxLength = GENERATOR_LIMITS.wordLength.max;
    let best: Placed | null = null;
    let bestScore = -Infinity;
    let steps = 0;
    const path: TileIndex[] = [];

    const consider = (word: string) => {
      if (used.has(word)) return;
      let shared = 0;
      for (const tile of path) if (letters[tile] != null) shared++;
      if (shared === 0 && wordsPlaced > 0) return; // every word joins the board
      let reused = 0;
      let added = 0;
      for (const [a, b] of pathBridges(path)) {
        if (bridges.has(bridgeKey(a, b))) reused++;
        else added++;
      }
      if (bridges.size + added > GENERATOR_LIMITS.bridges.max) return;
      const score =
        SCORE.shared * shared +
        SCORE.filled * (path.length - shared) +
        SCORE.reusedBridge * reused +
        SCORE.newBridge * added +
        SCORE.length * path.length +
        SCORE.noise * random();
      if (score > bestScore) {
        bestScore = score;
        best = { word, path: [...path] };
      }
    };

    const walk = (tile: TileIndex, prefix: string) => {
      const fixed = letters[tile] ?? null;
      for (const letter of fixed !== null ? [fixed] : LETTER_ORDER) {
        if (++steps > SEARCH_BUDGET) return;
        const word = prefix + letter;
        if (!this.candidates.hasPrefix(word)) continue;
        path.push(tile);
        if (path.length >= GENERATOR_LIMITS.wordLength.min && this.candidates.has(word)) {
          consider(word);
        }
        if (path.length < maxLength) {
          for (const next of shuffled(random, neighbours[tile]!)) {
            if (!path.includes(next)) walk(next, word);
          }
        }
        path.pop();
      }
    };

    for (const start of shuffled(random, range(letters.length))) {
      if (steps > SEARCH_BUDGET) break;
      walk(start, '');
    }
    return best;
  }

  /**
   * Post-checks (spec §8 step 4) on a full board. Required-list words that already trace on the
   * board's bridges become required too (up to the word limit), so fewer are left unchosen.
   */
  private finish(
    placed: Placed[],
    state: BoardState,
    size: number,
    options: GenerateOptions,
    attempt: number,
  ): GeneratedPuzzle | null {
    const board = {
      size,
      letters: state.letters as string[],
      bridges: [...state.bridges].map(parseBridge).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    };
    if (findWords(board, this.lists.blocked).size > 0) return null;

    const words = [...placed];
    const traceable = findWords(board, this.requiredLexicon);
    const free = [...traceable.keys()]
      .filter((w) => !words.some((p) => p.word === w))
      .sort((a, b) => wordLength(b) - wordLength(a) || (a < b ? -1 : 1));
    for (const word of free) {
      if (words.length >= GENERATOR_LIMITS.words.max) break;
      words.push({ word, path: traceable.get(word)![0]! });
    }
    const required = new Set(words.map((w) => w.word));
    const unchosen = free.filter((w) => !required.has(w));
    if (unchosen.length > GENERATOR_LIMITS.maxUnchosen) return null;
    if (!words.some((w) => wordLength(w.word) >= GENERATOR_LIMITS.longWord)) return null;

    const extras = [...findWords(board, this.lists.valid).keys()]
      .filter((w) => !required.has(w))
      .sort();
    const puzzle: Puzzle = {
      id: options.id,
      size,
      letters: board.letters,
      bridges: board.bridges,
      words: words.map((w): PuzzleWord => ({ word: w.word, path: w.path, definition: '' })),
      extras,
      difficulty: 1,
      author: options.author ?? 'generator',
      version: 1,
    };
    puzzle.difficulty = difficulty(puzzle);
    if (!validatePuzzle(puzzle, { requiredWords: this.requiredSet }).ok) return null;
    return { puzzle, unchosen, attempts: attempt };
  }
}

/** Letters tried on an empty tile, commonest first so the search finds words sooner. */
const LETTER_ORDER = 'AISTNRKEULOPMGDĖVYŠBJCŪZŽFHČĄĮŲĘ'.split('');

function rarityOf(word: string): number {
  return [...word].reduce((sum, l) => sum + letterRarity(l), 0) / wordLength(word);
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function kingNeighbours(size: number): TileIndex[][] {
  return range(size * size).map((tile) =>
    range(size * size).filter((other) => areNeighbours(size, tile, other)),
  );
}

function parseBridge(key: string): [TileIndex, TileIndex] {
  const [a, b] = key.split('-').map(Number);
  return normaliseBridge(a!, b!) as [TileIndex, TileIndex];
}

/** Letters and bridges of the words placed so far. */
function boardState(placed: readonly Placed[], size: number): BoardState {
  const letters: (string | null)[] = Array.from({ length: size * size }, () => null);
  const bridges = new Set<string>();
  for (const { word, path } of placed) {
    const chars = [...word];
    path.forEach((tile, i) => (letters[tile] = chars[i]!));
    for (const [a, b] of pathBridges(path)) bridges.add(bridgeKey(a, b));
  }
  return { letters, bridges };
}

/** A random self-avoiding king-move path for the anchor (randomised DFS with backtracking). */
function placeAnchor(
  word: string,
  size: number,
  neighbours: readonly TileIndex[][],
  random: Random,
): TileIndex[] | null {
  const length = wordLength(word);
  const path: TileIndex[] = [];
  let steps = 0;
  const walk = (tile: TileIndex): boolean => {
    if (++steps > 10_000) return false;
    path.push(tile);
    if (path.length === length) return true;
    for (const next of shuffled(random, neighbours[tile]!)) {
      if (!path.includes(next) && walk(next)) return true;
    }
    path.pop();
    return false;
  };
  return walk(Math.floor(random() * size * size)) ? path : null;
}
