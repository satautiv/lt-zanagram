// Lithuanian letters live in the latin-ext subset; skip the others the game never shows.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import { BoardView } from './game/board-view';
import { GameController } from './game/controller';
import { attachPointerInput } from './game/pointer-input';
import { FIXTURES } from './game/fixtures';
import { StatusLine } from './game/status-line';

const app = document.querySelector<HTMLElement>('#app')!;
const puzzle = FIXTURES[0]!;

const status = new StatusLine();
const board = new BoardView(puzzle);
const game = new GameController(puzzle, board, status);
attachPointerInput(board, game);

app.append(status.element, board.svg);
