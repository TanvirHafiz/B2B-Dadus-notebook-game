// Plays all of Chapter 1 using only values from chapters/ch1.json: wrong answers, hints, every clue, and a full run to the ending.
// Usage: node tests/play.mjs [WIDTHxHEIGHT]   (default 1280x720)
import { open, noHScroll, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play.mjs 1280x720 bn
const D = loadChapterFile('ch1', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
const fmt = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const text = f => (typeof f === 'string' ? f : f.text);
const { page, errors, close } = await open(W, H, { lang: LANG });
let wrong = 0, hints = 0, checks = 0;
const log = m => console.log('  ' + m);
const ok = (cond, msg) => { checks++; if (!cond) throw new Error('FAILED: ' + msg); };
const said = () => page.locator('#saySr').textContent();
const expectSay = async (want, what) => {
  await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 })
    .catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await said()}"`); });
  checks++;
};
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const setRange = (loc, v) => loc.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
const mobile = W < 1000;
const hint = async (s, level) => { await page.keyboard.press('h'); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };

console.log(`Playing ${D.id} at ${W}x${H} in ${LANG}`);
ok(await page.evaluate(() => document.documentElement.lang) === LANG, 'the page language is set');

// intro: advance with the button, and once with the keyboard
let n = 0;
while (await page.locator('#overlay').isVisible()) {
  if (n === 2) await page.keyboard.press('Enter'); else await page.locator('#ovNext').click();
  n++; await page.waitForTimeout(60);
  if (n > 30) throw new Error('intro never ended');
}
ok(n === D.intro.reduce((a, c) => a + (c.talk ? c.talk.length : 1), 0), 'intro advanced one line per press');
log(`intro: ${n} presses`);
ok(await noHScroll(page), 'no horizontal scroll after intro');

// order
const o = step('order'), om = o.params.machines, byId = Object.fromEntries(om.map(m => [m.id, m]));
await waitTitle(o.title);
const card = id => page.locator(`.card[data-k="${id}"]`), slot = i => page.locator(`button.slot[data-i="${i}"]`);
await card(o.feedback.decoy).click(); await slot(0).click(); wrong++;
await expectSay(byId[o.feedback.decoy].says, 'decoy machine feedback');
const wrongId = o.answer.sequence[1];
await card(wrongId).click(); await slot(0).click(); wrong++;
await expectSay(fmt(o.feedback.wrong, { name: byId[wrongId].name, does: byId[wrongId].does, line: N(1), need: o.params.needs[0] }), 'wrong machine feedback');
await hint(o, 1);
for (let i = 0; i < o.answer.sequence.length; i++) {
  if (i === 2 && !mobile) { // mouse drag (phones use tap to pick, tap to place) for one placement
    const b = await card(o.answer.sequence[i]).boundingBox(), t = await slot(i).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 20, b.y - 20, { steps: 4 }); await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 }); await page.mouse.up();
  } else if (i === 1) { // keyboard only: Enter on the card, Enter on the blank, focus must stay on the card
    const id = o.answer.sequence[i]; await card(id).focus(); await page.keyboard.press('Enter');
    ok(await page.evaluate(k => document.activeElement.dataset.k === k, id), 'focus stays on the card after a keyboard pick');
    await slot(i).focus(); await page.keyboard.press('Enter');
  } else { await card(o.answer.sequence[i]).click(); await slot(i).click(); }
  await expectSay(o.feedback.placed[i], `placed line ${i + 1}`);
}
await expectSay(o.feedback.complete, 'order complete line');
await page.locator('#go').click();
log('order: wrong x2, hint, click and drag placement');

// roast
const r = step('roast'), opts = r.params.options;
await waitTitle(r.title);
const tinFor = {};
for (const t of await page.locator('.tin').all()) {
  await t.click(); const s = await page.locator('#sniff').textContent();
  const op = opts.find(x => s.includes(x.sense)); ok(op, 'sniff text comes from data'); tinFor[op.id] = await t.getAttribute('data-id');
}
const badOpt = opts.find(x => x.id !== r.answer.choice);
await page.locator(`.tin[data-id="${tinFor[badOpt.id]}"]`).click(); await page.locator('#pickGo').click(); wrong++;
await expectSay(badOpt.no, 'wrong tin feedback');
const rightOpt = opts.find(x => x.tag === 'toasted bread');
ok(rightOpt.id === r.answer.choice, 'tag matches answer');
await page.locator(`.tin[data-id="${tinFor[rightOpt.id]}"]`).click(); await page.locator('#pickGo').click();
await expectSay(r.feedback.correct, 'roast correct');
log('roast: wrong tin, then the right tin by smell');

// winnow
const w = step('winnow'); await waitTitle(w.title);
for (let i = 0; i < w.answer.count; i++) await page.locator('#tap').click();
await expectSay(w.feedback.correct, 'winnow done');

// grind: visit every clue first
const g = step('grind'); await waitTitle(g.title);
if (mobile) await page.locator('#tabShop').click();
for (const c of D.clues) {
  await page.locator(`.hs[data-id="${c.id}"]`).click();
  await page.waitForFunction(t => document.querySelector('#memo h3')?.textContent === t, c.title);
}
ok((await page.locator('#clueCount').textContent()) === `${N(D.clues.length)}/${N(D.clues.length)}`, 'all clues found');
await page.locator('.hs[data-id="therm"]').click();
const therm = await page.locator('#memo svg').innerHTML();
ok(Object.values(D.clues.find(c => c.id === 'therm').labels).every(l => therm.includes(`>${l}</text>`)), 'thermometer shows R, B, G letters');
if (mobile) await page.locator('#tabNote').click();
await hint(g, 1);
const slide = page.locator('#slide');
await setRange(slide, g.answer.parts[0] + 100); await page.locator('#go').click(); wrong++; await expectSay(text(g.feedback.high), 'grind high');
await setRange(slide, g.answer.parts[0] - 200); await page.locator('#go').click(); wrong++; await expectSay(text(g.feedback.low), 'grind low');
await setRange(slide, g.answer.parts[0] - g.params.step); await slide.focus(); await page.keyboard.press('ArrowRight');
ok(+(await slide.inputValue()) === g.answer.parts[0], 'arrow key moves slider one step');
await page.locator('#go').click(); await expectSay(g.feedback.correct, 'grind correct');
log('grind: all clues, hint, high, low, arrow key, correct');

// conche
const c = step('conche'); await waitTitle(c.title);
await hint(c, 1); await hint(c, 2);
const cs = page.locator('#slide');
await setRange(cs, c.answer.value - c.answer.near); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.near, 'conche near');
await setRange(cs, c.answer.value - 6); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.low, 'conche low');
await setRange(cs, c.answer.value + 8); await page.locator('#go').click(); wrong++; await expectSay(c.feedback.high, 'conche high');
await setRange(cs, c.answer.value); await page.locator('#go').click(); await expectSay(c.feedback.correct, 'conche correct');
log('conche: near, low, high, both hints, correct');

// temper
const t = step('temper'); await waitTitle(t.title);
const row = i => page.locator('.tr input').nth(i);
await setRange(row(0), t.answer.values[0] + 6); await setRange(row(1), t.answer.values[1]); await setRange(row(2), t.answer.values[2] - 4);
await page.locator('#go').click(); wrong++; await expectSay(`${t.params.rows[0].label}: ${t.params.rows[0].high} ${t.params.extraOff}`, 'temper melt too hot, one more off');
await setRange(row(0), t.answer.values[0]);
await page.locator('#go').click(); wrong++; await expectSay(`${t.params.rows[2].label}: ${t.params.rows[2].low}`, 'temper rewarm too cool');
await setRange(row(2), t.answer.values[2] + t.answer.tolerance); await page.locator('#go').click(); await expectSay(t.feedback.correct, 'temper correct (within tolerance)');
log('temper: too hot, too cool, correct');

// mold
const m = step('mold'); await waitTitle(m.title);
const notes = D.notebook.lines.filter(l => l.note), shown = await page.locator('.ln .note').allTextContents();
ok(notes.every(l => shown.includes(l.note)), `solved lines show their notes (${shown.join(' | ')})`);
for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
await expectSay(m.feedback.correct, 'mold done');

// ending
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending stats show ${hints} hints and ${wrong} wrong tries, got ${stats}`);
ok((await page.locator('.recipe').textContent()).includes(D.reveal.recipe[0]), 'ending recipe comes from data');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
console.log(`  ending: hints ${stats[0]}, wrong tries ${stats[1]}, memories ${stats[2]}`);

await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
