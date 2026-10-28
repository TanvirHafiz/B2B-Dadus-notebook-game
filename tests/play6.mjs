// Plays all of Chapter 6 using only values from chapters/ch6.json: diagnose three bars, fix by seeding, mould.
// Usage: node tests/play6.mjs [WIDTHxHEIGHT]   (default 1280x720). Chapters 1 to 5 are marked done first.
import fs from 'node:fs';
import { open, noHScroll, seedDone, setRange, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

const [W, H] = (process.argv[2] || '1280x720').split('x').map(Number);
const LANG = process.argv[3] || 'en'; // node tests/play6.mjs 1280x720 bn
const D = loadChapterFile('ch6', LANG), N = n => digits(n, LANG);
const step = id => D.steps.find(s => s.id === id);
let wrong = 0, hints = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };

console.log(`Playing ${D.id} at ${W}x${H}`);
const { page, errors, close } = await open(W, H, { path: 'index.html?c=ch6', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5']), reducedMotion: 'reduce', lang: LANG });
while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
const expectSay = async (want, what) => { await page.waitForFunction(w => document.querySelector('#saySr').textContent === w, want, { timeout: 4000 }).catch(async () => { throw new Error(`FAILED: ${what}. Wanted "${want}", got "${await page.locator('#saySr').textContent()}"`); }); checks++; };
const waitTitle = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
const hint = async (s, level) => { await page.locator('#hintBtn').click(); hints++; await expectSay(s.hints[level - 1], `${s.id} hint ${level}`); };

// ---- diagnose ----
{
  const s = step('diagnose'), pr = s.params, C = Object.fromEntries(pr.causes.map(c => [c.id, c])), P = Object.fromEntries(pr.photos.map(p => [p.id, p])), A = s.answer.pairs;
  await waitTitle(s.title);
  ok((await page.locator('#info').textContent()) === pr.photoHint, 'starts with the tap-a-bar hint');
  ok(await page.locator('.cause').count() === 0, 'no cause buttons before a bar is tested');
  await page.locator('#go').click(); await expectSay(pr.unfilled, 'check before testing');
  const choose = async (bar, cause) => { await page.locator(`.dxBar[data-id="${bar}"]`).click(); ok((await page.locator('#info').textContent()) === P[bar].testText, `touch test for ${bar}`); await page.locator(`.cause[data-k="${cause}"]`).click(); ok((await page.locator('#info2').textContent()) === C[cause].says, `says for ${cause}`); };
  const ids = pr.photos.map(p => p.id), causes = pr.causes.map(c => c.id);
  // rotate the causes so every bar is wrong
  const rot = Object.fromEntries(ids.map(id => [id, causes[(causes.indexOf(A[id]) + 1) % causes.length]]));
  for (const id of ids) await choose(id, rot[id]);
  await page.locator('#go').click(); wrong++; await expectSay(`${P[ids[0]].label}: ${pr.wrongText[rot[ids[0]]]} ${pr.extraOff}`, 'all three wrong');
  ok(await page.locator('.dxBar.ok').count() === 0, 'wrong bars do not lock');
  await hint(s, 1); await hint(s, 2);
  // fix one at a time: the first bar right, the other two still wrong
  await choose(ids[0], A[ids[0]]);
  for (const id of ids.slice(1)) await choose(id, rot[id]);
  await page.locator('#go').click(); wrong++; await expectSay(`${P[ids[1]].label}: ${pr.wrongText[rot[ids[1]]]} ${pr.extraOff}`, 'one bar right');
  ok(await page.locator('.dxBar.ok').count() === 1, 'the right bar locks');
  for (const id of ids.slice(1)) await choose(id, A[id]);
  await page.locator('#go').click(); await expectSay(s.feedback.correct, 'diagnose correct');
}
// ---- fix by seeding ----
{
  const s = step('fix'), pr = s.params, A = s.answer.values;
  await waitTitle(s.title);
  ok((await page.locator('.tr output').allTextContents()).join() === pr.rows.map(r => N(r.start ?? pr.start) + r.unit).join(), 'each row starts at its own value and unit');
  const row = i => page.locator('.tr input').nth(i);
  await setRange(row(0), A[0] - 8); await setRange(row(1), A[1] + 20); await setRange(row(2), A[2] + 6);
  await page.locator('#go').click(); wrong++; await expectSay(`${pr.rows[0].label}: ${pr.rows[0].low} ${pr.extraOff}`, 'all three rows off');
  await hint(s, 1); await hint(s, 2);
  await setRange(row(0), A[0]); await page.locator('#go').click(); wrong++;
  await expectSay(`${pr.rows[1].label}: ${pr.rows[1].high} ${pr.extraOff}`, 'melt locks, seed and cool still off');
  await setRange(row(1), A[1] + 1); await setRange(row(2), A[2]);
  await page.locator('#go').click(); await expectSay(s.feedback.correct, 'seeding correct (seed within tolerance)');
}
// ---- mould ----
{
  const s = step('mold'); await waitTitle(s.title);
  for (let i = 0; i < s.answer.count; i++) await page.locator('#tap').click();
  await expectSay(s.feedback.correct, 'mould');
}
await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
const stats = await page.locator('.stats b').allTextContents();
ok(stats[0] === N(hints) && stats[1] === N(wrong), `ending shows ${hints} hints and ${wrong} wrong tries, got ${stats}`);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dadus-notebook:v1')));
ok(saved.chapters.ch6 && saved.chapters.ch6.done, 'chapter 6 result saved');
ok(await noHScroll(page), 'no horizontal scroll at the ending');
await close();
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`PASS: ${checks} checks, ${wrong} wrong answers, ${hints} hints, 0 console errors`);
