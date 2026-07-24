// Pre-rendered voice lines for the compliment pool (VOICEVOX 春歌ナナ #54,
// tuned for an upbeat delivery - see src/assets/sounds/compliments). Only
// the 75 entries in compliments.js's main pool have audio; the 3
// speed-only compliments are visual-only, no voice line generated for them.
import manifest from './complimentAudioManifest.json';
import { getEffectSettings } from './effectSettings';

const audioContext = require.context('../assets/sounds/compliments', false, /\.mp3$/);
const urlByFilename = {};
audioContext.keys().forEach(key => {
  urlByFilename[key.replace('./', '')] = audioContext(key);
});

// One element, reused for every clip - see kanaVoice.js for why: a fresh
// `new Audio()` per compliment left abandoned elements' fetches in flight,
// which piles up over a long session and eventually starves later clips of
// a free connection, so they just silently never start.
let audioEl = null;
function getAudioEl() {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

export function playComplimentVoice(text) {
  if (getEffectSettings().complimentVoice === false) return false;
  const filename = manifest[text];
  if (!filename || !urlByFilename[filename]) return false;

  const el = getAudioEl();
  el.pause();
  el.src = urlByFilename[filename];
  el.currentTime = 0;
  el.play().catch(() => {}); // ignore autoplay-policy rejections
  return true;
}
