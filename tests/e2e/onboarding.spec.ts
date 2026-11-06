import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { TUTORIAL_PUZZLE } from '../../src/game/tutorial';
import { expect, test, type Page } from './fixtures';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

const [koja, lapas, kapas] = TUTORIAL_PUZZLE.words as [
  (typeof TUTORIAL_PUZZLE.words)[0],
  (typeof TUTORIAL_PUZZLE.words)[0],
  (typeof TUTORIAL_PUZZLE.words)[0],
];

async function press(page: Page, keys: string[]): Promise<void> {
  for (const key of keys) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
}

async function typeWord(page: Page, word: string): Promise<void> {
  await page.locator('.board').first().waitFor(); // the puzzle loads asynchronously
  await press(page, [...word.toLowerCase(), 'Enter']);
}

const tutorial = (page: Page) => page.getByRole('dialog', { name: 'Trumpa pamoka' });

async function centers(page: Page): Promise<{ x: number; y: number }[]> {
  return tutorial(page)
    .locator('.tile-face')
    .evaluateAll((faces) =>
      faces.map((face) => {
        const box = face.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }),
    );
}

test.describe('first visit', () => {
  test.use({ onboarded: false });

  test('the tutorial guides drag, disappearing tiles and typing, then never returns', async ({
    page,
  }) => {
    await page.goto('./');
    const dialog = tutorial(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.tile-letter')).toHaveText(TUTORIAL_PUZZLE.letters);
    await expect(dialog.locator('.tutorial-step')).toContainText(`raides ${koja.word}`);
    await expect(dialog.locator('.tile.is-hinted')).toHaveCount(koja.path.length);

    // Drag the highlighted path.
    const c = await centers(page);
    await page.mouse.move(c[koja.path[0]!]!.x, c[koja.path[0]!]!.y);
    await page.mouse.down();
    for (const tile of koja.path.slice(1)) {
      await page.mouse.move(c[tile]!.x, c[tile]!.y, { steps: 6 });
    }
    await page.mouse.up();

    // Its own tiles fall away; the shared K stays for KAPAS.
    await expect(dialog.locator('.tile.is-gone')).toHaveCount(3);
    await expect(dialog.locator('.tutorial-step')).toContainText(`įveskite ${lapas.word}`);

    // Typing goes to the tutorial board, not the daily puzzle behind it.
    await typeWord(page, lapas.word);
    await expect(dialog.locator('.tutorial-step')).toHaveText(
      'Liko paskutinis žodis. Raskite jį patys!',
    );
    await typeWord(page, kapas.word);
    await expect(dialog.locator('.tutorial-step')).toContainText('Šaunu!');

    await dialog.getByRole('button', { name: 'Pradėti žaidimą' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.play').getByRole('status')).toHaveText('Liko 9 žodžiai');

    await page.reload();
    await page.locator('.board').waitFor();
    await expect(tutorial(page)).toHaveCount(0);
  });

  test('the tutorial can be skipped, and stays skipped', async ({ page }) => {
    await page.goto('./');
    await tutorial(page).getByRole('button', { name: 'Praleisti' }).click();
    await expect(tutorial(page)).toHaveCount(0);
    await typeWord(page, puzzle.words[0]!.word);
    await expect(page.locator('.play').getByRole('status')).toHaveText(/Liko 8|Puiku|Šaunu|Gerai/);

    await page.reload();
    await page.locator('.board').waitFor();
    await expect(tutorial(page)).toHaveCount(0);
  });
});

test('Kaip žaisti restates the rules with the rare-letters tip and the sources', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Meniu' }).click();
  await page.getByRole('button', { name: 'Kaip žaisti' }).click();
  const help = page.getByRole('dialog', { name: 'Kaip žaisti' });
  await expect(help).toBeVisible();
  await expect(help.getByText('bent 4 raidės')).toBeVisible();
  await expect(help.getByText('Č, Š, Ž, F, H, Ą, Ę, Ų')).toBeVisible();
  await expect(help.getByRole('heading', { name: 'Šaltiniai' })).toBeVisible();
  await expect(help.getByRole('link', { name: 'Licencijos ir autorystė' })).toHaveAttribute(
    'href',
    /data\/LICENSES\.md$/,
  );
  await help.getByRole('button', { name: 'Supratau' }).click();
  await expect(help).toBeHidden();
});

test.describe('extra words', () => {
  test.use({ onboarded: false });

  test('the first extra word ever found explains extras, once', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('zt:v1:settings') === null) {
        localStorage.setItem('zt:v1:settings', JSON.stringify({ tutorialDone: true }));
      }
    });
    await page.goto('./');
    await typeWord(page, puzzle.extras[0]!);
    const info = page.getByRole('dialog', { name: 'Papildomas žodis!' });
    await expect(info).toBeVisible();
    await expect(info).toContainText('10 sekundžių');
    // The board ignores typing while the dialog is open.
    await typeWord(page, puzzle.words[0]!.word);
    await info.getByRole('button', { name: 'Supratau' }).click();
    await expect(info).toBeHidden();
    await expect(page.locator('.play').getByRole('status')).toHaveText('Liko 9 žodžiai');

    await typeWord(page, puzzle.extras[1]!);
    await expect(page.locator('.play').getByRole('status')).toHaveText('Papildomas žodis! −10 s');
    await expect(info).toBeHidden();
    await page.reload();
    await page.locator('.board').waitFor();
    await typeWord(page, puzzle.extras[2]!);
    await expect(info).toBeHidden();
  });
});
