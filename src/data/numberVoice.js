// Pronounces any 1-9999 number by concatenating pre-recorded morpheme
// clips (see numbers.js's numberToMorphemes and generate_number_audio in
// the repo history for how they were made - VOICEVOX, same voice/pipeline
// as the kana clips). There's no way to pre-render one clip per number
// (9999 of them), but the morphemes themselves are a closed, small set
// (28 total: 9 digits, juu, 9 hyaku-forms, 9 sen-forms), which is what
// numberToMorphemes already treats as the atomic building blocks.
//
// Playback uses the Web Audio API (not HTMLAudioElement, unlike
// kanaVoice.js/complimentVoice.js) because gapless back-to-back scheduling
// needs precise start-time control - each buffer is scheduled to start
// exactly when the previous one's duration ends.
import { getAudioContext } from './soundEffects';
import { numberToMorphemes } from './numbers';

const audioContext = require.context('../assets/sounds/numbers', false, /\.mp3$/);
const urlByMorpheme = {};
audioContext.keys().forEach(key => {
  urlByMorpheme[key.replace('./', '').replace('.mp3', '')] = audioContext(key);
});

const bufferCache = {};
function loadBuffer(url) {
  if (bufferCache[url]) return bufferCache[url];
  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve(null);

  const promise = fetch(url)
    .then(res => res.arrayBuffer())
    .then(data => ctx.decodeAudioData(data))
    .catch(() => null);

  bufferCache[url] = promise;
  return promise;
}

export function hasNumberAudio(n) {
  const morphemes = numberToMorphemes(n);
  return morphemes.length > 0 && morphemes.every(m => !!urlByMorpheme[m]);
}

let scheduledSources = [];
let playGeneration = 0;

export function playNumberPronunciation(n) {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopNumberPronunciation();
  playGeneration++;
  const myGeneration = playGeneration;

  const morphemes = numberToMorphemes(n);
  const urls = morphemes.map(m => urlByMorpheme[m]);
  if (urls.length === 0 || urls.some(u => !u)) return;

  Promise.all(urls.map(loadBuffer)).then(buffers => {
    if (myGeneration !== playGeneration) return; // superseded by a newer call
    if (buffers.some(b => !b)) return;

    let startTime = ctx.currentTime + 0.03;
    buffers.forEach(buffer => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(startTime);
      scheduledSources.push(source);
      startTime += buffer.duration;
    });
  });
}

export function stopNumberPronunciation() {
  playGeneration++; // invalidates any scheduling still in flight
  scheduledSources.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } });
  scheduledSources = [];
}
