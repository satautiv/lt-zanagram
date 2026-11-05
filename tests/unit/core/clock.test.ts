import { describe, expect, it } from 'vitest';
import { formatClock } from '../../../src/core';

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
