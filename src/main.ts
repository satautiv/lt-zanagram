// Lithuanian letters live in the latin-ext subset; skip the others the game never shows.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import { BoardView } from './game/board-view';
import { GameController } from './game/controller';
import { attachPointerInput } from './game/pointer-input';
import { FIXTURES } from './game/fixtures';
import { attachKeyboardInput } from './game/keyboard-input';
import { StatusLine } from './game/status-line';
import { renderResults } from './ui/results';
import { Toolbar } from './ui/toolbar';

const app = document.querySelector<HTMLElement>('#app')!;
const puzzle = FIXTURES[0]!;

const status = new StatusLine();
const board = new BoardView(puzzle);
const toolbar = new Toolbar({
  onHint: () => game.hint(),
  onRotate: () => game.rotate(),
});
const game = new GameController(puzzle, board, status, {
  onChange: (state) => {
    toolbar.update(state);
    if (state.status === 'playing') return;
    // Let the last word fall away before the results replace the board.
    setTimeout(() => {
      status.element.remove();
      toolbar.element.remove();
      board.svg.replaceWith(renderResults(puzzle, state));
    }, 700);
  },
});
attachPointerInput(board, game);
attachKeyboardInput(game);

toolbar.update(game.state);
app.append(toolbar.element, status.element, board.svg);
