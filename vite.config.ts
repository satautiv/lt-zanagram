import { defineConfig } from 'vitest/config';
import { serviceWorker } from './tools/service-worker-plugin';

export default defineConfig({
  // Served from https://satautiv.github.io/lt-zanagram/ (GitHub Pages project site).
  base: '/lt-zanagram/',
  plugins: [serviceWorker('src/sw/sw.ts')],
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
