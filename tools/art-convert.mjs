// Crops and scales the generated pictures in source-assets/art/ into small WebP files in assets/art/.
// Usage: node tools/art-convert.mjs portraits     (uses the browser canvas, like make-assets.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// crop is a fraction of the source: [x, y, w, h]
const SETS = {
  portraits: [
    ['portrait-laila', [0.2, 0.05, 0.62, 0.62]],
    ['portrait-rafiq'], ['portrait-mishti'],
    ['portrait-dadu', [0.2, 0.14, 0.58, 0.58]],
    ['portrait-kobir', [0.27, 0.04, 0.6, 0.6]],
    ['portrait-nazma'], ['portrait-jamal'], ['portrait-shumi']
  ].map(([n, crop]) => ({ name: n, crop, w: 256, h: 256, q: 0.8 }))
};
for (let n = 1; n <= 8; n++) { SETS.scenes = [...(SETS.scenes || []), { name: `scene-ch${n}`, w: 1280, h: 720, q: 0.72 }, { name: `shutter-ch${n}`, w: 1280, h: 720, q: 0.72 }]; }
SETS.wrappers = ['dark', 'milk', 'dark90'].map(k => ({ name: `wrap-${k}`, w: 400, h: 260, q: 0.78 })); // the picture half of a pack, 200 x 130 shown at 2x
const jobs = SETS[process.argv[2]];
if (!jobs) { console.log('unknown set'); process.exit(1); }
const browser = await chromium.launch(), page = await browser.newPage();
fs.mkdirSync(path.join(root, 'assets', 'art'), { recursive: true });
let total = 0;
for (const j of jobs) {
  const bytes = fs.readFileSync(path.join(root, 'source-assets', 'art', j.name + '.png'));
  const b64 = await page.evaluate(async ({ data, w, h, q, crop }) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const [cx, cy, cw, ch] = crop || [0, 0, 1, 1], W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(img, cx * W, cy * H, cw * W, ch * H, 0, 0, w, h);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, { data: bytes.toString('base64'), w: j.w, h: j.h, q: j.q, crop: j.crop });
  const out = path.join(root, 'assets', 'art', j.name.replace(/^portrait-/, '') + '.webp');
  fs.writeFileSync(out, Buffer.from(b64, 'base64')); total += fs.statSync(out).size;
  console.log(`${path.basename(out)}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
console.log(`total ${(total / 1024).toFixed(0)} KB`);
await browser.close();
