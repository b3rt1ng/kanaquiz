import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { quizSettings } from '../../data/quizSettings';
import { findRomajisAtKanaKey, removeFromArray, arrayContains, shuffle, cartesianProduct, alignAnswer } from '../../data/helperFuncs';
import { playWrongSound, playStageUpSound, playComboSound, playKeySound, playComboBreakSound, playEnterDojoSound } from '../../data/soundEffects';
import { pickCompliment } from '../../data/compliments';
import { playComplimentVoice } from '../../data/complimentVoice';
import { getEffectSettings } from '../../data/effectSettings';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import LightningEffect from './LightningEffect';
import ComplimentPopup, { buildCompliment } from './ComplimentPopup';
import './Question.scss';

class Question extends Component {
  state = {
    previousQuestion: [],
    previousAnswer: '',
    currentAnswer: '',
    currentQuestion: [],
    answerOptions: [],
    stageProgress: 0,
    combo: 0,
    compliment: null
  }
  // Bumped on every answer/question so the feedback + big-character divs
  // remount (via key=) and their CSS animations replay every time, even
  // across two consecutive right/wrong answers.
  answerSeq = 0
  complimentSeq = 0
  // Read by GlitchEffect to keep its rectangles off the readable area.
  trembleRef = React.createRef()

  getRandomKanas(amount, include, exclude) {
    let randomizedKanas = this.askableKanaKeys.slice();

    if(exclude && exclude.length > 0) {
      // we're excluding previous question when deciding a new question
      randomizedKanas = removeFromArray(exclude, randomizedKanas);
    }

    if(include && include.length > 0) {
      // we arrive here when we're deciding answer options (included = currentQuestion)

      // remove included kana
      randomizedKanas = removeFromArray(include, randomizedKanas);
      shuffle(randomizedKanas);

      // cut the size to make looping quicker
      randomizedKanas = randomizedKanas.slice(0,20);

      // let's remove kanas that have the same answer as included
      let searchFor = findRomajisAtKanaKey(include, kanaDictionary)[0];
      randomizedKanas = randomizedKanas.filter(character => {
        return searchFor!=findRomajisAtKanaKey(character, kanaDictionary)[0];
      });

      // now let's remove "duplicate" kanas (if two kanas have same answers)
      let tempRandomizedKanas = randomizedKanas.slice();
      randomizedKanas = randomizedKanas.filter(r => {
        let dupeFound = false;
        searchFor = findRomajisAtKanaKey(r, kanaDictionary)[0];
        tempRandomizedKanas.shift();
        tempRandomizedKanas.forEach(w => {
          if(findRomajisAtKanaKey(w, kanaDictionary)[0]==searchFor)
            dupeFound = true;
        });
        return !dupeFound;
      });

      // alright, let's cut the array and add included to the end
      randomizedKanas = randomizedKanas.slice(0, amount-1); // -1 so we have room to add included
      randomizedKanas.push(include);
      shuffle(randomizedKanas);
    }
    else {
      shuffle(randomizedKanas);
      randomizedKanas = randomizedKanas.slice(0, amount);
    }
    return randomizedKanas;
  }

  setNewQuestion() {
    let questionCount = 1;
    if(this.props.stage==4) {
      // Use difficulty to determine number of characters
      questionCount = this.props.stage4Difficulty === 1 ? 3 :
                     this.props.stage4Difficulty === 2 ? 5 : 8;
    }

    if(this.props.stage!=4)
      this.currentQuestion = this.getRandomKanas(1, false, this.previousQuestion);
    else
      this.currentQuestion = this.getRandomKanas(questionCount, false, this.previousQuestion);
    this.answerSeq++;
    this.setState({currentQuestion: this.currentQuestion});
    this.setAnswerOptions();
    this.setAllowedAnswers();
    this.questionShownAt = Date.now(); // start timing the response
  }

  setAnswerOptions() {
    this.answerOptions = this.getRandomKanas(3, this.currentQuestion[0], false);
    this.setState({answerOptions: this.answerOptions});
  }

  setAllowedAnswers() {
    this.allowedAnswers = [];
    if(this.props.stage==1 || this.props.stage==3)
      this.allowedAnswers = findRomajisAtKanaKey(this.currentQuestion, kanaDictionary);
    else if(this.props.stage==2)
      this.allowedAnswers = this.currentQuestion;
    else if(this.props.stage==4) {
      let tempAllowedAnswers = [];

      this.currentQuestion.forEach(key => {
        tempAllowedAnswers.push(findRomajisAtKanaKey(key, kanaDictionary));
      });

      cartesianProduct(tempAllowedAnswers).forEach(answer => {
        this.allowedAnswers.push(answer.join(''));
      });
    }
  }

  handleAnswer = answer => {
    if(this.props.stage<=2) document.activeElement.blur(); // reset answer button's :active
    this.previousQuestion = this.currentQuestion;
    this.setState({previousQuestion: this.previousQuestion});
    this.previousAnswer = answer;
    this.setState({previousAnswer: this.previousAnswer});
    this.previousAllowedAnswers = this.allowedAnswers;
    const isCorrect = this.isInAllowedAnswers(answer);

    // Update stage stats
    this.props.updateStageStats(this.props.stage, isCorrect);

    // Clamp elapsed time so an idle pause doesn't skew the averages/compliments.
    const elapsedMs = Math.min(Date.now() - (this.questionShownAt || Date.now()), 30000);

    // Record per-character detail for the introspective charts.
    if(this.props.recordAnswer) {
      const records = [];

      if(this.currentQuestion.length === 1) {
        // Stages 1-3: a single character.
        const kana = this.currentQuestion[0];
        const romaji = findRomajisAtKanaKey(kana, kanaDictionary)[0];
        // Normalize the given answer to romaji so confusion pairs read consistently.
        const given = this.props.stage == 2
          ? (findRomajisAtKanaKey(answer, kanaDictionary)[0] || answer)
          : answer;
        records.push({ kana, romaji, given, isCorrect, elapsedMs });
      } else {
        // Stage 4: a multi-character word. Align the typed romaji to each kana
        // so mistakes and confusions can be attributed per character.
        const romajiLists = this.currentQuestion.map(k => findRomajisAtKanaKey(k, kanaDictionary));
        const perCharMs = elapsedMs / this.currentQuestion.length;
        const alignment = alignAnswer(romajiLists, answer);
        if(alignment) {
          alignment.forEach(a => {
            records.push({
              kana: this.currentQuestion[a.index],
              romaji: romajiLists[a.index][0],
              given: a.correct ? '' : a.given, // only wrong chars feed confusion pairs
              isCorrect: a.correct,
              elapsedMs: perCharMs
            });
          });
        } else {
          // No clean alignment (answer too garbled): count each kana as missed.
          this.currentQuestion.forEach(kana => {
            records.push({
              kana,
              romaji: findRomajisAtKanaKey(kana, kanaDictionary)[0],
              given: '',
              isCorrect: false,
              elapsedMs: perCharMs
            });
          });
        }
      }

      this.props.recordAnswer(records);
    }

    if(isCorrect)
      this.stageProgress = this.stageProgress+1;
    else
      this.stageProgress = this.stageProgress > 0 ? this.stageProgress - 1 : 0;
    this.setState({stageProgress: this.stageProgress});
    const stageCompleted = this.stageProgress >= quizSettings.stageLength[this.props.stage] && !this.props.isLocked;

    // Combo streak: climbs on consecutive correct answers, resets on a miss.
    const hadActiveCombo = this.state.combo > 0;
    const newCombo = isCorrect ? this.state.combo + 1 : 0;
    this.setState({combo: newCombo});

    // Play feedback sound (fanfare on the stage-completing answer)
    if(stageCompleted) playStageUpSound();
    else if(isCorrect) playComboSound(newCombo);
    else if(hadActiveCombo) playComboBreakSound(this.state.combo);
    else playWrongSound();

    if(isCorrect && !stageCompleted) {
      this.showCompliment(elapsedMs < 1000, newCombo);
    }

    if(stageCompleted) {
      setTimeout(() => { this.props.handleStageUp() }, 300);
    }
    else
      this.setNewQuestion();
  }

  showCompliment = (isFast, combo) => {
    clearTimeout(this.complimentTimeout);
    this.complimentSeq++;
    const compliment = buildCompliment(pickCompliment(isFast), combo);
    this.setState({ compliment });
    playComplimentVoice(compliment.text);
    this.complimentTimeout = setTimeout(() => {
      this.setState({ compliment: null });
    }, 1500);
  }

  initializeCharacters() {
    this.askableKanas = {};
    this.askableKanaKeys = [];
    this.askableRomajis = [];
    this.previousQuestion = '';
    this.previousAnswer = '';
    this.stageProgress = 0;
    Object.keys(kanaDictionary).forEach(whichKana => {
      Object.keys(kanaDictionary[whichKana]).forEach(groupName => {
        // do we want to include this group?
        if(arrayContains(groupName, this.props.decidedGroups)) {
          // let's merge the group to our askableKanas
          this.askableKanas = Object.assign(this.askableKanas, kanaDictionary[whichKana][groupName]['characters']);
          Object.keys(kanaDictionary[whichKana][groupName]['characters']).forEach(key => {
            // let's add all askable kana keys to array
            this.askableKanaKeys.push(key);
            this.askableRomajis.push(kanaDictionary[whichKana][groupName]['characters'][key][0]);
          });
        }
      });
    });
  }

  getAnswerType() {
    if(this.props.stage==2) return 'kana';
    else return 'romaji';
  }

  getShowableQuestion() {
    if(this.getAnswerType()=='kana')
      return findRomajisAtKanaKey(this.state.currentQuestion, kanaDictionary)[0];
    else return this.state.currentQuestion;
  }

  getPreviousResult() {
    let resultString='';
    if(this.previousQuestion=='')
      resultString = <div className="previous-result none">Let's go! Which character is this?</div>
    else {
      let rightAnswer = (
        this.props.stage==2 ?
          findRomajisAtKanaKey(this.previousQuestion, kanaDictionary)[0]
          : this.previousQuestion.join('')
        )+' = '+ this.previousAllowedAnswers[0];

      if(this.isInAllowedAnswers(this.previousAnswer))
        resultString = (
          <div className="previous-result correct kq-pulse-success" title="Correct answer!" key={this.answerSeq}>
            <span className="pull-left glyphicon glyphicon-none"></span>{rightAnswer}<span className="pull-right glyphicon glyphicon-ok"></span>
          </div>
        );
      else
        resultString = (
          <div className="previous-result wrong kq-shake" title="Wrong answer!" key={this.answerSeq}>
            <span className="pull-left glyphicon glyphicon-none"></span>{rightAnswer}<span className="pull-right glyphicon glyphicon-remove"></span>
          </div>
        );
    }
    return resultString;
  }

  isInAllowedAnswers(previousAnswer) {
    if(arrayContains(previousAnswer, this.previousAllowedAnswers))
      return true;
    else return false;
  }

  handleAnswerChange = e => {
    this.setState({currentAnswer: e.target.value.replace(/\s+/g, '')});
  }

  handleAnswerKeyDown = e => {
    // Enter submits the form (playing its own sounds); only give the
    // "typing" feedback to actual character input.
    if(e.key !== 'Enter') playKeySound();
  }

  handleSubmit = e => {
    e.preventDefault();
    if(this.state.currentAnswer!='') {
      this.handleAnswer(this.state.currentAnswer.toLowerCase());
      this.setState({currentAnswer: ''});
    }
  }

  componentWillMount() {
    this.initializeCharacters();
  }

  componentDidMount() {
    if(this.props.stage <= 4) {
      this.setNewQuestion();
      // "Entering the dojo" as the first question appears (the stage intro
      // screen itself stays silent).
      playEnterDojoSound();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.complimentTimeout);
  }

  render() {
    // Safety check for stage 5 (should show completion screen instead)
    if (this.props.stage > 4) {
      return null;
    }
    
    let btnClass = "btn btn-default answer-button";
    if ('ontouchstart' in window)
      btnClass += " no-hover"; // disables hover effect on touch screens
    let stageProgressPercentage = Math.round((this.state.stageProgress/quizSettings.stageLength[this.props.stage])*100)+'%';
    let stageProgressPercentageStyle = { width: stageProgressPercentage }
    
    // Get current stage stats
    const currentStageStats = this.props.stageStats[this.props.stage];
    const statsPercentage = currentStageStats.total > 0 
      ? Math.round((currentStageStats.correct / currentStageStats.total) * 100) 
      : 0;
    const statsText = currentStageStats.total > 0
      ? ` - ${currentStageStats.correct}/${currentStageStats.total} (${statsPercentage}%)`
      : '';

    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'question-tremble' + (trembleOn ? ' tremble-active' : '');

    return (
      <div className="text-center question col-xs-12">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo'+this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.lightning && <LightningEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.compliments && <ComplimentPopup compliment={this.state.compliment} key={'compliment'+this.complimentSeq} />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
          {this.getPreviousResult()}
          <div className="big-character" key={'q'+this.answerSeq}>{this.getShowableQuestion()}</div>
          <div className="answer-container">
            {
              this.props.stage<3 ?
                this.state.answerOptions.map((answer, idx) => {
                  return <AnswerButton answer={answer}
                    className={btnClass}
                    key={idx}
                    answertype={this.getAnswerType()}
                    handleAnswer={this.handleAnswer} />
                })
              : <div className="answer-form-container">
                  <form onSubmit={this.handleSubmit}>
                    <input autoFocus className="answer-input" type="text" value={this.state.currentAnswer} onChange={this.handleAnswerChange} onKeyDown={this.handleAnswerKeyDown} />
                  </form>
                </div>
            }
          </div>
          <div className="progress">
            <div className="progress-bar progress-bar-info"
              role="progressbar"
              aria-valuenow={this.state.stageProgress}
              aria-valuemin="0"
              aria-valuemax={quizSettings.stageLength[this.props.stage]}
              style={stageProgressPercentageStyle}
            >
              <span>Stage {this.props.stage} {this.props.isLocked?' (Locked)':''}{statsText}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

}

class AnswerButton extends Component {
  getShowableAnswer() {
    if(this.props.answertype=='romaji')
      return findRomajisAtKanaKey(this.props.answer, kanaDictionary)[0];
    else return this.props.answer;
  }

  render() {
    return (
      <button className={this.props.className} onClick={()=>this.props.handleAnswer(this.getShowableAnswer())}>{this.getShowableAnswer()}</button>
    );
  }
}
export default Question;
