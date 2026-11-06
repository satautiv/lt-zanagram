import { describe, expect, it } from 'vitest';
import {
  attestedForms,
  buildRequired,
  buildValid,
  isCommonWord,
  normalise,
  parseOverrides,
  VALID_LENGTH,
} from '../../../tools/wordlists/build';
import { expand, parseAff, parseDic } from '../../../tools/wordlists/hunspell';

// A tiny slice of lt_LT's rules: noun endings, the negation prefix, a verb conjugation.
const aff = parseAff(`SET UTF-8
PFX N Y 1
PFX N 0       ne              .

SFX D Y 3
SFX D as      o               as     # comment
SFX D as      ui              as
SFX D 0       s               [^s]

SFX T Y 2
SFX T ti      u               ti
SFX T ti      sime            ti
`);

describe('Hunspell expansion', () => {
  it('reads the dictionary, word and flags', () => {
    expect(parseDic('3\nnamas/D\nlabai\nAB\n')).toEqual([
      { word: 'namas', flags: 'D' },
      { word: 'labai', flags: '' },
      { word: 'AB', flags: '' },
    ]);
  });

  it('applies suffixes whose condition matches, stripping as told', () => {
    expect(expand({ word: 'namas', flags: 'D' }, aff)).toEqual(['namas', 'namo', 'namui']);
  });

  it('combines cross-product prefixes and suffixes', () => {
    expect(expand({ word: 'eiti', flags: 'TN' }, aff).sort()).toEqual(
      ['eisime', 'eiti', 'eiu', 'neeisime', 'neeiti', 'neeiu'].sort(),
    );
  });

  it('rejects continuation flags it cannot expand', () => {
    expect(() => parseAff('SFX Z Y 1\nSFX Z 0 s/Y .\n')).toThrow(/Continuation/);
  });
});

describe('word filters', () => {
  it('normalises to upper case Lithuanian letters within a length range', () => {
    expect(normalise('žąsis', VALID_LENGTH)).toBe('ŽĄSIS');
    expect(normalise('ąžuolas', { min: 4, max: 6 })).toBeNull();
    expect(normalise('kas', VALID_LENGTH)).toBeNull();
    for (const bad of ['rock-n-rolas', "o'neilas", 'watas', 'xeroxas', 'covid19']) {
      expect(normalise(bad, VALID_LENGTH)).toBeNull();
    }
  });

  it('drops proper nouns and abbreviations', () => {
    expect(isCommonWord('namas')).toBe(true);
    expect(isCommonWord('Vilnius')).toBe(false);
    expect(isCommonWord('AB')).toBe(false);
    expect(isCommonWord('pvz.')).toBe(false);
  });

  it('keeps corpus forms seen often enough', () => {
    const corpus = 'namas 120\r\nnamo 2\r\nnamui 1\r\n';
    expect([...attestedForms(corpus, 2)]).toEqual(['namas', 'namo']);
  });
});

describe('valid.txt', () => {
  const dictionary = parseDic('4\nnamas/D\nnamelis\nVilnius/D\nkurvas/D\n');
  const attested = new Set(['namas', 'namo', 'namui', 'namelis', 'vilnius', 'kurvas', 'kurvo']);

  it('keeps attested forms of common words, sorted', () => {
    const valid = buildValid({ dictionary, affixes: aff, attested, blocked: new Set() });
    expect(valid).toEqual(['KURVAS', 'KURVO', 'NAMAS', 'NAMELIS', 'NAMO', 'NAMUI']);
  });

  it('leaves out every form of a blocked word', () => {
    const valid = buildValid({ dictionary, affixes: aff, attested, blocked: new Set(['KURVO']) });
    expect(valid).toEqual(['NAMAS', 'NAMELIS', 'NAMO', 'NAMUI']);
  });
});

describe('required.txt', () => {
  const dictionary = parseDic('8\nnamas\nbūti\nnebūti\nlabai\nmedis\ngeras\nsavęs\nVilnius\n');
  const lemmaList = [
    'būti\t3000',
    'Vilnius\t2500',
    'savęs\t2000',
    'nebūti\t1500',
    'namas\t900',
    'labai\t900',
    'medis\t100',
    'geras\t50',
  ].join('\n');
  const valid = new Set(['NAMAS', 'BŪTI', 'NEBŪTI', 'LABAI', 'MEDIS', 'GERAS', 'SAVĘS']);
  const base = {
    lemmaList,
    dictionary,
    valid,
    blocked: new Set<string>(),
    allow: new Set<string>(),
    deny: new Set<string>(),
  };

  it('keeps the most frequent common lemmas, ties in word order, then sorts', () => {
    expect(buildRequired({ ...base, size: 4 }).words).toEqual(['BŪTI', 'LABAI', 'NAMAS', 'SAVĘS']);
  });

  it('drops negated forms of listed lemmas, denied and blocked words', () => {
    const { words } = buildRequired({
      ...base,
      deny: new Set(['SAVĘS']),
      blocked: new Set(['NAMAS']),
      size: 3,
    });
    expect(words).toEqual(['BŪTI', 'LABAI', 'MEDIS']);
  });

  it('adds allowed words beyond the top band, but only valid ones', () => {
    const { words, rejectedAllows } = buildRequired({
      ...base,
      allow: new Set(['GERAS', 'ŽODIS']),
      size: 1,
    });
    expect(words).toEqual(['BŪTI', 'GERAS']);
    expect(rejectedAllows).toEqual(['ŽODIS']);
  });

  it('reads overrides with + and -', () => {
    const { allow, deny } = parseOverrides('# comment\n+geras\n-savęs  # pronoun\n');
    expect([...allow]).toEqual(['GERAS']);
    expect([...deny]).toEqual(['SAVĘS']);
    expect(() => parseOverrides('geras')).toThrow(/\+ or -/);
  });
});
