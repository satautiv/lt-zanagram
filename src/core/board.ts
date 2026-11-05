/** Tiles are indexed row-major: index = row × size + col (spec §3). */
export type TileIndex = number;

/** A bridge joins two tile indices, stored as [a, b] with a < b. */
export type Bridge = readonly [TileIndex, TileIndex];

export function rowOf(size: number, tile: TileIndex): number {
  return Math.floor(tile / size);
}

export function colOf(size: number, tile: TileIndex): number {
  return tile % size;
}

export function tileAt(size: number, row: number, col: number): TileIndex {
  return row * size + col;
}

export function isOnBoard(size: number, tile: TileIndex): boolean {
  return Number.isInteger(tile) && tile >= 0 && tile < size * size;
}

/** True if two tiles touch horizontally, vertically or diagonally. */
export function areNeighbours(size: number, a: TileIndex, b: TileIndex): boolean {
  if (a === b || !isOnBoard(size, a) || !isOnBoard(size, b)) return false;
  return (
    Math.abs(rowOf(size, a) - rowOf(size, b)) <= 1 && Math.abs(colOf(size, a) - colOf(size, b)) <= 1
  );
}

/** Order-independent key for the bridge between two tiles. */
export function bridgeKey(a: TileIndex, b: TileIndex): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function normaliseBridge(a: TileIndex, b: TileIndex): Bridge {
  return a < b ? [a, b] : [b, a];
}

/** The bridges a path crosses, one per consecutive pair of tiles. */
export function pathBridges(path: readonly TileIndex[]): Bridge[] {
  const bridges: Bridge[] = [];
  for (let i = 1; i < path.length; i++) bridges.push(normaliseBridge(path[i - 1]!, path[i]!));
  return bridges;
}

/** Adjacency over a board's bridges. */
export class BoardGraph {
  readonly size: number;
  private readonly keys: Set<string>;
  private readonly adjacency: TileIndex[][];

  constructor(size: number, bridges: readonly Bridge[]) {
    this.size = size;
    this.keys = new Set();
    this.adjacency = Array.from({ length: size * size }, () => []);
    for (const [a, b] of bridges) {
      if (!isOnBoard(size, a) || !isOnBoard(size, b)) continue;
      const key = bridgeKey(a, b);
      if (this.keys.has(key)) continue;
      this.keys.add(key);
      this.adjacency[a]!.push(b);
      this.adjacency[b]!.push(a);
    }
  }

  hasBridge(a: TileIndex, b: TileIndex): boolean {
    return this.keys.has(bridgeKey(a, b));
  }

  neighbours(tile: TileIndex): readonly TileIndex[] {
    return this.adjacency[tile] ?? [];
  }
}
