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

/** Solves today's puzzle, finding one extra word first. */
async function solve(page: Page) {
  await page.goto('./');
  await typeWord(page, puzzle.extras[0]!);
  for (const { word } of puzzle.words) await typeWord(page, word);
  const results = page.getByRole('region', { name: /Išspręsta per/ });
  await expect(results).toBeVisible();
  return results;
}

const shared =
  /^Žodžių tiltai, 2026-11-06: \d\d:\d\d, 0 patarimų, 1 papildomas žodis\nhttp:\/\/localhost:4173\/lt-zanagram\/$/;

test('share copies the result to the clipboard when Web Share is missing', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { copied: string[] };
    w.copied = [];
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text: string) => void w.copied.push(text) },
      configurable: true,
    });
  });
  const results = await solve(page);

  await results.getByRole('button', { name: 'Dalintis rezultatu' }).click();
  await expect(results.getByRole('status')).toHaveText('Rezultatas nukopijuotas');
  const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
  expect(copied).toHaveLength(1);
  expect(copied[0]).toMatch(shared);
  for (const { word } of puzzle.words) expect(copied[0]).not.toContain(word);
});

test('share uses the Web Share API where the browser has it', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { sharedData: ShareData[] };
    w.sharedData = [];
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => void w.sharedData.push(data),
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  });
  const results = await solve(page);

  await results.getByRole('button', { name: 'Dalintis rezultatu' }).click();
  await expect(results.getByRole('status')).toHaveText('Pasidalinta!');
  const data = await page.evaluate(
    () => (window as unknown as { sharedData: ShareData[] }).sharedData,
  );
  expect(data).toHaveLength(1);
  expect(data[0]!.text).toMatch(shared);
});

test('the results count down to the next puzzle and link to the archive', async ({ page }) => {
  const results = await solve(page);
  // The test clock stands at noon, so the next puzzle is twelve hours away.
  await expect(results.getByText('Kitas galvosūkis po 12:00:00')).toBeVisible();

  await results.getByRole('button', { name: 'Ankstesni galvosūkiai' }).click();
  await expect(page.getByRole('dialog', { name: /lapkritis/i })).toBeVisible();
});
