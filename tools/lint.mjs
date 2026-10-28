// Clue lint. Usage: node tools/lint.mjs [chapters/ch1.json ...]  (defaults to every chapter file)
// Each clue (and notebook line) declares what it provides. Each answer declares how it is derived.
// The lint evaluates every derive using only the facts from that step's requiresClues and fails if the result is not the answer.
import fs from 'node:fs';
import { CLUE_ART } from '../js/art.js';
import { deepMerge, westernDigits } from '../js/i18n.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'chapters', 'index.json'), 'utf8')).chapters;
const files = process.argv.length > 2 ? process.argv.slice(2) : index.filter(c => c.available).map(c => path.join('chapters', c.id + '.json'));
const loadCh = id => JSON.parse(fs.readFileSync(path.join(root, 'chapters', id + '.json'), 'utf8'));
let failed = 0;
// The chapter list itself: unique ids, available chapters have a file whose id matches.
{
  const errs = [], seen = new Set();
  index.forEach(c => { if (!/^ch\d+$/.test(c.id)) errs.push('chapter id must look like ch1: ' + c.id);
    if (seen.has(c.id)) errs.push('duplicate chapter id ' + c.id); seen.add(c.id);
    if (c.available) { try { if (loadCh(c.id).id !== c.id) errs.push(c.id + ': file id does not match'); } catch (e) { errs.push(c.id + ': no chapter file'); } } });
  console.log('\nchapters/index.json: ' +(errs.length ? 'FAIL' : 'PASS') + '  (' + index.length + ' chapters)');
  errs.forEach(e => console.log('  ERROR: ' + e)); if (errs.length) failed++;
}
const KNOWN = ['order', 'pick-by-sense', 'compare-two', 'sort-bins', 'spot-defect', 'tap-meter', 'ratio-slider', 'time-slider', 'multi-temp', 'scale-recipe', 'pattern-fill', 'diagnose', 'match-notes', 'free-build', 'name-wrapper'];

function strings(v, out = []) { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out)); return out; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Two texts share a run of two words. Used for translated hints, where the English tag words are not in the text.
const words = t => String(t).toLowerCase().split(/[\s,.;:!?।]+/).filter(Boolean);
const pairs = t => { const x = words(t); return x.slice(1).map((w, i) => x[i] + ' ' + w); };
// The hint repeats a two-word run from the right option. Runs that other options also have do not count, so a hint about a wrong option fails.
const shares2 = (o, all, hint) => { const y = words(hint).join(' '), others = new Set(all.filter(z => z !== o).flatMap(z => pairs(z.sense))), mine = pairs(o.sense).filter(p => !others.has(p)); return (mine.length ? mine : pairs(o.sense)).some(p => y.includes(p)); };
const sameObj = (a, b) => same(Object.fromEntries(Object.entries(a).sort()), Object.fromEntries(Object.entries(b).sort()));

function evalDerive(expr, facts, step, scope) {
  if (!/^[\w\s.+\-*/%(),'"<>=!&|]*$/.test(expr)) throw new Error(`unsafe expression: ${expr}`);
  const body = expr.replace(/\b([a-z][a-z0-9]*\.[a-z0-9_]+)\b/gi, (m, key) => {
    if (!(key in facts)) throw new Error(`fact ${key} is not provided by the listed clues`);
    return `F[${JSON.stringify(key)}]`;
  });
  const optionWith = (field, value) => {
    const list = scope || step.params.options || step.params.machines;
    const hit = list.filter(o => o[field] === value);
    if (hit.length !== 1) throw new Error(`optionWith(${field}, ${value}) matched ${hit.length} options`);
    return hit[0].id;
  };
  const defectsOf = good => (step.params.items || []).filter(i => i.type !== good).map(i => i.id);
  return new Function('F', 'optionWith', 'defectsOf', 'ceil', 'floor', 'round', 'min', 'max', `"use strict"; return (${body});`)(Object.freeze({ ...facts }), optionWith, defectsOf, Math.ceil, Math.floor, Math.round, Math.min, Math.max);
}

function lintChapter(ch, rel) {
  const errs = [], warns = [];
  const err = m => errs.push(m), warn = m => warns.push(m);

  const ids = (list, what) => { const seen = new Set(); list.forEach(x => { if (seen.has(x.id)) err(`duplicate ${what} id: ${x.id}`); seen.add(x.id); }); return seen; };
  ch.clues.forEach(c => { if (/[:.]/.test(c.id)) err(`clue id ${c.id} must not contain : or .`); });
  ch.notebook.lines.forEach(l => { if (/[:.]/.test(l.id)) err(`notebook line id ${l.id} must not contain : or .`); });
  const clueIds = ids(ch.clues, 'clue'), lineIds = ids(ch.notebook.lines, 'notebook line'); ids(ch.steps, 'step');
  const provided = {};
  ch.clues.forEach(c => {
    provided[c.id] = c.provides || {};
    const h = c.hotspot;
    if (!h || [h.x, h.y, h.w, h.h].some(n => typeof n !== 'number' || n < 0) || h.x + h.w > 100 || h.y + h.h > 100) err(`clue ${c.id}: hotspot must be percentages inside 0 to 100`);
    if (!c.title || !c.text || !c.art) err(`clue ${c.id}: needs title, art and text`);
    if (c.labels) { for (const col of ['red', 'blue', 'green']) if (c.labels[col] === undefined && c.art === 'therm') err(`clue ${c.id}: missing colour-blind label for ${col}`); }
    if (c.art === 'therm' && !c.labels) err(`clue ${c.id}: colour-coded clue needs letter labels`);
  });
  ch.notebook.lines.forEach(l => { provided['notebook:' + l.id] = l.provides || {}; });

  const used = new Set();
  const stepFacts = s => {
    const out = {};
    for (const [k, v] of Object.entries(s.provides || {})) {
      if (typeof v === 'string' && v.startsWith('answer.')) {
        const opt = (s.params.options || []).find(o => o.id === s.answer.choice);
        if (opt && !String(s.params.optionName || '').includes('{' + v.slice(7) + '}')) err(`step ${s.id}: ${v.slice(7)} feeds a later step but is not shown on the option (add {${v.slice(7)}} to optionName)`);
        if (!opt || opt[v.slice(7)] === undefined) err(`step ${s.id}: provides ${k} but the answer option has no ${v.slice(7)}`); else out[k] = opt[v.slice(7)];
      } else out[k] = v;
    }
    return out;
  };
  for (const [si, s] of ch.steps.entries()) {
    const at = `step ${s.id}`;
    if (!KNOWN.includes(s.type)) { err(`${at}: unknown type ${s.type}`); continue; }
    if (s.line && !lineIds.has(s.line)) err(`${at}: line ${s.line} is not in the notebook`);
    if (!s.answer) { err(`${at}: no answer`); continue; }
    if (!s.hints || !s.hints.length) err(`${at}: needs at least one hint`);
    if (!s.feedback) err(`${at}: needs feedback`);
    const facts = {};
    for (const r of s.requiresClues || []) {
      const sx = /^step:(.+)$/.exec(r);
      if (sx) { // a result from an earlier step in this chapter
        const j = ch.steps.findIndex(t => t.id === sx[1]);
        if (j < 0 || j >= si) err(`${at}: ${r} must be an earlier step`); else Object.assign(facts, stepFacts(ch.steps[j]));
        continue;
      }
      const x = /^(ch\d+):(.+)$/.exec(r);
      if (x) { // a clue from an earlier chapter, written chapterId:clueId
        const from = index.findIndex(c => c.id === x[1]), here = index.findIndex(c => c.id === ch.id);
        if (from < 0 || from >= here) { err(`${at}: ${r} must point at an earlier chapter`); continue; }
        let other; try { other = loadCh(x[1]); } catch (e) { err(`${at}: ${r}: chapter file ${x[1]} is missing`); continue; }
        const clue = other.clues.find(c => c.id === x[2]);
        if (!clue) { err(`${at}: ${r} is not a clue in ${x[1]}`); continue; }
        Object.assign(facts, clue.provides || {}); continue;
      }
      if (!(r in provided)) { err(`${at}: requiresClues has unknown id ${r}`); continue; }
      used.add(r); Object.assign(facts, provided[r]);
    }
    if (s.answer.derive === undefined && s.type !== 'free-build') { err(`${at}: answer needs derive`); continue; }
    const a = s.answer;
    try {
      if (s.type === 'sort-bins') {
        // each shelf rule must come from a clue, and every item belongs to exactly the bin whose rule matches its trait
        const rules = Object.values(facts), got = Object.fromEntries(s.params.bins.map(b => [b.id, []]));
        s.params.bins.forEach(b => { if (!rules.includes(b.rule)) err(`${at}: the rule "${b.rule}" for ${b.name} is not given by a listed clue`); });
        s.params.items.forEach(it => { const hit = s.params.bins.filter(b => b.rule === it.trait); if (hit.length !== 1) err(`${at}: item ${it.name} matches ${hit.length} bins`); else got[hit[0].id].push(it.id); });
        s.params.bins.forEach(b => { if (!same([...got[b.id]].sort(), [...(a.bins[b.id] || [])].sort())) err(`${at}: bin ${b.id} derives ${JSON.stringify(got[b.id])} but the answer is ${JSON.stringify(a.bins[b.id])}`); });
      } else if (s.type === 'spot-defect') {
        const types = Object.fromEntries(s.params.types.map(t => [t.id, t])), goods = s.params.types.filter(t => t.good);
        if (goods.length !== 1) err(`${at}: needs exactly one good type`);
        s.params.items.forEach(i => { if (!types[i.type]) err(`${at}: item ${i.id} has unknown type ${i.type}`); });
        const whys = s.params.types.filter(t => !t.good).map(t => t.why);
        if (whys.some(w => !w) || new Set(whys).size !== whys.length) err(`${at}: every bad type needs its own why text`);
        const got = evalDerive(a.derive, facts, s);
        if (!same([...got].sort(), [...a.defects].sort())) err(`${at}: derive gives ${JSON.stringify(got)} but the answer is ${JSON.stringify(a.defects)}`);
      } else if (s.type === 'free-build') {
        // Every rule comes from a listed clue, its value is derived from that clue's facts, and any build that meets every rule is accepted.
        const P = s.params, F = Object.fromEntries(P.fields.map(f => [f.key, f]));
        const clueFacts = id => { const x = /^(ch\d+):(.+)$/.exec(id); if (x) { try { return (loadCh(x[1]).clues.find(k => k.id === x[2]) || {}).provides || {}; } catch (e) { return {}; } } return provided[id] || {}; };
        const num = (f, id) => Number((f.options.find(o => o.id === id) || {})[f.numAttr] ?? id);
        const meets = (c, build) => { const f = F[c.field], v = build[c.field]; return c.op === 'eq' ? v === c.value : c.op === 'in' ? c.value.includes(v) : c.op === 'gte' ? num(f, v) >= num(f, c.value) : num(f, v) <= num(f, c.value); };
        if (!P.extraOff || !P.unfilled) err(`${at}: needs extraOff and unfilled text`);
        a.constraints.forEach((c, i) => {
          const f = F[c.field], where = `${at}: rule ${i + 1} (${c.field})`;
          if (!f) { err(`${where}: no such field`); return; }
          if (!['eq', 'gte', 'lte', 'in'].includes(c.op)) err(`${where}: unknown op ${c.op}`);
          if (!P.no || !P.no[c.field]) err(`${where}: needs a line in params.no`);
          if (!c.clueId) err(`${where}: needs a clueId`); else if (!(s.requiresClues || []).includes(c.clueId)) err(`${where}: clue ${c.clueId} is not in requiresClues`);
          else if (!Object.keys(clueFacts(c.clueId)).some(k => String(c.derive).includes(k))) err(`${where}: the derive does not use a fact from clue ${c.clueId}`);
          if ((c.op === 'gte' || c.op === 'lte') && !f.numAttr) err(`${where}: gte and lte need numAttr on the field`);
          const got = evalDerive(c.derive, facts, s, f.options);
          if (!same(got, c.value)) err(`${where}: derive gives ${JSON.stringify(got)} but the rule says ${JSON.stringify(c.value)}`);
        });
        const ex = a.example || {};
        P.fields.forEach(f => { if (!f.options.some(o => o.id === ex[f.key])) err(`${at}: the example has no valid option for ${f.key}`); });
        a.constraints.forEach((c, i) => { if (F[c.field] && !meets(c, ex)) err(`${at}: the example does not meet rule ${i + 1} (${c.field})`); });
        // an option flagged reject must fail at least one rule, so no row can let it through
        P.fields.forEach(f => f.options.filter(o => o.reject).forEach(o => { if (a.constraints.every(c => meets(c, { ...ex, [f.key]: o.id }))) err(`${at}: a build with ${f.key} = ${o.id} (reject) would be accepted`); }));
        // hint 2 names the numbers of the example
        const last = s.hints[s.hints.length - 1];
        a.constraints.forEach(c => { const f = F[c.field], o = f && f.options.find(x => x.id === ex[c.field]); const v = o && (o.n ?? o.hours); if (v !== undefined && !last.includes(String(v))) err(`${at}: the last hint does not give ${c.field} = ${v}`); });
      } else if (a.derive === 'ui') {
        if (s.type !== 'tap-meter' && s.type !== 'name-wrapper') err(`${at}: derive "ui" is only for tap-meter and name-wrapper`);
      } else {
        const d = a.derive, one = x => evalDerive(x, facts, s);
        let want, got;
        switch (s.type) {
          case 'order': want = a.sequence; got = d.map(one); break;
          case 'pick-by-sense': case 'compare-two': want = a.choice; got = one(d); break;
          case 'ratio-slider':
            if (Array.isArray(d)) { want = a.parts; got = d.map(one); if (a.parts.reduce((x, y) => x + y, 0) !== s.params.total) err(`${at}: parts do not add up to the total`); }
            else { want = a.parts[0]; got = one(d); }
            break;
          case 'time-slider': want = a.value; got = one(d); break;
          case 'multi-temp': want = a.values; got = d.map(one);
            s.params.rows.forEach((r, i) => { const lo = r.min ?? s.params.min, hi = r.max ?? s.params.max; if (a.values[i] < lo || a.values[i] > hi) err(`${at}: row ${r.key} answer is outside its range`); });
            break;
          case 'scale-recipe': case 'diagnose': {
            const key = s.type === 'diagnose' ? 'pairs' : 'fields';
            if (!d || typeof d !== 'object' || Array.isArray(d)) { err(`${at}: derive must be an object`); break; }
            got = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, one(v)])); want = a[key];
            if (!sameObj(got, want)) err(`${at}: derive gives ${JSON.stringify(got)} but the answer is ${JSON.stringify(want)}`);
            want = undefined; break;
          }
          case 'match-notes': {
            const P = s.params;
            if (!d || typeof d !== 'object' || Array.isArray(d)) { err(`${at}: derive must be an object`); break; }
            got = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, one(v)]));
            want = Object.fromEntries(Object.entries(a.settings).filter(([, v]) => v !== null));
            if (!sameObj(got, want)) err(`${at}: derive gives ${JSON.stringify(got)} but the answer is ${JSON.stringify(want)}`);
            if (!P.extraOff || !P.unfilled || !/\{taste\}/.test(P.wrong || '')) err(`${at}: needs extraOff, unfilled and a wrong line with {taste}`);
            const last = s.hints[s.hints.length - 1].toLowerCase();
            P.settings.forEach(x => {
              x.options.forEach(o => { if (!o.taste) err(`${at}: option ${o.id} of ${x.key} needs a taste`); });
              if (!(x.key in a.settings)) { err(`${at}: setting ${x.key} is missing from the answer`); return; }
              const w = a.settings[x.key];
              if (w === null) { if (!(P.free && P.free[x.key])) err(`${at}: free setting ${x.key} needs a note in params.free`); return; }
              const o = x.options.find(q => q.id === w);
              if (!P.needs || !P.needs[x.key]) err(`${at}: setting ${x.key} needs a line in params.needs`);
              if (!o) err(`${at}: answer ${w} is not an option of ${x.key}`); else if (!last.includes(o.name.toLowerCase().split(' ')[0])) err(`${at}: the last hint does not name ${o.name}`);
            });
            want = undefined; break;
          }
          case 'pattern-fill': {
            want = a.grid; got = one(d);
            const P = s.params, ids = P.toppings.map(t => t.id);
            if (a.grid.length !== P.rows * P.cols) err(`${at}: grid size does not match rows x cols`);
            a.grid.forEach(k => { const t = P.toppings.find(x => x.id === k); if (!t) err(`${at}: unknown topping ${k}`); else if (t.reject) err(`${at}: the answer uses a rejected topping ${k}`); });
            if (!P.toppings.some(t => t.reject)) warn(`${at}: no decoy topping`);
            P.toppings.forEach(t => { if (!t.name || !t.says) err(`${at}: topping ${t.id} needs name and says`); });
            break;
          }
          default: err(`${at}: derive is not supported for ${s.type}`);
        }
        if (want !== undefined && !same(got, want)) err(`${at}: derive gives ${JSON.stringify(got)} but the answer is ${JSON.stringify(want)}`);
      }
    } catch (e) { err(`${at}: ${e.message}`); }

    // Specific feedback: every numeric or choice step names each wrong direction.
    const fb = s.feedback || {};
    if (s.type === 'ratio-slider' && s.params.sliders) s.params.sliders.forEach(sl => { if (!sl.high || !sl.low) err(`${at}: slider ${sl.label} needs high and low feedback`); });
    if (s.type === 'ratio-slider' && s.params.sliders && !(s.params.remainderHigh && s.params.remainderLow)) err(`${at}: needs remainderHigh and remainderLow feedback for the sugar`);
    if (s.type === 'ratio-slider' && s.params.sliders) { /* checked above */ }
    else if (s.type === 'ratio-slider' && !(fb.high && fb.low)) err(`${at}: needs separate high and low feedback`);
    if (s.type === 'time-slider' && !(fb.high && fb.low)) err(`${at}: needs separate high and low feedback`);
    if (s.type === 'time-slider' && a.near === undefined) err(`${at}: time-slider needs a near range in absolute units`);
    if (s.type === 'time-slider' && a.near !== undefined && !fb.near) err(`${at}: near range set but no near feedback`);
    if (s.type === 'scale-recipe') {
      if (!(s.params.unfilled && s.params.extraOff)) err(`${at}: needs unfilled and extraOff text`);
      s.params.fields.forEach(f => { if (!f.high || !f.low || !f.nearText || !(f.near > 0)) err(`${at}: field ${f.key} needs high, low, nearText and a near range`); if (!(f.key in a.fields)) err(`${at}: field ${f.key} has no answer`); else if (a.fields[f.key] < f.min || a.fields[f.key] > f.max) err(`${at}: field ${f.key} answer is outside its range`); });
    }
    if (s.type === 'pattern-fill' && !(fb.unfilled && fb.wrongSquares && fb.wrongOne && /{n}/.test(fb.wrongSquares))) err(`${at}: pattern-fill needs unfilled, wrongOne and wrongSquares (with {n}) feedback`);
    if (s.type === 'pattern-fill' && !(/{row}/.test(s.params.squareLabel || '') && /{col}/.test(s.params.squareLabel || ''))) err(`${at}: squareLabel must name the {row} and {col}`);
    if (s.type === 'diagnose') {
      const cids = s.params.causes.map(c => c.id);
      s.params.photos.forEach(p => { if (!(p.id in a.pairs)) err(`${at}: photo ${p.id} has no answer`); else if (!cids.includes(a.pairs[p.id])) err(`${at}: photo ${p.id} answer is not a cause`); if (!p.testText) err(`${at}: photo ${p.id} needs testText`); });
      s.params.causes.forEach(c => { if (!c.name || !c.says) err(`${at}: cause ${c.id} needs name and says`); });
      s.params.photos.forEach(p => { if (!CLUE_ART[p.art]) err(`${at}: photo ${p.id} uses unknown art ${p.art}`); });
      cids.forEach(c => { if (!(s.params.wrongText || {})[c]) err(`${at}: wrongText missing for cause ${c}`); });
      if (!(s.params.unfilled && s.params.extraOff)) err(`${at}: needs unfilled and extraOff text`);
    }
    if ((s.type === 'multi-temp' || (s.type === 'ratio-slider' && s.params.sliders)) && !s.params.extraOff) err(`${at}: needs extraOff text`);
    if (s.type === 'multi-temp') s.params.rows.forEach(r => { if (!r.low || !r.high) err(`${at}: row ${r.key} needs low and high feedback`); });
    if (s.type === 'pick-by-sense' || s.type === 'compare-two') s.params.options.forEach(o => { if (o.id !== a.choice && !o.no) err(`${at}: wrong option ${o.id} has no feedback`); });

    if (s.type === 'sort-bins' && !(/\{bin\}/.test(s.params.wrongFeedback || '') && /\{(says|item)\}/.test(s.params.wrongFeedback || ''))) err(`${at}: sort-bins needs wrongFeedback naming the item and the {bin}`);
    if (s.type === 'spot-defect' && !(s.params.goodTap && s.params.stillBad)) err(`${at}: spot-defect needs goodTap and stillBad text`);

    // Hint level 2 reveals the answer (tap-meter steps have nothing to reveal).
    if (s.type !== 'tap-meter' && s.type !== 'name-wrapper') {
      const last = s.hints[s.hints.length - 1];
      let ok;
      if (s.type === 'order') ok = a.sequence.every(id => last.toLowerCase().includes(s.params.machines.find(m => m.id === id).name.toLowerCase().split(' ')[0]));
      else if (s.type === 'pick-by-sense' || s.type === 'compare-two') { const o = s.params.options.find(x => x.id === a.choice), lo = last.toLowerCase(); ok = last.includes('{answerLabel}') || (o.label && last.includes(o.label)) || lo.includes(o.sense.toLowerCase().replace(/\.$/, '')) || (o.tag && lo.includes(o.tag.toLowerCase())) || shares2(o, s.params.options, last); }
      else if (s.type === 'sort-bins') ok = s.params.items.every(it => { const lo = last.toLowerCase(), n = it.name.toLowerCase(); return lo.includes(n) || lo.includes(n.split(' ').pop()); });
      else if (s.type === 'spot-defect') ok = s.params.types.filter(t => !t.good).every(t => last.toLowerCase().includes(t.label.toLowerCase().split(' ')[0]));
      else if (s.type === 'match-notes' || s.type === 'free-build') ok = true; // checked with the answer above
      else if (s.type === 'scale-recipe') ok = Object.values(a.fields).every(n => last.includes(String(n)));
      else if (s.type === 'diagnose') ok = s.params.causes.filter(c => Object.values(a.pairs).includes(c.id)).every(c => last.toLowerCase().includes(c.name.toLowerCase()));
      else if (s.type === 'pattern-fill') {
        const w = id => { const n = s.params.toppings.find(t => t.id === id).name.toLowerCase().split(' '); return n[n.length - 1]; };
        ok = [0, 1, 2, 3, 4, 5, 6, 7].slice(0, s.params.rows).every(r => last.toLowerCase().includes(a.grid.slice(r * s.params.cols, (r + 1) * s.params.cols).map(w).join(', ')));
      }
      else { const nums = s.type === 'ratio-slider' ? a.parts : s.type === 'multi-temp' ? a.values : [a.value]; ok = nums.every(n => last.includes(String(n)) || (s.type === 'time-slider' && last.includes(String(n)))); }
      if (!ok) err(`${at}: the last hint does not reveal the answer`);
      if (s.hints.length < 2) err(`${at}: needs two hint levels`);
    }
  }
  for (const c of ch.clues) if (!used.has(c.id)) warn(`clue ${c.id} is not required by any step (fine for story objects)`);

  // Copy lint: no em dashes anywhere.
  strings(ch).forEach(t => { if (/[—]|&mdash;/.test(t)) err(`em dash in text: "${t.slice(0, 50)}"`); });

  console.log(`\n${rel}: ${errs.length ? 'FAIL' : 'PASS'}  (${ch.steps.length} steps, ${ch.clues.length} clues)`);
  warns.forEach(w => console.log('  note: ' + w));
  errs.forEach(e => console.log('  ERROR: ' + e));
  if (errs.length) failed++;
}

// ---------- translations ----------
// An overlay (chapters/ch1.bn.json) holds only text. These keys carry game logic or art names, so they can never be translated.
const PROTECTED = new Set(['id', 'key', 'art', 'type', 'line', 'blank', 'hotspot', 'portrait', 'side', 'who', 'provides', 'answer', 'derive', 'requiresClues', 'color', 'role', 'tag', 'decoy', 'variant', 'effect', 'shuffle', 'scene', 'delay', 'available', 'langs', 'nudgeWorkshop', 'cast', 'rule', 'trait', 'test', 'photo', 'field', 'op', 'value', 'clueId', 'example', 'any', 'numAttr']);
const idOf = o => (o && typeof o === 'object' && !Array.isArray(o) ? (o.id ?? o.key) : undefined);
const letters = t => /[A-Za-z0-9]/.test(t.replace(/\{\w+\}/g, '')); // text with no English letters or digits (Bangla already, symbols) needs no translation
const holders = t => (t.match(/\{\w+\}/g) || []).sort().join(' ');
const marks = t => (t.match(/\[\[\w+:/g) || []).sort().join(' ');
const numbersIn = t => (westernDigits(t).match(/\d+/g) || []);

// Shape: every overlay entry exists in the English file, has the same kind of value, and is not a protected key.
function walkOverlay(en, ov, at, errs) {
  if (ov === null || ov === undefined) return;
  if (typeof ov === 'number' || typeof ov === 'boolean') { errs.push(`${at}: only text can be translated`); return; }
  if (Array.isArray(en)) {
    if (!Array.isArray(ov)) { errs.push(`${at}: should be a list`); return; }
    if (en.length && en.every(x => idOf(x) !== undefined)) {
      const ids = en.map(idOf), seen = new Set();
      ov.forEach((o, i) => { const k = idOf(o); if (k === undefined || !ids.includes(k)) errs.push(`${at}[${i}]: needs an id that is in the English list`); else if (seen.has(k)) errs.push(`${at}: duplicate id ${k}`); seen.add(k); });
      en.forEach(e => walkOverlay(e, ov.find(o => idOf(o) === idOf(e)), `${at}[${idOf(e)}]`, errs));
    } else {
      if (ov.length > en.length) errs.push(`${at}: has more entries than the English list`);
      if (/\.talk\[\d+\]$/.test(at) && ov[0] !== null) errs.push(`${at}: the speaker (first entry) must be null`);
      en.forEach((e, i) => walkOverlay(e, ov[i], `${at}[${i}]`, errs));
    }
    return;
  }
  if (en && typeof en === 'object') {
    if (!ov || typeof ov !== 'object' || Array.isArray(ov)) { errs.push(`${at}: should be an object`); return; }
    for (const [k, v] of Object.entries(ov)) {
      if (k === '_meta' && at === '') continue;
      if (!(k in en)) { errs.push(`${at}.${k}: is not in the English file`); continue; }
      if ((k === 'id' || k === 'key')) { if (v !== en[k]) errs.push(`${at}.${k}: must match the English id`); continue; }
      if (PROTECTED.has(k) && !(k === 'cast' && !Array.isArray(en[k]))) { if (v !== null) errs.push(`${at}.${k}: this is game logic and cannot be translated`); continue; }
      walkOverlay(en[k], v, `${at}.${k}`, errs);
    }
    return;
  }
  if (typeof en !== 'string') errs.push(`${at}: only text can be translated`);
}
// Every text the player can see must be translated, and each translated text keeps its placeholders, markup and numbers.
function walkText(en, merged, at, prot, errs, warns) {
  if (typeof en === 'string') {
    if (prot || /\.openSize$/.test(at)) return; // a font size, not text
    if (!letters(en)) return;
    if (merged === en) { errs.push(`${at}: not translated${/^[\d\s]+$/.test(en) ? ' (use Bengali digits)' : ''}`); return; }
    if (en.match(/^\s*/)[0] !== merged.match(/^\s*/)[0] || en.match(/\s*$/)[0] !== merged.match(/\s*$/)[0]) errs.push(`${at}: spaces at the start or end differ from the English`);
    if (holders(en) !== holders(merged)) errs.push(`${at}: placeholders differ: ${holders(en)} and ${holders(merged)}`);
    if (marks(en) !== marks(merged)) errs.push(`${at}: markup like [[q:...]] differs`);
    const a = numbersIn(en), b = numbersIn(merged);
    a.forEach(n => { if (!b.includes(n)) errs.push(`${at}: the number ${n} is missing`); });
    b.forEach(n => { if (!a.includes(n)) warns.push(`${at}: the number ${n} is not in the English text`); });
    if (!/[\u0980-\u09FF]/.test(merged)) errs.push(`${at}: has no Bangla letters`);
    if (/\d/.test(merged.replace(/\{\w+\}/g, ''))) errs.push(`${at}: use Bengali digits, not 0 to 9`);
    const plain = merged.replace(/\{\w+\}/g, '').replace(/\[\[\w+:/g, '');
    const latin = plain.match(/[A-Za-z]{2,}/g); if (latin) errs.push(`${at}: English letters left in Bangla text: ${latin.join(', ')}`);
    return;
  }
  if (Array.isArray(en)) { en.forEach((e, i) => walkText(e, merged[i], `${at}[${idOf(e) ?? i}]`, prot, errs, warns)); return; }
  if (en && typeof en === 'object') for (const [k, v] of Object.entries(en)) if (k === 'talk') v.forEach((tu, i) => walkText(tu[1], merged[k][i][1], `${at}.talk[${i}]`, prot, errs, warns)); else walkText(v, merged[k], `${at}.${k}`, prot || (PROTECTED.has(k) && !(k === 'cast' && !Array.isArray(v))), errs, warns);
}
const mapStrings = (v, f) => (typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map(x => mapStrings(x, f)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)])) : v);

function lintTranslation(en, enList, label, file, over) {
  const errs = [], warns = [];
  let ov; try { ov = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { errs.push('cannot read ' + file + ': ' + e.message); }
  let merged = null;
  if (ov) {
    walkOverlay(over ? en : en, over ? ov[over] : ov, '', errs);
    merged = deepMerge(en, over ? { [over]: ov[over] } : ov);
    walkText(en, merged, '', false, errs, warns);
    if (!over && !(ov._meta && ov._meta.reviewed === true)) warns.push('not reviewed by a fluent reader yet (_meta.reviewed)');
    strings(ov).forEach(t => { if (/[—–]|&mdash;/.test(t)) errs.push(`dash in text: "${t.slice(0, 40)}"`); });
  }
  console.log(`\n${label}: ${errs.length ? 'FAIL' : 'PASS'}`);
  warns.forEach(w => console.log('  note: ' + w)); errs.forEach(e => console.log('  ERROR: ' + e));
  if (errs.length) failed++;
  return merged;
}
for (const rel of files) {
  const ch = JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  lintChapter(ch, rel);
  const entry = index.find(c => c.id === ch.id);
  for (const l of (entry && entry.langs || []).filter(x => x !== 'en')) {
    const merged = lintTranslation(ch, null, `chapters/${ch.id}.${l}.json`, path.join(root, 'chapters', `${ch.id}.${l}.json`));
    if (merged) lintChapter(mapStrings(merged, westernDigits), `chapters/${ch.id}.json [${l}, merged]`);
  }
}
// The game's own buttons and messages: i18n/bn.json must have the same keys and placeholders as i18n/en.json.
for (const l of [...new Set(index.flatMap(c => c.langs || []))].filter(x => x !== 'en')) {
  const en = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'en.json'), 'utf8')), errs = [];
  let tr = {}; try { tr = JSON.parse(fs.readFileSync(path.join(root, 'i18n', l + '.json'), 'utf8')); } catch (e) { errs.push('cannot read i18n/' + l + '.json'); }
  for (const [k, v] of Object.entries(en)) {
    if (!(k in tr)) { errs.push(k + ': missing'); continue; }
    if (holders(v) !== holders(tr[k])) errs.push(k + ': placeholders differ');
    if (!/[\u0980-\u09FF]/.test(tr[k])) errs.push(k + ': has no Bangla letters');
    if (/[A-Za-z]{2,}/.test(tr[k].replace(/\{\w+\}/g, ''))) errs.push(k + ': English letters left in the text');
    if (/\d/.test(tr[k].replace(/\{\w+\}/g, ''))) errs.push(k + ': use Bengali digits');
  }
  Object.keys(tr).forEach(k => { if (!(k in en)) errs.push(k + ': not in en.json'); });
  console.log(`\ni18n/${l}.json: ${errs.length ? 'FAIL' : 'PASS'}`); errs.forEach(e => console.log('  ERROR: ' + e)); if (errs.length) failed++;
}
// Sponsor assets: the small logo and every box photo named in chapters/index.json exist and stay light.
{
  const errs = [], warns = [], ids = new Set();
  index.forEach(c => { if (c.photo) ids.add(c.photo); });
  const size = f => { try { return fs.statSync(path.join(root, f)).size; } catch (e) { return -1; } };
  if (size('assets/sponsor-logo.webp') < 0) errs.push('assets/sponsor-logo.webp is missing');
  for (const id of ids) { const f = 'assets/products/' + id + '.webp', n = size(f); if (n < 0) errs.push(f + ' is missing'); else if (n > 100 * 1024) warns.push(f + ' is ' + Math.round(n / 1024) + ' KB, over the 100 KB budget'); }
  console.log('\nsponsor assets: ' + (errs.length ? 'FAIL' : 'PASS') + '  (' + ids.size + ' box photos)');
  warns.forEach(w => console.log('  note: ' + w)); errs.forEach(e => console.log('  ERROR: ' + e)); if (errs.length) failed++;
}
// The chapter titles on the chapter screen.
for (const l of [...new Set(index.flatMap(c => c.langs || []))].filter(x => x !== 'en')) {
  const f = path.join(root, 'chapters', `index.${l}.json`);
  if (!fs.existsSync(f)) { console.log(`\nchapters/index.${l}.json: FAIL\n  ERROR: missing`); failed++; continue; }
  const ov = JSON.parse(fs.readFileSync(f, 'utf8')), errs = [];
  walkOverlay(index, ov.chapters, 'chapters', errs);
  (ov.chapters || []).forEach(c => { if (c.title && (!/[\u0980-\u09FF]/.test(c.title) || /[A-Za-z]{2,}/.test(c.title) || /\d/.test(c.title))) errs.push(`chapters[${c.id}].title: needs Bangla letters and Bengali digits only`); });
  console.log(`\nchapters/index.${l}.json: ${errs.length ? 'FAIL' : 'PASS'}`); errs.forEach(e => console.log('  ERROR: ' + e)); if (errs.length) failed++;
}
process.exit(failed ? 1 : 0);
