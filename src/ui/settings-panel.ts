import { t, type StringKey } from '../i18n';
import type { Settings } from '../storage/settings';

type Toggle = 'darkMode' | 'showTimer' | 'feedback';

const TOGGLES: [Toggle, StringKey][] = [
  ['darkMode', 'settings.darkMode'],
  ['showTimer', 'settings.showTimer'],
  ['feedback', 'settings.feedback'],
];

/** The three settings toggles (spec §5 Settings), as accessible switches. */
export class SettingsPanel {
  readonly element: HTMLElement;
  private readonly inputs = new Map<Toggle, HTMLInputElement>();

  constructor(settings: Settings, onChange: (change: Partial<Settings>) => void) {
    this.element = document.createElement('div');
    this.element.className = 'settings';
    for (const [key, label] of TOGGLES) {
      const row = document.createElement('label');
      row.className = 'setting';
      const text = document.createElement('span');
      text.textContent = t(label);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('role', 'switch');
      input.className = 'switch';
      input.checked = settings[key];
      input.addEventListener('change', () => onChange({ [key]: input.checked }));
      this.inputs.set(key, input);
      row.append(text, input);
      this.element.append(row);
    }
  }
}
