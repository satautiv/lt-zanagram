import {
  displayTime,
  formatClock,
  formatCountdown,
  msUntilNextDay,
  unfoundWords,
  type GameState,
  type Puzzle,
} from '../core';
import { shareText } from '../game/share';
import { t, type StringKey } from '../i18n';
import { shareResult, type ShareOutcome } from './share';

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export interface StatsRow {
  played: number;
  streak: number;
  solves: number;
}

export interface ResultsOptions {
  stats?: StatsRow;
  /** The game URL appended to the shared text; the share button is left out without it. */
  shareUrl?: string;
  /** Opens the archive calendar; the archive link is left out without it. */
  onArchive?: () => void;
  /** Where the "new puzzle is ready" link goes once the countdown runs out. */
  todayUrl?: string;
}

/**
 * The results screen shown when a puzzle is solved or given up (spec §5): headline with the final
 * time, a hints chip, the share button, the stats row, today's words (last found first, missed
 * ones greyed) with definitions and find times, the extra words found, and finally the archive
 * link with a countdown to the next puzzle.
 */
export function renderResults(
  puzzle: Puzzle,
  state: GameState,
  options: ResultsOptions = {},
): HTMLElement {
  const root = node('section', 'results');
  root.setAttribute('aria-labelledby', 'results-title');

  const title = node(
    'h2',
    'results-title',
    state.status === 'gaveUp'
      ? t('results.gaveUp')
      : t('results.solvedIn', { time: formatClock(displayTime(state)) }),
  );
  title.id = 'results-title';

  const chips = node('div', 'chips');
  chips.append(node('span', 'chip', t('count.hints', { n: state.hintsUsed })));
  const definitionsUsed = state.definitionsShown.length;
  if (definitionsUsed > 0) {
    chips.append(node('span', 'chip', t('count.definitions', { n: definitionsUsed })));
  }

  const words = node('section', 'results-words');
  words.append(node('h3', 'results-heading', t('results.todaysWords')));
  const list = node('ol', 'word-list');
  const definitions = new Map(puzzle.words.map((w) => [w.word, w.definition]));
  for (const { word, atMs } of [...state.found].reverse()) {
    list.append(wordRow(word, definitions.get(word) ?? '', formatClock(atMs), false));
  }
  if (state.status === 'gaveUp') {
    for (const { word, definition } of unfoundWords(puzzle, state)) {
      list.append(wordRow(word, definition, '—', true));
    }
  }
  words.append(list);

  const extras = node('section', 'results-extras');
  extras.append(node('h3', 'results-heading', t('results.extras')));
  extras.append(
    state.extras.length > 0
      ? node('p', 'extra-list', state.extras.join(', '))
      : node('p', 'extra-list is-empty', t('results.noExtras')),
  );

  root.append(title, chips);
  if (options.shareUrl !== undefined)
    root.append(shareBox(shareText(puzzle, state, options.shareUrl)));
  if (options.stats) root.append(statsRow(options.stats));
  root.append(words, extras, comeBack(options));
  return root;
}

const shareMessages: Record<ShareOutcome, StringKey | null> = {
  shared: 'share.shared',
  copied: 'share.copied',
  cancelled: null,
  failed: 'share.failed',
};

/** The share button and the confirmation it shows once the result is shared or copied. */
function shareBox(text: string): HTMLElement {
  const box = node('div', 'share');
  const button = node('button', 'menu-item is-primary share-button', t('results.share'));
  button.type = 'button';
  const message = node('p', 'share-message');
  message.setAttribute('role', 'status');
  let hide: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener('click', async () => {
    button.disabled = true;
    const outcome = await shareResult(text);
    button.disabled = false;
    const key = shareMessages[outcome];
    message.textContent = key ? t(key) : '';
    message.classList.toggle('is-error', outcome === 'failed');
    clearTimeout(hide);
    hide = setTimeout(() => (message.textContent = ''), 4_000);
  });
  box.append(button, message);
  return box;
}

/** "Come back tomorrow": the archive link and a live countdown to the next daily puzzle. */
function comeBack(options: ResultsOptions): HTMLElement {
  const box = node('div', 'come-back');
  if (options.onArchive) {
    const archive = node('button', 'menu-item come-back-archive', t('results.archive'));
    archive.type = 'button';
    archive.addEventListener('click', options.onArchive);
    box.append(archive);
  }
  const countdown = node('p', 'countdown');
  box.append(countdown);

  const nextPuzzleAt = Date.now() + msUntilNextDay();
  let shown = false;
  const tick = (): void => {
    // Stop once the results have been taken off the page.
    if (box.isConnected) shown = true;
    else if (shown) return clearInterval(interval);
    const left = nextPuzzleAt - Date.now();
    if (left > 0) {
      countdown.textContent = t('results.nextIn', { time: formatCountdown(left) });
      return;
    }
    const link = node('a', 'countdown-ready', t('results.nextReady'));
    link.href = options.todayUrl ?? './';
    countdown.replaceChildren(link);
    clearInterval(interval);
  };
  const interval = setInterval(tick, 1_000);
  tick();
  return box;
}

/** Played, current daily streak and solves (spec §5 Results). */
function statsRow(stats: StatsRow): HTMLElement {
  const row = node('dl', 'stats');
  for (const [label, value] of [
    [t('stats.played'), stats.played],
    [t('stats.streak'), stats.streak],
    [t('stats.solves'), stats.solves],
  ] as const) {
    const item = node('div', 'stat');
    item.append(node('dd', 'stat-value', String(value)), node('dt', 'stat-label', label));
    row.append(item);
  }
  return row;
}

function wordRow(word: string, definition: string, time: string, missed: boolean): HTMLLIElement {
  const row = node('li', missed ? 'word-row is-missed' : 'word-row');
  const text = node('div', 'word-text');
  text.append(node('span', 'word', word), node('span', 'definition', definition));
  row.append(text, node('span', 'word-time', time));
  return row;
}
