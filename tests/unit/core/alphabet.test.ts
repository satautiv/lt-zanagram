import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  DIACRITIC_VARIANTS,
  isLetter,
  isLithuanianWord,
  toLetters,
  toLower,
  toUpper,
  variantsOf,
} from '../../../src/core';

describe('alphabet', () => {
  it('has exactly the 32 Lithuanian letters', () => {
    expect(ALPHABET).toHaveLength(32);
    expect(ALPHABET.join('')).toBe('AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ');
    expect(new Set(ALPHABET).size).toBe(32);
  });

  it('rejects Q, W and X and lowercase', () => {
    for (const ch of ['Q', 'W', 'X', 'a', 'š', '1', ' ']) expect(isLetter(ch)).toBe(false);
    expect(isLetter('Ė')).toBe(true);
  });
});

describe('normalisation', () => {
  it('uppercases Lithuanian letters', () => {
    expect(toUpper('ąčęėįšųūž')).toBe('ĄČĘĖĮŠŲŪŽ');
    expect(toLower('ŠUO')).toBe('šuo');
  });

  it('turns combining accents into precomposed letters', () => {
    const decomposed = 'šuo'; // s + combining caron
    expect(decomposed).toHaveLength(4);
    expect(toUpper(decomposed)).toBe('ŠUO');
    expect(toLetters('ė')).toEqual(['Ė']); // e + combining dot above
  });

  it('splits words into letters and rejects foreign characters', () => {
    expect(toLetters(' namas ')).toEqual(['N', 'A', 'M', 'A', 'S']);
    expect(toLetters('wifi')).toBeNull();
    expect(toLetters('ne-ne')).toBeNull();
    expect(isLithuanianWord('žąsis')).toBe(true);
    expect(isLithuanianWord('')).toBe(false);
  });
});

describe('diacritic fallback map', () => {
  it('matches spec §6', () => {
    expect(DIACRITIC_VARIANTS).toEqual({
      A: ['Ą'],
      C: ['Č'],
      E: ['Ę', 'Ė'],
      I: ['Į'],
      S: ['Š'],
      U: ['Ų', 'Ū'],
      Z: ['Ž'],
    });
  });

  it('never maps I and Y to each other', () => {
    expect(variantsOf('I')).not.toContain('Y');
    expect(variantsOf('Y')).toEqual([]);
  });

  it('only maps to real letters', () => {
    for (const variants of Object.values(DIACRITIC_VARIANTS)) {
      for (const v of variants ?? []) expect(isLetter(v)).toBe(true);
    }
  });
});
