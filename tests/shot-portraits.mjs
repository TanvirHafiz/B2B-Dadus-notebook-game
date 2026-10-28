// Screenshot of the intro dialogue with the generated portraits: node tests/shot-portraits.mjs
import fs from 'node:fs';
import { open } from './lib.mjs';
fs.mkdirSync('screenshots', { recursive: true });
const { page, errors, close } = await open(1280, 720, { path: 'index.html?c=ch1' });
await page.locator('#ovNext').click(); await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/portraits-intro.png' });
const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
console.log(broken.length ? 'BROKEN ' + broken.join() : 'images ok', errors.length ? errors.join() : '');
await close();
