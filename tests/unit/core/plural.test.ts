import { describe, expect, it } from 'vitest';
import { plural, pluralForm } from '../../../src/core';

const words = { one: 'žodis', few: 'žodžiai', many: 'žodžių' };

describe('plural helper', () => {
  it('matches the milestone 1 cases', () => {
    expect(plural(1, words)).toBe('žodis');
    expect(plural(21, words)).toBe('žodis');
    expect(plural(2, words)).toBe('žodžiai');
    expect(plural(22, words)).toBe('žodžiai');
    expect(plural(10, words)).toBe('žodžių');
    expect(plural(11, words)).toBe('žodžių');
    expect(plural(15, words)).toBe('žodžių');
  });

  it.each([
    [0, 'many'],
    [1, 'one'],
    [9, 'few'],
    [12, 'many'],
    [19, 'many'],
    [20, 'many'],
    [29, 'few'],
    [30, 'many'],
    [31, 'one'],
    [101, 'one'],
    [111, 'many'],
    [112, 'many'],
    [122, 'few'],
  ] as const)('%i → %s', (n, form) => {
    expect(pluralForm(n)).toBe(form);
  });
});
