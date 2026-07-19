import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { findRomajisAtKanaKey, arrayContains, shuffle } from '../../data/helperFuncs';
import { playWrongSound, playComboSound, playKeySound, playComboBreakSound } from '../../data/soundEffects';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import './TableExercise.scss';

// The base 46 gojuon characters plus dakuten/handakuten/yoon variants
// (ga, pa, kya, fa..) - everything except the "_s" look-alike groups,
// which just re-list characters already included elsewhere and would
// collide with them (cells are keyed by the kana glyph itself).
function getTableKanaKeys(kanaType) {
  const keys = [];
  Object.keys(kanaDictionary[kanaType]).forEach(groupName => {
    if(groupName.endsWith('_s')) return;
    keys.push(...Object.keys(kanaDictionary[kanaType][groupName].characters));
  });
  return keys;
}

class TableExercise extends Component {
  constructor(props) {
    super(props);

    this.kanaTypes = this.props.tableKanaType === 'both'
      ? ['hiragana', 'katakana']
      : [this.props.tableKanaType];

    this.orderedKana = {};
    this.flatOrder = [];
    const cells = {};
    this.kanaTypes.forEach(type => {
      const keys = getTableKanaKeys(type);
      shuffle(keys);
      this.orderedKana[type] = keys;
      this.flatOrder.push(...keys);
      keys.forEach(kana => {
        cells[kana] = { value: '', status: 'empty', timeMs: 0 };
      });
    });

    this.state = { cells, combo: 0 };
    this.focusStart = {};
    this.inputRefs = {};
  }

  componentDidMount() {
    this.updateHeaderInfo();
    this.focusFirstCell();
  }

  focusFirstCell = () => {
    const firstKana = this.flatOrder[0];
    const input = this.inputRefs[firstKana];
    if(input) input.focus();
  }

  focusNextCell = (kana) => {
    const nextKana = this.flatOrder[this.flatOrder.indexOf(kana) + 1];
    const input = nextKana && this.inputRefs[nextKana];
    if(input) input.focus();
    return !!input;
  }

  componentWillUnmount() {
    if(this.props.setTableHeaderInfo) this.props.setTableHeaderInfo(null);
  }

  getKanaTypeLabel() {
    if(this.props.tableKanaType === 'both') return 'Hiragana & Katakana';
    return this.props.tableKanaType === 'hiragana' ? 'Hiragana · ひらがな' : 'Katakana · カタカナ';
  }

  updateHeaderInfo = () => {
    if(!this.props.setTableHeaderInfo) return;
    const totalCells = Object.keys(this.state.cells).length;
    const attemptedCells = Object.values(this.state.cells).filter(c => c.status !== 'empty').length;
    this.props.setTableHeaderInfo({
      title: 'Table Exercise',
      subtitle: `${this.getKanaTypeLabel()} — ${attemptedCells}/${totalCells} filled`
    });
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

    // Combo streak: climbs on consecutive correct cells, resets on a miss.
    const hadActiveCombo = this.state.combo > 0;
    const newCombo = isCorrect ? this.state.combo + 1 : 0;

    if(isCorrect) playComboSound(newCombo);
    else if(hadActiveCombo) playComboBreakSound();
    else playWrongSound();

    this.setState(prevState => ({
      cells: {
        ...prevState.cells,
        [kana]: {
          ...prevState.cells[kana],
          status: isCorrect ? 'correct' : 'wrong',
          timeMs: elapsedMs
        }
      },
      combo: newCombo
    }), this.updateHeaderInfo);
  }

  handleKeyDown = (e, kana) => {
    if(e.key === 'Enter') {
      e.preventDefault();
      // Focusing the next cell blurs this one, which runs validation;
      // fall back to a plain blur when we're on the very last cell.
      if(!this.focusNextCell(kana)) e.target.blur();
    } else {
      playKeySound();
    }
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
    this.flatOrder = [];
    this.kanaTypes.forEach(type => {
      const keys = getTableKanaKeys(type);
      shuffle(keys);
      this.orderedKana[type] = keys;
      this.flatOrder.push(...keys);
      keys.forEach(kana => {
        cells[kana] = { value: '', status: 'empty', timeMs: 0 };
      });
    });
    this.focusStart = {};
    this.setState({ cells, combo: 0 }, () => {
      this.updateHeaderInfo();
      this.focusFirstCell();
    });
    window.scrollTo(0, 0);
  }

  renderTable(kanaType) {
    return (
      <div className="kana-table" key={kanaType}>
        <div className="kana-table-grid">
          {this.orderedKana[kanaType].map(kana => {
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
                  ref={el => this.inputRefs[kana] = el}
                  onFocus={() => this.handleFocus(kana)}
                  onChange={(e) => this.handleChange(kana, e.target.value)}
                  onBlur={() => this.handleBlur(kana)}
                  onKeyDown={(e) => this.handleKeyDown(e, kana)}
                />
                <div className="kana-answer">
                  {cell.status !== 'empty' ? correctRomaji : ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  render() {
    const complete = this.isComplete();
    const totalCells = Object.keys(this.state.cells).length;
    const correctCells = Object.values(this.state.cells).filter(c => c.status === 'correct').length;

    return (
      <div className="table-exercise text-center">
        <ComboIndicator combo={this.state.combo} key={'combo'+this.state.combo} />
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
