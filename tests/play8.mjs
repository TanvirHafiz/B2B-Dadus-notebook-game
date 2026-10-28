// Plays all of Chapter 8 using only values from the chapter data: three free-build orders (every rule failing, a valid build that is not the example,
// fresh coconut, the fridge), the naming and wrapper screen (markup in the name, bidi characters, long names), the shutter, and the ending with the player's bar.
// Usage: node tests/play8.mjs [WIDTHxHEIGHT] [en|bn]   Chapters 1 to 7 are marked done first.
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en';
const D = loadChapterFile('ch8', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
let wrong = 0, hints = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };

console.log(`Playing ${D.id} at ${W}x${H} in ${LANG}`);
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch8', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7']), reducedMotion: 'reduce', lang: LANG });
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
const expectSay = async (want, what) => { await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 }).catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await page.locator('#saySr').textContent()}"`); }); checks++; };
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const hint = async (s, level) => { await page.locator('#hintBtn').click(); if (s.id !== 'name') hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };
const pickAll = async build => { for (const [k, v] of Object.entries(build)) await page.locator(`.mnOpt[data-k="${k}:${v}"]`).click(); };
const check = () => page.locator('#go').click();

// A build that breaks the rules in the order they are listed: the first broken rule is spoken, and the others are summed up.
const run = async (id, otherValid) => {
  const s = step(id), P = s.params, ex = s.answer.example, C = s.answer.constraints; await waitTitle(s.title);
  await check(); await expectSay(P.unfilled, `${id}: nothing picked`);
  // every field set to an option that breaks its rule (or the first option for a free row)
  const breaking = {}; for (const f of P.fields) { const c = C.find(x => x.field === f.key); breaking[f.key] = c ? f.options.find(o => o.id !== ex[f.key] && !(c.op === 'in' ? c.value.includes(o.id) : false) && !(c.op === 'gte' && Number(o[f.numAttr]) >= Number(f.options.find(q => q.id === c.value)[f.numAttr]))).id : f.options[0].id; }
  await pickAll(breaking); await check(); wrong++;
  await expectSay(P.no[C[0].field] + ' ' + P.extraOff, `${id}: every rule broken`);
  await hint(s, 1); await hint(s, 2);
  // fix the rules one at a time from the end: each wrong try names exactly the first remaining broken rule
  for (let i = C.length - 1; i >= 1; i--) { await pickAll({ [C[i].field]: ex[C[i].field] }); }
  await pickAll({ [C[0].field]: ex[C[0].field] });
  return { s, P, ex, C };
};
// order 1: also try the fridge with everything else right, then fresh coconut, then a valid build that is not the example
{
  const { s, P, ex } = await run('o1');
  await pickAll({ keep: 'fridge' }); await check(); wrong++; await expectSay(P.no.keep, 'o1: the fridge is refused');
  await pickAll({ keep: ex.keep, topping: 'fresh' }); await check(); wrong++; await expectSay(P.no.topping, 'o1: fresh coconut is refused');
  await pickAll({ topping: 'puffed' }); await check(); await expectSay(s.feedback.correct, 'o1: a valid build that is not the example is accepted');
}
{ const { s } = await run('o2'); await check(); await expectSay(s.feedback.correct, 'o2: correct'); }
{ const { s, P, ex } = await run('o3'); await pickAll({ keep: 'window' }); await check(); wrong++; await expectSay(P.no.keep, 'o3: the sunny window is refused'); await pickAll({ keep: ex.keep }); await check(); await expectSay(s.feedback.correct, 'o3: correct'); }

// naming and wrapper
{
  const s = step('name'), P = s.params; await waitTitle(s.title);
  ok(await page.locator('#nwInput').getAttribute('maxlength') === null, 'the limit is counted in characters in code, not with maxlength');
  await check(); await expectSay(P.emptyName, 'name: empty');
  const messy = '<b>"A&B"</b>‮txt   x' + 'z'.repeat(40);
  await page.locator('#nwInput').fill(messy);
  const typed = await page.locator('#nwInput').inputValue();
  ok(!typed.includes('‮') && [...typed].length <= P.maxLength, `the name is cleaned and limited to ${P.maxLength} characters (${typed.length})`);
  ok(await page.locator('#nwPrev svg b').count() === 0 && (await page.locator('#nwPrev svg text').textContent()) === typed.trim(), 'the preview shows the name as plain text');
  await page.locator('.mnOpt[data-id="milk"]').click();
  ok((await page.locator('#nwInput').inputValue()) === typed, 'the name survives choosing a wrapper');
  await page.locator('#nwInput').fill(LANG === 'bn' ? 'দাদুর ডার্ক' : "Dadu's Dark");
  await hint(s, 1);
  await check();
  await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('dadus-notebook:v1')).shop, null, { timeout: 4000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')).shop);
  ok(saved.wrapper === 'milk' && saved.name === (LANG === 'bn' ? 'দাদুর ডার্ক' : "Dadu's Dark"), 'the name and wrapper are saved on this device');
  await expectSay(s.feedback.correct.replace('{name}', saved.name), 'name: done');
}
// shutter
{ const s = step('shutter'); await waitTitle(s.title); for (let i = 0; i < s.answer.count; i++) await page.locator('#tap').click(); await expectSay(s.feedback.correct, 'shutter'); }
await page.waitForSelector('#again', { state: 'visible', timeout: 8000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending shows ${hints} hints (naming is not scored) and ${wrong} wrong tries, got ${stats}`);
ok(await page.locator('.wrapperCard svg text').textContent() === (LANG === 'bn' ? 'দাদুর ডার্ক' : "Dadu's Dark"), 'the ending shows the bar with its name');
ok((await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')))).chapters.ch8.done, 'chapter 8 saved');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
