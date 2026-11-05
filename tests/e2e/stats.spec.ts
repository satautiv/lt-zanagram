import { readFileSync } from 'node:fs';
import type { Puzzle } from '../../src/core';
import { expect, test, type Page } from './fixtures';

const puzzle = (date: string) =>
  JSON.parse(
    readFileSync(new URL(`../../src/game/fixtures/${date}.json`, import.meta.url), 'utf8'),
  ) as Puzzle;

async function solve(page: Page, date: string): Promise<void> {
  await page.locator('.board').waitFor();
  for (const { word } of puzzle(date).words) {
    for (const key of [...word.toLowerCase(), 'Enter']) {
      await page.evaluate(
        (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })),
        key,
      );
    }
  }
}

const stat = (page: Page, label: string) =>
  page.locator('.stat').filter({ hasText: label }).locator('.stat-value');

test('the results show played, streak and solves', async ({ page }) => {
  await page.goto('./');
  await solve(page, '2026-11-06');
  await expect(stat(page, 'Sužaista')).toHaveText('1');
  await expect(stat(page, 'Serija')).toHaveText('1');
  await expect(stat(page, 'Išspręsta')).toHaveText('1');
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('zt:v1:stats')))!);
  expect(stored).toMatchObject({ played: 1, solves: 1, streak: 1, lastDailySolve: '2026-11-06' });
});

test('reloading does not count a puzzle as played twice', async ({ page }) => {
  await page.goto('./');
  await page.locator('.board').waitFor();
  await page.reload();
  await page.locator('.board').waitFor();
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('zt:v1:stats')))!);
  expect(stored.played).toBe(1);
});

test('consecutive daily solves build a streak', async ({ page }) => {
  await page.goto('./');
  await solve(page, '2026-11-06');
  await expect(stat(page, 'Serija')).toHaveText('1');

  await page.clock.setFixedTime(new Date('2026-11-07T09:00:00'));
  await page.reload();
  await solve(page, '2026-11-07');
  await expect(stat(page, 'Serija')).toHaveText('2');
  await expect(stat(page, 'Sužaista')).toHaveText('2');
});
