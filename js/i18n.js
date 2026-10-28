// Language support. The chosen language is saved on its own key (not inside the progress data) and can be set with ?lang=bn.
// Game text for a chapter comes from an overlay file (chapters/ch1.bn.json) merged over the English chapter. Buttons and messages come from i18n/<lang>.json.
const KEY = 'dadus-notebook:lang';
export const LANGS = { en: 'English', bn: 'বাংলা' };
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

let lang = 'en', dict = {}, base = {}, content = null;
export const getLang = () => lang;
// The language of the chapter on screen. A Bangla page can show a chapter that has no translation yet, and its numbers stay Western.
export const setContentLang = l => { content = l; };
export const getContentLang = () => content ?? lang;
export const fmt = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

// Digits in the given language. Used for everything the player sees as a number.
export const digits = (n, l) => (l === 'bn' ? String(n).replace(/\d/g, d => BN_DIGITS[d]) : String(n));
export const num = n => digits(n, content ?? lang);
// Reads a number typed with either kind of digit.
export const westernDigits = s => String(s).replace(/[০-৯]/g, d => String(BN_DIGITS.indexOf(d)));

export function savedLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS[q]) { try { localStorage.setItem(KEY, q); } catch (e) { /* storage blocked: the choice lasts for this page only */ } return q; }
  } catch (e) { /* no location */ }
  try { const s = localStorage.getItem(KEY); if (s && LANGS[s]) return s; } catch (e) { /* storage blocked */ }
  return 'en';
}
export function saveLang(l) { try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ } }
// With storage blocked the choice only lives in this page, so links must carry it: "?lang=bn" (first = '?') or "&lang=bn".
export function langQuery(first = '?') {
  try { const k = KEY + ':probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return ''; } catch (e) { return `${first}lang=${lang}`; }
}
// Reloads this page in another language. The query is read first, so it works with storage blocked too.
export function switchTo(l) { saveLang(l); const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.href; }

export async function initLang() {
  lang = savedLang();
  const get = async l => { const r = await fetch(`i18n/${l}.json`); if (!r.ok) throw new Error(`no strings for ${l}`); return r.json(); };
  base = await get('en'); dict = lang === 'en' ? base : await get(lang).catch(() => ({}));
  document.documentElement.lang = lang;
  applyStatic(document);
  return lang;
}
export const t = (key, vars) => fmt(dict[key] ?? base[key] ?? key, vars);

// Static text in index.html: data-i18n="key" sets the text, data-i18n-aria="key" sets aria-label.
export function applyStatic(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// A language switch button. Shows the other language's name.
export function langButton() {
  const other = lang === 'en' ? 'bn' : 'en';
  return { other, label: LANGS[other], aria: t('lang.switch'), go() { switchTo(other); } };
}

// Overlay merge: objects by key. Arrays of objects that have an id (or key) are matched by it, other arrays by position.
// null or a missing entry keeps the English. A value of another type is ignored. A "_meta" key in an overlay is ignored.
const idOf = o => (o && typeof o === 'object' && !Array.isArray(o) ? (o.id ?? o.key) : undefined);
export function deepMerge(en, over) {
  if (over === null || over === undefined) return en;
  if (Array.isArray(en)) {
    if (!Array.isArray(over)) return en;
    if (en.length && en.every(x => idOf(x) !== undefined)) return en.map(v => deepMerge(v, over.find(o => idOf(o) === idOf(v))));
    return en.map((v, i) => deepMerge(v, over[i]));
  }
  if (en && typeof en === 'object') {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return en;
    return Object.fromEntries(Object.entries(en).map(([k, v]) => [k, deepMerge(v, over[k])]));
  }
  return typeof over === typeof en ? over : en;
}
