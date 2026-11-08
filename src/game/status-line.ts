/** Colours for feedback messages (spec §4). */
export type Tone = 'ok' | 'extra' | 'warn' | 'error';

const FLASH_MS = 1200;

/**
 * The line above the board: "Liko N žodžių" by default, the word being built in the accent colour,
 * or a short feedback message that returns to the count after ~1.2 s.
 */
export class StatusLine {
  readonly element: HTMLElement;
  private resting = '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'status';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
  }

  /** The text shown when nothing else is: normally the words-left count. */
  setResting(text: string): void {
    this.resting = text;
    if (this.timer === undefined) this.show(text);
  }

  building(word: string): void {
    this.cancelFlash();
    this.show(word, 'building');
  }

  idle(): void {
    if (this.timer === undefined) this.show(this.resting);
  }

  flash(message: string, tone: Tone): void {
    this.cancelFlash();
    this.show(message, tone);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.show(this.resting);
    }, FLASH_MS);
  }

  private cancelFlash(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private show(text: string, tone?: Tone | 'building'): void {
    this.element.textContent = text;
    if (tone) this.element.dataset.tone = tone;
    else delete this.element.dataset.tone;
  }
}
