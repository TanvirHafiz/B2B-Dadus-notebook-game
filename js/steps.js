// Step renderers. Each one draws into the puzzle panel from the step's data and reports back through ctx:
//   ctx.P (panel), ctx.S (state), ctx.say(text, who), ctx.finish(step, text), ctx.mistake(feedback),
//   ctx.renderNote(), ctx.fmt(text, vars), ctx.shuffle(list), ctx.sfx, ctx.data (chapter).
// A feedback entry is a string (Laila speaks) or {who, text}.

import { drawBean, toppingGlyph, wrapperArt, setWrapperName, CLUE_ART } from './art.js';
import { t, num, westernDigits, getContentLang } from './i18n.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const shell = (step, body) => `<h2>${esc(step.title)}</h2><p class="sub">${esc(step.prompt)}</p>${body}`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Re-rendering replaces the buttons, so remember which control had focus and put it back.
export function focusKey() {
  const el = document.activeElement; if (!el || el === document.body || !el.closest('#panel, #lines')) return null;
  const scope = el.closest('#panel') ? '#panel ' : '#lines ';
  for (const a of ['k', 'id', 'i']) if (el.dataset && el.dataset[a] !== undefined) return `${scope}${el.tagName.toLowerCase()}[data-${a}="${el.dataset[a]}"]`;
  return el.id ? `#${el.id}` : null;
}
export function restoreFocus(key) {
  if (!key) return;
  let el = document.querySelector(key);
  if (!el || el.disabled) el = document.querySelector('#panel .sf input:not(:disabled), #panel #go, #panel .card, #panel .tin');
  if (el) el.focus({ preventScroll: true });
}
const mem = (ctx, step, init) => (ctx.S.st[step.id] = ctx.S.st[step.id] || init());

// ---------- order: machines into blanks ----------
const order = {
  vars: () => ({}),
  render(ctx, step) {
    const { P, S } = ctx, pr = step.params, M = Object.fromEntries(pr.machines.map(m => [m.id, m]));
    const st = mem(ctx, step, () => ({ sel: null }));
    const placed = new Set(S.slots.filter(Boolean));
    P.innerHTML = shell(step, `<div class="cards">${pr.machines.filter(m => !placed.has(m.id)).map(m => `<button type="button" class="card ${st.sel === m.id ? 'sel' : ''}" data-k="${m.id}" aria-pressed="${st.sel === m.id}">${esc(m.name)}</button>`).join('')}</div>
      <p class="info" id="info">${esc(st.sel ? M[st.sel].says : pr.idleInfo)}</p>
      ${placed.size === step.answer.sequence.length ? `<button type="button" class="btn" id="go">${esc(pr.startLabel)}</button>` : ''}`);
    const go = $('#go', P);
    if (go) go.addEventListener('click', () => ctx.advance(step));
    $$('.card', P).forEach(c => c.addEventListener('click', e => { if (e.detail === 0 && !ctx.locked()) select(ctx, step, c.dataset.k); }));
    bindDrag(ctx, { target: '.slot', blocked: t => t.classList.contains('ok'), drop: (k, t) => place(ctx, step, k, +t.dataset.i), tap: k => select(ctx, step, k), cancel: () => order.render(ctx, step) });
  },
  onSlot(ctx, step, i) {
    const st = ctx.S.st[step.id];
    if (st && st.sel) place(ctx, step, st.sel, i); else ctx.say(step.params.pickFirst);
  }
};
function select(ctx, step, k) { const st = ctx.S.st[step.id]; st.sel = st.sel === k ? null : k; ctx.sfx.tap(); order.render(ctx, step); }
function place(ctx, step, k, i) {
  const { S } = ctx, st = S.st[step.id], pr = step.params, fb = step.feedback;
  if (S.slots[i]) return;
  const M = Object.fromEntries(pr.machines.map(m => [m.id, m]));
  if (step.answer.sequence[i] === k) {
    S.slots[i] = k; st.sel = null; ctx.sfx.ok(); ctx.say(fb.placed[i]); ctx.renderNote(); order.render(ctx, step);
    if (S.slots.every(Boolean)) setTimeout(() => { if (S.phase === 'play') ctx.say(fb.complete); }, 1400);
  } else {
    const m = M[k];
    ctx.mistake(k === fb.decoy ? m.says : ctx.fmt(fb.wrong, { name: m.name, does: m.does, line: num(i + 1), need: pr.needs[i] }));
    const el = $(`.slot[data-i="${i}"]`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    st.sel = null; order.render(ctx, step);
  }
}
// Drag a .card onto a target. A plain tap calls cfg.tap; keyboard use goes through the buttons' click handlers.
function bindDrag(ctx, cfg) {
  const { P } = ctx; let drag = null;
  P.onpointerdown = e => {
    if (ctx.locked()) return; const c = e.target.closest('.card'); if (!c) return;
    drag = { k: c.dataset.k, x: e.clientX, y: e.clientY, moved: false, ghost: null, el: c };
    try { c.setPointerCapture(e.pointerId); } catch (_) { /* pointer capture is optional */ }
  };
  P.onpointermove = e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moved = true; drag.ghost = document.createElement('div'); drag.ghost.className = 'ghost';
      drag.ghost.textContent = drag.el.textContent; document.body.appendChild(drag.ghost); drag.el.classList.add('lifted');
    }
    if (drag.ghost) {
      drag.ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-140%)`;
      const t = document.elementFromPoint(e.clientX, e.clientY), s = t && t.closest(cfg.target);
      $$(cfg.target + '.hot').forEach(x => x.classList.remove('hot')); if (s && !cfg.blocked?.(s)) s.classList.add('hot');
    }
  };
  const end = e => {
    if (!drag) return; const d = drag; drag = null; $$(cfg.target + '.hot').forEach(x => x.classList.remove('hot'));
    if (d.ghost) {
      d.ghost.remove(); const t = document.elementFromPoint(e.clientX, e.clientY), s = t && t.closest(cfg.target);
      if (s && !cfg.blocked?.(s)) cfg.drop(d.k, s); else cfg.cancel();
    } else if (e.type === 'pointerup') cfg.tap(d.k); else cfg.cancel();
  };
  P.onpointerup = end; P.onpointercancel = end;
}

// ---------- pick-by-sense: sniff samples, choose one ----------
const tinSVG = c => `<svg viewBox="0 0 64 40" aria-hidden="true">${[[14, 22, -.5], [30, 14, .3], [46, 22, .6], [22, 31, .2], [40, 32, -.4]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r * 57})"><ellipse rx="10" ry="7" fill="${c}"/><path d="M-7 0Q0 2 7 0" stroke="rgba(0,0,0,.4)" fill="none" stroke-width="1.2"/></g>`).join('')}</svg>`;
const barSVG = c => `<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="6" y="5" width="52" height="30" rx="4" fill="${c}" stroke="rgba(0,0,0,.4)"/>${[0, 1, 2].map(i => `<rect x="${10 + i * 16}" y="9" width="12" height="10" rx="2" fill="rgba(0,0,0,.18)"/><rect x="${10 + i * 16}" y="22" width="12" height="9" rx="2" fill="rgba(0,0,0,.18)"/>`).join('')}</svg>`;
const pickBySense = {
  vars(ctx, step) { const st = pickInit(ctx, step); return { answerLabel: st.label[step.answer.choice] }; },
  render(ctx, step) {
    const { P } = ctx, pr = step.params, st = pickInit(ctx, step), O = Object.fromEntries(pr.options.map(o => [o.id, o]));
    P.innerHTML = shell(step, `<div class="tins">${st.order.map(id => `<button type="button" class="tin ${st.pick === id ? 'sel' : ''}" data-id="${id}" aria-pressed="${st.pick === id}">${(step.type === 'compare-two' ? barSVG : tinSVG)(O[id].color)}${esc(ctx.fmt(pr.optionName, { ...Object.fromEntries(Object.entries(O[id]).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v])), label: st.label[id] }))}</button>`).join('')}</div>
      <p class="sniff" id="sniff">${esc(st.pick ? pr.sensePrefix + O[st.pick].sense : pr.idleSense)}</p>
      <button type="button" class="btn" id="pickGo" ${st.pick ? '' : 'disabled'}>${esc(pr.goLabel)}</button>`);
    $$('.tin', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; st.pick = b.dataset.id; ctx.sfx.tap(); pickBySense.render(ctx, step); }));
    $('#pickGo', P).addEventListener('click', () => {
      if (ctx.locked() || !st.pick) return;
      if (st.pick === step.answer.choice) ctx.finish(step, step.feedback.correct);
      else { ctx.mistake(O[st.pick].no); st.pick = null; pickBySense.render(ctx, step); }
    });
  }
};
function pickInit(ctx, step) {
  return mem(ctx, step, () => {
    const pr = step.params, ids = pr.options.map(o => o.id), order = pr.shuffle ? ctx.shuffle(ids) : ids;
    const O = Object.fromEntries(pr.options.map(o => [o.id, o]));
    return { pick: null, order, label: Object.fromEntries(order.map((id, i) => [id, pr.labels ? pr.labels[i] : O[id].label])) };
  });
}

// ---------- tap-meter: tap N times ----------
function burstHusk(x, y) {
  if (reduced()) return;
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('i'); h.className = 'husk'; h.style.left = x + 'px'; h.style.top = y + 'px';
    h.style.setProperty('--dx', (40 + Math.random() * 90) + 'px'); h.style.setProperty('--dy', (-30 - Math.random() * 70) + 'px');
    document.body.appendChild(h); setTimeout(() => h.remove(), 850);
  }
}
const trayArt = `<svg viewBox="0 0 300 130" aria-hidden="true"><rect x="6" y="14" width="288" height="108" rx="10" fill="#5a3220"/>${[0, 1, 2].map(c => [0, 1].map(r => `<rect x="${20 + c * 90}" y="${26 + r * 48}" width="80" height="38" rx="5" fill="#2b1a12" stroke="#74412a"/>`).join('')).join('')}<g id="bubbles"></g></svg>`;
const tapMeter = {
  vars: () => ({}),
  render(ctx, step) {
    const { P, S } = ctx, pr = step.params, n = step.answer.count; S.st[step.id] = { taps: 0 };
    const btn = pr.variant === 'tray'
      ? `<button type="button" class="tray" id="tap" aria-label="${esc(pr.label)}">${trayArt}</button>`
      : `<button type="button" class="crank" id="tap">${esc(pr.label)}</button>`;
    P.innerHTML = shell(step, `${btn}<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="0"><i id="mt"></i></div>`);
    $('#tap', P).addEventListener('click', e => {
      if (ctx.locked()) return; const st = S.st[step.id]; st.taps++; ctx.sfx.tap();
      $('#mt').style.width = (st.taps / n * 100) + '%'; $('#mt').parentElement.setAttribute('aria-valuenow', st.taps);
      if (pr.effect === 'husk') { const r = e.currentTarget.getBoundingClientRect(); burstHusk(e.detail ? e.clientX : r.left + r.width / 2, e.detail ? e.clientY : r.top + r.height / 2); }
      else if (!reduced() && $('#bubbles')) { const b = $('#bubbles'); for (let i = 0; i < 6; i++) b.insertAdjacentHTML('beforeend', `<circle cx="${30 + Math.random() * 240}" cy="${34 + Math.random() * 80}" r="${1.5 + Math.random() * 2}" fill="rgba(255,235,210,.7)"><animate attributeName="cy" from="${60 + Math.random() * 50}" to="14" dur=".7s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur=".7s" fill="freeze"/></circle>`); }
      if (st.taps >= n) ctx.finish(step, step.feedback.correct);
    });
  }
};

// ---------- ratio-slider: split a batch ----------
const ratioSlider = {
  vars: () => ({}),
  render(ctx, step) {
    if (step.params.sliders) return ratio3(ctx, step);
    const { P } = ctx, pr = step.params, st = mem(ctx, step, () => ({ v: pr.start }));
    const mix = () => { const a = st.v, b = pr.total - a, pc = pr.total / 100;
      return `<div class="n" style="width:${a / pc}%">${esc(pr.parts[0])} ${num(a)} ${pr.unit}</div><div class="g" style="width:${b / pc}%">${b >= 90 ? esc(pr.parts[1]) + ' ' + num(b) + ' ' + pr.unit : num(b) + ' ' + pr.unit}</div>`; };
    P.innerHTML = shell(step, `<div class="mix" id="mix">${mix()}</div>
      <input type="range" id="slide" min="${pr.min}" max="${pr.max}" step="${pr.step}" value="${st.v}" aria-label="${esc(pr.sliderLabel)}">
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $('#slide', P).addEventListener('input', e => { st.v = +e.target.value; $('#mix').innerHTML = mix(); });
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return; const a = step.answer, d = st.v - a.parts[0];
      if (Math.abs(d) <= a.tolerance) ctx.finish(step, step.feedback.correct);
      else ctx.mistake(d > 0 ? step.feedback.high : step.feedback.low);
    });
  }
};

// Three parts: the player sets the listed sliders and the remainder (sugar) fills the rest of the batch.
function ratio3(ctx, step) {
  const { P } = ctx, pr = step.params, a = step.answer, total = pr.total, cls = ['n', 'g', 'm'];
  const st = mem(ctx, step, () => ({ v: pr.sliders.map(s => s.start) }));
  const rest = () => total - st.v.reduce((x, y) => x + y, 0);
  const values = () => { const out = new Array(pr.parts.length).fill(0); pr.sliders.forEach((s, i) => { out[s.part] = st.v[i]; }); out[pr.remainder] = rest(); return out; };
  const bar = () => values().map((v, i) => `<div class="${cls[i]}" style="width:${v / total * 100}%"></div>`).join('');
  const legend = () => values().map((v, i) => `<span class="${cls[i]}"><i></i>${esc(pr.parts[i])} <b>${num(v)}</b> ${esc(pr.unit)}</span>`).join('');
  P.innerHTML = shell(step, `<div class="mix" id="mix" aria-hidden="true">${bar()}</div><div class="legend" id="legend">${legend()}</div>
    ${pr.sliders.map((s, i) => `<div class="tr tr3" data-i="${i}"><b>${esc(s.label)}</b><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${st.v[i]}" aria-label="${esc(s.label)}"><output>${num(st.v[i])}</output></div>`).join('')}
    <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
  $$('.tr3 input', P).forEach(inp => inp.addEventListener('input', () => {
    const i = +inp.closest('.tr3').dataset.i, others = st.v.reduce((x, y, j) => x + (j === i ? 0 : y), 0);
    st.v[i] = Math.min(+inp.value, total - others); inp.value = st.v[i]; inp.nextElementSibling.textContent = num(st.v[i]);
    $('#mix').innerHTML = bar(); $('#legend').innerHTML = legend();
  }));
  $('#go', P).addEventListener('click', () => {
    if (ctx.locked()) return; const msgs = [];
    pr.sliders.forEach((s, i) => { const d = st.v[i] - a.parts[s.part]; if (Math.abs(d) > a.tolerance) msgs.push(d > 0 ? s.high : s.low); });
    if (!msgs.length && Math.abs(rest() - a.parts[pr.remainder]) <= a.tolerance) ctx.finish(step, step.feedback.correct);
    else ctx.mistake(msgs.length ? msgs[0] + (msgs.length > 1 ? ' ' + pr.extraOff : '') : (rest() > a.parts[pr.remainder] ? pr.remainderHigh : pr.remainderLow));
  });
}

// ---------- sort-bins: put items in the right bin ----------
const sortBins = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, st = mem(ctx, step, () => ({ sel: null, placed: {}, order: ctx.shuffle(pr.items.map(i => i.id)) }));
    const I = Object.fromEntries(pr.items.map(i => [i.id, i]));
    const left = st.order.filter(id => !st.placed[id]), all = left.length === 0;
    P.innerHTML = shell(step, '<div class="cards">' + left.map(id => '<button type="button" class="card ' + (st.sel === id ? 'sel' : '') + '" data-k="' + id + '" aria-pressed="' + (st.sel === id) + '">' + esc(I[id].name) + '</button>').join('') + '</div>' +
      '<p class="info" id="info">' + esc(st.sel ? I[st.sel].says : pr.idleInfo) + '</p>' +
      '<div class="bins">' + pr.bins.map(b => '<button type="button" class="bin" data-id="' + b.id + '" aria-label="' + esc(b.name) + ': ' + esc(Object.keys(st.placed).filter(k => st.placed[k] === b.id).map(k => I[k].name).join(', ') || t('empty')) + '"><b>' + esc(b.name) + '</b><span>' + esc(Object.keys(st.placed).filter(k => st.placed[k] === b.id).map(k => I[k].name).join(', ')) + '</span></button>').join('') + '</div>' +
      (all ? '<button type="button" class="btn" id="go">' + esc(pr.doneLabel) + '</button>' : ''));
    const go = $('#go', P); if (go) go.addEventListener('click', () => { if (!ctx.locked()) ctx.finish(step, step.feedback.complete); });
    $$('.card', P).forEach(c => c.addEventListener('click', e => { if (e.detail === 0 && !ctx.locked()) binSelect(ctx, step, c.dataset.k); }));
    $$('.bin', P).forEach(b => b.addEventListener('click', e => { if (!ctx.locked() && (e.detail === 0 || !dragging)) binPlace(ctx, step, b.dataset.id); }));
    bindDrag(ctx, {
      target: '.bin',
      drop: (k, t) => { dragging = true; binPlace(ctx, step, t.dataset.id, k); setTimeout(() => { dragging = false; }, 0); },
      tap: k => binSelect(ctx, step, k),
      cancel: () => sortBins.render(ctx, step)
    });
  }
};
let dragging = false;
function binSelect(ctx, step, k) { const st = ctx.S.st[step.id]; st.sel = st.sel === k ? null : k; ctx.sfx.tap(); sortBins.render(ctx, step); }
function binPlace(ctx, step, binId, itemId) {
  const st = ctx.S.st[step.id], pr = step.params, k = itemId || st.sel;
  if (!k) { ctx.say(pr.pickFirst); return; }
  const item = pr.items.find(i => i.id === k), bin = pr.bins.find(b => b.id === binId);
  if (step.answer.bins[binId].includes(k)) { st.placed[k] = binId; st.sel = null; ctx.sfx.ok(); ctx.say(step.feedback.placed); if (Object.keys(st.placed).length === pr.items.length) setTimeout(() => { if (ctx.S.phase === 'play') ctx.say(step.feedback.complete); }, 900); }
  else { ctx.mistake(ctx.fmt(pr.wrongFeedback, { says: item.says, item: item.name, trait: item.trait, bin: bin.name.toLowerCase(), rule: bin.rule, ruleText: bin.ruleText ?? bin.rule })); st.sel = null; }
  sortBins.render(ctx, step);
}

// ---------- spot-defect: tap the bad items on a slow tray ----------
const spotDefect = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, T = Object.fromEntries(pr.types.map(t => [t.id, t]));
    const st = mem(ctx, step, () => ({ removed: new Set(), order: ctx.shuffle(pr.items.map(i => i.id)), still: false }));
    const I = Object.fromEntries(pr.items.map(i => [i.id, i])), still = reduced() || st.still;
    P.innerHTML = shell(step, '<div class="beanTray ' + (still ? 'static' : '') + '" id="tray"><div class="strip" id="strip">' +
      st.order.map(id => '<button type="button" class="bean" data-k="' + id + '" aria-label="' + esc(T[I[id].type].label) + '"><svg viewBox="-24 -32 48 64" aria-hidden="true">' + drawBean(I[id].type) + '</svg></button>').join('') + '</div></div>' +
      (reduced() ? '<p class="sub">' + esc(pr.staticNote) + '</p>' : '') +
      '<p class="info" id="info"></p><button type="button" class="btn" id="go">' + esc(pr.goLabel) + '</button>');
    const tray = $('#tray', P), strip = $('#strip', P);
    const motion = () => {
      if (tray.classList.contains('static')) return;
      const from = tray.clientWidth, to = -strip.scrollWidth;
      if (!from) { tray.classList.add('static'); return; } // drawn while hidden: show the grid instead
      strip.style.setProperty('--from', from + 'px'); strip.style.setProperty('--to', to + 'px'); const speed = pr.speed || 36; // pixels per second
      strip.style.setProperty('--dur', ((from - to) / speed) + 's');
      strip.style.animationDelay = '-' + (from / speed) + 's'; // start with beans already on the tray
    };
    motion();
    let resume = null;
    const pause = () => { clearTimeout(resume); strip.classList.add('paused'); };
    const go = () => { clearTimeout(resume); resume = setTimeout(() => strip.classList.remove('paused'), 1500); };
    tray.addEventListener('pointerenter', pause); tray.addEventListener('pointerdown', pause);
    tray.addEventListener('pointerleave', go); tray.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') go(); });
    tray.addEventListener('focusin', e => { if (e.target.matches(':focus-visible') && !tray.classList.contains('static')) { st.still = true; tray.classList.add('static'); strip.classList.remove('paused'); } });
    strip.addEventListener('click', e => {
      const b = e.target.closest('.bean'); if (!b || ctx.locked() || st.removed.has(b.dataset.k)) return;
      const it = I[b.dataset.k], t = T[it.type];
      if (t.good) { ctx.say(pr.goodTap); return; }
      st.removed.add(it.id); ctx.sfx.ok(); ctx.say(t.why);
      const beans = $$('.bean:not(.gone)', strip), at = beans.indexOf(b), nxt = beans[at + 1] || beans[at - 1];
      b.classList.add('gone'); b.disabled = true; b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1;
      if (e.detail === 0 && nxt) nxt.focus({ preventScroll: true });
    });
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      const left = step.answer.defects.filter(id => !st.removed.has(id));
      if (left.length) ctx.mistake(pr.stillBad); else ctx.finish(step, step.feedback.correct);
    });
  }
};

// ---------- time-slider: set hours or minutes ----------
const timeSlider = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, st = mem(ctx, step, () => ({ v: pr.start }));
    const readout = () => `${num(st.v)}<small>${st.v === 1 ? pr.unit : (pr.unitPlural ?? (getContentLang() === 'en' ? pr.unit + 's' : pr.unit))}</small>`;
    P.innerHTML = shell(step, `<div class="readout" id="read" aria-hidden="true">${readout()}</div>
      <input type="range" id="slide" min="${pr.min}" max="${pr.max}" step="${pr.step}" value="${st.v}" aria-label="${esc(pr.sliderLabel)}">
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $('#slide', P).addEventListener('input', e => { st.v = +e.target.value; $('#read').innerHTML = readout(); });
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return; const a = step.answer, d = Math.abs(st.v - a.value), fb = step.feedback;
      if (d <= a.tolerance) ctx.finish(step, fb.correct);
      else if (d <= a.near) ctx.mistake(fb.near);
      else ctx.mistake(st.v < a.value ? fb.low : fb.high);
    });
  }
};

// ---------- multi-temp: several temperatures and a curve ----------
const multiTemp = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, a = step.answer;
    const unit = r => r.unit || '°C', temp = r => !r.percent;
    const st = mem(ctx, step, () => ({ t: pr.rows.map(r => r.start ?? pr.start), done: pr.rows.map(() => false) }));
    const y = t => 100 - (t - 20) * (90 / 35), cl = v => Math.max(8, Math.min(100, y(v)));
    const graph = () => { const xs = [110, 200, 290].slice(0, pr.rows.length), on = xs.map((x, i) => i).filter(i => temp(pr.rows[i])), pts = [[10, 25], ...on.map(i => [xs[i], st.t[i]])].map(([x, t]) => `${x},${cl(t)}`).join(' ');
      return `<svg viewBox="0 0 300 110" role="img" aria-label="${esc(t('temp.curve'))}">${[25, 35, 45, 55].map(t => `<line x1="0" x2="300" y1="${y(t)}" y2="${y(t)}" stroke="#B0B0B0"/><text x="2" y="${y(t) - 2}" font-size="9" fill="#766457">${num(t)}°</text>`).join('')}<polyline points="${pts}" fill="none" stroke="#B55C27" stroke-width="3" stroke-linejoin="round"/>${on.map(i => `<circle cx="${xs[i]}" cy="${cl(st.t[i])}" r="4.5" fill="#B55C27"/>`).join('')}</svg>`; };
    P.innerHTML = shell(step, `<div class="graph" id="graph">${graph()}</div>
      ${pr.rows.map((r, i) => `<div class="tr ${st.done[i] ? 'ok' : ''}" data-i="${i}"><b>${esc(r.label)}</b><input type="range" min="${r.min ?? pr.min}" max="${r.max ?? pr.max}" step="${r.step ?? pr.step}" value="${st.t[i]}" ${st.done[i] ? 'disabled' : ''} aria-label="${esc(temp(r) ? t('temp.aria', { label: r.label }) : r.label)}"><output>${num(st.t[i])}${esc(unit(r))}</output></div>`).join('')}
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $$('.tr input', P).forEach(inp => inp.addEventListener('input', () => { const i = +inp.closest('.tr').dataset.i; st.t[i] = +inp.value; inp.nextElementSibling.textContent = num(inp.value) + unit(pr.rows[i]); $('#graph').innerHTML = graph(); }));
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return; const msgs = [];
      pr.rows.forEach((r, i) => { if (st.done[i]) return; const v = st.t[i], d = v - a.values[i];
        if (Math.abs(d) <= a.tolerance) st.done[i] = true; else msgs.push(`${r.label}: ${d < 0 ? r.low : r.high}`); });
      if (st.done.every(Boolean)) { multiTemp.render(ctx, step); ctx.finish(step, step.feedback.correct); }
      else { ctx.mistake(msgs[0] + (msgs.length > 1 ? ' ' + pr.extraOff : '')); multiTemp.render(ctx, step); }
    });
  }
};

// ---------- scale-recipe: type the weights for a bigger batch ----------
const scaleRecipe = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, a = step.answer.fields;
    const st = mem(ctx, step, () => ({ v: Object.fromEntries(pr.fields.map(f => [f.key, ''])), done: {} }));
    P.innerHTML = shell(step, `<div class="scaleF">${pr.fields.map(f => `<label class="sf ${st.done[f.key] ? 'ok' : ''}"><b>${esc(f.label)}</b><input type="text" inputmode="numeric" autocomplete="off" data-k="${f.key}" value="${esc(st.v[f.key])}" ${st.done[f.key] ? 'disabled' : ''}><span>${esc(f.unit)}</span></label>`).join('')}</div>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $$('.sf input', P).forEach(inp => {
      inp.addEventListener('input', () => { st.v[inp.dataset.k] = inp.value; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#go', P).click(); } });
    });
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      const val = f => Number(westernDigits(st.v[f.key]).replace(/গ্রাম|টা|টি|[\s,]|g$/gi, ''));
      if (pr.fields.some(f => !st.done[f.key] && (String(st.v[f.key]).trim() === '' || !Number.isFinite(val(f))))) { ctx.say(pr.unfilled); return; }
      const msgs = [];
      pr.fields.forEach(f => {
        if (st.done[f.key]) return; const d = val(f) - a[f.key];
        if (d === 0) st.done[f.key] = true; else msgs.push(Math.abs(d) <= f.near ? f.nearText : d > 0 ? f.high : f.low);
      });
      scaleRecipe.render(ctx, step);
      if (!msgs.length) ctx.finish(step, step.feedback.correct);
      else ctx.mistake(msgs[0] + (msgs.length > 1 ? ' ' + pr.extraOff : ''));
    });
  }
};

// ---------- pattern-fill: put toppings on a tray to match a sketch ----------
const patternFill = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, fb = step.feedback, T = Object.fromEntries(pr.toppings.map(t => [t.id, t]));
    const st = mem(ctx, step, () => ({ sel: null, grid: new Array(pr.rows * pr.cols).fill(null) }));
    const glyph = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${toppingGlyph(id)}</svg>`;
    P.innerHTML = shell(step, `<div class="cards">${pr.toppings.map(t => `<button type="button" class="card topping ${st.sel === t.id ? 'sel' : ''}" data-k="${t.id}" aria-pressed="${st.sel === t.id}">${glyph(t.id)}<span>${esc(t.name)}</span></button>`).join('')}</div>
      <p class="info" id="info">${esc(st.sel ? T[st.sel].says : pr.idleInfo)}</p>
      <div class="trayGrid" role="group" aria-label="${esc(pr.trayLabel || t('tray.label'))}" style="--cols:${pr.cols}">${st.grid.map((g, i) => `<button type="button" class="sq ${g ? 'on' : ''}" data-i="${i}" aria-label="${esc(ctx.fmt(pr.squareLabel, { n: num(i + 1), row: num(Math.floor(i / pr.cols) + 1), col: num((i % pr.cols) + 1) }))}: ${esc(g ? T[g].name : pr.empty)}">${g ? glyph(g) + `<i aria-hidden="true">${esc(T[g].abbr ?? g)}</i>` : ''}</button>`).join('')}</div>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $$('.card', P).forEach(c => c.addEventListener('click', e => { if (e.detail === 0 && !ctx.locked()) fillPick(ctx, step, c.dataset.k); }));
    $$('.sq', P).forEach(q => q.addEventListener('click', e => { if (!ctx.locked() && (e.detail === 0 || !dragging)) fillSquare(ctx, step, +q.dataset.i); }));
    bindDrag(ctx, {
      target: '.sq',
      drop: (k, t) => { dragging = true; fillSquare(ctx, step, +t.dataset.i, k); setTimeout(() => { dragging = false; }, 0); },
      tap: k => fillPick(ctx, step, k),
      cancel: () => patternFill.render(ctx, step)
    });
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      if (st.grid.some(g => !g)) { ctx.say(fb.unfilled); return; }
      const wrong = st.grid.filter((g, i) => g !== step.answer.grid[i]).length;
      if (!wrong) ctx.finish(step, fb.correct); else ctx.mistake(wrong === 1 ? fb.wrongOne : ctx.fmt(fb.wrongSquares, { n: num(wrong) }));
    });
  }
};
function fillPick(ctx, step, k) { const st = ctx.S.st[step.id]; st.sel = st.sel === k ? null : k; ctx.sfx.tap(); patternFill.render(ctx, step); }
function fillSquare(ctx, step, i, k) {
  const st = ctx.S.st[step.id], pr = step.params, id = k || st.sel;
  if (!id) { if (!st.grid[i]) { ctx.say(pr.pickFirst); return; } st.grid[i] = null; ctx.sfx.tap(); }
  else if (pr.toppings.find(t => t.id === id).reject) { ctx.mistake(pr.toppings.find(t => t.id === id).reject); st.sel = null; }
  else { st.grid[i] = id; ctx.sfx.ok(); }
  patternFill.render(ctx, step);
}

// ---------- diagnose: run a test on each sample, then name its cause ----------
const diagnose = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, C = Object.fromEntries(pr.causes.map(c => [c.id, c])), Ph = Object.fromEntries(pr.photos.map(p => [p.id, p]));
    const st = mem(ctx, step, () => ({ cur: null, tested: {}, pick: {}, done: {} })), cur = st.cur && Ph[st.cur];
    const label = p => st.pick[p.id] ? C[st.pick[p.id]].name : st.tested[p.id] ? pr.needCause : pr.untested;
    P.innerHTML = shell(step, `<div class="dxBars">${pr.photos.map(p => `<button type="button" class="dxBar ${st.cur === p.id ? 'sel' : ''} ${st.done[p.id] ? 'ok' : ''}" data-id="${p.id}" aria-pressed="${st.cur === p.id}">${CLUE_ART[p.art]().replace('<svg ', '<svg aria-hidden="true" ')}<b>${esc(p.label)}</b><span>${esc(label(p))}</span></button>`).join('')}</div>
      <p class="info" id="info">${esc(cur ? cur.testText : pr.photoHint)}</p>
      ${cur && !st.done[cur.id] ? `<div class="causes" role="group" aria-label="${esc(cur.label)}">${pr.causes.map(c => `<button type="button" class="card cause ${st.pick[cur.id] === c.id ? 'sel' : ''}" data-k="${c.id}" aria-pressed="${st.pick[cur.id] === c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
      <p class="info" id="info2">${esc(cur ? (st.pick[cur.id] ? C[st.pick[cur.id]].says : st.done[cur.id] ? '' : pr.causeHint) : '')}</p>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    $$('.dxBar', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; st.cur = b.dataset.id; st.tested[b.dataset.id] = true; ctx.sfx.tap(); diagnose.render(ctx, step); }));
    $$('.cause', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; st.pick[st.cur] = b.dataset.k; ctx.sfx.tap(); diagnose.render(ctx, step); }));
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      if (pr.photos.some(p => !st.done[p.id] && !st.pick[p.id])) { ctx.say(pr.unfilled); return; }
      const msgs = [];
      pr.photos.forEach(p => {
        if (st.done[p.id]) return; const c = st.pick[p.id];
        if (c === step.answer.pairs[p.id]) st.done[p.id] = true; else { msgs.push(`${p.label}: ${pr.wrongText[c]}`); delete st.pick[p.id]; st.cur = st.cur === p.id || msgs.length === 1 ? p.id : st.cur; }
      });
      diagnose.render(ctx, step);
      if (!msgs.length) ctx.finish(step, step.feedback.correct);
      else ctx.mistake(msgs[0] + (msgs.length > 1 ? ' ' + pr.extraOff : ''));
    });
  }
};

// A bar name is plain text: no control or direction-changing characters, at most max whole characters (a Bangla letter cluster counts once).
const NAME_BAD = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const clampName = (s, max) => { const t = String(s).replace(NAME_BAD, ''); const g = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map(x => x.segment) : Array.from(t); return g.slice(0, max).join(''); };
// Arrow keys move between the options of a row.
const rowKeys = P => $$('.mnOpts', P).forEach(row => row.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return; const b = $$('button:not(:disabled)', row), i = b.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); b[(i + k + b.length) % b.length].focus(); }));
// A row of options (a radio group). Used by match-notes and free-build.
const optRow = (key, label, options, picked, locked, note) =>
  `<div class="mnRow ${locked ? 'ok' : ''}" role="radiogroup" aria-label="${esc(label)}"><b>${esc(label)}</b><div class="mnOpts">${options.map(o => `<button type="button" class="card mnOpt ${picked === o.id ? 'sel' : ''}" role="radio" aria-checked="${picked === o.id}" data-k="${esc(key)}:${esc(o.id)}" ${locked ? 'disabled' : ''}>${esc(o.name)}</button>`).join('')}</div>${note ? `<small>${esc(note)}</small>` : ''}</div>`;

// ---------- match-notes: turn a regular's words into settings ----------
const matchNotes = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, want = step.answer.settings;
    const st = mem(ctx, step, () => ({ pick: {}, done: {} }));
    P.innerHTML = shell(step, `<div class="mn">${pr.settings.map(s => optRow(s.key, s.label, s.options, st.pick[s.key], st.done[s.key], pr.free && pr.free[s.key])).join('')}</div>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    rowKeys(P);
    $$('.mnOpt', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; const [k, id] = b.dataset.k.split(':'); st.pick[k] = id; ctx.sfx.tap(); matchNotes.render(ctx, step); }));
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      if (pr.settings.some(s => !st.pick[s.key])) { ctx.say(pr.unfilled); return; }
      const msgs = [];
      pr.settings.forEach(s => {
        const w = want[s.key]; if (w === null || w === undefined || st.done[s.key]) return;
        if (st.pick[s.key] === w) st.done[s.key] = true;
        else { msgs.push(ctx.fmt(pr.wrong, { label: s.label, taste: s.options.find(o => o.id === st.pick[s.key]).taste, customer: pr.customer, need: pr.needs[s.key] })); delete st.pick[s.key]; }
      });
      matchNotes.render(ctx, step);
      if (!msgs.length) ctx.finish(step, step.feedback.correct); else ctx.mistake(msgs[0] + (msgs.length > 1 ? ' ' + pr.extraOff : ''));
    });
  }
};

// ---------- free-build: build something that meets every rule of an order ----------
const freeBuild = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, F = Object.fromEntries(pr.fields.map(f => [f.key, f]));
    const st = mem(ctx, step, () => ({ pick: {} }));
    P.innerHTML = shell(step, `<div class="mn">${pr.fields.map(f => optRow(f.key, f.label, f.options, st.pick[f.key], false, '')).join('')}</div>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    rowKeys(P);
    $$('.mnOpt', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; const [k, id] = b.dataset.k.split(':'); st.pick[k] = id; ctx.sfx.tap(); freeBuild.render(ctx, step); }));
    const n = (field, id) => Number((F[field].options.find(o => o.id === id) || {})[F[field].numAttr] ?? id);
    const meets = c => { const v = st.pick[c.field]; return c.op === 'eq' ? v === c.value : c.op === 'in' ? c.value.includes(v) : c.op === 'gte' ? n(c.field, v) >= n(c.field, c.value) : n(c.field, v) <= n(c.field, c.value); };
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      if (pr.fields.some(f => !st.pick[f.key])) { ctx.say(pr.unfilled); return; }
      const bad = step.answer.constraints.filter(c => !meets(c));
      if (!bad.length) ctx.finish(step, step.feedback.correct); else ctx.mistake(pr.no[bad[0].field] + (bad.length > 1 ? ' ' + pr.extraOff : ''));
    });
  }
};

// ---------- name-wrapper: name the shop's own bar and pick its wrapper (not scored) ----------
const nameWrapper = {
  vars: () => ({}),
  render(ctx, step) {
    const { P } = ctx, pr = step.params, st = mem(ctx, step, () => ({ name: (ctx.shop && ctx.shop.name) || '', wrapper: (ctx.shop && ctx.shop.wrapper) || pr.wrappers[0].id }));
    const art = () => wrapperArt(st.wrapper, st.name.trim() || pr.placeholder, pr.preview);
    P.innerHTML = shell(step, `<label class="nwName"><b>${esc(pr.nameLabel)}</b><input type="text" id="nwInput" placeholder="${esc(pr.placeholder)}" value="${esc(st.name)}" autocomplete="off"></label>
      <div class="mn"><div class="mnRow" role="radiogroup" aria-label="${esc(pr.wrapperLabel)}"><b>${esc(pr.wrapperLabel)}</b><div class="mnOpts">${pr.wrappers.map(w => `<button type="button" class="card mnOpt ${st.wrapper === w.id ? 'sel' : ''}" role="radio" aria-checked="${st.wrapper === w.id}" data-id="${esc(w.id)}">${esc(w.name)}</button>`).join('')}</div></div></div>
      <div class="nwPreview" id="nwPrev">${art()}</div>
      <button type="button" class="btn" id="go">${esc(pr.goLabel)}</button>`);
    const inp = $('#nwInput', P);
    inp.addEventListener('input', () => { st.name = clampName(inp.value, pr.maxLength); if (inp.value !== st.name) inp.value = st.name; setWrapperName($('#nwPrev svg', P), st.name.trim() || pr.placeholder, pr.preview); });
    rowKeys(P);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#go', P).click(); } });
    $$('.mnOpt', P).forEach(b => b.addEventListener('click', () => { if (ctx.locked()) return; st.wrapper = b.dataset.id; ctx.sfx.tap(); nameWrapper.render(ctx, step); }));
    $('#go', P).addEventListener('click', () => {
      if (ctx.locked()) return;
      const name = clampName(st.name, pr.maxLength).trim().replace(/\s+/g, ' ');
      if (!name) { ctx.say(pr.emptyName); return; }
      ctx.saveShop({ name, wrapper: st.wrapper }); inp.readOnly = true;
      ctx.finish(step, ctx.fmt(step.feedback.correct, { name }));
    });
  }
};

for (const r of [order, pickBySense, multiTemp, sortBins, scaleRecipe, patternFill, diagnose, matchNotes, freeBuild, nameWrapper]) { const draw = r.render; r.render = (ctx, step) => { const k = focusKey(); draw(ctx, step); restoreFocus(k); }; }

export const STEP_TYPES = { order, 'pick-by-sense': pickBySense, 'compare-two': pickBySense, 'tap-meter': tapMeter, 'ratio-slider': ratioSlider, 'time-slider': timeSlider, 'multi-temp': multiTemp, 'sort-bins': sortBins, 'spot-defect': spotDefect, 'scale-recipe': scaleRecipe, 'pattern-fill': patternFill, diagnose, 'match-notes': matchNotes, 'free-build': freeBuild, 'name-wrapper': nameWrapper };
