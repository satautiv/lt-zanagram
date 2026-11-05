import { readPuzzle, type Puzzle } from '../../core';
import nov6 from './2026-11-06.json';
import nov7 from './2026-11-07.json';
import nov8 from './2026-11-08.json';

/**
 * Hand-checked test puzzles (milestone 2), kept plain rather than obfuscated (ADR-0001 allows it
 * for fixtures). Every word is a common Lithuanian base form with an original definition.
 */
export const FIXTURES: Puzzle[] = [nov6, nov7, nov8].map(readPuzzle);
