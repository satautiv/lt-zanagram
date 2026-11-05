import type { BoardView } from './board-view';
import type { GameController } from './controller';

/** Entering a tile while dragging needs the pointer within this share of its radius (spec §4). */
export const DRAG_HIT_RATIO = 0.65;

/** What a press does if the pointer is released without moving onto another tile. */
type Press = 'start' | 'edit' | 'submit';

/**
 * Drag and tap through one set of Pointer Events (spec §4), for touch and mouse alike.
 *
 * - Drag: press a visible tile, move onto bridged neighbours (back onto the previous tile steps
 *   back), release to submit.
 * - Tap: tap a tile to start, a bridged neighbour to extend, the previous tile to step back, the
 *   last tile again to submit; a tile that can't extend starts a new path.
 *
 * A press becomes a drag as soon as the pointer enters another tile, so the two never misfire.
 */
export function attachPointerInput(board: BoardView, game: GameController): () => void {
  const svg = board.svg;
  let pointerId: number | null = null;
  let press: Press = 'start';
  let dragged = false;

  const down = (event: PointerEvent) => {
    if (pointerId !== null || !game.playing) return;
    const tile = board.tileAt(event.clientX, event.clientY, 1);
    if (tile === null || !game.isVisible(tile)) {
      game.clear();
      return;
    }
    event.preventDefault();
    pointerId = event.pointerId;
    svg.setPointerCapture(event.pointerId);
    dragged = false;

    const path = game.currentPath;
    if (path.length > 0 && tile === path.at(-1)) {
      press = 'submit';
    } else if (path.length > 0 && (tile === path.at(-2) || game.canExtendTo(tile))) {
      press = 'edit';
      game.moveTo(tile);
    } else {
      press = 'start';
      game.begin(tile);
    }
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const tile = board.tileAt(event.clientX, event.clientY, DRAG_HIT_RATIO);
    if (tile === null || tile === game.currentPath.at(-1)) return;
    const before = game.currentPath.length;
    game.moveTo(tile);
    if (game.currentPath.length !== before) dragged = true;
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (dragged || press === 'submit') game.commit();
  };

  const cancel = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    game.clear();
  };

  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', cancel);
  return () => {
    svg.removeEventListener('pointerdown', down);
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerup', up);
    svg.removeEventListener('pointercancel', cancel);
  };
}
