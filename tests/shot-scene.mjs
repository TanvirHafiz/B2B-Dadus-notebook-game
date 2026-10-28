// Screenshots of the shutter intro and the workshop scene with its tap spots: node tests/shot-scene.mjs [chN]
import fs from 'node:fs';
import { open, seedDone } from './lib.mjs';
fs.mkdirSync('screenshots', { recursive: true });
const id = process.argv[2] || 'ch3';
const { page, errors, close } = await open(1280, 720, { path: `index.html?c=${id}`, init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'].slice(0, +id.slice(2) - 1)) });
await page.waitForTimeout(1800); await page.screenshot({ path: `screenshots/intro-${id}.png` });
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
await page.waitForTimeout(500); await page.screenshot({ path: `screenshots/scene-${id}.png`, fullPage: true });

const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
console.log(broken.length ? 'BROKEN ' + broken.join() : 'images ok', errors.join());
await close();
