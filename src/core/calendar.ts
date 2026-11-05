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
