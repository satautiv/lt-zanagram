import { describe, expect, it } from 'vitest';
import { addDays, isIsoDate, monthGrid, msUntilNextDay, pickPuzzleDate } from '../../../src/core';

const dates = ['2026-11-06', '2026-11-07', '2026-11-09'];

describe('pickPuzzleDate', () => {
  it("picks today's puzzle when there is one", () => {
    expect(pickPuzzleDate(dates, '2026-11-07')).toBe('2026-11-07');
  });

  it('falls back to the latest earlier puzzle, never a future one', () => {
    expect(pickPuzzleDate(dates, '2026-11-08')).toBe('2026-11-07');
    expect(pickPuzzleDate(dates, '2026-12-25')).toBe('2026-11-09');
  });

  it('shows the earliest puzzle when all are in the future, and nothing when there are none', () => {
    expect(pickPuzzleDate(dates, '2026-11-01')).toBe('2026-11-06');
    expect(pickPuzzleDate([], '2026-11-01')).toBeNull();
  });
});

describe('isIsoDate', () => {
  it('accepts real dates only', () => {
    expect(isIsoDate('2026-11-05')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-1-05')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });
});

describe('monthGrid', () => {
  it('lays November 2026 out in Monday-first weeks', () => {
    const weeks = monthGrid(2026, 11);
    // 1 Nov 2026 is a Sunday: six blanks, then the 1st in the last column.
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[1]![0]).toBe('2026-11-02');
    expect(weeks.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('handles February in a leap year', () => {
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe('msUntilNextDay', () => {
  it('counts down to the next local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 10, 6, 12, 0, 0))).toBe(12 * 3_600_000);
    expect(msUntilNextDay(new Date(2026, 10, 6, 23, 59, 59, 500))).toBe(500);
    expect(msUntilNextDay(new Date(2026, 10, 6, 0, 0, 0))).toBe(24 * 3_600_000);
  });

  it('rolls over the end of a month and a year', () => {
    expect(msUntilNextDay(new Date(2026, 10, 30, 23, 0, 0))).toBe(3_600_000);
    expect(msUntilNextDay(new Date(2026, 11, 31, 23, 30, 0))).toBe(30 * 60_000);
  });
});

describe('addDays', () => {
  it('steps across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
});
