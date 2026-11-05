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

const app = document.querySelector<HTMLElement>('#app')!;
const puzzle = FIXTURES[0]!;

const status = new StatusLine();
const board = new BoardView(puzzle);
const game = new GameController(puzzle, board, status, {
  onChange: (state) => {
    if (state.status === 'playing') return;
    // Let the last word fall away before the results replace the board.
    setTimeout(() => {
      status.element.remove();
      board.svg.replaceWith(renderResults(puzzle, state));
    }, 700);
  },
});
attachPointerInput(board, game);
attachKeyboardInput(game);

app.append(status.element, board.svg);
