// Writes tap-spot percentages from drafts/hotspots.json (pixels on a 480 x 268 picture) into the chapter files, and draws check sheets.
// Usage: node tools/hotspots.mjs apply     |     node tools/hotspots.mjs check   (writes screenshots/hotspots-chN.png)
import fs from 'node:fs';
import { chromium } from 'playwright';
const H = JSON.parse(fs.readFileSync('drafts/hotspots.json', 'utf8')), mode = process.argv[2];
const pct = ([x, y, w, h]) => ({ x: +(x / 4.8).toFixed(1), y: +(y / 2.68).toFixed(1), w: +(w / 4.8).toFixed(1), h: +(h / 2.68).toFixed(1) });
if (mode === 'apply') {
  for (const [ch, spots] of Object.entries(H)) {
    const f = `chapters/${ch}.json`, raw = fs.readFileSync(f, 'utf8'), D = JSON.parse(raw);
    for (const c of D.clues) { if (!spots[c.id]) throw new Error(`${ch}: no spot for ${c.id}`); c.hotspot = pct(spots[c.id]); }
    D.workshop.scene = `assets/art/scene-${ch}.webp`;
    fs.writeFileSync(f, JSON.stringify(D, null, 2) + '\n'); console.log(ch, 'ok');
  }
} else {
  fs.mkdirSync('screenshots', { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 540 } });
  const cells = Object.entries(H).map(([ch, spots]) => `<div style="position:relative;width:960px;height:540px"><img src="data:image/webp;base64,${fs.readFileSync(`assets/art/scene-${ch}.webp`).toString('base64')}" style="width:960px;height:540px">${Object.entries(spots).map(([id, s]) => { const q = pct(s); return `<div style="position:absolute;left:${q.x}%;top:${q.y}%;width:${q.w}%;height:${q.h}%;border:2px solid #0f0;color:#0f0;font:bold 14px sans-serif;text-shadow:0 0 3px #000">${id}</div>`; }).join('')}</div>`);
  for (let i = 0; i < cells.length; i += 2) {
    await p.setContent(`<body style="margin:0;display:flex">${cells[i]}${cells[i + 1] || ''}</body>`); await p.waitForTimeout(300);
    await p.screenshot({ path: `screenshots/hotspots-${i / 2 + 1}.png` });
  }
  await b.close();
}
