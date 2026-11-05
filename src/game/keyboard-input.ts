import {
  backspace,
  emptySearch,
  highlighted,
  typeLetter,
  type TileIndex,
  type TypingSearch,
} from '../core';
import type { GameController } from './controller';

function samePath(a: readonly TileIndex[], b: readonly TileIndex[]): boolean {
  return a.length === b.length && a.every((tile, i) => tile === b[i]);
}

/**
 * Keyboard play (spec §4, §6): the player types and the game finds the word on the board.
 * Reads `event.key`, so the Lithuanian layout's ą č ę ė į š ų ū work directly, and the typing
 * search falls back to diacritics for English layouts. Backspace, Enter and Escape edit, submit
 * and clear.
 */
export function attachKeyboardInput(game: GameController, target: Window = window): () => void {
  let search: TypingSearch = emptySearch();
  let shown: readonly TileIndex[] = [];

  const show = () => {
    shown = highlighted(game.puzzle, game.state, search) ?? [];
    game.setPath(shown);
  };

  const keydown = (event: KeyboardEvent) => {
    if (!game.playing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    // A path built by drag or tap since the last key press replaces the typed one.
    if (!samePath(game.currentPath, shown)) search = emptySearch();

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        search = emptySearch();
        shown = [];
        game.commit();
        return;
      case 'Escape':
        search = emptySearch();
        show();
        return;
      case 'Backspace':
        event.preventDefault();
        search = backspace(search);
        show();
        return;
    }
    if ([...event.key].length !== 1) return;
    const next = typeLetter(game.puzzle, game.visible, search, event.key);
    if (next === search) return; // not a letter, or it extends nothing: ignored
    event.preventDefault();
    search = next;
    show();
  };

  target.addEventListener('keydown', keydown);
  return () => target.removeEventListener('keydown', keydown);
}
