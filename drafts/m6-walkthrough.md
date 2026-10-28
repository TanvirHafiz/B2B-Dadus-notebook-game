# M6 draft: Chapter 7 (Tasting Night) and Chapter 8 (Opening Day)

Files: `ch7.draft.json`, `ch8.draft.json`. Nothing is wired into the game. All wording is new and needs your approval. The new step types (match-notes, free-build) and the naming and wrapper screen come from the spec.

## Chapter 7: Tasting Night, how a player solves it
Story: Rafiq Bhai brings back Dadu's monthly tasting night. Three regulars come, and each asks for a taste, not a recipe. Three new characters: **Nazma Apa** (retired teacher), **Jamal Chacha** (runs a rickshaw garage), **Shumi** (university student).
Dadu left **three tasting cards**, one for each thing he could change. No single card answers an order, so every order combines two different cards.
- **Roast card:** light is fruity with a little sour, medium is like toasted bread, dark is smoky and bitter.
- **Conche card:** 3 hours is sharp and sour, 6 hours fades the sour and stays lively, 11 hours is smooth and mellow.
- **Cacao card:** 55 percent is mild and sweet, 70 is balanced, 90 is bitter and strong.

Three **match-notes** steps, one for each regular. The player picks a roast, a conche length and a cacao strength, then makes the sample.
1. **Nazma Apa:** "fruity, but not sour, and not the all-night kind." That is **light roast + 6 hours**. Cacao is free.
2. **Jamal Chacha:** "bitter, but smooth." That is **90 percent + 11 hours**. Roast is free.
3. **Shumi:** "mild and sweet, but toasted." That is **55 percent + medium roast**. Conche is free.
A wrong setting says what the sample would taste like, and what the regular asked for. The setting the regular does not care about is marked as free, so no guessing is needed. Then a mould step (six taps).
Ending: a short quiet beat, Laila realising she tasted the roast before she made it. Real-life line: roast, conching time and cacao work together to shape flavour.

## Chapter 8: Opening Day, how a player solves it
Story: the shutters go up for good. Three orders wait in the order book. Each order is a set of rules built from earlier chapters. The player builds the bar with six rows (bar, cacao, milk powder, conche, tempering tape, where to keep it) plus a topping row. **Any build that meets every rule is accepted.** Hint level 2 shows one build that works.
1. **Rafiq Bhai, a bar for a child, no fridge in the shop.** Milk, 40 cacao (Eid page), a quarter milk powder (milk tin), 6 hours (half of 11, rounded up), the milk tag for tempering, the cool shelf (Chapter 3). Topping is free.
2. **Nazma Apa, the darkest bar, for a nephew who hates sugar, in a shop that gets hot.** Dark, 90 cacao or more (wedding slip), no milk powder, 11 hours, the green tape, the cool shelf. Topping is free.
3. **Mishti's school fair, like the first bar, no milk, something crunchy.** Dark, 65 cacao (Chapter 1 slip), no milk powder, 11 hours, the green tape, and a dry topping: puffed rice, toasted dry coconut or a sprinkle of chopped nuts. Fresh coconut is rejected (water seizes chocolate, Chapter 3). Shelf is free.
Each failed rule has its own line, for example "Milk gets half the dark bar's night, rounded up. That is not it." Memory shelf clues pre-fill as usual, so the chapter is always solvable.
4. **Naming and wrapper (new screen, not scored).** The player types a name for the shop's own bar (up to 24 characters) and picks one of three wrappers. The name appears as live text on the wrapper, and a preview shows the result. There is no wrong answer. The name is saved and shown on the ending card.
5. **Lift the shutter (eight taps).** Then the ending: Laila runs the shop, Kobir arrives with the best sack, and the last blank line of the notebook is hers.

## Things for you to decide
- **Cacao in Chapter 8.** The builder offers 40, 55, 65 and 90. The Chapter 8 rules only use 40, 65 and 90. Tell me if you want other values.
- **Bar name safety.** The name is free text. It stays on the player's own device and is never sent anywhere. I plan no word filter. Tell me if you want one.
- **New art.** Three new portraits (Nazma Apa, Jamal Chacha, Shumi), two scenes, the clue and card drawings (tasting cards, guest book, photos, order book, recipe cards, shelves, shutter handle), and the endings. Everything is a placeholder until the art pass.
- **Bangla.** I will translate Chapters 7 and 8 the same way once they are built.

## Engine work once approved
- **match-notes renderer.** Three rows of options, free rows, per-option taste feedback. Lint: derive object per setting, free rows must be null, hint 2 names every setting that matters.
- **free-build renderer.** Option rows, a rule check with one line per failed rule, an example answer for hint 2. Lint: every rule has a clue, a derive from that clue's facts, an example that meets every rule, and no rule can be met by none of the options.
- **name-wrapper screen.** Name box, three wrappers, live preview. The name is saved with the progress data and shown on the ending.
- Both chapters wired in, new art, scenes and cards, Bangla for both, tests in both languages, screenshots at four sizes, and the advisor checks.

## Decisions (answered)
- Tasting card values and the 90 percent and no-fridge advice: approved.
- Toppings: chopped nuts replace the jaggery, sprinkled on after moulding, never mixed in.
- Wrappers: the sponsor's real pack look (dark, milk and black packs with the round badge). The bar name is live text on the pack panel.
- Bar name words: no filter unless you ask for one.
