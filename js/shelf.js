// The Memory shelf: every clue the player has found, across chapters. Used on the chapter screen and inside a chapter.
// A clue that a later chapter needs but the player has not found (fresh save, cleared storage) is shown pre-filled, so every chapter stays solvable.
import { CLUE_ART } from './art.js';
import { esc } from './chapters.js';
import { zoomable } from './zoom.js';
import { t, num } from './i18n.js';


// What the shelf shows for each clue: found, pre-filled (a later chapter needs it as chapterId:clueId) or locked.
export function shelfEntries(chapters, hasClue) {
  const needed = new Set();
  chapters.forEach(ch => ch.data.steps.forEach(s => (s.requiresClues || []).forEach(r => { if (/^ch\d+:/.test(r)) needed.add(r); })));
  return chapters.map(ch => ({
    ...ch,
    entries: ch.data.clues.map(c => ({ clue: c, state: hasClue(ch.id, c.id) ? 'found' : needed.has(`${ch.id}:${c.id}`) ? 'prefilled' : 'locked' }))
  }));
}

const card = ({ clue: c, state }) => state === 'locked'
  ? `<div class="memo locked"><div class="eb">${esc(t('shelf.notFound'))}</div><p>${esc(t('shelf.look'))}</p></div>`
  : `<div class="memo ${state === 'prefilled' ? 'prefilled' : ''}"><div class="eb">${esc(state === 'prefilled' ? t('shelf.prefilled') : t('shelf.found'))}</div><h4>${esc(c.title)}</h4>${zoomable(CLUE_ART[c.art](c), c.title)}<p>${esc(c.text)}</p></div>`;

// chapters: [{ id, title, data }] for the chapters that exist. store: the saved progress.
export function renderShelf(container, chapters, store, onClose) {
  const no = id => num(id.replace('ch', ''));
  container.innerHTML = `<div class="shelf"><div class="shelfTop"><h2>${esc(t('shelf.title'))}</h2><button type="button" class="btn alt" id="shelfClose">${esc(t('close'))}</button></div>
    <p class="sub">${esc(t('shelf.sub'))}</p>
    ${shelfEntries(chapters, store.hasClue).map(ch => `<section lang="${ch.data._lang || 'en'}" aria-label="${esc(t('shelf.chapter', { n: no(ch.id), title: ch.title }))}"><h3>${esc(t('shelf.chapter', { n: no(ch.id), title: ch.title }))}</h3><div class="shelfGrid">${ch.entries.map(card).join('')}</div></section>`).join('')}</div>`;
  const close = container.querySelector('#shelfClose'); close.addEventListener('click', onClose); close.focus({ preventScroll: true });
}
