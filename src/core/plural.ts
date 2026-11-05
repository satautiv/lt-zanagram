/** Lithuanian has three plural forms for whole-number counts (spec §6). */
export type PluralForm = 'one' | 'few' | 'many';

export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

/** 1, 21, 31 → one; 2–9, 22–29 → few; 0, 10–20, 30 → many. */
export function pluralForm(count: number): PluralForm {
  const n = Math.abs(Math.trunc(count));
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit === 1 && lastTwo !== 11) return 'one';
  if (lastDigit >= 2 && lastDigit <= 9 && (lastTwo < 11 || lastTwo > 19)) return 'few';
  return 'many';
}

export function plural(count: number, forms: PluralForms): string {
  return forms[pluralForm(count)];
}
