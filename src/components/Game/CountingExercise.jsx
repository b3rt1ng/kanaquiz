import React, { Component } from 'react';
import { randomCountingNumber, numberToKanji, numberToRomaji, parseCountingInput, MAX_COUNTING_NUMBER } from '../../data/numbers';
import { playWrongSound, playComboSound, playComboBreakSound, playSpellingNoteSound } from '../../data/soundEffects';
import { playNumberPronunciation, stopNumberPronunciation, hasNumberAudio } from '../../data/numberVoice';
import { getEffectSettings } from '../../data/effectSettings';
import { GrindHelper, requeueAfter } from '../../data/grindHelper';
import { shuffle } from '../../data/helperFuncs';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import './CountingExercise.scss';

const QUESTION_COUNT = 15;

// Picking a ceiling is the whole point of the opening screen: 万 only turns
// up from 10,000, but a flat draw over the full range would make almost
// every question eight digits long (~55 characters of romaji), which is
// exhausting rather than instructive. So the ranges are offered as levels,
// the way stage 4 offers word lengths.
// The opening screen is two sliders, so any window inside 1 - 99,999,999
// can be dialled in. They move on a LOG scale: linearly, everything below
// a million would be crammed into the last few pixels of the track, and
// the 1-9999 range - the one you actually start from - would be
// unreachable. Each notch is rounded to two significant figures, which
// keeps the readouts tidy and still lands exactly on the round values that
// matter (10,000, where 万 begins, sits dead on the middle of the track).
const SLIDER_STEPS = 1000;
const DECADES = Math.log10(MAX_COUNTING_NUMBER + 1); // 8

function roundSignificant(x) {
  if (x < 10) return Math.max(1, Math.round(x));
  const mag = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / mag) * mag;
}

function sliderToNumber(t) {
  const raw = Math.pow(10, (t / SLIDER_STEPS) * DECADES);
  return Math.min(MAX_COUNTING_NUMBER, Math.max(1, roundSignificant(raw)));
}

function numberToSlider(n) {
  return Math.round((Math.log10(n) / DECADES) * SLIDER_STEPS);
}

const MAN = 10000;

// Decade marks along the ruler. Their positions come from the same log
// mapping the handles use, so a label always sits exactly under the value
// it names. 万 is flagged because it's the threshold the exercise is about.
const TICKS = [
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 100, label: '100' },
  { value: 1000, label: '1K' },
  { value: MAN, label: '10K', man: true },
  { value: 100000, label: '100K' },
  { value: 1000000, label: '1M' },
  { value: 10000000, label: '10M' },
  { value: MAX_COUNTING_NUMBER, label: '100M' }
];

function sliderPercent(n) {
  return (numberToSlider(n) / SLIDER_STEPS) * 100;
}
const DEFAULT_RANGE = { min: 1, max: 99999 };
const RANGE_STORAGE_KEY = 'countingRange';

function loadRange() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY));
    if (saved && saved.min >= 1 && saved.max <= MAX_COUNTING_NUMBER && saved.min <= saved.max) return saved;
  } catch (e) { /* unreadable or absent - fall through to the default */ }
  return DEFAULT_RANGE;
}

// Cycles the question list through every digit width the chosen window
// spans, rather than drawing flat across it. A flat draw is dominated by
// the widest numbers - over 1 - 99,999,999 it lands on eight digits about
// 99% of the time - so a wide window would only ever ask its longest
// question. Where the window covers a single width this degenerates to a
// plain uniform draw, which is what it should be.
function buildQuestionList({ min, max }) {
  const loDigits = String(min).length;
  const hiDigits = String(max).length;
  const widths = hiDigits - loDigits + 1;
  const list = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const digits = loDigits + (i % widths);
    list.push(randomCountingNumber(
      Math.max(min, Math.pow(10, digits - 1)),
      Math.min(max, Math.pow(10, digits) - 1)
    ));
  }
  shuffle(list);
  return list;
}

// Eight digits in a row are unreadable; Japanese writes the digits with the
// same 3-digit commas as everywhere else (the FOUR-digit 万 grouping is a
// fact about the reading, not about how the figure is printed).
function groupDigits(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Cheat-sheet shown from the "?" in the header - see numbers.js for the
// actual reading rules this documents.
function CountingHelp() {
  const digitRows = [
    ['1', 'ichi', '一'], ['2', 'ni', '二'], ['3', 'san', '三'],
    ['4', 'yon / shi', '四'], ['5', 'go', '五'], ['6', 'roku', '六'],
    ['7', 'nana / shichi', '七'], ['8', 'hachi', '八'], ['9', 'kyuu / ku', '九']
  ];

  return (
    <div className="counting-help">
      <p className="counting-help-title">How to type</p>
      <p className="counting-help-intro">
        Type the reading as one word, no spaces (long vowels are doubled - it's
        <strong> juu</strong>, not "jiuu"). Press Enter to check.
      </p>
      <table className="counting-help-table">
        <tbody>
          {digitRows.map(([n, romaji, kanji]) => (
            <tr key={n}>
              <td>{n}</td>
              <td>{romaji}</td>
              <td>{kanji}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="counting-help-notes">
        <li><strong>10</strong> = juu (十)</li>
        <li><strong>100</strong> = hyaku (百) - but 300 = sanbyaku, 600 = roppyaku, 800 = happyaku</li>
        <li><strong>1000</strong> = sen (千) - but 3000 = sanzen, 8000 = hassen</li>
        <li>
          <strong>10000</strong> = ichiman (一万) - 万 always needs a number in
          front of it, so it's never a bare "man". No sound changes of its own:
          sanman, rokuman, hachiman. Above it, the multiplier fuses as usual -
          8,000,000 = happyakuman (八百万).
        </li>
      </ul>
      <p className="counting-help-example">Example: 2945 → <strong>nisenkyuuhyakuyonjuugo</strong> → 二千九百四十五</p>
      <p className="counting-help-example">
        With 万: 12,345 → <strong>ichimannisensanbyakuyonjuugo</strong> → 一万二千三百四十五
      </p>
      <p className="counting-help-example">
        Typing the plain form (e.g. "hachihyaku" for 800) still counts as
        correct - you'll just get a note showing the standard spelling. After
        each answer you can replay the number you just wrote, below the
        input - but not the current one, that'd be cheating!
      </p>
    </div>
  );
}

class CountingExercise extends Component {
  constructor(props) {
    super(props);
    // null until a range is picked - see renderRangePicker.
    this.numbers = [];
    this.state = {
      // null until the range is confirmed - see renderRangePicker. The
      // bounds themselves live in rangeMin/rangeMax so the sliders can move
      // before the exercise starts.
      // null until the range is confirmed - see renderRangePicker. The
      // bounds themselves live in bounds so the sliders can move before the
      // exercise starts.
      range: null,
      bounds: loadRange(),
      // Text held while a bound is being typed, so a half-finished entry
      // ("1", on the way to "10000") isn't clamped out from under the
      // cursor. Committed on blur or Enter, see commitBound.
      editing: { min: null, max: null },
      index: 0,
      input: '',
      results: [],
      combo: 0,
      correction: null,
      note: null,
      previousNumber: null,
      // Every correct answer counts here (not just ones that fully master a
      // number) - only shown in grind mode, see submit()/this.progressTarget.
      progressCount: 0
    };
    this.trembleRef = React.createRef();
    this.inputRef = React.createRef();
    this.grinder = new GrindHelper();
    // Populated as numbers are answered - "Grind them" hands back the kanji
    // strings from confusionPairs (the generic results-screen key), so this
    // is what maps them back to the actual numeric values to requiz.
    this.numberByKanji = {};
  }

  componentDidMount() {
    if (this.props.setHelpContent) this.props.setHelpContent(<CountingHelp />);
  }

  // Both the slider and the typed field end up here: whichever bound moved
  // wins and shoves the other, rather than refusing to cross it.
  applyBound = (which, value) => {
    this.setState(prev => ({
      bounds: which === 'min'
        ? { min: value, max: Math.max(value, prev.bounds.max) }
        : { min: Math.min(value, prev.bounds.min), max: value }
    }));
  }

  editBound = (which, text) => {
    this.setState(prev => ({ editing: { ...prev.editing, [which]: text.replace(/[^\d,]/g, '') } }));
  }

  commitBound = (which) => {
    const text = this.state.editing[which];
    this.setState(prev => ({ editing: { ...prev.editing, [which]: null } }));
    if (text === null || text === '') return; // left blank - keep what was there
    const parsed = parseInt(text.replace(/,/g, ''), 10);
    if (!Number.isFinite(parsed)) return;
    this.applyBound(which, Math.min(MAX_COUNTING_NUMBER, Math.max(1, parsed)));
  }

  setBound = (which, sliderValue) => {
    this.applyBound(which, sliderToNumber(Number(sliderValue)));
  }

  startWithRange = (range) => {
    this.grinder.reset();
    try { localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range)); } catch (e) { /* private mode */ }
    this.numbers = buildQuestionList(range);
    this.setState({
      range, index: 0, input: '', results: [], combo: 0,
      correction: null, note: null, previousNumber: null, progressCount: 0
    }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
  }

  componentWillUnmount() {
    clearTimeout(this.pronounceTimeout);
    stopNumberPronunciation();
    if (this.props.setHelpContent) this.props.setHelpContent(null);
  }

  focusInput = () => {
    if (this.inputRef.current) this.inputRef.current.focus();
  }

  handleChange = (e) => {
    this.setState({ input: e.target.value });
  }

  handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    // A wrong answer or a "right but non-standard spelling" nudge both
    // pause on the same question with a message shown below the input
    // (see render) instead of auto-advancing - the next Enter dismisses it.
    if (this.state.correction || this.state.note) this.advance();
    else this.submit();
  }

  // Plays the target's pronunciation shortly after the immediate feedback
  // sound (combo/nudge/wrong), so they don't overlap and step on each other.
  pronounceAfterAnswer = (target) => {
    if (!hasNumberAudio(target)) return;
    clearTimeout(this.pronounceTimeout);
    this.pronounceTimeout = setTimeout(() => playNumberPronunciation(target), 450);
  }

  submit = () => {
    stopNumberPronunciation();
    const target = this.numbers[this.state.index];
    const parsed = parseCountingInput(this.state.input);
    const isCorrect = parsed.complete && parsed.value === target;
    const elapsedMs = this.questionShownAt ? Math.min(Date.now() - this.questionShownAt, 30000) : 0;
    const targetKanji = numberToKanji(target);
    this.numberByKanji[targetKanji] = target;

    const hadActiveCombo = this.state.combo > 0;
    const newCombo = isCorrect ? this.state.combo + 1 : 0;

    if (isCorrect && parsed.usedRegularForm) playSpellingNoteSound();
    else if (isCorrect) playComboSound(newCombo);
    else if (hadActiveCombo) playComboBreakSound(this.state.combo);
    else playWrongSound();

    this.pronounceAfterAnswer(target);

    // Grind mode needs more than one correct answer on THIS number before
    // it counts as mastered. Normal mode is untouched: shouldRequeue only
    // ever fires when grinding, so a plain session behaves exactly as
    // before (wrong answers just show the correction message and move on,
    // no retry).
    const { shouldRequeue } = this.grinder.recordAnswer(target, isCorrect);
    if (shouldRequeue) requeueAfter(this.numbers, this.state.index, target);

    this.setState(prev => ({
      combo: newCombo,
      // Every correct answer moves the counter, whether it's a number's 1st
      // or 2nd success - see this.progressTarget.
      progressCount: prev.progressCount + (isCorrect ? 1 : 0),
      results: [...prev.results, {
        kana: targetKanji,
        romaji: numberToRomaji(target),
        given: isCorrect ? '' : (this.state.input.trim() || '(empty)'),
        isCorrect,
        elapsedMs
      }]
    }));

    if (isCorrect && parsed.usedRegularForm) {
      this.setState(
        { note: { kanji: numberToKanji(target), romaji: numberToRomaji(target) } },
        this.focusInput
      );
    } else if (isCorrect) {
      this.advance();
    } else {
      this.setState(
        { correction: { kanji: numberToKanji(target), romaji: numberToRomaji(target) } },
        this.focusInput
      );
    }
  }

  advance = () => {
    // The number just answered becomes the "previous" one available to
    // replay - never the number for the question about to be shown, so
    // there's no way to hear the answer before writing it.
    const justAnswered = this.numbers[this.state.index];
    const nextIndex = this.state.index + 1;
    if (nextIndex >= this.numbers.length) {
      this.setState({ index: nextIndex, input: '', correction: null, note: null, previousNumber: justAnswered });
      return;
    }
    this.setState({ index: nextIndex, input: '', correction: null, note: null, previousNumber: justAnswered }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
  }

  retry = () => {
    stopNumberPronunciation();
    if (this.grinder.active) {
      this.grind(this.grinder.keys);
      return;
    }
    this.numbers = buildQuestionList(this.state.range);
    this.setState({ index: 0, input: '', results: [], combo: 0, correction: null, note: null, previousNumber: null, progressCount: 0 }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
    window.scrollTo(0, 0);
  }

  // "Grind them" (passed to ResultsCharts as onGrind): rebuilds the number
  // list from the confusion pairs' own kanji-string keys (mapped back to
  // actual values via numberByKanji) instead of a fresh random draw, and
  // requires more than one correct answer per number before it's done, see
  // submit()/grindHelper.js. Reused for both the initial launch from a
  // results screen and for retry().
  grind = (kanjiStrings) => {
    const numbers = kanjiStrings.map(k => this.numberByKanji[k]).filter(n => n !== undefined);
    if (!numbers.length) return;

    stopNumberPronunciation();
    this.numbers = this.grinder.start(numbers, kanjiStrings);
    this.totalCards = this.numbers.length;
    // The denominator is the full count of correct answers required to
    // finish - e.g. 6 confused numbers needing 2 each -> 12 - not just the
    // number count.
    this.progressTarget = this.grinder.progressTarget(this.totalCards);
    this.setState({
      index: 0, input: '', results: [], combo: 0, correction: null, note: null, previousNumber: null,
      progressCount: 0
    }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
    window.scrollTo(0, 0);
  }

  buildResultsData() {
    const characterStats = {};
    const confusionPairs = {};

    this.state.results.forEach(({ kana, romaji, given, isCorrect, elapsedMs }) => {
      const prev = characterStats[kana] || { correct: 0, total: 0, timeMs: 0, romaji };
      characterStats[kana] = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        timeMs: prev.timeMs + elapsedMs,
        romaji
      };
      if (!isCorrect && given) {
        const forKana = { ...(confusionPairs[kana] || {}) };
        forKana[given] = (forKana[given] || 0) + 1;
        confusionPairs[kana] = forKana;
      }
    });

    return { characterStats, confusionPairs };
  }

  renderBoundField(which, label) {
    const edited = this.state.editing[which];
    return (
      <span className="counting-bound">
        <label className="counting-bound-label" htmlFor={'bound-field-' + which}>{label}</label>
        <input
          id={'bound-field-' + which}
          className="counting-bound-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={edited !== null ? edited : groupDigits(this.state.bounds[which])}
          onChange={e => this.editBound(which, e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={() => this.commitBound(which)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
        />
      </span>
    );
  }

  renderRangePicker() {
    const { min, max } = this.state.bounds;
    const withMan = max >= MAN;
    const lowPct = sliderPercent(min);
    const highPct = sliderPercent(max);
    // Both handles live on one track, stacked. When the low one is pushed
    // far right the two thumbs overlap, and whichever input is on top is
    // the only one still grabbable - so the low one is raised once it gets
    // there, which is the handle you'd be dragging in that situation.
    const lowOnTop = lowPct > 90;

    return (
      <div className="counting-range-picker text-center">
        <h2 className="counting-range-title">How high?</h2>
        <p className="counting-range-intro">
          Japanese counts in groups of four, not three: above 千 comes 万
          (10,000). 12,345 is <strong>ichiman</strong> nisen sanbyaku yonjuu go.
        </p>

        <div className="counting-bounds">
          {this.renderBoundField('min', 'From')}
          <span className="counting-bounds-arrow">→</span>
          {this.renderBoundField('max', 'To')}
        </div>

        <div className="counting-ruler">
          <div className="counting-ruler-track"></div>
          <div
            className="counting-ruler-span"
            style={{ left: lowPct + '%', width: (highPct - lowPct) + '%' }}
          ></div>
          <input
            className={'counting-ruler-input' + (lowOnTop ? ' on-top' : '')}
            type="range" min="0" max={SLIDER_STEPS} value={numberToSlider(min)}
            aria-label="Lowest number"
            onChange={e => this.setBound('min', e.target.value)}
          />
          <input
            className="counting-ruler-input"
            type="range" min="0" max={SLIDER_STEPS} value={numberToSlider(max)}
            aria-label="Highest number"
            onChange={e => this.setBound('max', e.target.value)}
          />
          <div className="counting-ruler-ticks">
            {TICKS.map(t => (
              <span
                key={t.value}
                className={'counting-tick' + (t.man ? ' man' : '')}
                style={{ left: sliderPercent(t.value) + '%' }}
              >
                <span className="counting-tick-mark"></span>
                <span className="counting-tick-label">{t.label}</span>
              </span>
            ))}
          </div>
        </div>

        <p className={'counting-range-man' + (withMan ? ' active' : '')}>
          {withMan
            ? <span>万 included — the longest answer here is <strong>{numberToRomaji(max)}</strong></span>
            : <span>No 万 in this range — drag past the 10K mark to bring it in</span>}
        </p>

        <p>
          <button className="btn btn-primary counting-range-start" onClick={() => this.startWithRange(this.state.bounds)}>Start</button>
        </p>
        <p><button className="btn btn-default" onClick={this.props.handleEndGame}>Back to menu</button></p>
      </div>
    );
  }

  render() {
    if (this.state.range === null) return this.renderRangePicker();
    const complete = this.state.index >= this.numbers.length;

    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'counting-tremble' + (trembleOn ? ' tremble-active' : '');

    const currentNumber = this.numbers[this.state.index];
    const preview = parseCountingInput(this.state.input);

    return (
      <div className="counting-exercise text-center">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo' + this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.lightning && <LightningEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
          {
            !complete ? (
              <div className="counting-question">
                <p className="counting-progress">
                  {this.grinder.active ? `${this.state.progressCount} / ${this.progressTarget}` : `${this.state.index + 1} / ${this.numbers.length}`}
                </p>
                <div className="counting-number">{groupDigits(currentNumber)}</div>
                <div className="counting-kanji-preview">
                  {preview.kanji || <span className="counting-kanji-placeholder">?</span>}
                  {preview.leftover && <span className="counting-leftover">{preview.leftover}</span>}
                </div>
                <input
                  ref={this.inputRef}
                  className={'counting-input' + (this.state.correction ? ' wrong' : '') + (this.state.note ? ' note' : '')}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={!!this.state.correction || !!this.state.note}
                  placeholder="type the reading, e.g. nisenkyuuhyakuyonjuugo"
                  value={this.state.input}
                  onChange={this.handleChange}
                  onKeyDown={this.handleKeyDown}
                />
                {
                  this.state.correction ? (
                    <p className="counting-correction">
                      Correct answer: <strong>{this.state.correction.kanji}</strong> ({this.state.correction.romaji}) — press Enter to continue
                    </p>
                  ) : this.state.note ? (
                    <p className="counting-note">
                      Correct! Usually spelled <strong>{this.state.note.kanji}</strong> ({this.state.note.romaji}) — press Enter to continue
                    </p>
                  ) : (
                    <p className="counting-hint">Press Enter to check</p>
                  )
                }
                {
                  this.state.previousNumber !== null && hasNumberAudio(this.state.previousNumber) && (
                    <button
                      className="btn btn-default counting-previous-button"
                      title="Replay the previous number"
                      onClick={() => playNumberPronunciation(this.state.previousNumber)}
                    >
                      <span className="glyphicon glyphicon-volume-up"></span> Previous: {this.state.previousNumber} ({numberToRomaji(this.state.previousNumber)})
                    </button>
                  )
                }
              </div>
            ) : (() => {
              const { characterStats, confusionPairs } = this.buildResultsData();
              const correctCount = this.state.results.filter(r => r.isCorrect).length;
              const total = this.state.results.length;
              const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
              return (
                <div className="counting-results">
                  <h2>Results</h2>
                  <p className="counting-score">{correctCount}/{total} correct ({percentage}%)</p>
                  <ResultsCharts characterStats={characterStats} confusionPairs={confusionPairs} onGrind={this.grind} />
                  <p>
                    <button className="btn btn-primary try-again" onClick={this.retry}>Try Again</button>
                  </p>
                  <p>
                    <button className="btn btn-default back-to-menu" onClick={this.props.handleEndGame}>Back to menu</button>
                  </p>
                </div>
              );
            })()
          }
        </div>
      </div>
    );
  }
}

export default CountingExercise;
