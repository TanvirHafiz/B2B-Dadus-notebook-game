// Engine: loads a chapter JSON and runs it. All story text, answers and feedback come from the data.
import { PORTRAITS, CLUE_ART, CARD_ART } from './art.js';
import { STEP_TYPES, focusKey, restoreFocus } from './steps.js';
import { store, starsFor, unlocked } from './store.js';
import { loadIndex, loadChapter } from './chapters.js';
import { renderShelf } from './shelf.js';
import { zoomable } from './zoom.js';
import { renderSelect } from './select.js';
import { initLang, t, num, langButton, langQuery, setContentLang } from './i18n.js';
import { sponsorHTML } from './sponsor.js';
import { sfx, startAudio, isMuted, setMuted } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const fmt = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Sound starts on the first tap or key press; the mute button is always visible and remembers its state.
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, startAudio, { once: true, capture: true }));
function muteButton() {
  const b = $('#muteBtn'); if (!b) return;
  const show = () => { b.textContent = t(isMuted() ? 'nav.soundOff' : 'nav.soundOn'); };
  b.addEventListener('click', () => { setMuted(!isMuted()); show(); }); show();
}

async function boot(id, index) {
  const D = await loadChapter(id);
  const STEPS = D.steps, CLUES = Object.fromEntries(D.clues.map(c => [c.id, c]));
  const S = { phase: 'intro', intro: 0, line: 0, step: 0, lock: false, mistakes: 0, hints: 0, hintAt: {}, clues: new Set(), slots: STEPS.filter(s => s.type === 'order').flatMap(s => s.answer.sequence.map(() => null)), st: {}, tok: 0, tab: 'note', solved: {} };
  const P = $('#panel'), OV = $('#overlay'), SH = $('#shelfOv'), app = $('#app');
  const cur = () => STEPS[S.step];
  const person = who => D.cast[who] || { name: who, portrait: who.toLowerCase() };

  $('#sponsorSlot').innerHTML = sponsorHTML();
  // Text that is English (a chapter with no translation yet) is marked so its fonts and screen reader voice are right.
  $('.cols').lang = D._lang; OV.lang = D._lang; setContentLang(D._lang);

  // ---------- static text ----------
  $('#eyebrow').textContent = D.eyebrow; $('#gameTitle').textContent = D.gameTitle;
  $('#nbBn').textContent = D.notebook.bn; $('#nbTitle').textContent = D.notebook.title; $('#hintLine').textContent = D.workshop.hintLine;
  document.title = `${D.gameTitle}: ${D.title}`;
  const countText = () => `${num(S.clues.size)}/${num(D.clues.length)}`;
  const setCount = () => { $('#clueCount').textContent = countText(); $('#clueCount2').textContent = countText(); };
  setCount();

  // ---------- speech bubble ----------
  let typer = null, lastSay = '';
  function say(t, who = 'Laila') {
    const el = $('#say'), p = $('#sayTxt'), pp = person(who); lastSay = t;
    el.classList.toggle('hint', who === 'Hint'); el.classList.toggle('right', pp.side === 'right');
    $('#port').innerHTML = PORTRAITS[pp.portrait](); $('#sayName').textContent = pp.name; $('#saySr').textContent = t;
    clearInterval(typer); p.textContent = ''; el.classList.remove('talking');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    if (reduced()) { p.textContent = t; return; }
    // Type whole characters (a Bangla letter cluster is several code points and must not be cut in the middle).
    const g = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map(x => x.segment) : Array.from(t);
    let i = 0; el.classList.add('talking');
    typer = setInterval(() => { i += 2; p.textContent = g.slice(0, i).join(''); if (i >= g.length) { clearInterval(typer); p.textContent = t; el.classList.remove('talking'); } }, 22);
  }
  const finishTyping = () => { clearInterval(typer); $('#sayTxt').textContent = lastSay; $('#say').classList.remove('talking'); };
  $('#say').addEventListener('click', finishTyping);

  // ---------- tabs (narrow windows only; wide windows show everything) ----------
  function setTab(t) {
    S.tab = t; app.dataset.tab = t;
    $('#tabNote').setAttribute('aria-selected', t === 'note'); $('#tabShop').setAttribute('aria-selected', t === 'shop');
    $('#tabShop').classList.remove('nudge'); $('#shopBox').classList.remove('nudge');
  }
  $('#tabNote').addEventListener('click', () => setTab('note')); $('#tabShop').addEventListener('click', () => setTab('shop'));

  // ---------- notebook page ----------
  const orderStep = STEPS.find(s => s.type === 'order');
  const machineName = id => orderStep.params.machines.find(m => m.id === id).name;
  const markup = t => esc(t).replace(/\[\[(blur|torn|q|b):([^\]]*)\]\]/g, (m, k, x) => ({ blur: `<span class="blur">${x}</span>`, torn: `<span class="torn">${x}</span>`, q: `<q>${x}</q>`, b: `<b>${x}</b>` }[k]));
  function slotHTML(i) {
    const id = S.slots[i];
    return id ? `<span class="slot ok" data-i="${i}">${esc(machineName(id))}</span>`
      : `<button type="button" class="slot ${cur().type === 'order' ? 'pulse' : ''}" data-i="${i}" aria-label="${esc(fmt(orderStep.params.blankLabel, { n: num(i + 1) }))}">?</button>`;
  }
  function renderNote() {
    const fk = focusKey();
    const stepFor = Object.fromEntries(STEPS.filter(s => s.line).map(s => [s.line, s]));
    $('#lines').innerHTML = D.notebook.lines.map((l, i) => {
      const st = stepFor[l.id], isCur = st && cur() === st, done = st && S.solved[st.id];
      const text = markup(l.text).replace('{blank}', l.blank != null ? slotHTML(l.blank) : '');
      return `<li class="ln ${isCur ? 'cur' : ''} ${done ? 'done' : ''}"><span class="no">${num(i + 1)}</span><div>${text}${done && l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</div></li>`;
    }).join('');
    restoreFocus(fk);
  }
  $('#lines').addEventListener('click', e => {
    const s = e.target.closest('button.slot'); if (!s || cur().type !== 'order' || S.lock) return;
    STEP_TYPES.order.onSlot(ctx, cur(), +s.dataset.i);
  });

  // ---------- step engine ----------
  const ctx = {
    P, S, sfx, shuffle, fmt, say, renderNote, data: D, shop: store.shop, saveShop: s => { store.saveShop(s); ctx.shop = store.shop; },
    locked: () => S.lock,
    mistake(fb) { const f = typeof fb === 'string' ? { text: fb } : fb; S.mistakes++; S.tok++; sfx.no(); say(f.text, f.who || 'Laila'); },
    finish(step, msg) {
      S.solved[step.id] = true; S.lock = true; S.tok++; sfx.ok(); say(msg); renderNote();
      setTimeout(() => ctx.advance(step, true), 1500);
    },
    advance(step, fromFinish) { if (!fromFinish) S.solved[step.id] = true; S.step++; if (S.step >= STEPS.length) reveal(); else startStep(); }
  };
  function startStep() {
    const step = cur(), tok = ++S.tok;
    P.onpointerdown = P.onpointermove = P.onpointerup = P.onpointercancel = null;
    S.lock = false; renderNote(); STEP_TYPES[step.type].render(ctx, step);
    if (step.beat) { say(step.beat.text, step.beat.who); setTimeout(() => { if (S.tok === tok && S.phase === 'play') say(step.say); }, step.beat.delay); }
    else say(step.say);
  }

  // ---------- hints ----------
  function hint() {
    if (S.phase !== 'play' || S.lock) return;
    const step = cur(), arr = step.hints, at = S.hintAt[step.id] || 0, next = Math.min(at + 1, arr.length);
    if (next > at) { S.hintAt[step.id] = next; if (step.type !== 'name-wrapper') S.hints++; } // naming the bar is not scored
    S.tok++;
    say(fmt(arr[next - 1], STEP_TYPES[step.type].vars(ctx, step)), 'Hint');
    if (step.nudgeWorkshop && next === 1) { $('#tabShop').classList.add('nudge'); $('#shopBox').classList.remove('nudge'); void $('#shopBox').offsetWidth; $('#shopBox').classList.add('nudge'); }
  }
  $('#hintBtn').addEventListener('click', hint);

  // ---------- chapters and Memory shelf ----------
  const shelfOpen = () => !SH.hidden;
  async function openShelf() {
    const chapters = await Promise.all(index.filter(c => c.available).map(async c => ({ id: c.id, title: c.title, data: await loadChapter(c.id) })));
    SH.hidden = false; renderShelf(SH, chapters, store, closeShelf);
  }
  function closeShelf() { SH.hidden = true; $('#shelfBtn').focus(); }
  $('#shelfBtn').addEventListener('click', openShelf);
  $('#chaptersBtn').addEventListener('click', () => {
    const started = S.phase === 'play' && S.step > 0;
    if (!started || confirm(t('confirm.leave'))) location.href = location.pathname + langQuery();
  });

  const lb = langButton();
  $('#langBtn').textContent = lb.label; $('#langBtn').lang = lb.other; $('#langBtn').setAttribute('aria-label', `${lb.aria}: ${lb.label}`);
  $('#langBtn').addEventListener('click', () => { const started = S.phase === 'play' && S.step > 0; if (!started || confirm(t('confirm.lang'))) lb.go(); });

  // ---------- workshop ----------
  $('#scene').innerHTML = `<img src="${esc(D.workshop.scene)}" alt="${esc(D.workshop.sceneAlt)}" draggable="false">` +
    D.clues.map(c => { const h = c.hotspot;
      return `<button type="button" class="hs ${store.hasClue(D.id, c.id) ? 'seen' : ''}" data-id="${c.id}" aria-label="${esc(c.title)}" style="--cx:${(h.x + h.w / 2).toFixed(2)};--cy:${(h.y + h.h / 2).toFixed(2)};--w:${h.w};--h:${h.h}"></button>`; }).join('');
  $$('.hs').forEach(b => b.addEventListener('click', () => showMemo(b.dataset.id)));
  function showMemo(id) {
    const c = CLUES[id]; S.clues.add(id); store.saveClue(D.id, id); setCount(); $(`.hs[data-id="${id}"]`).classList.add('found'); $(`.hs[data-id="${id}"]`).classList.remove('seen'); sfx.page();
    $('#memo').innerHTML = `<div class="memo"><div class="eb">${esc(D.workshop.memoEyebrow)}</div><h3>${esc(c.title)}</h3>${zoomable(CLUE_ART[c.art](c), c.title)}<p>${esc(c.text)}</p></div>`;
    $('#memo').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  }

  // ---------- intro and ending ----------
  function renderIntro() {
    const c = D.intro[S.intro], dots = `<div class="dots">${D.intro.map((_, i) => `<span class="${i === S.intro ? 'on' : ''}"></span>`).join('')}</div>`;
    const art = CARD_ART[c.art]({ ...c, bg: D.id });
    if (c.talk) {
      const l = c.talk[S.line], who = l[0], last = S.line === c.talk.length - 1, right = c.cast.indexOf(who) > 0;
      OV.innerHTML = `<div class="ovin">${art}${dots}<div class="cast">${c.cast.map(k => `<div class="port ${k === who ? 'on' : ''}">${PORTRAITS[person(k).portrait]()}</div>`).join('')}</div><div class="bubble up ${right ? 'r' : 'l'}"><div class="name">${esc(person(who).name)}</div><p>${esc(l[1])}</p></div><div><button type="button" class="btn" id="ovNext">${esc(last ? (c.button || t('intro.continue')) : t('intro.next'))}</button></div></div>`;
    } else {
      OV.innerHTML = `<div class="ovin">${art}${dots}<h2>${esc(c.h)}</h2><p>${esc(c.p)}</p><div><button type="button" class="btn" id="ovNext">${esc(c.button || t('intro.continue'))}</button></div></div>`;
    }
    const next = $('#ovNext'); next.focus({ preventScroll: true });
    next.addEventListener('click', () => {
      sfx.tap();
      if (c.talk && S.line < c.talk.length - 1) { S.line++; renderIntro(); return; }
      S.line = 0; S.intro++;
      if (S.intro >= D.intro.length) { OV.hidden = true; S.phase = 'play'; startStep(); } else renderIntro();
    });
    // Lift the shutter in front of the player: the slats travel up over 1.4s while the shutter sound plays (the sound is 1.4s long).
    const sh = $('.shutter', OV);
    if (sh && c.art === 'shutter-open' && S.line === 0) {
      const slats = $('i', sh); sh.classList.remove('open');
      if (reduced()) sh.classList.add('open');
      else requestAnimationFrame(() => { sh.classList.add('play'); slats.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-78%)' }], { duration: 1400, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' }).finished.then(() => sh.classList.add('open'), () => {}); });
      sfx.shutter();
    }
  }
  function reveal() {
    const R = D.reveal; S.phase = 'end';
    const stars = starsFor(S.hints, S.mistakes); store.saveResult(D.id, { stars, hints: S.hints, mistakes: S.mistakes }); sfx.ok(); sfx.win();
    OV.innerHTML = `<div class="ovin">${CARD_ART[R.art]({ ...R, shop: store.shop })}<div class="revSay">${R.talk.map(([who, t]) => { const p = person(who);
        return `<div class="say ${p.side === 'right' ? 'right' : ''}"><div class="port">${PORTRAITS[p.portrait]()}</div><div class="bubble"><div class="name">${esc(p.name)}</div><p>${esc(t)}</p></div></div>`; }).join('')}</div>
      <div class="recipe"><b>${esc(R.recipeTitle)}</b><br>${R.recipe.map((r, i) => `${num(i + 1)}. ${esc(r)}`).join('<br>')}</div>
      <p class="fact">${esc(R.realFact)}</p>
      <div class="stats"><div><b>${num(S.hints)}</b>${t('end.hints')}</div><div><b>${num(S.mistakes)}</b>${t('end.wrong')}</div><div><b>${countText()}</b>${t('end.memories')}</div><div><b class="stars" role="img" aria-label="${t('select.stars', { n: num(stars) })}">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">&#9733;</span>`).join('')}</b>${t('end.stars')}</div></div>
      <p class="bn">${esc(R.next)}</p>
      <div class="row"><button type="button" class="btn alt" id="again">${esc(R.again)}</button><a class="btn" id="allChapters" href="${location.pathname}${langQuery()}">${t('end.all')}</a></div></div>`;
    OV.hidden = false; OV.scrollTop = 0; $('#again').addEventListener('click', () => location.reload());
  }

  // ---------- keyboard: H for a hint, Space or Enter to advance dialogue ----------
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('.zoomView')) return;
    if (shelfOpen()) { if (e.key === 'Escape') closeShelf(); return; }
    const t = e.target, interactive = t.closest && t.closest('button,input,select,textarea,a,[role=button],[role=tab]');
    if ((e.key === 'h' || e.key === 'H') && !(t.matches && t.matches('input:not([type=range]),textarea'))) { e.preventDefault(); hint(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !interactive) {
      if (S.phase === 'intro') { e.preventDefault(); const n = $('#ovNext'); if (n) n.click(); }
      else if (S.phase === 'play') { e.preventDefault(); finishTyping(); }
    }
  });

  // ---------- start ----------
  OV.hidden = false; renderIntro();
  say(D.opening);
}

// ---------- routing: the chapter screen, or a chapter picked with ?c= ----------
// Offline support: the release build's service worker stores the engine and Chapter 1, then each later chapter as it is opened.
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }));

async function route() {
  await initLang(); muteButton();
  const index = await loadIndex(), id = new URLSearchParams(location.search).get('c');
  const i = index.findIndex(c => c.id === id), c = index[i];
  if (c && c.available && (!store.persistent || unlocked(index, i, store.chapters) || store.isDone(id))) { $('#select').hidden = true; return boot(id, index); }
  return renderSelect($('#select'), index);
}
route().catch(err => { console.error(err); document.body.insertAdjacentHTML('beforeend', `<p style="padding:20px">${t('error.load') === 'error.load' ? 'Could not load the game. Open this page through a web server, not as a file.' : t('error.load')}</p>`); });
