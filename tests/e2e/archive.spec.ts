import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { expect, test, type Page } from './fixtures';

const fixture = (date: string) =>
  JSON.parse(
    readFileSync(new URL(`../../src/game/fixtures/${date}.json`, import.meta.url), 'utf8'),
  ) as Puzzle;

async function typeWord(page: Page, word: string): Promise<void> {
  await page.locator('.board').waitFor();
  for (const key of [...word.toLowerCase(), 'Enter']) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

async function openArchive(page: Page) {
  await page.getByRole('button', { name: 'Meniu' }).click();
  await page.getByRole('button', { name: 'Ankstesni galvosūkiai' }).click();
  return page.getByRole('dialog', { name: /lapkritis/i });
}

const day = (page: Page, n: number) =>
  page.locator('.archive-day').filter({ hasText: new RegExp(`^${n}$`) });

test.use({ today: '2026-11-08' });

test('shows the month with published days, today outlined and the future disabled', async ({
  page,
}) => {
  await page.goto('./');
  const archive = await openArchive(page);
  await expect(archive.getByRole('heading', { name: '2026 m. lapkritis' })).toBeVisible();
  await expect(day(page, 6)).toBeEnabled();
  await expect(day(page, 7)).toBeEnabled();
  await expect(day(page, 8)).toBeEnabled();
  await expect(day(page, 8)).toHaveClass(/is-today/);
  await expect(day(page, 5)).toBeDisabled(); // no puzzle
  await expect(day(page, 9)).toBeDisabled(); // future
  // Only November has puzzles, so both arrows are disabled.
  await expect(archive.getByRole('button', { name: 'Ankstesnis mėnuo' })).toBeDisabled();
  await expect(archive.getByRole('button', { name: 'Kitas mėnuo' })).toBeDisabled();
});

test('opens a past puzzle that plays like the daily one, and marks progress', async ({ page }) => {
  await page.goto('./');
  await openArchive(page);
  await day(page, 6).click();
  await expect(page).toHaveURL(/#2026-11-06$/);
  await expect(page.locator('.tile-letter')).toHaveText([...fixture('2026-11-06').letters]);

  await typeWord(page, fixture('2026-11-06').words[0]!.word);
  await expect(page.getByRole('status')).toHaveText('Liko 8 žodžiai');

  await openArchive(page);
  await expect(day(page, 6)).toHaveClass(/is-started/);
  await day(page, 8).click(); // today: back to the daily puzzle
  await expect(page.locator('.tile-letter')).toHaveText([...fixture('2026-11-08').letters]);
  await expect(page).not.toHaveURL(/#/);
});

test('solved days are filled', async ({ page }) => {
  await page.goto('./#2026-11-07');
  for (const { word } of fixture('2026-11-07').words) await typeWord(page, word);
  await expect(page.getByRole('region', { name: /Išspręsta per/ })).toBeVisible();
  await page.goto('./');
  await openArchive(page);
  await expect(day(page, 7)).toHaveClass(/is-solved/);
});

test('a link to a future or unknown day opens the daily puzzle', async ({ page }) => {
  await page.goto('./#2026-11-30');
  await expect(page.locator('.tile-letter')).toHaveText([...fixture('2026-11-08').letters]);
  await page.goto('./#nonsense');
  await expect(page.locator('.tile-letter')).toHaveText([...fixture('2026-11-08').letters]);
});
