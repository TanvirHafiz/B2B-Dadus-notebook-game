# M7 plan: art pass, audio, accessibility, reduced motion (DRAFT, nothing started)

Updated for what you decided: **one candid expression per character** (static pictures), the shutter reveals real art, the brand colours, and the sponsor's pack look.

## 1. Art (Runware)
**Style.** Warm storybook gouache, soft lamplight, gentle texture, no text, logos or watermarks. The palette changes from the spec's old teal and gold to the brand: cocoa brown, cream and caramel, with a little warm gold in lamp light. One style sentence and one negative prompt, reused for every image.

**Characters: 8 pictures, one expression each.** Head and shoulders, three-quarter view, a relaxed natural look, transparent background, 256 by 256 WebP (about 40 KB each).
| Character | Look (from the spec, locked first) |
|---|---|
| Laila | young woman, warm brown skin, dark hair in a high bun, teal kurti with a gold neckline, small gold earrings |
| Rafiq Bhai | middle-aged, round face, thick moustache, round glasses, white skullcap, light blue shirt |
| Mishti | young girl, two pigtails with red ribbons, yellow dress, big bright eyes |
| Dadu | elderly, white beard and moustache, round gold glasses, grey cardigan, shown as a sepia framed photo |
| Kobir | fifties, lungi and vest, gamchha over his shoulder, sun-lined face |
| Nazma Apa | retired teacher, glasses, green sari over her head |
| Jamal Chacha | rickshaw garage owner, grey sides, big moustache, orange shirt |
| Shumi | university student, bob haircut, plum kurta |
Because each picture is static, the talking mouth is dropped. The speaker's picture keeps a small bob, and the name label does the rest. This also cuts the spec's 22 portraits to 8.

**Scenes and cards (no people in them): about 25 pictures.** 1344 by 768, shown at 1280 by 720, WebP at 150 to 250 KB.
- **Behind the shutter, one per chapter (8):** the workshop interior that the intro shutter reveals. Chapter 1 lamp-lit bench, 2 a week before Eid, 3 rain on the window, 4 a sack at the door, 5 wedding boxes, 6 the returned bars, 7 tasting night, 8 morning light on opening day.
- **Workshop scenes with tap spots (8):** one per chapter, locked first, then the tap spots are placed. The scene SVGs become pictures, and all the hotspot percentages are re-placed.
- **Ending cards (8):** the finished bar for each chapter, using the sponsor's pack look where it fits. No readable text in any image.
- **Wrappers (3):** the picture half of the dark, milk and black packs, with no text. The bar name stays live text on top, and the sponsor badge stays the supplied logo file. I never regenerate the logo.
- **Kept as drawings:** every clue with text, numbers or colours (thermometer, timetable, sign, slips, cards), the bloom photos, the notebook page and all the interface.

**Pipeline.**
1. Choose the models with the Runware tools and record their ids and licences (commercial use confirmed).
2. A **test batch first**: one reference portrait (Laila), one workshop scene and one behind-the-shutter picture, with the cost of each. I report the total and wait for your go-ahead.
3. Lock the characters. Because there is one picture each, no expression variations are needed.
4. Generate the rest with a style reference image on every scene and card.
5. Remove backgrounds on portraits, convert to WebP, and record everything in `assets.json` (file, prompt, negative prompt, model, seed, size, cost, running total). The whole art set stays under about 10 MB, with later chapters loading when needed.
6. **A small hotspot tool** (`tools/hotspots.html`): click on a locked scene, and it prints the percentages for the chapter data. This replaces guessing positions.
7. Image check for every asset: the face matches the locked reference and the canonical description, no text or logos, culturally accurate, no artefacts, and it reads at 64 to 96 px.

## 2. Audio
Short Foley sounds (roaster rattle, crank, pour, tray tap, page turn, shutter) and a warm low music loop. Sound starts only after the first tap, the mute button is always visible, and its state is saved. The present synthesised tones stay as a fallback.

## 3. Accessibility and reduced motion
A full pass against a checklist: keyboard use on every screen, focus order, screen reader names and live announcements, contrast on the brown ground in both languages, 44 px targets, text size and zoom to 200 percent, colour never the only signal, reduced motion removing every animation (typing effect, tray slide, shutter, hotspot pulses, hero fade), and a test for each.

## What I need from you
1. **Budget cap** for the full set including rerolls (the spec leaves it blank). I will ask again before any generation would pass it.
2. **Go-ahead for the test batch** (three pictures). I tell you the exact cost before and after.
3. **Audio source.** Do you have a sound pack and music you are licensed to use, or should I look for free commercial-use sounds and list their licences for your approval?
4. **Dadu as a sepia photo:** fine as written, or do you want him in a different style?
