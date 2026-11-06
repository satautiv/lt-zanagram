/** A local calendar date as YYYY-MM-DD, the form puzzle ids use (spec §9: the player's time zone). */
export function localDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Which puzzle to open on a given local day (spec §9): today's if it exists, otherwise the latest
 * one before today. If every puzzle is in the future (only right before launch), the earliest.
 */
export function pickPuzzleDate(dates: readonly string[], today: string): string | null {
  if (dates.length === 0) return null;
  if (dates.includes(today)) return today;
  const sorted = [...dates].sort();
  const past = sorted.filter((d) => d < today);
  return past.at(-1) ?? sorted[0]!;
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d\d-\d\d$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * The days of a month laid out in Monday-first weeks for a calendar, as YYYY-MM-DD strings, with
 * null for the blank cells before the 1st and after the last day. `month` is 1–12.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) cells.push(localDate(new Date(year, month - 1, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Time left until the next local midnight, when the next daily puzzle opens (spec §5 Results). */
export function msUntilNextDay(now: Date = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}
