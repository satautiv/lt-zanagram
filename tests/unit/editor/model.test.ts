import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  analyse,
  emptyDraft,
  fromPuzzle,
  repath,
  setCanonicalPath,
  setDefinition,
  setLetter,
  toggleBridge,
  toggleRequired,
  type Draft,
} from '../../../editor/model';
import { WordList, type Puzzle } from '../../../src/core';

const fixture = JSON.parse(
  readFileSync(new URL('../../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const lexicon = new WordList(['NAMAS', 'NAMO', 'MANO', ...fixture.words.map((w) => w.word)]);

/** NAMA on the top row and S under the last A, bridged into NAMAS. */
function namasBoard(): Draft {
  let draft = emptyDraft('2026-12-01');
  [...'NAMA'].forEach((letter, tile) => (draft = setLetter(draft, tile, letter)));
  draft = setLetter(draft, 7, 'S');
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 7],
  ] as const) {
    draft = toggleBridge(draft, a, b);
  }
  return draft;
}

describe('editor model', () => {
  it('lists traceable words, longest first, ignoring empty tiles', () => {
    const { traceable } = analyse(namasBoard(), { valid: lexicon });
    expect([...traceable.keys()]).toEqual(['NAMAS']); // NAMO and MANO need an O
    expect(traceable.get('NAMAS')).toEqual([[0, 1, 2, 3, 7]]);
  });

  it('ticking a required word takes its path; unticking removes it', () => {
    let draft = namasBoard();
    const { traceable } = analyse(draft, { valid: lexicon });
    draft = toggleRequired(draft, 'NAMAS', traceable.get('NAMAS')!);
    expect(draft.required.get('NAMAS')).toEqual({ path: [0, 1, 2, 3, 7], definition: '' });
    draft = toggleRequired(draft, 'NAMAS', traceable.get('NAMAS')!);
    expect(draft.required.size).toBe(0);
  });

  it('reports orphan tiles and bridges, word not in list and blocked words', () => {
    let draft = toggleBridge(namasBoard(), 4, 5);
    draft = setLetter(draft, 4, 'K');
    draft = setLetter(draft, 5, 'O');
    draft = toggleRequired(draft, 'NAMAS', [[0, 1, 2, 3, 7]]);
    const analysis = analyse(draft, {
      valid: lexicon,
      requiredWords: new Set(['NAMO']),
      blocked: new WordList(['NAMA']),
    });
    expect([...analysis.orphanTiles].sort((a, b) => a - b)).toContain(4);
    expect([...analysis.orphanBridges]).toEqual(['4-5']);
    expect(analysis.notInList).toEqual(['NAMAS']);
    expect(analysis.blocked).toEqual(['NAMA']);
  });

  it('round-trips a puzzle: same board, words, paths and definitions, valid', () => {
    const draft = setDefinition(fromPuzzle(fixture), fixture.words[0]!.word, 'Apibrėžimas.');
    const { puzzle, errors } = analyse(draft, { valid: lexicon });
    expect(errors).toEqual([]);
    expect(puzzle.letters).toEqual(fixture.letters);
    expect(puzzle.words.map((w) => [w.word, w.path])).toEqual(
      fixture.words.map((w) => [w.word, w.path]),
    );
    expect(puzzle.words[0]!.definition).toBe('Apibrėžimas.');
    expect(puzzle.extras).not.toContain(fixture.words[0]!.word);
  });

  it('picks a canonical path, and moves to another when an edit breaks it', () => {
    // A second A on tile 5, bridged N–A–M, gives NAMAS two paths.
    let draft = namasBoard();
    draft = setLetter(draft, 5, 'A');
    draft = toggleBridge(draft, 0, 5);
    draft = toggleBridge(draft, 2, 5);
    let { traceable } = analyse(draft, { valid: lexicon });
    expect(traceable.get('NAMAS')).toHaveLength(2);
    draft = toggleRequired(draft, 'NAMAS', traceable.get('NAMAS')!);
    draft = setCanonicalPath(draft, 'NAMAS', [0, 5, 2, 3, 7]);
    expect(draft.required.get('NAMAS')!.path).toEqual([0, 5, 2, 3, 7]);

    draft = toggleBridge(draft, 0, 5); // breaks the chosen path
    ({ traceable } = analyse(draft, { valid: lexicon }));
    expect(repath(draft, traceable).required.get('NAMAS')!.path).toEqual([0, 1, 2, 3, 7]);
  });
});
