import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

/**
 * Sends one keydown per character, as a physical keyboard does. Playwright's keyboard.type would
 * insert non-US characters (ą, ė, š …) as text without a keydown, unlike the Lithuanian layout.
 */
async function typeKeys(page: Page, text: string): Promise<void> {
  await page.locator('.board').waitFor(); // the puzzle loads asynchronously
  for (const key of text) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

const status = (page: Page) => page.getByRole('status');
const selected = (page: Page) => page.locator('.tile.is-selected');

/** Strips Lithuanian diacritics, as a player on an English keyboard layout would type. */
function plain(word: string): string {
  return word.replace(/[ĄČĘĖĮŠŲŪŽ]/g, (ch) => ch.normalize('NFD')[0]!);
}

test('types a word and submits with Enter', async ({ page }) => {
  await page.goto('./');
  const word = puzzle.words[0]!.word;
  await typeKeys(page, word.toLowerCase());
  await expect(status(page)).toHaveText(word);
  await expect(selected(page)).toHaveCount([...word].length);
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('Liko 8 žodžiai');
});

test('Lithuanian letters typed directly work', async ({ page }) => {
  await page.goto('./');
  const word = puzzle.words.find((w) => /[ĄČĘĖĮŠŲŪŽ]/.test(w.word))!.word;
  await typeKeys(page, word.toLowerCase());
  await expect(status(page)).toHaveText(word);
});

test('English layout: base letters fall back to diacritics and show real letters', async ({
  page,
}) => {
  await page.goto('./');
  const word = puzzle.words.find((w) => /[ĄČĘĖĮŠŲŪŽ]/.test(w.word))!.word;
  await typeKeys(page, plain(word).toLowerCase());
  await expect(status(page)).toHaveText(word);
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('Liko 8 žodžiai');
});

test('ignores letters that extend nothing; Backspace and Escape edit', async ({ page }) => {
  await page.goto('./');
  const word = puzzle.words[0]!.word;
  await typeKeys(page, word.slice(0, 3).toLowerCase());
  await typeKeys(page, 'q'); // never on a board
  await expect(status(page)).toHaveText(word.slice(0, 3));
  await page.keyboard.press('Backspace');
  await expect(status(page)).toHaveText(word.slice(0, 2));
  await page.keyboard.press('Escape');
  await expect(selected(page)).toHaveCount(0);
  await expect(status(page)).toHaveText('Liko 9 žodžiai');
});

test('solves a whole puzzle by typing', async ({ page }) => {
  await page.goto('./');
  for (const { word } of puzzle.words) {
    await typeKeys(page, word.toLowerCase());
    await page.keyboard.press('Enter');
  }
  await expect(status(page)).toHaveText('Išspręsta!');
});

test('a found extra word lights up yellow, a required word green', async ({ page }) => {
  await page.goto('./');
  const extra = puzzle.extras[0]!;
  await typeKeys(page, extra.toLowerCase());
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('Papildomas žodis! −10 s');
  const lit = page.locator('.tile.is-found');
  await expect(lit).toHaveCount([...extra].length);
  await expect(page.locator('.tile.is-found.is-extra')).toHaveCount([...extra].length);
  const fill = () =>
    lit
      .first()
      .locator('.tile-face')
      .evaluate((face) => getComputedStyle(face).fill);
  await expect.poll(fill).toBe('rgb(229, 192, 59)');

  const word = puzzle.words[0]!.word;
  await typeKeys(page, word.toLowerCase());
  await page.keyboard.press('Enter');
  await expect(lit).toHaveCount([...word].length);
  await expect(page.locator('.tile.is-extra')).toHaveCount(0);
  await expect.poll(fill).toBe('rgb(63, 185, 80)');
});
