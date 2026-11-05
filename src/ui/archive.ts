import { monthGrid } from '../core';
import { t } from '../i18n';

/** How far a player got with a day's puzzle, for the calendar marks. */
export type DayProgress = 'solved' | 'gaveUp' | 'playing' | null;

export interface ArchiveOptions {
  published: readonly string[];
  today: string;
  /** The puzzle currently on screen. */
  current: string;
  progressOf: (date: string) => DayProgress;
  onPick: (date: string) => void;
  onClose: () => void;
}

const monthTitle = new Intl.DateTimeFormat('lt-LT', { month: 'long', year: 'numeric' });
const longDay = new Intl.DateTimeFormat('lt-LT', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const weekday = new Intl.DateTimeFormat('lt-LT', { weekday: 'short' });

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase('lt-LT') + text.slice(1);
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/**
 * The archive calendar (spec §9 Archive): a month view with previous/next arrows. Days with a
 * puzzle up to today can be opened; future days are disabled; today is outlined; solved days are
 * filled and days in progress get a dot.
 */
export class ArchiveCalendar {
  readonly element: HTMLDialogElement;
  private readonly title: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private year: number;
  private month: number;

  constructor(private readonly options: ArchiveOptions) {
    const shown = parse(options.current);
    this.year = shown.getFullYear();
    this.month = shown.getMonth() + 1;

    this.element = document.createElement('dialog');
    this.element.className = 'archive';
    this.element.setAttribute('aria-labelledby', 'archive-title');

    const heading = document.createElement('h2');
    heading.className = 'menu-title';
    heading.textContent = t('menu.archive');

    const nav = document.createElement('div');
    nav.className = 'archive-nav';
    this.prev = this.arrow('‹', t('archive.previous'), -1);
    this.next = this.arrow('›', t('archive.next'), 1);
    this.title = document.createElement('h3');
    this.title.id = 'archive-title';
    this.title.className = 'archive-month';
    nav.append(this.prev, this.title, this.next);

    this.grid = document.createElement('div');
    this.grid.className = 'archive-grid';
    this.grid.setAttribute('role', 'grid');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'menu-item';
    close.textContent = t('archive.close');
    close.addEventListener('click', () => this.element.close());

    this.element.append(heading, nav, this.grid, close);
    this.element.addEventListener('close', () => options.onClose());
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.element.close();
    });
    this.render();
  }

  open(): void {
    this.render();
    this.element.showModal();
  }

  private arrow(symbol: string, label: string, step: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button archive-arrow';
    button.textContent = symbol;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => {
      this.month += step;
      if (this.month === 0) [this.month, this.year] = [12, this.year - 1];
      if (this.month === 13) [this.month, this.year] = [1, this.year + 1];
      this.render();
    });
    return button;
  }

  private render(): void {
    const { published, today } = this.options;
    const available = new Set(published.filter((d) => d <= today));
    const monthStart = `${this.year}-${String(this.month).padStart(2, '0')}`;
    this.title.textContent = capitalise(monthTitle.format(new Date(this.year, this.month - 1, 1)));
    // Only months that hold published puzzles up to today can be reached.
    const months = [...available].map((d) => d.slice(0, 7)).sort();
    this.prev.disabled = months.length === 0 || monthStart <= months[0]!;
    this.next.disabled = months.length === 0 || monthStart >= months.at(-1)!;

    const header = document.createElement('div');
    header.className = 'archive-row';
    header.setAttribute('role', 'row');
    // 2 Nov 2026 is a Monday.
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('span');
      cell.className = 'archive-weekday';
      cell.setAttribute('role', 'columnheader');
      cell.textContent = capitalise(weekday.format(new Date(2026, 10, 2 + i)));
      header.append(cell);
    }

    const rows = monthGrid(this.year, this.month).map((week) => {
      const row = document.createElement('div');
      row.className = 'archive-row';
      row.setAttribute('role', 'row');
      for (const date of week) row.append(this.day(date, available.has(date ?? ''), today));
      return row;
    });
    this.grid.replaceChildren(header, ...rows);
  }

  private day(date: string | null, playable: boolean, today: string): HTMLElement {
    if (date === null) {
      const blank = document.createElement('span');
      blank.className = 'archive-day is-blank';
      blank.setAttribute('role', 'gridcell');
      return blank;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'archive-day';
    button.setAttribute('role', 'gridcell');
    button.textContent = String(Number(date.slice(8)));
    const progress = playable ? this.options.progressOf(date) : null;
    const notes: string[] = [];
    if (date === today) {
      button.classList.add('is-today');
      notes.push(t('archive.today'));
    }
    if (date === this.options.current) button.setAttribute('aria-current', 'date');
    if (progress === 'solved') {
      button.classList.add('is-solved');
      notes.push(t('archive.solved'));
    } else if (progress === 'playing') {
      button.classList.add('is-started');
      notes.push(t('archive.started'));
    } else if (progress === 'gaveUp') {
      button.classList.add('is-given-up');
      notes.push(t('archive.gaveUp'));
    }
    button.setAttribute('aria-label', [longDay.format(parse(date)), ...notes].join(', '));
    button.disabled = !playable;
    if (playable) button.addEventListener('click', () => this.options.onPick(date));
    return button;
  }
}
