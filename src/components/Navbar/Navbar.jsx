import React, { Component } from 'react';
import './Navbar.scss';

class Navbar extends Component {
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
                  <React.Fragment>
                    <li id="nav-choosecharacters">
                      <a href="javascript:;" onClick={this.props.handleEndGame}>
                        <span className="glyphicon glyphicon-small glyphicon-arrow-left"></span> Back to menu
                      </a>
                    </li>
                    {
                      this.props.tableHeaderInfo && (
                        <li className="table-header-info">
                          <p className="nav navbar-text">
                            <strong>{this.props.tableHeaderInfo.title}</strong>
                            {
                              this.props.tableHeaderInfo.subtitle &&
                                <span className="table-header-subtitle"> — {this.props.tableHeaderInfo.subtitle}</span>
                            }
                          </p>
                        </li>
                      )
                    }
                  </React.Fragment>
                ) : <li id="nav-kanaquiz"><p className="nav navbar-text">Kana Pro</p></li>
              }
            </ul>
            {
              this.props.gameState == 'game' && (
                <p className="nav navbar-text timer-display">
                  <span className="glyphicon glyphicon-time"></span> {this.formatTime(this.props.totalTimeMs)}
                </p>
              )
            }
          </div>
        </div>
      </nav>
    )
  }
}

export default Navbar;
