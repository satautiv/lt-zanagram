import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../../src/core';
import { shareText } from '../../../src/game/share';
import { FIXTURES } from '../../../src/game/fixtures';

const puzzle = FIXTURES[0]!;
const url = 'https://satautiv.github.io/lt-zanagram/';

function finished(change: Partial<GameState>): GameState {
  return { ...newGame(puzzle), status: 'solved', ...change };
}

describe('shareText', () => {
  it('gives the date, the final time, hints and extras, then the game URL', () => {
    const state = finished({
      elapsedMs: 144_000, // 02:24 raw, minus 2 × 10 s for the extras
      hintsUsed: 2,
      extras: ['aaaa', 'bbbb'],
    });
    expect(shareText(puzzle, state, url)).toBe(
      `Žodžių tiltai, ${puzzle.id}: 02:04, 2 patarimai, 2 papildomi žodžiai\n${url}`,
    );
  });

  it('uses the plural helper for every count', () => {
    const one = shareText(puzzle, finished({ hintsUsed: 1, extras: ['aaaa'] }), url);
    expect(one).toContain('1 patarimas, 1 papildomas žodis');
    const none = shareText(puzzle, finished({ hintsUsed: 0, extras: [] }), url);
    expect(none).toContain('0 patarimų, 0 papildomų žodžių');
  });

  it('counts definition hints only when used (#83)', () => {
    const used = shareText(puzzle, finished({ hintsUsed: 1, definitionsShown: ['A', 'B'] }), url);
    expect(used).toContain(': 00:00, 1 patarimas, 2 apibrėžimai, 0 papildomų žodžių');
    const unused = shareText(puzzle, finished({ hintsUsed: 1 }), url);
    expect(unused).not.toContain('apibrėžim');
  });

  it('says the puzzle was given up instead of giving a time', () => {
    const state = finished({ status: 'gaveUp', elapsedMs: 60_000, hintsUsed: 3 });
    expect(shareText(puzzle, state, url)).toBe(
      `Žodžių tiltai, ${puzzle.id}: pasiduota, 3 patarimai, 0 papildomų žodžių\n${url}`,
    );
  });

  it('never includes the words', () => {
    const state = finished({
      found: puzzle.words.map((w) => ({ word: w.word, atMs: 0 })),
      extras: [...puzzle.extras],
    });
    const text = shareText(puzzle, state, url).toLocaleLowerCase('lt-LT');
    for (const word of [...puzzle.words.map((w) => w.word), ...puzzle.extras]) {
      expect(text).not.toContain(word.toLocaleLowerCase('lt-LT'));
    }
  });
});
