// The authoring tool (spec §8): a dev-only page, /editor.html, served by `npm run dev` and left out
// of the production build. Pick a day on the calendar, generate or edit its board, tick required
// words, write definitions, playtest, then save it to public/puzzles or export JSON.
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-800.css';
import './editor.css';
import {
  areNeighbours,
  bridgeKey,
  colOf,
  encodePuzzle,
  isLetter,
  monthGrid,
  PuzzleGenerator,
  readPuzzle,
  rowOf,
  seededRandom,
  toUpper,
  WordList,
  type Puzzle,
  type TileIndex,
} from '../src/core';
import { offerPlaytest } from '../src/game/playtest';
import { EDITOR_SAVE_PATH } from './save-path';
import {
  analyse,
  emptyDraft,
  fromPuzzle,
  repath,
  setCanonicalPath,
  setDefinition,
  setLetter,
  toggleBridge,
  toggleRequired,
  type Analysis,
  type Draft,
  type Lists,
} from './model';

const SVG = 'http://www.w3.org/2000/svg';
const TILE = 72;
const GAP = 28;
const PAD = 12;
const DEFINITION_MAX = 80;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function html<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

let draft: Draft = emptyDraft(tomorrow());
let lists: Lists = { valid: new WordList([]) };
let analysis: Analysis = analyse(draft, lists);
let selected: TileIndex | null = 0;
let highlighted: readonly TileIndex[] = [];
/** Published days (index.json), for the calendar. */
let published = new Map<string, number>();
let month = { year: 0, month: 0 };
let generator: PuzzleGenerator | null = null;

const puzzleUrl = (date: string) => `${import.meta.env.BASE_URL}puzzles/${date}.json`;

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Applies an edit, keeps canonical paths tracing where possible, and redraws. */
function update(next: Draft): void {
  draft = next;
  analysis = analyse(draft, lists);
  const moved = repath(draft, analysis.traceable);
  if (moved !== draft) {
    draft = moved;
    analysis = analyse(draft, lists);
  }
  render();
}

// --- Board ---------------------------------------------------------------------------------------

const center = (tile: TileIndex) => ({
  x: PAD + TILE / 2 + colOf(draft.size, tile) * (TILE + GAP),
  y: PAD + TILE / 2 + rowOf(draft.size, tile) * (TILE + GAP),
});

function renderBoard(): void {
  const board = $<HTMLElement>('#board');
  const extent = 2 * PAD + draft.size * TILE + (draft.size - 1) * GAP;
  const root = svg('svg', { viewBox: `0 0 ${extent} ${extent}`, class: 'editor-board' });
  const tiles = draft.size * draft.size;
  const lit = new Set(highlighted);
  const litBridges = new Set(highlighted.slice(1).map((t, i) => bridgeKey(highlighted[i]!, t)));

  // Every neighbour pair gets a slot: click it to toggle that bridge.
  for (let a = 0; a < tiles; a++) {
    for (let b = a + 1; b < tiles; b++) {
      if (!areNeighbours(draft.size, a, b)) continue;
      const key = bridgeKey(a, b);
      const from = center(a);
      const to = center(b);
      const classes = ['slot'];
      if (draft.bridges.has(key)) classes.push('is-on');
      if (analysis.orphanBridges.has(key)) classes.push('is-orphan');
      if (litBridges.has(key)) classes.push('is-lit');
      const group = svg('g', { class: classes.join(' '), 'data-bridge': key });
      const line = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
      group.append(
        svg('line', { ...line, class: 'slot-hit' }),
        svg('line', { ...line, class: 'slot-line' }),
      );
      group.addEventListener('click', () => update(toggleBridge(draft, a, b)));
      root.append(group);
    }
  }

  for (let tile = 0; tile < tiles; tile++) {
    const { x, y } = center(tile);
    const classes = ['tile'];
    if (tile === selected) classes.push('is-selected');
    if (analysis.orphanTiles.has(tile) && draft.letters[tile]) classes.push('is-orphan');
    if (lit.has(tile)) classes.push('is-lit');
    const group = svg('g', {
      class: classes.join(' '),
      transform: `translate(${x} ${y})`,
      'data-tile': tile,
    });
    group.append(svg('circle', { r: TILE / 2 }));
    const text = svg('text', { 'text-anchor': 'middle', dy: '0.35em' });
    text.textContent = draft.letters[tile] ?? '';
    group.append(text, svg('text', { class: 'tile-index', x: -TILE / 2, y: -TILE / 2 + 4 }));
    group.lastChild!.textContent = String(tile);
    group.addEventListener('click', () => {
      selected = tile;
      render();
    });
    root.append(group);
  }
  board.replaceChildren(root);
}

// --- Panels --------------------------------------------------------------------------------------

function renderStatus(): void {
  const { puzzle, errors, notInList, blocked } = analysis;
  const stats = $<HTMLElement>('#stats');
  stats.replaceChildren(
    html('span', {}, `${puzzle.words.length} required`),
    html('span', {}, `${puzzle.extras.length} extras`),
    html('span', {}, `${puzzle.bridges.length} bridges`),
    html('span', {}, `difficulty ${puzzle.difficulty}`),
  );
  const problems = [
    ...errors.map((e) => e.message),
    ...notInList.map((w) => `"${w}" is not in required.txt`),
    ...blocked.map((w) => `Blocked word "${w}" traces on the board`),
  ];
  const warnings = $<HTMLElement>('#warnings');
  warnings.replaceChildren(
    problems.length === 0
      ? html('p', { className: 'ok' }, 'validatePuzzle: ok')
      : html('ul', {}, ...problems.map((p) => html('li', {}, p))),
  );
}

function pathLabel(path: readonly TileIndex[]): string {
  return path.join('→');
}

function renderWords(): void {
  const list = $<HTMLElement>('#words');
  const items: HTMLElement[] = [];
  // Required words that no longer trace still show, so they can be unticked.
  const words = new Map(analysis.traceable);
  for (const [word, entry] of draft.required) if (!words.has(word)) words.set(word, [entry.path]);

  for (const [word, paths] of words) {
    const entry = draft.required.get(word);
    const lost = entry !== undefined && !analysis.traceable.has(word);
    const item = html('li', { className: entry ? 'word is-required' : 'word' });
    item.dataset.word = word;
    if (lost) item.classList.add('is-lost');
    const box = html('input', { type: 'checkbox', checked: entry !== undefined });
    box.addEventListener('change', () => update(toggleRequired(draft, word, paths)));
    const label = html('label', {}, box, ` ${word} `, html('small', {}, String([...word].length)));
    item.append(label);

    if (entry && paths.length > 1) {
      const select = html('select', { title: 'Canonical path' });
      paths.forEach((path, i) => {
        const option = html('option', { value: String(i) }, pathLabel(path));
        option.selected = path.join() === entry.path.join();
        select.append(option);
      });
      select.addEventListener('change', () =>
        update(setCanonicalPath(draft, word, paths[Number(select.value)]!)),
      );
      item.append(select);
    }
    if (entry) {
      const definition = html('input', {
        type: 'text',
        className: 'definition',
        placeholder: 'Definition (under 80 characters)',
        value: entry.definition,
        maxLength: DEFINITION_MAX,
      });
      definition.addEventListener('change', () =>
        update(setDefinition(draft, word, definition.value.trim())),
      );
      item.append(definition);
    }
    item.addEventListener('mouseenter', () => {
      highlighted = entry?.path ?? paths[0] ?? [];
      renderBoard();
    });
    item.addEventListener('mouseleave', () => {
      highlighted = [];
      renderBoard();
    });
    items.push(item);
  }
  list.replaceChildren(...items);
}

// --- Calendar: which days have puzzles; pick one to load or start it ----------------------------

const MONTH = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: 'long' });

function renderCalendar(): void {
  if (month.year === 0) {
    const [y, m] = draft.id.split('-').map(Number);
    month = { year: y ?? 2026, month: m ?? 1 };
  }
  const step = (delta: number) => {
    const date = new Date(month.year, month.month - 1 + delta, 1);
    month = { year: date.getFullYear(), month: date.getMonth() + 1 };
    renderCalendar();
  };
  const previous = html('button', { type: 'button', title: 'Previous month' }, '‹');
  const next = html('button', { type: 'button', title: 'Next month' }, '›');
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  const title = html('strong', {}, MONTH.format(new Date(month.year, month.month - 1, 1)));
  const count = html('small', {}, `${published.size} puzzles in public/puzzles`);

  const grid = html('div', { className: 'calendar-grid' });
  for (const day of ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk']) grid.append(html('span', {}, day));
  for (const week of monthGrid(month.year, month.month)) {
    for (const date of week) {
      if (date === null) {
        grid.append(html('span'));
        continue;
      }
      const difficulty = published.get(date);
      const cell = html('button', { type: 'button', title: date }, String(Number(date.slice(8))));
      cell.dataset.date = date;
      if (difficulty !== undefined) {
        cell.classList.add('has-puzzle');
        cell.append(html('small', {}, String(difficulty)));
      }
      if (date === draft.id) cell.classList.add('is-current');
      cell.addEventListener('click', () => void openDate(date));
      grid.append(cell);
    }
  }
  $<HTMLElement>('#calendar').replaceChildren(
    html('div', { className: 'calendar-head' }, previous, title, next, count),
    grid,
  );
}

async function loadIndex(): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}puzzles/index.json`, {
    cache: 'no-store',
  });
  const index = response.ok
    ? ((await response.json()) as { date: string; difficulty: number }[])
    : [];
  published = new Map(index.map((e) => [e.date, e.difficulty]));
  renderCalendar();
}

async function fetchPuzzle(date: string): Promise<Puzzle | null> {
  const response = await fetch(puzzleUrl(date), { cache: 'no-store' });
  return response.ok ? readPuzzle(await response.json()) : null;
}

/** A published day loads; any other day starts an empty board for that date. */
async function openDate(date: string): Promise<void> {
  const puzzle = published.has(date) ? await fetchPuzzle(date) : null;
  selected = 0;
  if (puzzle) {
    update(fromPuzzle(puzzle));
    setMessage(`Loaded ${date}`);
  } else {
    update({ ...emptyDraft(date), author: draft.author });
    setMessage(`New board for ${date}`);
  }
}

// --- Generate, playtest, save --------------------------------------------------------------------

/** Words required on other published days, so a generated board doesn't repeat them (as the CLI). */
async function wordsOnOtherDays(): Promise<Set<string>> {
  const others = [...published.keys()].filter((date) => date !== draft.id);
  const puzzles = await Promise.all(others.map(fetchPuzzle));
  return new Set(puzzles.flatMap((p) => p?.words.map((w) => w.word) ?? []));
}

$<HTMLButtonElement>('#generate').addEventListener('click', async () => {
  if (!generator) {
    setMessage('Word lists are still loading');
    return;
  }
  const seed = $<HTMLInputElement>('#seed').value.trim() || '1';
  setMessage('Generating…');
  const avoid = await wordsOnOtherDays();
  // The same seeding as `npm run generate`, so a seed gives the same board in both.
  const result = generator.generate({
    id: draft.id,
    random: seededRandom(`${seed}:${draft.id}`),
    avoid,
    author: draft.author || undefined,
  });
  if (!result) {
    setMessage(`No board passed the checks for seed ${seed}; try another seed`);
    return;
  }
  selected = 0;
  update(fromPuzzle(result.puzzle));
  setMessage(`Generated ${draft.id} with seed ${seed}`);
});

$<HTMLButtonElement>('#playtest').addEventListener('click', () => {
  offerPlaytest(analysis.puzzle);
  window.open(`${import.meta.env.BASE_URL}?playtest`, '_blank');
});

$<HTMLButtonElement>('#save').addEventListener('click', async () => {
  const response = await fetch(EDITOR_SAVE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encodePuzzle(analysis.puzzle)),
  });
  const result = (await response.json()) as { saved?: string; error?: string };
  if (!response.ok) {
    setMessage(`Not saved: ${result.error ?? response.status}`);
    return;
  }
  setMessage(`Saved public/puzzles/${result.saved}.json`);
  await loadIndex();
});

function render(): void {
  renderBoard();
  renderStatus();
  renderWords();
  renderCalendar();
  $<HTMLInputElement>('#date').value = draft.id;
  $<HTMLInputElement>('#author').value = draft.author;
}

// --- Keyboard: type letters into the selected tile -----------------------------------------------

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

window.addEventListener('keydown', (event) => {
  if (selected === null || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  const tiles = draft.size * draft.size;
  const step = ARROWS[event.key];
  if (step) {
    event.preventDefault();
    const row = Math.min(draft.size - 1, Math.max(0, rowOf(draft.size, selected) + step[0]));
    const col = Math.min(draft.size - 1, Math.max(0, colOf(draft.size, selected) + step[1]));
    selected = row * draft.size + col;
    render();
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    update(setLetter(draft, selected, ''));
  } else if (event.key.length === 1 && isLetter(toUpper(event.key))) {
    event.preventDefault();
    const tile = selected;
    selected = (tile + 1) % tiles; // typing runs on through the board
    update(setLetter(draft, tile, toUpper(event.key)));
  }
});

// --- Load and export -----------------------------------------------------------------------------

function setMessage(text: string): void {
  $<HTMLElement>('#message').textContent = text;
}

function loadPuzzle(raw: unknown): void {
  const puzzle = readPuzzle(raw);
  selected = 0;
  update(fromPuzzle(puzzle));
  setMessage(`Loaded ${puzzle.id}`);
}

$<HTMLButtonElement>('#load-date').addEventListener('click', async () => {
  const date = $<HTMLInputElement>('#date').value;
  const response = await fetch(puzzleUrl(date), { cache: 'no-store' });
  if (!response.ok) {
    setMessage(`No puzzle for ${date}`);
    return;
  }
  loadPuzzle(await response.json());
});

$<HTMLInputElement>('#load-file').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) loadPuzzle(JSON.parse(await file.text()));
});

$<HTMLInputElement>('#date').addEventListener('change', (event) => {
  month = { year: 0, month: 0 };
  update({ ...draft, id: (event.target as HTMLInputElement).value });
});

$<HTMLInputElement>('#author').addEventListener('change', (event) => {
  update({ ...draft, author: (event.target as HTMLInputElement).value.trim() });
});

$<HTMLButtonElement>('#new').addEventListener('click', () => {
  selected = 0;
  update(emptyDraft(draft.id));
  setMessage('New empty board');
});

$<HTMLButtonElement>('#export').addEventListener('click', () => {
  const problems = analysis.errors.length + analysis.notInList.length + analysis.blocked.length;
  if (problems > 0 && !confirm(`This board has ${problems} problems. Export anyway?`)) return;
  // Committed puzzle files are obfuscated (ADR-0001).
  const json = JSON.stringify(encodePuzzle(analysis.puzzle), null, 2) + '\n';
  const link = html('a', {
    href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    download: `${draft.id}.json`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
  setMessage(`Exported ${draft.id}.json`);
});

// --- Word lists ----------------------------------------------------------------------------------

/** One word per line from data/, or null when the file hasn't been built. */
async function wordFile(name: string): Promise<string[] | null> {
  const response = await fetch(new URL(`../data/${name}`, import.meta.url));
  if (!response.ok) return null;
  const text = await response.text();
  // The dev server answers unknown paths with the app's HTML.
  if (text.trimStart().startsWith('<')) return null;
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
}

async function loadLists(): Promise<void> {
  const [valid, required, blocked] = await Promise.all([
    wordFile('valid.txt'),
    wordFile('required.txt'),
    wordFile('blocked-forms.txt'),
  ]);
  const validList = new WordList(valid ?? required ?? []);
  generator = new PuzzleGenerator({
    required: required ?? [],
    valid: validList,
    blocked: new WordList(blocked ?? []),
  });
  lists = {
    valid: validList,
    requiredWords: required ? new Set(required) : undefined,
    blocked: blocked ? new WordList(blocked) : undefined,
  };
  $<HTMLElement>('#lists').textContent = valid
    ? `valid.txt: ${valid.length.toLocaleString('lt')} forms`
    : 'valid.txt not built (npm run wordlists): showing required.txt words only';
  update(draft);
}

render();
void loadLists();
void loadIndex();
