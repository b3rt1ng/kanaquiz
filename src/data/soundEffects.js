// Sound effects. Most are synthesized on the fly with the Web Audio API;
// the combo/stage/dojo sounds are real samples (Jet Set Radio SFX).
import comboTickUrl from '../assets/sounds/combo-tick.ogg';
import comboMelodyUrl from '../assets/sounds/combo-melody-short.ogg';
import comboBigMelodyUrl from '../assets/sounds/combo-melody-long.ogg';
import enterDojoUrl from '../assets/sounds/stage-start.wav';
import comboBreakUrl from '../assets/sounds/combo-break.wav';
import bigStreakLostUrl from '../assets/sounds/big-streak-lost.wav';
import crowdUrl1 from '../assets/sounds/crowd-applause-1.wav';
import crowdUrl2 from '../assets/sounds/crowd-applause-2.wav';
import crowdUrl3 from '../assets/sounds/crowd-applause-3.wav';
import crowdUrl4 from '../assets/sounds/crowd-applause-4.wav';

const crowdUrls = [crowdUrl1, crowdUrl2, crowdUrl3, crowdUrl4];

let audioCtx = null;

function getAudioContext() {
  if (audioCtx === null) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  // Browsers may suspend the context until a user gesture; resume it.
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Play a sequence of notes. Each note: { freq, start, duration, type }.
function playNotes(notes) {
  const ctx = getAudioContext();
  if (!ctx) return; // Web Audio not supported

  const now = ctx.currentTime;
  notes.forEach(({ freq, start, duration, type = 'sine', gain = 0.15 }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Quick attack + smooth release to avoid clicks.
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });
}

// --- Sample playback (for the Jet Set Radio combo sounds) ---------------

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

// Kick off decoding as soon as the module loads so the first combo tick
// isn't held up waiting on the network/decode.
[comboTickUrl, comboMelodyUrl, comboBigMelodyUrl, enterDojoUrl, comboBreakUrl, bigStreakLostUrl, ...crowdUrls].forEach(loadBuffer);

function playSample(url, { playbackRate = 1, gain = 0.5 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  loadBuffer(url).then(buffer => {
    if (!buffer) return;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gainNode.gain.value = gain;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  });
}

// Bright ascending two-note chime for a correct answer.
export function playCorrectSound() {
  playNotes([
    { freq: 587.33, start: 0, duration: 0.12, type: 'sine' },    // D5
    { freq: 880.0, start: 0.1, duration: 0.18, type: 'sine' }    // A5
  ]);
}

// Low descending buzz for a wrong answer.
export function playWrongSound() {
  playNotes([
    { freq: 196.0, start: 0, duration: 0.18, type: 'square', gain: 0.08 },   // G3
    { freq: 155.56, start: 0.12, duration: 0.22, type: 'square', gain: 0.08 } // Eb3
  ]);
}

// Rising fanfare arpeggio when a stage is completed.
export function playStageUpSound() {
  playNotes([
    { freq: 523.25, start: 0.0, duration: 0.14, type: 'triangle', gain: 0.14 },  // C5
    { freq: 659.25, start: 0.12, duration: 0.14, type: 'triangle', gain: 0.14 }, // E5
    { freq: 783.99, start: 0.24, duration: 0.14, type: 'triangle', gain: 0.14 }, // G5
    { freq: 1046.5, start: 0.36, duration: 0.30, type: 'triangle', gain: 0.16 }  // C6
  ]);
}

// Combo tick, played on every consecutive correct answer: the Jet Set Radio
// combo blip, sped up a little more each step so it climbs in pitch
// without turning into an unrecognisable chipmunk squeal. On every 5th combo
// it's replaced (not layered) by one of JSR's little melodic combos of that
// same sound for a bigger payoff, with the longer one reserved for every
// 10th. Gains are pushed past unity since the raw samples are mastered quiet.
export function playComboSound(combo) {
  if (combo > 0 && combo % 10 === 0) {
    playSample(comboBigMelodyUrl, { gain: 1.3 });
  } else if (combo > 0 && combo % 5 === 0) {
    playSample(comboMelodyUrl, { gain: 1.2 });
  } else {
    const step = Math.min(combo - 1, 24);
    const playbackRate = 1 + step * 0.035; // +3.5%/step, caps around 1.84x
    const gain = 0.9 + Math.min(combo, 10) * 0.03;
    playSample(comboTickUrl, { playbackRate, gain });
  }
}

// Played when a stage's intro screen appears - "entering the dojo".
export function playEnterDojoSound() {
  playSample(enterDojoUrl, { gain: 0.6 });
}

// Played when an active combo streak gets broken by a wrong answer (as
// opposed to just missing with no streak on the line, see playWrongSound).
// Losing a big streak (5+) hurts more, so it gets its own sting.
export function playComboBreakSound(lostCombo = 0) {
  if (lostCombo >= 5) playSample(bigStreakLostUrl, { gain: 0.8 });
  else playSample(comboBreakUrl, { gain: 0.55 });
}

// --- Fire loop (synthesized) --------------------------------------------

let fireNodes = null;
let fireCrackleTimer = null;

// One shared 2s noise buffer allocated on first ignition and reused for the
// looping bed, the boom and every crackle (via start()'s offset/duration
// slicing) - crackles fire up to ~10x/s, so allocating per-crackle would
// churn the GC the whole time the fire burns.
let noiseBuffer = null;

function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// Ignites with a small explosion (noise burst swept down + sub thump), then
// keeps a looping roar going: lowpassed noise wobbled by a slow LFO, with
// randomly timed bandpassed pops on top for the crackle. Idempotent - calling
// while already burning does nothing.
export function startFireSound() {
  const ctx = getAudioContext();
  if (!ctx || fireNodes) return;

  const now = ctx.currentTime;

  const boomSrc = ctx.createBufferSource();
  boomSrc.buffer = getNoiseBuffer(ctx);
  const boomFilter = ctx.createBiquadFilter();
  boomFilter.type = 'lowpass';
  boomFilter.frequency.setValueAtTime(2200, now);
  boomFilter.frequency.exponentialRampToValueAtTime(120, now + 0.55);
  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.8, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  boomSrc.connect(boomFilter);
  boomFilter.connect(boomGain);
  boomGain.connect(ctx.destination);
  boomSrc.start(now);
  boomSrc.stop(now + 0.7);

  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(95, now);
  thump.frequency.exponentialRampToValueAtTime(38, now + 0.35);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.5, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.45);

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 480;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.5);
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 3.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  lfo.start(now);

  fireNodes = { src, lfo, gain };

  const crackle = () => {
    if (!fireNodes) return;
    const t = ctx.currentTime;
    const cSrc = ctx.createBufferSource();
    cSrc.buffer = getNoiseBuffer(ctx);
    const cFilter = ctx.createBiquadFilter();
    cFilter.type = 'bandpass';
    cFilter.frequency.value = 1800 + Math.random() * 2600;
    cFilter.Q.value = 2;
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.12 + Math.random() * 0.1, t);
    cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    cSrc.connect(cFilter);
    cFilter.connect(cGain);
    cGain.connect(ctx.destination);
    // Random slice of the shared buffer so each pop still sounds different.
    cSrc.start(t, Math.random() * 1.9, 0.06);
    fireCrackleTimer = setTimeout(crackle, 60 + Math.random() * 220);
  };
  fireCrackleTimer = setTimeout(crackle, 250);
}

// Crowd applause for clearing a stage (played alongside the confetti) -
// one of the SP2 crowd samples, picked at random for variety.
export function playApplauseSound() {
  playSample(crowdUrls[Math.floor(Math.random() * crowdUrls.length)], { gain: 0.8 });
}

// Fades the roar out over ~0.4s rather than cutting, so a broken combo
// doesn't end on a click.
export function stopFireSound() {
  if (!fireNodes) return;
  clearTimeout(fireCrackleTimer);
  fireCrackleTimer = null;
  const { src, lfo, gain } = fireNodes;
  fireNodes = null;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
  src.stop(now + 0.45);
  lfo.stop(now + 0.45);
}

// Soft, short blip for keyboard input - a bit of randomized detune per
// keystroke so typing doesn't sound like a machine gun.
export function playKeySound() {
  const detune = (Math.random() - 0.5) * 60;
  playNotes([
    { freq: 720 + detune, start: 0, duration: 0.045, type: 'square', gain: 0.045 }
  ]);
}

// Very light tick for hovering over buttons/interactive rows.
export function playHoverSound() {
  playNotes([
    { freq: 1046.5, start: 0, duration: 0.05, type: 'sine', gain: 0.035 }
  ]);
}
