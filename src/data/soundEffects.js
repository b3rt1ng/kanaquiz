// Simple sound effects generated with the Web Audio API.
// No audio files needed — tones are synthesized on the fly.

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

// Combo tick, played on every consecutive correct answer. Pitch climbs a
// semitone per combo step (capped so it never goes ultrasonic), and extra
// harmonic layers stack in as the combo grows for a "powering up" feel.
export function playComboSound(combo) {
  const step = Math.min(combo - 1, 20);
  const freq = 392.0 * Math.pow(2, step / 12); // starts at G4, climbs ~1.7 octaves by combo 21+
  const gain = 0.10 + Math.min(combo, 12) * 0.006;

  const notes = [
    { freq, start: 0, duration: 0.14, type: 'square', gain }
  ];
  if (combo >= 5) {
    notes.push({ freq: freq * 1.5, start: 0.015, duration: 0.13, type: 'triangle', gain: gain * 0.85 });
  }
  if (combo >= 10) {
    notes.push({ freq: freq * 2, start: 0.03, duration: 0.17, type: 'sawtooth', gain: gain * 0.7 });
  }
  playNotes(notes);
}
