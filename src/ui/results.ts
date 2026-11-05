import { displayTime, formatClock, unfoundWords, type GameState, type Puzzle } from '../core';
import { t } from '../i18n';

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

/**
 * The results screen shown when a puzzle is solved or given up (spec §5): headline with the final
 * time, a hints chip, today's words (last found first, missed ones greyed) with definitions and
 * find times, and the extra words found.
 */
export interface StatsRow {
  played: number;
  streak: number;
  solves: number;
}

export function renderResults(puzzle: Puzzle, state: GameState, stats?: StatsRow): HTMLElement {
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
  if (stats) root.append(statsRow(stats));
  root.append(words, extras);
  return root;
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
