// Renders public/icons/icon.svg into the PNG sizes the web app manifest needs.
// Run with `npm run icons` after changing the SVG; the PNGs are committed.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dir = new URL('../public/icons/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', dir), 'utf8');
const font = (subset: string) =>
  readFileSync(
    new URL(
      `../node_modules/@fontsource/nunito/files/nunito-${subset}-800-normal.woff2`,
      import.meta.url,
    ),
  ).toString('base64');
const face = (subset: string, range: string) =>
  `@font-face{font-family:Nunito;font-weight:800;unicode-range:${range};` +
  `src:url(data:font/woff2;base64,${font(subset)})}`;
const fonts = face('latin', 'U+0000-00FF') + face('latin-ext', 'U+0100-024F');

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>${fonts}body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`icon-${size}.png`, dir).pathname });
}
await browser.close();
