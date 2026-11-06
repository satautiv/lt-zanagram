import { encodePuzzle, readPuzzle, type Puzzle } from '../core';
import { KEY_PREFIX, MemoryStorage, Store } from '../storage/store';

/**
 * Playtest (spec §8 Authoring tool): the editor hands a board to the real game UI through this
 * localStorage key and opens `?playtest`. Dev builds only; the game then saves nothing.
 */
export const PLAYTEST_KEY = 'zt-editor-playtest';

export function isPlaytest(): boolean {
  return import.meta.env.DEV && new URLSearchParams(location.search).has('playtest');
}

/** Called by the editor. Obfuscated like any puzzle file (ADR-0001). */
export function offerPlaytest(puzzle: Puzzle): void {
  localStorage.setItem(PLAYTEST_KEY, JSON.stringify(encodePuzzle(puzzle)));
}

export function playtestPuzzle(): Puzzle {
  const raw = localStorage.getItem(PLAYTEST_KEY);
  if (raw === null) throw new Error('No playtest board: open Playtest from the editor');
  return readPuzzle(JSON.parse(raw));
}

/**
 * A store that starts from the player's settings (theme, timer) but keeps every write in memory,
 * so a playtest leaves no progress, stats or settings behind.
 */
export function playtestStore(): Store {
  const memory = new MemoryStorage();
  const settings = localStorage.getItem(`${KEY_PREFIX}settings`);
  if (settings !== null) memory.setItem(`${KEY_PREFIX}settings`, settings);
  return new Store(memory);
}
