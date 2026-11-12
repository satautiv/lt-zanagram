import {
  canUseDefinitionHint,
  canUseHint,
  definitionHintsLeft,
  hintTargetRevealed,
  hintsLeft,
  type GameState,
  type Puzzle,
} from '../core';
import { t } from '../i18n';

const ICONS = {
  // Three bars.
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  // A light bulb.
  hint: '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/><path d="M9.5 20h5"/>',
  // An open book.
  definition:
    '<path d="M12 6.5C10.3 5.2 7.9 4.5 4 4.5v13c3.9 0 6.3.7 8 2 1.7-1.3 4.1-2 8-2v-13c-3.9 0-6.3.7-8 2Z"/><path d="M12 6.5v13"/>',
  // A clockwise arrow around a square.
  rotate:
    '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  // A banner crossed out.
  removeAds: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M4 20 20 4"/>',
};

function iconButton(name: keyof typeof ICONS, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button ${name}-button`;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  return button;
}

export interface ToolbarActions {
  onMenu: () => void;
  onHint: () => void;
  onDefinitionHint: () => void;
  onRotate: () => void;
  /** Only while the `ads` flag is on; without it the "Remove ads" slot stays hidden. */
  onRemoveAds?: () => void;
}

/**
 * The toolbar above the status line (spec §5). Left: the menu (☰) and the optional timer. Right:
 * Rotate, Hint (a bulb with a badge of hints left), Definition hint (a book with a badge of uses
 * left, #83) and the reserved "Remove ads" slot, hidden
 * unless ads are on (spec §10).
 */
export class Toolbar {
  readonly element: HTMLElement;
  private readonly hintButton: HTMLButtonElement;
  private readonly badge: HTMLSpanElement;
  private readonly definitionButton: HTMLButtonElement;
  private readonly definitionBadge: HTMLSpanElement;
  private readonly timer: HTMLSpanElement;

  constructor(actions: ToolbarActions) {
    this.element = document.createElement('header');
    this.element.className = 'toolbar';

    const left = document.createElement('div');
    left.className = 'toolbar-side';
    const right = document.createElement('div');
    right.className = 'toolbar-side';

    const menu = iconButton('menu', t('menu.open'));
    menu.addEventListener('click', actions.onMenu);
    this.timer = document.createElement('span');
    this.timer.className = 'timer';
    this.timer.setAttribute('aria-label', t('toolbar.timer'));
    this.timer.setAttribute('role', 'timer');
    // Hidden by default ("Rodyti laikmatį" is off).
    this.timer.hidden = true;
    left.append(menu, this.timer);

    const rotate = iconButton('rotate', t('toolbar.rotate'));
    rotate.addEventListener('click', actions.onRotate);

    this.hintButton = iconButton('hint', t('toolbar.hint'));
    this.badge = document.createElement('span');
    this.badge.className = 'badge';
    this.badge.setAttribute('aria-hidden', 'true');
    this.hintButton.append(this.badge);
    this.hintButton.addEventListener('click', actions.onHint);

    this.definitionButton = iconButton('definition', t('toolbar.definitionHint'));
    this.definitionBadge = document.createElement('span');
    this.definitionBadge.className = 'badge';
    this.definitionBadge.setAttribute('aria-hidden', 'true');
    this.definitionButton.append(this.definitionBadge);
    this.definitionButton.addEventListener('click', actions.onDefinitionHint);

    const removeAds = iconButton('removeAds', t('toolbar.removeAds'));
    const onRemoveAds = actions.onRemoveAds;
    removeAds.hidden = onRemoveAds === undefined;
    if (onRemoveAds) removeAds.addEventListener('click', onRemoveAds);

    right.append(rotate, this.hintButton, this.definitionButton, removeAds);
    this.element.append(left, right);
  }

  setTime(text: string): void {
    this.timer.textContent = text;
  }

  setTimerVisible(visible: boolean): void {
    this.timer.hidden = !visible;
  }

  update(puzzle: Puzzle, state: GameState): void {
    const left = hintsLeft(puzzle, state);
    this.badge.textContent = String(left);
    this.hintButton.disabled = !canUseHint(puzzle, state);
    // A fully revealed target waits to be found; say so instead of looking broken.
    const note = hintTargetRevealed(puzzle, state)
      ? t('toolbar.hintFindFirst')
      : t('toolbar.hintsLeft', { n: left });
    this.hintButton.title = note;
    this.hintButton.setAttribute('aria-label', `${t('toolbar.hint')}. ${note}`);

    const definitions = definitionHintsLeft(puzzle, state);
    const definitionNote = t('toolbar.definitionsLeft', { n: definitions });
    this.definitionBadge.textContent = String(definitions);
    this.definitionButton.disabled = !canUseDefinitionHint(puzzle, state);
    this.definitionButton.title = definitionNote;
    this.definitionButton.setAttribute(
      'aria-label',
      `${t('toolbar.definitionHint')}. ${definitionNote}`,
    );
  }
}
