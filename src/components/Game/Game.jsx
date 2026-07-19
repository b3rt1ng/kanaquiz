import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import ShowStage from './ShowStage';
import Question from './Question';
import TableExercise from './TableExercise';

class Game extends Component {
  state = { showScreen: '' }

  componentWillMount() {
    this.setState({showScreen: 'stage'});
  }

  componentDidMount() {
    // The table exercise has no intro/question screen split - it's one
    // continuous screen, so start the timer as soon as it's shown.
    if(this.props.stage === 'table') {
      this.props.startTimer();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.props.stage === 'table') return;
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
  }

  stageUp = () => {
    this.props.stageUp();
    this.setState({showScreen: 'stage'});
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
          tableKanaType={this.props.tableKanaType}
          handleEndGame={this.props.handleEndGame}
          setTableHeaderInfo={this.props.setTableHeaderInfo}
        />
      );
    }

    return (
      <div>
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
