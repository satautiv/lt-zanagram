import { colOf, rowOf, tileAt, type TileIndex } from './board';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Row and column as the player sees them (0-based), after `turns` quarter turns clockwise. */
export interface ShownPosition {
  row: number;
  col: number;
}

const quarter = (turns: number) => ((turns % 4) + 4) % 4;

/** Where a tile shows on a board turned `turns` quarter turns clockwise (spec §5 Rotate). */
export function shownPosition(size: number, tile: TileIndex, turns: number): ShownPosition {
  let row = rowOf(size, tile);
  let col = colOf(size, tile);
  for (let i = 0; i < quarter(turns); i++) [row, col] = [col, size - 1 - row];
  return { row, col };
}

/** The tile shown at a row and column of a board turned `turns` quarter turns clockwise. */
export function tileShownAt(size: number, row: number, col: number, turns: number): TileIndex {
  for (let i = 0; i < quarter(turns); i++) [row, col] = [size - 1 - col, row];
  return tileAt(size, row, col);
}

const STEPS: Record<Direction, readonly [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/**
 * Arrow-key focus (spec §10 Accessibility): the nearest visible tile from `from` in a direction as
 * the player sees the board, skipping tiles already gone; null at the edge.
 */
export function stepFocus(
  size: number,
  from: TileIndex,
  direction: Direction,
  turns: number,
  visible: ReadonlySet<TileIndex>,
): TileIndex | null {
  const [dRow, dCol] = STEPS[direction];
  let { row, col } = shownPosition(size, from, turns);
  for (;;) {
    row += dRow;
    col += dCol;
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    const tile = tileShownAt(size, row, col, turns);
    if (visible.has(tile)) return tile;
  }
}
