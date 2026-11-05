// Lithuanian letters live in the latin-ext subset; skip the others the game never shows.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import { adjustedTime, formatClock } from './core';
import { BoardView } from './game/board-view';
import { GameController } from './game/controller';
import { FIXTURES } from './game/fixtures';
import { attachKeyboardInput } from './game/keyboard-input';
import { attachPointerInput } from './game/pointer-input';
import { StatusLine } from './game/status-line';
import { Timer } from './game/timer';
import { PauseMenu } from './ui/pause-menu';
import { renderResults } from './ui/results';
import { Toolbar } from './ui/toolbar';

const app = document.querySelector<HTMLElement>('#app')!;
const puzzle = FIXTURES[0]!;

const timer = new Timer();
const status = new StatusLine();
const board = new BoardView(puzzle);
const play = document.createElement('div');
play.className = 'play';

const menu = new PauseMenu({
  onOpen: () => {
    timer.pause('menu');
    play.classList.add('is-paused');
  },
  onClose: () => {
    play.classList.remove('is-paused');
    timer.resume('menu');
  },
  onGiveUp: () => game.giveUp(),
});
const toolbar = new Toolbar({
  onMenu: () => menu.open(),
  onHint: () => game.hint(),
  onRotate: () => game.rotate(),
});

const game = new GameController(puzzle, board, status, {
  elapsedMs: () => timer.elapsedMs,
  onChange: (state) => {
    toolbar.update(state);
    if (state.status === 'playing') return;
    timer.pause('finished');
    // Let the last word fall away before the results replace the board.
    setTimeout(() => {
      play.replaceChildren(renderResults(puzzle, state));
      toolbar.element.remove();
    }, 700);
  },
});
attachPointerInput(board, game);
attachKeyboardInput(game, { paused: () => menu.isOpen });

// The timer pauses while the page is hidden (spec §5 Timer).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) timer.pause('hidden');
  else timer.resume('hidden');
});

const showTime = () =>
  toolbar.setTime(formatClock(adjustedTime(timer.elapsedMs, game.state.extras.length)));
setInterval(showTime, 250);
showTime();

toolbar.update(game.state);
play.append(status.element, board.svg);
app.append(toolbar.element, play, menu.element);
