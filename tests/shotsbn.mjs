// Chapter 1 in Bangla: screenshots at four window sizes (intro, notebook and puzzle, clue close-ups, the sliders, ending, chapter screen, Memory shelf)
// plus a check that nothing overflows sideways. Fonts load from Google Fonts here (when online) so Bangla text is judged with the real fonts.
// Usage: node tests/shotsbn.mjs
import fs from 'node:fs';
import { open, noHScroll, loadChapterFile, setRange } from './lib.mjs';

const D = loadChapterFile('ch1', 'bn'), S = id => D.steps.find(s => s.id === id);
const sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;
for (const [W, H] of sizes) {
  const tag = `bn-ch1-${W}x${H}`, wide = W >= 1000;
  const { page, errors, close } = await open(W, H, { lang: 'bn', fonts: 'live' });
  const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
  const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
  const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
  console.log(tag);
  await page.waitForTimeout(1800); await shot('1-intro');
  await page.locator('#ovNext').click(); await page.waitForTimeout(300); await shot('2-intro-dialogue');
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
  const o = S('order'); await title(o.title); await page.locator('#say').click(); await page.waitForTimeout(300);
  await page.locator(`.card[data-k="${o.answer.sequence[1]}"]`).click(); await page.locator('button.slot[data-i="0"]').click(); await page.waitForTimeout(1200);
  await shot('3-order-wrong'); if (wide) await shot('3-order-wrong-full', true);
  for (const c of D.clues) {
    if (!wide) await page.locator('#tabShop').click();
    await page.locator(`.hs[data-id="${c.id}"]`).click(); await page.waitForTimeout(250);
    if (['therm', 'table', 'sign', 'slip', 'jar'].includes(c.id)) { await page.locator('#memo .zoomable').scrollIntoViewIfNeeded(); await shot(`4-clue-${c.id}`, !wide); }
  }
  note(await noHScroll(page), 'no horizontal scroll in the workshop');
  if (!wide) await page.locator('#tabNote').click();
  for (let i = 0; i < o.answer.sequence.length; i++) { await page.locator(`.card[data-k="${o.answer.sequence[i]}"]`).click(); await page.locator(`button.slot[data-i="${i}"]`).click(); }
  await shot('5-order-done'); await page.locator('#go').click();
  const r = S('roast'); await title(r.title); await page.locator('.tin').first().click(); await page.waitForTimeout(300); await shot('6-roast');
  for (const t of await page.locator('.tin').all()) { await t.click(); if ((await page.locator('#sniff').textContent()).includes(r.params.options.find(x => x.id === r.answer.choice).sense)) break; }
  await page.locator('#pickGo').click();
  const w = S('winnow'); await title(w.title); for (let i = 0; i < w.answer.count; i++) await page.locator('#tap').click();
  const g = S('grind'); await title(g.title); await setRange(page.locator('#slide'), 700); await shot('7-grind');
  await setRange(page.locator('#slide'), g.answer.parts[0]); await page.locator('#go').click();
  const c = S('conche'); await title(c.title); await setRange(page.locator('#slide'), 7); await shot('8-conche');
  await setRange(page.locator('#slide'), c.answer.value); await page.locator('#go').click();
  const t = S('temper'); await title(t.title); await page.waitForTimeout(200); await shot('9-temper');
  for (let i = 0; i < 3; i++) await setRange(page.locator('.tr input').nth(i), t.answer.values[i]);
  await page.locator('#go').click();
  const m = S('mold'); await title(m.title); for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
  await page.waitForSelector('#again', { state: 'visible', timeout: 8000 }); await page.waitForTimeout(300);
  await shot('10-ending'); await shot('10-ending-full', true);
  note(await noHScroll(page), 'no horizontal scroll at the ending');
  note(errors.filter(e => !/fonts\.(googleapis|gstatic)/.test(e)).length === 0, `no console errors ${errors.join('; ')}`);
  await close();
  // the chapter screen and the Memory shelf
  const h2 = await open(W, H, { path: 'index.html', wait: '.chapterList', lang: 'bn', fonts: 'live' });
  await h2.page.waitForTimeout(400); await h2.page.screenshot({ path: `screenshots/${tag}-11-chapters.png`, fullPage: true });
  await h2.page.locator('#selShelfBtn').click(); await h2.page.waitForSelector('.shelfGrid'); await h2.page.waitForTimeout(300);
  await h2.page.screenshot({ path: `screenshots/${tag}-12-shelf.png` });
  note(await noHScroll(h2.page), 'no horizontal scroll on the chapter screen and shelf');
  await h2.close();
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Bangla chapter 1 screenshots written to screenshots/');
