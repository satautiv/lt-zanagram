import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { expect, test } from './fixtures';

const fixture = (date: string) =>
  JSON.parse(
    readFileSync(new URL(`../../src/game/fixtures/${date}.json`, import.meta.url), 'utf8'),
  ) as Puzzle;

const letters = (date: string) => [...fixture(date).letters];

test.describe('on a day with a puzzle', () => {
  test.use({ today: '2026-11-07' });

  test("shows today's puzzle", async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.tile-letter')).toHaveText(letters('2026-11-07'));
  });
});

test.describe('after the last published day', () => {
  test.use({ today: '2026-11-20' });

  test('falls back to the latest available puzzle', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.tile-letter')).toHaveText(letters('2026-11-08'));
  });
});

test('serves puzzles obfuscated, never with plain words', async ({ page }) => {
  const response = await page.request.get('./puzzles/2026-11-06.json');
  const body = await response.text();
  for (const { word } of fixture('2026-11-06').words) expect(body).not.toContain(word);
});

test('shows a friendly error when puzzles cannot load, and retries', async ({ page }) => {
  let fail = true;
  await page.route('**/puzzles/index.json', (route) => (fail ? route.abort() : route.continue()));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('Nepavyko įkelti galvosūkio');
  fail = false;
  await page.getByRole('button', { name: 'Bandyti dar kartą' }).click();
  await expect(page.locator('.tile')).toHaveCount(16);
});
