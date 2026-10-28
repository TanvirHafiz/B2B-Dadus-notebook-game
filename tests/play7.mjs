// Plays all of Chapter 7 using only values from the chapter data: three match-notes orders (wrong settings, free rows, hints, a valid alternative) and the mould.
// Usage: node tests/play7.mjs [WIDTHxHEIGHT] [en|bn]   Chapters 1 to 6 are marked done first.
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en';
const D = loadChapterFile('ch7', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
let wrong = 0, hints = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };

console.log(`Playing ${D.id} at ${W}x${H} in ${LANG}`);
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch7', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6']), reducedMotion: 'reduce', lang: LANG });
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
const expectSay = async (want, what) => { await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 }).catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await page.locator('#saySr').textContent()}"`); }); checks++; };
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const hint = async (s, level) => { await page.locator('#hintBtn').click(); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };
const pick = (k, id) => page.locator(`.mnOpt[data-k="${k}:${id}"]`).click();
const opt = (s, key, id) => s.params.settings.find(x => x.key === key).options.find(o => o.id === id);
const label = (s, key) => s.params.settings.find(x => x.key === key).label;

// the option buttons never show the taste (that text is the clue)
{ const s = step('nazma'); await waitTitle(s.title); const all = await page.locator('.mnOpt').allTextContents(); ok(s.params.settings.every(x => x.options.every(o => all.every(t => !t.includes(o.taste)))), 'option buttons do not show the taste'); }

const play = async (id, wrongSet, final) => {
  const s = step(id), P = s.params, want = s.answer.settings;
  await waitTitle(s.title);
  await page.locator('#go').click(); await expectSay(P.unfilled, `${id}: nothing picked`);
  for (const [k, v] of Object.entries(wrongSet)) await pick(k, v);
  await page.locator('#go').click(); wrong++;
  const bad = P.settings.filter(x => want[x.key] !== null && wrongSet[x.key] !== want[x.key]);
  ok(bad.length >= 1, `${id}: the wrong set is wrong`);
  const msgs = bad.map(x => P.wrong.replace('{label}', x.label).replace('{taste}', opt(s, x.key, wrongSet[x.key]).taste).replace('{customer}', P.customer).replace('{need}', P.needs[x.key]));
  await expectSay(msgs[0] + (bad.length > 1 ? ' ' + P.extraOff : ''), `${id}: wrong settings`);
  await hint(s, 1); await hint(s, 2);
  for (const [k, v] of Object.entries(final)) await pick(k, v);
  await page.locator('#go').click(); await expectSay(s.feedback.correct, `${id}: correct`);
};
// the first two settings wrong, the third is free
await play('nazma', { roast: 'dark', conche: '3', cacao: '70' }, { roast: 'light', conche: '6', cacao: '55' });
// a different free choice is accepted, and one wrong setting gives a message without the "another" line
{
  const s = step('jamal'), P = s.params; await waitTitle(s.title);
  for (const [k, v] of Object.entries({ roast: 'light', conche: '11', cacao: '70' })) await pick(k, v);
  await page.locator('#go').click(); wrong++;
  await expectSay(P.wrong.replace('{label}', label(s, 'cacao')).replace('{taste}', opt(s, 'cacao', '70').taste).replace('{customer}', P.customer).replace('{need}', P.needs.cacao), 'jamal: only cacao wrong');
  ok(await page.locator('.mnRow.ok').count() === 1, 'the right setting locks');
  await hint(s, 1); await hint(s, 2);
  await pick('cacao', '90'); await page.locator('#go').click(); await expectSay(s.feedback.correct, 'jamal: correct with roast light (free)');
}
await play('shumi', { roast: 'light', conche: '11', cacao: '90' }, { roast: 'medium', conche: '6', cacao: '55' });
// mould
{ const s = step('mold'); await waitTitle(s.title); for (let i = 0; i < s.answer.count; i++) await page.locator('#tap').click(); await expectSay(s.feedback.correct, 'mould'); }
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending shows ${hints} hints and ${wrong} wrong tries, got ${stats}`);
ok((await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')))).chapters.ch7.done, 'chapter 7 saved');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
