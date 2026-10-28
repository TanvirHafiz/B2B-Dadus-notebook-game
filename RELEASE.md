# Releasing Dadu's Notebook

## Build
```
npm run build      # writes dist/ and checks the size budget
npm test           # every test, then the build and the offline check
```
`dist/` is the whole game as plain static files. Upload its contents to any static host.

## Share link (GitHub Pages)
1. Create a GitHub repository and push the contents of `dist/` to its `gh-pages` branch (or upload them to a `docs/` folder on `main`).
2. In the repository settings, turn on Pages for that branch or folder.
3. The link is `https://<user>.github.io/<repo>/`. The game uses only relative paths, so a sub-folder address works.
Nothing has been published from this project; the link is yours to create.

## Size budget (checked by the build)
| Part | Budget | Now |
|---|---|---|
| Engine (page, styles, scripts, text) | 300 KB | 153 KB |
| First visit (engine, Chapter 1, its art, effects, music) | 1.5 MB | 1.3 MB |
| Whole game | 12 MB | 2.8 MB |

## Offline
The service worker (`sw.js`) stores the engine and Chapter 1 on the first visit and each later chapter (with its art) when it is first opened. The background music is stored up front too. Chapter text is fetched network-first (fresh when online, stored copy when offline); an update replaces the engine cache but keeps the chapters already opened. Web fonts come from Google Fonts and are not stored, so offline the game uses system fonts.

## Privacy
No analytics, no cookies, no accounts. Progress stays in the browser's local storage. The only outside request is Google Fonts; `tests/offline.mjs` fails if anything else appears. To remove even that, self-host the four font families (needs your OK to download the font files).

## Before a public release
- **Image-model licence** (google/nano-banana-2-lite on fal.ai): the owner confirmed the site is non-commercial (no income), so commercial-use terms are not needed. Re-check them before any commercial use; this is recorded in `assets.json`.
- **Music** is under the Pixabay Content License (not CC0). Keep a copy of that licence page.
- **Review by people:** the Bangla text of all 8 chapters (first draft, `_meta.reviewed: false` in each overlay) needs a fluent reader; Chapters 7 and 8 and the "in real life" lines need the chocolatier.
- **Words inside pictures:** some generated scenes contain English letters (for example chapters 1, 2 and 4); they look wrong in Bangla.
- Sound effects are synthesised by `tools/make-sfx.sh`; they have not been tuned by ear.
