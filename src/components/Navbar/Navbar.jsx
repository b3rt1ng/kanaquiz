import React, { Component } from 'react';
import { EFFECT_LIST, getEffectSettings, setEffectSetting } from '../../data/effectSettings';
import './Navbar.scss';

class Navbar extends Component {
  state = { settingsOpen: false, helpOpen: false, effects: getEffectSettings() };

  toggleSettings = () => {
    this.setState(prev => ({ settingsOpen: !prev.settingsOpen }));
  }

  toggleHelp = () => {
    this.setState(prev => ({ helpOpen: !prev.helpOpen }));
  }

  componentDidUpdate(prevProps) {
    // Don't leave a stale open panel behind once its exercise unmounts.
    if (prevProps.helpContent && !this.props.helpContent && this.state.helpOpen) {
      this.setState({ helpOpen: false });
    }
  }

  handleEffectToggle = (key) => {
    this.setState(prev => ({ effects: setEffectSetting(key, !prev.effects[key]) }));
  }

  formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  render() {
    return (
      <nav className="navbar navbar-inverse navbar-fixed-top" role="navigation">
        <div className="container">
          <div id="navbar">
            <ul className="nav navbar-nav">
              {
                this.props.gameState == 'game' ? (
                  <li id="nav-choosecharacters">
                    <a href="javascript:;" onClick={this.props.handleEndGame}>
                      <span className="glyphicon glyphicon-small glyphicon-arrow-left"></span> Back to menu
                    </a>
                  </li>
                ) : (
                  <li id="nav-kanaquiz">
                    <p className="nav navbar-text">
                      Kana Pro
                      <button
                        className="effect-settings-toggle"
                        title="Effect settings"
                        onClick={this.toggleSettings}
                      >
                        <span className="glyphicon glyphicon-cog"></span>
                      </button>
                    </p>
                    {
                      this.state.settingsOpen && (
                        <div className="effect-settings-panel">
                          <p className="effect-settings-title">Effects</p>
                          {EFFECT_LIST.map(({ key, label }) => (
                            <label className="effect-settings-row" key={key}>
                              <input
                                type="checkbox"
                                checked={this.state.effects[key] !== false}
                                onChange={() => this.handleEffectToggle(key)}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      )
                    }
                  </li>
                )
              }
            </ul>
            {
              this.props.gameState == 'game' && this.props.tableHeaderInfo && (
                <p className="nav navbar-text table-header-info">
                  <strong>{this.props.tableHeaderInfo.title}</strong>
                  {
                    this.props.tableHeaderInfo.subtitle &&
                      <span className="table-header-subtitle"> — {this.props.tableHeaderInfo.subtitle}</span>
                  }
                </p>
              )
            }
            {
              this.props.gameState == 'game' && (
                <div className="timer-help-group">
                  <p className="nav navbar-text timer-display">
                    <span className="glyphicon glyphicon-time"></span> {this.formatTime(this.props.totalTimeMs)}
                  </p>
                  {
                    this.props.helpContent && (
                      <button
                        className="help-toggle"
                        title="How to type"
                        onClick={this.toggleHelp}
                      >
                        <span className="glyphicon glyphicon-question-sign"></span>
                      </button>
                    )
                  }
                  {
                    this.props.helpContent && this.state.helpOpen && (
                      <div className="help-panel help-panel-right">
                        {this.props.helpContent}
                      </div>
                    )
                  }
                </div>
              )
            }
          </div>
        </div>
      </nav>
    )
  }
}

export default Navbar;
