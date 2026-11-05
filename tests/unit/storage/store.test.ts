import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../../src/storage/settings';
import { KEY_PREFIX, Store, type KeyValueStorage } from '../../../src/storage/store';

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const broken: KeyValueStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('Store', () => {
  it('stores JSON under versioned zt:v1: keys', () => {
    const backend = memory();
    const store = new Store(backend);
    store.write('stats', { played: 3 });
    expect([...backend.data.keys()]).toEqual([`${KEY_PREFIX}stats`]);
    expect(KEY_PREFIX).toBe('zt:v1:');
    expect(store.read('stats', null)).toEqual({ played: 3 });
    store.remove('stats');
    expect(store.read('stats', 'none')).toBe('none');
  });

  it('falls back on missing or corrupt values', () => {
    const backend = memory();
    backend.data.set(`${KEY_PREFIX}bad`, '{not json');
    const store = new Store(backend);
    expect(store.read('bad', 7)).toBe(7);
    expect(store.read('missing', 'x')).toBe('x');
  });

  it('keeps working when storage throws or is missing', () => {
    for (const store of [new Store(broken), new Store(null)]) {
      expect(() => store.write('k', 1)).not.toThrow();
      expect(() => store.remove('k')).not.toThrow();
      expect(store.read('k', 'fallback')).toBe('fallback');
    }
  });
});

describe('settings', () => {
  it('defaults: dark mode on, timer off, feedback on', () => {
    expect(loadSettings(new Store(memory()))).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ darkMode: true, showTimer: false, feedback: true });
  });

  it('round-trips and fills in settings added later', () => {
    const backend = memory();
    const store = new Store(backend);
    saveSettings(store, { ...DEFAULT_SETTINGS, showTimer: true });
    expect(loadSettings(store).showTimer).toBe(true);
    backend.data.set(`${KEY_PREFIX}settings`, JSON.stringify({ darkMode: false, junk: 1 }));
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, darkMode: false });
  });
});
