import { BoardView } from '../game/board-view';
import { GameController } from '../game/controller';
import { attachKeyboardInput } from '../game/keyboard-input';
import { attachPointerInput } from '../game/pointer-input';
import { StatusLine } from '../game/status-line';
import { TUTORIAL_PUZZLE, tutorialStart, tutorialStep, type TutorialStep } from '../game/tutorial';
import { t } from '../i18n';

function stepText(step: TutorialStep): string {
  switch (step.kind) {
    case 'drag':
      return t('tutorial.drag', { word: step.word });
    case 'type':
      return t('tutorial.type', { word: step.word });
    case 'last':
      return t('tutorial.last');
    case 'done':
      return t('tutorial.done');
  }
}

/**
 * The first-visit tutorial (spec §5 Tutorial): a 3×3 board in a modal with guided steps (drag
 * this path, see it disappear, now type a word, find the last one alone). It plays with the real
 * board, input and rules. Skipping, Escape and finishing all close it; `onFinish` runs once.
 */
export class Tutorial {
  readonly element: HTMLDialogElement;

  constructor(onFinish: () => void) {
    this.element = document.createElement('dialog');
    this.element.className = 'tutorial';
    this.element.setAttribute('aria-labelledby', 'tutorial-title');

    const title = document.createElement('h2');
    title.id = 'tutorial-title';
    title.className = 'menu-title';
    title.textContent = t('tutorial.title');

    const instruction = document.createElement('p');
    instruction.className = 'tutorial-step';
    instruction.setAttribute('aria-live', 'polite');

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'menu-item';
    skip.textContent = t('tutorial.skip');
    skip.addEventListener('click', () => this.element.close());

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'menu-item is-primary';
    start.textContent = t('tutorial.start');
    start.hidden = true;
    start.addEventListener('click', () => this.element.close());

    const status = new StatusLine();
    const board = new BoardView(TUTORIAL_PUZZLE);
    const show = (step: TutorialStep) => {
      instruction.textContent = stepText(step);
      if (step.kind !== 'done') return;
      skip.hidden = true;
      start.hidden = false;
      start.focus();
    };
    const game = new GameController(
      TUTORIAL_PUZZLE,
      board,
      status,
      { onChange: (state) => show(tutorialStep(state)) },
      tutorialStart(),
    );
    show(tutorialStep(game.state));
    attachPointerInput(board, game);
    const detachKeys = attachKeyboardInput(game, { paused: () => !this.element.open });

    const play = document.createElement('div');
    play.className = 'tutorial-play';
    play.append(status.element, board.svg);
    this.element.append(title, instruction, play, skip, start);

    this.element.addEventListener('close', () => {
      detachKeys();
      this.element.remove();
      onFinish();
    });
  }

  open(): void {
    this.element.showModal();
  }
}
