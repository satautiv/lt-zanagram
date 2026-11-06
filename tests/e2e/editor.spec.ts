import { readFileSync } from 'node:fs';
import { decodePuzzle, type EncodedPuzzle, type Puzzle } from '../../src/core';
import { expect, test, type Page } from '@playwright/test';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const tile = (page: Page, index: number) => page.locator(`[data-tile="${index}"]`);
const slot = (page: Page, key: string) => page.locator(`[data-bridge="${key}"] .slot-hit`);
const warnings = (page: Page) => page.locator('#warnings');
const wordRow = (page: Page, word: string) => page.locator(`.word[data-word="${word}"]`);

async function loadFixture(page: Page): Promise<void> {
  await page.goto('editor.html');
  await expect(page.locator('#lists')).not.toHaveText(/loading/);
  await page.locator('#date').fill('2026-11-06');
  await page.getByRole('button', { name: 'Load date' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded 2026-11-06');
}

test('loads an obfuscated puzzle: board, required words and a clean bill', async ({ page }) => {
  await loadFixture(page);
  await expect(tile(page, 0)).toContainText('I');
  for (const { word } of fixture.words) {
    await expect(wordRow(page, word)).toHaveClass(/is-required/);
  }
  await expect(warnings(page)).toHaveText('validatePuzzle: ok');
  await expect(page.locator('#stats')).toContainText(`${fixture.words.length} required`);
});

test('typing letters and toggling bridges updates the warnings live', async ({ page }) => {
  await page.goto('editor.html');
  await expect(page.locator('#lists')).not.toHaveText(/loading/);
  await tile(page, 0).click();
  for (const key of ['n', 'a', 'm', 'a', 's']) await page.keyboard.press(key);
  await expect(tile(page, 4)).toContainText('S');

  // N A M A on the top row, S below the last A: bridge them into NAMAS.
  for (const key of ['0-1', '1-2', '2-3', '3-7']) await slot(page, key).click({ force: true });
  await page.locator('#board').click({ position: { x: 1, y: 1 } }); // nothing selected changes
  await tile(page, 7).click();
  await page.keyboard.press('s');
  const namas = wordRow(page, 'NAMAS');
  await expect(namas).toHaveCount(1);
  await namas.getByRole('checkbox').check();
  await expect(page.locator('#stats')).toContainText('1 required');
  // The first S (tile 4) is on no required path: an orphan tile, outlined and reported.
  await expect(tile(page, 4)).toHaveClass(/is-orphan/);
  await expect(warnings(page)).toContainText('Tile 4 is not on any required word');

  // Removing a bridge the word needs makes it untraceable.
  await slot(page, '2-3').click({ force: true });
  await expect(namas).toHaveClass(/is-lost/);
});

test('hovering a word lights its path; definitions are kept on export', async ({ page }) => {
  await loadFixture(page);
  const { word, path } = fixture.words[0]!;
  const row = wordRow(page, word);
  await row.hover();
  for (const t of path) await expect(tile(page, t)).toHaveClass(/is-lit/);

  await row.locator('.definition').fill('Turintis daug turto.');
  await row.locator('.definition').press('Enter');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('2026-11-06.json');
  const exported = decodePuzzle(
    JSON.parse(readFileSync(await file.path(), 'utf8')) as EncodedPuzzle,
  );
  expect(exported.letters).toEqual(fixture.letters);
  expect(exported.bridges).toEqual([...fixture.bridges].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  expect(exported.words.find((w) => w.word === word)?.definition).toBe('Turintis daug turto.');
  expect(new Set(exported.words.map((w) => w.word))).toEqual(
    new Set(fixture.words.map((w) => w.word)),
  );
});

test('the editor is not part of the production build', async ({ request }) => {
  const response = await request.get('http://localhost:4173/lt-zanagram/editor.html');
  expect(await response.text()).not.toContain('Export JSON');
});
