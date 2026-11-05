import { BoardGraph, type Bridge, type TileIndex } from './board';
import { MIN_WORD_LENGTH } from './puzzle';

/** A word list that can answer "is this a word?" and "does any word start with this?". */
export interface Lexicon {
  has(word: string): boolean;
  hasPrefix(prefix: string): boolean;
}

/**
 * A lexicon over a sorted array: membership by a Set, prefixes by binary search. It prunes path
 * search exactly like a prefix trie but needs a fraction of the memory for a ~500k-form `valid.txt`.
 */
export class WordList implements Lexicon {
  private readonly sorted: string[];
  private readonly set: ReadonlySet<string>;

  constructor(words: Iterable<string>) {
    this.set = new Set(words);
    this.sorted = [...this.set].sort();
  }

  get size(): number {
    return this.sorted.length;
  }

  has(word: string): boolean {
    return this.set.has(word);
  }

  hasPrefix(prefix: string): boolean {
    let lo = 0;
    let hi = this.sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sorted[mid]! < prefix) lo = mid + 1;
      else hi = mid;
    }
    return lo < this.sorted.length && this.sorted[lo]!.startsWith(prefix);
  }
}

export interface BoardLayout {
  size: number;
  letters: readonly string[];
  bridges: readonly Bridge[];
}

export interface FindOptions {
  minLength?: number;
  maxLength?: number;
}

/**
 * Every word from the lexicon traceable on the board, with all the paths that trace it. Walks
 * every simple path over declared bridges and stops as soon as a prefix starts no word.
 */
export function findWords(
  board: BoardLayout,
  lexicon: Lexicon,
  { minLength = MIN_WORD_LENGTH, maxLength = board.size * board.size }: FindOptions = {},
): Map<string, TileIndex[][]> {
  const graph = new BoardGraph(board.size, board.bridges);
  const found = new Map<string, TileIndex[][]>();
  const path: TileIndex[] = [];
  const used = new Set<TileIndex>();

  const walk = (tile: TileIndex, prefix: string) => {
    const word = prefix + board.letters[tile];
    if (!lexicon.hasPrefix(word)) return;
    path.push(tile);
    used.add(tile);
    if (path.length >= minLength && lexicon.has(word)) {
      const paths = found.get(word) ?? [];
      paths.push([...path]);
      found.set(word, paths);
    }
    if (path.length < maxLength) {
      for (const next of graph.neighbours(tile)) if (!used.has(next)) walk(next, word);
    }
    path.pop();
    used.delete(tile);
  };

  for (let tile = 0; tile < board.size * board.size; tile++) walk(tile, '');
  return found;
}
