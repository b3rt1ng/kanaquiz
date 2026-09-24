// Kanji flashcard content, grouped by theme (selected as a whole theme at
// a time, see KanjiExercise's picker). `readings` accepts more than one
// romaji spelling per kanji (e.g. multiple valid readings, or a
// alternate spelling of the same reading) - all count as correct.
//
// `kanaOverride` is an optional literal kana string shown on the card
// back instead of the auto-derived hiragana form - carried by every card
// whose reading is an onyomi, which is conventionally written in katakana
// (dictionary convention: onyomi in katakana, kunyomi in hiragana). That
// script is also what the answer is expected to be typed in: uppercase
// romaji produces katakana, lowercase produces hiragana, exactly like an
// IME (see kanaTransliteration). Typing the right reading in the other
// script still counts as correct - it just earns a note, see
// readingScriptNote.
//
// The two exceptions are 茶色 and 金色: they're typed 'on' because that
// describes their LEAD kanji (茶, 金), but the 色 ending them is kun'yomi
// "iro", so writing the whole word in katakana would misrepresent it.
// They keep their hiragana form and expect lowercase.
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
import { parseRomajiToKana, hiraganaToKatakana, katakanaToHiragana } from './kanaTransliteration';

export const kanjiDictionary = {
  people: {
    label: 'People',
    kanji: [
      { kanji: '人', readings: ['hito'], meaning: 'person', readingType: 'kun', kunyomi: ['hito'], onyomi: ['jin', 'nin'] },
      { kanji: '男', readings: ['otoko'], meaning: 'man', readingType: 'kun', kunyomi: ['otoko'], onyomi: ['dan', 'nan'] },
      { kanji: '女', readings: ['onna'], meaning: 'woman', readingType: 'kun', kunyomi: ['onna'], onyomi: ['jo'] },
      { kanji: '子', readings: ['ko'], meaning: 'child', readingType: 'kun', kunyomi: ['ko'], onyomi: ['shi'] },
      { kanji: '私', readings: ['watashi'], meaning: 'I, myself', readingType: 'kun', kunyomi: ['watashi'], onyomi: ['shi'] },
      { kanji: '母', readings: ['haha'], meaning: 'mother', readingType: 'kun', kunyomi: ['haha'], onyomi: ['bo'] },
      { kanji: '父', readings: ['chichi'], meaning: 'father', readingType: 'kun', kunyomi: ['chichi'], onyomi: ['fu'] }
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
      { kanji: '石', readings: ['ishi'], meaning: 'rock', readingType: 'kun', kunyomi: ['ishi'], onyomi: ['seki'] },
      { kanji: '海', readings: ['umi'], meaning: 'sea', readingType: 'kun', kunyomi: ['umi'], onyomi: ['kai'] },
      { kanji: '森', readings: ['mori'], meaning: 'forest', readingType: 'kun', kunyomi: ['mori'], onyomi: ['shin'] },
      { kanji: '雷', readings: ['kaminari'], meaning: 'thunder', readingType: 'kun', kunyomi: ['kaminari'], onyomi: ['rai'] },
      { kanji: '氷', readings: ['koori'], meaning: 'ice', readingType: 'kun', kunyomi: ['koori'], onyomi: ['hyou'] },
      // 地 is the ground/land SURFACE, as opposed to the elements theme's
      // 土 (tsuchi, earth as in soil/dirt). No everyday kun'yomi, so the
      // kun badge shows "n/a" - same as 百 in the numbers theme.
      { kanji: '地', readings: ['chi'], meaning: 'earth, ground (the surface)', kanaOverride: 'チ', readingType: 'on', onyomi: ['chi', 'ji'] }
    ]
  },
  seasons: {
    label: 'Seasons',
    kanji: [
      { kanji: '春', readings: ['haru'], meaning: 'spring', readingType: 'kun', kunyomi: ['haru'], onyomi: ['shun'] },
      { kanji: '夏', readings: ['natsu'], meaning: 'summer', readingType: 'kun', kunyomi: ['natsu'], onyomi: ['ka', 'ge'] },
      { kanji: '秋', readings: ['aki'], meaning: 'autumn', readingType: 'kun', kunyomi: ['aki'], onyomi: ['shuu'] },
      { kanji: '冬', readings: ['fuyu'], meaning: 'winter', readingType: 'kun', kunyomi: ['fuyu'], onyomi: ['tou'] }
    ]
  },
  culture: {
    label: 'Culture',
    kanji: [
      { kanji: '刀', readings: ['katana'], meaning: 'sword', readingType: 'kun', kunyomi: ['katana'], onyomi: ['tou'] },
      { kanji: '本', readings: ['hon'], meaning: 'origin; book', kanaOverride: 'ホン', readingType: 'on', kunyomi: ['moto'], onyomi: ['hon'] },
      { kanji: '語', readings: ['go'], meaning: 'language; to tell', kanaOverride: 'ゴ', readingType: 'on', kunyomi: ['kataru'], onyomi: ['go'] },
      { kanji: '音', readings: ['oto'], meaning: 'sound', readingType: 'kun', kunyomi: ['oto'], onyomi: ['on', 'in'] }
    ]
  },
  places: {
    label: 'Places',
    kanji: [
      // Ordered widest to narrowest - 国 › 町 › 店 nest inside each other,
      // which is easier to hold onto than three unrelated places.
      { kanji: '国', readings: ['kuni'], meaning: 'country', readingType: 'kun', kunyomi: ['kuni'], onyomi: ['koku'] },
      { kanji: '町', readings: ['machi'], meaning: 'town', readingType: 'kun', kunyomi: ['machi'], onyomi: ['chou'] },
      { kanji: '店', readings: ['mise'], meaning: 'shop', readingType: 'kun', kunyomi: ['mise'], onyomi: ['ten'] }
    ]
  },
  numbers: {
    label: 'Numbers',
    kanji: [
      { kanji: '一', readings: ['ichi'], meaning: 'one', kanaOverride: 'イチ', readingType: 'on', kunyomi: ['hitotsu'], onyomi: ['ichi'] },
      { kanji: '二', readings: ['ni'], meaning: 'two', kanaOverride: 'ニ', readingType: 'on', kunyomi: ['futatsu'], onyomi: ['ni'] },
      { kanji: '三', readings: ['san'], meaning: 'three', kanaOverride: 'サン', readingType: 'on', kunyomi: ['mittsu'], onyomi: ['san'] },
      { kanji: '四', readings: ['yon', 'shi'], meaning: 'four', readingType: 'kun', kunyomi: ['yon'], onyomi: ['shi'] },
      { kanji: '五', readings: ['go'], meaning: 'five', kanaOverride: 'ゴ', readingType: 'on', kunyomi: ['itsutsu'], onyomi: ['go'] },
      { kanji: '六', readings: ['roku'], meaning: 'six', kanaOverride: 'ロク', readingType: 'on', kunyomi: ['muttsu'], onyomi: ['roku'] },
      { kanji: '七', readings: ['nana', 'shichi'], meaning: 'seven', readingType: 'kun', kunyomi: ['nana'], onyomi: ['shichi'] },
      { kanji: '八', readings: ['hachi'], meaning: 'eight', kanaOverride: 'ハチ', readingType: 'on', kunyomi: ['yattsu'], onyomi: ['hachi'] },
      { kanji: '九', readings: ['kyuu', 'ku'], meaning: 'nine', kanaOverride: 'キュウ', readingType: 'on', kunyomi: ['kokonotsu'], onyomi: ['kyuu', 'ku'] },
      { kanji: '十', readings: ['juu'], meaning: 'ten', kanaOverride: 'ジュウ', readingType: 'on', kunyomi: ['too'], onyomi: ['juu'] },
      { kanji: '百', readings: ['hyaku'], meaning: 'hundred', kanaOverride: 'ヒャク', readingType: 'on', onyomi: ['hyaku'] },
      { kanji: '千', readings: ['sen'], meaning: 'thousand', kanaOverride: 'セン', readingType: 'on', kunyomi: ['chi'], onyomi: ['sen'] },
      { kanji: '万', readings: ['man'], meaning: 'ten thousand', kanaOverride: 'マン', readingType: 'on', kunyomi: ['yorozu'], onyomi: ['man', 'ban'] }
    ]
  },
  time: {
    label: 'Time',
    kanji: [
      { kanji: '今', readings: ['ima'], meaning: 'now', readingType: 'kun', kunyomi: ['ima'], onyomi: ['kon', 'kin'] },
      { kanji: '時', readings: ['ji'], meaning: 'time, hour', kanaOverride: 'ジ', readingType: 'on', kunyomi: ['toki'], onyomi: ['ji'] },
      // Two unrelated meanings share this kanji: the on'yomi "fun" is the
      // minute counter, the kun'yomi wakaru/wakeru is "to understand" /
      // "to divide". The card teaches the on'yomi, hence the katakana.
      { kanji: '分', readings: ['fun'], meaning: 'minute; to understand', kanaOverride: 'フン', readingType: 'on', kunyomi: ['wakaru', 'wakeru'], onyomi: ['bun', 'fun', 'bu'] }
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
  },
  qualities: {
    label: 'Qualities',
    kanji: [
      // Adjectives are taught with their okurigana reading (ookii, not the
      // bare "oo"), which is also what the audio says - that's the form
      // you actually use in a sentence.
      { kanji: '大', readings: ['ookii'], meaning: 'big', readingType: 'kun', kunyomi: ['ookii'], onyomi: ['dai', 'tai'] },
      { kanji: '小', readings: ['chiisai'], meaning: 'small', readingType: 'kun', kunyomi: ['chiisai'], onyomi: ['shou'] },
      { kanji: '中', readings: ['naka'], meaning: 'middle, inside', readingType: 'kun', kunyomi: ['naka'], onyomi: ['chuu'] },
      { kanji: '全', readings: ['subete'], meaning: 'all, the whole', readingType: 'kun', kunyomi: ['subete'], onyomi: ['zen'] },
      // Second -i adjective pair of this theme, alongside 大きい/小さい: the
      // okurigana reading is what's taught and what the audio says.
      { kanji: '古', readings: ['furui'], meaning: 'old', readingType: 'kun', kunyomi: ['furui'], onyomi: ['ko'] },
      { kanji: '新', readings: ['atarashii'], meaning: 'new', readingType: 'kun', kunyomi: ['atarashii'], onyomi: ['shin'] }
    ]
  },
  body: {
    label: 'Body',
    kanji: [
      { kanji: '体', readings: ['karada'], meaning: 'body', readingType: 'kun', kunyomi: ['karada'], onyomi: ['tai'] },
      { kanji: '頭', readings: ['atama'], meaning: 'head', readingType: 'kun', kunyomi: ['atama'], onyomi: ['tou', 'zu'] },
      { kanji: '髪', readings: ['kami'], meaning: 'hair (on the head)', readingType: 'kun', kunyomi: ['kami'], onyomi: ['hatsu'] },
      { kanji: '顔', readings: ['kao'], meaning: 'face', readingType: 'kun', kunyomi: ['kao'], onyomi: ['gan'] },
      { kanji: '目', readings: ['me'], meaning: 'eye', readingType: 'kun', kunyomi: ['me'], onyomi: ['moku', 'boku'] },
      { kanji: '耳', readings: ['mimi'], meaning: 'ear', readingType: 'kun', kunyomi: ['mimi'], onyomi: ['ji'] },
      { kanji: '鼻', readings: ['hana'], meaning: 'nose', readingType: 'kun', kunyomi: ['hana'], onyomi: ['bi'] },
      { kanji: '口', readings: ['kuchi'], meaning: 'mouth', readingType: 'kun', kunyomi: ['kuchi'], onyomi: ['kou', 'ku'] },
      { kanji: '声', readings: ['koe'], meaning: 'voice', readingType: 'kun', kunyomi: ['koe'], onyomi: ['sei'] },
      { kanji: '歯', readings: ['ha'], meaning: 'tooth', readingType: 'kun', kunyomi: ['ha'], onyomi: ['shi'] },
      { kanji: '舌', readings: ['shita'], meaning: 'tongue', readingType: 'kun', kunyomi: ['shita'], onyomi: ['zetsu'] },
      { kanji: '髭', readings: ['hige'], meaning: 'beard, mustache', readingType: 'kun', kunyomi: ['hige'] },
      { kanji: '首', readings: ['kubi'], meaning: 'neck', readingType: 'kun', kunyomi: ['kubi'], onyomi: ['shu'] },
      { kanji: '肩', readings: ['kata'], meaning: 'shoulder', readingType: 'kun', kunyomi: ['kata'], onyomi: ['ken'] },
      { kanji: '腕', readings: ['ude'], meaning: 'arm', readingType: 'kun', kunyomi: ['ude'], onyomi: ['wan'] },
      { kanji: '手', readings: ['te'], meaning: 'hand', readingType: 'kun', kunyomi: ['te'], onyomi: ['shu'] },
      { kanji: '指', readings: ['yubi'], meaning: 'finger', readingType: 'kun', kunyomi: ['yubi'], onyomi: ['shi'] },
      { kanji: '爪', readings: ['tsume'], meaning: 'nail (finger/toe)', readingType: 'kun', kunyomi: ['tsume'], onyomi: ['sou'] },
      { kanji: '胸', readings: ['mune'], meaning: 'chest', readingType: 'kun', kunyomi: ['mune'], onyomi: ['kyou'] },
      { kanji: '腹', readings: ['hara'], meaning: 'belly, stomach', readingType: 'kun', kunyomi: ['hara'], onyomi: ['fuku'] },
      // Compound (背 + 中): like the colors theme's compounds, kunyomi/onyomi
      // here describe the LEAD kanji (背, "se") specifically, not the whole
      // word - see the readingType note up top.
      { kanji: '背中', readings: ['senaka'], meaning: 'back (of the body)', readingType: 'kun', kunyomi: ['se'], onyomi: ['hai'] },
      // Both anatomical terms below are Sino-Japanese on'yomi compounds
      // (like 天/テン), so per the dictionary's onyomi-in-katakana convention
      // they're displayed in katakana via kanaOverride.
      { kanji: '陰茎', readings: ['inkei'], meaning: 'penis (anatomical)', kanaOverride: 'インケイ', readingType: 'on', kunyomi: ['kage'], onyomi: ['in'] },
      { kanji: '膣', readings: ['chitsu'], meaning: 'vagina (anatomical)', kanaOverride: 'チツ', readingType: 'on', onyomi: ['chitsu'] },
      { kanji: '尻', readings: ['shiri'], meaning: 'buttocks', readingType: 'kun', kunyomi: ['shiri'], onyomi: ['kou'] },
      { kanji: '足', readings: ['ashi'], meaning: 'foot, leg', readingType: 'kun', kunyomi: ['ashi'], onyomi: ['soku'] },
      { kanji: '肌', readings: ['hada'], meaning: 'skin', readingType: 'kun', kunyomi: ['hada'] },
      { kanji: '毛', readings: ['ke'], meaning: 'hair, fur (body)', readingType: 'kun', kunyomi: ['ke'], onyomi: ['mou'] },
      // Compound (尻 + 尾): lead kanji 尻 ("shiri", same as the "buttocks"
      // entry above) - the whole word's "shippo" comes from a sound change
      // (shiri + o -> shippo), same mechanism as other kun'yomi compounds.
      { kanji: '尻尾', readings: ['shippo'], meaning: 'tail (animal)', readingType: 'kun', kunyomi: ['shiri'], onyomi: ['kou'] },
      { kanji: '翼', readings: ['tsubasa'], meaning: 'wing', readingType: 'kun', kunyomi: ['tsubasa'], onyomi: ['yoku'] },
      { kanji: '羽', readings: ['hane'], meaning: 'feather', readingType: 'kun', kunyomi: ['hane'], onyomi: ['u'] },
      { kanji: '牙', readings: ['kiba'], meaning: 'fang', readingType: 'kun', kunyomi: ['kiba'], onyomi: ['ga'] },
      { kanji: '角', readings: ['tsuno'], meaning: 'horn', readingType: 'kun', kunyomi: ['tsuno'], onyomi: ['kaku'] },
      { kanji: '骨', readings: ['hone'], meaning: 'bone', readingType: 'kun', kunyomi: ['hone'], onyomi: ['kotsu'] },
      { kanji: '血', readings: ['chi'], meaning: 'blood', readingType: 'kun', kunyomi: ['chi'], onyomi: ['ketsu'] },
      { kanji: '影', readings: ['kage'], meaning: 'shadow', readingType: 'kun', kunyomi: ['kage'], onyomi: ['ei'] }
    ]
  }
};

// Correct if the typed romaji resolves to the same KANA as any of the
// kanji's registered readings - comparing kana (not raw romaji strings)
// means an equivalent alternate spelling of the same reading also counts,
// the same principle numbers.js uses for the counting exercise.
//
// Script is deliberately ignored here. Typing "ICHI" or "ichi" is the same
// PRONUNCIATION, and the pronunciation is what's being tested; katakana vs
// hiragana is a writing convention, so getting it "wrong" costs nothing and
// is answered with a note instead - see readingScriptNote.
export function isReadingCorrect(entry, typedInput) {
  const typed = parseRomajiToKana(typedInput);
  if (!typed.complete) return false;
  const spoken = katakanaToHiragana(typed.kana);
  return entry.readings.some(r => katakanaToHiragana(parseRomajiToKana(r).kana) === spoken);
}

const KATAKANA = /[ァ-ヶ]/;

// readings[0] cased to match the script the card is written in, so the
// romaji line under the kana doubles as "how to type this": uppercase for a
// katakana (on'yomi) card, lowercase for a hiragana one. Before, a blanket
// CSS text-transform uppercased every card, which now reads as an
// instruction - and the wrong one on a kun'yomi card.
export function primaryReadingRomaji(entry) {
  const romaji = entry.readings[0];
  return expectsKatakana(entry) ? romaji.toUpperCase() : romaji.toLowerCase();
}

// Whether a card's reading is conventionally written in katakana - true for
// an on'yomi carrying a katakana kanaOverride. Read off what the card
// actually DISPLAYS rather than off readingType, so the two can never
// disagree: 茶色/金色 are typed 'on' but describe only their lead kanji
// (their 色 is kun'yomi "iro"), so they stay hiragana and say nothing here.
function expectsKatakana(entry) {
  return KATAKANA.test(primaryReadingKana(entry));
}

// A right-pronunciation-but-other-script answer gets a short teaching note
// rather than a penalty. Returns null when there's nothing to say; the
// wording is left to the caller, this only supplies the facts.
export function readingScriptNote(entry, typedInput) {
  const typed = parseRomajiToKana(typedInput);
  if (!typed.complete || !typed.kana) return null;

  const expected = primaryReadingKana(entry);
  if (typed.kana === expected) return null; // written exactly as the card has it

  // Strictly about SCRIPT: once that's normalized away the two must be the
  // same reading. An accepted ALTERNATE reading (四 "shi" for "yon", 金
  // "kin" for "kane") is a different word, not a mis-script - no note.
  if (katakanaToHiragana(typed.kana) !== katakanaToHiragana(expected)) return null;

  const wantKatakana = expectsKatakana(entry);
  return {
    wantKatakana,
    expected,
    typed: typed.kana,
    // How the same answer would be typed to come out in the right script.
    retype: wantKatakana ? entry.readings[0].toUpperCase() : entry.readings[0].toLowerCase(),
    // The reading of the OTHER type, for context on why this one is the one
    // being drilled ("the kun'yomi is ひとつ").
    otherLabel: wantKatakana ? "kun'yomi" : "on'yomi",
    other: wantKatakana ? kunyomiDisplay(entry) : onyomiDisplay(entry)
  };
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

// kanji character -> its entry, flattened across every theme. Built once
// and reused - see helperFuncs.js's findRomajisAtKanaKey for the same
// "index instead of re-scanning" pattern. Used by "Grind them" to rebuild
// a deck from a plain list of kanji characters (the confusion pairs'
// keys), independent of which theme(s) they originally came from.
let entryIndex = null;

export function findKanjiEntry(kanjiChar) {
  if (!entryIndex) {
    entryIndex = {};
    Object.keys(kanjiDictionary).forEach(theme => {
      kanjiDictionary[theme].kanji.forEach(entry => { entryIndex[entry.kanji] = entry; });
    });
  }
  return entryIndex[kanjiChar];
}
