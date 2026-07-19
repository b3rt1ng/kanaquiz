import React, { Component } from 'react';
import './App.scss';
import Navbar from '../Navbar/Navbar';
import GameContainer from '../GameContainer/GameContainer';
import { removeHash } from '../../data/helperFuncs';
import { playHoverSound } from '../../data/soundEffects';

const options = {};

// Delegated hover sound: one listener for the whole app instead of wiring
// onMouseEnter into every button/row individually.
const HOVER_SELECTOR = 'button, .choose-row, .panel-footer a, .navbar a, .down-arrow';

class App extends Component {
  state = { gameState: 'chooseCharacters', totalTimeMs: 0, tableHeaderInfo: null };
  timerInterval = null;

  startGame = () => {
    this.setState({gameState: 'game'});
  }

  endGame = () => {
    this.setState({gameState: 'chooseCharacters', tableHeaderInfo: null});
    this.stopTimer();
  }

  setTableHeaderInfo = (tableHeaderInfo) => {
    this.setState({tableHeaderInfo});
  }

  startTimer = () => {
    this.timerInterval = setInterval(() => {
      this.setState(prevState => ({
        totalTimeMs: prevState.totalTimeMs + 100
      }));
    }, 100);
  }

  stopTimer = () => {
    if(this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  componentWillUpdate(nextProps, nextState) {
    // This is primarily for demo site purposes. Hides #footer when game is on.
    if(document.getElementById('footer')) {
      if(nextState.gameState=='chooseCharacters')
        document.getElementById('footer').style.display = "block";
      else
        document.getElementById('footer').style.display = "none";
    }
  }

  componentWillMount() {
    if(document.getElementById('footer'))
      document.getElementById('footer').style.display = "block";
  }

  componentDidMount() {
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('mouseover', this.handleGlobalMouseOver);
    document.addEventListener('mouseout', this.handleGlobalMouseOut);
  }

  componentWillUnmount() {
    this.stopTimer();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('mouseover', this.handleGlobalMouseOver);
    document.removeEventListener('mouseout', this.handleGlobalMouseOut);
  }

  handleWindowBlur = () => {
    this.stopTimer();
  }

  handleWindowFocus = () => {
    if(this.state.gameState === 'game') {
      this.startTimer();
    }
  }

  lastHoverTarget = null
  lastHoverSoundAt = 0

  handleGlobalMouseOver = (e) => {
    const target = e.target.closest(HOVER_SELECTOR);
    if(!target || target === this.lastHoverTarget) return;
    this.lastHoverTarget = target;

    // Throttle so sweeping the mouse across many small elements (e.g. the
    // character checklist) doesn't turn into a wall of noise.
    const now = Date.now();
    if(now - this.lastHoverSoundAt < 35) return;
    this.lastHoverSoundAt = now;
    playHoverSound();
  }

  handleGlobalMouseOut = (e) => {
    if(this.lastHoverTarget && !this.lastHoverTarget.contains(e.relatedTarget)) {
      this.lastHoverTarget = null;
    }
  }

  render() {
    return (
      <div>
        <Navbar
          gameState={this.state.gameState}
          handleEndGame={this.endGame}
          totalTimeMs={this.state.totalTimeMs}
          tableHeaderInfo={this.state.tableHeaderInfo}
        />
        <div className="outercontainer">
          <div className="container game">
            <GameContainer
              gameState={this.state.gameState}
              handleStartGame={this.startGame}
              handleEndGame={this.endGame}
              startTimer={this.startTimer}
              stopTimer={this.stopTimer}
              setTableHeaderInfo={this.setTableHeaderInfo}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
