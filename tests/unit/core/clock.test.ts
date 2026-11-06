import { describe, expect, it } from 'vitest';
import { formatClock, formatCountdown } from '../../../src/core';

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [124_000, '02:04'],
    [59 * 60_000 + 59_000, '59:59'],
    [3_600_000 + 2 * 60_000 + 4_000, '1:02:04'],
    [-5_000, '00:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });
});

describe('formatCountdown', () => {
  it.each([
    [12 * 3_600_000, '12:00:00'],
    [3_600_000 + 2 * 60_000 + 4_000, '01:02:04'],
    [5 * 60_000 + 12_000, '00:05:12'],
    // Rounds up, so it never shows 00:00:00 before the next day has started.
    [500, '00:00:01'],
    [0, '00:00:00'],
    [-5_000, '00:00:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});
