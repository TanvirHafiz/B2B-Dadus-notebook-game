// Chapter 2 screenshots at four window sizes: intro, notebook, workshop, dialogue bubble, close-up, ending. Usage: node tests/shots2.mjs
import fs from 'node:fs';
import { open, noHScroll } from './lib.mjs';

const D = JSON.parse(fs.readFileSync(new URL('../chapters/ch2.json', import.meta.url), 'utf8'));
const sizes = [[1280, 720], [1920, 1080], [768, 1024], [390, 844]];
const seed = () => localStorage.setItem('dadus-notebook:v1', JSON.stringify({ v: 1, chapters: { ch1: { done: true, stars: 3, hints: 0, mistakes: 0 } }, clues: {} }));
const set = (loc, v) => loc.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
const S = id => D.steps.find(s => s.id === id);
fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;

for (const [W, H] of sizes) {
  const tag = `ch2-${W}x${H}`, wide = W >= 1000;
  const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch2', init: seed });
  const shot = (name, full = false) => page.screenshot({ path: `screenshots/${tag}-${name}.png`, fullPage: full });
  const note = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };
  const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
  console.log(tag);

  await page.waitForTimeout(1600); await shot('1-intro');
  await page.locator('#ovNext').click(); await page.waitForTimeout(300); await shot('2-intro-dialogue');
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }

  const t = S('taste'); await title(t.title); await page.locator('#say').click(); await page.waitForTimeout(300);
  await page.locator('.tin', { hasText: t.params.options[0].label }).click();
  await shot('3-notebook'); if (wide) await shot('3-notebook-full', true);
  await page.locator('#pickGo').click(); await page.waitForTimeout(900); await page.locator('#say').click(); await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0)); await shot('4-dialogue');
  await page.locator('.tin', { hasText: t.params.options[1].label }).click(); await page.locator('#pickGo').click();

  if (!wide) await page.locator('#tabShop').click();
  await page.locator('.hs[data-id="tin"]').click(); await page.waitForTimeout(500);
  if (!wide) await page.evaluate(() => window.scrollTo(0, 0));
  await shot('5-workshop', true);
  for (const c of D.clues) if (c.id !== 'tin') await page.locator(`.hs[data-id="${c.id}"]`).click();
  if (!wide) await page.locator('#tabNote').click();

  const m = S('mix'); await title(m.title); await page.waitForTimeout(300);
  await set(page.locator('.tr3 input').nth(1), m.answer.parts[2]); await set(page.locator('.tr3 input').nth(0), m.answer.parts[0] + 15);
  await shot('6-mix'); note(await noHScroll(page), 'no horizontal scroll on the three-part mix');
  await set(page.locator('.tr3 input').nth(0), m.answer.parts[0]); await page.locator('#go').click();

  const c = S('conche'); await title(c.title);
  await page.locator('#shelfBtn').click(); await page.waitForSelector('.shelfGrid'); await page.waitForTimeout(200);
  await page.locator('.memo.prefilled', { hasText: 'thermometer' }).locator('.zoomable').click(); await page.waitForTimeout(300);
  await shot('7-zoom-thermometer');
  const tag29 = await page.evaluate(() => { const t = [...document.querySelectorAll('.zoomView text')].find(x => x.textContent.includes('milk')); return t ? t.getBoundingClientRect().height : 0; });
  note(tag29 >= 14, `milk tag text is ${Math.round(tag29)} px tall in the close-up`);
  await page.keyboard.press('Escape'); await shot('7-shelf'); await page.keyboard.press('Escape');
  await set(page.locator('#slide'), c.answer.value); await page.locator('#go').click();

  const tp = S('temper'); await title(tp.title);
  for (let i = 0; i < 3; i++) await set(page.locator('.tr input').nth(i), tp.answer.values[i]); await page.locator('#go').click();
  const mo = S('mold'); await title(mo.title); for (let i = 0; i < mo.answer.count; i++) await page.locator('#tap').click();
  await page.waitForSelector('#again', { state: 'visible', timeout: 6000 }); await page.waitForTimeout(300);
  await shot('8-ending'); await shot('8-ending-full', true);
  note(await noHScroll(page), 'no horizontal scroll at the ending');
  note(errors.length === 0, `no console errors ${errors.join('; ')}`);
  await close();
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('Chapter 2 screenshots written to screenshots/');
