// Screenshots of the sponsor pass: the header logo, the chapter screen with rewards, the Memory shelf and the endings with a photo (chapters 1, 2, 5) and without (chapter 3).
// Usage: node tests/shots-sponsor.mjs
import fs from 'node:fs';
import { open, seedDone, loadChapterFile, solveFast } from './lib.mjs';

fs.mkdirSync('screenshots', { recursive: true });
for (const lang of ['en', 'bn']) for (const [W, H] of [[1280, 720], [390, 844]]) {
  const tag = `sponsor-${lang}-${W}x${H}`;
  let h = await open(W, H, { path: 'index.html', wait: '.chapterList', lang, init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5']), fonts: 'live' });
  await h.page.waitForTimeout(500); await h.page.screenshot({ path: `screenshots/${tag}-chapters.png`, fullPage: true });
  await h.page.locator('#selShelfBtn').click(); await h.page.waitForSelector('.shelfGrid'); await h.page.waitForTimeout(400);
  await h.page.screenshot({ path: `screenshots/${tag}-shelf.png` });
  await h.close();
  h = await open(W, H, { lang, fonts: 'live' }); await h.page.waitForTimeout(1500);
  await h.page.screenshot({ path: `screenshots/${tag}-intro.png` });
  while (await h.page.locator('#overlay').isVisible()) { await h.page.locator('#ovNext').click(); await h.page.waitForTimeout(40); }
  await h.page.waitForTimeout(400); await h.page.screenshot({ path: `screenshots/${tag}-game-header.png` });
  await solveFast(h.page, loadChapterFile('ch1', lang));
  await h.page.waitForTimeout(600); await h.page.screenshot({ path: `screenshots/${tag}-ending-ch1.png`, fullPage: true });
  await h.close();
}
console.log('sponsor screenshots written');
