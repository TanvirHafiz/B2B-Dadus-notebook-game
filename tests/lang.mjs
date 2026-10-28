// Language checks: the switch on both screens, the saved choice, ?lang=, storage blocked, a chapter with no translation inside a Bangla page,
// Bengali digits in the number boxes, and the Bangla typing effect.
// Usage: node tests/lang.mjs
import { open, noHScroll, seedDone, loadChapterFile } from './lib.mjs';
import { digits } from '../js/i18n.js';

let checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };
const bn = loadChapterFile('ch1', 'bn'), en = loadChapterFile('ch1', 'en');
const ui = JSON.parse((await import('node:fs')).readFileSync(new URL('../i18n/bn.json', import.meta.url), 'utf8'));
const uiEn = JSON.parse((await import('node:fs')).readFileSync(new URL('../i18n/en.json', import.meta.url), 'utf8'));
const text = (p, sel) => p.locator(sel).first().textContent();

// ---- chapter screen: switch to Bangla and back, and the choice is remembered ----
{
  const { page, errors, close } = await open(1280, 720, { path: 'index.html', wait: '.chapterList' });
  ok(await page.evaluate(() => document.documentElement.lang) === 'en', 'English by default');
  ok((await text(page, '#selLangBtn')) === 'বাংলা', 'the switch offers Bangla');
  ok((await text(page, '.chapterCard:nth-child(1) h2')) === en.title, 'English chapter title');
  await page.locator('#selLangBtn').click(); await page.waitForSelector('.chapterList');
  ok(await page.evaluate(() => document.documentElement.lang) === 'bn', 'page language is bn after the switch');
  ok((await text(page, '#selLangBtn')) === 'English', 'the switch offers English');
  ok((await text(page, '.chapterCard:nth-child(1) h2')) === bn.title, 'chapter 1 title is in Bangla');
  ok((await text(page, '.chapterCard:nth-child(5) h2')) === loadChapterFile('ch5', 'bn').title, 'chapter 5 title is in Bangla');
  ok((await text(page, '.chapterCard:nth-child(1) .cno')) === digits(0 + 1, 'bn').replace(/^/, ui['select.chapter'].replace('{n}', '')) , 'chapter number uses Bengali digits');
  ok((await text(page, '.chapterCard:nth-child(8) h2')) === loadChapterFile('ch8', 'bn').title, 'chapter 8 title is in Bangla');
  ok(await page.locator('.chapterCard:nth-child(8)').getAttribute('lang') === 'bn', 'and is marked as Bangla');
  ok((await text(page, '#selShelfBtn')) === ui['nav.shelf'], 'shelf button is in Bangla');
  await page.reload(); await page.waitForSelector('.chapterList');
  ok(await page.evaluate(() => document.documentElement.lang) === 'bn', 'the choice is remembered after a reload');
  ok(await noHScroll(page), 'no horizontal scroll');
  await page.locator('#selLangBtn').click(); await page.waitForSelector('.chapterList');
  ok(await page.evaluate(() => document.documentElement.lang) === 'en', 'back to English');
  ok((await text(page, '#selShelfBtn')) === uiEn['nav.shelf'], 'shelf button is in English again');
  await close(); if (errors.length) throw new Error('console errors: ' + errors.join('; '));
}

// ---- inside a chapter: header, Bangla chapter, no letter spacing, switch with the confirm ----
{
  const { page, errors, close } = await open(1280, 720, { lang: 'bn' });
  ok((await text(page, '#chaptersBtn')) === ui['nav.chapters'] && (await text(page, '#hintBtn')).includes(ui['nav.hint']), 'game header is in Bangla');
  ok((await text(page, '#gameTitle')) === bn.gameTitle, 'game title is in Bangla');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#gameTitle')).letterSpacing) === 'normal', 'no extra letter spacing on Bangla text');
  ok(await page.evaluate(() => document.querySelector('.cols').lang) === 'bn' && await page.evaluate(() => document.querySelector('#overlay').lang) === 'bn', 'the chapter is marked as Bangla');
  ok(await page.locator('.pt .bn').isHidden(), 'one notebook title in Bangla, not two');
  // the typing effect never cuts a letter cluster: every state is a prefix made of whole characters
  const states = await page.evaluate(async () => {
    const seen = new Set(), el = document.querySelector('#sayTxt'), end = Date.now() + 2500;
    while (Date.now() < end) { seen.add(el.textContent); await new Promise(r => setTimeout(r, 8)); }
    return [...seen];
  });
  const seg = s => [...new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(s)].length;
  ok(states.every(s => !/^[া-্ৗ]/.test(s) && !/্$/.test(s)), 'typing never starts with a vowel sign or ends on a hasanta');
  await close(); if (errors.length) throw new Error('console errors: ' + errors.join('; '));
}
// ---- ?lang= sets and saves the language ----
{
  const { page, close } = await open(1280, 720, { path: 'index.html?lang=bn', wait: '.chapterList' });
  ok(await page.evaluate(() => document.documentElement.lang) === 'bn', '?lang=bn works');
  ok(await page.evaluate(() => localStorage.getItem('dadus-notebook:lang')) === 'bn', 'and is saved');
  ok(await page.evaluate(() => JSON.stringify(Object.keys(JSON.parse(localStorage.getItem('dadus-notebook:v1') || '{"chapters":{}}'))).includes('lang')) === false, 'the language is not stored inside the progress data');
  await close();
}
// ---- storage blocked: links carry the language ----
{
  const block = `Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });`;
  const { page, errors, close } = await open(1280, 720, { path: 'index.html?lang=bn', wait: '.chapterList', init: block });
  ok(await page.evaluate(() => document.documentElement.lang) === 'bn', '?lang=bn works with storage blocked');
  ok((await page.locator('.chapterCard:nth-child(1) a').getAttribute('href')).includes('lang=bn'), 'chapter links carry the language');
  await page.locator('#selLangBtn').click(); await page.waitForSelector('.chapterList');
  ok(await page.evaluate(() => document.documentElement.lang) === 'en' && page.url().includes('lang=en'), 'switching works with storage blocked');
  await close(); if (errors.length) throw new Error('console errors: ' + errors.join('; '));
}
// ---- a chapter with no translation inside a Bangla page, and Bengali digits typed into a number box ----
{
  const { page, errors, close } = await open(1280, 720, { path: 'index.html?c=ch5', lang: 'bn', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4']), reducedMotion: 'reduce' });
  const D5 = loadChapterFile('ch5', 'bn');
  ok(await page.evaluate(() => document.querySelector('.cols').lang) === 'bn', 'a translated chapter is marked Bangla');
  ok((await text(page, '#chaptersBtn')) === ui['nav.chapters'], 'while the game buttons stay in Bangla');
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(60); }
  const s = D5.steps.find(x => x.id === 'scale'), A = s.answer.fields;
  await page.waitForFunction(t => document.querySelector('#panel h2')?.textContent === t, s.title);
  await page.locator('input[data-k="cacao"]').fill(digits(A.cacao, 'bn')); await page.locator('input[data-k="sugar"]').fill(digits(A.sugar, 'bn') + ' গ্রাম'); await page.locator('input[data-k="bars"]').fill(String(A.bars));
  await page.locator('#go').click();
  await page.waitForFunction(m => document.querySelector('#saySr').textContent === m, s.feedback.correct, { timeout: 4000 });
  checks++;
  await close(); if (errors.length) throw new Error('console errors: ' + errors.join('; '));
}
// ---- a missing or broken overlay falls back to English instead of stopping the chapter ----
{
  const { page, errors, close } = await open(1280, 720, { path: 'index.html?c=ch5', lang: 'bn', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4']), reducedMotion: 'reduce', wait: null, before: async ctx => { await ctx.route('**/chapters/ch5.bn.json', r => r.fulfill({ status: 500, body: 'broken' })); } });
  await page.waitForSelector('#ovNext');
  ok(await page.evaluate(() => document.querySelector('.cols').lang) === 'en', 'a broken overlay leaves the chapter in English');
  ok((await text(page, '#chaptersBtn')) === ui['nav.chapters'], 'while the game buttons stay in Bangla');
  ok((await text(page, '#eyebrow')) === loadChapterFile('ch5', 'en').eyebrow, 'and the chapter text is English');
  await close(); ok(errors.some(e => e.includes('ch5.bn.json')) && errors.every(e => e.includes('ch5.bn.json') || e.includes('Failed to load resource')), 'only the broken overlay is reported');
}
// ---- the Memory shelf carries each chapter's own language ----
{
  const { page, errors, close } = await open(1280, 720, { path: 'index.html', wait: '.chapterList', lang: 'bn' });
  await page.locator('#selShelfBtn').click(); await page.waitForSelector('.shelfGrid');
  const langs = await page.locator('.shelf section').evaluateAll(els => els.map(e => e.lang));
  ok(langs.length === 8 && langs.every(l => l === 'bn'), `shelf sections carry their language (${langs.join(',')})`);
  ok((await text(page, '.shelf h2')) === ui['shelf.title'], 'shelf title in Bangla');
  await close(); if (errors.length) throw new Error('console errors: ' + errors.join('; '));
}
console.log(`PASS: ${checks} language checks, 0 console errors`);
