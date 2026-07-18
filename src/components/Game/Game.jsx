import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import ShowStage from './ShowStage';
import Question from './Question';

class Game extends Component {
  state = { showScreen: '' }

  componentWillMount() {
    this.setState({showScreen: 'stage'});
  }

  componentDidUpdate(prevProps, prevState) {
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
