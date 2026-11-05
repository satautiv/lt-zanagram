import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Served from https://satautiv.github.io/lt-zanagram/ (GitHub Pages project site).
  base: '/lt-zanagram/',
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
