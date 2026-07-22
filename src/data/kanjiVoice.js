// Pre-rendered kanji reading pronunciation (VOICEVOX 玄野武宏 #11・ノーマル,
// see src/assets/sounds/kanji). One clip per kanji character - unlike the
// counting exercise's morphemes, kanji readings don't need concatenation,
// and unlike a romaji-keyed lookup, the kanji character itself is always
// unique per entry even when two kanji share the same reading (e.g. 日 and
// 火 both read "hi").
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
