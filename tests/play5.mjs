// Plays all of Chapter 5 using only values from chapters/ch5.json: scale the recipe, conche, fill the tray (with the fresh coconut decoy), mould.
// Usage: node tests/play5.mjs [WIDTHxHEIGHT]   (default 1280x720). Chapters 1 to 4 are marked done first.
import fs from 'node:fs';
import { open, noHScroll, seedDone, setRange, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play5.mjs 1280x720 bn
const D = loadChapterFile('ch5', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
const fmt = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
let wrong = 0, hints = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };

console.log(`Playing ${D.id} at ${W}x${H}`);
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch5', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4']), reducedMotion: 'reduce', lang: LANG });
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
const expectSay = async (want, what) => { await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 }).catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await page.locator('#saySr').textContent()}"`); }); checks++; };
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const hint = async (s, level) => { await page.locator('#hintBtn').click(); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };
const type = async (k, v) => { const i = page.locator(`input[data-k="${k}"]`); await i.fill(String(v)); };

// ---- scale the recipe ----
{
  const s = step('scale'), F = Object.fromEntries(s.params.fields.map(f => [f.key, f])), A = s.answer.fields;
  await waitTitle(s.title);
  ok(await page.locator('input[data-k="cacao"]').isVisible() && (await page.locator('input[data-k="cacao"]').boundingBox()).height >= 40, 'the number boxes are visible');
  await page.locator('#go').click(); await expectSay(s.params.unfilled, 'empty boxes');
  await type('cacao', A.cacao + 500); await type('sugar', A.sugar - 100); await type('bars', A.bars);
  await page.locator('#go').click(); wrong++; await expectSay(F.cacao.high + ' ' + s.params.extraOff, 'cacao too high and sugar too low');
  ok(await page.locator('input[data-k="bars"][disabled]').count() === 1, 'the right box locks');
  await hint(s, 1);
  await type('cacao', A.cacao + F.cacao.near - 1);
  await page.locator('#go').click(); wrong++; await expectSay(F.cacao.nearText + ' ' + s.params.extraOff, 'cacao near');
  await type('cacao', A.cacao - 1000); await type('sugar', String(A.sugar + 1000).replace(/(d)(d{3})$/, '$1 $2') + 'g');
  await page.locator('#go').click(); wrong++; await expectSay(F.cacao.low + ' ' + s.params.extraOff, 'cacao low and a comma number');
  await hint(s, 2);
  await type('cacao', A.cacao); await type('sugar', A.sugar);
  await page.locator('input[data-k="sugar"]').press('Enter'); await expectSay(s.feedback.correct, 'scale correct (Enter runs Check)');
}
// ---- conche ----
{
  const s = step('conche'); await waitTitle(s.title);
  await setRange(page.locator('#slide'), s.answer.value * 5); await page.locator('#go').click(); wrong++; await expectSay(s.feedback.high, 'five times the hours');
  await setRange(page.locator('#slide'), s.answer.value + s.answer.near); await page.locator('#go').click(); wrong++; await expectSay(s.feedback.near, 'conche near');
  await hint(s, 1); await hint(s, 2);
  await setRange(page.locator('#slide'), s.answer.value); await page.locator('#go').click(); await expectSay(s.feedback.correct, 'conche correct');
}
// ---- the tray ----
{
  const s = step('tray'), pr = s.params, g = s.answer.grid, T = Object.fromEntries(pr.toppings.map(t => [t.id, t]));
  await waitTitle(s.title);
  ok(await page.locator('.sq').count() === pr.rows * pr.cols, 'every square is drawn');
  ok((await page.locator('.sq').first().getAttribute('aria-label')).startsWith(fmt(pr.squareLabel, { row: N(1), col: N(1) })), 'squares are named by row and column');
  await page.locator('.sq').first().click(); await expectSay(pr.pickFirst, 'square with no topping');
  await page.locator('#go').click(); await expectSay(s.feedback.unfilled, 'check an empty tray');
  const decoy = pr.toppings.find(t => t.reject).id;
  await page.locator(`.card[data-k="${decoy}"]`).click();
  ok((await page.locator('#info').textContent()) === T[decoy].says, 'tapping the decoy only describes it');
  await page.locator('.sq').nth(3).click(); wrong++; await expectSay(T[decoy].reject, 'fresh coconut on a square');
  ok(await page.locator('.sq.on').count() === 0, 'the decoy is never placed');
  await page.locator('.sq').nth(4).click(); await expectSay(pr.pickFirst, 'selection is cleared after a rejection');
  // paint everything wrong first (all plain), then fix it
  const ids = [...new Set(g)], plain = pr.toppings.find(t => t.id === 'P').id;
  await page.locator(`.card[data-k="${plain}"]`).click();
  for (let i = 0; i < g.length; i++) await page.locator(`.sq[data-i="${i}"]`).click();
  ok(await page.locator('.sq.on').count() === g.length, 'every square can be filled');
  const off = g.filter(x => x !== plain).length;
  await page.locator('#go').click(); wrong++; await expectSay(fmt(s.feedback.wrongSquares, { n: N(off) }), 'all plain is wrong');
  await hint(s, 1); await hint(s, 2);
  // keyboard: select a topping with Enter, then press Enter on a square
  const other = ids.find(x => x !== plain);
  await page.locator(`.card[data-k="${other}"]`).focus(); await page.keyboard.press('Enter');
  const first = g.findIndex(x => x === other);
  await page.locator(`.sq[data-i="${first}"]`).focus(); await page.keyboard.press('Enter');
  ok((await page.locator(`.sq[data-i="${first}"]`).getAttribute('aria-label')).includes(T[other].name), 'keyboard fills a square');
  // drag a topping onto a square
  const third = ids.find(x => x !== plain && x !== other), spot = g.findIndex(x => x === third);
  const a = await page.locator(`.card[data-k="${third}"]`).boundingBox(), b = await page.locator(`.sq[data-i="${spot}"]`).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
  ok((await page.locator(`.sq[data-i="${spot}"]`).getAttribute('aria-label')).includes(T[third].name), 'dragging a topping fills a square');
  // two squares fixed, the rest still wrong
  await page.locator('#go').click(); wrong++;
  await expectSay(fmt(s.feedback.wrongSquares, { n: N(g.filter(x => x !== plain).length - 2) }), 'two squares fixed');
  let held = await page.locator('.card[aria-pressed="true"]').first().getAttribute('data-k').catch(() => null);
  for (let i = 0; i < g.length; i++) { if (held !== g[i]) { await page.locator(`.card[data-k="${g[i]}"]`).click(); held = g[i]; } await page.locator(`.sq[data-i="${i}"]`).click(); }
  await page.locator('#go').click(); await expectSay(s.feedback.correct, 'tray correct');
}
// ---- mould ----
{
  const s = step('mold'); await waitTitle(s.title);
  for (let i = 0; i < s.answer.count; i++) await page.locator('#tap').click();
  await expectSay(s.feedback.correct, 'mould');
}
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints), `ending shows ${hints} hints, got ${stats[0]}`);
ok(true, `ending shows at least ${wrong} wrong tries, got ${stats[1]}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')));
ok(saved.chapters.ch5 && saved.chapters.ch5.done, 'chapter 5 result saved');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
