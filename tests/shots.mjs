// Screenshots at four window sizes: intro, notebook, workshop, dialogue bubble, ending. Also checks the fold, tap targets and horizontal scroll.
import fs from 'node:fs';
import { open, noHScroll, solveFast } from './lib.mjs';

const D = JSON.parse(fs.readFileSync(new URL('../chapters/ch1.json', import.meta.url), 'utf8'));
const sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;

for (const [W, H] of sizes) {
  const tag = `${W}x${H}`, wide = W >= 1000;
  const { page, errors, close } = await open(W, H);
  const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
  const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
  console.log(tag);

  await page.waitForTimeout(1600); // let the shutter finish opening
  await shot('1-intro');
  await page.locator('#ovNext').click(); await page.waitForTimeout(1600);
  await shot('2-intro-dialogue');
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }

  await page.waitForFunction(() => document.querySelector('#panel h2'));
  await page.locator('#say').click(); // finish the typing effect
  await page.waitForTimeout(300);
  await shot('3-notebook', wide ? false : false);
  if (wide) await shot('3-notebook-full', true);

  // in-game dialogue bubble after a wrong answer (the cocoa press is not in this recipe)
  const o = D.steps[0];
  await page.locator(`.card[data-k="${o.feedback.decoy}"]`).click(); await page.locator('button.slot[data-i="0"]').click();
  await page.waitForTimeout(1200); await page.locator('#say').click(); await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('4-dialogue');

  if (wide) {
    const f = await page.evaluate(vh => { const top = s => document.querySelector(s).getBoundingClientRect().top; return { say: top('#say'), panel: top('#panel'), scene: top('#scene'), sceneH: document.querySelector('#scene').getBoundingClientRect().height, vh }; }, H);
    if (W === 1280) {
      note(f.say < H && f.panel < H - 80, `bubble and puzzle panel are above the fold (bubble ${Math.round(f.say)}, panel ${Math.round(f.panel)}, window ${H})`);
      note(f.scene < H - 60, `top of the Workshop scene peeks above the fold (scene starts at ${Math.round(f.scene)})`);
    }
    await page.locator('.hs[data-id="therm"]').click(); await page.waitForTimeout(400);
    await shot('5-workshop', true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('5-workshop-viewport');
  } else {
    await page.locator('#tabShop').click(); await page.locator('.hs[data-id="therm"]').click(); await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0)); await shot('5-workshop');
    await shot('5-workshop-full', true);
    // phone tap targets
    if (W < 800) {
      const small = await page.evaluate(() => [...document.querySelectorAll('button, input[type=range]')].filter(e => e.offsetParent).map(e => ({ n: e.className || e.id || e.tagName, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(r => r.h < 43.5 || r.w < 43.5));
      note(small.length === 0, `tap targets all at least 44 px ${small.length ? JSON.stringify(small) : ''}`);
    }
    await page.locator('#tabNote').click();
  }
  note(await noHScroll(page), 'no horizontal scroll');

  await solveFast(page, D, { visit: ['therm', 'sign', 'table', 'slip'] }); await page.waitForTimeout(400);
  await shot('6-ending'); await shot('6-ending-full', true);
  note(await noHScroll(page), 'no horizontal scroll at the ending');
  await page.locator('#allChapters').click(); await page.waitForSelector('.chapterList'); await page.waitForTimeout(200);
  await shot('7-chapter-select', true);
  note(await noHScroll(page), 'no horizontal scroll on the chapter screen');
  await page.locator('#selShelfBtn').click(); await page.waitForSelector('.shelfGrid'); await page.waitForTimeout(200);
  await shot('8-memory-shelf'); await shot('8-memory-shelf-full', true);
  note(await noHScroll(page), 'no horizontal scroll on the Memory shelf');
  note(errors.length === 0, `no console errors ${errors.join('; ')}`);
  await close();
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Screenshots written to screenshots/');
