import type { GameState } from '../core';
import type { Store } from './store';

/**
 * One puzzle's saved progress, `zt:v1:progress:<date>` (spec §9): the game state (found words with
 * their times, extras, hints, hint target, definitions shown, elapsed time, rotation, status) plus the local date the
 * puzzle was started, which the streak rules need (decisions D3, D4).
 */
export interface Progress {
  state: GameState;
  startedOn: string;
}

const key = (puzzleId: string) => `progress:${puzzleId}`;

function isProgress(value: unknown, puzzleId: string): value is Progress {
  const p = value as Progress | null;
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.startedOn === 'string' &&
    typeof p.state === 'object' &&
    p.state !== null &&
    p.state.puzzleId === puzzleId &&
    Array.isArray(p.state.found) &&
    Array.isArray(p.state.extras) &&
    ['playing', 'solved', 'gaveUp'].includes(p.state.status)
  );
}

export function loadProgress(store: Store, puzzleId: string): Progress | null {
  const saved = store.read<unknown>(key(puzzleId), null);
  if (!isProgress(saved, puzzleId)) return null;
  // Fields added after a save was written get their starting values.
  const added: Pick<GameState, 'rotation' | 'hintTarget' | 'hintRevealed' | 'definitionsShown'> = {
    rotation: 0,
    hintTarget: null,
    hintRevealed: 0,
    definitionsShown: [],
  };
  return { ...saved, state: { ...added, ...saved.state } };
}

export function saveProgress(store: Store, progress: Progress): void {
  store.write(key(progress.state.puzzleId), progress);
}
