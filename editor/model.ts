// The authoring tool's board model (spec §8 Authoring tool): pure functions over plain data, so
// the page only renders and the rules are unit-tested.
import {
  bridgeKey,
  difficulty,
  findWords,
  normaliseBridge,
  validatePuzzle,
  type Bridge,
  type Lexicon,
  type Puzzle,
  type TileIndex,
  type ValidationError,
} from '../src/core';

export interface RequiredEntry {
  /** The canonical path. */
  path: TileIndex[];
  definition: string;
}

export interface Draft {
  id: string;
  author: string;
  size: number;
  /** One letter per tile; '' for a tile not filled in yet. */
  letters: string[];
  /** Keys from `bridgeKey`. */
  bridges: ReadonlySet<string>;
  /** Required words, in the order they were ticked. */
  required: ReadonlyMap<string, RequiredEntry>;
}

export interface Analysis {
  /** Every word traceable on the board, with every path, longest words first. */
  traceable: Map<string, TileIndex[][]>;
  puzzle: Puzzle;
  errors: ValidationError[];
  orphanTiles: Set<TileIndex>;
  orphanBridges: Set<string>;
  /** Required words outside the required-word list. */
  notInList: string[];
  /** Blocked forms traceable anywhere on the board. */
  blocked: string[];
}

export function emptyDraft(id: string, size = 4): Draft {
  return {
    id,
    author: '',
    size,
    letters: Array.from({ length: size * size }, () => ''),
    bridges: new Set(),
    required: new Map(),
  };
}

export function fromPuzzle(puzzle: Puzzle): Draft {
  return {
    id: puzzle.id,
    author: puzzle.author,
    size: puzzle.size,
    letters: [...puzzle.letters],
    bridges: new Set(puzzle.bridges.map(([a, b]) => bridgeKey(a, b))),
    required: new Map(
      puzzle.words.map((w) => [w.word, { path: [...w.path], definition: w.definition }]),
    ),
  };
}

export function setLetter(draft: Draft, tile: TileIndex, letter: string): Draft {
  const letters = [...draft.letters];
  letters[tile] = letter;
  return { ...draft, letters };
}

export function toggleBridge(draft: Draft, a: TileIndex, b: TileIndex): Draft {
  const bridges = new Set(draft.bridges);
  const key = bridgeKey(a, b);
  if (bridges.has(key)) bridges.delete(key);
  else bridges.add(key);
  return { ...draft, bridges };
}

/** Ticks or unticks a word as required; a newly ticked word takes its first path. */
export function toggleRequired(draft: Draft, word: string, paths: readonly TileIndex[][]): Draft {
  const required = new Map(draft.required);
  if (required.has(word)) required.delete(word);
  else if (paths[0]) required.set(word, { path: [...paths[0]], definition: '' });
  return { ...draft, required };
}

export function setCanonicalPath(draft: Draft, word: string, path: readonly TileIndex[]): Draft {
  const entry = draft.required.get(word);
  if (!entry) return draft;
  return { ...draft, required: new Map(draft.required).set(word, { ...entry, path: [...path] }) };
}

export function setDefinition(draft: Draft, word: string, definition: string): Draft {
  const entry = draft.required.get(word);
  if (!entry) return draft;
  return { ...draft, required: new Map(draft.required).set(word, { ...entry, definition }) };
}

const samePath = (a: readonly TileIndex[], b: readonly TileIndex[]) =>
  a.length === b.length && a.every((tile, i) => tile === b[i]);

/**
 * After an edit, a required word whose canonical path no longer traces moves to another path that
 * does; a word that no longer traces anywhere keeps its path, and validation reports it.
 */
export function repath(draft: Draft, traceable: ReadonlyMap<string, TileIndex[][]>): Draft {
  let changed = false;
  const required = new Map(draft.required);
  for (const [word, entry] of draft.required) {
    const paths = traceable.get(word);
    if (!paths || paths.some((p) => samePath(p, entry.path))) continue;
    required.set(word, { ...entry, path: [...paths[0]!] });
    changed = true;
  }
  return changed ? { ...draft, required } : draft;
}

function bridgeList(bridges: ReadonlySet<string>): Bridge[] {
  return [...bridges]
    .map((key) => key.split('-').map(Number) as [number, number])
    .map(([a, b]) => normaliseBridge(a, b))
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

export interface Lists {
  /** `valid.txt` (or `required.txt` when it hasn't been built). */
  valid: Lexicon;
  /** `required.txt`, when loaded. */
  requiredWords?: ReadonlySet<string>;
  /** `blocked-forms.txt`, when built. */
  blocked?: Lexicon;
}

/** Everything the panels show, recomputed after each edit. */
export function analyse(draft: Draft, lists: Lists): Analysis {
  const bridges = bridgeList(draft.bridges);
  // Paths only cross bridges between filled tiles.
  const filledBridges = bridges.filter(([a, b]) => draft.letters[a] && draft.letters[b]);
  const board = { size: draft.size, letters: draft.letters, bridges: filledBridges };
  const traceable = new Map(
    [...findWords(board, lists.valid)].sort(
      ([a], [b]) => [...b].length - [...a].length || a.localeCompare(b, 'lt'),
    ),
  );
  const words = [...draft.required].map(([word, { path, definition }]) => ({
    word,
    path,
    definition,
  }));
  const puzzle: Puzzle = {
    id: draft.id,
    size: draft.size,
    letters: draft.letters,
    bridges,
    words,
    extras: [...traceable.keys()].filter((w) => !draft.required.has(w)).sort(),
    difficulty: 1,
    author: draft.author,
    version: 1,
  };
  puzzle.difficulty = words.length > 0 ? difficulty(puzzle) : 1;
  const { errors } = validatePuzzle(puzzle);
  const orphanTiles = new Set(errors.filter((e) => e.code === 'orphanTile').map((e) => e.tile!));
  const orphanBridges = new Set(
    errors.filter((e) => e.code === 'orphanBridge').map((e) => bridgeKey(...e.bridge!)),
  );
  const notInList = lists.requiredWords
    ? words.map((w) => w.word).filter((w) => !lists.requiredWords!.has(w))
    : [];
  const blocked = lists.blocked ? [...findWords(board, lists.blocked).keys()].sort() : [];
  return { traceable, puzzle, errors, orphanTiles, orphanBridges, notInList, blocked };
}
