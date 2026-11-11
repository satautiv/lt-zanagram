import { readFileSync } from 'node:fs';
import { decodePuzzle, encodePuzzle, type EncodedPuzzle, type Puzzle } from '../../src/core';
import { expect, test, type Page } from '@playwright/test';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const tile = (page: Page, index: number) => page.locator(`[data-tile="${index}"]`);
const slot = (page: Page, key: string) => page.locator(`[data-bridge="${key}"] .slot-hit`);
const warnings = (page: Page) => page.locator('#warnings');
const wordRow = (page: Page, word: string) => page.locator(`.word[data-word="${word}"]`);
const day = (page: Page, date: string) => page.locator(`.calendar-grid [data-date="${date}"]`);
const lettersOnBoard = (page: Page) =>
  page.locator('[data-tile] text:not(.tile-index)').allTextContents();

// Returning player: the game skips its tutorial, also in playtest windows.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    if (localStorage.getItem('zt:v1:settings') === null) {
      const flags = { tutorialDone: true, extraDialogSeen: true };
      localStorage.setItem('zt:v1:settings', JSON.stringify(flags));
    }
  });
});

async function openEditor(page: Page): Promise<void> {
  await page.goto('editor.html');
  await expect(page.locator('#lists')).not.toHaveText(/loading/);
}

async function loadFixture(page: Page): Promise<void> {
  await openEditor(page);
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

test('the calendar marks published days; picking one loads it, others start a board', async ({
  page,
}) => {
  await loadFixture(page);
  await expect(day(page, '2026-11-06')).toHaveClass(/has-puzzle/);
  await expect(day(page, '2026-11-06')).toHaveClass(/is-current/);
  // 2026-11-10 is in the gap after the hand-made test days, so it has no puzzle.
  await expect(day(page, '2026-11-10')).not.toHaveClass(/has-puzzle/);

  await day(page, '2026-11-10').click();
  await expect(page.getByRole('status')).toHaveText('New board for 2026-11-10');
  await expect(page.locator('#date')).toHaveValue('2026-11-10');
  expect((await lettersOnBoard(page)).join('')).toBe('');

  await day(page, '2026-11-07').click();
  await expect(page.getByRole('status')).toHaveText('Loaded 2026-11-07');
});

test('Generate runs the generator in the browser, the same for the same seed', async ({ page }) => {
  await openEditor(page);
  await page.locator('#date').fill('2027-06-01');
  await page.locator('#date').dispatchEvent('change');
  await page.locator('#seed').fill('42');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByRole('status')).toHaveText('Generated 2027-06-01 with seed 42');
  await expect(warnings(page)).toHaveText('validatePuzzle: ok');
  const first = await lettersOnBoard(page);
  expect(first.join('')).toHaveLength(16);
  expect(await page.locator('.word.is-required').count()).toBeGreaterThanOrEqual(10);

  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByRole('status')).toHaveText('Generated 2027-06-01 with seed 42');
  expect(await lettersOnBoard(page)).toEqual(first);
});

test('Playtest opens the board in the real game and saves nothing', async ({ page, context }) => {
  await loadFixture(page);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Playtest' }).click();
  const game = await popup;
  await expect(game).toHaveTitle(/^Bandomasis žaidimas/);
  await expect(game.locator('.tile-letter')).toHaveText(fixture.letters);

  const { word } = fixture.words[0]!;
  for (const key of word.toLowerCase()) {
    await game.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
  await game.keyboard.press('Enter');
  await expect(game.getByRole('status')).toHaveText(`Liko ${fixture.words.length - 1} žodžiai`);
  const saved = await game.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('zt:v1:') && k !== 'zt:v1:settings'),
  );
  expect(saved).toEqual([]);
});

test('Save posts the obfuscated board to the dev server, which refuses invalid ones', async ({
  page,
}) => {
  await loadFixture(page);
  let posted: Puzzle | null = null;
  await page.route('**/__editor/save', async (route) => {
    posted = decodePuzzle(route.request().postDataJSON() as EncodedPuzzle);
    await route.fulfill({ json: { saved: posted.id, puzzles: 3 } });
  });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved public/puzzles/2026-11-06.json');
  expect(posted!.words.map((w) => w.word)).toEqual(fixture.words.map((w) => w.word));

  // The real endpoint writes only valid puzzles.
  const invalid = { ...fixture, id: '2099-01-01', bridges: [] };
  const response = await page.request.post('/__editor/save', { data: encodePuzzle(invalid) });
  expect(response.status()).toBe(422);
});

test('milestone 3: load, edit, playtest and export a board', async ({ page, context }) => {
  await loadFixture(page);
  const { word } = fixture.words.at(-1)!;
  await wordRow(page, word).getByRole('checkbox').uncheck();
  await expect(page.locator('#stats')).toContainText(`${fixture.words.length - 1} required`);

  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Playtest' }).click();
  const game = await popup;
  await expect(game.getByRole('status')).toHaveText(`Liko ${fixture.words.length - 1} žodžiai`);
  await game.close();

  page.once('dialog', (dialog) => void dialog.accept()); // in case the edit left warnings
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const file = await download;
  const exported = decodePuzzle(JSON.parse(readFileSync((await file.path())!, 'utf8')));
  expect(exported.words.map((w) => w.word)).not.toContain(word);
});
