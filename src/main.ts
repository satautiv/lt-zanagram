// Lithuanian letters live in the latin-ext subset; skip the others the game never shows.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import {
  adjustedTime,
  currentStreak,
  formatClock,
  isIsoDate,
  localDate,
  newGame,
  recordFinish,
  recordStart,
  type Puzzle,
} from './core';
import { BoardView } from './game/board-view';
import { GameController } from './game/controller';
import { attachKeyboardInput } from './game/keyboard-input';
import { attachPointerInput } from './game/pointer-input';
import { loadPuzzleFor } from './game/puzzle-source';
import { StatusLine } from './game/status-line';
import { Timer } from './game/timer';
import { loadProgress, saveProgress } from './storage/progress';
import { loadSettings, saveSettings, type Settings } from './storage/settings';
import { loadStats, saveStats } from './storage/stats';
import { Store } from './storage/store';
import { ArchiveCalendar } from './ui/archive';
import { PauseMenu } from './ui/pause-menu';
import { renderResults } from './ui/results';
import { SettingsPanel } from './ui/settings-panel';
import { Toolbar } from './ui/toolbar';
import { t } from './i18n';

const app = document.querySelector<HTMLElement>('#app')!;

const store = new Store();
let settings = loadSettings(store);

/** Light mode inverts to an off-white background and light-grey tiles (spec §5). */
function applyTheme(): void {
  document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', settings.darkMode ? '#141414' : '#f4f1ea');
}

/** Set by the game screen so settings changes reach it. */
let onSettingsChanged = () => {};

function changeSettings(change: Partial<Settings>): void {
  settings = { ...settings, ...change };
  saveSettings(store, settings);
  applyTheme();
  onSettingsChanged();
}

applyTheme();

/** Builds the game screen for one puzzle: board, toolbar, menu, timer and saving. */
function startGame(puzzle: Puzzle, published: readonly string[]): void {
  // Progress is saved after every change and restored on reload (spec §9 Saving).
  const saved = loadProgress(store, puzzle.id);
  const startedOn = saved?.startedOn ?? localDate();
  const initial = saved?.state ?? newGame(puzzle);
  const save = () => saveProgress(store, { state: game.snapshot(), startedOn });

  // Stats (spec §9): a first opening counts as played; finishing updates solves and the streak.
  let stats = loadStats(store);
  if (!saved) {
    stats = recordStart(stats, puzzle.id, startedOn);
    saveStats(store, stats);
    saveProgress(store, { state: initial, startedOn });
  }

  const timer = new Timer(initial.elapsedMs);
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
    onArchive: () => {
      timer.pause('archive');
      archive.open();
    },
    settings: () => new SettingsPanel(settings, changeSettings).element,
  });
  // Picking a day opens it through its link, so archive days can also be bookmarked.
  const archive = new ArchiveCalendar({
    published,
    today: localDate(),
    current: puzzle.id,
    progressOf: (date) => loadProgress(store, date)?.state.status ?? null,
    onPick: (date) => {
      // Today's puzzle is the plain address; past days get a #YYYY-MM-DD link.
      const url = date === localDate() ? location.pathname : `${location.pathname}#${date}`;
      history.replaceState(null, '', url);
      location.reload();
    },
    onClose: () => timer.resume('archive'),
  });
  const toolbar = new Toolbar({
    onMenu: () => menu.open(),
    onHint: () => game.hint(),
    onRotate: () => game.rotate(),
  });

  function showResults(): void {
    const row = {
      played: stats.played,
      streak: currentStreak(stats, localDate(), published),
      solves: stats.solves,
    };
    play.replaceChildren(renderResults(puzzle, game.state, row));
    toolbar.element.remove();
  }

  const game = new GameController(
    puzzle,
    board,
    status,
    {
      elapsedMs: () => timer.elapsedMs,
      praise: () => settings.feedback,
      onChange: (state) => {
        save();
        toolbar.update(state);
        if (state.status === 'playing') return;
        timer.pause('finished');
        stats = recordFinish(stats, {
          puzzleId: puzzle.id,
          startedOn,
          status: state.status,
          published,
        });
        saveStats(store, stats);
        // Let the last word fall away before the results replace the board.
        setTimeout(showResults, 700);
      },
    },
    initial,
  );
  attachPointerInput(board, game);
  attachKeyboardInput(game, { paused: () => menu.isOpen });

  // The timer pauses while the page is hidden (spec §5 Timer); save the time on the way out.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      timer.pause('hidden');
      if (game.playing) save();
    } else {
      timer.resume('hidden');
    }
  });
  window.addEventListener('pagehide', () => game.playing && save());
  setInterval(() => game.playing && timer.running && save(), 5_000);

  const showTime = () =>
    toolbar.setTime(formatClock(adjustedTime(timer.elapsedMs, game.state.extras.length)));
  setInterval(showTime, 250);
  showTime();

  toolbar.update(game.state);
  toolbar.setTimerVisible(settings.showTimer);
  play.append(status.element, board.svg);
  app.append(toolbar.element, play, menu.element, archive.element);

  // A finished puzzle reopens straight to its results (decision D7).
  if (!game.playing) {
    timer.pause('finished');
    showResults();
  }
  onSettingsChanged = () => toolbar.setTimerVisible(settings.showTimer);
}

/** Shown when the puzzle can't be loaded, with a retry (spec §9 Puzzle delivery). */
function showLoadError(): void {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = t('load.error');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'menu-item is-primary';
  retry.textContent = t('load.retry');
  retry.addEventListener('click', () => {
    box.remove();
    void boot();
  });
  box.append(text, retry);
  app.append(box);
}

async function boot(): Promise<void> {
  try {
    const requested = decodeURIComponent(location.hash.slice(1));
    const { puzzle, published } = await loadPuzzleFor(
      isIsoDate(requested) ? requested : null,
      localDate(),
    );
    startGame(puzzle, published);
  } catch (error) {
    console.error(error);
    showLoadError();
  }
}

// Following an archive link (or editing it) opens that day's puzzle.
window.addEventListener('hashchange', () => location.reload());

void boot();
