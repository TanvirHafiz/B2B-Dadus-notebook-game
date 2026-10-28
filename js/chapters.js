// Loads the chapter list and chapter files. Files are cached after the first load.
// A chapter in another language is the English file with that language's overlay merged over it (see i18n.js).
// index.json lists the languages each chapter has an overlay for ("langs"), so a missing overlay is never requested.
import { getLang, deepMerge } from './i18n.js';
const cache = {};
const getJson = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`could not load ${url}`); return r.json(); };
let indexLoad = null;
const overlaysFor = id => indexLoad.then(list => (list.find(c => c.id === id)?.langs || []));

export function loadIndex() {
  if (!indexLoad) indexLoad = getJson('chapters/index.json').then(j => j.chapters);
  const l = getLang();
  return indexLoad.then(async list => {
    if (l === 'en' || !list.some(c => (c.langs || []).includes(l))) return list;
    const over = await getJson(`chapters/index.${l}.json`).catch(() => null);
    return over ? deepMerge(list, over.chapters) : list;
  });
}
// Each clue and the ending remember the chapter's language, so their pictures are drawn in it.
const stamp = ch => ({ ...ch, clues: ch.clues.map(c => ({ ...c, _lang: ch._lang })), reveal: { ...ch.reveal, _lang: ch._lang } });
export async function loadChapter(id) {
  const l = getLang(), key = `${id}:${l}`;
  if (!cache[key]) cache[key] = (async () => {
    if (!indexLoad) await loadIndex();
    const en = await getJson(`chapters/${id}.json`);
    if (l === 'en' || !(await overlaysFor(id)).includes(l)) return { ...en, _lang: 'en' };
    try { return { ...deepMerge(en, await getJson(`chapters/${id}.${l}.json`)), _lang: l }; } catch (e) { console.error(e); return { ...en, _lang: 'en' }; } // a broken overlay must not stop the chapter
  })().then(ch => stamp(ch));
  return cache[key];
}
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
