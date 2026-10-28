// Three frames of the shutter lifting (start, middle, end): node tests/shot-shutter.mjs
import { open, seedDone } from './lib.mjs';
const { page, close } = await open(1280, 720, { path: 'index.html?c=ch3', init: seedDone(['ch1', 'ch2']) });
await page.locator('#ovNext').click();
for (const [i, ms] of [[0, 120], [1, 550], [2, 900]]) { await page.waitForTimeout(ms); await page.screenshot({ path: `screenshots/shutter-${i}.png`, clip: { x: 240, y: 120, width: 800, height: 280 } }); }
console.log(await page.evaluate(() => document.querySelector('.shutter').className));
await close();
