// Contact sheet of images: node tools/sheet.mjs out.png cols thumbPx file1 file2 ...
import fs from 'node:fs';
import { chromium } from 'playwright';
const [out, cols, size, ...files] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * size + 8, height: 400 } });
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${size}px);gap:2px">${files.map(f => `<img src="data:image/${f.split('.').pop()};base64,${fs.readFileSync(f).toString('base64')}" style="width:${size}px;display:block">`).join('')}</body>`;
await p.setContent(html); await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true }); await b.close();
