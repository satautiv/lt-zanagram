import { describe, expect, it } from 'vitest';
import { shownPosition, stepFocus, tileShownAt } from '../../../src/core';

const all = new Set(Array.from({ length: 16 }, (_, i) => i));

describe('shown positions on a turned board', () => {
  it('turns clockwise: the top-left tile goes top-right, then bottom-right', () => {
    expect(shownPosition(4, 0, 0)).toEqual({ row: 0, col: 0 });
    expect(shownPosition(4, 0, 1)).toEqual({ row: 0, col: 3 });
    expect(shownPosition(4, 0, 2)).toEqual({ row: 3, col: 3 });
    expect(shownPosition(4, 0, 5)).toEqual({ row: 0, col: 3 }); // turns keep growing
  });

  it('tileShownAt undoes shownPosition', () => {
    for (let turns = 0; turns < 4; turns++) {
      for (const tile of all) {
        const { row, col } = shownPosition(4, tile, turns);
        expect(tileShownAt(4, row, col, turns)).toBe(tile);
      }
    }
  });
});

describe('arrow-key focus', () => {
  it('moves one tile in the arrow direction and stops at the edge', () => {
    expect(stepFocus(4, 5, 'right', 0, all)).toBe(6);
    expect(stepFocus(4, 5, 'up', 0, all)).toBe(1);
    expect(stepFocus(4, 5, 'down', 0, all)).toBe(9);
    expect(stepFocus(4, 5, 'left', 0, all)).toBe(4);
    expect(stepFocus(4, 3, 'right', 0, all)).toBeNull();
  });

  it('skips tiles that are gone', () => {
    const visible = new Set([...all].filter((t) => t !== 6 && t !== 7));
    expect(stepFocus(4, 5, 'right', 0, visible)).toBeNull();
    expect(stepFocus(4, 4, 'right', 0, new Set([4, 7]))).toBe(7);
  });

  it('follows the board as the player sees it after a turn', () => {
    // One turn clockwise: tile 0 shows top-right; what was to its right (tile 1) is now below it.
    expect(stepFocus(4, 0, 'down', 1, all)).toBe(1);
    expect(stepFocus(4, 0, 'right', 1, all)).toBeNull();
    expect(stepFocus(4, 0, 'left', 1, all)).toBe(4);
  });
});
