import { expect, test } from '@playwright/test';

test('app shell loads with the game title', async ({ page }) => {
  // Relative to baseURL, which carries the Pages sub-path.
  await page.goto('./');
  await expect(page).toHaveTitle('Žodžių tiltai');
  await expect(page.getByRole('heading', { name: 'Žodžių tiltai' })).toBeVisible();
});
