// Plays all of Chapter 2 using only values from chapters/ch2.json: a wrong answer on every step type, hints, the Memory shelf and the close-up view.
// Usage: node tests/play2.mjs [WIDTHxHEIGHT]   (default 1280x720). Chapter 1 is marked done in the saved data first.
import fs from 'node:fs';
import { open, noHScroll, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';
import fs0 from 'node:fs';
const UI = JSON.parse(fs0.readFileSync(new URL(`../i18n/${process.argv[3] || 'en'}.json`, import.meta.url), 'utf8'));
const thermClue = loadChapterFile('ch1', process.argv[3] || 'en').clues.find(c => c.id === 'therm');

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play2.mjs 1280x720 bn
const D = loadChapterFile('ch2', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
const seed = () => localStorage.getItem('dadus-notebook:v1') || localStorage.setItem('dadus-notebook:v1', JSON.stringify({ v: 1, chapters: { ch1: { done: true, stars: 3, hints: 0, mistakes: 0 } }, clues: {} }));
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch2', init: seed, lang: LANG });
let wrong = 0, hints = 0, checks = 0;
const mobile = W < 1000;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };
const said = () => page.locator('#saySr').textContent();
const expectSay = async (want, what) => {
  await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 })
    .catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await said()}"`); });
  checks++;
};
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const set = (loc, v) => loc.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
const hint = async (s, level) => { await page.keyboard.press('h'); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };
const text = f => (typeof f === 'string' ? f : f.text);

console.log(`Playing ${D.id} at ${W}x${H}`);
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
ok(await noHScroll(page), 'no horizontal scroll after the intro');

// taste test (compare-two): the wrong bar first, then a hint, then the right bar
const t = step('taste'); await waitTitle(t.title);
const optA = t.params.options.find(o => o.id !== t.answer.choice), optB = t.params.options.find(o => o.id === t.answer.choice);
ok((await page.locator('.tin', { hasText: optB.label }).textContent()).includes(`${N(optB.cacao)}%`), 'the kept bar shows its cacao percentage on screen');
await page.locator('.tin', { hasText: optA.label }).click();
ok((await page.locator('#sniff').textContent()).includes(optA.sense), 'tasting shows the sample text from data');
await page.locator('#pickGo').click(); wrong++; await expectSay(optA.no, 'wrong bar feedback');
await hint(t, 1); await hint(t, 2);
await page.locator('.tin', { hasText: optB.label }).click(); await page.locator('#pickGo').click(); await expectSay(t.feedback.correct, 'taste correct');

// clues: visit every hotspot, then close up on one picture
if (mobile) await page.locator('#tabShop').click();
for (const c of D.clues) { await page.locator(`.hs[data-id="${c.id}"]`).click(); await page.waitForFunction(x => document.querySelector('#memo h3')?.textContent === x, c.title); }
ok((await page.locator('#clueCount').textContent()) === `${N(D.clues.length)}/${N(D.clues.length)}`, 'all chapter 2 clues found');
await page.locator('#memo .zoomable').click();
ok(await page.locator('.zoomView svg').isVisible(), 'close-up opens from the clue card');
await page.keyboard.press('Escape'); ok(await page.locator('.zoomView').count() === 0, 'Escape closes the close-up');
if (mobile) await page.locator('#tabNote').click();

// mix (3 sliders): one part off, two parts off, then right
const m = step('mix'); await waitTitle(m.title);
const [sc, sm] = m.params.sliders, cac = page.locator('.tr3 input').nth(0), mil = page.locator('.tr3 input').nth(1);
await set(mil, m.answer.parts[2]); await set(cac, m.answer.parts[0] + 20);
await page.locator('#go').click(); wrong++; await expectSay(sc.high, 'mix: cacao too high');
await set(cac, m.answer.parts[0] - 20); await page.locator('#go').click(); wrong++; await expectSay(sc.low, 'mix: cacao too low');
await set(cac, m.answer.parts[0]); await set(mil, m.answer.parts[2] + 20); await page.locator('#go').click(); wrong++; await expectSay(sm.high, 'mix: milk too high');
await set(mil, m.answer.parts[2] - 15); await page.locator('#go').click(); wrong++; await expectSay(sm.low, 'mix: milk too low');
await set(mil, 55); await set(cac, 70);
ok(+(await cac.inputValue()) + +(await mil.inputValue()) <= m.params.total, 'sliders never push sugar below zero');
await page.locator('#go').click(); wrong++; await expectSay(`${sc.high} ${m.params.extraOff}`, 'mix: two parts off');
await set(mil, m.answer.parts[2] + 2); await set(cac, m.answer.parts[0] + 2);
await page.locator('#go').click(); wrong++; await expectSay(m.params.remainderLow, 'mix: only the sugar is off');
await set(cac, m.answer.parts[0]); await set(mil, m.answer.parts[2]);
await hint(m, 1); await hint(m, 2);
await page.locator('#go').click(); await expectSay(m.feedback.correct, 'mix correct');

// conche
const c = step('conche'); await waitTitle(c.title);
const cs = page.locator('#slide');
await set(cs, c.answer.value - c.answer.near); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.near, 'conche near');
await set(cs, c.answer.value - 4); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.low, 'conche low');
await set(cs, c.answer.value + 8); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.high, 'conche high');
await hint(c, 1); await hint(c, 2);
// chapter 1 clues the answer needs are on the Memory shelf, pre-filled
await page.locator('#shelfBtn').click(); await page.waitForSelector('.shelfGrid');
const pre = await page.locator('.memo.prefilled').allTextContents();
ok(pre.length >= 4 && pre.every(x => x.includes(UI['shelf.prefilled'])), 'sign, timetable, thermometer and the chapter 3 seizing note (needed by chapter 5) are pre-filled on the shelf');
await page.locator('.memo.prefilled', { hasText: thermClue.title }).locator('.zoomable').click();
ok(await page.locator('.zoomView').isVisible(), 'close-up opens from the shelf');
ok((await page.locator('.zoomView svg').innerHTML()).includes(thermClue.artText.milkTag), 'the milk tag is readable in the close-up');
await page.keyboard.press('Escape');
ok(await page.locator('.zoomView').count() === 0 && await page.locator('#shelfOv').isVisible(), 'Escape closes only the close-up, not the shelf');
await page.keyboard.press('Escape'); ok(await page.locator('#shelfOv').isHidden(), 'second Escape closes the shelf');
await set(cs, c.answer.value); await page.locator('#go').click(); await expectSay(c.feedback.correct, 'conche correct');

// temper
const tp = step('temper'); await waitTitle(tp.title);
const row = i => page.locator('.tr input').nth(i);
await set(row(0), tp.answer.values[0] + 6); await set(row(1), tp.answer.values[1]); await set(row(2), tp.answer.values[2] - 4);
await page.locator('#go').click(); wrong++; await expectSay(`${tp.params.rows[0].label}: ${tp.params.rows[0].high} ${tp.params.extraOff}`, 'temper: melt too hot');
await set(row(0), tp.answer.values[0]); await page.locator('#go').click(); wrong++; await expectSay(`${tp.params.rows[2].label}: ${tp.params.rows[2].low}`, 'temper: rewarm too cool');
await hint(tp, 1); await hint(tp, 2);
await set(row(2), tp.answer.values[2]); await page.locator('#go').click(); await expectSay(tp.feedback.correct, 'temper correct');

// mould and ending
const mo = step('mold'); await waitTitle(mo.title);
for (let i = 0; i < mo.answer.count; i++) await page.locator('#tap').click();
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending stats show ${hints} hints and ${wrong} wrong tries, got ${stats}`);
ok((await page.locator('.recipe').textContent()).includes(D.reveal.recipe[0]), 'ending recipe comes from data');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
console.log(`  ending: hints ${stats[0]}, wrong tries ${stats[1]}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')));
ok(saved.chapters.ch2 && saved.chapters.ch2.done && saved.chapters.ch2.stars === 1, 'chapter 2 result is saved under ch2 with 1 star');
ok(saved.chapters.ch1.stars === 3 && saved.chapters.ch1.done, 'chapter 1 result is untouched');
await page.goto(page.url()); await page.waitForSelector('#ovNext'); while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
ok(await page.locator('.hs.seen').count() === D.clues.length, 'a replay shows all chapter 2 clues as seen');

await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
