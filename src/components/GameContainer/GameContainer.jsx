import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import ChooseCharacters from '../ChooseCharacters/ChooseCharacters';
import Game from '../Game/Game';

class GameContainer extends Component {
  state = {
    stage:1,
    isLocked: false,
    decidedGroups: JSON.parse(localStorage.getItem('decidedGroups') || null) || [],
    stage4Difficulty: 1, // 1=3 chars, 2=5 chars, 3=8 chars
    stageStats: {
      1: { correct: 0, total: 0 },
      2: { correct: 0, total: 0 },
      3: { correct: 0, total: 0 },
      4: { correct: 0, total: 0 }
    },
    // Per-character stats: { [kana]: { correct, total, timeMs, romaji } }
    characterStats: {},
    // Confusion pairs: { [kana]: { [givenAnswer]: count } }
    confusionPairs: {}
  }

  componentWillReceiveProps() {
    if(!this.state.isLocked)
      this.setState({stage: 1});
  }

  startGame = decidedGroups => {
    if(parseInt(this.state.stage)<1 || isNaN(parseInt(this.state.stage)))
      this.setState({stage: 1});
    else if(parseInt(this.state.stage)>4)
      this.setState({stage: 4});

    this.setState({
      decidedGroups: decidedGroups,
      stageStats: {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 }
      },
      characterStats: {},
      confusionPairs: {}
    });
    localStorage.setItem('decidedGroups', JSON.stringify(decidedGroups));
    this.props.handleStartGame();
  }

  updateStageStats = (stage, isCorrect) => {
    this.setState(prevState => {
      const newStats = { ...prevState.stageStats };
      newStats[stage] = {
        correct: newStats[stage].correct + (isCorrect ? 1 : 0),
        total: newStats[stage].total + 1
      };
      return { stageStats: newStats };
    });
  }

  // Records one or more per-character results for the introspective charts.
  // Single-character questions (stages 1-3) send one record; multi-character
  // words (stage 4) send one record per kana after romaji alignment.
  recordAnswer = (records) => {
    this.setState(prevState => {
      const characterStats = { ...prevState.characterStats };
      let confusionPairs = prevState.confusionPairs;
      let confusionCloned = false;

      records.forEach(({ kana, romaji, given, isCorrect, elapsedMs }) => {
        const prev = characterStats[kana] || { correct: 0, total: 0, timeMs: 0, romaji };
        characterStats[kana] = {
          correct: prev.correct + (isCorrect ? 1 : 0),
          total: prev.total + 1,
          timeMs: prev.timeMs + elapsedMs,
          romaji
        };

        if (!isCorrect && given) {
          if (!confusionCloned) {
            confusionPairs = { ...prevState.confusionPairs };
            confusionCloned = true;
          }
          const forKana = { ...(confusionPairs[kana] || {}) };
          forKana[given] = (forKana[given] || 0) + 1;
          confusionPairs[kana] = forKana;
        }
      });

      return { characterStats, confusionPairs };
    });
  }

  stageUp = () => {
    this.setState({stage: this.state.stage+1});
  }

  lockStage = (stage, forceLock) => {
    // if(stage<1 || stage>4) stage=1; // don't use this to allow backspace
    if(forceLock)
      this.setState({stage: stage, isLocked: true});
    else
      this.setState({stage: stage, isLocked: !this.state.isLocked});
  }

  setStage4Difficulty = (difficulty) => {
    this.setState({stage4Difficulty: difficulty});
  }

  render() {
    return (
      <div>
        { this.props.gameState==='chooseCharacters' &&
            <ChooseCharacters selectedGroups={this.state.decidedGroups}
              handleStartGame={this.startGame}
              stage={this.state.stage}
              isLocked={this.state.isLocked}
              lockStage={this.lockStage}
              stage4Difficulty={this.state.stage4Difficulty}
              setStage4Difficulty={this.setStage4Difficulty}
            />
          }
          { this.props.gameState==='game' &&
              <Game decidedGroups={this.state.decidedGroups}
                handleEndGame={this.props.handleEndGame}
                stageUp={this.stageUp}
                stage={this.state.stage}
                isLocked={this.state.isLocked}
                lockStage={this.lockStage}
                stageStats={this.state.stageStats}
                updateStageStats={this.updateStageStats}
                recordAnswer={this.recordAnswer}
                characterStats={this.state.characterStats}
                confusionPairs={this.state.confusionPairs}
                stage4Difficulty={this.state.stage4Difficulty}
                setStage4Difficulty={this.setStage4Difficulty}
                startTimer={this.props.startTimer}
                stopTimer={this.props.stopTimer}
              />
          }
        </div>
    )
  }
}

export default GameContainer;
