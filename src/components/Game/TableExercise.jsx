import React, { Component, PureComponent } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import { findRomajisAtKanaKey, arrayContains, shuffle } from '../../data/helperFuncs';
import { playWrongSound, playComboSound, playKeySound, playComboBreakSound } from '../../data/soundEffects';
import { pickCompliment } from '../../data/compliments';
import ResultsCharts from './ResultsCharts';
import ComboIndicator from './ComboIndicator';
import GlitchEffect from './GlitchEffect';
import FlameEffect from './FlameEffect';
import ComplimentPopup, { buildCompliment } from './ComplimentPopup';
import { getEffectSettings } from '../../data/effectSettings';
import './TableExercise.scss';

// Kana keys drawn from the character groups the user selected on the menu
// screen - the same selection used to start Stage 1-4 / the full quiz. A
// character can end up here via more than one selected group (e.g. its base
// group and a "look-alike" group both selected); the object-keyed cells
// dedupe that naturally.
function getSelectedKanaKeys(kanaType, decidedGroups) {
  const keys = [];
  Object.keys(kanaDictionary[kanaType]).forEach(groupName => {
    if(arrayContains(groupName, decidedGroups)) {
      keys.push(...Object.keys(kanaDictionary[kanaType][groupName].characters));
    }
  });
  return keys;
}

class TableExercise extends Component {
  constructor(props) {
    super(props);

    // Only build a grid for a script (hiragana/katakana) if at least one of
    // its groups was actually selected.
    this.kanaTypes = Object.keys(kanaDictionary).filter(type =>
      Object.keys(kanaDictionary[type]).some(groupName => arrayContains(groupName, this.props.decidedGroups))
    );

    this.orderedKana = {};
    this.flatOrder = [];
    const cells = {};
    this.kanaTypes.forEach(type => {
      const keys = getSelectedKanaKeys(type, this.props.decidedGroups);
      shuffle(keys);
      this.orderedKana[type] = keys;
      this.flatOrder.push(...keys);
      keys.forEach(kana => {
        cells[kana] = { value: '', status: 'empty', timeMs: 0 };
      });
    });

    this.state = { cells, combo: 0, compliment: null };
    this.focusStart = {};
    this.inputRefs = {};
    // Stable per-kana callbacks, needed for TableCell's PureComponent check
    // to actually skip untouched cells on every keystroke.
    this.cellHandlers = {};
    this.complimentSeq = 0;
    // Read by GlitchEffect to keep its rectangles off the grid.
    this.trembleRef = React.createRef();
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
    clearTimeout(this.complimentTimeout);
  }

  showCompliment = (isFast, combo) => {
    clearTimeout(this.complimentTimeout);
    this.complimentSeq++;
    this.setState({ compliment: buildCompliment(pickCompliment(isFast), combo) });
    this.complimentTimeout = setTimeout(() => {
      this.setState({ compliment: null });
    }, 1500);
  }

  getKanaTypeLabel() {
    if(this.kanaTypes.length === 2) return 'Hiragana & Katakana';
    return this.kanaTypes[0] === 'hiragana' ? 'Hiragana · ひらがな' : 'Katakana · カタカナ';
  }

  updateHeaderInfo = () => {
    if(!this.props.setTableHeaderInfo) return;
    const totalCells = Object.keys(this.state.cells).length;
    const attemptedCells = Object.values(this.state.cells).filter(c => c.status !== 'empty').length;
    this.props.setTableHeaderInfo({
      title: 'Table Exercise',
      subtitle: `${this.getKanaTypeLabel()} - ${attemptedCells}/${totalCells} filled`
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
    else if(hadActiveCombo) playComboBreakSound(this.state.combo);
    else playWrongSound();

    if(isCorrect) {
      this.showCompliment(elapsedMs < 1500, newCombo);
    }

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

  getCellHandlers = (kana) => {
    if(!this.cellHandlers[kana]) {
      this.cellHandlers[kana] = {
        inputRef: el => this.inputRefs[kana] = el,
        onFocus: () => this.handleFocus(kana),
        onChange: (e) => this.handleChange(kana, e.target.value),
        onBlur: () => this.handleBlur(kana),
        onKeyDown: (e) => this.handleKeyDown(e, kana)
      };
    }
    return this.cellHandlers[kana];
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
      const keys = getSelectedKanaKeys(type, this.props.decidedGroups);
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
          {this.orderedKana[kanaType].map(kana => (
            <TableCell
              key={kana}
              kana={kana}
              cell={this.state.cells[kana]}
              correctRomaji={findRomajisAtKanaKey(kana, kanaDictionary)[0]}
              {...this.getCellHandlers(kana)}
            />
          ))}
        </div>
      </div>
    );
  }

  render() {
    const complete = this.isComplete();
    const totalCells = Object.keys(this.state.cells).length;
    const correctCells = Object.values(this.state.cells).filter(c => c.status === 'correct').length;

    const effects = getEffectSettings();
    const trembleOn = effects.tremble && this.state.combo > 0;
    const trembleAmp = Math.min(this.state.combo * 0.6, 1.2);
    const trembleDuration = Math.max(2.2 - this.state.combo * 0.09, 1.3);
    const trembleStyle = trembleOn
      ? { '--tremble-amp': trembleAmp + 'px', animationDuration: trembleDuration + 's' }
      : {};
    const trembleClass = 'table-tremble' + (trembleOn ? ' tremble-active' : '');

    return (
      <div className="table-exercise text-center">
        {effects.combo && <ComboIndicator combo={this.state.combo} key={'combo'+this.state.combo} />}
        {effects.glitch && <GlitchEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.flames && <FlameEffect combo={this.state.combo} safeZoneRef={this.trembleRef} />}
        {effects.compliments && <ComplimentPopup compliment={this.state.compliment} key={'compliment'+this.complimentSeq} />}
        <div className={trembleClass} style={trembleStyle} ref={this.trembleRef}>
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
      </div>
    );
  }
}

// PureComponent + stable per-kana props (see getCellHandlers) so a keystroke
// only re-renders this cell, not the whole grid.
class TableCell extends PureComponent {
  render() {
    const { kana, cell, correctRomaji, inputRef, onFocus, onChange, onBlur, onKeyDown } = this.props;
    return (
      <div className={`kana-cell ${cell.status}`}>
        <div className="kana-glyph">{kana}</div>
        <input
          type="text"
          className="kana-input"
          autoComplete="off"
          value={cell.value}
          ref={inputRef}
          onFocus={onFocus}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        <div className="kana-answer">
          {cell.status !== 'empty' ? correctRomaji : ' '}
        </div>
      </div>
    );
  }
}

export default TableExercise;
