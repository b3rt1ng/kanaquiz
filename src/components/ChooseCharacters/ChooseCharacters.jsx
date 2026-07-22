import React, { Component } from 'react';
import { kanaDictionary } from '../../data/kanaDictionary';
import './ChooseCharacters.scss';
import CharacterGroup from './CharacterGroup';

class ChooseCharacters extends Component {
  state = {
    errMsg : '',
    selectedGroups: this.props.selectedGroups,
    showAlternatives: [],
    showSimilars: [],
    startIsVisible: true,
    stage4PickerOpen: false,
    otherExercisesOpen: false
  }

  componentDidMount() {
    this.testIsStartVisible();
    window.addEventListener('resize', this.testIsStartVisible);
    window.addEventListener('scroll', this.testIsStartVisible);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.testIsStartVisible);
    window.removeEventListener('scroll', this.testIsStartVisible);
  }

  componentDidUpdate(prevProps, prevState) {
    this.testIsStartVisible();
  }

  testIsStartVisible = () => {
    if(this.startRef) {
      const rect = this.startRef.getBoundingClientRect();
      if(rect.y > window.innerHeight && this.state.startIsVisible)
        this.setState({ startIsVisible: false });
      else if(rect.y <= window.innerHeight && !this.state.startIsVisible)
        this.setState({ startIsVisible: true });
    }
  }

  scrollToStart() {
    if(this.startRef) {
      const rect = this.startRef.getBoundingClientRect();
      const absTop = rect.top + window.pageYOffset;
      const scrollPos = absTop - window.innerHeight + 50;
      window.scrollTo(0, scrollPos > 0 ? scrollPos : 0);
    }
  }

  getIndex(groupName) {
    return this.state.selectedGroups.indexOf(groupName);
  }

  isSelected(groupName) {
    return this.getIndex(groupName) > -1 ? true : false;
  }

  removeSelect(groupName) {
    if(this.getIndex(groupName)<0)
      return;
    let newSelectedGroups = this.state.selectedGroups.slice();
    newSelectedGroups.splice(this.getIndex(groupName), 1);
    this.setState({selectedGroups: newSelectedGroups});
  }

  addSelect(groupName) {
    this.setState({errMsg: '', selectedGroups: this.state.selectedGroups.concat(groupName)});
  }

  toggleSelect = groupName => {
    if(this.getIndex(groupName) > -1)
      this.removeSelect(groupName);
    else
      this.addSelect(groupName);
  }

  selectAll(whichKana, altOnly=false, similarOnly=false) {
    const thisKana = kanaDictionary[whichKana];
    let newSelectedGroups = this.state.selectedGroups.slice();
    Object.keys(thisKana).forEach(groupName => {
      if(!this.isSelected(groupName) && (
        (altOnly && groupName.endsWith('_a')) ||
        (similarOnly && groupName.endsWith('_s')) ||
        (!altOnly && !similarOnly)
      ))
        newSelectedGroups.push(groupName);
    });
    this.setState({errMsg: '', selectedGroups: newSelectedGroups});
  }

  selectNone(whichKana, altOnly=false, similarOnly=false) {
    let newSelectedGroups = [];
    this.state.selectedGroups.forEach(groupName => {
      let mustBeRemoved = false;
      Object.keys(kanaDictionary[whichKana]).forEach(removableGroupName => {
        if(removableGroupName === groupName && (
          (altOnly && groupName.endsWith('_a')) ||
          (similarOnly && groupName.endsWith('_s')) ||
          (!altOnly && !similarOnly)
        ))
          mustBeRemoved = true;
      });
      if(!mustBeRemoved)
        newSelectedGroups.push(groupName);
    });
    this.setState({selectedGroups: newSelectedGroups});
  }

  toggleAlternative(whichKana, postfix) {
    let show = postfix == '_a' ? this.state.showAlternatives : this.state.showSimilars;
    const idx = show.indexOf(whichKana);
    if(idx >= 0)
      show.splice(idx, 1);
    else
      show.push(whichKana)
    if(postfix == '_a')
      this.setState({showAlternatives: show});
    if(postfix == '_s')
      this.setState({showSimilars: show});
  }

  getSelectedAlternatives(whichKana, postfix) {
    return this.state.selectedGroups.filter(groupName => {
      return groupName.startsWith(whichKana == 'hiragana' ? 'h_' : 'k_') &&
        groupName.endsWith(postfix);
    }).length;
  }

  getAmountOfAlternatives(whichKana, postfix) {
    return Object.keys(kanaDictionary[whichKana]).filter(groupName => {
      return groupName.endsWith(postfix);
    }).length;
  }

  alternativeToggleRow(whichKana, postfix, show) {
    let checkBtn = "glyphicon glyphicon-small glyphicon-"
    let status;
    if(this.getSelectedAlternatives(whichKana, postfix) >= this.getAmountOfAlternatives(whichKana, postfix))
      status = 'check';
    else if(this.getSelectedAlternatives(whichKana, postfix) > 0)
      status = 'check half';
    else
      status = 'unchecked'
    checkBtn += status

    return <div
      key={'alt_toggle_' + whichKana + postfix}
      onClick={() => this.toggleAlternative(whichKana, postfix)}
      className="choose-row"
    >
      <span
        className={checkBtn}
        onClick={ e => {
          if(status == 'check')
            this.selectNone(whichKana, postfix == '_a', postfix == '_s');
          else if(status == 'check half' || status == 'unchecked')
            this.selectAll(whichKana, postfix == '_a', postfix == '_s');
          e.stopPropagation();
        }}
      ></span>
      {
        show ? <span className="toggle-caret">&#9650;</span>
          : <span className="toggle-caret">&#9660;</span>
      }
      {
        postfix == '_a' ? 'Alternative characters (ga · ba · kya..)' :
          'Look-alike characters'
      }
    </div>
  }

  showGroupRows(whichKana, showAlternatives, showSimilars = false) {
    const thisKana = kanaDictionary[whichKana];
    let rows = [];
    Object.keys(thisKana).forEach((groupName, idx) => {
      if(groupName == "h_group11_a" || groupName == "k_group13_a")
        rows.push(this.alternativeToggleRow(whichKana, "_a", showAlternatives));
      if(groupName == "k_group11_s")
        rows.push(this.alternativeToggleRow(whichKana, "_s", showSimilars));

      if((!groupName.endsWith("a") || showAlternatives) &&
        (!groupName.endsWith("s") || showSimilars)) {
        rows.push(<CharacterGroup
          key={idx}
          groupName={groupName}
          selected={this.isSelected(groupName)}
          characters={thisKana[groupName].characters}
          handleToggleSelect={this.toggleSelect}
        />);
      }
    });

    return rows;
  }

  startGame() {
    if(this.state.selectedGroups.length < 1) {
      this.setState({ errMsg: 'Choose at least one group!'});
      return;
    }
    this.props.handleStartGame(this.state.selectedGroups);
  }

  startAtStage(stage) {
    if(this.state.selectedGroups.length < 1) {
      this.setState({ errMsg: 'Choose at least one group!'});
      return;
    }
    this.setState({ errMsg: '', stage4PickerOpen: false });
    this.props.startAtStage(this.state.selectedGroups, stage);
  }

  startStage4(difficulty) {
    if(this.state.selectedGroups.length < 1) {
      this.setState({ errMsg: 'Choose at least one group!'});
      return;
    }
    this.setState({ errMsg: '', stage4PickerOpen: false });
    this.props.startAtStage(this.state.selectedGroups, 4, difficulty);
  }

  startTable() {
    if(this.state.selectedGroups.length < 1) {
      this.setState({ errMsg: 'Choose at least one group!'});
      return;
    }
    this.setState({ errMsg: '' });
    this.props.startTableExercise(this.state.selectedGroups);
  }

  startListening() {
    if(this.state.selectedGroups.length < 1) {
      this.setState({ errMsg: 'Choose at least one group!'});
      return;
    }
    this.setState({ errMsg: '' });
    this.props.startListeningExercise(this.state.selectedGroups);
  }

  startCounting() {
    // Not kana-group dependent, so the group checkboxes above are ignored.
    this.setState({ errMsg: '' });
    this.props.startCountingExercise();
  }

  startKanji() {
    // Not kana-group dependent either - it picks its own kanji themes.
    this.setState({ errMsg: '' });
    this.props.startKanjiExercise();
  }

  render() {
    return (
      <div className="choose-characters">
        <div className="learn-kanji-cta" onClick={() => this.startKanji()}>
          <span className="learn-kanji-line">LEARN</span>
          <span className="learn-kanji-line learn-kanji-kanji">漢字</span>
          <span className="learn-kanji-line">HERE</span>
        </div>
        <div className="row">
          <div className="col-xs-12">
            <div className="panel panel-default">
              <div className="panel-body welcome">
                <h4>Welcome to Kana Pro!</h4>
                <p>Please choose the groups of characters that you'd like to be studying.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-6">
            <div className="panel panel-default">
              <div className="panel-heading">Hiragana · ひらがな</div>
              <div className="panel-body selection-areas">
                {this.showGroupRows('hiragana', this.state.showAlternatives.indexOf('hiragana') >= 0)}
              </div>
              <div className="panel-footer text-center">
                <a href="javascript:;" onClick={()=>this.selectAll('hiragana')}>All</a> &nbsp;&middot;&nbsp; <a href="javascript:;"
                  onClick={()=>this.selectNone('hiragana')}>None</a>
                &nbsp;&middot;&nbsp; <a href="javascript:;" onClick={()=>this.selectAll('hiragana', true)}>All alternative</a>
                &nbsp;&middot;&nbsp; <a href="javascript:;" onClick={()=>this.selectNone('hiragana', true)}>No alternative</a>
              </div>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="panel panel-default">
              <div className="panel-heading">Katakana · カタカナ</div>
              <div className="panel-body selection-areas">
                {this.showGroupRows('katakana', this.state.showAlternatives.indexOf('katakana') >= 0, this.state.showSimilars.indexOf('katakana') >= 0)}
              </div>
              <div className="panel-footer text-center">
                <a href="javascript:;" onClick={()=>this.selectAll('katakana')}>All</a> &nbsp;&middot;&nbsp; <a href="javascript:;"
                  onClick={()=>this.selectNone('katakana')}>None
                </a>
                &nbsp;&middot;&nbsp; <a href="javascript:;" onClick={()=>this.selectAll('katakana', true)}>All alternative</a>
                &nbsp;&middot;&nbsp; <a href="javascript:;" onClick={()=>this.selectNone('katakana', true)}>No alternative</a>
              </div>
            </div>
          </div>
          <div className="col-sm-3 col-xs-12 pull-right">
            <div className="direct-practice">
              <div className="direct-practice-buttons">
                <button
                  className="btn btn-default practice-btn"
                  onClick={() => this.setState(s => ({ otherExercisesOpen: !s.otherExercisesOpen, stage4PickerOpen: false }))}
                >Other exercises</button>
              </div>
              {
                this.state.otherExercisesOpen &&
                  <div className="other-exercises-panel">
                    <div className="practice-subpicker">
                      <button className="btn btn-default practice-btn" onClick={() => this.startAtStage(1)}>Stage 1</button>
                      <button className="btn btn-default practice-btn" onClick={() => this.startAtStage(2)}>Stage 2</button>
                      <button className="btn btn-default practice-btn" onClick={() => this.startAtStage(3)}>Stage 3</button>
                      <button className="btn btn-default practice-btn"
                        onClick={() => this.setState(s => ({ stage4PickerOpen: !s.stage4PickerOpen }))}
                      >Stage 4</button>
                      <button className="btn btn-info practice-btn" onClick={() => this.startTable()}>Table</button>
                      <button className="btn btn-info practice-btn" onClick={() => this.startListening()}>Listening</button>
                      <button className="btn btn-info practice-btn" onClick={() => this.startCounting()}>Counting</button>
                      <button className="btn btn-info practice-btn" onClick={() => this.startKanji()}>Kanji</button>
                    </div>
                    {
                      this.state.stage4PickerOpen &&
                        <div className="practice-subpicker stage4-subpicker">
                          <button className="btn btn-success" onClick={() => this.startStage4(1)}>Level 1 (3 characters)</button>
                          <button className="btn btn-warning" onClick={() => this.startStage4(2)}>Level 2 (5 characters)</button>
                          <button className="btn btn-danger" onClick={() => this.startStage4(3)}>Level 3 (8 characters)</button>
                        </div>
                    }
                  </div>
              }
            </div>
          </div>
          <div className="col-sm-offset-3 col-sm-6 col-xs-12 text-center">
            {
              this.state.errMsg != '' &&
                <div className="error-message">{this.state.errMsg}</div>
            }
            <button ref={c => this.startRef = c} className="btn btn-danger startgame-button" onClick={() => this.startGame()}>Start the Quiz!</button>
          </div>
          <div className="down-arrow"
            style={{display: this.state.startIsVisible ? 'none' : 'block'}}
            onClick={(e) => this.scrollToStart(e)}
          >
            Start
          </div>
        </div>
      </div>
    );
  }
}

export default ChooseCharacters;
