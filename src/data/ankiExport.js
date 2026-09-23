// Exports the picked kanji themes as an Anki text file.
//
// Anki imports tab-separated text natively, and since 2.1.55 a file can
// configure its own import through `#` header lines - which is what lets a
// plain .txt land in the right decks with no manual field mapping. The
// alternative, a real .apkg, is a ZIP around a SQLite collection: it would
// carry the audio and a custom note type, but needs sql.js (~690KB of wasm
// + glue) shipped into a precached PWA. This file deliberately stays
// dependency-free; the deck-building below is the part an .apkg version
// would reuse.
//
// Everything targets the stock "Basic" note type, so there's nothing to
// install first. Basic only has two fields, so the back is built as one
// HTML block (inline styles - the note type's own CSS is left alone).
import { kanjiDictionary, primaryReadingKana, primaryReadingRomaji, kunyomiDisplay, onyomiDisplay } from './kanjiDictionary';
import { kanjiAudioUrl } from './kanjiVoice';

const DECK_ROOT = 'Kanji';

// Anki dedupes on the FIRST field, so the kanji character being the front
// means re-importing an updated file revises the existing notes instead of
// piling up duplicates - the dictionary has no repeated kanji (a kanji
// belongs to exactly one theme).
function frontHtml(entry) {
  return `<div style='font-size:3em'>${entry.kanji}</div>`;
}

function backHtml(entry) {
  const kun = entry.kunyomi && entry.kunyomi.length ? kunyomiDisplay(entry) : null;
  const on = entry.onyomi && entry.onyomi.length ? onyomiDisplay(entry) : null;
  // Same thing the card back does with its two corner badges: mark which of
  // the two readings is the one actually being taught.
  const mark = (label, value, active) =>
    active ? `<b>${label} ${value}</b>` : `<span style='opacity:0.55'>${label} ${value}</span>`;

  const parts = [
    `<div style='font-size:2em'>${primaryReadingKana(entry)}</div>`,
    `<div style='opacity:0.7;letter-spacing:0.05em'>${primaryReadingRomaji(entry)}</div>`,
    `<div style='font-style:italic;margin-top:8px'>${entry.meaning}</div>`
  ];

  const yomi = [];
  if (kun) yomi.push(mark("kun'yomi", kun, entry.readingType === 'kun'));
  if (on) yomi.push(mark("on'yomi", on, entry.readingType === 'on'));
  if (yomi.length) parts.push(`<div style='margin-top:12px;font-size:0.8em'>${yomi.join(' &nbsp;·&nbsp; ')}</div>`);

  return parts.join('');
}

// A tab or a newline inside a field would silently break the row apart, so
// they're squashed rather than trusted - nothing in the dictionary has any
// today, but an added entry easily could.
function cell(value) {
  return String(value).replace(/[\t\r\n]+/g, ' ');
}

export function selectedCardCount(selectedThemes) {
  return selectedThemes.reduce((n, theme) => n + kanjiDictionary[theme].kanji.length, 0);
}

export function buildAnkiDeck(selectedThemes) {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    // Deck and tags are taken from their own columns, so one file can fill
    // several subdecks at once (Kanji::Nature, Kanji::Seasons, ...). The
    // remaining columns map onto Basic's fields in order: Front, then Back.
    '#deck column:1',
    '#tags column:4'
  ];

  selectedThemes.forEach(theme => {
    const { label, kanji } = kanjiDictionary[theme];
    kanji.forEach(entry => {
      // The theme is repeated as a tag: the deck column needs Anki 2.1.55+,
      // while tags work everywhere, so the grouping survives either way.
      const tags = ['kanji', theme, entry.readingType === 'on' ? 'onyomi' : 'kunyomi'].join(' ');
      lines.push([
        cell(`${DECK_ROOT}::${label}`),
        cell(frontHtml(entry)),
        cell(backHtml(entry)),
        cell(tags)
      ].join('\t'));
    });
  });

  return lines.join('\n') + '\n';
}

export function ankiDeckFilename(selectedThemes) {
  if (selectedThemes.length === 1) return `kanji-${selectedThemes[0]}.txt`;
  return `kanji-deck-${selectedThemes.length}-themes.txt`;
}

// No BOM: it would be read as part of the first header line and stop Anki
// recognizing `#separator:tab`.
export function downloadAnkiDeck(selectedThemes) {
  if (!selectedThemes.length) return;

  const blob = new Blob([buildAnkiDeck(selectedThemes)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = ankiDeckFilename(selectedThemes);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Freed on the next tick rather than immediately - revoking synchronously
  // can cancel the download in some browsers before it has started reading.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/* --- .apkg export (same content, plus the audio) ------------------------ */

// Media names are namespaced: Anki's media folder is shared across the whole
// collection, so a bare "山.mp3" could collide with something the user
// already has.
function mediaName(entry) {
  return `kanaquiz-${entry.kanji}.mp3`;
}

// Styled to read like the app's card rather than Anki's default white slab,
// and it degrades fine in the mobile clients.
const CARD_CSS = `.card {
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 20px;
  text-align: center;
  color: #fff3e0;
  background: #251629;
}
.kq-kanji { font-size: 5em; line-height: 1.2; margin: 12px 0; }
.kq-reading { font-size: 2.2em; color: #ffb703; }
.kq-romaji { font-size: 1em; opacity: 0.7; letter-spacing: 0.05em; }
.kq-type { font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.55; margin-top: 6px; }
.kq-meaning { font-style: italic; margin-top: 14px; }
.kq-yomi { font-size: 0.78em; opacity: 0.6; margin-top: 16px; }
hr#answer { border: none; border-top: 1px solid rgba(255,183,3,0.3); margin: 18px 0; }`;

// Single source of truth: these names define the note type's fields AND the
// order noteFor() fills them in. Anki refuses a package whose notes don't
// match their note type, so the two must not be able to drift apart.
const FIELD_NAMES = ['Kanji', 'Reading', 'Romaji', 'Meaning', 'ReadingType', 'Kunyomi', 'Onyomi', 'Audio'];

const FRONT_TEMPLATE = '<div class="kq-kanji">{{Kanji}}</div>';

// {{#Field}}...{{/Field}} hides a section when the field is empty, which is
// how kanji with no everyday reading of one type (百 has no kun'yomi) simply
// drop that half instead of printing a placeholder. The separator sits
// inside BOTH conditions so it only shows when there are two halves to
// separate - otherwise 百's back opened with a stray "·".
const BACK_TEMPLATE = `{{FrontSide}}
<hr id=answer>
<div class="kq-reading">{{Reading}}</div>
<div class="kq-romaji">{{Romaji}}</div>
<div class="kq-type">{{ReadingType}}</div>
<div class="kq-meaning">{{Meaning}}</div>
<div class="kq-yomi">{{#Kunyomi}}kun'yomi {{Kunyomi}}{{/Kunyomi}}{{#Kunyomi}}{{#Onyomi}} &nbsp;·&nbsp; {{/Onyomi}}{{/Kunyomi}}{{#Onyomi}}on'yomi {{Onyomi}}{{/Onyomi}}</div>
{{Audio}}`;

function noteFor(entry, theme) {
  const hasAudio = !!kanjiAudioUrl(entry.kanji);
  return {
    // Stable across exports, so re-importing revises rather than duplicates.
    key: entry.kanji,
    fields: [
      entry.kanji,
      primaryReadingKana(entry),
      primaryReadingRomaji(entry),
      entry.meaning,
      entry.readingType === 'on' ? "on'yomi" : "kun'yomi",
      entry.kunyomi && entry.kunyomi.length ? kunyomiDisplay(entry) : '',
      entry.onyomi && entry.onyomi.length ? onyomiDisplay(entry) : '',
      hasAudio ? `[sound:${mediaName(entry)}]` : ''
    ],
    tags: ['kanji', theme, entry.readingType === 'on' ? 'onyomi' : 'kunyomi']
  };
}

export function ankiPackageFilename(selectedThemes) {
  if (selectedThemes.length === 1) return `kanji-${selectedThemes[0]}.apkg`;
  return `kanji-deck-${selectedThemes.length}-themes.apkg`;
}

// Builds and downloads the .apkg. `onProgress(done, total)` is called while
// the clips are being fetched - with a hundred-odd of them it's worth
// showing something rather than freezing the button.
export async function downloadAnkiPackage(selectedThemes, onProgress) {
  if (!selectedThemes.length) return;

  const entries = [];
  const decks = {};
  selectedThemes.forEach(theme => {
    const { label, kanji } = kanjiDictionary[theme];
    const deckName = `${DECK_ROOT}::${label}`;
    decks[deckName] = kanji.map(entry => {
      entries.push(entry);
      return noteFor(entry, theme);
    });
  });

  // The generator is only pulled in here: sql.js is ~690KB of wasm + glue,
  // so it stays out of the main bundle and out of the service worker's
  // install-time precache (see webpack.config.prod.js).
  const { buildApkg } = await import(/* webpackChunkName: "anki" */ './ankiPackage');

  const media = {};
  let done = 0;
  for (const entry of entries) {
    const url = kanjiAudioUrl(entry.kanji);
    if (url) {
      try {
        const response = await fetch(url);
        if (response.ok) media[mediaName(entry)] = await response.arrayBuffer();
      } catch (e) {
        // A clip that won't load shouldn't sink the whole export - the note
        // still gets made, just without its [sound:] playing.
      }
    }
    done++;
    if (onProgress) onProgress(done, entries.length);
  }

  const blob = await buildApkg({
    decks, media, css: CARD_CSS, front: FRONT_TEMPLATE, back: BACK_TEMPLATE,
    fieldNames: FIELD_NAMES
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = ankiPackageFilename(selectedThemes);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
