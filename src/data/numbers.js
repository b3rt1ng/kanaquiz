// Japanese number reading/writing logic for the Counting exercise.
// Scope: 1-9999 (no man/10000 yet - see buildCountingQuestion's range).
//
// The hundreds and thousands places have real sound-fusion in Japanese
// (300 is "sanbyaku", not "sanhyaku"; 8000 is "hassen", not "hachisen"),
// so those are stored as pre-fused whole tokens rather than composed from
// a digit + a multiplier at parse time. Tens have no such fusion (20 is
// plainly "ni" + "juu"), so those ARE composed from separate tokens.

const DIGIT_KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// [romaji, digit value]. 4/7/9 have two accepted readings (yon/shi,
// nana/shichi, kyuu/ku) - both are common as a standalone digit and don't
// trigger any sound change, so both are listed as separate tokens.
const DIGIT_TOKENS = [
  ['ichi', 1], ['ni', 2], ['san', 3], ['yon', 4], ['shi', 4], ['go', 5],
  ['roku', 6], ['nana', 7], ['shichi', 7], ['hachi', 8], ['kyuu', 9], ['ku', 9]
];

const HYAKU_KANJI = ['', '百', '二百', '三百', '四百', '五百', '六百', '七百', '八百', '九百'];
const HYAKU_TOKENS = [
  ['hyaku', 100], ['nihyaku', 200], ['sanbyaku', 300], ['yonhyaku', 400],
  ['gohyaku', 500], ['roppyaku', 600], ['nanahyaku', 700], ['happyaku', 800], ['kyuuhyaku', 900]
];

const SEN_KANJI = ['', '千', '二千', '三千', '四千', '五千', '六千', '七千', '八千', '九千'];
const SEN_TOKENS = [
  ['sen', 1000], ['nisen', 2000], ['sanzen', 3000], ['yonsen', 4000], ['gosen', 5000],
  ['rokusen', 6000], ['nanasen', 7000], ['hassen', 8000], ['kyuusen', 9000]
];

// Every recognized morpheme, longest-first so a greedy scan naturally
// prefers "kyuuhyaku" over "kyuu", "shichi" over "shi", etc.
const ALL_TOKENS = [
  ...HYAKU_TOKENS.map(([romaji, value]) => ({ romaji, value, kind: 'hyaku' })),
  ...SEN_TOKENS.map(([romaji, value]) => ({ romaji, value, kind: 'sen' })),
  ...DIGIT_TOKENS.map(([romaji, value]) => ({ romaji, value, kind: 'digit' })),
  { romaji: 'juu', value: 10, kind: 'juu' }
].sort((a, b) => b.romaji.length - a.romaji.length);

// Official kanji for a 1-9999 number, using the fixed forms (no yon/shi
// ambiguity in the OUTPUT - the preview always shows the standard reading's
// kanji regardless of which accepted romaji variant the player typed).
export function numberToKanji(n) {
  if (n <= 0 || n > 9999) return '';

  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;

  let out = '';
  if (thousands > 0) out += SEN_KANJI[thousands];
  if (hundreds > 0) out += HYAKU_KANJI[hundreds];
  if (tens > 0) out += (tens === 1 ? '十' : DIGIT_KANJI[tens] + '十');
  if (units > 0) out += DIGIT_KANJI[units];
  return out;
}

// Standard (non-alternate) romaji reading, used as the canonical answer
// shown in results/review screens.
export function numberToRomaji(n) {
  if (n <= 0 || n > 9999) return '';

  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;

  let out = '';
  if (thousands > 0) out += SEN_TOKENS[thousands - 1][0];
  if (hundreds > 0) out += HYAKU_TOKENS[hundreds - 1][0];
  if (tens > 0) out += (tens === 1 ? 'juu' : DIGIT_TOKENS.find(([, v]) => v === tens)[0] + 'juu');
  if (units > 0) out += DIGIT_TOKENS.find(([, v]) => v === units)[0];
  return out;
}

// Greedily tokenizes `input` (lowercase, no spaces) left to right, always
// taking the longest known morpheme that is literally present at the
// current position. Re-run on the whole string on every keystroke (see
// CountingExercise) rather than kept as incremental state - the strings
// involved are at most ~20 characters, so re-scanning is cheap, and it's
// what gives the "shi" -> "shichi" self-correction as more letters land.
function tokenize(input) {
  const tokens = [];
  let pos = 0;
  while (pos < input.length) {
    const match = ALL_TOKENS.find(t => input.startsWith(t.romaji, pos));
    if (!match) break; // unrecognized from here on - stop, leave the rest as leftover
    tokens.push(match);
    pos += match.romaji.length;
  }
  return { tokens, consumed: pos };
}

// Reduces a token stream into (value, kanji). Two things get combined with
// a following multiplier rather than just added:
// - any digit + "juu" -> that digit's tens place (10 has no fused forms).
// - any digit + the BARE "hyaku"/"sen" (not nihyaku/sanzen/etc, which are
//   already their own fused tokens) -> that digit's hundreds/thousands
//   place. This is what makes "hachihyaku" (regular, uncontracted) work as
//   an accepted alternate for the textbook "happyaku": a learner typing
//   the digit + multiplier literally, without knowing the euphonic
//   contraction, still lands on the right number and the right kanji -
//   only the ROMAJI shown back to them (numberToRomaji) stays the
//   textbook-correct contracted form.
function reduceTokens(tokens) {
  let value = 0;
  let kanji = '';
  let usedRegularForm = false;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const next = tokens[i + 1];

    if (t.kind === 'digit' && next && next.kind === 'sen' && next.value === 1000) {
      value += t.value * 1000;
      kanji += SEN_KANJI[t.value];
      if (t.value === 1 || t.value === 3 || t.value === 8) usedRegularForm = true;
      i += 2;
    } else if (t.kind === 'digit' && next && next.kind === 'hyaku' && next.value === 100) {
      value += t.value * 100;
      kanji += HYAKU_KANJI[t.value];
      if (t.value === 1 || t.value === 3 || t.value === 6 || t.value === 8) usedRegularForm = true;
      i += 2;
    } else if (t.kind === 'digit' && next && next.kind === 'juu') {
      value += t.value * 10;
      kanji += (t.value === 1 ? '十' : DIGIT_KANJI[t.value] + '十');
      i += 2;
    } else if (t.kind === 'hyaku') {
      value += t.value;
      kanji += HYAKU_KANJI[t.value / 100];
      i++;
    } else if (t.kind === 'sen') {
      value += t.value;
      kanji += SEN_KANJI[t.value / 1000];
      i++;
    } else if (t.kind === 'juu') {
      value += 10;
      kanji += '十';
      i++;
    } else {
      value += t.value;
      kanji += DIGIT_KANJI[t.value];
      i++;
    }
  }
  return { value, kanji, usedRegularForm };
}

// Canonical reading split into its individual morphemes, in speaking
// order - e.g. 2945 -> ['nisen', 'kyuuhyaku', 'yon', 'juu', 'go']. Used to
// pronounce a number by playing pre-recorded morpheme clips back to back
// (see numberVoice.js) instead of needing one clip per possible number.
export function numberToMorphemes(n) {
  if (n <= 0 || n > 9999) return [];

  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;

  const morphemes = [];
  if (thousands > 0) morphemes.push(SEN_TOKENS[thousands - 1][0]);
  if (hundreds > 0) morphemes.push(HYAKU_TOKENS[hundreds - 1][0]);
  if (tens > 0) {
    if (tens > 1) morphemes.push(DIGIT_TOKENS.find(([, v]) => v === tens)[0]);
    morphemes.push('juu');
  }
  if (units > 0) morphemes.push(DIGIT_TOKENS.find(([, v]) => v === units)[0]);
  return morphemes;
}

// Live parse of whatever the player has typed so far. Returns the running
// kanji preview, the numeric value parsed so far, whether the WHOLE input
// was consumed (no leftover unrecognized text), and the leftover text (if
// any) so the UI can flag it instead of silently ignoring it.
export function parseCountingInput(rawInput) {
  const input = rawInput.trim().toLowerCase();
  if (!input) return { value: 0, kanji: '', complete: false, leftover: '', usedRegularForm: false };

  const { tokens, consumed } = tokenize(input);
  const { value, kanji, usedRegularForm } = reduceTokens(tokens);
  return {
    value,
    kanji,
    complete: consumed === input.length && tokens.length > 0,
    leftover: input.slice(consumed),
    usedRegularForm
  };
}

export function randomCountingNumber() {
  return 1 + Math.floor(Math.random() * 9999);
}
