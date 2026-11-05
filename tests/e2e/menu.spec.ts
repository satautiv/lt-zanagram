import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function typeWord(page: Page, word: string): Promise<void> {
  for (const key of [...word.toLowerCase(), 'Enter']) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

const menu = (page: Page) => page.getByRole('dialog', { name: 'Žaidimas sustabdytas' });

test('the menu pauses the game, blurs the board and resumes', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Meniu' }).click();
  await expect(menu(page)).toBeVisible();
  for (const item of ['Kaip žaisti', 'Nustatymai', 'Ankstesni galvosūkiai', 'Pasiduoti', 'Tęsti']) {
    await expect(menu(page).getByRole('button', { name: item })).toBeVisible();
  }
  await expect(page.locator('.play')).toHaveClass(/is-paused/);
  await menu(page).getByRole('button', { name: 'Tęsti' }).click();
  await expect(menu(page)).toBeHidden();
  await expect(page.locator('.play')).not.toHaveClass(/is-paused/);
});

test('typing does nothing while the menu is open', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Meniu' }).click();
  await typeWord(page, puzzle.words[0]!.word);
  await menu(page).getByRole('button', { name: 'Tęsti' }).click();
  await expect(page.getByRole('status')).toHaveText('Liko 9 žodžiai');
});

test('the timer stops while the menu is open', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Meniu' }).click();
  const before = await page.locator('.timer').textContent();
  await page.waitForTimeout(2_200);
  expect(await page.locator('.timer').textContent()).toBe(before);
  await menu(page).getByRole('button', { name: 'Tęsti' }).click();
  await page.waitForTimeout(1_300);
  expect(await page.locator('.timer').textContent()).not.toBe(before);
});

test('giving up asks first, then shows the missed words greyed', async ({ page }) => {
  await page.goto('./');
  await typeWord(page, puzzle.words[0]!.word);
  await page.getByRole('button', { name: 'Meniu' }).click();
  await menu(page).getByRole('button', { name: 'Pasiduoti' }).click();
  await expect(menu(page).getByText(/Ar tikrai norite pasiduoti/)).toBeVisible();
  await menu(page).getByRole('button', { name: 'Atšaukti' }).click();
  await expect(menu(page).getByRole('button', { name: 'Tęsti' })).toBeVisible();
  await menu(page).getByRole('button', { name: 'Pasiduoti' }).click();
  await menu(page).getByRole('button', { name: 'Taip, pasiduoti' }).click();

  const results = page.getByRole('region', { name: 'Pasidavėte' });
  await expect(results).toBeVisible();
  await expect(results.locator('.word-row')).toHaveCount(puzzle.words.length);
  await expect(results.locator('.word-row.is-missed')).toHaveCount(puzzle.words.length - 1);
  await expect(results.locator('.word-row').first().locator('.word')).toHaveText(
    puzzle.words[0]!.word,
  );
});

test('each extra word takes 10 s off the time', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1_000);
  await typeWord(page, puzzle.extras[0]!);
  await page.getByRole('button', { name: 'Meniu' }).click();
  // The raw time is about 1 s, so the adjusted time floors at 00:00.
  await expect(page.locator('.timer')).toHaveText('00:00');
});
