import { createTranslator } from '../core/i18n';
import lt from './lt.json';

/** All UI text goes through here; a future `en.json` with the same keys is a drop-in. */
export const t = createTranslator(lt);
export type StringKey = Parameters<typeof t>[0];
