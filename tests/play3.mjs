// Plays all of Chapter 3 using only values from chapters/ch3.json: wrong answers, hints, tap, drag and keyboard placement.
// Usage: node tests/play3.mjs [WIDTHxHEIGHT]   (default 1280x720). Chapters 1 and 2 are marked done first.
import fs from 'node:fs';
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play3.mjs 1280x720 bn
const D = loadChapterFile('ch3', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
const fmt = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch3', init: seedDone(['ch1', 'ch2']), lang: LANG });
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
const hint = async (s, level) => { await page.keyboard.press('h'); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };
const pick = async opt => { // find the sample by its text, since labels are shuffled
  for (const t of await page.locator('.tin').all()) { await t.click(); if ((await page.locator('#sniff').textContent()).includes(opt.sense)) return; }
  throw new Error('could not find option ' + opt.id);
};

console.log(`Playing ${D.id} at ${W}x${H}`);
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
ok(await noHScroll(page), 'no horizontal scroll after the intro');

// sort-bins
const s1 = step('sort'), items = Object.fromEntries(s1.params.items.map(i => [i.id, i])), bins = Object.fromEntries(s1.params.bins.map(b => [b.id, b]));
await waitTitle(s1.title);
if (mobile) await page.locator('#tabShop').click();
for (const id of ['dry', 'cool', 'jar']) { await page.locator(`.hs[data-id="${id}"]`).click(); await page.waitForFunction(t => document.querySelector('#memo h3')?.textContent === t, D.clues.find(c => c.id === id).title); }
if (mobile) await page.locator('#tabNote').click();
const card = id => page.locator(`.card[data-k="${id}"]`), bin = id => page.locator(`.bin[data-id="${id}"]`);
const home = Object.fromEntries(Object.entries(s1.answer.bins).flatMap(([b, ids]) => ids.map(i => [i, b])));
const wrongBin = id => Object.keys(bins).find(b => b !== home[id]);
// wrong placements (tap), each with its own message
for (const id of ['sugar', 'bars', 'nibs']) {
  await card(id).click(); await bin(wrongBin(id)).click(); wrong++;
  const b = bins[wrongBin(id)];
  await expectSay(fmt(s1.params.wrongFeedback, { says: items[id].says, item: items[id].name, trait: items[id].trait, bin: b.name.toLowerCase(), rule: b.rule, ruleText: b.ruleText }), `wrong bin for ${id}`);
}
await bin('dry').click(); await expectSay(s1.params.pickFirst, 'no supply picked');
await hint(s1, 1); await hint(s1, 2);
// right placements: tap, keyboard, drag
const order = Object.keys(home);
await card(order[0]).click(); await bin(home[order[0]]).click(); await expectSay(s1.feedback.placed, 'tap placement');
await card(order[1]).focus(); await page.keyboard.press('Enter');
ok(await page.evaluate(k => document.activeElement.dataset.k === k, order[1]), 'focus stays on the supply after a keyboard pick');
await bin(home[order[1]]).focus(); await page.keyboard.press('Enter'); await expectSay(s1.feedback.placed, 'keyboard placement');
let from = 2;
if (!mobile) {
  const b = await card(order[2]).boundingBox(), t = await bin(home[order[2]]).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y - 20, { steps: 4 }); await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 }); await page.mouse.up();
  await expectSay(s1.feedback.placed, 'drag placement'); from = 3;
}
for (const id of order.slice(from)) { await card(id).click(); await bin(home[id]).click(); }
await expectSay(s1.feedback.complete, 'sort complete');
const aria = await bin('dry').getAttribute('aria-label');
ok(aria.includes(items[s1.answer.bins.dry[0]].name), 'a filled bin names what is in it');
await page.locator('#go').click();
log('sort-bins: three wrong shelves, hints, tap, keyboard and drag');

// rescue (pick one of four)
const r = step('rescue'); await waitTitle(r.title);
for (const o of r.params.options.filter(o => o.id !== r.answer.choice)) { await pick(o); await page.locator('#pickGo').click(); wrong++; await expectSay(o.no, `rescue: ${o.id}`); }
await hint(r, 1);
await pick(r.params.options.find(o => o.id === r.answer.choice)); await page.locator('#pickGo').click(); await expectSay(r.feedback.correct, 'rescue correct');

// milk (pick one of three)
const m = step('milk'); await waitTitle(m.title);
for (const o of m.params.options.filter(o => o.id !== m.answer.choice)) { await pick(o); await page.locator('#pickGo').click(); wrong++; await expectSay(o.no, `milk: ${o.id}`); }
await hint(m, 1); await hint(m, 2);
await pick(m.params.options.find(o => o.id === m.answer.choice)); await page.locator('#pickGo').click(); await expectSay(m.feedback.correct, 'milk correct');

// whisk and ending
const w = step('whisk'); await waitTitle(w.title);
for (let i = 0; i < w.answer.count; i++) await page.locator('#tap').click();
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending stats show ${hints} hints and ${wrong} wrong tries, got ${stats}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')));
ok(saved.chapters.ch3 && saved.chapters.ch3.done, 'chapter 3 result saved under ch3');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
console.log(`  ending: hints ${stats[0]}, wrong tries ${stats[1]}`);
await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);

function log(m) { console.log('  ' + m); }
