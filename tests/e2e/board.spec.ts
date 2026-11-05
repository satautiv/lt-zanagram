import { expect, test } from '@playwright/test';

test('shows the board of a test puzzle', async ({ page }) => {
  await page.goto('./');
  const board = page.getByRole('group', { name: 'Žaidimo lenta' });
  await expect(board).toBeVisible();
  await expect(board.locator('.tile')).toHaveCount(16);
  await expect(board.locator('.tile-letter')).toHaveText([...'IPMVTNIEURGSTĖMA']);
  await expect(board.locator('.bridge')).toHaveCount(26);
  await expect(page.getByRole('status')).toHaveText('Liko 9 žodžiai');
});

test('the board fits a phone screen without scrolling sideways', async ({ page }) => {
  await page.goto('./');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewport = page.viewportSize()!.width;
  expect(width).toBeLessThanOrEqual(viewport);
});
