import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { expect, test, type Page } from './fixtures';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function typeWord(page: Page, word: string): Promise<void> {
  await page.locator('.board').waitFor(); // the puzzle loads asynchronously
  for (const key of [...word.toLowerCase(), 'Enter']) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

// v1 ships with the `ads` flag off: the slots exist in code but nothing reaches the page.
test('with ads off there is no banner and the Remove ads slot is hidden', async ({ page }) => {
  await page.goto('./');
  await page.locator('.board').waitFor();
  await expect(page.locator('.ad-banner')).toHaveCount(0);
  await expect(page.locator('.removeAds-button')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pašalinti reklamas' })).toHaveCount(0);
});

test('with ads off the results screen shows no ad', async ({ page }) => {
  await page.goto('./');
  for (const { word } of puzzle.words) await typeWord(page, word);
  await expect(page.getByRole('region', { name: /Išspręsta per/ })).toBeVisible();
  await expect(page.locator('.ad-banner')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
