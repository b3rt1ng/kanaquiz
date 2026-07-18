import React, { Component } from 'react';
import './App.scss';
import Navbar from '../Navbar/Navbar';
import GameContainer from '../GameContainer/GameContainer';
import { removeHash } from '../../data/helperFuncs';

const options = {};

class App extends Component {
  state = { gameState: 'chooseCharacters', totalTimeMs: 0 };
  timerInterval = null;

  startGame = () => {
    this.setState({gameState: 'game'});
  }

  endGame = () => {
    this.setState({gameState: 'chooseCharacters'});
    this.stopTimer();
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
  }

  componentWillUnmount() {
    this.stopTimer();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
  }

  handleWindowBlur = () => {
    this.stopTimer();
  }

  handleWindowFocus = () => {
    if(this.state.gameState === 'game') {
      this.startTimer();
    }
  }

  render() {
    return (
      <div>
        <Navbar
          gameState={this.state.gameState}
          handleEndGame={this.endGame}
          totalTimeMs={this.state.totalTimeMs}
        />
        <div className="outercontainer">
          <div className="container game">
            <GameContainer
              gameState={this.state.gameState}
              handleStartGame={this.startGame}
              handleEndGame={this.endGame}
              startTimer={this.startTimer}
              stopTimer={this.stopTimer}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
