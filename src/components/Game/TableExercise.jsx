import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { findRomajisAtKanaKey, arrayContains } from '../../data/helperFuncs';
import { playCorrectSound, playWrongSound } from '../../data/soundEffects';
import ResultsCharts from './ResultsCharts';
import './TableExercise.scss';

// Only the base 46-character groups (no dakuten/handakuten/yoon variants,
// no look-alike duplicates) - this is the classic gojuon table layout.
function getBaseGroups(kanaType) {
  return Object.keys(kanaDictionary[kanaType]).filter(
    groupName => !groupName.endsWith('_a') && !groupName.endsWith('_s')
  );
}

class TableExercise extends Component {
  constructor(props) {
    super(props);

    this.kanaTypes = this.props.tableKanaType === 'both'
      ? ['hiragana', 'katakana']
      : [this.props.tableKanaType];

    const cells = {};
    this.kanaTypes.forEach(type => {
      getBaseGroups(type).forEach(groupName => {
        Object.keys(kanaDictionary[type][groupName].characters).forEach(kana => {
          cells[kana] = { value: '', status: 'empty', timeMs: 0 };
        });
      });
    });

    this.state = { cells };
    this.focusStart = {};
  }

  handleFocus = (kana) => {
    this.focusStart[kana] = Date.now();
  }

  handleChange = (kana, value) => {
    this.setState(prevState => ({
      cells: {
        ...prevState.cells,
        [kana]: { ...prevState.cells[kana], value: value.replace(/\s+/g, '') }
      }
    }));
  }

  handleBlur = (kana) => {
    const cell = this.state.cells[kana];
    if(!cell.value) return; // leave unattempted cells alone so the user can come back

    const acceptable = findRomajisAtKanaKey(kana, kanaDictionary);
    const isCorrect = arrayContains(cell.value.toLowerCase(), acceptable);
    const elapsedMs = this.focusStart[kana] ? Math.min(Date.now() - this.focusStart[kana], 30000) : 0;

    if(isCorrect) playCorrectSound(); else playWrongSound();

    this.setState(prevState => ({
      cells: {
        ...prevState.cells,
        [kana]: {
          ...prevState.cells[kana],
          status: isCorrect ? 'correct' : 'wrong',
          timeMs: elapsedMs
        }
      }
    }));
  }

  handleKeyDown = (e) => {
    if(e.key === 'Enter') e.target.blur();
  }

  isComplete() {
    return Object.values(this.state.cells).every(c => c.status !== 'empty');
  }

  buildResultsData() {
    const characterStats = {};
    const confusionPairs = {};

    Object.keys(this.state.cells).forEach(kana => {
      const cell = this.state.cells[kana];
      const romaji = findRomajisAtKanaKey(kana, kanaDictionary)[0];
      characterStats[kana] = {
        correct: cell.status === 'correct' ? 1 : 0,
        total: 1,
        timeMs: cell.timeMs,
        romaji
      };
      if(cell.status === 'wrong') {
        confusionPairs[kana] = { [cell.value.toLowerCase()]: 1 };
      }
    });

    return { characterStats, confusionPairs };
  }

  resetTable = () => {
    const cells = {};
    Object.keys(this.state.cells).forEach(kana => {
      cells[kana] = { value: '', status: 'empty', timeMs: 0 };
    });
    this.focusStart = {};
    this.setState({ cells });
    window.scrollTo(0, 0);
  }

  renderTable(kanaType) {
    const groups = getBaseGroups(kanaType);
    return (
      <div className="kana-table" key={kanaType}>
        <h3 className="kana-table-title">
          {kanaType === 'hiragana' ? 'Hiragana · ひらがな' : 'Katakana · カタカナ'}
        </h3>
        {groups.map(groupName => (
          <div className="kana-table-row" key={groupName}>
            {Object.keys(kanaDictionary[kanaType][groupName].characters).map(kana => {
              const cell = this.state.cells[kana];
              const correctRomaji = findRomajisAtKanaKey(kana, kanaDictionary)[0];
              return (
                <div className={`kana-cell ${cell.status}`} key={kana}>
                  <div className="kana-glyph">{kana}</div>
                  <input
                    type="text"
                    className="kana-input"
                    autoComplete="off"
                    value={cell.value}
                    onFocus={() => this.handleFocus(kana)}
                    onChange={(e) => this.handleChange(kana, e.target.value)}
                    onBlur={() => this.handleBlur(kana)}
                    onKeyDown={this.handleKeyDown}
                  />
                  <div className="kana-answer">
                    {cell.status !== 'empty' ? correctRomaji : ' '}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  render() {
    const complete = this.isComplete();
    const totalCells = Object.keys(this.state.cells).length;
    const attemptedCells = Object.values(this.state.cells).filter(c => c.status !== 'empty').length;
    const correctCells = Object.values(this.state.cells).filter(c => c.status === 'correct').length;

    return (
      <div className="table-exercise text-center">
        <h1>Table Exercise</h1>
        <p className="table-progress">{attemptedCells}/{totalCells} filled</p>

        {this.kanaTypes.map(type => this.renderTable(type))}

        {
          complete && (() => {
            const { characterStats, confusionPairs } = this.buildResultsData();
            const percentage = Math.round((correctCells / totalCells) * 100);
            return (
              <div className="table-results">
                <h2>Results</h2>
                <p className="table-score">{correctCells}/{totalCells} correct ({percentage}%)</p>
                <ResultsCharts characterStats={characterStats} confusionPairs={confusionPairs} />
                <p>
                  <button className="btn btn-primary try-again" onClick={this.resetTable}>Try Again</button>
                </p>
                <p>
                  <button className="btn btn-default back-to-menu" onClick={this.props.handleEndGame}>Back to menu</button>
                </p>
              </div>
            );
          })()
        }
      </div>
    );
  }
}

export default TableExercise;
