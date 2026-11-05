import { isLetter, toLetters } from './alphabet';
import {
  areNeighbours,
  bridgeKey,
  isOnBoard,
  pathBridges,
  type Bridge,
  type TileIndex,
} from './board';

export const MIN_WORD_LENGTH = 4;

export interface PuzzleWord {
  /** Uppercase, NFC. */
  word: string;
  /** The canonical path: the tiles this word holds on the board. */
  path: TileIndex[];
  /** Short original Lithuanian definition, under 80 characters. */
  definition: string;
}

/** One day's complete content (spec §3). Tiles are row-major, `size` × `size`. */
export interface Puzzle {
  /** The puzzle's date, YYYY-MM-DD. */
  id: string;
  size: number;
  letters: string[];
  bridges: Bridge[];
  /** The required words. */
  words: PuzzleWord[];
  /** Every other valid word traceable on the full board. */
  extras: string[];
  difficulty: number;
  author: string;
  version: number;
}

export type ValidationCode =
  | 'size'
  | 'letterCount'
  | 'invalidLetter'
  | 'bridgeOffBoard'
  | 'bridgeOrder'
  | 'bridgeNotNeighbours'
  | 'bridgeDuplicate'
  | 'wordTooShort'
  | 'wordInvalid'
  | 'wordDuplicate'
  | 'wordNotRequired'
  | 'pathOffBoard'
  | 'pathLength'
  | 'pathSpelling'
  | 'pathRepeatsTile'
  | 'pathMissingBridge'
  | 'orphanTile'
  | 'orphanBridge';

export interface ValidationError {
  code: ValidationCode;
  message: string;
  /** The word, tile or bridge the error is about, when there is one. */
  word?: string;
  tile?: TileIndex;
  bridge?: Bridge;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface ValidateOptions {
  /** The required-word list (`required.txt`); when given, every required word must be in it. */
  requiredWords?: ReadonlySet<string>;
}

/**
 * Checks every rule in spec §3. Shared by the tests, the generator and the editor so validation is
 * identical everywhere. Collects all errors rather than stopping at the first.
 */
export function validatePuzzle(puzzle: Puzzle, options: ValidateOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  const { size, letters, bridges, words } = puzzle;

  if (!Number.isInteger(size) || size < 2) {
    errors.push({ code: 'size', message: `Board size must be an integer ≥ 2, got ${size}` });
    return { ok: false, errors };
  }

  const tileCount = size * size;
  if (letters.length !== tileCount) {
    errors.push({
      code: 'letterCount',
      message: `Expected ${tileCount} letters for a ${size}×${size} board, got ${letters.length}`,
    });
  }
  letters.forEach((letter, tile) => {
    if (!isLetter(letter)) {
      errors.push({
        code: 'invalidLetter',
        message: `Tile ${tile} holds "${letter}", which is not a Lithuanian letter`,
        tile,
      });
    }
  });

  const declared = new Set<string>();
  for (const bridge of bridges) {
    const [a, b] = bridge;
    if (!isOnBoard(size, a) || !isOnBoard(size, b)) {
      errors.push({ code: 'bridgeOffBoard', message: `Bridge ${a}–${b} is off the board`, bridge });
      continue;
    }
    if (a >= b) {
      errors.push({
        code: 'bridgeOrder',
        message: `Bridge ${a}–${b} must be stored as [a, b] with a < b`,
        bridge,
      });
    }
    if (!areNeighbours(size, a, b)) {
      errors.push({
        code: 'bridgeNotNeighbours',
        message: `Bridge ${a}–${b} joins tiles that don't touch`,
        bridge,
      });
    }
    const key = bridgeKey(a, b);
    if (declared.has(key)) {
      errors.push({
        code: 'bridgeDuplicate',
        message: `Bridge ${a}–${b} is declared twice`,
        bridge,
      });
    }
    declared.add(key);
  }

  const usedTiles = new Set<TileIndex>();
  const usedBridges = new Set<string>();
  const seenWords = new Set<string>();

  for (const { word, path } of words) {
    const wordLetters = toLetters(word);
    if (wordLetters === null || word !== wordLetters.join('')) {
      errors.push({
        code: 'wordInvalid',
        message: `"${word}" must be uppercase Lithuanian letters only`,
        word,
      });
    }
    const length = wordLetters?.length ?? [...word].length;
    if (length < MIN_WORD_LENGTH) {
      errors.push({
        code: 'wordTooShort',
        message: `"${word}" is shorter than ${MIN_WORD_LENGTH} letters`,
        word,
      });
    }
    if (seenWords.has(word)) {
      errors.push({ code: 'wordDuplicate', message: `"${word}" is listed twice`, word });
    }
    seenWords.add(word);
    if (options.requiredWords && !options.requiredWords.has(word)) {
      errors.push({
        code: 'wordNotRequired',
        message: `"${word}" is not in the required-word list`,
        word,
      });
    }

    const offBoard = path.filter((tile) => !isOnBoard(size, tile));
    if (offBoard.length > 0) {
      errors.push({
        code: 'pathOffBoard',
        message: `"${word}" path uses tiles off the board: ${offBoard.join(', ')}`,
        word,
      });
      continue;
    }
    path.forEach((tile) => usedTiles.add(tile));
    pathBridges(path).forEach(([a, b]) => usedBridges.add(bridgeKey(a, b)));

    if (wordLetters && path.length !== wordLetters.length) {
      errors.push({
        code: 'pathLength',
        message: `"${word}" has ${wordLetters.length} letters but its path has ${path.length} tiles`,
        word,
      });
    } else if (wordLetters && path.some((tile, i) => letters[tile] !== wordLetters[i])) {
      const spelled = path.map((tile) => letters[tile] ?? '?').join('');
      errors.push({ code: 'pathSpelling', message: `"${word}" path spells "${spelled}"`, word });
    }
    if (new Set(path).size !== path.length) {
      errors.push({ code: 'pathRepeatsTile', message: `"${word}" path uses a tile twice`, word });
    }
    for (const [a, b] of pathBridges(path)) {
      if (!declared.has(bridgeKey(a, b))) {
        errors.push({
          code: 'pathMissingBridge',
          message: `"${word}" path steps ${a}→${b} without a declared bridge`,
          word,
          bridge: [a, b],
        });
      }
    }
  }

  for (let tile = 0; tile < tileCount; tile++) {
    if (!usedTiles.has(tile)) {
      errors.push({
        code: 'orphanTile',
        message: `Tile ${tile} is not on any required word's path`,
        tile,
      });
    }
  }
  for (const bridge of bridges) {
    const [a, b] = bridge;
    if (isOnBoard(size, a) && isOnBoard(size, b) && !usedBridges.has(bridgeKey(a, b))) {
      errors.push({
        code: 'orphanBridge',
        message: `Bridge ${a}–${b} is not on any required word's path`,
        bridge,
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
