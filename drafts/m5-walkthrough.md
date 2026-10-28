# M5 draft: Chapter 5 (Wedding Boxes) and Chapter 6 (Bloom)

Files: `ch5.draft.json`, `ch6.draft.json`. Nothing is wired into the game. All wording is new and needs your approval.

## Chapter 5: Wedding Boxes, how a player solves it
Story: Rafiq Bhai's niece is marrying on Friday. The family wants 5 kg of gift boxes, as dark as possible.
1. **Scale the recipe (new scale-recipe step).** The order slip says Dark 90, 5 kg, 50 g a bar. The player types three numbers: cacao 4500 g (90 percent of 5000), sugar 500 g (what is left) and 100 bars (5000 / 50). Each field has its own too-high, too-low and close message.
2. **Conche (time slider).** The player might expect five times the hours. Dadu's note says "Big pot or small, the stone turns all night." So it is the same night as Chapter 1: 11 hours (sign at 6 pm, timetable at 5 am, both on the Memory shelf if missed).
3. **The sample tray (new pattern-fill step).** A 4 by 5 tray of squares. The customer's sketch (a Workshop clue) shows ten plain, five toasted dry coconut and five puffed rice. The player taps a topping, then a square, or drags. There is also a fresh coconut in the toppings palette. Using it gets the message that its water would seize the chocolate, with a callback to Chapter 3's seizing note. The check button says how many squares are wrong, or that some are empty.
4. **Mould (tap meter).** Six taps.
Ending: a hundred bars; real-life line about weights and conching time.

## Chapter 6: Bloom, how a player solves it
Story: three bars come back with white streaks.
1. **Diagnose (new diagnose step).** Three drawn bars, A, B and C. Tapping a bar runs its touch test (smears under a warm finger, vanishes under water, dull and soft and stuck). The player chooses a cause for each: fat bloom, sugar bloom or never tempered. Dadu's bloom card (a Workshop clue) matches each test to its cause. The bloom pictures are drawn, not AI, so they stay fair clues.
2. **Fix by seeding (multi-temp with a percent row).** Melt 45, seed 25 percent (about a quarter), cool to 31, all from Dadu's seeding note.
3. **Mould (tap meter).** Six taps.
Ending: a short storage tip from Laila. Real-life line: bloom is harmless to eat.

## Things for you to decide
- **Wedding bar is Dark 90**, as we discussed: 4500 g cacao, 500 g sugar per 5 kg, 100 bars of 50 g. This needs your chocolatier's OK. At 100 g of sugar per kilo it is very bitter, so the toppings help.
- **Conche stays 11 hours** (the spec's rule). I added an honest real-life line saying that in real life bigger batches often need longer; the same-night rule is Dadu's own.
- **Fresh coconut** is the decoy that ties back to Chapter 3. The spec says fresh coconut is rejected; the toppings shelf clue only hints at it, and the rejection text names the seizing note.
- **Chapter 6 has three steps** (diagnose, fix, mould), not four. The spec lists only the diagnosis and the fix, so I added the mould step for a consistent ending. Tell me if you want a fourth.
- **The "seed" percent row** is new in the multi-temp step. "About a quarter" is 25 percent with a plus or minus 1 tolerance; your chocolatier may want a wider range.
- **Wording, hotspots and art.** Every line is new. Hotspots are placeholders. New drawings are needed: wedding order, big-pot note, tray sketch, toppings shelf, boxes, bloom card, seeding note, fridge, returned bars, return log, and three bloom photos (grey streak, dry white film, dull soft bar).
- **Sponsor photos.** The Chapter 5 ending is the natural place for the sponsor's 90 percent dark bar photo; I'll wire it in when we do the sponsor pass.
- **Chocolatier check.** The bloom tests and causes, the seeding numbers, and the 90 percent recipe all need their sign-off.

## Engine work once approved
- **scale-recipe renderer** (number fields, per-field high, low and close feedback) and lint support (derive object, near ranges).
- **pattern-fill renderer** (topping palette, 4 by 5 grid, tap, drag and keyboard, a rejected decoy topping, wrong-square count).
- **diagnose renderer** (three drawn bars with touch tests, cause choice per bar, check) and lint support (derive object).
- **multi-temp rows** with their own unit, range and start value.
- Both chapters wired in, new clue and card art, the three bloom drawings, scenes, tests and screenshots at four sizes, and the advisor checks.
