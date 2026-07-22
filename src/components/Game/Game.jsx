import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { playApplauseSound } from '../../data/soundEffects';
import ShowStage from './ShowStage';
import Question from './Question';
import TableExercise from './TableExercise';
import ListeningExercise from './ListeningExercise';
import CountingExercise from './CountingExercise';
import KanjiExercise from './KanjiExercise';
import Confetti from './Confetti';

class Game extends Component {
  state = { showScreen: '', celebrate: false }
  celebrateSeq = 0

  componentWillMount() {
    this.setState({showScreen: 'stage'});
  }

  componentDidMount() {
    // The table and listening exercises have no intro/question screen split -
    // they're one continuous screen, so start the timer as soon as shown.
    // Kanji is the odd one out: it has its own picker/menu screen before the
    // quiz starts, so it's excluded here - KanjiExercise starts/stops the
    // timer itself once the user actually leaves that picker.
    if(this.props.stage === 'table' || this.props.stage === 'listening' || this.props.stage === 'counting') {
      this.props.startTimer();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.props.stage === 'table' || this.props.stage === 'listening' || this.props.stage === 'counting' || this.props.stage === 'kanji') return;
    if(prevState.showScreen !== this.state.showScreen) {
      if(this.state.showScreen === 'question') {
        this.props.startTimer();
      } else {
        this.props.stopTimer();
      }
    }
  }

  componentWillUnmount() {
    this.props.stopTimer();
    clearTimeout(this.celebrateTimeout);
  }

  // Only reached by actually finishing a stage (starting mid-game from the
  // menu goes through startAtStage instead), so celebrating here can't
  // misfire on a fresh start.
  stageUp = () => {
    this.props.stageUp();
    playApplauseSound();
    this.celebrateSeq++;
    this.setState({showScreen: 'stage', celebrate: true});
    clearTimeout(this.celebrateTimeout);
    this.celebrateTimeout = setTimeout(() => this.setState({celebrate: false}), 4000);
  }

  lockStage = stage => {
    this.setState({showScreen: 'question'});
    this.props.lockStage(stage);
  }

  showQuestion = () => {
    this.setState({showScreen: 'question'})
  }

  render() {
    if(this.props.stage === 'table') {
      return (
        <TableExercise
          decidedGroups={this.props.decidedGroups}
          handleEndGame={this.props.handleEndGame}
          setTableHeaderInfo={this.props.setTableHeaderInfo}
        />
      );
    }

    if(this.props.stage === 'listening') {
      return (
        <ListeningExercise
          decidedGroups={this.props.decidedGroups}
          handleEndGame={this.props.handleEndGame}
        />
      );
    }

    if(this.props.stage === 'counting') {
      return (
        <CountingExercise
          handleEndGame={this.props.handleEndGame}
          setHelpContent={this.props.setHelpContent}
        />
      );
    }

    if(this.props.stage === 'kanji') {
      return (
        <KanjiExercise
          handleEndGame={this.props.handleEndGame}
          startTimer={this.props.startTimer}
          stopTimer={this.props.stopTimer}
        />
      );
    }

    return (
      <div>
        {this.state.celebrate && <Confetti key={'confetti'+this.celebrateSeq} />}
        {
          this.state.showScreen==='stage' &&
            <ShowStage
              lockStage={this.lockStage} 
              handleShowQuestion={this.showQuestion} 
              handleEndGame={this.props.handleEndGame} 
              stage={this.props.stage}
              stageStats={this.props.stageStats}
              characterStats={this.props.characterStats}
              confusionPairs={this.props.confusionPairs}
              stage4Difficulty={this.props.stage4Difficulty}
              setStage4Difficulty={this.props.setStage4Difficulty}
              isLocked={this.props.isLocked}
            />
        }
        {
          this.state.showScreen==='question' &&
            <Question 
              isLocked={this.props.isLocked} 
              handleStageUp={this.stageUp} 
              stage={this.props.stage} 
              decidedGroups={this.props.decidedGroups}
              updateStageStats={this.props.updateStageStats}
              recordAnswer={this.props.recordAnswer}
              stageStats={this.props.stageStats}
              stage4Difficulty={this.props.stage4Difficulty}
            />
        }
      </div>
    );
  }
}

export default Game;
