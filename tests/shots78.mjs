// Chapter 7 and 8 screenshots at four window sizes: the first order, the workshop, a wrong try, the builder, the naming screen and the endings.
// Usage: node tests/shots78.mjs [en|bn]
import fs from 'node:fs';
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';

const LANG = process.argv[2] || 'en', sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;
for (const id of ['ch7', 'ch8']) {
  const D = loadChapterFile(id, LANG), S = sid => D.steps.find(s => s.id === sid);
  for (const [W, H] of sizes) {
    const tag = `${LANG === 'en' ? '' : LANG + '-'}${id}-${W}x${H}`, wide = W >= 1000;
    const { page, errors, close } = await open(W, H, { path: `index.html?c=${id}`, init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'].slice(0, Number(id.slice(2)) - 1)), lang: LANG, fonts: LANG === 'en' ? 'empty' : 'live' });
    const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
    const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
    const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
    console.log(tag);
    await page.waitForTimeout(1500); await shot('1-intro');
    while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
    const pickAll = async b => { for (const [k, v] of Object.entries(b)) await page.locator(`.mnOpt[data-k="${k}:${v}"]`).click(); };
    await title(D.steps[0].title); await page.locator('#say').click(); await page.waitForTimeout(300);
    if (!wide) await page.locator('#tabShop').click();
    for (const c of D.clues) await page.locator(`.hs[data-id="${c.id}"]`).click();
    if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
    await shot('2-workshop', true);
    if (!wide) await page.locator('#tabNote').click();
    if (id === 'ch7') {
      const s = S('nazma'); await pickAll({ roast: 'dark', conche: '3', cacao: '70' }); await page.locator('#go').click(); await page.waitForTimeout(900); await page.locator('#say').click();
      await shot('3-wrong', true); note(await noHScroll(page), 'no horizontal scroll on the order');
      for (const sid of ['nazma', 'jamal', 'shumi']) { const st = S(sid); await title(st.title); await pickAll(Object.fromEntries(Object.entries(st.answer.settings).map(([k, v]) => [k, v ?? st.params.settings.find(x => x.key === k).options[0].id]))); await page.locator('#go').click(); }
      const m = S('mold'); await title(m.title); for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
    } else {
      for (const sid of ['o1', 'o2', 'o3']) {
        const st = S(sid); await title(st.title); await page.waitForTimeout(300);
        if (sid === 'o1') { await pickAll({ ...st.answer.example, keep: 'fridge', topping: 'fresh' }); await shot('3-builder', true); note(await noHScroll(page), 'no horizontal scroll on the builder'); }
        await pickAll(st.answer.example); await page.locator('#go').click();
      }
      const n = S('name'); await title(n.title); await page.locator('#nwInput').fill(LANG === 'bn' ? 'দাদুর ডার্ক' : "Dadu's Dark"); await page.locator('.mnOpt[data-id="milk"]').click(); await shot('4-name', true);
      note(await noHScroll(page), 'no horizontal scroll on the naming screen');
      await page.locator('#go').click();
      const sh = S('shutter'); await title(sh.title); for (let i = 0; i < sh.answer.count; i++) await page.locator('#tap').click();
    }
    await page.waitForSelector('#again', { state: 'visible', timeout: 9000 }); await page.waitForTimeout(300);
    await shot('7-ending'); await shot('7-ending-full', true);
    note(await noHScroll(page), 'no horizontal scroll at the ending');
    note(errors.filter(e => !/fonts\.(googleapis|gstatic)/.test(e)).length === 0, `no console errors ${errors.join('; ')}`);
    await close();
  }
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Chapter 7 and 8 screenshots written to screenshots/');
