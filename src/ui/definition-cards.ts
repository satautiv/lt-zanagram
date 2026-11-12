import { shownDefinitions, type GameState, type Puzzle } from '../core';
import { t } from '../i18n';

/**
 * The definitions definition hints have shown (spec §5 Definition hint, #83), under the board: the
 * definition and the word's length, never the word. A card goes once its word is found.
 */
export class DefinitionCards {
  readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('ul');
    this.element.className = 'definition-cards';
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-label', t('definitionHint.title'));
    this.element.hidden = true;
  }

  update(puzzle: Puzzle, state: GameState): void {
    const shown = shownDefinitions(puzzle, state);
    this.element.replaceChildren(
      ...shown.map(({ definition, letters }) => {
        const card = document.createElement('li');
        card.className = 'definition-card';
        const label = document.createElement('span');
        label.className = 'definition-card-label';
        label.textContent = t('definitionHint.label', {
          letters: t('count.letters', { n: letters }),
        });
        card.append(label, definition);
        return card;
      }),
    );
    this.element.hidden = shown.length === 0;
  }
}
