// Plays all of Chapter 4 using only values from chapters/ch4.json. The main run uses reduced motion (static grid, mouse and keyboard taps);
// a second run with motion on checks the moving tray, pause on hover and the keyboard switch to the grid.
// Usage: node tests/play4.mjs [WIDTHxHEIGHT]   (default 1280x720). Chapters 1 to 3 are marked done first.
import fs from 'node:fs';
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play4.mjs 1280x720 bn
const D = loadChapterFile('ch4', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
const fmt = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const mobile = W < 1000;
let wrong = 0, hints = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };

const start = async reducedMotion => {
  const h = await open(W, H, { path: 'index.html?c=ch4', init: seedDone(['ch1', 'ch2', 'ch3']), reducedMotion, lang: LANG });
  while (await h.page.locator('#overlay').isVisible()) { await h.page.locator('#ovNext').click(); await h.page.waitForTimeout(60); }
  return h;
};
const tools = page => ({
  expectSay: async (want, what) => { await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 }).catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await page.locator('#saySr').textContent()}"`); }); checks++; },
  waitTitle: t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 }),
  pick: async opt => { for (const t of await page.locator('.tin').all()) { await t.click(); if ((await page.locator('#sniff').textContent()).includes(opt.sense)) return; } throw new Error('option not found ' + opt.id); }
});

// ---------- main run: reduced motion ----------
console.log(`Playing ${D.id} at ${W}x${H} (reduced motion)`);
{
  const { page, errors, close } = await start('reduce'), { expectSay, waitTitle, pick } = tools(page);
  const hint = async (s, level) => { await page.keyboard.press('h'); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };

  // farm order (reused order step)
  const f = step('farm'), M = Object.fromEntries(f.params.machines.map(m => [m.id, m]));
  await waitTitle(f.title);
  if (mobile) await page.locator('#tabShop').click();
  await page.locator('.hs[data-id="farmnote"]').click(); await page.waitForFunction(t => document.querySelector('#memo h3')?.textContent === t, D.clues.find(c => c.id === 'farmnote').title);
  if (mobile) await page.locator('#tabNote').click();
  const wrongId = f.answer.sequence[1];
  await page.locator(`.card[data-k="${wrongId}"]`).click(); await page.locator('button.slot[data-i="0"]').click(); wrong++;
  await expectSay(fmt(f.feedback.wrong, { name: M[wrongId].name, does: M[wrongId].does, line: N(1), need: f.params.needs[0] }), 'wrong farm step');
  await hint(f, 1); await hint(f, 2);
  for (let i = 0; i < f.answer.sequence.length; i++) { await page.locator(`.card[data-k="${f.answer.sequence[i]}"]`).click(); await page.locator(`button.slot[data-i="${i}"]`).click(); await expectSay(f.feedback.placed[i], `farm line ${i + 1}`); }
  await expectSay(f.feedback.complete, 'farm complete'); await page.locator('#go').click();

  // cut test (static grid)
  const c = step('cut'); await waitTitle(c.title);
  if (mobile) await page.locator('#tabShop').click();
  await page.locator('.hs[data-id="cutcard"]').click(); await page.waitForFunction(t => document.querySelector('#memo h3')?.textContent === t, D.clues.find(x => x.id === 'cutcard').title);
  if (mobile) await page.locator('#tabNote').click();
  ok(await page.locator('.beanTray.static').count() === 1, 'reduced motion shows the static grid');
  ok((await page.locator('#panel').textContent()).includes(c.params.staticNote), 'the static note is shown');
  ok(await page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'beanslide').length === 0), 'no tray animation under reduced motion');
  const T = Object.fromEntries(c.params.types.map(t => [t.id, t])), typeOf = Object.fromEntries(c.params.items.map(i => [i.id, i.type]));
  ok(await page.locator('.bean').count() === c.params.items.length, 'every bean is on the tray');
  const goodId = c.params.items.find(i => T[i.type].good).id;
  await page.locator(`.bean[data-k="${goodId}"]`).click(); await expectSay(c.params.goodTap, 'tapping a good bean');
  ok(await page.locator(`.bean[data-k="${goodId}"]:not(.gone)`).count() === 1, 'a good bean stays on the tray');
  await page.locator('#go').click(); wrong++; await expectSay(c.params.stillBad, 'done too early');
  await hint(c, 1);
  const bad = c.answer.defects;
  await page.locator(`.bean[data-k="${bad[0]}"]`).click(); await expectSay(T[typeOf[bad[0]]].why, `why ${bad[0]}`);
  await page.locator(`.bean[data-k="${bad[1]}"]`).focus(); await page.keyboard.press('Enter'); await expectSay(T[typeOf[bad[1]]].why, `why ${bad[1]} by keyboard`);
  ok(await page.evaluate(() => document.activeElement.classList.contains('bean')), 'focus moves to the next bean after a keyboard removal');
  await hint(c, 2);
  for (const id of bad.slice(2)) { await page.locator(`.bean[data-k="${id}"]`).click(); await expectSay(T[typeOf[id]].why, `why ${id}`); }
  await page.locator('#go').click(); await expectSay(c.feedback.correct, 'cut test correct');

  // smell the sacks (two pairs)
  for (const id of ['smell1', 'smell2']) {
    const s = step(id); await waitTitle(s.title);
    for (const o of s.params.options.filter(o => o.id !== s.answer.choice)) { await pick(o); await page.locator('#pickGo').click(); wrong++; await expectSay(o.no, `${id}: ${o.label}`); }
    await hint(s, 1); await hint(s, 2);
    await pick(s.params.options.find(o => o.id === s.answer.choice)); await page.locator('#pickGo').click(); await expectSay(s.feedback.correct, `${id} correct`);
  }
  await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
  const stats = await page.locator('.stats b').allTextContents();
  ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending stats show ${hints} hints and ${wrong} wrong tries, got ${stats}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')));
  ok(saved.chapters.ch4 && saved.chapters.ch4.done, 'chapter 4 result saved under ch4');
  ok(await noHScroll(page), 'no horizontal scroll at the ending');
  await close();
  if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
}

// ---------- second run: motion on ----------
console.log('  moving tray');
{
  const { page, errors, close } = await start('no-preference'), { waitTitle } = tools(page);
  const f = step('farm'); await waitTitle(f.title);
  for (let i = 0; i < f.answer.sequence.length; i++) { await page.locator(`.card[data-k="${f.answer.sequence[i]}"]`).click(); await page.locator(`button.slot[data-i="${i}"]`).click(); }
  await page.locator('#go').click();
  const c = step('cut'); await waitTitle(c.title);
  ok(await page.evaluate(() => document.getAnimations().some(a => a.animationName === 'beanslide')), 'the tray slides when motion is on');
  const box = await page.locator('#tray').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  ok(await page.locator('#strip.paused').count() === 1, 'the tray stops when the pointer is on it');
  // a mouse click on a moving bean must not switch the tray to the grid, and the tray stays stopped while the pointer is on it
  const target = await page.evaluate(() => { const t = document.querySelector('#tray').getBoundingClientRect(); const b = [...document.querySelectorAll('.bean')].map(e => e.getBoundingClientRect()).find(r => r.left >= t.left + 4 && r.right <= t.right - 4); return b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null; });
  ok(target, 'a bean is visible on the moving tray');
  await page.mouse.click(target.x, target.y);
  ok(await page.locator('.beanTray.static').count() === 0, 'a mouse click does not switch the tray to the grid');
  ok(await page.locator('#strip.paused').count() === 1, 'the tray stays stopped while the pointer stays on it');
  await page.mouse.move(5, 5);
  await page.locator('#go').focus(); await page.keyboard.press('Shift+Tab'); // reaches a bean, which switches the tray to the grid
  ok(await page.locator('.beanTray.static').count() === 1, 'keyboard focus on a bean switches the tray to the grid');
  // a missed bad bean is still there after a full pass
  const bad = c.answer.defects[0];
  await page.evaluate(() => document.getAnimations().forEach(a => { if (a.animationName === 'beanslide') a.finish(); }));
  ok(await page.locator(`.bean[data-k="${bad}"]:not(.gone)`).count() === 1, 'missed bad beans are still on the tray for another pass');
  await close();
  if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
}
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
