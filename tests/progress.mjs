// Progress, stars, chapter select and the Memory shelf, including blocked, full and corrupt storage. Usage: node tests/progress.mjs
import fs from 'node:fs';
import { open, solveFast } from './lib.mjs';

const D = JSON.parse(fs.readFileSync(new URL('../chapters/ch1.json', import.meta.url), 'utf8'));
const BASE = 'http://127.0.0.1:5199/index.html';
let checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };
const text = (page, sel) => page.locator(sel).first().textContent();
const starsAt = (page, sel) => page.locator(sel).first().getAttribute('aria-label');
const skipIntro = async page => {
  await page.waitForSelector('#ovNext');
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
};
const done = [];
const finish = async (name, h) => { const errs = h.errors.slice(); await h.close(); ok(errs.length === 0, `${name}: no console errors (${errs.join('; ')})`); done.push(name); };

// 1. Fresh save: chapter select, only chapter 1 playable, bad ids go to the select screen
{
  const h = await open(1280, 720, { path: 'index.html', wait: '.chapterList' }), p = h.page;
  ok(await p.locator('.chapterCard').count() === 8, 'eight chapter cards');
  ok((await text(p, '.chapterCard:nth-child(1) .btn')) === 'Play', 'chapter 1 says Play');
  ok(await starsAt(p, '.chapterCard:nth-child(1) .stars') === '0 of 3 stars', 'no stars yet');
  for (const i of [2, 3, 4, 5, 6, 7, 8]) {
    ok((await text(p, `.chapterCard:nth-child(${i}) .state`)) === 'Locked', `chapter ${i} is locked on a fresh save`);
    ok(await p.locator(`.chapterCard:nth-child(${i}) a`).count() === 0, `chapter ${i} has no link`);
  }
  ok(await p.locator('.chapterCard .state', { hasText: 'Coming soon' }).count() === 0, 'every chapter is built, so none says coming soon');
  await p.goto(`${BASE}?c=ch2`); await p.waitForSelector('.chapterList');
  await p.goto(`${BASE}?c=nope`); await p.waitForSelector('.chapterList');
  ok(await p.locator('#app').isHidden(), 'select screen hides the game');
  await p.locator('.chapterCard:nth-child(1) .btn').click(); await p.waitForSelector('#ovNext');
  ok(new URL(p.url()).searchParams.get('c') === 'ch1', 'Play opens chapter 1');
  await finish('fresh save and routing', h);
}

// 2. Play, save, reload, replay: stars keep the best result, found clues are remembered and shown as seen
{
  const h = await open(1280, 720, { path: 'index.html', wait: '.chapterList' }), p = h.page;
  const run = async (opts, label) => {
    await p.goto(`${BASE}?c=ch1`); await skipIntro(p);
    await solveFast(p, D, opts);
    return starsAt(p, '.stats .stars');
  };
  ok(await run({ wrong: 3, visit: ['sign', 'table'] }) === '2 of 3 stars', 'run 1 (3 wrong tries) ends with 2 stars');
  ok((await p.locator('.stats b').nth(2).textContent()) === '2/7', 'ending counts the 2 clues found this run');
  await p.locator('#allChapters').click(); await p.waitForSelector('.chapterList');
  ok((await text(p, '.chapterCard:nth-child(1) .btn')) === 'Play again', 'card says Play again');
  ok((await text(p, '.chapterCard:nth-child(2) .btn')) === 'Play', 'chapter 2 opens once chapter 1 is done');
  ok(await starsAt(p, '.chapterCard:nth-child(1) .stars') === '2 of 3 stars', 'card shows 2 stars');
  await p.reload(); await p.waitForSelector('.chapterList');
  ok(await starsAt(p, '.chapterCard:nth-child(1) .stars') === '2 of 3 stars', 'stars survive a reload');
  await p.locator('#selShelfBtn').click(); await p.waitForSelector('.shelfGrid');
  ok(await p.locator('section:nth-of-type(1) .memo:not(.locked):not(.prefilled)').count() === 2, 'shelf shows the 2 found clues');
  const pre = await p.locator('section:nth-of-type(1) .memo.prefilled').count();
  ok(pre >= 1 && pre <= 4, `chapter 1 clues that later chapters need are pre-filled (${pre})`);
  ok(await p.locator('section:nth-of-type(1) .memo.locked').count() === D.clues.length - 2 - pre, 'the other chapter 1 clues are locked');
  await p.keyboard.press('Escape');
  ok(await p.locator('#shelfView').isHidden(), 'Escape closes the shelf');
  await p.locator('.chapterCard:nth-child(1) .btn').click(); await skipIntro(p);
  ok(await p.locator('.hs.found').count() === 0, 'replay starts with no clues found this run');
  ok(await p.locator('.hs.seen').count() === 2, 'earlier finds show as seen');
  ok((await text(p, '#clueCount')) === `0/${D.clues.length}`, 'clue counter starts at zero on a replay');
  await p.locator('#shelfBtn').click(); await p.waitForSelector('.shelfGrid');
  ok(await p.locator('section:nth-of-type(1) .memo:not(.locked):not(.prefilled)').count() === 2, 'shelf opens inside a chapter');
  await p.keyboard.press('Escape');
  ok(await run({}) === '3 of 3 stars', 'run 2 (clean) ends with 3 stars');
  ok(await run({ wrong: 5 }) === '2 of 3 stars', 'run 3 (5 wrong tries) ends with its own 2 stars');
  await p.locator('#allChapters').click(); await p.waitForSelector('.chapterList');
  ok(await starsAt(p, '.chapterCard:nth-child(1) .stars') === '3 of 3 stars', 'a worse replay never lowers the best stars');
  await finish('save, reload, replay, shelf', h);
}

// 3. Storage blocked completely (the getter throws, like cookies blocked in Chrome)
{
  const h = await open(1280, 720, { path: 'index.html?c=ch1', init: () => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }) }), p = h.page;
  ok(await p.evaluate(async () => !(await import('/js/store.js')).store.persistent), 'blocked storage is detected');
  await skipIntro(p); await solveFast(p, D, { wrong: 1, visit: ['sign'] });
  ok(await starsAt(p, '.stats .stars') === '3 of 3 stars', 'blocked storage: ending still shows stars');
  await p.locator('#allChapters').click(); await p.waitForSelector('.chapterList');
  await p.locator('#selShelfBtn').click(); await p.waitForSelector('.shelfGrid');
  await finish('storage blocked', h);
}

// 4. Storage full (setItem throws) and corrupt saved data
{
  const init = () => {
    try { localStorage.setItem('dadus-notebook:v1', '{not json'); } catch (e) { /* ignore */ }
    Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  };
  const h = await open(1280, 720, { path: 'index.html?c=ch1', init }), p = h.page;
  ok(await p.evaluate(async () => !(await import('/js/store.js')).store.persistent), 'full storage is detected');
  await skipIntro(p); await solveFast(p, D, { visit: ['sign'] });
  ok(await starsAt(p, '.stats .stars') === '3 of 3 stars', 'full and corrupt storage: ending still shows stars');
  await p.locator('#allChapters').click(); await p.waitForSelector('.chapterList');
  await finish('storage full and corrupt', h);
}

// 5. Phone and tablet widths for the select screen and shelf: no horizontal scroll
for (const [w, hh] of [[390, 844], [768, 1024]]) {
  const h = await open(w, hh, { path: 'index.html', wait: '.chapterList' }), p = h.page;
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${w}px select: no horizontal scroll`);
  await p.locator('#selShelfBtn').click(); await p.waitForSelector('.shelfGrid');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${w}px shelf: no horizontal scroll`);
  await finish(`select and shelf at ${w}`, h);
}
console.log(`PASS: ${checks} checks across ${done.length} scenarios (${done.join('; ')}), 0 console errors`);
