import type { BoardView } from './board-view';
import type { GameController } from './controller';

/** Entering a tile while dragging needs the pointer within this share of its radius (spec §4). */
export const DRAG_HIT_RATIO = 0.65;

/**
 * Drag to trace (touch and mouse, via Pointer Events): press on a visible tile to start, move onto
 * bridged neighbours to extend, back onto the previous tile to step back, release to submit.
 */
export function attachDragInput(board: BoardView, game: GameController): () => void {
  const svg = board.svg;
  let pointerId: number | null = null;

  const down = (event: PointerEvent) => {
    if (pointerId !== null || !game.playing) return;
    const tile = board.tileAt(event.clientX, event.clientY, 1);
    if (tile === null || !game.isVisible(tile)) return;
    event.preventDefault();
    pointerId = event.pointerId;
    svg.setPointerCapture(event.pointerId);
    game.begin(tile);
  };

  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const tile = board.tileAt(event.clientX, event.clientY, DRAG_HIT_RATIO);
    if (tile !== null) game.moveTo(tile);
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    game.commit();
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
