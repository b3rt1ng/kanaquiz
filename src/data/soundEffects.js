// Sound effects. Most are synthesized on the fly with the Web Audio API;
// the combo/stage/dojo sounds are real samples (Jet Set Radio SFX).
import comboTickUrl from '../assets/sounds/e_s004.ogg';
import comboMelodyUrl from '../assets/sounds/e_s013.ogg';
import comboBigMelodyUrl from '../assets/sounds/e_s012.ogg';
import enterDojoUrl from '../assets/sounds/se_menu_enter_dojo_1.wav';
import comboBreakUrl from '../assets/sounds/se_menu_spirits_target_exit_lose.wav';

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
[comboTickUrl, comboMelodyUrl, comboBigMelodyUrl, enterDojoUrl, comboBreakUrl].forEach(loadBuffer);

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
// combo blip (e_s004), sped up a little more each step so it climbs in pitch
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
export function playComboBreakSound() {
  playSample(comboBreakUrl, { gain: 0.55 });
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
