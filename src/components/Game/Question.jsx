import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { quizSettings } from '../../data/quizSettings';
import { findRomajisAtKanaKey, removeFromArray, arrayContains, shuffle, cartesianProduct, alignAnswer } from '../../data/helperFuncs';
import { playCorrectSound, playWrongSound, playStageUpSound } from '../../data/soundEffects';
import './Question.scss';

class Question extends Component {
  state = {
    previousQuestion: [],
    previousAnswer: '',
    currentAnswer: '',
    currentQuestion: [],
    answerOptions: [],
    stageProgress: 0
  }
  // Bumped on every answer/question so the feedback + big-character divs
  // remount (via key=) and their CSS animations replay every time, even
  // across two consecutive right/wrong answers.
  answerSeq = 0
    // this.setNewQuestion = this.setNewQuestion.bind(this);
    // this.handleAnswer = this.handleAnswer.bind(this);
    // this.handleAnswerChange = this.handleAnswerChange.bind(this);
    // this.handleSubmit = this.handleSubmit.bind(this);
  // }

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
    // console.log(this.currentQuestion);
  }

  setAnswerOptions() {
    this.answerOptions = this.getRandomKanas(3, this.currentQuestion[0], false);
    this.setState({answerOptions: this.answerOptions});
    // console.log(this.answerOptions);
  }

  setAllowedAnswers() {
    // console.log(this.currentQuestion);
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
    // console.log(this.allowedAnswers);
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

    // Record per-character detail for the introspective charts.
    // Clamp elapsed time so an idle pause doesn't skew the averages.
    if(this.props.recordAnswer) {
      const elapsedMs = Math.min(Date.now() - (this.questionShownAt || Date.now()), 30000);
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

    // Play feedback sound (fanfare on the stage-completing answer)
    if(stageCompleted) playStageUpSound();
    else if(isCorrect) playCorrectSound();
    else playWrongSound();

    if(stageCompleted) {
      setTimeout(() => { this.props.handleStageUp() }, 300);
    }
    else
      this.setNewQuestion();
  }

  initializeCharacters() {
    this.askableKanas = {};
    this.askableKanaKeys = [];
    this.askableRomajis = [];
    this.previousQuestion = '';
    this.previousAnswer = '';
    this.stageProgress = 0;
    Object.keys(kanaDictionary).forEach(whichKana => {
      // console.log(whichKana); // 'hiragana' or 'katakana'
      Object.keys(kanaDictionary[whichKana]).forEach(groupName => {
        // console.log(groupName); // 'h_group1', ...
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
    // console.log(this.askableKanas);
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
    // console.log(this.previousAnswer);
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
            <span className="pull-left glyphicon glyphicon-none"></span>{rightAnswer} <span className="your-answer">(your answer: {this.previousAnswer})</span><span className="pull-right glyphicon glyphicon-remove"></span>
          </div>
        );
    }
    return resultString;
  }

  isInAllowedAnswers(previousAnswer) {
    // console.log(previousAnswer);
    // console.log(this.allowedAnswers);
    if(arrayContains(previousAnswer, this.previousAllowedAnswers))
      return true;
    else return false;
  }

  handleAnswerChange = e => {
    this.setState({currentAnswer: e.target.value.replace(/\s+/g, '')});
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
    }
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
    
    return (
      <div className="text-center question col-xs-12">
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
                  <input autoFocus className="answer-input" type="text" value={this.state.currentAnswer} onChange={this.handleAnswerChange} />
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
