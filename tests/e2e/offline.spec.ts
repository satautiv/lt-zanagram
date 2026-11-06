import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { expect, test, type Page } from './fixtures';

const puzzle = JSON.parse(
  readFileSync(new URL('../../src/game/fixtures/2026-11-06.json', import.meta.url), 'utf8'),
) as Puzzle;

test.use({ serviceWorkers: 'allow' });

/** Waits until the service worker controls the page and has kept today's puzzle files. */
async function waitUntilOfflineReady(page: Page): Promise<void> {
  await page.locator('.board').waitFor();
  const ready = () =>
    page.evaluate(async () => {
      if (navigator.serviceWorker.controller?.state !== 'activated') return false;
      const kept = await caches.open('puzzles');
      const files = ['puzzles/index.json', 'puzzles/2026-11-06.json'];
      const found = await Promise.all(files.map((f) => kept.match(new URL(f, location.href).href)));
      return found.every(Boolean);
    });
  await expect.poll(ready).toBe(true);
}

async function findWord(page: Page, word: string): Promise<void> {
  for (const key of word.toLowerCase()) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  }
  await page.keyboard.press('Enter');
}

test('after one visit, the puzzle loads and plays offline', async ({ page, context }) => {
  await page.goto('./');
  await waitUntilOfflineReady(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.tile-letter')).toHaveText([...puzzle.letters]);
  await findWord(page, puzzle.words[0]!.word);
  await expect(page.getByRole('status')).toHaveText('Liko 8 žodžiai');
});

test('is installable: manifest, icons and a service worker', async ({ page, context }) => {
  await page.goto('./');
  await waitUntilOfflineReady(page);
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);

  const manifest = await (await page.request.get('./manifest.webmanifest')).json();
  expect(manifest.name).toBe('Žodžių tiltai');
  for (const icon of manifest.icons) {
    expect((await page.request.get(`./${icon.src}`)).ok(), icon.src).toBe(true);
  }
});

test('a new deploy takes over at once and drops the old app shell', async ({ page, context }) => {
  await page.goto('./');
  await waitUntilOfflineReady(page);
  const shells = () =>
    page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('shell-')));
  const [oldShell] = await shells();
  expect(oldShell).toBeTruthy();

  // Simulate the next deploy: the same worker with a different build version. Playwright can't
  // reroute the browser's own update check, so the new worker comes from a new script URL.
  await context.route('**/sw.js?deploy=next', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(oldShell!.slice('shell-'.length), 'nextdeploy');
    await route.fulfill({ response, body });
  });
  await page.evaluate(() => navigator.serviceWorker.register('sw.js?deploy=next', { scope: './' }));
  await expect.poll(shells).toEqual(['shell-nextdeploy']);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toContain('deploy=next');

  // Puzzles opened under the old version stay available offline.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.tile-letter')).toHaveText([...puzzle.letters]);
});
