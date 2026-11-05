import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

async function tap(page: Page, tile: number): Promise<void> {
  const box = await page.locator('.tile-face').nth(tile).boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

const status = (page: Page) => page.getByRole('status');
const selected = (page: Page) => page.locator('.tile.is-selected');

test('builds and submits a word by tapping', async ({ page }) => {
  await page.goto('./');
  const { path } = puzzle.words[0]!;
  for (const tile of path) await tap(page, tile);
  await expect(selected(page)).toHaveCount(path.length);
  await tap(page, path.at(-1)!); // tap the last tile again to submit
  await expect(status(page)).toHaveText('Liko 8 žodžiai');
  await expect(selected(page)).toHaveCount(0);
});

test('tapping the previous tile steps back', async ({ page }) => {
  await page.goto('./');
  const [a, b, c] = puzzle.words[0]!.path;
  await tap(page, a!);
  await tap(page, b!);
  await tap(page, c!);
  await tap(page, b!);
  await expect(selected(page)).toHaveCount(2);
  await expect(status(page)).toHaveText(puzzle.letters[a!]! + puzzle.letters[b!]!);
});

test('tapping a tile that cannot extend the path starts a new one', async ({ page }) => {
  await page.goto('./');
  const [a, b] = puzzle.words[0]!.path;
  // Find a visible tile not bridged to b and not on the path.
  const bridged = new Set(
    puzzle.bridges.filter(([x, y]) => x === b || y === b).map(([x, y]) => (x === b ? y : x)),
  );
  const other = [...Array(16).keys()].find((t) => t !== a && t !== b && !bridged.has(t))!;
  await tap(page, a!);
  await tap(page, b!);
  await tap(page, other);
  await expect(selected(page)).toHaveCount(1);
  await expect(status(page)).toHaveText(puzzle.letters[other]!);
});

test('a single tap does not submit, and a drag after taps still works', async ({ page }) => {
  await page.goto('./');
  const word = puzzle.words[1]!;
  await tap(page, word.path[0]!);
  await expect(selected(page)).toHaveCount(1);
  await expect(status(page)).toHaveText(puzzle.letters[word.path[0]!]!);
  // Now drag the whole word starting from the same (already selected) first tile.
  const centers = await page.locator('.tile-face').evaluateAll((faces) =>
    faces.map((f) => {
      const r = f.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  await page.mouse.move(centers[word.path[0]!]!.x, centers[word.path[0]!]!.y);
  await page.mouse.down();
  for (const t of word.path.slice(1))
    await page.mouse.move(centers[t]!.x, centers[t]!.y, { steps: 6 });
  await page.mouse.up();
  await expect(status(page)).toHaveText('Liko 8 žodžiai');
});
