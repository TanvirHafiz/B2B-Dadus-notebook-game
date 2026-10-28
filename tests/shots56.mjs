// Chapter 5 and 6 screenshots at four window sizes: intro, notebook with the puzzle, a wrong-answer bubble, the workshop, the key steps, the ending.
// Usage: node tests/shots56.mjs
import fs from 'node:fs';
import { open, noHScroll, seedDone, setRange, loadChapterFile } from './lib.mjs';
const LANG = process.argv[2] || 'en'; // node tests/shots56.mjs bn

const sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;
const load = id => loadChapterFile(id, LANG);

for (const id of ['ch5', 'ch6']) {
  const D = load(id), S = sid => D.steps.find(s => s.id === sid);
  for (const [W, H] of sizes) {
    const tag = `${LANG === 'en' ? '' : LANG + '-'}${id}-${W}x${H}`, wide = W >= 1000;
    const { page, errors, close } = await open(W, H, { path: `index.html?c=${id}`, init: seedDone(id === 'ch5' ? ['ch1', 'ch2', 'ch3', 'ch4'] : ['ch1', 'ch2', 'ch3', 'ch4', 'ch5']), lang: LANG, fonts: LANG === 'en' ? 'empty' : 'live' });
    const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
    const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
    const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
    const small = async sel => (await page.evaluate(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).length, sel));
    console.log(tag);
    await page.waitForTimeout(1600); await shot('1-intro');
    while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
    await title(D.steps[0].title); await page.locator('#say').click(); await page.waitForTimeout(300);
    if (id === 'ch5') {
      const sc = S('scale'); await page.locator('input[data-k="cacao"]').fill('5000'); await page.locator('input[data-k="sugar"]').fill('5'); await page.locator('input[data-k="bars"]').fill('100');
      await page.locator('#go').click(); await page.waitForTimeout(900); await page.locator('#say').click();
      await shot('2-scale-wrong'); if (wide) await shot('2-scale-wrong-full', true);
      if (!wide) await page.locator('#tabShop').click();
      await page.locator('.hs[data-id="sketch"]').click(); await page.waitForTimeout(400);
      if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
      await shot('3-workshop', true);
      for (const c of D.clues) await page.locator(`.hs[data-id="${c.id}"]`).click();
      if (!wide) await page.locator('#tabNote').click();
      for (const [k, v] of Object.entries(sc.answer.fields)) if (await page.locator(`input[data-k="${k}"]:not([disabled])`).count()) await page.locator(`input[data-k="${k}"]`).fill(String(v));
      await page.locator('#go').click();
      const c = S('conche'); await title(c.title); await setRange(page.locator('#slide'), c.answer.value); await page.locator('#go').click();
      const t = S('tray'); await title(t.title);
      const decoy = t.params.toppings.find(x => x.reject).id;
      await page.locator(`.card[data-k="${decoy}"]`).click(); await page.locator('.sq').nth(2).click(); await page.waitForTimeout(900);
      await page.locator('.card').first().click(); await page.locator('.sq').nth(0).click(); await page.locator('.sq').nth(1).click();
      await shot('4-tray'); if (wide) await shot('4-tray-full', true);
      note(await small('.sq') === 0, 'tray squares are at least 44 px'); note(await small('.card.topping') === 0, 'topping buttons are at least 44 px');
      note(await noHScroll(page), 'no horizontal scroll on the tray');
      let held = await page.locator('.card[aria-pressed="true"]').first().getAttribute('data-k');
      for (let i = 0; i < t.answer.grid.length; i++) { if (held !== t.answer.grid[i]) { await page.locator(`.card[data-k="${t.answer.grid[i]}"]`).click(); held = t.answer.grid[i]; } await page.locator(`.sq[data-i="${i}"]`).click(); }
      await shot('5-tray-filled'); await page.locator('#go').click();
      const m = S('mold'); await title(m.title); for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
    } else {
      const d = S('diagnose');
      await page.locator('.dxBar').first().click(); await page.waitForTimeout(200); await shot('2-diagnose-test'); if (wide) await shot('2-diagnose-full', true);
      note(await small('.dxBar') === 0, 'bloom bars are at least 44 px'); note(await noHScroll(page), 'no horizontal scroll on the diagnosis');
      if (!wide) await page.locator('#tabShop').click();
      await page.locator('.hs[data-id="card"]').click(); await page.waitForTimeout(400);
      if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
      await shot('3-workshop', true);
      for (const c of D.clues) await page.locator(`.hs[data-id="${c.id}"]`).click();
      if (!wide) await page.locator('#tabNote').click();
      for (const [b, cause] of Object.entries(d.answer.pairs)) { await page.locator(`.dxBar[data-id="${b}"]`).click(); await page.locator(`.cause[data-k="${cause}"]`).click(); }
      await shot('4-diagnose-filled'); await page.locator('#go').click();
      const f = S('fix'); await title(f.title); await page.waitForTimeout(300); await shot('5-fix');
      for (let i = 0; i < 3; i++) await setRange(page.locator('.tr input').nth(i), f.answer.values[i]);
      await page.locator('#go').click();
      const m = S('mold'); await title(m.title); for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
    }
    await page.waitForSelector('#again', { state: 'visible', timeout: 8000 }); await page.waitForTimeout(300);
    await shot('7-ending'); await shot('7-ending-full', true);
    note(await noHScroll(page), 'no horizontal scroll at the ending');
    note(errors.length === 0, `no console errors ${errors.join('; ')}`);
    await close();
  }
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Chapter 5 and 6 screenshots written to screenshots/');
