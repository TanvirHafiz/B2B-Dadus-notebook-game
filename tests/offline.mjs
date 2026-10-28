// Release build check: served from a sub-folder (like GitHub Pages), works offline after the first visit, stores later chapters when they are opened
// through the game, keeps them after an update, and contacts nobody but the font host.
// Usage: node tests/offline.mjs   (run tools/build.mjs first)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from '../tools/serve.mjs';
import { seedDone } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dist = path.join(root, 'dist');
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'dadus-site-')), app = path.join(site, 'dadus');
fs.cpSync(dist, app, { recursive: true });
const port = 5301, base = `http://127.0.0.1:${port}/dadus/`;
let bad = 0, n = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log('  FAIL: ' + m); } };
const server = await serve(port, site), browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(seedDone(['ch1']));
const hosts = new Set(), errors = [];
const page = await ctx.newPage();
page.on('request', r => hosts.add(new URL(r.url()).host));
page.on('pageerror', e => errors.push(e.message));
// the web fonts are the only outside request; answer them empty so the test does not depend on the network
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const intro = async () => { await page.waitForSelector('#ovNext', { timeout: 8000 }); while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); } };

// first visit online: chapter 1
await page.goto(base + 'index.html?c=ch1'); await page.waitForSelector('#ovNext');
await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(800);
// open chapter 2 through the game while online so it is stored as it is played
await page.goto(base + 'index.html?c=ch2'); await intro(); await page.waitForTimeout(500);
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker controls the page');
const keys = await page.evaluate(async () => (await caches.keys()).sort());
ok(keys.length === 2 && keys.includes('dadus-runtime'), 'one build cache and one runtime cache: ' + keys.join(','));

// offline: chapter 1 and chapter 2 both play, pictures and the shutter background included
await ctx.setOffline(true);
for (const id of ['ch1', 'ch2']) {
  await page.goto(base + `index.html?c=${id}`);
  ok(await page.waitForSelector('#ovNext', { timeout: 6000 }).then(() => true).catch(() => false), `${id} intro loads offline`);
  const bg = await page.evaluate(async () => { const s = document.querySelector('.shutter'); if (!s) return 'none'; const u = getComputedStyle(s).backgroundImage.match(/url\("?([^")]+)"?\)/); return u ? (await fetch(u[1])).ok : 'no background'; });
  ok(bg === true, `${id} shutter picture is available offline: ${bg}`);
  await intro();
  ok(await page.locator('.hs').count() > 0, `${id} workshop shows offline`);
  const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
  ok(!broken.length, `${id} images load offline: ` + broken.join(','));
  const sceneOk = await page.evaluate(async () => { const u = document.querySelector('#scene img').src; return (await fetch(u)).ok; });
  ok(sceneOk, `${id} scene picture offline`);
}
ok(await page.evaluate(async () => (await fetch('assets/audio/music.ogg')).ok), 'the music is stored for offline');
await ctx.setOffline(false);

// an update keeps the chapters opened earlier: a new build with changed content installs, the old build cache goes, the runtime cache stays
fs.appendFileSync(path.join(app, 'css', 'style.css'), '\n/* changed */\n');
const swPath = path.join(app, 'sw.js'); fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/"dadus-[0-9a-f]+"/, '"dadus-updated"'));
await page.goto(base + 'index.html?c=ch1'); await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await page.waitForTimeout(1500);
const after = await page.evaluate(async () => (await caches.keys()).sort());
ok(after.includes('dadus-updated') && !after.some(k => /^dadus-[0-9a-f]{10}$/.test(k)) && after.includes('dadus-runtime'), 'update replaces the build cache and keeps the runtime cache: ' + after.join(','));
ok(await page.evaluate(async () => (await caches.open('dadus-runtime').then(c => c.keys())).some(r => /ch2/.test(r.url))), 'chapter 2 is still stored after the update');

const outside = [...hosts].filter(h => !/^127\.0\.0\.1/.test(h) && !/^fonts\.(googleapis|gstatic)\.com$/.test(h));
ok(!outside.length, 'requests only to the page and the font host, got: ' + outside.join(','));
const code = ['index.html', ...fs.readdirSync(path.join(dist, 'js')).map(f => 'js/' + f)].map(f => fs.readFileSync(path.join(dist, f), 'utf8')).join('\n');
ok(!/google-analytics|gtag\(|googletagmanager|plausible|mixpanel|hotjar|segment\.com|sendBeacon/i.test(code), 'no analytics code in the page or scripts');
ok(!errors.length, 'page errors: ' + errors.join('|'));
console.log(bad ? `FAIL: ${bad} of ${n} checks` : `PASS: ${n} offline and privacy checks`);
await browser.close(); server.close(); fs.rmSync(site, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
