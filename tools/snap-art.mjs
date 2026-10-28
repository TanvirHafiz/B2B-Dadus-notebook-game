// Writes the English clue and card art for every chapter to a JSON file, so an art refactor can be checked byte for byte.
// Usage: node tools/snap-art.mjs <out.json>
import fs from 'node:fs';
import { CLUE_ART, CARD_ART } from '../js/art.js';
const out = {};
for (const n of [1, 2, 3, 4, 5, 6]) {
  const d = JSON.parse(fs.readFileSync(new URL(`../chapters/ch${n}.json`, import.meta.url), 'utf8'));
  for (const c of d.clues) out[`ch${n}:${c.id}`] = CLUE_ART[c.art](c);
  out[`ch${n}:reveal`] = CARD_ART[d.reveal.art](d.reveal);
  for (const i of d.intro) out[`ch${n}:intro:${i.art}`] = CARD_ART[i.art](i);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(Object.keys(out).length + ' pieces of art');
