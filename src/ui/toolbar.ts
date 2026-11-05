import { hintsLeft, type GameState } from '../core';
import { t } from '../i18n';

const ICONS = {
  // A light bulb.
  hint: '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/><path d="M9.5 20h5"/>',
  // A clockwise arrow around a square.
  rotate:
    '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
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
  onHint: () => void;
  onRotate: () => void;
}

/**
 * The toolbar above the status line (spec §5). Right side: Rotate and Hint (a bulb with a badge
 * of hints left). The menu, timer and "Remove ads" slots arrive with their own tickets.
 */
export class Toolbar {
  readonly element: HTMLElement;
  private readonly hintButton: HTMLButtonElement;
  private readonly badge: HTMLSpanElement;

  constructor(actions: ToolbarActions) {
    this.element = document.createElement('header');
    this.element.className = 'toolbar';

    const left = document.createElement('div');
    left.className = 'toolbar-side';
    const right = document.createElement('div');
    right.className = 'toolbar-side';

    const rotate = iconButton('rotate', t('toolbar.rotate'));
    rotate.addEventListener('click', actions.onRotate);

    this.hintButton = iconButton('hint', t('toolbar.hint'));
    this.badge = document.createElement('span');
    this.badge.className = 'badge';
    this.badge.setAttribute('aria-hidden', 'true');
    this.hintButton.append(this.badge);
    this.hintButton.addEventListener('click', actions.onHint);

    right.append(rotate, this.hintButton);
    this.element.append(left, right);
  }

  update(state: GameState): void {
    const left = hintsLeft(state);
    this.badge.textContent = String(left);
    this.hintButton.disabled = left === 0 || state.status !== 'playing';
    this.hintButton.title = t('toolbar.hintsLeft', { n: left });
    this.hintButton.setAttribute(
      'aria-label',
      `${t('toolbar.hint')}. ${t('toolbar.hintsLeft', { n: left })}`,
    );
  }
}
