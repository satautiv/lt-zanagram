import { readFileSync } from 'node:fs';
import { colOf, rowOf, type Puzzle } from '../../src/core';
import { expect, test, type Page } from './fixtures';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const tile = (page: Page, index: number) => page.locator('.tile').nth(index);

/** Arrow presses that move focus from one tile to another on an unturned, full board. */
async function arrowTo(page: Page, from: number, to: number): Promise<void> {
  const dRow = rowOf(4, to) - rowOf(4, from);
  const dCol = colOf(4, to) - colOf(4, from);
  for (let i = 0; i < Math.abs(dRow); i++)
    await page.keyboard.press(dRow > 0 ? 'ArrowDown' : 'ArrowUp');
  for (let i = 0; i < Math.abs(dCol); i++)
    await page.keyboard.press(dCol > 0 ? 'ArrowRight' : 'ArrowLeft');
}

test('tiles are buttons named by letter, row and column', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'raidė I, eilutė 1, stulpelis 1' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'raidė Ė, eilutė 4, stulpelis 2' })).toBeVisible();
});

test('Tab reaches the board; arrows move focus and Space selects', async ({ page }) => {
  await page.goto('./');
  await tile(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tile(page, 1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(tile(page, 5)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(tile(page, 5)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('N');
  // Only one tile is in the tab order at a time.
  await expect(page.locator('.tile[tabindex="0"]')).toHaveCount(1);
});

test('finds a word with the keyboard alone', async ({ page }) => {
  await page.goto('./');
  const { word, path } = puzzle.words[0]!;
  await tile(page, path[0]!).focus();
  await page.keyboard.press('Space');
  for (let i = 1; i < path.length; i++) {
    await arrowTo(page, path[i - 1]!, path[i]!);
    await page.keyboard.press('Space');
  }
  await expect(page.getByRole('status')).toHaveText(word);
  await page.keyboard.press('Space'); // the last tile again submits, as a tap does
  await expect(page.getByRole('status')).toHaveText('Liko 8 žodžiai');
});

test('after a turn, names and arrows follow the board as shown', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Pasukti lentą' }).click();
  await expect(tile(page, 0)).toHaveAttribute('aria-label', 'raidė I, eilutė 1, stulpelis 4');
  await tile(page, 0).focus();
  await page.keyboard.press('ArrowDown'); // tile 1 was right of tile 0; it now shows below it
  await expect(tile(page, 1)).toBeFocused();
});

test('reduced motion turns transitions and animations off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const durations = await page.evaluate(() =>
    [...document.querySelectorAll('*')].flatMap((node) => {
      const style = getComputedStyle(node);
      return [style.transitionDuration, style.animationDuration]
        .flatMap((value) => value.split(','))
        .map((value) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000));
    }),
  );
  expect(Math.max(...durations)).toBeLessThanOrEqual(1);
});
