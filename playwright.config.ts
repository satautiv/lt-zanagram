import { defineConfig, devices } from '@playwright/test';

/** The dev-only editor (/editor.html) is not in the production build, so it runs on `vite dev`. */
const EDITOR = /editor\.spec\.ts/;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/lt-zanagram/',
    trace: 'on-first-retry',
    // A service worker would serve requests past page.route mocks; offline.spec.ts opts back in.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: EDITOR },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: EDITOR },
    {
      name: 'editor',
      testMatch: EDITOR,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174/lt-zanagram/' },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173/lt-zanagram/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174/lt-zanagram/editor.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
