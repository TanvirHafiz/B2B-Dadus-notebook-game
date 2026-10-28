// Saved progress. Everything goes through try/catch and falls back to memory, so the game runs with storage blocked.
const KEY = 'dadus-notebook:v1';
const BAD_NAME = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g; // control and direction-changing characters
const blank = () => ({ v: 1, chapters: {}, clues: {} });
let mem = null;

function read() {
  if (mem) return mem;
  try {
    const raw = window.localStorage.getItem(KEY), data = raw ? JSON.parse(raw) : null;
    mem = data && data.v === 1 && data.chapters && typeof data.chapters === 'object' && data.clues && typeof data.clues === 'object' ? data : blank();
  } catch (e) { mem = blank(); }
  return mem;
}
function write() { try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* blocked or full: keep playing from memory */ } }

// False when the browser blocks or fills storage. Progress then lives only until the page changes, so nothing may be locked.
let persistent = null;
function probe() {
  try { const k = KEY + ':probe'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch (e) { return false; }
}

export const store = {
  get persistent() { if (persistent === null) persistent = probe(); return persistent; },
  get chapters() { return read().chapters; },
  isDone: id => !!read().chapters[id]?.done,
  stars: id => Number(read().chapters[id]?.stars) || 0,
  hasClue: (chapter, id) => !!read().clues[`${chapter}:${id}`],
  foundClues: () => Object.keys(read().clues),
  saveClue(chapter, id) { read().clues[`${chapter}:${id}`] = true; write(); },
  // Keeps the best star count and the run that earned it. A replay never lowers it.
  saveResult(id, { stars, hints, mistakes }) {
    const d = read(), old = d.chapters[id];
    d.chapters[id] = !old || !(old.stars >= 0) || stars > old.stars ? { done: true, stars, hints, mistakes } : { ...old, done: true };
    write();
  },
  // The shop's own bar (chapter 8): its name and wrapper. Kept on this device only.
  get shop() { const s = read().shop; return s && typeof s.name === 'string' && s.name.length > 0 && s.name.length <= 200 && s.name === s.name.replace(BAD_NAME, '') && ['dark', 'milk', 'dark90'].includes(s.wrapper) ? s : null; },
  saveShop({ name, wrapper }) { read().shop = { name: String(name).replace(BAD_NAME, '').slice(0, 200), wrapper: String(wrapper) }; write(); },
  reset() { mem = blank(); write(); }
};

// 3 stars: no hints and at most 2 wrong tries. 2 stars: at most 2 hints and 5 wrong tries. Otherwise 1.
export function starsFor(hints, mistakes) {
  if (hints === 0 && mistakes <= 2) return 3;
  if (hints <= 2 && mistakes <= 5) return 2;
  return 1;
}

// Chapters unlock in order: the first is always open, the rest open when the one before is done.
export function unlocked(index, i, chapters) {
  return i === 0 || !!(chapters[index[i - 1].id] && chapters[index[i - 1].id].done);
}
