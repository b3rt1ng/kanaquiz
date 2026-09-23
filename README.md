# Antoine's japanese learning app

This is my fork of kanapro, it has a more "game like" UI, makes the exercices more helpful by allowing you to redo your mistage, get statistics about your mistakes and has more exercies types

## Exercises

- **Stage 1-4**: the core progression: pick the reading from a kana, pick
  the kana from a reading, type the reading, then type multi-character
  words (3/5/8 characters depending on difficulty). Stage 4 unlocks after
  completing 1-3, or can be played directly at a chosen difficulty.
- **Table**: every selected kana laid out in a grid, fill in the reading
  for each cell at your own pace.
- **Listening**: hear a character read aloud, pick the matching reading
  from three options.
- **Counting**: type the Japanese reading of a random number, with a live
  kanji preview and tolerance for non-contracted ("regular") spellings.
  The opening screen is a ruler with two handles: drag them, or type the
  bounds straight into the two fields, to pick any window inside
  1 - 99,999,999, so 万 is in or out as you like. The choice is
  remembered. The ruler is graduated by decade and runs on a log scale,
  which is what keeps the low end usable - 10,000, where 万 starts, sits
  at the middle of the track and is marked. A session cycles through
  every digit width the window spans; a flat draw over a wide range
  would be eight digits almost every time.
- **Kanji**: flip-card drills for kanji vocabulary, grouped by theme
  (people, elements, nature, numbers, colors, ...). Each card shows the
  reading in both hiragana and katakana on the back, with whichever one is
  actually used (kun'yomi vs on'yomi) circled.

## Export to Anki

The kanji theme picker has a small floating **Export** button - top right
on a wide screen, bottom right on a phone. Tick the themes you want and it
builds a real `.apkg` in the browser - no server, no account. It opens straight in Anki with one subdeck per theme
(`Kanji::Nature`, `Kanji::Seasons`, ...), a tag per theme and per reading
type, and **the pronunciation clips embedded**, so the audio plays on the
back of the card exactly like in the app.

Cards use their own note type ("Kanaquiz Kanji") with separate fields for
the kanji, the reading in kana, the romaji, the meaning, which reading
type is being taught, both kun'yomi/on'yomi, and the audio - so they stay
searchable and re-stylable in Anki. The whole deck is 109 cards for about
450KB.

Re-exporting is safe: notes are keyed on the kanji, so importing again
revises what is already there instead of piling up duplicates.

The `.apkg` generator (SQLite via sql.js, plus JSZip) is pulled in only
when the button is pressed and is deliberately left out of the service
worker's precache, so it costs nothing to everyone who never exports. The
flip side is that the first export needs to be online; if it fails, the
button offers a **plain text** fallback that works offline and on
pre-2.1.55 Anki, at the cost of the audio.

Going the other way - importing an existing Anki deck into the app - is
not implemented yet; the button is named for its direction so an `Import`
counterpart can sit beside it.

## Grind them

Every exercise's results screen tracks what you got wrong. Hit **Grind
them** to jump straight into a focused round built only from those missed
characters/words - each one has to be answered correctly *twice* before
it's considered done, not just once.

