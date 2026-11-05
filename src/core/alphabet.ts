/** The 32-letter Lithuanian alphabet, in dictionary order (spec §6). Q, W and X never appear. */
// prettier-ignore
export const ALPHABET = [
  'A', 'Ą', 'B', 'C', 'Č', 'D', 'E', 'Ę', 'Ė', 'F', 'G', 'H', 'I', 'Į', 'Y', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'Š', 'T', 'U', 'Ų', 'Ū', 'V', 'Z', 'Ž',
] as const;

export type Letter = (typeof ALPHABET)[number];

const LETTERS: ReadonlySet<string> = new Set(ALPHABET);

/**
 * Diacritic letters a player on an English layout may mean when typing a base letter.
 * Tried only when the exact letter has no continuation (spec §6). I and Y never mix.
 */
export const DIACRITIC_VARIANTS: Readonly<Partial<Record<Letter, readonly Letter[]>>> = {
  A: ['Ą'],
  C: ['Č'],
  E: ['Ę', 'Ė'],
  I: ['Į'],
  S: ['Š'],
  U: ['Ų', 'Ū'],
  Z: ['Ž'],
};

export function isLetter(value: string): value is Letter {
  return LETTERS.has(value);
}

/** NFC-normalise and uppercase with Lithuanian rules, so combining-accent input matches tile letters. */
export function toUpper(text: string): string {
  return text.normalize('NFC').toLocaleUpperCase('lt-LT');
}

export function toLower(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('lt-LT');
}

/** Splits text into letters after normalising; returns null if any character is not a Lithuanian letter. */
export function toLetters(text: string): Letter[] | null {
  const chars = [...toUpper(text.trim())];
  return chars.every(isLetter) ? chars : null;
}

/** True if the text is a single word made only of Lithuanian letters (no spaces, digits or punctuation). */
export function isLithuanianWord(text: string): boolean {
  return toLetters(text) !== null && text.trim().length > 0;
}

export function variantsOf(letter: Letter): readonly Letter[] {
  return DIACRITIC_VARIANTS[letter] ?? [];
}
