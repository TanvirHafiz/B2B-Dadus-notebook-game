# M4 draft: Chapter 3 (Monsoon Leak) and Chapter 4 (Bean Delivery)

Files: `ch3.draft.json`, `ch4.draft.json`. Nothing is wired into the game. All wording is new and needs your approval.

## Chapter 3: Monsoon Leak, how a player solves it
Story: the roof leaks overnight. Rafiq Bhai warns Laila to move supplies out of the wet, and the batch on the bench has seized.
1. **Sort the supplies (new sort-bins step).** Six supplies, three bins: dry shelf, cool shelf, sealed jar. The rule for each shelf is on a label in the Workshop ("soaks up water", "melts", "takes on smells"). Each supply says what it does when tapped. Sugar and milk powder go dry, bars and cocoa butter go cool, roasted nibs and cardamom go in the jar. Tap to pick and tap to place, or drag, or keyboard.
2. **What to do with the seized batch (pick one of four).** Dadu's seizing note says it can never be a bar again, so make a drink. Cold water, re-tempering and moulding each get their own explanation.
3. **How much hot milk (pick one of three).** Dadu's drinking-chocolate note says about as much milk as chocolate. A splash is still gritty, a whole pot is thin and watery.
4. **Whisk (tap meter).** Ten taps.
Ending: the neighbours get hot chocolate in the rain. Real-life line: a few drops of water can seize chocolate, and a lot of liquid turns it into a sauce.

## Chapter 4: Bean Delivery, how a player solves it
Story: Kobir the farmer brings the sack he used to bring Dadu.
1. **How beans are made (order step, reused).** Kobir's note gives the farm order: cut the pods, ferment in heaps, dry in the sun, bag. The notebook has four blanks.
2. **The cut test (new spot-defect step).** Twelve cut beans slide slowly across a tray. The player taps the bad ones: purple, grey and hard, mouldy, flat. Dadu's cut-test card shows what a good bean is (brown with open cracks). Tapping a bad bean takes it out. Tapping a good bean only gives a friendly note and never a penalty. Missed bad beans come round again. With reduced motion on, the beans sit in a static grid.
3. **Smell sack pair 1.** Mild vinegar and fruit (good) against smoky (dried over a fire).
4. **Smell sack pair 2.** Ammonia (a sharp sting, over-fermented) against mild vinegar and fruit.
Ending: Kobir agrees to bring his best sack first every year. Real-life line: flavour is set on the farm, by fermenting and drying.

## Things for you to decide
- **Chapter 3 supplies.** The spec says to sort supplies into dry, cool and sealed jar but does not list them. I chose six: sugar, milk powder, finished bars, cocoa butter, roasted nibs, cardamom. Please check that each is right for the chocolatier.
- **Seized batch steps.** The spec gives only the idea (hot milk makes a drink). I invented two pick steps (what to do, how much milk) and a whisk step so the chapter has four steps. "About as much milk as chocolate" is a qualitative amount for the chocolatier to confirm.
- **Chapter 3 characters.** Rafiq Bhai and Mishti only, no new portraits.
- **Chapter 4 steps.** The spec lists the cut test and the two smell tests. I added the farm-order step so the chapter has four steps and covers the "fermenting and drying" lesson. Cut it if you would rather keep three.
- **Smell pairs.** The spec says "smell two sacks". I used two pairs so both bad smells (smoke and ammonia) appear, each against a good sack.
- **Kobir.** Needs a drawn portrait (placeholder SVG now, AI art later): fifties, lungi and vest, gamchha over the shoulder, sun-lined face. Plus a short Bengali greeting ("Assalamu alaikum") in his first line; tell me if you want it glossed.
- **Hotspots and art.** Positions are placeholders until the scenes exist. New clue drawings are needed: shelf labels, seizing note, milk note, bucket, farm note, cut-test card, smell card, scale, gamchha, and bars for the endings.
- **Chocolatier check.** The cut test, smoke versus ammonia, and the seizing facts should all be checked by your chocolatier before release.

## Engine work once approved
- **sort-bins renderer** with tap-to-place, drag and keyboard paths, per-item feedback and lint support (`binWith`).
- **spot-defect renderer** with a slow moving tray that stops on touch, a static grid under reduced motion, missed items returning, and a gentle note for good beans. Lint support (`defectsOf`) and a deterministic scripted solve for the test.
- **Both chapters** wired in, new clue art and card art, Kobir portrait, scenes, tests and screenshots at four sizes, and the advisor checks.
