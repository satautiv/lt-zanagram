import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

/**
 * Every e2e test runs on a fixed local date, so "today's puzzle" is deterministic. The default is
 * the day of the first hand-made test puzzle; override with `test.use({ today: 'YYYY-MM-DD' })`.
 * Only Date is fixed; timers keep running normally.
 *
 * Tests start as a returning player who has seen the tutorial and the first-extra dialog, so
 * those one-time dialogs don't cover the board; `test.use({ onboarded: false })` starts fresh.
 */
export const test = base.extend<{ today: string; onboarded: boolean }>({
  today: ['2026-11-06', { option: true }],
  onboarded: [true, { option: true }],
  page: async ({ page, today, onboarded }, use) => {
    await page.clock.setFixedTime(new Date(`${today}T12:00:00`));
    if (onboarded) {
      await page.addInitScript(() => {
        try {
          // Only on first load, so settings a test saves survive its reloads.
          if (localStorage.getItem('zt:v1:settings') === null) {
            const flags = { tutorialDone: true, extraDialogSeen: true };
            localStorage.setItem('zt:v1:settings', JSON.stringify(flags));
          }
        } catch {
          // Storage blocked: the test sees a first visit.
        }
      });
    }
    await use(page);
  },
});
