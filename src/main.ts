// Lithuanian letters live in the latin-ext subset; skip the others the game never shows.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import { newGame, visibility, wordsLeft } from './core';
import { BoardView } from './game/board-view';
import { FIXTURES } from './game/fixtures';
import { t } from './i18n';

const app = document.querySelector<HTMLElement>('#app')!;
const puzzle = FIXTURES[0]!;
const state = newGame(puzzle);

const status = document.createElement('div');
status.className = 'status';
status.setAttribute('aria-live', 'polite');
status.textContent = t('status.wordsLeft', { n: wordsLeft(puzzle, state) });

const board = new BoardView(puzzle);
const visible = visibility(puzzle, state);
board.update({
  visibleTiles: visible.tiles,
  visibleBridges: visible.bridges,
  selected: [],
  hinted: [],
});

app.append(status, board.svg);
