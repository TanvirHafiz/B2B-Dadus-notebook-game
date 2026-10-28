// Offline support. tools/build.mjs replaces the two placeholders below in dist/sw.js; the source copy does nothing, so local play and tests are never cached.
// First visit: the engine, Chapter 1 and the music are stored under this build's version. Later chapters and their art are stored the first time they are opened,
// in a separate cache that an update does not delete (chapter text is fetched network-first, so it is still fresh when online).
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';
const RUNTIME = 'dadus-runtime';

if (VERSION.startsWith('__')) {
  // development copy: stay out of the way
} else {
  self.addEventListener('install', e => {
    // 'reload' skips the browser's own HTTP cache, so a build installed just after a deploy never stores older copies
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(JSON.parse(PRECACHE).map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
  });
  const find = async req => (await caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }))) || (await caches.open(RUNTIME).then(c => c.match(req, { ignoreSearch: true })));
  self.addEventListener('fetch', e => {
    const req = e.request, url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return; // the web fonts stay on the network (the page falls back to system fonts offline)
    const fresh = req.mode === 'navigate' || /\/chapters\/[^/]*\.json$/.test(url.pathname); // text that may change: network first
    e.respondWith((async () => {
      const hit = fresh ? null : await find(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        // only whole, successful responses can be stored (a Range request from the audio element comes back as 206)
        if (res.status === 200 && !req.headers.has('range')) { const copy = res.clone(); e.waitUntil(caches.open(RUNTIME).then(c => c.put(req, copy)).catch(() => {})); } // clone before the page reads the body
        return res;
      } catch (err) {
        const old = await find(req);
        if (old) return old;
        if (req.mode === 'navigate') { const home = await find('index.html'); if (home) return home; }
        throw err;
      }
    })());
  });
}
