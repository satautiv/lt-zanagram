import { displayTime, formatClock, type GameState, type Puzzle } from '../core';
import { t } from '../i18n';

/**
 * The short plain-text result a player shares (spec §9 Sharing), e.g.
 * "Žodžių tiltai, 2026-11-05: 02:04, 2 patarimai, 2 papildomi žodžiai" and the game URL on the
 * next line. Definition hints are counted only when used (#83). A given-up puzzle says so instead
 * of giving a time. Never includes the words.
 */
export function shareText(puzzle: Puzzle, state: GameState, url: string): string {
  const result = t('share.text', {
    title: t('app.title'),
    date: puzzle.id,
    time: state.status === 'gaveUp' ? t('share.gaveUp') : formatClock(displayTime(state)),
    hints: [
      t('count.hints', { n: state.hintsUsed }),
      ...(state.definitionsShown.length > 0
        ? [t('count.definitions', { n: state.definitionsShown.length })]
        : []),
    ].join(', '),
    extras: t('count.extras', { n: state.extras.length }),
  });
  return `${result}\n${url}`;
}
