import { toLetters, variantsOf, type Letter } from './alphabet';
import { BoardGraph, bridgeKey, type TileIndex } from './board';
import { unfoundWords, type GameState, type Visibility } from './game';
import type { Puzzle } from './puzzle';

/**
 * Keyboard play (spec §4): the player types and the game keeps every visible path that spells
 * the typed prefix. `steps` holds the candidate paths after each accepted letter, so Backspace
 * can undo exactly one letter even when a diacritic fallback was used.
 */
export interface TypingSearch {
  steps: TileIndex[][][];
}

export function emptySearch(): TypingSearch {
  return { steps: [] };
}

export function candidates(search: TypingSearch): TileIndex[][] {
  return search.steps.at(-1) ?? [];
}

function extend(
  puzzle: Puzzle,
  graph: BoardGraph,
  visible: Visibility,
  paths: TileIndex[][],
  letter: Letter,
): TileIndex[][] {
  if (paths.length === 0) {
    return [...visible.tiles].filter((tile) => puzzle.letters[tile] === letter).map((t) => [t]);
  }
  const next: TileIndex[][] = [];
  for (const path of paths) {
    const last = path.at(-1)!;
    for (const tile of graph.neighbours(last)) {
      if (puzzle.letters[tile] !== letter || path.includes(tile) || !visible.tiles.has(tile))
        continue;
      if (visible.bridges.has(bridgeKey(last, tile))) next.push([...path, tile]);
    }
  }
  return next;
}

/**
 * Adds one typed character. Exact letters win; only if no candidate continues with the exact
 * letter are its diacritic variants tried (typed S finds Š). A character that extends nothing is
 * ignored, so typing R-O-D-V where V doesn't follow D leaves ROD selected.
 */
export function typeLetter(
  puzzle: Puzzle,
  visible: Visibility,
  search: TypingSearch,
  typed: string,
): TypingSearch {
  const letters = toLetters(typed);
  if (letters === null || letters.length !== 1) return search;
  const letter = letters[0]!;
  const graph = new BoardGraph(puzzle.size, puzzle.bridges);
  const current = candidates(search);

  let next = extend(puzzle, graph, visible, current, letter);
  if (next.length === 0) {
    next = variantsOf(letter).flatMap((variant) =>
      extend(puzzle, graph, visible, current, variant),
    );
  }
  return next.length === 0 ? search : { steps: [...search.steps, next] };
}

export function backspace(search: TypingSearch): TypingSearch {
  return { steps: search.steps.slice(0, -1) };
}

/**
 * The candidate to highlight: one that follows an unfound required word's canonical path if any,
 * then one that spells the start of an unfound required word, else the first found.
 */
export function highlighted(
  puzzle: Puzzle,
  state: GameState,
  search: TypingSearch,
): TileIndex[] | null {
  const paths = candidates(search);
  if (paths.length === 0) return null;
  const unfound = unfoundWords(puzzle, state);
  const onCanonical = paths.find((path) =>
    unfound.some((w) => path.every((tile, i) => w.path[i] === tile)),
  );
  if (onCanonical) return onCanonical;
  const spellsPrefix = paths.find((path) => {
    const prefix = path.map((tile) => puzzle.letters[tile]).join('');
    return unfound.some((w) => w.word.startsWith(prefix));
  });
  return spellsPrefix ?? paths[0]!;
}
