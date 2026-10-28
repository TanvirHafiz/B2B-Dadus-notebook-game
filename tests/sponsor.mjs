// Sponsor checks (quiet sponsorship): a small logo in the header corner with no visible sponsor words, a title-screen banner of the three boxes that
// comes into colour as chapters 1, 2 and 5 are finished, and nothing sponsor-related on endings, chapter cards or the Memory shelf.
// Usage: node tests/sponsor.mjs
import { open, noHScroll, seedDone } from './lib.mjs';

let checks = 0;
const ok = (c, m) => { checks++; if (!c) throw new Error('FAILED: ' + m); };
const loaded = (page, sel) => page.locator(sel).evaluateAll(els => els.length > 0 && els.every(i => i.complete && i.naturalWidth > 0));

for (const lang of ['en', 'bn']) for (const [W, H] of [[1280, 720], [390, 844]]) {
  const tag = `${lang} ${W}x${H}`;
  const label = lang === 'en' ? 'Sponsor: Bean to Bar Chocolate' : 'পৃষ্ঠপোষক: বিন-টু-বার চকলেট';
  // title screen, fresh save: small logo, three dim boxes
  {
    const { page, errors, close } = await open(W, H, { path: 'index.html', wait: '.chapterList', lang });
    ok(await page.locator('.sponsor').getAttribute('aria-label') === label, `${tag}: the logo has an accessible name`);
    ok((await page.locator('.sponsor').innerText()).trim() === '', `${tag}: the logo shows no sponsor words`);
    ok(await loaded(page, '.sponsor img'), `${tag}: the logo loads`);
    const lb = await page.locator('.sponsor img').boundingBox();
    const h1 = await page.locator('#select h1').boundingBox();
    ok(lb.width >= 62 && lb.width <= 66 && lb.y < 100 && lb.x + lb.width <= h1.x + 1, `${tag}: the logo is 64 px (the brand minimum), left of the title (${Math.round(lb.width)} px at ${Math.round(lb.x)},${Math.round(lb.y)})`);
    ok(await page.locator('.hero img').count() === 3 && await loaded(page, '.hero img'), `${tag}: the banner shows three boxes that load`);
    ok(await page.locator('.hero').getAttribute('aria-hidden') === 'true', `${tag}: the banner is decorative`);
    ok(await page.locator('.hero img.done').count() === 0, `${tag}: all boxes dim on a fresh save`);
    ok(await page.locator('.chapterCard .product, .chapterCard img').count() === 0, `${tag}: nothing sponsor-related on the chapter cards`);
    ok(await noHScroll(page), `${tag}: no horizontal scroll on the title screen`);
    await page.locator('#selShelfBtn').click(); await page.waitForSelector('.shelfGrid');
    ok(await page.locator('.shelf .bars, .shelf .product').count() === 0, `${tag}: nothing sponsor-related on the shelf`);
    await close(); ok(errors.length === 0, `${tag}: no console errors (${errors.join('; ')})`);
  }
  // chapters 1 and 2 done: two boxes in colour; chapter 5 done too: all three
  for (const [done, want] of [[['ch1', 'ch2'], 2], [['ch1', 'ch2', 'ch3', 'ch4', 'ch5'], 3]]) {
    const { page, errors, close } = await open(W, H, { path: 'index.html', wait: '.chapterList', lang, init: seedDone(done) });
    ok(await page.locator('.hero img.done').count() === want, `${tag}: ${want} boxes in colour after ${done.length} chapters`);
    ok(await noHScroll(page), `${tag}: no horizontal scroll`);
    await close(); ok(errors.length === 0, `${tag}: no console errors (${errors.join('; ')})`);
  }
  // inside a chapter: only the small logo
  {
    const { page, errors, close } = await open(W, H, { lang });
    ok(await page.locator('#app .sponsor').getAttribute('aria-label') === label && (await page.locator('#app .sponsor').innerText()).trim() === '', `${tag}: the game header has only the small logo`);
    ok(await loaded(page, '#app .sponsor img'), `${tag}: the header logo loads`);
    { const a = await page.locator('#app .sponsor img').boundingBox(), b = await page.locator('#gameTitle').boundingBox(); ok(a.x + a.width <= b.x + 1, `${tag}: the game header logo is left of the title`); }
    ok(await page.locator('.hero, .product').count() === 0, `${tag}: no banner or photos inside a chapter`);
    ok(await noHScroll(page), `${tag}: no horizontal scroll in the game`);
    await close(); ok(errors.length === 0, `${tag}: no console errors in the game (${errors.join('; ')})`);
  }
}
console.log(`PASS: ${checks} sponsor checks, 0 console errors`);
