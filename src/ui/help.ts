import { MAX_HINTS } from '../core';
import { t, type StringKey } from '../i18n';

type Params = Parameters<typeof t>[1];

/** Where the word-list credits live in full (CC BY attribution, ticket #26). */
export const LICENSES_URL = 'https://github.com/satautiv/lt-zanagram/blob/main/data/LICENSES.md';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Splits a `a|b|c` string into its parts, as `feedback.praise` does. */
const parts = (key: StringKey, params?: Params) => t(key, params).split('|');

/** A modal with a title, some content and one "Supratau" button. */
export class InfoDialog {
  readonly element: HTMLDialogElement;

  constructor(id: string, title: string, content: Node[], onClose: () => void) {
    this.element = el('dialog', `info-dialog ${id}`);
    this.element.setAttribute('aria-labelledby', `${id}-title`);
    const heading = el('h2', 'menu-title', title);
    heading.id = `${id}-title`;
    const ok = el('button', 'menu-item is-primary', t('dialog.ok'));
    ok.type = 'button';
    ok.addEventListener('click', () => this.element.close());
    this.element.append(heading, ...content, ok);
    this.element.addEventListener('close', onClose);
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.element.close();
    });
  }

  open(): void {
    if (!this.element.open) this.element.showModal();
  }
}

/**
 * Kaip žaisti (spec §5 How to play): the rules of spec §2 in Lithuanian, the "start from rare
 * letters" tip, and the word-list sources.
 */
export function howToPlay(onClose: () => void): InfoDialog {
  const rules = el('ul', 'how-to-rules');
  for (const rule of parts('howTo.rules', { hints: t('howTo.hints', { n: MAX_HINTS }) }))
    rules.append(el('li', '', rule));

  const sources = el('section', 'how-to-sources');
  const link = el('a', '', t('howTo.licences'));
  link.href = LICENSES_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  const credit = el('p', '', `${t('howTo.sourcesText')} `);
  credit.append(link);
  sources.append(el('h3', 'results-heading', t('howTo.sources')), credit);

  return new InfoDialog(
    'how-to',
    t('howTo.title'),
    [rules, el('p', 'how-to-tip', t('howTo.tip')), sources],
    onClose,
  );
}

/** Shown once, for the first extra word ever found (spec §4). */
export function aboutExtras(onClose: () => void): InfoDialog {
  const content = parts('extraInfo.text').map((text) => el('p', 'info-text', text));
  return new InfoDialog('extra-info', t('extraInfo.title'), content, onClose);
}
