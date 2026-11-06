import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Meniu' }).click();
  await page.getByRole('button', { name: 'Nustatymai' }).click();
  return page.getByRole('dialog', { name: 'Nustatymai' });
}

async function typeWord(page: Page, word: string): Promise<void> {
  await page.locator('.board').waitFor(); // the puzzle loads asynchronously
  for (const key of [...word.toLowerCase(), 'Enter']) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

test('defaults: dark mode on, timer hidden, praise on', async ({ page }) => {
  await page.goto('./');
  const settings = await openSettings(page);
  await expect(settings.getByRole('switch', { name: 'Tamsi tema' })).toBeChecked();
  await expect(settings.getByRole('switch', { name: 'Rodyti laikmatį' })).not.toBeChecked();
  await expect(settings.getByRole('switch', { name: 'Pagyrimo žinutės' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('light mode applies at once and survives a reload', async ({ page }) => {
  await page.goto('./');
  const settings = await openSettings(page);
  await settings.getByRole('switch', { name: 'Tamsi tema' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const stored = await page.evaluate(() => localStorage.getItem('zt:v1:settings'));
  expect(JSON.parse(stored!)).toMatchObject({ darkMode: false });
});

test('show timer toggles the toolbar timer', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('timer')).toBeHidden();
  const settings = await openSettings(page);
  await settings.getByRole('switch', { name: 'Rodyti laikmatį' }).click();
  await settings.getByRole('button', { name: 'Atgal' }).click();
  await page.getByRole('button', { name: 'Tęsti' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(/^\d\d:\d\d$/);
});

test('turning praise off shows the count instead of praise', async ({ page }) => {
  await page.goto('./');
  const settings = await openSettings(page);
  await settings.getByRole('switch', { name: 'Pagyrimo žinutės' }).click();
  await page.keyboard.press('Escape');
  await typeWord(page, puzzle.words[0]!.word);
  await expect(page.getByRole('status')).toHaveText('Liko 8 žodžiai');
});

test('still plays when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('./');
  // Nothing can be remembered, so every visit is a first visit with the tutorial.
  await page.getByRole('button', { name: 'Praleisti' }).click();
  await expect(page.locator('.tutorial')).toHaveCount(0);
  await typeWord(page, puzzle.words[0]!.word);
  await expect(page.getByRole('status')).toContainText(/Puiku!|Šaunu!|Gerai!|Liko 8/);
});
