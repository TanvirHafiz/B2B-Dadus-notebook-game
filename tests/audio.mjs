// Sound behaviour: music starts after the first tap, pauses when the page is hidden, comes back when shown, and stays off when muted.
import { open, seedDone } from './lib.mjs';
let bad = 0, n = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('  FAIL: ' + m); } };
const { page, close } = await open(1280, 720, { path: 'index.html?c=ch1' });
await page.evaluate(() => { window.__a = []; const P = HTMLMediaElement.prototype, p = P.play, q = P.pause; P.play = function () { window.__a.push('play'); return p.apply(this, arguments); }; P.pause = function () { window.__a.push('pause'); return q.apply(this, arguments); }; });
await page.locator('#ovNext').click(); await page.waitForTimeout(600);
const log = () => page.evaluate(() => window.__a.join(','));
ok((await log()).includes('play'), 'music starts after the first tap');
const hide = h => page.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
await hide(true); ok((await log()).endsWith('pause'), 'music pauses when the page is hidden');
await hide(false); ok((await log()).endsWith('play'), 'music resumes when the page is shown');
await page.locator('#muteBtn').click(); ok((await log()).endsWith('pause'), 'mute pauses the music');
await hide(true); await hide(false); ok((await log()).endsWith('pause'), 'a muted game stays silent after being shown again');
await page.reload(); await page.waitForSelector('#ovNext');
ok((await page.locator('#muteBtn').getAttribute('aria-label')) === 'Sound off' && await page.evaluate(() => localStorage.getItem('dadus-notebook:mute') === '1'), 'mute is remembered');
console.log(bad ? `FAIL: ${bad} of ${n}` : `PASS: ${n} sound checks`);
await close(); process.exit(bad ? 1 : 0);
