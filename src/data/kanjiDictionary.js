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
import { parseRomajiToKana } from './kanaTransliteration';

export const kanjiDictionary = {
  people: {
    label: 'People',
    kanji: [
      { kanji: '人', readings: ['hito'], meaning: 'person' },
      { kanji: '男', readings: ['otoko'], meaning: 'man' },
      { kanji: '女', readings: ['onna'], meaning: 'woman' },
      { kanji: '子', readings: ['ko'], meaning: 'child' },
      { kanji: '私', readings: ['watashi'], meaning: 'I, myself' }
    ]
  },
  sky: {
    label: 'Sky & Spirit',
    kanji: [
      { kanji: '日', readings: ['hi'], meaning: 'sun' },
      { kanji: '月', readings: ['tsuki'], meaning: 'moon' },
      { kanji: '空', readings: ['sora'], meaning: 'sky' },
      { kanji: '天', readings: ['ten'], meaning: 'the heavens (spiritual sky)', kanaOverride: 'テン' },
      { kanji: '光', readings: ['hikari'], meaning: 'light' },
      { kanji: '神', readings: ['kami'], meaning: 'god' }
    ]
  },
  elements: {
    label: 'Elements',
    kanji: [
      { kanji: '火', readings: ['hi'], meaning: 'fire' },
      { kanji: '水', readings: ['mizu'], meaning: 'water' },
      { kanji: '木', readings: ['ki'], meaning: 'tree' },
      { kanji: '金', readings: ['kane'], meaning: 'metal' },
      { kanji: '土', readings: ['tsuchi'], meaning: 'earth, dirt' }
    ]
  },
  nature: {
    label: 'Nature',
    kanji: [
      { kanji: '風', readings: ['kaze'], meaning: 'wind' },
      { kanji: '雨', readings: ['ame'], meaning: 'rain' },
      { kanji: '雪', readings: ['yuki'], meaning: 'snow' },
      { kanji: '山', readings: ['yama'], meaning: 'mountain' },
      { kanji: '川', readings: ['kawa'], meaning: 'river' },
      { kanji: '田', readings: ['ta'], meaning: 'rice field' },
      { kanji: '島', readings: ['shima'], meaning: 'island' },
      { kanji: '花', readings: ['hana'], meaning: 'flower' },
      { kanji: '石', readings: ['ishi'], meaning: 'rock' }
    ]
  },
  culture: {
    label: 'Culture',
    kanji: [
      { kanji: '刀', readings: ['katana'], meaning: 'sword' }
    ]
  },
  numbers: {
    label: 'Numbers',
    kanji: [
      { kanji: '一', readings: ['ichi'], meaning: 'one' },
      { kanji: '二', readings: ['ni'], meaning: 'two' },
      { kanji: '三', readings: ['san'], meaning: 'three' },
      { kanji: '四', readings: ['yon', 'shi'], meaning: 'four' },
      { kanji: '五', readings: ['go'], meaning: 'five' },
      { kanji: '六', readings: ['roku'], meaning: 'six' },
      { kanji: '七', readings: ['nana', 'shichi'], meaning: 'seven' },
      { kanji: '八', readings: ['hachi'], meaning: 'eight' },
      { kanji: '九', readings: ['kyuu', 'ku'], meaning: 'nine' },
      { kanji: '十', readings: ['juu'], meaning: 'ten' },
      { kanji: '百', readings: ['hyaku'], meaning: 'hundred' },
      { kanji: '千', readings: ['sen'], meaning: 'thousand' },
      { kanji: '万', readings: ['man'], meaning: 'ten thousand' }
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
