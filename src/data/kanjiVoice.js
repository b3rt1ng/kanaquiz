// Pre-rendered kanji reading pronunciation (VOICEVOX 玄野武宏 #11・ノーマル,
// see src/assets/sounds/kanji). One clip per kanji character - unlike the
// counting exercise's morphemes, kanji readings don't need concatenation,
// and unlike a romaji-keyed lookup, the kanji character itself is always
// unique per entry even when two kanji share the same reading (e.g. 日 and
// 火 both read "hi" and genuinely share one identical clip).
//
// How the clips are made, for whenever new kanji get added:
//   1. synthesize with the KANJI itself as the input text - VOICEVOX then
//      picks the reading AND the dictionary pitch accent, which is what
//      makes it sound right rather than flat;
//   2. but first check what it actually reads it as (POST /audio_query
//      returns the moras) - on a lone kanji it usually picks the on'yomi,
//      so wherever that disagrees with the card's readings[0] the input
//      has to be overridden. ~10% of the existing clips are overrides:
//      金->かね, 黄色->きいろ, 体->からだ, 歯->は, 肩->かた, 足->あし,
//      肌->はだ, 毛->け, 角->つの, 陰茎->インケイ.
//   3. override with the okurigana form where there is one (大->大きい,
//      小->小さい, 全->全て): it keeps the real accent, which bare kana
//      loses. Bare kana is the fallback, and beware that some of it is
//      read as a particle - はは comes out "wawa", not "haha".
//   4. on'yomi-only readings are overridden in KATAKANA (時->ジ, 語->ゴ,
//      分->フン), matching the card's kanaOverride. For a long vowel this
//      is required, not cosmetic: いんけい synthesizes as "inkee", while
//      インケイ articulates the final い.
//   5. post-process: trim silence at both ends at -50dB, encode mono
//      24kHz CBR 64kbps.
//        ffmpeg -i in.wav -af "silenceremove=start_periods=1:\
//          start_threshold=-50dB:start_silence=0:detection=peak,areverse,\
//          silenceremove=start_periods=1:start_threshold=-50dB:\
//          start_silence=0:detection=peak,areverse" \
//          -codec:a libmp3lame -b:a 64k out.mp3
//      The 35 `body` clips are the exception: they were left untrimmed at
//      96kbps, so they carry ~110ms of leading silence and fire a touch
//      later than the rest.
const audioContext = require.context('../assets/sounds/kanji', false, /\.mp3$/);
const urlByKanji = {};
audioContext.keys().forEach(key => {
  urlByKanji[key.replace('./', '').replace('.mp3', '')] = audioContext(key);
});

export function hasKanjiAudio(kanji) {
  return !!urlByKanji[kanji];
}

// One element, reused for every clip - see kanaVoice.js for why: a fresh
// `new Audio()` per play leaves abandoned elements' fetches in flight,
// which piles up over a long session and eventually starves later clips of
// a free connection.
let audioEl = null;
function getAudioEl() {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

export function playKanjiPronunciation(kanji) {
  const url = urlByKanji[kanji];
  if (!url) return false;

  const el = getAudioEl();
  el.pause();
  el.src = url;
  el.currentTime = 0;
  el.play().catch(() => {}); // ignore autoplay-policy rejections
  return true;
}

export function stopKanjiPronunciation() {
  if (audioEl) audioEl.pause();
}
