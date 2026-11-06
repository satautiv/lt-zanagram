import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // The service worker runs in its own global scope, without a DOM.
    files: ['src/sw/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    // The rules engine must run without a DOM (spec §10).
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location'].map(
          (name) => ({ name, message: 'src/core must stay DOM-free.' }),
        ),
      ],
    },
  },
);
