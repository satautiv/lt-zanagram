import { describe, expect, it } from 'vitest';
import {
  backspace,
  candidates,
  emptySearch,
  highlighted,
  newGame,
  spell,
  submit,
  typeLetter,
  visibility,
  type Puzzle,
  type TypingSearch,
} from '../../../src/core';
import { puzzleFrom } from './helpers';

function type(puzzle: Puzzle, text: string, state = newGame(puzzle)): TypingSearch {
  const visible = visibility(puzzle, state);
  let search = emptySearch();
  for (const ch of text) search = typeLetter(puzzle, visible, search, ch);
  return search;
}

function shown(puzzle: Puzzle, search: TypingSearch, state = newGame(puzzle)): string {
  const path = highlighted(puzzle, state, search);
  return path ? spell(puzzle, path) : '';
}

// 3×3:  R O D     RODA 0 1 2 5
//       V A A     VORA 3 1 0 4     V is not bridged after D.
//       . . .
const rodv = () =>
  puzzleFrom(3, 'RODVAAKKK', [
    ['RODA', [0, 1, 2, 5]],
    ['VORA', [3, 1, 0, 4]],
  ]);

describe('typing search', () => {
  it('ignores a letter that cannot extend any path (milestone 1)', () => {
    const p = rodv();
    const search = type(p, 'RODV');
    expect(shown(p, search)).toBe('ROD');
    expect(candidates(search)).toEqual([[0, 1, 2]]);
  });

  it('starts from every visible tile with the first letter', () => {
    const p = rodv();
    expect(candidates(type(p, 'A')).sort()).toEqual([[4], [5]]);
  });

  it('accepts lowercase and combining-accent input', () => {
    const p = rodv();
    expect(shown(p, type(p, 'roda'))).toBe('RODA');
  });

  it('only follows visible tiles and bridges', () => {
    const p = rodv();
    const state = submit(p, newGame(p), [0, 1, 2, 5]).state; // RODA found: D and its bridges go
    expect(shown(p, type(p, 'ROD', state), state)).toBe('RO');
  });

  it('removes one letter with backspace', () => {
    const p = rodv();
    const search = backspace(type(p, 'ROD'));
    expect(shown(p, search)).toBe('RO');
    expect(backspace(emptySearch())).toEqual(emptySearch());
  });

  it('ignores characters that are not Lithuanian letters', () => {
    const p = rodv();
    expect(type(p, 'R1 -')).toEqual(type(p, 'R'));
  });
});

describe('diacritic fallback', () => {
  // 3×3:  A S K     ASKO 0 1 2 5
  //       Š U O     AŠUO 0 3 4 5
  const both = () =>
    puzzleFrom(3, 'ASKŠUONNN', [
      ['ASKO', [0, 1, 2, 5]],
      ['AŠUO', [0, 3, 4, 5]],
    ]);

  it('prefers a plain S when one continues the path (milestone 1)', () => {
    const p = both();
    expect(candidates(type(p, 'AS'))).toEqual([[0, 1]]);
    expect(shown(p, type(p, 'ASKO'))).toBe('ASKO');
  });

  it('uses Š for a typed S only when no plain S continues (milestone 1)', () => {
    // 2×2:  A Š     AŠUO 0 1 3 2
    //       O U
    const p = puzzleFrom(2, 'AŠOU', [['AŠUO', [0, 1, 3, 2]]]);
    const search = type(p, 'ASUO');
    expect(shown(p, search)).toBe('AŠUO'); // the status line shows the real tile letters
  });

  it('typing SUO on an Š-U-O path shows ŠUO', () => {
    const p = puzzleFrom(2, 'ŠUAO', [['ŠUOA', [0, 1, 3, 2]]]);
    expect(shown(p, type(p, 'SUO'))).toBe('ŠUO');
  });

  it('tries both E variants', () => {
    // 2×2:  N Ė     NĖRA 0 1 3 2
    //       A R
    const p = puzzleFrom(2, 'NĖAR', [['NĖRA', [0, 1, 3, 2]]]);
    expect(shown(p, type(p, 'NERA'))).toBe('NĖRA');
  });

  it('never treats I and Y as the same letter', () => {
    // 2×2:  T Y     TYLA 0 1 3 2
    //       A L
    const p = puzzleFrom(2, 'TYAL', [['TYLA', [0, 1, 3, 2]]]);
    expect(shown(p, type(p, 'TI'))).toBe('T');
  });
});

describe('highlighting', () => {
  // 2×2:  N A     NAMA canonical 0 1 3 2; MANA 3 2 0 1. Typing NA can start 0→1 or 0→2.
  //       A M
  const twoWays = () =>
    puzzleFrom(2, 'NAAM', [
      ['NAMA', [0, 1, 3, 2]],
      ['MANA', [3, 2, 0, 1]],
    ]);

  it('prefers the path that follows an unfound required word canonical path', () => {
    const p = twoWays();
    const search = type(p, 'NAM');
    expect(candidates(search)).toHaveLength(2);
    expect(highlighted(p, newGame(p), search)).toEqual([0, 1, 3]);
  });

  it('returns null when nothing is typed', () => {
    const p = twoWays();
    expect(highlighted(p, newGame(p), emptySearch())).toBeNull();
  });
});
