import { t } from '../i18n';

export interface PauseMenuActions {
  onOpen: () => void;
  onClose: () => void;
  onGiveUp: () => void;
}

function button(label: string, className = 'menu-item'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  return b;
}

/**
 * The pause menu opened from ☰ (spec §5): it pauses the game and blurs the board behind it. Give up
 * asks for confirmation inside the menu, never with a browser dialog, which would block input.
 */
export class PauseMenu {
  readonly element: HTMLDialogElement;
  private readonly main: HTMLElement;
  private readonly confirm: HTMLElement;

  constructor(private readonly actions: PauseMenuActions) {
    this.element = document.createElement('dialog');
    this.element.className = 'pause-menu';
    this.element.setAttribute('aria-labelledby', 'pause-title');

    const title = document.createElement('h2');
    title.id = 'pause-title';
    title.className = 'menu-title';
    title.textContent = t('menu.paused');

    this.main = document.createElement('div');
    this.main.className = 'menu-items';
    const soon = (label: string) => {
      const item = button(label);
      item.disabled = true;
      item.title = t('menu.soon');
      return item;
    };
    const giveUp = button(t('menu.giveUp'));
    giveUp.addEventListener('click', () => this.showConfirm(true));
    const resume = button(t('menu.resume'), 'menu-item is-primary');
    resume.addEventListener('click', () => this.close());
    // How to play, settings and the archive arrive with their own tickets.
    this.main.append(
      soon(t('menu.howToPlay')),
      soon(t('menu.settings')),
      soon(t('menu.archive')),
      giveUp,
      resume,
    );

    this.confirm = document.createElement('div');
    this.confirm.className = 'menu-items';
    this.confirm.hidden = true;
    const question = document.createElement('p');
    question.className = 'menu-question';
    question.textContent = t('giveUp.question');
    const yes = button(t('giveUp.confirm'), 'menu-item is-danger');
    yes.addEventListener('click', () => {
      this.close();
      this.actions.onGiveUp();
    });
    const no = button(t('giveUp.cancel'));
    no.addEventListener('click', () => this.showConfirm(false));
    this.confirm.append(question, yes, no);

    this.element.append(title, this.main, this.confirm);
    // Escape and backdrop clicks close it like Tęsti.
    this.element.addEventListener('close', () => this.actions.onClose());
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.close();
    });
  }

  get isOpen(): boolean {
    return this.element.open;
  }

  open(): void {
    if (this.element.open) return;
    this.showConfirm(false);
    this.element.showModal();
    this.actions.onOpen();
  }

  close(): void {
    if (this.element.open) this.element.close();
  }

  private showConfirm(show: boolean): void {
    this.main.hidden = show;
    this.confirm.hidden = !show;
  }
}
