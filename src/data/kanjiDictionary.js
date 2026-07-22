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
// with whichever applies circled. A few entries are genuinely mixed
// (e.g. 茶色 chairo = on'yomi 茶 "cha" + kun'yomi 色 "iro", 金 accepts both
// kun'yomi "kane" and on'yomi "kin" as separate readings) - for those,
// readingType reflects readings[0] specifically, same as primaryReadingKana
// below, rather than adding a third "mixed" category.
import { parseRomajiToKana } from './kanaTransliteration';

export const kanjiDictionary = {
  people: {
    label: 'People',
    kanji: [
      { kanji: '人', readings: ['hito'], meaning: 'person', readingType: 'kun' },
      { kanji: '男', readings: ['otoko'], meaning: 'man', readingType: 'kun' },
      { kanji: '女', readings: ['onna'], meaning: 'woman', readingType: 'kun' },
      { kanji: '子', readings: ['ko'], meaning: 'child', readingType: 'kun' },
      { kanji: '私', readings: ['watashi'], meaning: 'I, myself', readingType: 'kun' }
    ]
  },
  sky: {
    label: 'Sky & Spirit',
    kanji: [
      { kanji: '日', readings: ['hi'], meaning: 'sun', readingType: 'kun' },
      { kanji: '月', readings: ['tsuki'], meaning: 'moon', readingType: 'kun' },
      { kanji: '空', readings: ['sora'], meaning: 'sky', readingType: 'kun' },
      { kanji: '天', readings: ['ten'], meaning: 'the heavens (spiritual sky)', kanaOverride: 'テン', readingType: 'on' },
      { kanji: '光', readings: ['hikari'], meaning: 'light', readingType: 'kun' },
      { kanji: '神', readings: ['kami'], meaning: 'god', readingType: 'kun' }
    ]
  },
  elements: {
    label: 'Elements',
    kanji: [
      { kanji: '火', readings: ['hi'], meaning: 'fire', readingType: 'kun' },
      { kanji: '水', readings: ['mizu'], meaning: 'water', readingType: 'kun' },
      { kanji: '木', readings: ['ki'], meaning: 'tree', readingType: 'kun' },
      { kanji: '金', readings: ['kane', 'kin'], meaning: 'metal, gold', readingType: 'kun' },
      { kanji: '土', readings: ['tsuchi'], meaning: 'earth, dirt', readingType: 'kun' }
    ]
  },
  nature: {
    label: 'Nature',
    kanji: [
      { kanji: '風', readings: ['kaze'], meaning: 'wind', readingType: 'kun' },
      { kanji: '雨', readings: ['ame'], meaning: 'rain', readingType: 'kun' },
      { kanji: '雪', readings: ['yuki'], meaning: 'snow', readingType: 'kun' },
      { kanji: '山', readings: ['yama'], meaning: 'mountain', readingType: 'kun' },
      { kanji: '川', readings: ['kawa'], meaning: 'river', readingType: 'kun' },
      { kanji: '田', readings: ['ta'], meaning: 'rice field', readingType: 'kun' },
      { kanji: '島', readings: ['shima'], meaning: 'island', readingType: 'kun' },
      { kanji: '花', readings: ['hana'], meaning: 'flower', readingType: 'kun' },
      { kanji: '石', readings: ['ishi'], meaning: 'rock', readingType: 'kun' }
    ]
  },
  culture: {
    label: 'Culture',
    kanji: [
      { kanji: '刀', readings: ['katana'], meaning: 'sword', readingType: 'kun' }
    ]
  },
  numbers: {
    label: 'Numbers',
    kanji: [
      { kanji: '一', readings: ['ichi'], meaning: 'one', readingType: 'on' },
      { kanji: '二', readings: ['ni'], meaning: 'two', readingType: 'on' },
      { kanji: '三', readings: ['san'], meaning: 'three', readingType: 'on' },
      { kanji: '四', readings: ['yon', 'shi'], meaning: 'four', readingType: 'kun' },
      { kanji: '五', readings: ['go'], meaning: 'five', readingType: 'on' },
      { kanji: '六', readings: ['roku'], meaning: 'six', readingType: 'on' },
      { kanji: '七', readings: ['nana', 'shichi'], meaning: 'seven', readingType: 'kun' },
      { kanji: '八', readings: ['hachi'], meaning: 'eight', readingType: 'on' },
      { kanji: '九', readings: ['kyuu', 'ku'], meaning: 'nine', readingType: 'on' },
      { kanji: '十', readings: ['juu'], meaning: 'ten', readingType: 'on' },
      { kanji: '百', readings: ['hyaku'], meaning: 'hundred', readingType: 'on' },
      { kanji: '千', readings: ['sen'], meaning: 'thousand', readingType: 'on' },
      { kanji: '万', readings: ['man'], meaning: 'ten thousand', readingType: 'on' }
    ]
  },
  colors: {
    label: 'Colors',
    kanji: [
      { kanji: '色', readings: ['iro'], meaning: 'color', readingType: 'kun' },
      { kanji: '赤', readings: ['aka'], meaning: 'red', readingType: 'kun' },
      { kanji: '青', readings: ['ao'], meaning: 'blue', readingType: 'kun' },
      { kanji: '黄色', readings: ['kiiro'], meaning: 'yellow', readingType: 'kun' },
      { kanji: '紫', readings: ['murasaki'], meaning: 'purple', readingType: 'kun' },
      { kanji: '緑', readings: ['midori'], meaning: 'green', readingType: 'kun' },
      { kanji: '白', readings: ['shiro'], meaning: 'white', readingType: 'kun' },
      { kanji: '黒', readings: ['kuro'], meaning: 'black', readingType: 'kun' },
      { kanji: '灰色', readings: ['haiiro'], meaning: 'grey', readingType: 'kun' },
      // 茶's own reading here ("cha") is on'yomi, even though 色 ("iro") is
      // kun'yomi - see the readingType note up top for how mixed compounds
      // like this one are classified.
      { kanji: '茶色', readings: ['chairo'], meaning: 'brown', readingType: 'on' },
      { kanji: '水色', readings: ['mizuiro'], meaning: 'light blue', readingType: 'kun' },
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
      { kanji: '金色', readings: ["kin'iro", "kiniro"], meaning: 'golden (color)', readingType: 'on' }
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
