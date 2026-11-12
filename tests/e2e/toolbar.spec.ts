import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const hintButton = (page: Page) => page.getByRole('button', { name: /^Patarimas/ });
const hinted = (page: Page) => page.locator('.tile.is-hinted');

test('hints reveal the tiles of one word in order, half as many as words', async ({ page }) => {
  await page.goto('./');
  // The fixture has 9 required words: half, rounded up, is 5 (#86).
  expect(puzzle.words).toHaveLength(9);
  await expect(hintButton(page).locator('.badge')).toHaveText('5');
  await hintButton(page).click();
  await expect(hinted(page)).toHaveCount(1);
  await expect(hintButton(page).locator('.badge')).toHaveText('4');
  await hintButton(page).click();
  await expect(hinted(page)).toHaveCount(2);
  await hintButton(page).click();
  await expect(hinted(page)).toHaveCount(3);
  await expect(hintButton(page).locator('.badge')).toHaveText('2');
  await expect(hintButton(page)).toBeEnabled();

  // The revealed tiles are the start of a required word's canonical path.
  const tiles = await hinted(page).evaluateAll((nodes) =>
    nodes.map((n) => Number(n.parentElement!.getAttribute('data-tile'))),
  );
  const target = puzzle.words.find((w) => w.path.slice(0, 3).every((t) => tiles.includes(t)));
  expect(target).toBeDefined();

  // Two more, then none left.
  await hintButton(page).click();
  await hintButton(page).click();
  await expect(hintButton(page).locator('.badge')).toHaveText('0');
  await expect(hintButton(page)).toBeDisabled();
});

test('rotating turns the board but keeps letters upright and input working', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Pasukti lentą' }).click();
  await expect(page.locator('.rotor')).toHaveAttribute('style', /rotate\(90deg\)/);
  await expect(page.locator('.tile-letter').first()).toHaveAttribute('style', /rotate\(-90deg\)/);
  await page.waitForTimeout(400); // let the turn finish

  // Drag a word on the rotated board, using where the tiles are now on screen.
  const word = puzzle.words[0]!;
  const centers = await page.locator('.tile-face').evaluateAll((faces) =>
    faces.map((f) => {
      const r = f.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  const first = centers[word.path[0]!]!;
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const t of word.path.slice(1))
    await page.mouse.move(centers[t]!.x, centers[t]!.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('status')).toHaveText('Liko 8 žodžiai');
});
