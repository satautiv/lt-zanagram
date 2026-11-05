import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

/**
 * Every e2e test runs on a fixed local date, so "today's puzzle" is deterministic. The default is
 * the day of the first hand-made test puzzle; override with `test.use({ today: 'YYYY-MM-DD' })`.
 * Only Date is fixed; timers keep running normally.
 */
export const test = base.extend<{ today: string }>({
  today: ['2026-11-06', { option: true }],
  page: async ({ page, today }, use) => {
    await page.clock.setFixedTime(new Date(`${today}T12:00:00`));
    await use(page);
  },
});
