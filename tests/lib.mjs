import { chromium } from 'playwright';
import fs from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { deepMerge } from '../js/i18n.js';

// A chapter as the game shows it: the English file with the language's overlay merged over it (when the chapter has one).
export function loadChapterFile(id, lang = 'en') {
  const en = JSON.parse(fs.readFileSync(new URL(`../chapters/${id}.json`, import.meta.url), 'utf8'));
  const f = new URL(`../chapters/${id}.${lang}.json`, import.meta.url);
  return lang !== 'en' && fs.existsSync(f) ? deepMerge(en, JSON.parse(fs.readFileSync(f, 'utf8'))) : en;
}

export async function open(width, height, { port = 5199, reducedMotion = 'no-preference', path = 'index.html?c=ch1', init = null, wait = '#ovNext', lang = 'en', fonts = 'empty', before = null } = {}) {
  const server = await serve(port);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, hasTouch: width < 800, isMobile: width < 800 });
  // Web fonts come from Google Fonts. Answer those requests with empty files so the run is offline-safe and quiet.
  if (fonts === 'empty') await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: r.request().url().includes('googleapis') ? 'text/css' : 'font/woff2', body: '' }));
  if (lang !== 'en') await context.addInitScript(`if (!localStorage.getItem('dadus-notebook:lang')) localStorage.setItem('dadus-notebook:lang', ${JSON.stringify(lang)});`);
  if (init) await context.addInitScript(typeof init === 'string' ? { content: init } : init);
  if (before) await before(context);
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  await page.goto(`http://127.0.0.1:${port}/${path}`);
  if (wait) await page.waitForSelector(wait);
  const close = async () => { await browser.close(); server.close(); };
  return { page, errors, close };
}

export const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);

// Fast solver used by the screenshot script to reach the ending. tests/play.mjs is the full check.
export async function solveFast(page, D, { wrong = 0, visit = [] } = {}) {
  const set = (loc, v) => loc.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
  const title = t => page.waitForFunction(x => document.querySelector('#panel h2')?.textContent === x, t, { timeout: 6000 });
  const S = id => D.steps.find(s => s.id === id);
  const o = S('order'); await title(o.title);
  for (let i = 0; i < 5; i++) { await page.locator(`.card[data-k="${o.answer.sequence[i]}"]`).click(); await page.locator(`button.slot[data-i="${i}"]`).click(); }
  await page.locator('#go').click();
  const r = S('roast'); await title(r.title);
  const good = r.params.options.find(x => x.id === r.answer.choice);
  for (const t of await page.locator('.tin').all()) { await t.click(); if ((await page.locator('#sniff').textContent()).includes(good.sense)) break; }
  await page.locator('#pickGo').click();
  const w = S('winnow'); await title(w.title); for (let i = 0; i < w.answer.count; i++) await page.locator('#tap').click();
  const g = S('grind'); await title(g.title);
  for (const id of visit) { if (await page.locator('#tabShop').isVisible()) await page.locator('#tabShop').click(); await page.locator(`.hs[data-id="${id}"]`).click(); if (await page.locator('#tabNote').isVisible()) await page.locator('#tabNote').click(); }
  for (let i = 0; i < wrong; i++) { await set(page.locator('#slide'), g.answer.parts[0] + 100); await page.locator('#go').click(); }
  await set(page.locator('#slide'), g.answer.parts[0]); await page.locator('#go').click();
  const c = S('conche'); await title(c.title); await set(page.locator('#slide'), c.answer.value); await page.locator('#go').click();
  const t = S('temper'); await title(t.title); for (let i = 0; i < 3; i++) await set(page.locator('.tr input').nth(i), t.answer.values[i]); await page.locator('#go').click();
  const m = S('mold'); await title(m.title); for (let i = 0; i < m.answer.count; i++) await page.locator('#tap').click();
  await page.waitForSelector('#again', { state: 'visible', timeout: 6000 });
}

// Init script that marks the given chapters as done in the saved data (only when nothing is saved yet).
export const seedDone = ids => `if (!localStorage.getItem('dadus-notebook:v1')) localStorage.setItem('dadus-notebook:v1', JSON.stringify({ v: 1, clues: {}, chapters: Object.fromEntries(${JSON.stringify(ids)}.map(id => [id, { done: true, stars: 3, hints: 0, mistakes: 0 }])) }));`;

export const setRange = (loc, v) => loc.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
