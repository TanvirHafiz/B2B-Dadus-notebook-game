// Sound: short recorded effects plus a quiet music loop, both optional. Nothing plays until the first tap (browsers require it),
// a missing or undecodable file falls back to a synthesised tone, and the mute choice is saved.
const KEY = 'dadus-notebook:mute';
// name -> file in assets/audio/ (decoded on first use)
const FILES = { tap: 'tap.ogg', ok: 'ok.ogg', no: 'no.ogg', win: 'win.ogg', page: 'page.ogg', pour: 'pour.ogg', tin: 'tin.ogg', shutter: 'shutter.ogg', crank: 'crank.ogg', rattle: 'rattle.ogg' };
// Background music: a quiet, looping flute folk melody (Pixabay Content License, see assets.json).
const MUSIC = 'assets/audio/music.ogg';
let ac = null, muted = false, buffers = {}, loading = {}, musicEl = null, wanted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage may be blocked */ }

function ctx() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
function tone(f, d = .1, type = 'triangle', v = .05, delay = 0) {
  const c = ctx(); if (!c) return;
  try {
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d);
  } catch (e) { /* sound is optional */ }
}
const SYNTH = {
  ok: () => [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .05, i * .06)),
  no: () => tone(170, .2, 'sine', .06),
  tap: () => tone(440, .04, 'triangle', .04),
  win: () => [0, 1, 2, 3].forEach(i => tone(659 + i * 130, .2, 'triangle', .05, i * .12))
};

function load(name) { return loading[name] || (loading[name] = fetchBuffer(name)); }
async function fetchBuffer(name) {
  buffers[name] = null;
  try {
    const c = ctx(); if (!c || !FILES[name]) return null;
    const r = await fetch(`assets/audio/${FILES[name]}`); if (!r.ok) return null;
    buffers[name] = await c.decodeAudioData(await r.arrayBuffer());
  } catch (e) { buffers[name] = null; }
  return buffers[name];
}
function play(name, gain = 1) {
  if (muted) return;
  const b = buffers[name], c = ctx(); if (!c) return;
  if (b) { try { const s = c.createBufferSource(), g = c.createGain(); g.gain.value = gain; s.buffer = b; s.connect(g).connect(c.destination); s.start(); return; } catch (e) { /* fall through to the tone */ } }
  if (!b && loading[name] && !SYNTH[name]) { const t0 = performance.now(); loading[name].then(() => { if (buffers[name] && performance.now() - t0 < 600) play(name, gain); }); return; } // still decoding: play when ready, unless it would now be late
  if (b === undefined) load(name); // first use: fetch for next time
  if (SYNTH[name]) SYNTH[name]();
}

export const sfx = Object.fromEntries(Object.keys(FILES).map(k => [k, () => play(k, k === 'tap' ? .6 : 1)]));
export const isMuted = () => muted;
export function setMuted(m) {
  muted = !!m; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
  if (musicEl) { if (muted) musicEl.pause(); else if (wanted) musicEl.play().catch(() => {}); }
  return muted;
}
// Called on the first pointer or key press: warms the effects and starts the music unless muted.
export function startAudio() {
  if (wanted) return; wanted = true; ctx();
  Object.keys(FILES).forEach(load);
  if (!MUSIC) return;
  try {
    musicEl = new Audio(MUSIC); musicEl.loop = true; musicEl.volume = .3; musicEl.preload = 'auto';
    musicEl.addEventListener('error', () => { musicEl = null; });
    if (!muted) musicEl.play().catch(() => {});
  } catch (e) { musicEl = null; }
}
