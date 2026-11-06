import { stepFocus, type Direction } from '../core';
import type { BoardView } from './board-view';
import type { GameController } from './controller';

const ARROWS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * Keyboard play on focused tiles (spec §10 Accessibility): arrow keys move focus across the board
 * as the player sees it, Space acts like a tap. Enter still submits through the keyboard input.
 */
export function attachTileFocus(board: BoardView, game: GameController): () => void {
  const keydown = (event: KeyboardEvent) => {
    const tile = board.tileOf(event.target);
    if (tile === null) return;
    const direction = ARROWS[event.key];
    if (direction) {
      event.preventDefault();
      const next = stepFocus(board.size, tile, direction, board.turns, game.visible.tiles);
      if (next !== null) board.focus(next);
    } else if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation(); // Space is not a typed letter
      game.tap(tile);
    }
  };
  board.svg.addEventListener('keydown', keydown);
  return () => board.svg.removeEventListener('keydown', keydown);
}
