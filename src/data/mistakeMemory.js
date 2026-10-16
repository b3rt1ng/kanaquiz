// Cross-session memory of what the user keeps missing. Every other stats
// structure in the app dies with its component - GameContainer's
// characterStats resets on each startGame(), and each exercise builds its
// own buildResultsData() from the session it just ran - so "train my
// mistakes" needs a store that outlives all of them.
//
// A character enters the list the first time it's missed and STAYS there
// until explicitly forgotten - training it is not what removes it, so the
// same set can be drilled again whenever the user feels like it. What
// practice changes is its debt, not its membership.
//
// The debt is how much work a character still owes: a miss puts it
// DEBT_PER_MISS correct answers in the red, every correct answer anywhere
// in the app pays one back. It drives two things - the sort order (still
// shaky first) and the session weighting, where a character comes back
// around `debt` times, so the ones missed most are the ones seen most. A
// character that has fully recovered still gets MIN_TRAINING_REPEATS
// passes when its list is trained: it's a refresher, and one lucky answer
// is not proof.
//
// DEBT_PER_MISS deliberately equals grindHelper's default
// GRIND_MASTERY_NEEDED: one clean grind of a character pays off a single
// miss.
const STORAGE_KEY = 'kanaquiz_mistakes';
const SCHEMA_VERSION = 2;

// Kana and kanji are kept in separate namespaces rather than one bag with
// a type tag: each has its own menu, its own exercise and its own "train
// my mistakes" button, and neither should ever pull the other's characters
// into a session.
export const KANA = 'kana';
export const KANJI = 'kanji';

const DEBT_PER_MISS = 2;
// Without a cap, one bad day on a character (say 5 misses) would demand 10
// correct answers before it stopped showing up, long after it was actually
// relearned - and would make a single training session enormous.
const MAX_DEBT = 6;
// What a fully recovered character is still worth drilling for when its
// list is trained - same value as grindHelper's own default.
const MIN_TRAINING_REPEATS = 2;
// Keeps the most frequent wrong answers per character; see addGiven.
const MAX_GIVENS_PER_KEY = 6;

function emptyMemory() {
  return { version: SCHEMA_VERSION, [KANA]: {}, [KANJI]: {} };
}

// Read once then served from memory: recordAnswers runs on every single
// answer in every exercise, so it must not re-parse localStorage each
// time. persist() is the only writer.
let cache = null;

function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.version === SCHEMA_VERSION) {
      cache = { version: SCHEMA_VERSION, [KANA]: parsed[KANA] || {}, [KANJI]: parsed[KANJI] || {} };
    } else if (parsed && parsed.version === 1 && parsed.chars) {
      // v1 was kana-only, under `chars`. Cheap enough to carry over rather
      // than throw away someone's practice history.
      cache = { version: SCHEMA_VERSION, [KANA]: parsed.chars, [KANJI]: {} };
    } else {
      cache = emptyMemory();
    }
  } catch (e) {
    cache = emptyMemory(); /* private mode, or a corrupted value */
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) { /* private mode - the memory still works for this session */ }
}

function bucket(kind) {
  const memory = load();
  return memory[kind === KANJI ? KANJI : KANA];
}

function addGiven(entry, given) {
  const key = String(given).trim().toLowerCase();
  if (!key) return;
  entry.givens[key] = (entry.givens[key] || 0) + 1;
  const keys = Object.keys(entry.givens);
  if (keys.length <= MAX_GIVENS_PER_KEY) return;

  // Evict the rarest OTHER answer. Excluding the one just typed is the
  // whole point: dropping the rarest outright would, once six answers are
  // stored and all tied at one occurrence, evict whatever was just typed
  // every single time - six old one-off typos would permanently lock out
  // the systematic confusion the user is making right now. On a tie the
  // oldest goes, since the counts are what rank them and recency breaks
  // the rest.
  let victim = null;
  keys.forEach(k => {
    if (k === key) return;
    if (victim === null || entry.givens[k] < entry.givens[victim]) victim = k;
  });
  if (victim !== null) delete entry.givens[victim];
}

// Takes the exact record shape the exercises already build for their
// per-session charts: { kana, romaji, given, isCorrect }. Extra fields
// (elapsedMs) are ignored, so call sites can pass their existing objects
// straight through. `kana` holds the kanji character for KANJI records -
// that field name is the exercises' own, kept as-is rather than renamed
// across five call sites.
export function recordAnswers(records, kind = KANA) {
  if (!records || !records.length) return;
  const chars = bucket(kind);
  let touched = false;

  records.forEach(record => {
    const { kana, romaji, given, isCorrect } = record || {};
    if (!kana) return;

    let entry = chars[kana];
    // A character with a clean record isn't worth storing. It also means
    // `right` counts the recoveries SINCE the first miss - the number the
    // list actually cares about - rather than a lifetime total dominated
    // by easy hits long before the character got hard.
    if (!entry) {
      if (isCorrect) return;
      entry = chars[kana] = { romaji: romaji || '', wrong: 0, right: 0, debt: 0, givens: {}, lastMissAt: 0 };
    }
    if (romaji && !entry.romaji) entry.romaji = romaji;

    if (isCorrect) {
      entry.right++;
      entry.debt = Math.max(0, entry.debt - 1);
    } else {
      entry.wrong++;
      entry.debt = Math.min(entry.debt + DEBT_PER_MISS, MAX_DEBT);
      entry.lastMissAt = Date.now();
      // Stage 4's garbled-answer path has no attributable given; the miss
      // still counts, there's just no wrong answer to show for it.
      if (given) addGiven(entry, given);
    }
    touched = true;
  });

  if (touched) persist();
}

// Worst first: debt leads (how much work the character still needs), then
// lifetime misses, then recency - so the menu preview and the training
// session both start from what hurts most.
function byWorst(a, b) {
  return (b.debt - a.debt) || (b.wrong - a.wrong) || (b.lastMissAt - a.lastMissAt);
}

export function getMistakeEntries(kind = KANA) {
  const chars = bucket(kind);
  return Object.keys(chars)
    .map(key => {
      const entry = chars[key];
      return {
        kana: key,
        romaji: entry.romaji,
        wrong: entry.wrong,
        right: entry.right,
        debt: entry.debt,
        lastMissAt: entry.lastMissAt,
        // Nothing is ever dropped from the list - this only says whether
        // the character currently owes anything, which the menu dims and
        // the sort puts last.
        recovered: entry.debt === 0,
        givens: Object.keys(entry.givens)
          .map(given => ({ given, count: entry.givens[given] }))
          .sort((x, y) => y.count - x.count)
      };
    })
    .sort(byWorst);
}

export function getMistakeKeys(kind = KANA) {
  return getMistakeEntries(kind).map(entry => entry.kana);
}

// The weighting a training session runs on: { key: correct answers needed
// before it stops coming back }, handed to GrindHelper.start(). A
// character three misses deep owes 6 and so comes back around 6 times, one
// missed once owes 2 - "the more you got it wrong, the more you see it" -
// and one that has fully recovered still gets its MIN_TRAINING_REPEATS
// refresher rather than a single pass.
export function getMasteryByKey(kind = KANA) {
  const mastery = {};
  getMistakeEntries(kind).forEach(entry => {
    mastery[entry.kana] = Math.min(Math.max(entry.debt, MIN_TRAINING_REPEATS), MAX_DEBT);
  });
  return mastery;
}

// How many of the remembered characters still owe something. The list
// keeps everything, so this is what tells the user whether there is
// anything urgent left in it.
export function getShakyCount(kind = KANA) {
  return getMistakeEntries(kind).filter(entry => !entry.recovered).length;
}

export function getDebt(key, kind = KANA) {
  const entry = bucket(kind)[key];
  return entry ? entry.debt : 0;
}

// Clears one namespace only: forgetting the kana list from the kana menu
// must not wipe the kanji one, which has its own button elsewhere.
export function clearMistakeMemory(kind = KANA) {
  const memory = load();
  memory[kind === KANJI ? KANJI : KANA] = {};
  persist();
}
