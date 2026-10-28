// Release build: copies only what the game needs into dist/, fills in the service worker, and checks the size budget.
// Usage: node tools/build.mjs      (dist/ can be uploaded as it is to any static host, such as GitHub Pages)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dist = path.join(root, 'dist');
const KB = n => (n / 1024).toFixed(0) + ' KB';
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join('/')]);

fs.rmSync(dist, { recursive: true, force: true });
const files = ['index.html', 'sw.js', ...['css', 'js', 'i18n', 'chapters', 'assets'].flatMap(d => walk(path.join(root, d), root))];
for (const f of files) { fs.mkdirSync(path.dirname(path.join(dist, f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(dist, f)); }
const size = f => fs.statSync(path.join(dist, f)).size, sum = list => list.reduce((s, f) => s + size(f), 0);

// what a first visit stores: the engine, Chapter 1 and its pictures, the sponsor and the small sound effects (not the music)
const engine = files.filter(f => /^(index\.html|css\/|js\/|i18n\/|chapters\/index)/.test(f));
const ch1 = files.filter(f => /^chapters\/ch1\./.test(f) || /^assets\/art\/(laila|rafiq|mishti|dadu|kobir|nazma|jamal|shumi|scene-ch1|shutter-ch1)\.webp$/.test(f) || /^assets\/(products\/|sponsor-logo)/.test(f) || /^assets\/audio\/(?!music)/.test(f) || /^assets\/art\/wrap-/.test(f));
const music = files.filter(f => /^assets\/audio\/music/.test(f));
const precache = [...new Set([...engine, ...ch1, ...music])]; // the music is stored up front: the audio element asks for ranges, which the worker cannot cache later
const version = 'dadus-' + crypto.createHash('sha1').update(files.map(f => f + ':' + crypto.createHash('sha1').update(fs.readFileSync(path.join(dist, f))).digest('hex')).join('|')).digest('hex').slice(0, 10);
const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8').replace("'__VERSION__'", JSON.stringify(version)).replace("'__PRECACHE__'", JSON.stringify(JSON.stringify(['./', ...precache])));
fs.writeFileSync(path.join(dist, 'sw.js'), sw);

const rows = [['engine (page, styles, scripts, text)', sum(engine), 300 * 1024], ['first visit (engine, Chapter 1, its art, effects, music)', sum(precache), 1.5 * 1024 * 1024], ['whole game', sum(files), 12 * 1024 * 1024]];
let bad = 0;
for (const [n, s, max] of rows) { const pass = s <= max; if (!pass) bad++; console.log(`${pass ? 'PASS' : 'FAIL'} ${n}: ${KB(s)} of ${KB(max)}`); }
console.log(`of which music: ${KB(sum(music))}`);
console.log(`${files.length} files, version ${version}`);
process.exit(bad ? 1 : 0);
