/** Every key the game stores starts with this; bump the version to migrate (spec §9 Saving). */
export const KEY_PREFIX = 'zt:v1:';

/** The subset of the Web Storage API the game uses, so tests can pass a fake. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultBackend(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // Access can throw (privacy settings, sandboxed frames).
  }
}

/**
 * JSON values under versioned `zt:v1:` keys in localStorage. Every read and write is guarded:
 * when storage is missing, full or blocked, reads fall back and writes are dropped, and the game
 * keeps working without saving.
 */
export class Store {
  constructor(private readonly backend: KeyValueStorage | null = defaultBackend()) {}

  read<T>(key: string, fallback: T): T {
    try {
      const raw = this.backend?.getItem(KEY_PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  write(key: string, value: unknown): void {
    try {
      this.backend?.setItem(KEY_PREFIX + key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage blocked: play on without saving.
    }
  }

  remove(key: string): void {
    try {
      this.backend?.removeItem(KEY_PREFIX + key);
    } catch {
      // Ignore, as with write.
    }
  }
}
