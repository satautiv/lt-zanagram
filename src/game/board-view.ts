import {
  bridgeKey,
  colOf,
  pathBridges,
  rowOf,
  shownPosition,
  type Puzzle,
  type TileIndex,
} from '../core';
import { t } from '../i18n';

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
  private readonly tileLayer: SVGGElement;
  private readonly bridges = new Map<string, SVGLineElement>();
  private readonly letters: SVGTextElement[] = [];
  private readonly rotor: SVGGElement;
  private readonly letterOf: readonly string[];
  private hinted = new Set<TileIndex>();
  /** Quarter turns shown; keeps growing (see `setRotation`). */
  turns = 0;

  constructor(puzzle: Puzzle) {
    this.size = puzzle.size;
    this.letterOf = [...puzzle.letters];
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
    this.tileLayer = tileLayer;
    puzzle.letters.forEach((letter, tile) => {
      const { x, y } = this.center(tile);
      const outer = el('g', { transform: `translate(${x} ${y})`, 'data-tile': tile });
      // Tiles are focusable buttons (spec §10 Accessibility); one at a time is in the tab order.
      const inner = el('g', {
        class: 'tile',
        role: 'button',
        tabindex: tile === 0 ? 0 : -1,
        'aria-pressed': 'false',
      });
      inner.append(el('circle', { class: 'tile-focus', r: TILE / 2 + 9 }));
      inner.append(el('circle', { class: 'tile-ring', r: TILE / 2 + 4 }));
      inner.append(el('circle', { class: 'tile-face', r: TILE / 2 }));
      const text = el('text', { class: 'tile-letter', 'text-anchor': 'middle', dy: '0.35em' });
      text.textContent = letter;
      inner.append(text);
      outer.append(inner);
      this.tiles.push(inner);
      this.letters.push(text);
      tileLayer.append(outer);
    });

    this.rotor = el('g', { class: 'rotor' });
    this.rotor.append(bridgeLayer, tileLayer);
    this.svg.append(this.rotor);
    this.label();
  }

  /** The tile an element belongs to, if any. */
  tileOf(target: EventTarget | null): TileIndex | null {
    const index = this.tiles.indexOf(target as SVGGElement);
    return index === -1 ? null : index;
  }

  /** Moves keyboard focus to a tile and makes it the one in the tab order. */
  focus(tile: TileIndex): void {
    const node = this.tiles[tile];
    if (!node) return;
    for (const other of this.tiles) if (other !== node) other.setAttribute('tabindex', '-1');
    node.setAttribute('tabindex', '0');
    node.focus();
  }

  private nearestVisible(from: TileIndex, visible: ReadonlySet<TileIndex>): TileIndex {
    let best = -1;
    let bestDistance = Infinity;
    for (const tile of visible) {
      const distance =
        Math.abs(rowOf(this.size, tile) - rowOf(this.size, from)) +
        Math.abs(colOf(this.size, tile) - colOf(this.size, from));
      if (distance < bestDistance) [best, bestDistance] = [tile, distance];
    }
    return best;
  }

  /** "raidė Š, eilutė 2, stulpelis 3", by where the tile shows now; hinted tiles say so. */
  private label(): void {
    this.tiles.forEach((node, tile) => {
      const { row, col } = shownPosition(this.size, tile, this.turns);
      const base = t('tile.label', { letter: this.letterOf[tile]!, row: row + 1, col: col + 1 });
      node.setAttribute(
        'aria-label',
        this.hinted.has(tile) ? `${base}, ${t('tile.hinted')}` : base,
      );
    });
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

  /**
   * The tile under a screen point, if the point is within `radiusRatio` of that tile's radius.
   * Works in the tile layer's own coordinates, so it stays right when the board is scaled or rotated.
   */
  tileAt(clientX: number, clientY: number, radiusRatio: number): TileIndex | null {
    const ctm = this.tileLayer.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const reach = (TILE / 2) * radiusRatio;
    for (let tile = 0; tile < this.tiles.length; tile++) {
      const c = this.center(tile);
      if (Math.hypot(point.x - c.x, point.y - c.y) <= reach) return tile;
    }
    return null;
  }

  /** A short horizontal shake of a rejected path (spec §4). */
  shake(path: readonly TileIndex[]): void {
    for (const tile of path) {
      const node = this.tiles[tile];
      if (!node) continue;
      node.classList.remove('is-shaking');
      // Restart the animation if the same tile shakes twice in a row.
      void node.getBoundingClientRect();
      node.classList.add('is-shaking');
      node.addEventListener('animationend', () => node.classList.remove('is-shaking'), {
        once: true,
      });
    }
  }

  /**
   * Shows the board turned by a number of quarter turns clockwise. Letters counter-rotate so they
   * stay upright; logic indices never change. `turns` may keep growing so each turn animates
   * clockwise.
   */
  setRotation(turns: number): void {
    this.turns = turns;
    this.label();
    this.rotor.style.transform = `rotate(${turns * 90}deg)`;
    for (const letter of this.letters) letter.style.transform = `rotate(${-turns * 90}deg)`;
  }

  update(state: BoardViewState): void {
    const selected = new Set(state.selected);
    const hinted = new Set(state.hinted);
    const focused = this.tileOf(document.activeElement);
    this.tiles.forEach((tile, index) => {
      const gone = !state.visibleTiles.has(index);
      tile.classList.toggle('is-gone', gone);
      tile.classList.toggle('is-selected', selected.has(index));
      tile.classList.toggle('is-hinted', hinted.has(index) && !selected.has(index));
      tile.setAttribute('aria-pressed', String(selected.has(index)));
      if (gone) {
        tile.setAttribute('aria-hidden', 'true');
        tile.setAttribute('tabindex', '-1');
      }
    });
    if (this.hinted.size !== hinted.size) {
      this.hinted = hinted;
      this.label();
    }
    // Keep one visible tile in the tab order; a focused tile that just went hands focus on.
    const visible = state.visibleTiles;
    let inOrder = this.tiles.findIndex((tile) => tile.getAttribute('tabindex') === '0');
    if (!visible.has(inOrder)) {
      inOrder = this.nearestVisible(inOrder === -1 ? 0 : inOrder, visible);
      if (inOrder !== -1) this.tiles[inOrder]!.setAttribute('tabindex', '0');
    }
    if (focused !== null && !visible.has(focused)) {
      const next = this.nearestVisible(focused, visible);
      if (next !== -1) this.focus(next);
    }
    const selectedBridges = new Set(pathBridges(state.selected).map(([a, b]) => bridgeKey(a, b)));
    for (const [key, line] of this.bridges) {
      line.classList.toggle('is-gone', !state.visibleBridges.has(key));
      line.classList.toggle('is-selected', selectedBridges.has(key));
    }
  }
}
