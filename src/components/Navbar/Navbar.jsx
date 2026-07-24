import React, { Component } from 'react';
import './Navbar.scss';

class Navbar extends Component {
  state = { helpOpen: false };

  toggleHelp = () => {
    this.setState(prev => ({ helpOpen: !prev.helpOpen }));
  }

  componentDidUpdate(prevProps) {
    // Don't leave a stale open panel behind once its exercise unmounts.
    if (prevProps.helpContent && !this.props.helpContent && this.state.helpOpen) {
      this.setState({ helpOpen: false });
    }
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
                this.props.gameState == 'chooseCharacters' ? (
                  <li id="nav-kanaquiz">
                    <p className="nav navbar-text">
                      Antoine's japanese learning app
                      <button
                        className="effect-settings-toggle"
                        title="Settings"
                        onClick={this.props.onOpenSettings}
                      >
                        <span className="glyphicon glyphicon-cog"></span>
                      </button>
                    </p>
                  </li>
                ) : (
                  <li id="nav-choosecharacters">
                    <a
                      href="javascript:;"
                      onClick={this.props.gameState == 'settings' ? this.props.onCloseSettings : this.props.handleEndGame}
                    >
                      <span className="glyphicon glyphicon-small glyphicon-arrow-left"></span> Back to menu
                    </a>
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
