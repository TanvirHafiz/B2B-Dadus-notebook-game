// Chapter select screen: one card per chapter with stars, plus the Memory shelf and the language switch.
import { store, unlocked } from './store.js';
import { loadChapter, esc } from './chapters.js';
import { renderShelf } from './shelf.js';
import { t, num, langButton, langQuery, getLang } from './i18n.js';
import { sponsorHTML, heroHTML } from './sponsor.js';

const starRow = n => `<span class="stars" role="img" aria-label="${esc(t('select.stars', { n: num(n) }))}">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">&#9733;</span>`).join('')}</span>`;

export async function renderSelect(root, index) {
  document.body.classList.add('selecting'); root.hidden = false;
  const prog = store.chapters, lb = langButton();
  root.innerHTML = `<div class="selIn"><header class="top"><div class="brandRow">${sponsorHTML()}<div><div class="eyebrow">${esc(t('brand'))}</div><h1>${esc(t('game.title'))}</h1></div></div><div class="topBtns"><button type="button" class="navbtn" id="selLangBtn" lang="${lb.other}" aria-label="${esc(lb.aria)}: ${esc(lb.label)}">${esc(lb.label)}</button><button type="button" class="navbtn" id="selShelfBtn">${esc(t('nav.shelf'))}</button></div></header>
    ${heroHTML(index, id => store.isDone(id))}
    <ul class="chapterList">${index.map((c, i) => {
      const done = store.isDone(c.id), open = c.available && (!store.persistent || unlocked(index, i, prog));
      const state = !c.available ? t('select.soon') : !open ? t('select.locked') : done ? t('select.again') : t('select.play');
      return `<li class="chapterCard ${open ? '' : 'off'}" lang="${(c.langs || []).includes(getLang()) ? getLang() : 'en'}"><div class="cno">${esc(t('select.chapter', { n: num(i + 1) }))}</div><h2>${esc(c.title)}</h2>${c.available ? starRow(store.stars(c.id)) : ''}${open ? `<a class="btn ${done ? 'alt' : ''}" href="?c=${c.id}${langQuery('&')}">${esc(state)}</a>` : `<span class="state">${esc(state)}</span>`}</li>`;
    }).join('')}</ul></div><div class="overlay" id="shelfView" role="dialog" aria-modal="true" aria-label="${esc(t('nav.shelf'))}" hidden></div>`;
  root.querySelector('#selLangBtn').addEventListener('click', () => lb.go());
  const view = root.querySelector('#shelfView'), btn = root.querySelector("#selShelfBtn");
  btn.addEventListener('click', async () => {
    const chapters = await Promise.all(index.filter(c => c.available).map(async c => ({ id: c.id, title: c.title, data: await loadChapter(c.id) })));
    view.hidden = false; renderShelf(view, chapters, store, () => { view.hidden = true; btn.focus(); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !view.hidden) { view.hidden = true; btn.focus(); } });
}
