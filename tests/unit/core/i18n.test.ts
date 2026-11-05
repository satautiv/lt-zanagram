import { describe, expect, it } from 'vitest';
import { createTranslator, formatLongDate } from '../../../src/core';
import { t } from '../../../src/i18n';

describe('UI strings', () => {
  it('fills plural forms from lt.json', () => {
    expect(t('status.wordsLeft', { n: 14 })).toBe('Liko 14 žodžių');
    expect(t('status.wordsLeft', { n: 1 })).toBe('Liko 1 žodis');
    expect(t('status.wordsLeft', { n: 3 })).toBe('Liko 3 žodžiai');
    expect(t('count.hints', { n: 2 })).toBe('2 patarimai');
  });

  it('returns plain strings and fills placeholders', () => {
    expect(t('feedback.alreadyFound')).toBe('Jau rastas');
    const tr = createTranslator({ hi: 'Labas, {name}!' });
    expect(tr('hi', { name: 'Vytautai' })).toBe('Labas, Vytautai!');
  });

  it('throws on a missing key or a plural without n', () => {
    const tr = createTranslator({ a: { one: 'x', few: 'y', many: 'z' } } as Record<
      string,
      { one: string; few: string; many: string }
    >);
    expect(() => tr('missing')).toThrow(/Missing UI string/);
    expect(() => tr('a')).toThrow(/numeric n/);
  });

  it('every plural message in lt.json has all three forms', async () => {
    const lt = (await import('../../../src/i18n/lt.json')).default as Record<string, unknown>;
    for (const [key, value] of Object.entries(lt)) {
      if (typeof value === 'object' && value) {
        expect(Object.keys(value).sort(), key).toEqual(['few', 'many', 'one']);
      }
    }
  });
});

describe('dates', () => {
  it('formats a long Lithuanian date', () => {
    expect(formatLongDate(new Date(2026, 10, 5))).toBe('2026 m. lapkričio 5 d.');
  });
});
