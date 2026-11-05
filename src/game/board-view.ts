import { bridgeKey, colOf, pathBridges, rowOf, type Puzzle, type TileIndex } from '../core';

const SVG = 'http://www.w3.org/2000/svg';

/** Board geometry in SVG units (spec §5: ~72 px tiles, ~20 px gaps, ~14 px bridges). */
export const TILE = 72;
export const GAP = 20;
export const BRIDGE_WIDTH = 14;
/** Room around the outer tiles for the selection ring. */
const PAD = 8;

export interface BoardViewState {
  visibleTiles: ReadonlySet<TileIndex>;
  /** Keys from `bridgeKey`. */
  visibleBridges: ReadonlySet<string>;
  /** The path being built, in order. */
  selected: readonly TileIndex[];
  /** Tiles revealed by hints. */
  hinted: readonly TileIndex[];
}

export interface Point {
  x: number;
  y: number;
}

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/**
 * The board as one SVG (spec §5): bridges as thick rounded lines drawn under the tiles, tiles as
 * circles with their letter. It only draws; game logic and input live elsewhere.
 */
export class BoardView {
  readonly svg: SVGSVGElement;
  readonly size: number;
  private readonly tiles: SVGGElement[] = [];
  private readonly bridges = new Map<string, SVGLineElement>();

  constructor(puzzle: Puzzle) {
    this.size = puzzle.size;
    const extent = this.extent();
    this.svg = el('svg', {
      class: 'board',
      viewBox: `0 0 ${extent} ${extent}`,
      role: 'group',
      'aria-label': 'Žaidimo lenta',
    });

    const bridgeLayer = el('g', { class: 'bridges' });
    for (const [a, b] of puzzle.bridges) {
      const from = this.center(a);
      const to = this.center(b);
      const line = el('line', {
        class: 'bridge',
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        'stroke-width': BRIDGE_WIDTH,
      });
      this.bridges.set(bridgeKey(a, b), line);
      bridgeLayer.append(line);
    }

    const tileLayer = el('g', { class: 'tiles' });
    puzzle.letters.forEach((letter, tile) => {
      const { x, y } = this.center(tile);
      const outer = el('g', { transform: `translate(${x} ${y})`, 'data-tile': tile });
      const inner = el('g', { class: 'tile' });
      inner.append(el('circle', { class: 'tile-ring', r: TILE / 2 + 4 }));
      inner.append(el('circle', { class: 'tile-face', r: TILE / 2 }));
      const text = el('text', { class: 'tile-letter', 'text-anchor': 'middle', dy: '0.35em' });
      text.textContent = letter;
      inner.append(text);
      outer.append(inner);
      this.tiles.push(inner);
      tileLayer.append(outer);
    });

    this.svg.append(bridgeLayer, tileLayer);
  }

  /** Width and height of the board in SVG units. */
  extent(): number {
    return 2 * PAD + this.size * TILE + (this.size - 1) * GAP;
  }

  /** Centre of a tile in SVG units. */
  center(tile: TileIndex): Point {
    const pitch = TILE + GAP;
    return {
      x: PAD + TILE / 2 + colOf(this.size, tile) * pitch,
      y: PAD + TILE / 2 + rowOf(this.size, tile) * pitch,
    };
  }

  update(state: BoardViewState): void {
    const selected = new Set(state.selected);
    const hinted = new Set(state.hinted);
    this.tiles.forEach((tile, index) => {
      tile.classList.toggle('is-gone', !state.visibleTiles.has(index));
      tile.classList.toggle('is-selected', selected.has(index));
      tile.classList.toggle('is-hinted', hinted.has(index) && !selected.has(index));
    });
    const selectedBridges = new Set(pathBridges(state.selected).map(([a, b]) => bridgeKey(a, b)));
    for (const [key, line] of this.bridges) {
      line.classList.toggle('is-gone', !state.visibleBridges.has(key));
      line.classList.toggle('is-selected', selectedBridges.has(key));
    }
  }
}
