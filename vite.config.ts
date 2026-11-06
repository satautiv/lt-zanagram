import { defineConfig } from 'vitest/config';
import { editorSave } from './tools/editor-plugin';
import { serviceWorker } from './tools/service-worker-plugin';

export default defineConfig({
  // Served from https://satautiv.github.io/lt-zanagram/ (GitHub Pages project site).
  base: '/lt-zanagram/',
  plugins: [serviceWorker('src/sw/sw.ts'), editorSave('public/puzzles')],
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
