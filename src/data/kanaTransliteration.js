// General-purpose romaji -> hiragana conversion, built on top of the same
// kana/romaji pairs already used everywhere else in the app (kanaDictionary),
// rather than a separate hand-maintained table. Used by the Kanji exercise
// to turn what you type into hiragana live, the same "IME-lite" trick as
// numbers.js's parseCountingInput - see that file for the general approach
// (full greedy re-tokenize on every keystroke, longest match wins).
import { kanaDictionary } from './kanaDictionary';

// Flat romaji -> kana table, hiragana only (a kanji's reading is always
// written in hiragana, never katakana). Where two kana share a romaji
// (o: お/を, ji: じ/ぢ, zu: ず/づ) the first one encountered wins - those
// are rare in practice and this table only drives the *preview*, not
// correctness (see kanjiDictionary.js: matching is done by comparing
// parsed kana strings on both sides, not raw romaji).
const ROMAJI_TO_KANA = {};
Object.keys(kanaDictionary.hiragana).forEach(group => {
  const chars = kanaDictionary.hiragana[group].characters;
  Object.keys(chars).forEach(kana => {
    chars[kana].forEach(romaji => {
      if (!ROMAJI_TO_KANA[romaji]) ROMAJI_TO_KANA[romaji] = kana;
    });
  });
});

const ROMAJI_KEYS = Object.keys(ROMAJI_TO_KANA).sort((a, b) => b.length - a.length);
const CONSONANTS = new Set(['k', 's', 't', 'p', 'g', 'z', 'd', 'b', 'h', 'f', 'm', 'r', 'y', 'w', 'c', 'j']);

// Sokuon (small っ before a doubled consonant, e.g. "kekkon" -> けっこん).
// Geminating "ch" is spelled "tch" in Hepburn, not "cch" - that's the one
// irregular case, everything else is a literal doubled letter.
function sokuonLength(input, pos) {
  const c = input[pos];
  if (!CONSONANTS.has(c) || c === 'n') return 0;
  if (input[pos + 1] === c) return 1;
  if (c === 't' && input.slice(pos + 1, pos + 3) === 'ch') return 1;
  return 0;
}

// Live parse of whatever's been typed so far. Re-scans from the start on
// every call (cheap for these short strings) rather than kept as
// incremental state, so a longer match found later can override an
// earlier short one - see numbers.js for why that matters (e.g. "shi"
// resolving to "shichi" once the rest lands).
export function parseRomajiToKana(rawInput) {
  const input = rawInput.trim().toLowerCase();
  if (!input) return { kana: '', complete: false, leftover: '' };

  let kana = '';
  let pos = 0;

  while (pos < input.length) {
    if (input[pos] === "'") { pos += 1; continue; } // explicit ん disambiguator, e.g. "kin'yuu"

    const sokuon = sokuonLength(input, pos);
    if (sokuon) {
      kana += 'っ';
      pos += sokuon;
      continue;
    }

    const match = ROMAJI_KEYS.find(key => input.startsWith(key, pos));
    if (!match) break; // unrecognized from here on - stop, leave the rest as leftover
    kana += ROMAJI_TO_KANA[match];
    pos += match.length;
  }

  return {
    kana,
    complete: pos === input.length && kana.length > 0,
    leftover: input.slice(pos)
  };
}

// Hiragana and katakana occupy parallel Unicode blocks (U+3041-3096 and
// U+30A1-30F6) at a fixed +0x60 offset, so converting is just a codepoint
// shift - used to show a kanji's reading written both ways (see
// KanjiExercise's reading-script corner badges). Anything outside that
// range (ー, punctuation, ...) is left untouched.
export function hiraganaToKatakana(hiragana) {
  return hiragana.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
