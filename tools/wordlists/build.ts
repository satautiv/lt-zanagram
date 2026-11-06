// Pure list building for `npm run wordlists` (spec §7): no files, no network, so it can be tested.
import { toLetters, toLower, toUpper } from '../../src/core';
import { expand, type Affixes, type DicEntry } from './hunspell';

export const VALID_LENGTH = { min: 4, max: 16 } as const;
export const REQUIRED_LENGTH = { min: 4, max: 12 } as const;

/**
 * A word in list form (upper case, NFC), or null if it can't be one: anything outside the
 * Lithuanian alphabet (hyphens, apostrophes, digits, Q/W/X, spaces) or outside the length range.
 */
export function normalise(word: string, length: { min: number; max: number }): string | null {
  const letters = toLetters(word);
  if (letters === null || letters.length < length.min || letters.length > length.max) return null;
  return letters.join('');
}

/** Proper nouns and abbreviations start with a capital; common words are all lower case. */
export function isCommonWord(word: string): boolean {
  const first = [...word][0];
  return first !== undefined && first === first.toLocaleLowerCase('lt-LT') && !word.includes('.');
}

/** Reads a word-per-line file (blocklist, overrides); `#` starts a comment. */
export function readWordLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line !== '');
}

/** Lower-case Lithuanian letters only: anything else can never be a valid form. */
const LOWER_WORD = /^[aąbcčdeęėfghiįyjklmnoprsštuųūvzž]+$/u;

/**
 * Corpus forms seen at least `minCount` times in any one of the frequency lists, in lower case
 * (NFC). Lines are `form count` or `form<TAB>count`; case is folded within a list, so
 * sentence-initial capitals count too. Counts are not added across lists, so two one-off
 * sightings (usually typos) don't make a form.
 *
 * Several lists, because the CCLL 2022 wordform list lost almost every form with Ž: its build
 * script filtered lines with `grep -v '[^a-z]'` (see its readme), and the few survivors have Ž
 * turned into Ū ("ūmogus"). The 2025 package's wordform list has them.
 */
export function attestedForms(lists: readonly string[], minCount: number): Set<string> {
  const forms = new Set<string>();
  for (const text of lists) {
    const counts = new Map<string, number>();
    for (const line of text.split(/\r?\n/)) {
      const [raw, count] = line.trim().split(/\s+/);
      if (raw === undefined || count === undefined) continue;
      const form = toLower(raw);
      const length = [...form].length;
      if (length < VALID_LENGTH.min || length > VALID_LENGTH.max || !LOWER_WORD.test(form))
        continue;
      counts.set(form, (counts.get(form) ?? 0) + Number(count));
    }
    for (const [form, count] of counts) if (count >= minCount) forms.add(form);
  }
  return forms;
}

/** Code-point order: identical on every machine and Node version. */
export function sortWords(words: Iterable<string>): string[] {
  return [...words].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export interface ValidInput {
  dictionary: readonly DicEntry[];
  affixes: Affixes;
  /** From `attestedForms`: lower case, as the corpus spells them. */
  attested: ReadonlySet<string>;
  blocked: ReadonlySet<string>;
}

/**
 * `valid.txt`: every form of every common dictionary word that the corpus attests. An entry with
 * any blocked form is left out with all its forms.
 */
export function buildValid({ dictionary, affixes, attested, blocked }: ValidInput): string[] {
  const blockedLower = new Set([...blocked].map(toLower));
  const valid = new Set<string>();
  for (const entry of dictionary) {
    if (!isCommonWord(entry.word)) continue;
    const forms = expand(entry, affixes).map((form) => form.normalize('NFC'));
    if (forms.some((form) => blockedLower.has(form))) continue;
    for (const form of forms) {
      if (!attested.has(form)) continue;
      const word = normalise(form, VALID_LENGTH);
      if (word !== null) valid.add(word);
    }
  }
  return sortWords(valid);
}

export interface RequiredInput {
  /** Lemma list lines, `lemma<TAB>count`. */
  lemmaList: string;
  dictionary: readonly DicEntry[];
  valid: ReadonlySet<string>;
  blocked: ReadonlySet<string>;
  /** Author overrides: always in, never in. */
  allow: ReadonlySet<string>;
  deny: ReadonlySet<string>;
  size: number;
}

export interface RequiredResult {
  words: string[];
  /** Allowed words dropped because they are not valid. */
  rejectedAllows: string[];
}

/**
 * `required.txt`: common base forms by corpus frequency (spec §7). A lemma qualifies if it is a
 * common dictionary word, 4–12 letters, valid, not blocked or denied, and not just a negated
 * form of another lemma (NEBŪTI next to BŪTI). The top `size` by frequency are kept, ties in
 * word order, then the author's allows are added.
 */
export function buildRequired(input: RequiredInput): RequiredResult {
  const { valid, blocked, deny } = input;
  const stems = new Set(
    input.dictionary.filter((e) => isCommonWord(e.word)).map((e) => toUpper(e.word)),
  );
  const counts = new Map<string, number>();
  for (const line of input.lemmaList.split(/\r?\n/)) {
    const [lemma, count] = line.split('\t');
    if (lemma === undefined || !isCommonWord(lemma)) continue;
    const word = normalise(lemma, REQUIRED_LENGTH);
    if (word === null) continue;
    counts.set(word, (counts.get(word) ?? 0) + Number(count));
  }
  const negated = (word: string) => word.startsWith('NE') && counts.has(word.slice(2));
  const ranked = [...counts]
    .filter(([word]) => stems.has(word) && valid.has(word))
    .filter(([word]) => !blocked.has(word) && !deny.has(word) && !negated(word))
    .sort(([a, ca], [b, cb]) => cb - ca || (a < b ? -1 : 1))
    .map(([word]) => word);

  const words = new Set(ranked.slice(0, input.size));
  const rejectedAllows: string[] = [];
  for (const word of input.allow) {
    if (valid.has(word) && !blocked.has(word)) words.add(word);
    else rejectedAllows.push(word);
  }
  return { words: sortWords(words), rejectedAllows: sortWords(rejectedAllows) };
}

/** Overrides file: `+word` always in, `-word` never in. */
export function parseOverrides(text: string): { allow: Set<string>; deny: Set<string> } {
  const allow = new Set<string>();
  const deny = new Set<string>();
  for (const line of readWordLines(text)) {
    const sign = line[0];
    const word = toUpper(line.slice(1).trim());
    if (sign === '+') allow.add(word);
    else if (sign === '-') deny.add(word);
    else throw new Error(`Override must start with + or -: ${line}`);
  }
  return { allow, deny };
}
