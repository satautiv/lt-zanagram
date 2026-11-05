import type { Store } from './store';

/** Player settings and one-time flags, stored under `zt:v1:settings` (spec §5, §9). */
export interface Settings {
  /** Tamsi tema. */
  darkMode: boolean;
  /** Rodyti laikmatį. */
  showTimer: boolean;
  /** Pagyrimo žinutės: random praise when a required word is found. */
  feedback: boolean;
  tutorialDone: boolean;
  extraDialogSeen: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  darkMode: true,
  showTimer: false,
  feedback: true,
  tutorialDone: false,
  extraDialogSeen: false,
};

const KEY = 'settings';

/** Stored settings over the defaults, so settings added later get their default value. */
export function loadSettings(store: Store): Settings {
  const stored = store.read<Partial<Settings>>(KEY, {});
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof stored[key] === 'boolean') settings[key] = stored[key];
  }
  return settings;
}

export function saveSettings(store: Store, settings: Settings): void {
  store.write(KEY, settings);
}
