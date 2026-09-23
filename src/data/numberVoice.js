// Pronounces any number in range by concatenating pre-recorded morpheme
// clips (see numbers.js's numberToMorphemes). There's no way to pre-render
// one clip per number, but the morphemes themselves are a closed, small
// set (29: 9 digits, juu, 9 hyaku-forms, 9 sen-forms, man), which is what
// numberToMorphemes already treats as the atomic building blocks - and why
// adding the whole 万 range only cost one new clip.
//
// VOICEVOX 満別花丸・ノーマル (speaker 69), synthesized from the reading in
// hiragana ("まん"), then trimmed at -50dB and encoded mono 24kHz 64kbps -
// the same post-processing as the kanji clips. One exception: "hachi" comes
// from the KATAKANA ハチ, because a bare "はち" is read with the particle
// value of は and comes out "wachi". happyaku/hassen escape it - the sokuon
// stops は being taken for a particle - so they stay hiragana. Note this is NOT the kana
// exercise's voice (もち子さん #20), despite what this comment used to say;
// the speaker was identified by correlating a fresh synthesis against the
// existing clips.
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
