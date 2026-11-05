import { t } from '../i18n';

export interface PauseMenuActions {
  /** Builds the settings view shown by "Nustatymai". */
  settings: () => HTMLElement;
  onOpen: () => void;
  onClose: () => void;
  onGiveUp: () => void;
  onArchive: () => void;
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
  private readonly settingsView: HTMLElement;
  private readonly title: HTMLElement;

  constructor(private readonly actions: PauseMenuActions) {
    this.element = document.createElement('dialog');
    this.element.className = 'pause-menu';
    this.element.setAttribute('aria-labelledby', 'pause-title');

    const title = document.createElement('h2');
    title.id = 'pause-title';
    title.className = 'menu-title';
    title.textContent = t('menu.paused');
    this.title = title;

    this.main = document.createElement('div');
    this.main.className = 'menu-items';
    const soon = (label: string) => {
      const item = button(label);
      item.disabled = true;
      item.title = t('menu.soon');
      return item;
    };
    const settings = button(t('menu.settings'));
    settings.addEventListener('click', () => this.show('settings'));
    const archive = button(t('menu.archive'));
    archive.addEventListener('click', () => {
      this.close();
      this.actions.onArchive();
    });
    const giveUp = button(t('menu.giveUp'));
    giveUp.addEventListener('click', () => this.show('confirm'));
    const resume = button(t('menu.resume'), 'menu-item is-primary');
    resume.addEventListener('click', () => this.close());
    // How to play arrives with the tutorial ticket.
    this.main.append(soon(t('menu.howToPlay')), settings, archive, giveUp, resume);

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
    no.addEventListener('click', () => this.show('main'));
    this.confirm.append(question, yes, no);

    this.settingsView = document.createElement('div');
    this.settingsView.className = 'menu-items';
    this.settingsView.hidden = true;
    const back = button(t('settings.back'));
    back.addEventListener('click', () => this.show('main'));
    this.settingsView.append(actions.settings(), back);

    this.element.append(title, this.main, this.confirm, this.settingsView);
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
    this.show('main');
    this.element.showModal();
    this.actions.onOpen();
  }

  close(): void {
    if (this.element.open) this.element.close();
  }

  private show(view: 'main' | 'confirm' | 'settings'): void {
    this.main.hidden = view !== 'main';
    this.confirm.hidden = view !== 'confirm';
    this.settingsView.hidden = view !== 'settings';
    this.title.textContent = view === 'settings' ? t('settings.title') : t('menu.paused');
  }
}
