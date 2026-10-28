# Bangla translation: plan and glossary (DRAFT, nothing built yet)

## How big is it
- Six chapters hold **1,443 text strings, about 7,700 words** (ch1 314, ch2 213, ch3 238, ch4 265, ch5 233, ch6 180 strings).
- Plus the game's own buttons and messages written inside the code (Hint, Close, Next, Locked, Play again, hints used, and so on). Roughly 60 strings.
- Plus **text drawn inside the clue pictures** (the sign, slips, notes, labels, cards). About 30 pictures. These need a Bangla version too.
- Chapters 7 and 8 will be translated when they are built.

## The rule for English words
1. **Technical words stay English, written in Bangla letters** (ফারমেন্ট, কঞ্চ). The list below is what I propose.
2. **Everyday words are real Bangla** (খোসা, চিনি, দুধ, পানি, গরম, ঠান্ডা), so a child can read it.
3. **Names:** লায়লা, রফিক ভাই, মিষ্টি, কবির, দাদু. The title is already দাদুর খাতা.
4. Each technical word is explained in the game the first time it appears, the same as in English.

## Proposed glossary (please check every line)
| English | Bangla letters | Note |
|---|---|---|
| cacao | কাকাও | the bean and the ingredient |
| cocoa butter | কোকো বাটার | |
| nibs | নিবস | crushed bean pieces |
| ferment, fermentation | ফারমেন্ট, ফারমেন্টেশন | |
| roast | রোস্ট | |
| winnow | উইনো | |
| grind | গ্রাইন্ড | the machine and the step |
| conche, conching | কঞ্চ, কঞ্চিং | your example |
| temper, tempering | টেম্পার, টেম্পারিং | |
| tempered chocolate | টেম্পার করা চকলেট | |
| seeding | সিডিং | |
| seize, seizing | সিজ, সিজিং | water makes chocolate stiff |
| bloom, fat bloom, sugar bloom | ব্লুম, ফ্যাট ব্লুম, সুগার ব্লুম | |
| crystals | ক্রিস্টাল | |
| mould | মোল্ড | |
| thermometer | থার্মোমিটার | |
| dark chocolate, milk chocolate | ডার্ক চকলেট, মিল্ক চকলেট | "Dark 65" becomes ডার্ক ৬৫ |
| bean-to-bar | বিন-টু-বার | |
| cut test | কাট টেস্ট | |
| shutter | শাটার | |
| Fajr | ফজর | |
| topping | টপিং | |
| gamchha | গামছা | already Bangla |

Everyday words I would translate, not transliterate: husk (খোসা), paste (পেস্ট is common, so I would keep পেস্ট), sugar (চিনি), milk (দুধ), water (পানি), gritty (দানাদার), sack (বস্তা), bean (বীজ in the farm sense, otherwise বিন).

## Decisions I need from you
1. **Glossary:** approve, or send changes. It affects hundreds of lines, so this is the most important check.
2. **Style of speech:** I propose standard Bangladeshi Bangla, simple and grade 6. Narration and hints say **তুমি**. Laila to Rafiq Bhai says **আপনি**, Rafiq Bhai to Laila says **তুমি**.
3. **Numbers:** Bengali digits (৬৫, ৪৫০০ গ্রাম) or Western digits (65, 4500)? I recommend **Bengali digits for display**, and the number boxes accept both when typing.
4. **Handwriting font for the clue pictures:** the English notes use a handwriting font that has no Bangla letters. I would use a Bangla handwriting-style Google font. I will show you one sample before using it everywhere.
5. **Who checks the Bangla?** I can write a full draft, but it needs a fluent reader (and your chocolatier for the technical lines) before release. I will mark every file "not reviewed" until you say it is.

## How it would be built (for the plan review)
- **Chapter text:** one extra file per chapter, `chapters/ch1.bn.json`, with the same shape as the English file but only the text fields. Ids, answers, numbers, art names and the clue facts are never in it, so a translation can't change how the game works. If a line is missing, the English shows.
- **Game buttons and messages:** moved into `i18n/en.json` and `i18n/bn.json`.
- **Clue pictures:** the text inside them comes from the same Bangla file.
- **Language switch:** a button in the header and on the chapter screen. It is remembered in the browser. The page language and font change with it.
- **Lint:** checks that the Bangla file has every line the English one has, that no number or id changed, that `{placeholders}` match, and that no em dashes slip in.
- **Tests:** the play tests would run in both languages, using the values from each file.

## Order of work
1. Glossary and the five decisions above (you).
2. Build the language system and translate **Chapter 1 only**, as a pilot. You (or a fluent reader) check tone and the glossary.
3. Translate Chapters 2 to 6.
4. Chapters 7 and 8 are translated when they are built.

Nothing is changed in the game until you approve this.
