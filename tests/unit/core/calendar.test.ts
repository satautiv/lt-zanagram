import { describe, expect, it } from 'vitest';
import { pickPuzzleDate } from '../../../src/core';

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
