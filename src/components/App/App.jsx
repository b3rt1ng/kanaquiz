import React, { Component } from 'react';
import './App.scss';
import Navbar from '../Navbar/Navbar';
import GameContainer from '../GameContainer/GameContainer';
import SettingsScreen from '../Settings/SettingsScreen';
import { removeHash } from '../../data/helperFuncs';
import { playHoverSound } from '../../data/soundEffects';

const options = {};

// Delegated hover sound: one listener for the whole app instead of wiring
// onMouseEnter into every button/row individually.
const HOVER_SELECTOR = 'button, .choose-row, .panel-footer a, .navbar a, .down-arrow';

class App extends Component {
  state = { gameState: 'chooseCharacters', totalTimeMs: 0, tableHeaderInfo: null, helpContent: null };
  timerInterval = null;
  // Elapsed time banked from completed running segments (i.e. up to the
  // last stopTimer()), kept outside of state. Combined with timerStartedAt
  // below, the current total is always derived from real timestamps
  // (Date.now() deltas) rather than counting ticks - a background/throttled
  // tab can delay or batch the interval's firings, but whenever it does
  // fire the computed total is still exactly right, instead of drifting
  // ahead by however many 100ms increments were "missed".
  elapsedMs = 0;
  timerStartedAt = null;
  lastDisplayedSeconds = 0;

  startGame = () => {
    this.setState({gameState: 'game'});
  }

  endGame = () => {
    this.setState({gameState: 'chooseCharacters', tableHeaderInfo: null, helpContent: null});
    this.stopTimer();
  }

  openSettings = () => {
    this.setState({gameState: 'settings'});
  }

  closeSettings = () => {
    this.setState({gameState: 'chooseCharacters'});
  }

  setTableHeaderInfo = (tableHeaderInfo) => {
    this.setState({tableHeaderInfo});
  }

  setHelpContent = (helpContent) => {
    this.setState({helpContent});
  }

  // start/stopTimer are the EXERCISES' intent ("a drill is under way"),
  // while resume/pauseTimer are the window merely losing and regaining
  // focus. Keeping the two apart is what stops a menu screen from starting
  // the clock: coming back to the page resumes only a timer that an
  // exercise had actually started - see handleVisibilityChange.
  timerWanted = false;

  startTimer = () => {
    this.timerWanted = true;
    this.resumeTimer();
  }

  stopTimer = () => {
    this.timerWanted = false;
    this.pauseTimer();
  }

  resumeTimer = () => {
    if(this.timerInterval) return;
    this.timerStartedAt = Date.now();
    this.timerInterval = setInterval(() => {
      const totalMs = this.elapsedMs + (Date.now() - this.timerStartedAt);
      const seconds = Math.floor(totalMs / 1000);
      if(seconds !== this.lastDisplayedSeconds) {
        this.lastDisplayedSeconds = seconds;
        this.setState({ totalTimeMs: totalMs });
      }
    }, 100);
  }

  pauseTimer = () => {
    if(this.timerInterval) {
      this.elapsedMs += Date.now() - this.timerStartedAt;
      this.timerStartedAt = null;
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  componentWillUpdate(nextProps, nextState) {
    // This is primarily for demo site purposes. Hides #footer when game is on.
    if(document.getElementById('footer')) {
      if(nextState.gameState=='chooseCharacters' || nextState.gameState=='settings')
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
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('mouseover', this.handleGlobalMouseOver);
    document.addEventListener('mouseout', this.handleGlobalMouseOut);
  }

  componentWillUnmount() {
    this.stopTimer();
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('mouseover', this.handleGlobalMouseOver);
    document.removeEventListener('mouseout', this.handleGlobalMouseOut);
  }

  handleWindowBlur = () => {
    this.pauseTimer();
  }

  handleWindowFocus = () => {
    if(this.timerWanted) {
      this.resumeTimer();
    }
  }

  // Page Visibility fires reliably on tab-switch/minimize/lock-screen and,
  // unlike window blur/focus, also on virtual-desktop switches on Linux -
  // most WMs never blur the browser window when you just switch workspaces
  // away from it, which let the timer keep running the whole time you were
  // gone.
  // gameState was the wrong test here: the kanji theme picker, the stage
  // intro and the results screen all run under gameState 'game' with the
  // timer deliberately stopped, so switching virtual desktop away and back
  // started the clock on a menu. timerWanted tracks the exercise's own
  // intent instead.
  handleVisibilityChange = () => {
    if(document.hidden) {
      this.pauseTimer();
    } else if(this.timerWanted) {
      this.resumeTimer();
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
          onOpenSettings={this.openSettings}
          onCloseSettings={this.closeSettings}
          totalTimeMs={this.state.totalTimeMs}
          tableHeaderInfo={this.state.tableHeaderInfo}
          helpContent={this.state.helpContent}
        />
        <div className="outercontainer">
          <div className="container game">
            {
              this.state.gameState === 'settings' ? (
                <SettingsScreen onBack={this.closeSettings} />
              ) : (
                <GameContainer
                  gameState={this.state.gameState}
                  handleStartGame={this.startGame}
                  handleEndGame={this.endGame}
                  startTimer={this.startTimer}
                  stopTimer={this.stopTimer}
                  setTableHeaderInfo={this.setTableHeaderInfo}
                  setHelpContent={this.setHelpContent}
                />
              )
            }
          </div>
        </div>
      </div>
    )
  }
}

export default App;
