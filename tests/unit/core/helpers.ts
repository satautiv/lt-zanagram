import {
  normaliseBridge,
  pathBridges,
  type Bridge,
  type Puzzle,
  bridgeKey,
} from '../../../src/core';

/**
 * Builds a test puzzle from a row-major letter string and [word, path] pairs. Bridges default to
 * exactly those the paths cross, so the result is valid unless a test breaks it on purpose.
 */
export function puzzleFrom(
  size: number,
  letters: string,
  words: [string, number[]][],
  overrides: Partial<Puzzle> = {},
): Puzzle {
  const bridges = new Map<string, Bridge>();
  for (const [, path] of words) {
    for (const [a, b] of pathBridges(path)) bridges.set(bridgeKey(a, b), normaliseBridge(a, b));
  }
  return {
    id: '2026-11-05',
    size,
    letters: [...letters],
    bridges: [...bridges.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]),
    words: words.map(([word, path]) => ({ word, path, definition: '' })),
    extras: [],
    difficulty: 1,
    author: 'test',
    version: 1,
    ...overrides,
  };
}
