import { plural, type PluralForms } from './plural';

/** A UI string: plain text, or one variant per plural form. `{name}` placeholders are filled in. */
export type Message = string | PluralForms;
export type Messages = Readonly<Record<string, Message>>;
export type Params = Readonly<Record<string, string | number>>;

/**
 * Builds a lookup over a strings file such as `lt.json`. Plural messages pick their form from
 * `params.n`. Unknown keys throw, so a missing string fails tests instead of showing a key.
 */
export function createTranslator<M extends Messages>(messages: M) {
  return function t(key: keyof M & string, params: Params = {}): string {
    const message = messages[key];
    if (message === undefined) throw new Error(`Missing UI string: ${key}`);
    let text: string;
    if (typeof message === 'string') {
      text = message;
    } else {
      if (typeof params.n !== 'number')
        throw new Error(`Plural UI string ${key} needs a numeric n`);
      text = plural(params.n, message);
    }
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}

const longDate = new Intl.DateTimeFormat('lt-LT', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** "2026 m. lapkričio 5 d." for a local calendar date (spec §6). */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}
