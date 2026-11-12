import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const button = (page: Page) => page.getByRole('button', { name: /^Apibrėžimo patarimas/ });
const cards = (page: Page) => page.locator('.definition-card');

/** The required word a card describes, by its definition. */
const wordFor = (definition: string) =>
  puzzle.words.find((w) => definition.includes(w.definition))!;

async function typeWord(page: Page, word: string): Promise<void> {
  for (const key of word.toLowerCase()) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
  await page.keyboard.press('Enter');
}

test('shows unfound words’ definitions, never the words, and remembers them', async ({ page }) => {
  await page.goto('./');
  // As many as hints: 9 required words give 5 (#86).
  await expect(button(page).locator('.badge')).toHaveText('5');
  await expect(cards(page)).toHaveCount(0);

  await button(page).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(button(page).locator('.badge')).toHaveText('4');
  const first = (await cards(page).first().textContent())!;
  const word = wordFor(first);
  expect(first).toContain(`Apibrėžimas (${[...word.word].length} raid`);
  expect(first).not.toContain(word.word);

  await button(page).click();
  await expect(cards(page)).toHaveCount(2);
  await expect(button(page).locator('.badge')).toHaveText('3');
  const second = (await cards(page).nth(1).textContent())!;
  expect(wordFor(second).word).not.toBe(word.word);

  await page.reload();
  await expect(cards(page)).toHaveCount(2);
  await expect(button(page).locator('.badge')).toHaveText('3');

  // Finding a word takes its card away.
  await typeWord(page, word.word);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toHaveText(second);
});

test('the results count definition hints', async ({ page }) => {
  await page.goto('./');
  await button(page).click();
  await expect(cards(page)).toHaveCount(1);
  for (const { word } of puzzle.words) await typeWord(page, word);
  await expect(page.getByText('1 apibrėžimas')).toBeVisible();
});

test('after a definition hint, hints reveal that word’s letters (#86)', async ({ page }) => {
  await page.goto('./');
  await button(page).click();
  const word = wordFor((await cards(page).first().textContent())!);
  const hintButton = page.getByRole('button', { name: /^Patarimas/ });
  const hinted = page.locator('.tile.is-hinted');
  const hintedTiles = () =>
    hinted.evaluateAll((nodes) =>
      nodes.map((n) => Number(n.parentElement!.getAttribute('data-tile'))),
    );

  await hintButton.click();
  await expect(hinted).toHaveCount(1);
  expect(await hintedTiles()).toEqual(word.path.slice(0, 1));
  await hintButton.click();
  await expect(hinted).toHaveCount(2);
  expect((await hintedTiles()).sort()).toEqual(word.path.slice(0, 2).sort());
});
