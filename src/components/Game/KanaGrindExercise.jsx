import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { findRomajisAtKanaKey, arrayContains } from '../../data/helperFuncs';
import { playCorrectSound, playWrongSound, playApplauseSound } from '../../data/soundEffects';
import { pickCompliment } from '../../data/compliments';
import { getEffectSettings } from '../../data/effectSettings';
import { GrindHelper, requeueAfter } from '../../data/grindHelper';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import ComplimentPopup, { buildCompliment } from './ComplimentPopup';
import Confetti from './Confetti';
import './KanaGrindExercise.scss';

// "Grind them" for the kana stages (Question 1-4) and the Table exercise:
// unlike those, there's no fixed deck/results screen to hang this off of -
// Question draws a random question each time and its stats live in
// GameContainer's global state, so this is its own small, self-contained
// typed-answer quiz (closest in shape to CountingExercise), only ever
// reached via a results screen's "Grind them" button, never from the main
// menu. Always typed-answer, regardless of which stage(s) the confused
// characters came from - simplest common ground across stages 1/2's
// multiple choice and 3/4's typing.
class KanaGrindExercise extends Component {
  constructor(props) {
    super(props);
    this.grinder = new GrindHelper();
    this.cards = this.grinder.start((props.kanaKeys || []).slice(), props.kanaKeys || []);
    this.totalCards = this.cards.length;
    this.progressTarget = this.grinder.progressTarget(this.totalCards);
    this.state = {
      index: 0,
      input: '',
      isCorrect: null,
      results: [],
      combo: 0,
      compliment: null,
      progressCount: 0,
      celebrate: false
    };
    this.complimentSeq = 0;
    this.celebrateSeq = 0;
    this.trembleRef = React.createRef();
    this.inputRef = React.createRef();
  }

  componentDidMount() {
    this.props.startTimer();
    this.questionShownAt = Date.now();
    this.focusInput();
  }

  componentWillUnmount() {
    clearTimeout(this.complimentTimeout);
    clearTimeout(this.celebrateTimeout);
    this.props.stopTimer();
  }

  focusInput = () => {
    if (this.inputRef.current) this.inputRef.current.focus();
  }

  handleChange = (e) => {
    this.setState({ input: e.target.value });
  }

  handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (this.state.isCorrect !== null) this.advance();
    else this.submit();
  }

  showCompliment = (isFast, combo) => {
    clearTimeout(this.complimentTimeout);
    this.complimentSeq++;
    const compliment = buildCompliment(pickCompliment(isFast), combo);
    this.setState({ compliment });
    this.complimentTimeout = setTimeout(() => {
      this.setState({ compliment: null });
    }, 1500);
  }

  submit = () => {
    const kana = this.cards[this.state.index];
    const acceptable = findRomajisAtKanaKey(kana, kanaDictionary);
    const isCorrect = arrayContains(this.state.input.trim().toLowerCase(), acceptable);
    const elapsedMs = this.questionShownAt ? Math.min(Date.now() - this.questionShownAt, 30000) : 0;

    const newCombo = isCorrect ? this.state.combo + 1 : 0;

    if (isCorrect) playCorrectSound();
    else playWrongSound();

    if (isCorrect) this.showCompliment(elapsedMs < 1000, newCombo);

    const { shouldRequeue } = this.grinder.recordAnswer(kana, isCorrect);
    if (shouldRequeue) requeueAfter(this.cards, this.state.index, kana);

    this.setState(prev => ({
      combo: newCombo,
      isCorrect,
      // Every correct answer moves the counter, whether it's a
      // character's 1st or 2nd success - see this.progressTarget.
      progressCount: prev.progressCount + (isCorrect ? 1 : 0),
      results: [...prev.results, {
        kana,
        romaji: acceptable[0],
        given: isCorrect ? '' : (this.state.input.trim() || '(empty)'),
        isCorrect,
        elapsedMs
      }]
    }), this.focusInput);
  }

  advance = () => {
    const nextIndex = this.state.index + 1;
    if (nextIndex >= this.cards.length) {
      this.props.stopTimer();
      this.celebrateSeq++;
      playApplauseSound();
      this.setState({ index: nextIndex, input: '', isCorrect: null, celebrate: true });
      clearTimeout(this.celebrateTimeout);
      this.celebrateTimeout = setTimeout(() => this.setState({ celebrate: false }), 4000);
      window.scrollTo(0, 0);
      return;
    }
    this.setState({ index: nextIndex, input: '', isCorrect: null }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
  }

  retry = () => {
    this.grind(this.grinder.keys);
  }

  // Reused both for the very first launch (constructor) and for
  // subsequent re-grinds triggered from THIS exercise's own results
  // screen (retry(), or a "Grind them" on a still-confusing subset).
  grind = (kanaKeys) => {
    const valid = kanaKeys.filter(k => findRomajisAtKanaKey(k, kanaDictionary).length > 0);
    if (!valid.length) return;

    this.props.startTimer();
    this.cards = this.grinder.start(valid.slice(), kanaKeys);
    this.totalCards = this.cards.length;
    this.progressTarget = this.grinder.progressTarget(this.totalCards);
    this.setState({ index: 0, input: '', isCorrect: null, results: [], combo: 0, progressCount: 0 }, () => {
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
    const complete = this.state.index >= this.cards.length;

    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'kana-grind-tremble' + (trembleOn ? ' tremble-active' : '');

    return (
      <div className="kana-grind-exercise text-center">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo' + this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.lightning && <LightningEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.compliments && <ComplimentPopup compliment={this.state.compliment} key={'compliment' + this.complimentSeq} />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
          {
            !complete ? (
              <div className="kana-grind-question">
                <p className="kana-grind-progress">{this.state.progressCount} / {this.progressTarget}</p>
                <div className="kana-grind-glyph">{this.cards[this.state.index]}</div>
                <input
                  ref={this.inputRef}
                  className={'kana-grind-input' + (this.state.isCorrect === false ? ' wrong' : '') + (this.state.isCorrect === true ? ' correct' : '')}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={this.state.isCorrect !== null}
                  placeholder="type the reading"
                  value={this.state.input}
                  onChange={this.handleChange}
                  onKeyDown={this.handleKeyDown}
                />
                {
                  this.state.isCorrect === false ? (
                    <p className="kana-grind-correction">
                      Correct answer: <strong>{findRomajisAtKanaKey(this.cards[this.state.index], kanaDictionary)[0]}</strong> — press Enter to continue
                    </p>
                  ) : (
                    <p className="kana-grind-hint">{this.state.isCorrect === true ? 'Press Enter to continue' : 'Press Enter to check'}</p>
                  )
                }
              </div>
            ) : (() => {
              const { characterStats, confusionPairs } = this.buildResultsData();
              const correctCount = this.state.results.filter(r => r.isCorrect).length;
              const total = this.state.results.length;
              const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
              return (
                <div className="kana-grind-results">
                  {this.state.celebrate && effects.confetti !== false && <Confetti key={'confetti' + this.celebrateSeq} />}
                  <h2>Results</h2>
                  <p className="kana-grind-score">{correctCount}/{total} correct ({percentage}%)</p>
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

export default KanaGrindExercise;
