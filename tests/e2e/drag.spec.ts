import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

// The page shows the first hand-made fixture (read directly; Node can't import JSON bare).
const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function tileCenters(page: Page): Promise<{ x: number; y: number }[]> {
  await page.locator('.board').waitFor(); // the puzzle loads asynchronously
  return page.locator('.tile-face').evaluateAll((faces) =>
    faces.map((face) => {
      const box = face.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }),
  );
}

async function drag(page: Page, path: readonly number[]): Promise<void> {
  const centers = await tileCenters(page);
  const first = centers[path[0]!]!;
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const tile of path.slice(1)) {
    const c = centers[tile]!;
    await page.mouse.move(c.x, c.y, { steps: 6 });
  }
  await page.mouse.up();
}

const status = (page: Page) => page.getByRole('status');

test('finds a word by dragging, and the words-left count drops', async ({ page }) => {
  await page.goto('./');
  await expect(status(page)).toHaveText('Liko 9 žodžiai');
  const word = puzzle.words[0]!;
  await drag(page, word.path);
  await expect(status(page)).toHaveText(/Puiku!|Šaunu!|Gerai!/);
  await expect(status(page)).toHaveText('Liko 8 žodžiai');
});

test('shows the word being built and rejects a short one', async ({ page }) => {
  await page.goto('./');
  const centers = await tileCenters(page);
  const [a, b] = puzzle.words[0]!.path;
  await page.mouse.move(centers[a!]!.x, centers[a!]!.y);
  await page.mouse.down();
  await page.mouse.move(centers[b!]!.x, centers[b!]!.y, { steps: 6 });
  await expect(status(page)).toHaveText(puzzle.letters[a!]! + puzzle.letters[b!]!);
  await expect(page.locator('.tile.is-selected')).toHaveCount(2);
  await page.mouse.up();
  await expect(status(page)).toHaveText('Mažiausiai 4 raidės');
  await expect(page.locator('.tile.is-selected')).toHaveCount(0);
});

test('stepping back onto the previous tile removes the last one', async ({ page }) => {
  await page.goto('./');
  const centers = await tileCenters(page);
  const [a, b, c] = puzzle.words[0]!.path;
  await page.mouse.move(centers[a!]!.x, centers[a!]!.y);
  await page.mouse.down();
  await page.mouse.move(centers[b!]!.x, centers[b!]!.y, { steps: 6 });
  await page.mouse.move(centers[c!]!.x, centers[c!]!.y, { steps: 6 });
  await expect(page.locator('.tile.is-selected')).toHaveCount(3);
  await page.mouse.move(centers[b!]!.x, centers[b!]!.y, { steps: 6 });
  await expect(page.locator('.tile.is-selected')).toHaveCount(2);
  await page.mouse.up();
});

test('solves a whole puzzle by dragging', async ({ page }) => {
  await page.goto('./');
  for (const word of puzzle.words) {
    await drag(page, word.path);
  }
  await expect(status(page)).toHaveText('Išspręsta!');
  await expect(page.locator('.tile:not(.is-gone)')).toHaveCount(0);
});
