import React, { Component } from 'react';
import './ShowStage.scss';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ResultsCharts from './ResultsCharts';

class ShowStage extends Component {
  state = {
    show: false,
    entered: false,
    showDifficultySelect: false
  }

  componentDidMount() {
    this.setState({show: true});
    if(this.props.stage <= 4) {
      // For stage 4, show difficulty selection first (unless locked from menu)
      if(this.props.stage === 4 && !this.props.isLocked) {
        this.setState({showDifficultySelect: true});
      } else if(!this.hasStats()) {
        // No data yet (first stage) — keep the quick auto-advance.
        this.timeoutID = setTimeout(this.removeStage, 1200);
      }
      // else: stats exist -> wait for the user to click "Continuer" (see showStage)
    }
    window.scrollTo(0,0);
  }

  hasStats() {
    return this.props.characterStats && Object.keys(this.props.characterStats).length > 0;
  }

  componentDidUpdate(prevProps) {
    // Handle when we move to stage 5 (completion screen)
    if (prevProps.stage !== this.props.stage && this.props.stage === 5) {
      this.setState({show: true});
      window.scrollTo(0,0);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutID);
  }

  removeStage = () => {
    this.setState({show: false});
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout(this.props.handleShowQuestion, 1000) // how soon we go to question (1000)
  }

  selectDifficulty = (difficulty) => {
    this.props.setStage4Difficulty(difficulty);
    this.setState({showDifficultySelect: false});
    // Auto-advance only when there are no interim stats to review.
    if(!this.hasStats())
      this.timeoutID = setTimeout(this.removeStage, 1200);
  }

  showStage() {
    let stageDescription;
    let stageSecondaryDescription = false;

    if(this.props.stage==1) stageDescription = 'Choose one';
    else if(this.props.stage==2) { stageDescription = 'Choose one'; stageSecondaryDescription = 'Reverse'; }
    else if(this.props.stage==3) stageDescription = 'Write the answer';
    else if(this.props.stage==4) { 
      stageDescription = 'Write the answer'; 
      
      // Show difficulty selection
      if(this.state.showDifficultySelect) {
        return (
          <div className="text-center show-stage difficulty-select">
            <h1>Stage 4</h1>
            <h3>{stageDescription}</h3>
            <h4 className="difficulty-title">Choisissez la difficulté :</h4>
            <div className="difficulty-buttons">
              <button className="btn btn-success difficulty-btn" onClick={() => this.selectDifficulty(1)}>
                <div className="difficulty-level">Niveau 1</div>
                <div className="difficulty-desc">3 caractères</div>
              </button>
              <button className="btn btn-warning difficulty-btn" onClick={() => this.selectDifficulty(2)}>
                <div className="difficulty-level">Niveau 2</div>
                <div className="difficulty-desc">5 caractères</div>
              </button>
              <button className="btn btn-danger difficulty-btn" onClick={() => this.selectDifficulty(3)}>
                <div className="difficulty-level">Niveau 3</div>
                <div className="difficulty-desc">8 caractères</div>
              </button>
            </div>
          </div>
        );
      }
      
      // Show stage info with selected difficulty
      const charCount = this.props.stage4Difficulty === 1 ? 3 : this.props.stage4Difficulty === 2 ? 5 : 8;
      stageSecondaryDescription = `${charCount} caractères`;
    }
    else if(this.props.stage==5) {
      // Display stats for all 4 stages
      const allStagesStats = [];
      if (this.props.stageStats) {
        for (let i = 1; i <= 4; i++) {
          const stats = this.props.stageStats[i];
          if (stats && stats.total > 0) {
            const percentage = Math.round((stats.correct / stats.total) * 100);
            allStagesStats.push(
              <div key={i} className="stage-summary">
                Stage {i}: {stats.correct}/{stats.total} ({percentage}%)
              </div>
            );
          }
        }
      }
      
      return (
        <div className="text-center show-end">
          <h1>Félicitations !</h1>
          <h3>Vous avez complété les 4 stages.</h3>
          {allStagesStats.length > 0 && (
            <div className="all-stages-stats">
              <h4>Vos résultats :</h4>
              {allStagesStats}
            </div>
          )}
          <ResultsCharts
            characterStats={this.props.characterStats}
            confusionPairs={this.props.confusionPairs}
          />
          <h4 className="continue-prompt">Que voulez-vous faire ?</h4>
          <p><button className="btn btn-danger keep-playing" onClick={()=>this.props.lockStage(4)}>Continuer à jouer</button></p>
          <p><button className="btn btn-primary choose-other" onClick={this.props.handleEndGame}>Choisir d'autres caractères</button></p>
        </div>
      );
    }

    // Show previous stage stats if available
    const previousStage = this.props.stage - 1;
    let previousStageStats = null;
    if (previousStage > 0 && this.props.stageStats && this.props.stageStats[previousStage].total > 0) {
      const stats = this.props.stageStats[previousStage];
      const percentage = Math.round((stats.correct / stats.total) * 100);
      previousStageStats = (
        <h5 className="stage-stats">
          Stage {previousStage}: {stats.correct}/{stats.total} ({percentage}%)
        </h5>
      );
    }

    return (
      <div className="text-center show-stage">
        <h1>Stage {this.props.stage}</h1>
        <h3>{stageDescription}</h3>
        { stageSecondaryDescription ? <h4>{stageSecondaryDescription}</h4> : '' }
        { previousStageStats }
        { this.hasStats() &&
          <div className="interim-stats">
            <h4 className="interim-title">Tes stats jusqu'ici</h4>
            <ResultsCharts
              characterStats={this.props.characterStats}
              confusionPairs={this.props.confusionPairs}
            />
            <button className="btn btn-primary continue-btn" onClick={this.removeStage}>
              Continuer →
            </button>
          </div>
        }
      </div>
    );
  }

  render() {
    const content = this.showStage();
    const { show } = this.state;

    return (
      <CSSTransition classNames="stage" timeout={{enter: 900, exit: 900}} in={show} unmountOnExit>
        {state => content}
      </CSSTransition>
    );
  }
}

export default ShowStage;
