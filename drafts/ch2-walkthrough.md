# Chapter 2: Eid Milk, how a player solves it (DRAFT)

Laila learns that the children want a sweeter bar. Rafiq Bhai's Eid order slip says "sweet but still chocolatey".

1. **Taste test (new compare-two step).** The player tastes Bar A (30 cacao, thin and very sweet) and Bar B (40 cacao, sweet but cocoa still clear) and picks the one that fits the slip. The slip is a Workshop clue, so the player reads the brief, then judges. The kept bar's cacao share (40) feeds the next step.
2. **The mix (ratio slider, now 3 parts).** Cacao 40 comes from the bar they kept. The milk powder tin's label says a quarter is milk (25). Sugar is whatever is left (35). Each wrong direction gets its own line (too bitter, too thin, too milky, not creamy).
3. **Conche (time slider).** Dadu's note says half the night, round up. The dark bar's night was 11 hours (shutters at 6 pm to the azaan at 5 am, from Chapter 1). Half of 11 is 5.5, rounded up is 6. If the player never found the Chapter 1 sign or timetable, the Memory shelf shows them pre-filled with "from Dadu's earlier pages".
4. **Temper (multi-temp).** Red 45 and blue 27 from the Chapter 1 thermometer, and the little milk tag 29 that Chapter 1 set up. Pre-filled on the shelf if missing.
5. **Mould (tap meter).** Tap the tray six times.

Reveal: Rafiq, Mishti and Laila react, then the rebuilt recipe and a real-life line about milk scorching.

## Things I need you to decide
- **Sugar and milk clue (mine, not in the spec).** The spec gives only the 40/35/25 answer and three clues (note, slip, taste test), so there is no clue for the 25. I added the milk powder tin with "a quarter of every milk bar". Sugar then works out as 100 - 40 - 25. Is that acceptable, or do you want a different clue?
- **Numbers.** All values are the spec's and wait for the chocolatier: 40/35/25, 6 hours, 45/27/29.
- **Wording.** Every line in the JSON is new wording for you to approve, including the intro dialogue, feedback and hints.
- **Flavour clues.** The Eid lantern and tea tin are story objects with no puzzle role, like Chapter 1's apron and radio. Remove them or keep them.
- **Hotspots and art.** Positions are placeholders. A Chapter 2 workshop scene and the new clue art (Eid slip, milk note, milk tin, lantern, tea tin) must be drawn, and the milk bar art can use the sponsor's milk product photo.
- **Engine work this needs.** A compare-two renderer, a 3-part ratio slider, `step:` sources in the lint, and per-direction feedback for the mix.
