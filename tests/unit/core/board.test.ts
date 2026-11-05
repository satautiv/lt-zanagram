import { describe, expect, it } from 'vitest';
import { areNeighbours, BoardGraph, colOf, pathBridges, rowOf, tileAt } from '../../../src/core';

describe('board geometry', () => {
  it('indexes tiles row-major for any size', () => {
    expect(tileAt(4, 2, 3)).toBe(11);
    expect([rowOf(4, 11), colOf(4, 11)]).toEqual([2, 3]);
    expect(tileAt(5, 4, 4)).toBe(24);
  });

  it('treats the 8 surrounding tiles as neighbours, without wrapping', () => {
    expect(areNeighbours(4, 5, 0)).toBe(true); // diagonal
    expect(areNeighbours(4, 5, 10)).toBe(true);
    expect(areNeighbours(4, 3, 4)).toBe(false); // end of row 0 → start of row 1
    expect(areNeighbours(4, 0, 2)).toBe(false);
    expect(areNeighbours(4, 5, 5)).toBe(false);
    expect(areNeighbours(4, 15, 16)).toBe(false); // off board
  });

  it('lists the bridges a path crosses, normalised', () => {
    expect(pathBridges([5, 1, 2])).toEqual([
      [1, 5],
      [1, 2],
    ]);
  });

  it('answers bridge and neighbour queries', () => {
    const graph = new BoardGraph(4, [
      [0, 1],
      [1, 5],
      [1, 5],
    ]);
    expect(graph.hasBridge(5, 1)).toBe(true);
    expect(graph.hasBridge(0, 5)).toBe(false);
    expect(graph.neighbours(1)).toEqual([0, 5]);
    expect(graph.neighbours(15)).toEqual([]);
  });
});
