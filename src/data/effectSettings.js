const STORAGE_KEY = 'kanaquiz_effects';

export const EFFECT_LIST = [
  { key: 'combo', label: 'Combo counter' },
  { key: 'compliments', label: 'Compliment popups' },
  { key: 'tremble', label: 'Screen shake' },
  { key: 'glitch', label: 'Glitch bursts' },
  { key: 'flames', label: 'Flames (combo 15+)' }
];

const DEFAULTS = { combo: true, compliments: true, tremble: true, glitch: true, flames: true };

// Read once, then served from memory: this is called on every Question /
// TableExercise render (every answer), so it must not hit
// localStorage + JSON.parse each time. setEffectSetting is the only writer.
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

export function setEffectSetting(key, enabled) {
  cache = { ...getEffectSettings(), [key]: enabled };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) { /* private mode etc - settings just won't persist */ }
  return cache;
}

export function isEffectEnabled(key) {
  return getEffectSettings()[key] !== false;
}
