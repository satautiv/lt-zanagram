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

test('reloading mid-puzzle restores found words, hints, rotation and time', async ({ page }) => {
  await page.goto('./');
  await typeWord(page, puzzle.words[0]!.word);
  await typeWord(page, puzzle.words[1]!.word);
  await typeWord(page, puzzle.extras[0]!);
  await page.getByRole('button', { name: /^Patarimas/ }).click();
  await page.getByRole('button', { name: 'Pasukti lentą' }).click();
  await expect(page.getByRole('status')).toHaveText('Liko 7 žodžiai');

  const saved = JSON.parse(
    (await page.evaluate((id) => localStorage.getItem(`zt:v1:progress:${id}`), puzzle.id))!,
  );
  expect(saved.state.found.map((f: { word: string }) => f.word)).toEqual([
    puzzle.words[0]!.word,
    puzzle.words[1]!.word,
  ]);
  expect(saved.startedOn).toMatch(/^\d{4}-\d\d-\d\d$/);

  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Liko 7 žodžiai');
  await expect(page.locator('.tile.is-hinted')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Patarimas/ }).locator('.badge')).toHaveText('4');
  await expect(page.locator('.rotor')).toHaveAttribute('style', /rotate\(90deg\)/);
  // Words found before the reload are gone from the board for good.
  await typeWord(page, puzzle.words[0]!.word);
  await expect(page.getByRole('status')).not.toHaveText('Liko 6 žodžiai');
});

test('a finished puzzle reopens straight to its results', async ({ page }) => {
  await page.goto('./');
  for (const { word } of puzzle.words) await typeWord(page, word);
  await expect(page.getByRole('region', { name: /Išspręsta per/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: /Išspręsta per/ })).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(0);
});

test('a given-up puzzle reopens to the given-up results', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Meniu' }).click();
  await page.getByRole('button', { name: 'Pasiduoti' }).click();
  await page.getByRole('button', { name: 'Taip, pasiduoti' }).click();
  await expect(page.getByRole('region', { name: 'Pasidavėte' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Pasidavėte' })).toBeVisible();
});
