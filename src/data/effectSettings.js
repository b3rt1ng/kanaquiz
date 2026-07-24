const STORAGE_KEY = 'kanaquiz_effects';

// `group` splits the settings screen into sections - 'visual' for the
// on-screen effects themselves, 'sound' for audio that rides along with
// them (kept separate from the visual toggle so e.g. lightning arcs can
// stay on with their crackle muted, or vice versa).
export const EFFECT_LIST = [
  { key: 'combo', label: 'Combo counter', group: 'visual' },
  { key: 'compliments', label: 'Compliment popups', group: 'visual' },
  { key: 'confetti', label: 'Confetti', group: 'visual' },
  { key: 'tremble', label: 'Screen shake', group: 'visual' },
  { key: 'glitch', label: 'Glitch bursts', group: 'visual' },
  { key: 'lightning', label: 'Lightning arcs', group: 'visual' },
  { key: 'flames', label: 'Flames', group: 'visual' },
  { key: 'complimentVoice', label: 'Cheer-up voice lines', group: 'sound' },
  { key: 'effectSounds', label: 'Effect sounds (lightning, fire)', group: 'sound' }
];

const ALL_KEYS = EFFECT_LIST.map(e => e.key);

function allValues(enabled) {
  const obj = {};
  ALL_KEYS.forEach(key => { obj[key] = enabled; });
  return obj;
}

const DEFAULTS = allValues(true);

// Quick-start configurations shown as buttons at the top of the settings
// screen - each is a full snapshot (every key), not just a diff, so
// applying one always lands on a known, predictable state.
export const PRESETS = [
  { key: 'all', label: 'All', values: allValues(true) },
  // Heaviest effects off: full-screen fire/lightning overlays and the
  // glitch/shake animations are the ones actually taxing on weak hardware -
  // the popups/confetti/sound stay on since they're comparatively cheap.
  { key: 'potato', label: 'Potato Computer', values: { ...allValues(true), flames: false, glitch: false, tremble: false, lightning: false } },
  // Visuals untouched, just the audio layered on top of them muted.
  { key: 'zen', label: 'Zen', values: { ...allValues(true), complimentVoice: false, effectSounds: false } },
  { key: 'allOff', label: 'All Off', values: allValues(false) }
];

// Read once, then served from memory: this is called on every Question /
// TableExercise render (every answer), so it must not hit
// localStorage + JSON.parse each time. setEffectSetting/applyPreset are the
// only writers.
let cache = null;

export function getEffectSettings() {
  if (!cache) {
    try {
      cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    } catch (e) {
      cache = { ...DEFAULTS };
    }
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) { /* private mode etc - settings just won't persist */ }
}

export function setEffectSetting(key, enabled) {
  cache = { ...getEffectSettings(), [key]: enabled };
  persist();
  return cache;
}

export function applyPreset(presetKey) {
  const preset = PRESETS.find(p => p.key === presetKey);
  if (!preset) return getEffectSettings();
  cache = { ...preset.values };
  persist();
  return cache;
}

// Which preset (if any) exactly matches the current settings - used to
// highlight the active one. Null once the user has hand-tweaked a switch
// away from every known preset.
export function matchingPresetKey(effects) {
  const match = PRESETS.find(preset => ALL_KEYS.every(key => (effects[key] !== false) === (preset.values[key] !== false)));
  return match ? match.key : null;
}

export function isEffectEnabled(key) {
  return getEffectSettings()[key] !== false;
}
