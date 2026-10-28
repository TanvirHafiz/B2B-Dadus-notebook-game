// Accessibility checks: names, target size, contrast, 200 percent zoom, keyboard focus, live region, reduced motion.
// Usage: node tests/a11y.mjs   (checks the select screen and the first screen of every chapter, in English and Bangla)
import { open, seedDone } from './lib.mjs';

let bad = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { bad++; console.log('  FAIL: ' + msg); } };
const ALL = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'];

// Runs inside the page: returns problems found on the currently visible screen.
const AUDIT = () => {
  const out = { names: [], small: [], contrast: [], overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],[aria-hidden="true"],[inert]'); };
  const desc = e => (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ')[0] + ' <' + e.tagName.toLowerCase() + '>' + (e.dataset && e.dataset.id ? ' [' + e.dataset.id + ']' : '');
  const name = e => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && [...e.getAttribute('aria-labelledby').split(' ')].map(i => document.getElementById(i)?.textContent).join(' ') || e.textContent || e.getAttribute('title') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.getAttribute('placeholder') || '').trim();
  for (const e of document.querySelectorAll('button,a[href],input,select,textarea,[role=button],[tabindex="0"]')) {
    if (!vis(e)) continue;
    if (!name(e)) out.names.push(desc(e));
    const r = e.getBoundingClientRect();
    if ((r.width < 44 || r.height < 44) && e.type !== 'hidden' && !e.matches('.hs,.bean,.dot,.slot')) out.small.push(desc(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  for (const e of document.querySelectorAll('img')) if (vis(e) && !e.hasAttribute('alt')) out.names.push('img ' + e.src.split('/').pop());
  // contrast of text against the nearest solid background
  const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && (c.length < 4 || c[3] > .95)) return c; if (getComputedStyle(n).backgroundImage !== 'none') return null; } return [255, 255, 255]; };
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const e = n.parentElement; if (!n.textContent.trim() || !e || seen.has(e) || !vis(e) || e.closest('svg,script,style,[role=img]')) continue; seen.add(e);
    const s = getComputedStyle(e), fg = rgb(s.color), bg = bgOf(e); if (!fg || !bg || (fg.length > 3 && fg[3] < 1) || s.opacity < 1) continue;
    const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05), px = parseFloat(s.fontSize), big = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.contrast.push(desc(e) + ' ' + ratio.toFixed(2) + ' "' + n.textContent.trim().slice(0, 24) + '"');
  }
  return out;
};
const report = (label, r) => {
  ok(!r.names.length, `${label}: controls without a name: ${r.names.slice(0, 4).join('; ')}`);
  ok(!r.small.length, `${label}: targets under 44px: ${r.small.slice(0, 4).join('; ')}`);
  ok(!r.contrast.length, `${label}: low contrast: ${r.contrast.slice(0, 4).join('; ')}`);
  ok(!r.overflow, `${label}: horizontal scroll`);
};

for (const lang of ['en', 'bn']) {
  console.log(`Accessibility in ${lang}`);
  // select screen
  {
    const { page, close } = await open(1280, 720, { path: 'index.html', lang, init: seedDone(ALL), wait: '.chapterList li' });
    await page.waitForTimeout(400);
    report(`select ${lang}`, await page.evaluate(AUDIT));
    await close();
  }
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const id = `ch${n}`, init = seedDone(ALL.slice(0, n - 1));
    for (const [w, h, tag] of [[1280, 720, 'desktop'], [390, 844, 'phone'], [640, 360, '200% zoom']]) {
      const { page, errors, close } = await open(w, h, { path: `index.html?c=${id}`, lang, init });
      report(`${id} intro ${tag} ${lang}`, await page.evaluate(AUDIT));
      while (await page.locator('#overlay').isVisible()) { await page.locator('#ovNext').click(); await page.waitForTimeout(30); }
      await page.waitForTimeout(300);
      report(`${id} play ${tag} ${lang}`, await page.evaluate(AUDIT));
      if (tag === 'desktop') {
        // the speech bubble announces changes; the first Tab lands on something visible with a focus ring
        ok(await page.evaluate(() => { const s = document.querySelector('#say'); return !!s && (s.getAttribute('aria-live') || s.querySelector('[aria-live],[role=status]')); }), `${id}: speech bubble is not a live region`);
        await page.keyboard.press('Tab');
        const ring = await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return e !== document.body && (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 || s.boxShadow !== 'none'); });
        ok(ring, `${id}: first focused control has no visible focus ring`);
      }
      ok(!errors.length, `${id} ${tag}: console errors ${errors.join('|')}`);
      await close();
    }
  }
}

// reduced motion: nothing animates on any screen
{
  for (const n of [1, 4, 8]) {
    const { page, close } = await open(1280, 720, { path: `index.html?c=ch${n}`, init: seedDone(ALL.slice(0, n - 1)), reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a.effect && a.effect.getTiming().iterations === 1 && a.effect.getTiming().duration < 1)).map(a => a.animationName || a.transitionProperty || '?'));
    ok(!running.length, `ch${n} reduced motion: still animating: ${[...new Set(running)].join(',')}`);
    await close();
  }
}
console.log(bad ? `FAIL: ${bad} of ${checks} checks` : `PASS: ${checks} accessibility checks`);
process.exit(bad ? 1 : 0);
