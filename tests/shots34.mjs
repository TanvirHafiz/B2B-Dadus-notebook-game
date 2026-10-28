// Chapter 3 and 4 screenshots at four window sizes: intro, dialogue, notebook with the puzzle, wrong-answer bubble, workshop, ending (and the moving tray for chapter 4).
// Usage: node tests/shots34.mjs
import fs from 'node:fs';
import { open, noHScroll, seedDone, setRange } from './lib.mjs';

const sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;
const load = id => JSON.parse(fs.readFileSync(new URL(`../chapters/${id}.json`, import.meta.url), 'utf8'));
const pickByText = async (page, opt) => { for (const t of await page.locator('.tin').all()) { await t.click(); if ((await page.locator('#sniff').textContent()).includes(opt.sense)) return; } };

for (const id of ['ch3', 'ch4']) {
  const D = load(id), S = sid => D.steps.find(s => s.id === sid);
  for (const [W, H] of sizes) {
    const tag = `${id}-${W}x${H}`, wide = W >= 1000;
    const { page, errors, close } = await open(W, H, { path: `index.html?c=${id}`, init: seedDone(id === 'ch3' ? ['ch1', 'ch2'] : ['ch1', 'ch2', 'ch3']) });
    const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
    const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
    const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
    console.log(tag);
    await page.waitForTimeout(1600); await shot('1-intro');
    await page.locator('#ovNext').click(); await page.waitForTimeout(300); await shot('2-intro-dialogue');
    while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }

    const first = D.steps[0]; await title(first.title); await page.locator('#say').click(); await page.waitForTimeout(300);
    if (id === 'ch3') {
      await page.locator('.card[data-k="sugar"]').click();
      await shot('3-notebook'); if (wide) await shot('3-notebook-full', true);
      await page.locator('.bin[data-id="cool"]').click(); await page.waitForTimeout(900); await page.locator('#say').click(); await page.waitForTimeout(200);
      await page.evaluate(() => window.scrollTo(0, 0)); await shot('4-dialogue');
      if (!wide) await page.locator('#tabShop').click();
      await page.locator('.hs[data-id="seize"]').click(); await page.waitForTimeout(400);
      if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
      await shot('5-workshop', true);
      for (const c of D.clues) await page.locator(`.hs[data-id="${c.id}"]`).click();
      if (!wide) await page.locator('#tabNote').click();
      const a = S('sort').answer.bins;
      for (const [b, ids] of Object.entries(a)) for (const i of ids) { await page.locator(`.card[data-k="${i}"]`).click(); await page.locator(`.bin[data-id="${b}"]`).click(); }
      await page.locator('#go').click();
      const r = S('rescue'); await title(r.title); await pickByText(page, r.params.options.find(o => o.id === r.answer.choice)); await page.locator('#pickGo').click();
      const m = S('milk'); await title(m.title); await pickByText(page, m.params.options.find(o => o.id === m.answer.choice)); await page.locator('#pickGo').click();
      const w = S('whisk'); await title(w.title); for (let i = 0; i < w.answer.count; i++) await page.locator('#tap').click();
    } else {
      await shot('3-notebook'); if (wide) await shot('3-notebook-full', true);
      await page.locator(`.card[data-k="${first.answer.sequence[1]}"]`).click(); await page.locator('button.slot[data-i="0"]').click(); await page.waitForTimeout(900); await page.locator('#say').click(); await page.waitForTimeout(200);
      await page.evaluate(() => window.scrollTo(0, 0)); await shot('4-dialogue');
      if (!wide) await page.locator('#tabShop').click();
      await page.locator('.hs[data-id="cutcard"]').click(); await page.waitForTimeout(400);
      if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
      await shot('5-workshop', true);
      for (const c of D.clues) await page.locator(`.hs[data-id="${c.id}"]`).click();
      if (!wide) await page.locator('#tabNote').click();
      for (let i = 0; i < first.answer.sequence.length; i++) { await page.locator(`.card[data-k="${first.answer.sequence[i]}"]`).click(); await page.locator(`button.slot[data-i="${i}"]`).click(); }
      await page.locator('#go').click();
      const c = S('cut'); await title(c.title); await page.waitForTimeout(600); await shot('6-moving-tray');
      await page.locator('.bean').first().focus(); await page.waitForTimeout(300); await shot('6-grid-tray', true);
      note(await noHScroll(page), 'no horizontal scroll on the cut test');
      if (!wide) { const small = await page.evaluate(() => [...document.querySelectorAll('.bean:not(.gone)')].filter(e => e.getBoundingClientRect().width < 44 || e.getBoundingClientRect().height < 44).length); note(small === 0, 'beans are at least 44 px'); }
      for (const bid of c.answer.defects) await page.locator(`.bean[data-k="${bid}"]`).click();
      await page.locator('#go').click();
      for (const sid of ['smell1', 'smell2']) { const s = S(sid); await title(s.title); await pickByText(page, s.params.options.find(o => o.id === s.answer.choice)); await page.locator('#pickGo').click(); }
    }
    await page.waitForSelector('#again', { state: 'visible', timeout: 8000 }); await page.waitForTimeout(300);
    await shot('7-ending'); await shot('7-ending-full', true);
    note(await noHScroll(page), 'no horizontal scroll at the ending');
    note(errors.length === 0, `no console errors ${errors.join('; ')}`);
    await close();
  }
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Chapter 3 and 4 screenshots written to screenshots/');
