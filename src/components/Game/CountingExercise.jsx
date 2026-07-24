import React, { Component } from 'react';
import { randomCountingNumber, numberToKanji, numberToRomaji, parseCountingInput } from '../../data/numbers';
import { playWrongSound, playComboSound, playComboBreakSound, playSpellingNoteSound } from '../../data/soundEffects';
import { playNumberPronunciation, stopNumberPronunciation, hasNumberAudio } from '../../data/numberVoice';
import { getEffectSettings } from '../../data/effectSettings';
import { shuffle } from '../../data/helperFuncs';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import './CountingExercise.scss';

const QUESTION_COUNT = 15;

// "Grind them" requires this many correct answers per number (not just
// one) before it's considered mastered and stops coming back - see submit().
const GRIND_MASTERY_NEEDED = 2;

function buildQuestionList() {
  const list = [];
  for (let i = 0; i < QUESTION_COUNT; i++) list.push(randomCountingNumber());
  return list;
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
      </ul>
      <p className="counting-help-example">Example: 2945 → <strong>nisenkyuuhyakuyonjuugo</strong> → 二千九百四十五</p>
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
    this.numbers = buildQuestionList();
    this.state = {
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
    this.grindMode = false;
    // Correct-answer counts per number, reset at the start of each session.
    this.masteryCount = {};
    // Populated as numbers are answered - "Grind them" hands back the kanji
    // strings from confusionPairs (the generic results-screen key), so this
    // is what maps them back to the actual numeric values to requiz.
    this.numberByKanji = {};
  }

  componentDidMount() {
    this.questionShownAt = Date.now();
    this.focusInput();
    if (this.props.setHelpContent) this.props.setHelpContent(<CountingHelp />);
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

    // Grind mode needs GRIND_MASTERY_NEEDED correct answers on THIS number
    // (not just one) before it counts as mastered. Normal mode is
    // untouched: `shouldRequeue` only ever fires when grindMode is on, so
    // a plain session behaves exactly as before (wrong answers just show
    // the correction message and move on, no retry).
    let justMastered = false;
    if (isCorrect) {
      const needed = this.grindMode ? GRIND_MASTERY_NEEDED : 1;
      const count = (this.masteryCount[target] || 0) + 1;
      this.masteryCount[target] = count;
      justMastered = count >= needed;
    }

    if (this.grindMode && (!isCorrect || !justMastered)) {
      const from = this.state.index + 1;
      const insertAt = from + Math.floor(Math.random() * (this.numbers.length - from + 1));
      this.numbers.splice(insertAt, 0, target);
    }

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
    if (this.grindMode) {
      this.grind(this.grindKanjiStrings);
      return;
    }
    this.numbers = buildQuestionList();
    this.setState({ index: 0, input: '', results: [], combo: 0, correction: null, note: null, previousNumber: null, progressCount: 0 }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
    window.scrollTo(0, 0);
  }

  // "Grind them" (passed to ResultsCharts as onGrind): rebuilds the number
  // list from the confusion pairs' own kanji-string keys (mapped back to
  // actual values via numberByKanji) instead of a fresh random draw, and
  // requires GRIND_MASTERY_NEEDED correct answers per number before it's
  // done, see submit(). Reused for both the initial launch from a results
  // screen and for retry().
  grind = (kanjiStrings) => {
    const numbers = kanjiStrings.map(k => this.numberByKanji[k]).filter(n => n !== undefined);
    if (!numbers.length) return;
    shuffle(numbers);

    stopNumberPronunciation();
    this.grindMode = true;
    this.grindKanjiStrings = kanjiStrings;
    this.masteryCount = {};
    this.numbers = numbers;
    this.totalCards = this.numbers.length;
    // GRIND_MASTERY_NEEDED correct answers needed per number, so the
    // denominator is the full count of correct answers required to finish -
    // e.g. 6 confused numbers -> 12 - not just the number count.
    this.progressTarget = this.totalCards * GRIND_MASTERY_NEEDED;
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

  render() {
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
                  {this.grindMode ? `${this.state.progressCount} / ${this.progressTarget}` : `${this.state.index + 1} / ${this.numbers.length}`}
                </p>
                <div className="counting-number">{currentNumber}</div>
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
