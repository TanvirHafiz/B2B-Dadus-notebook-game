// Makes the small web images from the sponsor's originals in source-assets/ (product mockups and the logo).
// Usage: node tools/make-assets.mjs     Needs playwright (it uses the browser's canvas to scale and write WebP).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobs = [
  { from: 'source-assets/products/dark.jpg', to: 'assets/products/dark.webp', width: 480, q: 0.8 },
  { from: 'source-assets/products/milk.jpg', to: 'assets/products/milk.webp', width: 480, q: 0.8 },
  { from: 'source-assets/products/dark-90.jpg', to: 'assets/products/dark90.webp', width: 480, q: 0.8 },
  { from: 'source-assets/sponsor-logo.png', to: 'assets/sponsor-logo.webp', width: 160, q: 0.9 }
];
const browser = await chromium.launch(), page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, 'tools', 'serve.mjs')).href).catch(() => {});
for (const j of jobs) {
  const bytes = fs.readFileSync(path.join(root, j.from)), type = j.from.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const b64 = await page.evaluate(async ({ data, type, width, q }) => {
    const img = new Image(); img.src = `data:${type};base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = width; c.height = Math.round(img.naturalHeight * width / img.naturalWidth);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, { data: bytes.toString('base64'), type, width: j.width, q: j.q });
  fs.mkdirSync(path.dirname(path.join(root, j.to)), { recursive: true });
  fs.writeFileSync(path.join(root, j.to), Buffer.from(b64, 'base64'));
  console.log(`${j.to}: ${(fs.statSync(path.join(root, j.to)).size / 1024).toFixed(0)} KB (from ${(bytes.length / 1024).toFixed(0)} KB)`);
}
await browser.close();
