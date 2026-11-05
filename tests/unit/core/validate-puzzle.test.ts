import { describe, expect, it } from 'vitest';
import { validatePuzzle, type Puzzle, type ValidationCode } from '../../../src/core';
import { puzzleFrom } from './helpers';

// 2×2 board:  N A
//             O M
const valid = () =>
  puzzleFrom(2, 'NAOM', [
    ['NAMO', [0, 1, 3, 2]],
    ['MONA', [3, 2, 0, 1]],
  ]);

function codes(puzzle: Puzzle, requiredWords?: Set<string>): ValidationCode[] {
  return validatePuzzle(puzzle, { requiredWords }).errors.map((e) => e.code);
}

describe('validatePuzzle', () => {
  it('accepts a valid puzzle', () => {
    expect(validatePuzzle(valid())).toEqual({ ok: true, errors: [] });
  });

  it('accepts crossing diagonals in one 2×2 square', () => {
    // NMOA uses diagonal 0–3 and AONM uses diagonal 1–2: an X in one square.
    const p = puzzleFrom(2, 'NAOM', [
      ['NMOA', [0, 3, 2, 1]],
      ['AONM', [1, 2, 0, 3]],
    ]);
    expect(p.bridges).toContainEqual([0, 3]);
    expect(p.bridges).toContainEqual([1, 2]);
    expect(validatePuzzle(p).ok).toBe(true);
  });

  it('rejects a bad size', () => {
    expect(codes({ ...valid(), size: 1 })).toEqual(['size']);
  });

  it('rejects the wrong number of letters', () => {
    expect(codes({ ...valid(), letters: ['N', 'A', 'O'] })).toContain('letterCount');
  });

  it('rejects letters outside the Lithuanian alphabet', () => {
    const p = valid();
    p.letters[2] = 'W';
    expect(codes(p)).toContain('invalidLetter');
    p.letters[2] = 'o';
    expect(codes(p)).toContain('invalidLetter');
  });

  it('rejects non-adjacent bridges', () => {
    // 3×3: tile 0 and tile 2 are in the same row but not touching.
    const p = puzzleFrom(3, 'NAMOSAKLE', [['NAMO', [0, 1, 2, 3]]]);
    expect(p.bridges).toContainEqual([2, 3]); // row end → next row start
    expect(codes(p)).toContain('bridgeNotNeighbours');
  });

  it('rejects bridges off the board, reversed or declared twice', () => {
    expect(codes({ ...valid(), bridges: [...valid().bridges, [3, 9]] })).toContain(
      'bridgeOffBoard',
    );
    const reversed = valid();
    reversed.bridges[0] = [1, 0];
    expect(codes(reversed)).toContain('bridgeOrder');
    expect(codes({ ...valid(), bridges: [...valid().bridges, [0, 1]] })).toContain(
      'bridgeDuplicate',
    );
  });

  it('rejects paths that do not spell their word', () => {
    const p = valid();
    p.words[0]!.path = [0, 1, 2, 3];
    expect(codes(p)).toContain('pathSpelling');
  });

  it('rejects paths of the wrong length', () => {
    const p = valid();
    p.words[0]!.path = [0, 1, 3];
    expect(codes(p)).toContain('pathLength');
  });

  it('rejects paths that reuse a tile', () => {
    const p = puzzleFrom(2, 'NAOM', [
      ['NAMO', [0, 1, 3, 2]],
      ['NANA', [0, 1, 0, 1]],
    ]);
    expect(codes(p)).toContain('pathRepeatsTile');
  });

  it('rejects path steps without a declared bridge', () => {
    const p = valid();
    p.bridges = p.bridges.filter(([a, b]) => !(a === 1 && b === 3));
    expect(codes(p)).toContain('pathMissingBridge');
  });

  it('rejects paths that leave the board', () => {
    const p = valid();
    p.words[1]!.path = [3, 2, 0, 7];
    expect(codes(p)).toContain('pathOffBoard');
  });

  it('rejects words under 4 letters', () => {
    const p = puzzleFrom(2, 'NAOM', [
      ['NAMO', [0, 1, 3, 2]],
      ['NAM', [0, 1, 3]],
    ]);
    expect(codes(p)).toEqual(['wordTooShort']);
  });

  it('rejects lowercase or non-Lithuanian words', () => {
    const p = valid();
    p.words[0]!.word = 'namo';
    expect(codes(p)).toContain('wordInvalid');
  });

  it('rejects duplicate words', () => {
    const p = puzzleFrom(2, 'NAOM', [
      ['NAMO', [0, 1, 3, 2]],
      ['NAMO', [0, 1, 3, 2]],
    ]);
    expect(codes(p)).toEqual(['wordDuplicate']);
  });

  it('rejects words missing from the required-word list, when one is given', () => {
    expect(codes(valid(), new Set(['NAMO']))).toEqual(['wordNotRequired']);
    expect(codes(valid(), new Set(['NAMO', 'MONA']))).toEqual([]);
  });

  it('rejects orphan tiles', () => {
    // 3×3 with only the top row and one more tile used.
    const p = puzzleFrom(3, 'NAMOSAKLE', [['NAMS', [0, 1, 2, 4]]]);
    const orphans = validatePuzzle(p)
      .errors.filter((e) => e.code === 'orphanTile')
      .map((e) => e.tile);
    expect(orphans).toEqual([3, 5, 6, 7, 8]);
  });

  it('rejects orphan bridges', () => {
    const p = valid();
    p.bridges.push([0, 3]);
    const errors = validatePuzzle(p).errors;
    expect(errors.map((e) => e.code)).toEqual(['orphanBridge']);
    expect(errors[0]!.bridge).toEqual([0, 3]);
  });

  it('gives a readable reason for every error', () => {
    const p = valid();
    p.letters[0] = 'X';
    for (const error of validatePuzzle(p).errors) expect(error.message.length).toBeGreaterThan(10);
  });

  it('works for a 5×5 board', () => {
    const p = puzzleFrom(5, 'NAMASOOOOOOOOOOOOOOOOOOOO', [['NAMAS', [0, 1, 2, 3, 4]]]);
    const result = validatePuzzle(p);
    expect(result.errors.filter((e) => e.code !== 'orphanTile')).toEqual([]);
    expect(result.errors.filter((e) => e.code === 'orphanTile')).toHaveLength(20);
  });
});
