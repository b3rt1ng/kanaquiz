import React, { Component } from 'react';
import { kanjiDictionary, isReadingCorrect, primaryReadingKana } from '../../data/kanjiDictionary';
import { parseRomajiToKana } from '../../data/kanaTransliteration';
import { playWrongSound, playComboSound, playComboBreakSound, playApplauseSound } from '../../data/soundEffects';
import { playKanjiPronunciation, stopKanjiPronunciation, hasKanjiAudio } from '../../data/kanjiVoice';
import { pickCompliment } from '../../data/compliments';
import { getEffectSettings } from '../../data/effectSettings';
import { shuffle } from '../../data/helperFuncs';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import ComplimentPopup, { buildCompliment } from './ComplimentPopup';
import Confetti from './Confetti';
import './KanjiExercise.scss';

const THEME_KEYS = Object.keys(kanjiDictionary);

function buildCards(selectedThemes) {
  const cards = [];
  selectedThemes.forEach(theme => cards.push(...kanjiDictionary[theme].kanji));
  shuffle(cards);
  return cards;
}

class KanjiExercise extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phase: 'picker', // 'picker' | 'quiz' | 'results'
      selectedThemes: [],
      correctLaterEnabled: true,
      index: 0, // which card is being tested - also drives the front face (kanji)
      revealIndex: 0, // which card's answer drives the back face - lags behind
                       // `index` during the unflip transition, see advance()
      input: '',
      flipped: false,
      isCorrect: null,
      results: [],
      combo: 0,
      compliment: null,
      celebrate: false
    };
    this.complimentSeq = 0;
    this.celebrateSeq = 0;
    this.trembleRef = React.createRef();
    this.inputRef = React.createRef();
    this.cardRef = React.createRef();
    this.cards = [];
  }

  componentWillUnmount() {
    clearTimeout(this.complimentTimeout);
    clearTimeout(this.flipFallbackTimeout);
    clearTimeout(this.celebrateTimeout);
    clearTimeout(this.pronounceTimeout);
    stopKanjiPronunciation();
    // Belt-and-suspenders: Game.jsx also stops the timer on its own unmount,
    // but that only covers leaving the whole exercise - this covers leaving
    // mid-quiz too, so the timer never keeps running behind a picker screen.
    this.props.stopTimer();
  }

  focusInput = () => {
    if (this.inputRef.current) this.inputRef.current.focus();
  }

  toggleTheme = (theme) => {
    this.setState(prev => {
      const has = prev.selectedThemes.includes(theme);
      return {
        selectedThemes: has
          ? prev.selectedThemes.filter(t => t !== theme)
          : [...prev.selectedThemes, theme]
      };
    });
  }

  selectAllThemes = () => {
    this.setState({ selectedThemes: [...THEME_KEYS] });
  }

  selectNoThemes = () => {
    this.setState({ selectedThemes: [] });
  }

  toggleCorrectLater = () => {
    this.setState(prev => ({ correctLaterEnabled: !prev.correctLaterEnabled }));
  }

  startQuiz = () => {
    if (this.state.selectedThemes.length === 0) return;
    // The picker is treated like any other menu screen (no timer running) -
    // it only starts once the user actually leaves it for the quiz itself.
    this.props.startTimer();
    this.cards = buildCards(this.state.selectedThemes);
    // Captured once, before any "Correct Later" retries can grow
    // this.cards - the progress display's denominator should stay put at
    // the deck's real size (e.g. 35/50), not creep up to 36/51 just
    // because a miss requeued a card.
    this.totalCards = this.cards.length;
    this.setState({
      phase: 'quiz',
      index: 0,
      revealIndex: 0,
      input: '',
      flipped: false,
      isCorrect: null,
      results: [],
      combo: 0
    }, () => {
      this.questionShownAt = Date.now();
      this.focusInput();
    });
  }

  // Compliments here are visual-only (no playComplimentVoice) - the kanji's
  // own reading is already voiced shortly after (see pronounceAfterAnswer),
  // and having both talk over each other was too much.
  showCompliment = (isFast, combo) => {
    clearTimeout(this.complimentTimeout);
    this.complimentSeq++;
    const compliment = buildCompliment(pickCompliment(isFast), combo);
    this.setState({ compliment });
    this.complimentTimeout = setTimeout(() => {
      this.setState({ compliment: null });
    }, 1500);
  }

  handleChange = (e) => {
    this.setState({ input: e.target.value });
  }

  // Enter presses are ignored entirely while the card is mid-flip (either
  // direction) - besides being generally sane, this is what guarantees the
  // unflip in advance() always starts from a fully-settled 180deg card, so
  // its own transitionend timing stays predictable (see advance()).
  handleKeyDown = (e) => {
    if (e.key !== 'Enter' || this.transitioning) return;
    if (this.state.flipped) this.advance();
    else this.submit();
  }

  waitForFlipTransition = (onDone) => {
    this.transitioning = true;
    clearTimeout(this.flipFallbackTimeout);

    const settle = () => {
      this.transitioning = false;
      clearTimeout(this.flipFallbackTimeout);
      if (this.cardRef.current) this.cardRef.current.removeEventListener('transitionend', onTransitionEnd);
      onDone();
    };
    const onTransitionEnd = (e) => {
      if (e.propertyName === 'transform') settle();
    };

    if (this.cardRef.current) this.cardRef.current.addEventListener('transitionend', onTransitionEnd);
    // Safety net: if transitionend never fires for some reason (reduced
    // motion, a backgrounded tab, ...), don't leave the card stuck unable
    // to advance - the CSS transition is 500ms, so anything past that is
    // already an anomaly.
    this.flipFallbackTimeout = setTimeout(settle, 900);
  }

  // Plays the kanji's reading shortly after the immediate feedback sound,
  // so they don't collide - mirrors CountingExercise's pronounceAfterAnswer.
  // Unlike the counting exercise, there's no "hearing the answer early"
  // concern here: the card flip already reveals the reading as text
  // regardless of right or wrong, so playing it is never a spoiler.
  pronounceAfterAnswer = (entry) => {
    if (!hasKanjiAudio(entry.kanji)) return;
    clearTimeout(this.pronounceTimeout);
    this.pronounceTimeout = setTimeout(() => playKanjiPronunciation(entry.kanji), 450);
  }

  submit = () => {
    stopKanjiPronunciation();
    const entry = this.cards[this.state.index];
    const isCorrect = isReadingCorrect(entry, this.state.input);
    const elapsedMs = this.questionShownAt ? Math.min(Date.now() - this.questionShownAt, 30000) : 0;

    const hadActiveCombo = this.state.combo > 0;
    const newCombo = isCorrect ? this.state.combo + 1 : 0;

    if (isCorrect) playComboSound(newCombo);
    else if (hadActiveCombo) playComboBreakSound(this.state.combo);
    else playWrongSound();

    this.pronounceAfterAnswer(entry);

    if (isCorrect) this.showCompliment(elapsedMs < 1000, newCombo);

    // "Correct Later": a missed card isn't removed from the deck - a
    // second copy gets slotted in at a random spot somewhere later in the
    // still-unseen part of `this.cards` (never immediately next, so it
    // doesn't just test short-term memory), extending the session until
    // every card has been gotten right at least once. `this.cards` is a
    // plain mutable array (not React state - see buildCards), so this
    // splice is picked up naturally next time index advances into it.
    if (!isCorrect && this.state.correctLaterEnabled) {
      const from = this.state.index + 1;
      const insertAt = from + Math.floor(Math.random() * (this.cards.length - from + 1));
      this.cards.splice(insertAt, 0, entry);
    }

    this.waitForFlipTransition(() => {});

    this.setState(prev => ({
      combo: newCombo,
      flipped: true,
      isCorrect,
      results: [...prev.results, {
        kana: entry.kanji,
        romaji: entry.readings[0],
        given: isCorrect ? '' : (this.state.input.trim() || '(empty)'),
        isCorrect,
        elapsedMs
      }]
    }), this.focusInput);
  }

  // Front (kanji) and back (answer) are swapped at DIFFERENT moments so
  // the content only ever changes while it's actually hidden:
  // - `index` (front face) swaps to the next card right away - safe
  //   because the card is still fully flipped at this instant, so the
  //   front face is hidden (backface-visibility) until the rotation
  //   carries it into view a moment later. That's what makes the next
  //   kanji rotate smoothly into view instead of popping in afterwards.
  // - `revealIndex` (back face) deliberately lags behind and only catches
  //   up once the rotation has FULLY finished - at that point we're
  //   looking at the front, so updating the (now hidden) back face is
  //   invisible too. Otherwise the answer for the new card would already
  //   be sitting there before we've even seen its kanji.
  advance = () => {
    const nextIndex = this.state.index + 1;
    if (nextIndex >= this.cards.length) {
      this.setState({ flipped: false });
      this.waitForFlipTransition(() => {
        this.celebrateSeq++;
        playApplauseSound();
        this.setState({ phase: 'results', celebrate: true });
        clearTimeout(this.celebrateTimeout);
        this.celebrateTimeout = setTimeout(() => this.setState({ celebrate: false }), 4000);
      });
      return;
    }

    this.setState({ index: nextIndex, input: '', isCorrect: null, flipped: false });
    this.waitForFlipTransition(() => {
      this.setState({ revealIndex: nextIndex }, () => {
        this.questionShownAt = Date.now();
        this.focusInput();
      });
    });
  }

  retry = () => {
    stopKanjiPronunciation();
    this.startQuiz();
    window.scrollTo(0, 0);
  }

  backToPicker = () => {
    stopKanjiPronunciation();
    this.props.stopTimer();
    this.setState({ phase: 'picker', selectedThemes: [] });
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

  renderPicker() {
    return (
      <div className="kanji-picker choose-characters">
        <div className="row">
          <div className="col-sm-8 col-sm-offset-2 col-xs-12">
            <div className="panel panel-default">
              <div className="panel-heading">Kanji · 漢字</div>
              <div className="panel-body selection-areas">
                {THEME_KEYS.map(theme => {
                  const { label, kanji } = kanjiDictionary[theme];
                  const selected = this.state.selectedThemes.includes(theme);
                  return (
                    <div className="choose-row" key={theme} onClick={() => this.toggleTheme(theme)}>
                      <span className={selected ? 'glyphicon glyphicon-small glyphicon-check' : 'glyphicon glyphicon-small glyphicon-unchecked'}></span>
                      {' '}<strong>{label}</strong> — {kanji.map(k => k.kanji).join(' · ')}
                    </div>
                  );
                })}
              </div>
              <div className="panel-footer text-center">
                <a href="javascript:;" onClick={this.selectAllThemes}>All</a> &nbsp;&middot;&nbsp;
                <a href="javascript:;" onClick={this.selectNoThemes}>None</a>
              </div>
            </div>
          </div>
        </div>
        <label className="kanji-correctlater-toggle">
          <input type="checkbox" checked={this.state.correctLaterEnabled} onChange={this.toggleCorrectLater} />
          <span className="kanji-correctlater-label">Correct Later</span>
          <span className="kanji-correctlater-hint">Cards you get wrong come back later, until you get them right.</span>
        </label>
        <button
          className="btn btn-primary kanji-start-button"
          disabled={this.state.selectedThemes.length === 0}
          onClick={this.startQuiz}
        >Start</button>
        <p><button className="btn btn-default" onClick={this.props.handleEndGame}>Back to menu</button></p>
      </div>
    );
  }

  renderQuiz() {
    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'kanji-tremble' + (trembleOn ? ' tremble-active' : '');

    const entry = this.cards[this.state.index]; // front face (kanji) + submit() target
    const revealEntry = this.cards[this.state.revealIndex]; // back face (answer) - see advance()
    const preview = parseRomajiToKana(this.state.input);

    return (
      <div className="kanji-exercise text-center">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo' + this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.lightning && <LightningEffect combo={this.state.combo} safeZoneRef={this.trembleRef} silentSound />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} silentSound />}
        {effects.compliments && <ComplimentPopup compliment={this.state.compliment} key={'compliment' + this.complimentSeq} />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
          <p className="kanji-progress">{this.state.results.filter(r => r.isCorrect).length} / {this.totalCards}</p>

          <div className="kanji-flip-scene">
            <div
              ref={this.cardRef}
              className={'kanji-flip-card' + (this.state.flipped ? ' flipped' : '') + (this.state.isCorrect === false ? ' wrong' : '') + (this.state.isCorrect === true ? ' correct' : '')}
            >
              <div className="kanji-flip-face kanji-flip-front">
                <div className="kanji-flip-kanji">{entry.kanji}</div>
              </div>
              <div className="kanji-flip-face kanji-flip-back">
                <div className="kanji-flip-kana">{primaryReadingKana(revealEntry)}</div>
                <div className="kanji-flip-romaji">{revealEntry.readings[0]}</div>
                <div className="kanji-flip-meaning">{revealEntry.meaning}</div>
              </div>
            </div>
          </div>

          <div className="kanji-kana-preview">
            {preview.kana || <span className="kanji-kana-placeholder">?</span>}
            {preview.leftover && <span className="kanji-leftover">{preview.leftover}</span>}
          </div>
          <input
            ref={this.inputRef}
            className={'kanji-input' + (this.state.isCorrect === false ? ' wrong' : '') + (this.state.isCorrect === true ? ' correct' : '')}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            readOnly={this.state.flipped}
            placeholder="type the reading, e.g. taberu"
            value={this.state.input}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
          />
          <p className="kanji-hint">{this.state.flipped ? 'Press Enter to continue' : 'Press Enter to check'}</p>
        </div>
      </div>
    );
  }

  renderResults() {
    const { characterStats, confusionPairs } = this.buildResultsData();
    const correctCount = this.state.results.filter(r => r.isCorrect).length;
    const total = this.state.results.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="kanji-results">
        {this.state.celebrate && <Confetti key={'confetti' + this.celebrateSeq} />}
        <h2>Results</h2>
        <p className="kanji-score">{correctCount}/{total} correct ({percentage}%)</p>
        <ResultsCharts characterStats={characterStats} confusionPairs={confusionPairs} />
        <p>
          <button className="btn btn-primary try-again" onClick={this.retry}>Try Again</button>
        </p>
        <p>
          <button className="btn btn-default" onClick={this.backToPicker}>Choose different themes</button>
        </p>
        <p>
          <button className="btn btn-default back-to-menu" onClick={this.props.handleEndGame}>Back to menu</button>
        </p>
      </div>
    );
  }

  render() {
    if (this.state.phase === 'picker') return this.renderPicker();
    if (this.state.phase === 'results') return this.renderResults();
    return this.renderQuiz();
  }
}

export default KanjiExercise;
