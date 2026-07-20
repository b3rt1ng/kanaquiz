// Pre-rendered kana pronunciation for the Listening exercise: one clip per
// kana, VOICEVOX もち子さん #20, generated once offline (see
// src/assets/sounds/kana). Recorded audio instead of the browser's
// speechSynthesis, whose voice/accent quality is entirely up to whatever the
// OS happens to have installed.
import manifest from './kanaAudioManifest.json';

// Eagerly resolves every clip to its bundled URL. Cheap: file-loader turns
// each require() into a short string constant, not a network fetch - the
// actual audio bytes are only fetched lazily when playKana() is called.
const audioContext = require.context('../assets/sounds/kana', false, /\.mp3$/);
const urlByFilename = {};
audioContext.keys().forEach(key => {
  urlByFilename[key.replace('./', '')] = audioContext(key);
});

export function hasKanaAudio(kana) {
  return !!manifest[kana];
}

// One element, reused for every clip, instead of `new Audio()` per play: on
// a long Listening session that was creating and abandoning a fresh
// HTMLMediaElement for every question. `.pause()` alone doesn't cancel the
// abandoned element's in-flight network fetch, so over enough questions
// those pile up and exhaust the browser's per-host connection limit - after
// which every *new* clip just hangs silently, never firing. Reassigning
// `.src` on a single persistent element aborts the previous fetch for real.
let audioEl = null;
function getAudioEl() {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

export function playKana(kana) {
  const filename = manifest[kana] && manifest[kana].f;
  if (!filename || !urlByFilename[filename]) return false;

  const el = getAudioEl();
  el.pause();
  el.src = urlByFilename[filename];
  el.currentTime = 0;
  el.play().catch(() => {}); // ignore autoplay-policy rejections
  return true;
}

export function stopKana() {
  if (audioEl) audioEl.pause();
}
