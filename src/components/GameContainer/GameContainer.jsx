import React, { PureComponent } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import ChooseCharacters from '../ChooseCharacters/ChooseCharacters';
import Game from '../Game/Game';

// PureComponent so App's 100ms timer tick (which only Navbar actually needs)
// doesn't cascade a full re-render down through the entire game tree - the
// props App passes here are stable references except when gameState itself
// changes, so the shallow prop/state comparison correctly short-circuits.
class GameContainer extends PureComponent {
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

  // Standard progressive flow: always starts fresh at stage 1, unlocked.
  startGame = decidedGroups => {
    this.setState({
      stage: 1,
      isLocked: false,
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

  // Direct practice: jump straight into a single stage, locked (no auto-advance).
  startAtStage = (decidedGroups, stage, difficulty) => {
    this.setState({
      stage: stage,
      isLocked: true,
      decidedGroups: decidedGroups,
      stageStats: {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 }
      },
      characterStats: {},
      confusionPairs: {},
      ...(difficulty ? { stage4Difficulty: difficulty } : {})
    });
    localStorage.setItem('decidedGroups', JSON.stringify(decidedGroups));
    this.props.handleStartGame();
  }

  // Table exercise: separate self-contained mode, not part of the 1-4 stage
  // progression, but built from the same character selection as everything else.
  startTableExercise = (decidedGroups) => {
    this.setState({
      stage: 'table',
      isLocked: true,
      decidedGroups: decidedGroups
    });
    localStorage.setItem('decidedGroups', JSON.stringify(decidedGroups));
    this.props.handleStartGame();
  }

  // Listening exercise: same self-contained shape as the table.
  startListeningExercise = (decidedGroups) => {
    this.setState({
      stage: 'listening',
      isLocked: true,
      decidedGroups: decidedGroups
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
              startAtStage={this.startAtStage}
              startTableExercise={this.startTableExercise}
              startListeningExercise={this.startListeningExercise}
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
                setTableHeaderInfo={this.props.setTableHeaderInfo}
              />
          }
        </div>
    )
  }
}

export default GameContainer;
