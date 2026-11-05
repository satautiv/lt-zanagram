import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function typeWord(page: Page, word: string): Promise<void> {
  await page.locator('.board').waitFor(); // the puzzle loads asynchronously
  for (const key of [...word.toLowerCase(), 'Enter']) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

test('solving shows the results screen with the words, last found first', async ({ page }) => {
  await page.goto('./');
  const extra = puzzle.extras[0]!;
  await typeWord(page, extra);
  for (const { word } of puzzle.words) await typeWord(page, word);

  const results = page.getByRole('region', { name: /Išspręsta per \d\d:\d\d!/ });
  await expect(results).toBeVisible();
  await expect(results.getByText('0 patarimų')).toBeVisible();

  const rows = results.locator('.word-row');
  await expect(rows).toHaveCount(puzzle.words.length);
  const last = puzzle.words.at(-1)!;
  await expect(rows.first().locator('.word')).toHaveText(last.word);
  await expect(rows.first().locator('.definition')).toHaveText(last.definition);
  await expect(rows.first().locator('.word-time')).toHaveText(/^\d\d:\d\d$/);

  await expect(results.locator('.extra-list')).toHaveText(extra);
  await expect(page.locator('.board')).toHaveCount(0);
});
