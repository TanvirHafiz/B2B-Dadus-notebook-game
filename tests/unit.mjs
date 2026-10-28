// Pure-function checks for stars and chapter unlocking. Usage: node tests/unit.mjs
import assert from 'node:assert/strict';
import { starsFor, unlocked } from '../js/store.js';
import { shelfEntries } from '../js/shelf.js';

const cases = [[0, 0, 3], [0, 2, 3], [0, 3, 2], [1, 0, 2], [2, 5, 2], [2, 6, 1], [3, 0, 1], [0, 6, 1], [3, 9, 1]];
for (const [h, m, want] of cases) assert.equal(starsFor(h, m), want, `${h} hints, ${m} wrong tries`);

const index = [{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }];
assert.equal(unlocked(index, 0, {}), true, 'first chapter is always open');
assert.equal(unlocked(index, 1, {}), false, 'second is locked on a fresh save');
assert.equal(unlocked(index, 1, { ch1: { done: true } }), true, 'second opens when the first is done');
assert.equal(unlocked(index, 2, { ch1: { done: true } }), false, 'third stays locked until the second is done');
// The Memory shelf pre-fills a clue that a later chapter needs but the player has not found.
const ch1 = { id: 'ch1', title: 'A', data: { steps: [], clues: [{ id: 'therm' }, { id: 'jar' }] } };
const ch2 = { id: 'ch2', title: 'B', data: { steps: [{ requiresClues: ['ch1:therm', 'sign'] }], clues: [{ id: 'sign' }] } };
const states = has => shelfEntries([ch1, ch2], has).map(c => c.entries.map(e => e.state));
assert.deepEqual(states(() => false), [['prefilled', 'locked'], ['locked']], 'empty save: needed clue is pre-filled, others locked');
assert.deepEqual(states((c, id) => c === 'ch1' && id === 'therm'), [['found', 'locked'], ['locked']], 'found clue shows as found');
assert.deepEqual(states((c, id) => c === 'ch1'), [['found', 'found'], ['locked']], 'a clue from the same chapter is never pre-filled');
// Every picture a chapter asks for must exist, or the clue card and the Memory shelf would crash.
import fs from 'node:fs';
import { CLUE_ART, CARD_ART } from '../js/art.js';
const chapters = JSON.parse(fs.readFileSync(new URL('../chapters/index.json', import.meta.url), 'utf8')).chapters.filter(c => c.available);
for (const { id } of chapters) {
  const d = JSON.parse(fs.readFileSync(new URL(`../chapters/${id}.json`, import.meta.url), 'utf8'));
  d.clues.forEach(c => assert.equal(typeof CLUE_ART[c.art], 'function', `${id}: clue art ${c.art}`));
  [...d.intro, d.reveal].forEach(c => assert.equal(typeof CARD_ART[c.art], 'function', `${id}: card art ${c.art}`));
}
console.log(`PASS: ${cases.length} star cases, 4 unlock cases, 3 shelf cases`);
