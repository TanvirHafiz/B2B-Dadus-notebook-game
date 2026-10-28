// Every clue picture and ending card of chapters 2 to 6 in Bangla, collected into one contact sheet per chapter, to check that Bangla text fits inside the drawings.
// Usage: node tests/shotsbn-clues.mjs   (writes screenshots/bn-clues-chN.png; fonts load from Google Fonts when online)
import fs from 'node:fs';
import { chromium } from 'playwright';
import { open, loadChapterFile, seedDone } from './lib.mjs';

fs.mkdirSync('screenshots', { recursive: true });
let bad = 0;
for (const n of [2, 3, 4, 5, 6, 7, 8]) {
  const id = `ch${n}`, D = loadChapterFile(id, 'bn');
  const { page, errors, close } = await open(1280, 720, { path: `index.html?c=${id}`, lang: 'bn', fonts: 'live', init: seedDone(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'].slice(0, n - 1)) });
  while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(40); }
  const svgs = [];
  for (const c of D.clues) {
    await page.locator(`.hs[data-id="${c.id}"]`).click(); await page.waitForTimeout(150);
    svgs.push({ title: c.title, svg: await page.locator('#memo .zoomable svg').first().evaluate(e => e.outerHTML) });
  }
  // the ending card art, drawn the same way the game draws it
  const card = await page.evaluate(async ([art, r]) => { const m = await import('./js/art.js'); return m.CARD_ART[art](r); }, [D.reveal.art, { ...D.reveal, _lang: 'bn' }]);
  svgs.push({ title: 'ending card', svg: card });
  const sheet = `<html lang="bn"><body style="margin:0;background:#17333a;font:14px sans-serif;color:#eee"><div style="display:grid;grid-template-columns:repeat(3,380px);gap:12px;padding:12px">${svgs.map(s => `<div><div style="margin-bottom:4px">${s.title}</div><div style="width:380px">${s.svg.replace('<svg ', '<svg style="width:100%;height:auto" ')}</div></div>`).join('')}</div></body></html>`;
  const sp = await page.context().newPage(); await sp.setViewportSize({ width: 1240, height: 900 });
  await sp.setContent(sheet); await sp.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Atma:wght@500;700&display=swap' }).catch(() => {});
  await sp.waitForTimeout(800); await sp.screenshot({ path: `screenshots/bn-clues-${id}.png`, fullPage: true }); await sp.close();
  console.log(`${id}: ${svgs.length} pictures`);
  await close();
  if (errors.filter(e => !/fonts\.(googleapis|gstatic)/.test(e)).length) { console.log(errors.join('\n')); bad++; }
}
process.exit(bad ? 1 : 0);
