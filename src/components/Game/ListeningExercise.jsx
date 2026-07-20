import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { findRomajisAtKanaKey, arrayContains, shuffle, getSelectedKanaKeys } from '../../data/helperFuncs';
import { playWrongSound, playComboSound, playComboBreakSound } from '../../data/soundEffects';
import { playKana, stopKana, hasKanaAudio } from '../../data/kanaVoice';
import { getEffectSettings } from '../../data/effectSettings';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import './ListeningExercise.scss';

function buildQuestionList(decidedGroups) {
  const keys = [];
  Object.keys(kanaDictionary).forEach(type => {
    keys.push(...getSelectedKanaKeys(type, decidedGroups));
  });
  shuffle(keys);
  return keys;
}

// 2 wrong romaji options drawn from the same selected pool, skipping any
// that share a romaji with the correct answer or with each other.
function buildOptions(kana, pool) {
  const correctRomajis = findRomajisAtKanaKey(kana, kanaDictionary);
  const candidates = pool.filter(k => k !== kana);
  shuffle(candidates);

  const options = [correctRomajis[0]];
  const usedRomajis = new Set(correctRomajis);
  for (const candidate of candidates) {
    if (options.length >= 3) break;
    const romaji = findRomajisAtKanaKey(candidate, kanaDictionary)[0];
    if (usedRomajis.has(romaji)) continue;
    usedRomajis.add(romaji);
    options.push(romaji);
  }
  shuffle(options);
  return options;
}

class ListeningExercise extends Component {
  constructor(props) {
    super(props);
    this.questions = buildQuestionList(props.decidedGroups);
    this.state = {
      index: 0,
      options: [],
      selected: null,
      results: [],
      combo: 0
    };
    this.trembleRef = React.createRef();
  }

  componentDidMount() {
    this.setOptions();
    this.playCurrent();
  }

  componentWillUnmount() {
    clearTimeout(this.advanceTimeout);
    stopKana();
  }

  setOptions = () => {
    const kana = this.questions[this.state.index];
    this.setState({ options: buildOptions(kana, this.questions) });
    this.questionShownAt = Date.now();
  }

  playCurrent = () => {
    playKana(this.questions[this.state.index]);
  }

  handleAnswer = (given) => {
    if(this.state.selected) return; // already answered, waiting to advance

    const kana = this.questions[this.state.index];
    const acceptable = findRomajisAtKanaKey(kana, kanaDictionary);
    const isCorrect = arrayContains(given, acceptable);
    const elapsedMs = this.questionShownAt ? Math.min(Date.now() - this.questionShownAt, 30000) : 0;

    const hadActiveCombo = this.state.combo > 0;
    const newCombo = isCorrect ? this.state.combo + 1 : 0;

    if(isCorrect) playComboSound(newCombo);
    else if(hadActiveCombo) playComboBreakSound(this.state.combo);
    else playWrongSound();

    this.setState(prev => ({
      selected: given,
      combo: newCombo,
      results: [...prev.results, { kana, romaji: acceptable[0], given: isCorrect ? '' : given, isCorrect, elapsedMs }]
    }));

    this.advanceTimeout = setTimeout(this.advance, 700);
  }

  advance = () => {
    const nextIndex = this.state.index + 1;
    if(nextIndex >= this.questions.length) {
      this.setState({ index: nextIndex, selected: null });
      return;
    }
    this.setState({ index: nextIndex, selected: null }, () => {
      this.setOptions();
      this.playCurrent();
    });
  }

  retry = () => {
    this.questions = buildQuestionList(this.props.decidedGroups);
    this.setState({ index: 0, results: [], selected: null, combo: 0 }, () => {
      this.setOptions();
      this.playCurrent();
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
      if(!isCorrect && given) {
        const forKana = { ...(confusionPairs[kana] || {}) };
        forKana[given] = (forKana[given] || 0) + 1;
        confusionPairs[kana] = forKana;
      }
    });

    return { characterStats, confusionPairs };
  }

  render() {
    const complete = this.state.index >= this.questions.length;

    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'listening-tremble' + (trembleOn ? ' tremble-active' : '');

    const currentKana = this.questions[this.state.index];
    const acceptable = currentKana ? findRomajisAtKanaKey(currentKana, kanaDictionary) : [];

    return (
      <div className="listening-exercise text-center">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo'+this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.lightning && <LightningEffect combo={this.state.combo} safeZoneRef={this.trembleRef} silentSound />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} silentSound />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
          {
            !complete ? (
              <div className="listening-question">
                <p className="listening-progress">{this.state.index + 1} / {this.questions.length}</p>
                {
                  currentKana && !hasKanaAudio(currentKana) && (
                    <React.Fragment>
                      <p className="listening-warning">No recorded audio for this character - showing it instead.</p>
                      <div className="big-character">{currentKana}</div>
                    </React.Fragment>
                  )
                }
                <button className="btn btn-primary replay-button" onClick={this.playCurrent}>
                  <span className="glyphicon glyphicon-volume-up"></span> Play sound
                </button>
                <div className="listening-options">
                  {this.state.options.map(opt => {
                    let cls = 'btn btn-default answer-button';
                    if(this.state.selected) {
                      if(arrayContains(opt, acceptable)) cls += ' correct';
                      else if(opt === this.state.selected) cls += ' wrong';
                    }
                    return (
                      <button key={opt} className={cls} onClick={() => this.handleAnswer(opt)}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (() => {
              const { characterStats, confusionPairs } = this.buildResultsData();
              const correctCount = this.state.results.filter(r => r.isCorrect).length;
              const total = this.state.results.length;
              const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
              return (
                <div className="listening-results">
                  <h2>Results</h2>
                  <p className="listening-score">{correctCount}/{total} correct ({percentage}%)</p>
                  <ResultsCharts characterStats={characterStats} confusionPairs={confusionPairs} />
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

export default ListeningExercise;
