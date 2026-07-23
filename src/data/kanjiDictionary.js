// Kanji flashcard content, grouped by theme (selected as a whole theme at
// a time, see KanjiExercise's picker). `readings` accepts more than one
// romaji spelling per kanji (e.g. multiple valid readings, or a
// alternate spelling of the same reading) - all count as correct.
//
// `kanaOverride` is an optional literal kana string shown on the card
// back instead of the auto-derived hiragana form - used for 天 (ten),
// whose onyomi reading is conventionally written in katakana (dictionary
// convention: onyomi in katakana, kunyomi in hiragana). It only affects
// what's displayed - typing still goes through the same hiragana-only
// live preview/checking as everything else.
//
// `readingType` classifies readings[0] (the primary/displayed reading) as
// 'kun' (kun'yomi, the native Japanese reading) or 'on' (on'yomi, the
// Chinese-derived reading) - shown on the card back as two corner badges
// with whichever applies circled.
//
// `kunyomi`/`onyomi` are the kanji's ACTUAL readings of each type (not
// derived from readings[0] - kun'yomi and on'yomi are usually completely
// different words, e.g. 土 is kun "tsuchi" but on "do"/"to", not just the
// same sound written differently). Either can hold more than one romaji
// (e.g. 木 is ボク AND モク) or be omitted entirely where the kanji has no
// common reading of that type (百 has no everyday kun'yomi). For the
// 2-kanji color compounds, these describe the LEAD kanji specifically
// (黄色's 黄, 茶色's 茶, etc.) - 色 itself is always kun'yomi "iro" and
// isn't what's being taught by that half of the card.
import { parseRomajiToKana, hiraganaToKatakana } from './kanaTransliteration';

export const kanjiDictionary = {
  people: {
    label: 'People',
    kanji: [
      { kanji: '人', readings: ['hito'], meaning: 'person', readingType: 'kun', kunyomi: ['hito'], onyomi: ['jin', 'nin'] },
      { kanji: '男', readings: ['otoko'], meaning: 'man', readingType: 'kun', kunyomi: ['otoko'], onyomi: ['dan', 'nan'] },
      { kanji: '女', readings: ['onna'], meaning: 'woman', readingType: 'kun', kunyomi: ['onna'], onyomi: ['jo'] },
      { kanji: '子', readings: ['ko'], meaning: 'child', readingType: 'kun', kunyomi: ['ko'], onyomi: ['shi'] },
      { kanji: '私', readings: ['watashi'], meaning: 'I, myself', readingType: 'kun', kunyomi: ['watashi'], onyomi: ['shi'] }
    ]
  },
  sky: {
    label: 'Sky & Spirit',
    kanji: [
      { kanji: '日', readings: ['hi'], meaning: 'sun', readingType: 'kun', kunyomi: ['hi'], onyomi: ['nichi', 'jitsu'] },
      { kanji: '月', readings: ['tsuki'], meaning: 'moon', readingType: 'kun', kunyomi: ['tsuki'], onyomi: ['getsu', 'gatsu'] },
      { kanji: '空', readings: ['sora'], meaning: 'sky', readingType: 'kun', kunyomi: ['sora'], onyomi: ['kuu'] },
      { kanji: '天', readings: ['ten'], meaning: 'the heavens (spiritual sky)', kanaOverride: 'テン', readingType: 'on', kunyomi: ['ame'], onyomi: ['ten'] },
      { kanji: '光', readings: ['hikari'], meaning: 'light', readingType: 'kun', kunyomi: ['hikari'], onyomi: ['kou'] },
      { kanji: '神', readings: ['kami'], meaning: 'god', readingType: 'kun', kunyomi: ['kami'], onyomi: ['shin', 'jin'] }
    ]
  },
  elements: {
    label: 'Elements',
    kanji: [
      { kanji: '火', readings: ['hi'], meaning: 'fire', readingType: 'kun', kunyomi: ['hi'], onyomi: ['ka'] },
      { kanji: '水', readings: ['mizu'], meaning: 'water', readingType: 'kun', kunyomi: ['mizu'], onyomi: ['sui'] },
      { kanji: '木', readings: ['ki'], meaning: 'tree', readingType: 'kun', kunyomi: ['ki'], onyomi: ['boku', 'moku'] },
      { kanji: '金', readings: ['kane', 'kin'], meaning: 'metal, gold', readingType: 'kun', kunyomi: ['kane'], onyomi: ['kin'] },
      { kanji: '土', readings: ['tsuchi'], meaning: 'earth, dirt', readingType: 'kun', kunyomi: ['tsuchi'], onyomi: ['do', 'to'] }
    ]
  },
  nature: {
    label: 'Nature',
    kanji: [
      { kanji: '風', readings: ['kaze'], meaning: 'wind', readingType: 'kun', kunyomi: ['kaze'], onyomi: ['fuu'] },
      { kanji: '雨', readings: ['ame'], meaning: 'rain', readingType: 'kun', kunyomi: ['ame'], onyomi: ['u'] },
      { kanji: '雪', readings: ['yuki'], meaning: 'snow', readingType: 'kun', kunyomi: ['yuki'], onyomi: ['setsu'] },
      { kanji: '山', readings: ['yama'], meaning: 'mountain', readingType: 'kun', kunyomi: ['yama'], onyomi: ['san'] },
      { kanji: '川', readings: ['kawa'], meaning: 'river', readingType: 'kun', kunyomi: ['kawa'], onyomi: ['sen'] },
      { kanji: '田', readings: ['ta'], meaning: 'rice field', readingType: 'kun', kunyomi: ['ta'], onyomi: ['den'] },
      { kanji: '島', readings: ['shima'], meaning: 'island', readingType: 'kun', kunyomi: ['shima'], onyomi: ['tou'] },
      { kanji: '花', readings: ['hana'], meaning: 'flower', readingType: 'kun', kunyomi: ['hana'], onyomi: ['ka'] },
      { kanji: '石', readings: ['ishi'], meaning: 'rock', readingType: 'kun', kunyomi: ['ishi'], onyomi: ['seki'] }
    ]
  },
  culture: {
    label: 'Culture',
    kanji: [
      { kanji: '刀', readings: ['katana'], meaning: 'sword', readingType: 'kun', kunyomi: ['katana'], onyomi: ['tou'] }
    ]
  },
  numbers: {
    label: 'Numbers',
    kanji: [
      { kanji: '一', readings: ['ichi'], meaning: 'one', readingType: 'on', kunyomi: ['hitotsu'], onyomi: ['ichi'] },
      { kanji: '二', readings: ['ni'], meaning: 'two', readingType: 'on', kunyomi: ['futatsu'], onyomi: ['ni'] },
      { kanji: '三', readings: ['san'], meaning: 'three', readingType: 'on', kunyomi: ['mittsu'], onyomi: ['san'] },
      { kanji: '四', readings: ['yon', 'shi'], meaning: 'four', readingType: 'kun', kunyomi: ['yon'], onyomi: ['shi'] },
      { kanji: '五', readings: ['go'], meaning: 'five', readingType: 'on', kunyomi: ['itsutsu'], onyomi: ['go'] },
      { kanji: '六', readings: ['roku'], meaning: 'six', readingType: 'on', kunyomi: ['muttsu'], onyomi: ['roku'] },
      { kanji: '七', readings: ['nana', 'shichi'], meaning: 'seven', readingType: 'kun', kunyomi: ['nana'], onyomi: ['shichi'] },
      { kanji: '八', readings: ['hachi'], meaning: 'eight', readingType: 'on', kunyomi: ['yattsu'], onyomi: ['hachi'] },
      { kanji: '九', readings: ['kyuu', 'ku'], meaning: 'nine', readingType: 'on', kunyomi: ['kokonotsu'], onyomi: ['kyuu', 'ku'] },
      { kanji: '十', readings: ['juu'], meaning: 'ten', readingType: 'on', kunyomi: ['too'], onyomi: ['juu'] },
      { kanji: '百', readings: ['hyaku'], meaning: 'hundred', readingType: 'on', onyomi: ['hyaku'] },
      { kanji: '千', readings: ['sen'], meaning: 'thousand', readingType: 'on', kunyomi: ['chi'], onyomi: ['sen'] },
      { kanji: '万', readings: ['man'], meaning: 'ten thousand', readingType: 'on', kunyomi: ['yorozu'], onyomi: ['man', 'ban'] }
    ]
  },
  colors: {
    label: 'Colors',
    kanji: [
      { kanji: '色', readings: ['iro'], meaning: 'color', readingType: 'kun', kunyomi: ['iro'], onyomi: ['shoku', 'shiki'] },
      { kanji: '赤', readings: ['aka'], meaning: 'red', readingType: 'kun', kunyomi: ['aka'], onyomi: ['seki'] },
      { kanji: '青', readings: ['ao'], meaning: 'blue', readingType: 'kun', kunyomi: ['ao'], onyomi: ['sei'] },
      { kanji: '黄色', readings: ['kiiro'], meaning: 'yellow', readingType: 'kun', kunyomi: ['ki'], onyomi: ['kou', 'ou'] },
      { kanji: '紫', readings: ['murasaki'], meaning: 'purple', readingType: 'kun', kunyomi: ['murasaki'], onyomi: ['shi'] },
      { kanji: '緑', readings: ['midori'], meaning: 'green', readingType: 'kun', kunyomi: ['midori'], onyomi: ['ryoku'] },
      { kanji: '白', readings: ['shiro'], meaning: 'white', readingType: 'kun', kunyomi: ['shiro'], onyomi: ['haku'] },
      { kanji: '黒', readings: ['kuro'], meaning: 'black', readingType: 'kun', kunyomi: ['kuro'], onyomi: ['koku'] },
      { kanji: '灰色', readings: ['haiiro'], meaning: 'grey', readingType: 'kun', kunyomi: ['hai'], onyomi: ['kai'] },
      // 茶's own reading here ("cha") is on'yomi, even though 色 ("iro") is
      // kun'yomi - see the readingType note up top for how mixed compounds
      // like this one are classified. 茶 has no everyday kun'yomi.
      { kanji: '茶色', readings: ['chairo'], meaning: 'brown', readingType: 'on', onyomi: ['cha', 'sa'] },
      { kanji: '水色', readings: ['mizuiro'], meaning: 'light blue', readingType: 'kun', kunyomi: ['mizu'], onyomi: ['sui'] },
      // "kin'iro" is the properly disambiguated spelling (without the
      // apostrophe, the greedy tokenizer reads ...n+i... as the mora に
      // (ni) instead of ん (n) followed by い (i) - see
      // kanaTransliteration.js). readings[0] stays "kin'iro" so the
      // display/badges show the correct きんいろ, but plain "kiniro" is
      // also accepted: isReadingCorrect compares both sides' PARSED kana,
      // so registering the literal string "kiniro" here just means it
      // matches whatever a typed "kiniro" also (consistently) parses to.
      // 金 here reads "kin" (on'yomi), unlike its kun'yomi "kane" in the
      // elements theme - see readingType note up top.
      { kanji: '金色', readings: ["kin'iro", "kiniro"], meaning: 'golden (color)', readingType: 'on', kunyomi: ['kane'], onyomi: ['kin'] }
    ]
  }
};

// Correct if the typed romaji resolves to the same KANA as any of the
// kanji's registered readings - comparing kana (not raw romaji strings)
// means an equivalent alternate spelling of the same reading also counts,
// the same principle numbers.js uses for the counting exercise.
export function isReadingCorrect(entry, typedInput) {
  const typed = parseRomajiToKana(typedInput);
  if (!typed.complete) return false;
  return entry.readings.some(r => parseRomajiToKana(r).kana === typed.kana);
}

// Canonical kana form shown on the back of the card / in the results.
export function primaryReadingKana(entry) {
  if (entry.kanaOverride) return entry.kanaOverride;
  return parseRomajiToKana(entry.readings[0]).kana;
}

// Corner-badge displays: kun'yomi in hiragana, on'yomi in katakana (the
// same dictionary convention kanaOverride follows), multiple readings of
// the same type joined with "・". "n/a" (deliberately Latin, not a dash -
// a bare "—" in a small badge reads too easily as the kanji 一) when the
// kanji has no common reading of that type (e.g. 百 has no everyday
// kun'yomi).
const NO_READING = 'n/a';

export function kunyomiDisplay(entry) {
  if (!entry.kunyomi || !entry.kunyomi.length) return NO_READING;
  return entry.kunyomi.map(r => parseRomajiToKana(r).kana).join('・');
}

export function onyomiDisplay(entry) {
  if (!entry.onyomi || !entry.onyomi.length) return NO_READING;
  return entry.onyomi.map(r => hiraganaToKatakana(parseRomajiToKana(r).kana)).join('・');
}
