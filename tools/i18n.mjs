// Helper for writing a Bangla overlay. Usage:
//   node tools/i18n.mjs dump ch2 > ch2.txt        numbered list of every English text the player sees (lines: "N| English")
//   node tools/i18n.mjs build ch2 ch2.bn.txt      reads lines "N| Bangla" and writes chapters/ch2.bn.json
// The numbering follows the English file, so dump and build must use the same English file. Rules for what can be translated are in tools/lint.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTECTED = new Set(['id', 'key', 'art', 'type', 'line', 'blank', 'hotspot', 'portrait', 'side', 'who', 'provides', 'answer', 'derive', 'requiresClues', 'color', 'role', 'tag', 'decoy', 'variant', 'effect', 'shuffle', 'scene', 'delay', 'available', 'langs', 'nudgeWorkshop', 'cast', 'rule', 'trait', 'test', 'photo', 'field', 'op', 'value', 'clueId', 'example', 'any', 'numAttr']);
const idKey = o => (o && typeof o === 'object' && !Array.isArray(o) ? ('id' in o ? 'id' : 'key' in o ? 'key' : null) : null);
const needs = t => /[A-Za-z0-9]/.test(t.replace(/\{\w+\}/g, ''));

// Every translatable string, in file order, with the path to it.
function collect(en, toks = [], prot = false, out = []) {
  if (typeof en === 'string') { if (!prot && needs(en)) out.push({ toks, text: en }); return out; }
  if (Array.isArray(en)) {
    const keyed = en.length && en.every(x => idKey(x));
    en.forEach((e, i) => collect(e, [...toks, keyed ? { id: e[idKey(e)], f: idKey(e) } : { i }], prot, out));
    return out;
  }
  if (en && typeof en === 'object') {
    for (const [k, v] of Object.entries(en)) {
      if (k === 'talk') { v.forEach((tu, i) => { if (needs(tu[1])) out.push({ toks: [...toks, { k }, { i }, { i: 1 }], text: tu[1], who: tu[0] }); }); continue; }
      collect(v, [...toks, { k }], prot || (PROTECTED.has(k) && !(k === 'cast' && !Array.isArray(v))), out);
    }
  }
  return out;
}
// Put one translated string into the overlay, following the English structure.
function put(en, ov, toks, val) {
  const [t, ...rest] = toks;
  if (t.k !== undefined) {
    if (!rest.length) { ov[t.k] = val; return; }
    const child = en[t.k];
    ov[t.k] = ov[t.k] ?? (Array.isArray(child) ? [] : {});
    put(child, ov[t.k], rest, val); return;
  }
  if (t.id !== undefined) {
    const el = en.find(e => e[t.f] === t.id);
    let item = ov.find(o => o[t.f] === t.id); if (!item) { item = { [t.f]: t.id }; ov.push(item); }
    if (!rest.length) throw new Error('keyed item cannot be a string');
    put(el, item, rest, val); return;
  }
  while (ov.length <= t.i) ov.push(null);
  if (!rest.length) { ov[t.i] = val; return; }
  const el = en[t.i];
  ov[t.i] = ov[t.i] ?? (Array.isArray(el) ? [] : {});
  if (Array.isArray(ov[t.i]) && ov[t.i].length === 0 && Array.isArray(el)) ov[t.i] = el.map(() => null);
  put(el, ov[t.i], rest, val);
}

const [cmd, id, file] = process.argv.slice(2);
const en = JSON.parse(fs.readFileSync(path.join(root, 'chapters', `${id}.json`), 'utf8'));
const items = collect(en);
if (cmd === 'dump') {
  items.forEach((x, i) => console.log(`${i + 1}| ${x.text}`));
} else if (cmd === 'build') {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim());
  const tr = new Map();
  for (const l of lines) { const m = /^(\d+)\| ?(.*)$/.exec(l); if (!m) throw new Error('bad line: ' + l.slice(0, 40)); tr.set(+m[1], m[2]); }
  const ov = { _meta: { reviewed: false, note: 'First draft by Claude, following drafts/bangla-plan.md. Needs a fluent reader, and the chocolatier for the technical lines, before release.' } };
  const missing = [];
  items.forEach((x, i) => { if (!tr.has(i + 1)) { missing.push(i + 1); return; } put(en, ov, x.toks, tr.get(i + 1)); });
  items.forEach(x => { if (x.who !== undefined) { /* the speaker stays null */ } });
  if (missing.length) console.error(`missing ${missing.length} lines: ${missing.slice(0, 20).join(', ')}`);
  fs.writeFileSync(path.join(root, 'chapters', `${id}.bn.json`), JSON.stringify(ov, null, 2) + '\n');
  console.log(`wrote chapters/${id}.bn.json with ${tr.size} texts`);
}
