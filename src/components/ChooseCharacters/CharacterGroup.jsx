import React, { PureComponent } from 'react';

// PureComponent: groupName/selected/characters/handleToggleSelect are all
// either primitives or stable references from the parent (see
// ChooseCharacters.jsx - characters comes straight from the static
// kanaDictionary, handleToggleSelect is a class-field arrow function), so
// an unrelated re-render of the ~150-row picker (toggling one other
// checkbox, opening a side panel, ...) can skip every row except the one
// that actually changed.
class CharacterGroup extends PureComponent {
  // Built once from props.characters (which never changes for a mounted
  // group) instead of rejoining both strings on every mouseover/mouseout/
  // touch event - with ~150+ of these rows in the character picker, a mouse
  // sweep across the panel used to redo this string-building work on every
  // row it crossed for no reason, since the characters themselves are fixed.
  constructor(props) {
    super(props);
    const romaji = [];
    const kana = [];
    Object.keys(props.characters).forEach(character => {
      romaji.push(props.characters[character][0]);
      kana.push(character);
    });
    this.romajiChars = romaji.join(' · ');
    this.kanaChars = kana.join(' · ');
    this.state = { shownChars: this.romajiChars };
  }

  showRomaji = () => this.setState({ shownChars: this.romajiChars })
  showKana = () => this.setState({ shownChars: this.kanaChars })

  render() {
    return (
      <div
      className={
        'choose-row'
          + (this.props.groupName.endsWith('_a') || this.props.groupName.endsWith('_s') ? ' alt-row' : '')
          + (['h_group16_a','k_group18_a','k_group29_a'].includes(this.props.groupName) ? ' divider-row' : '')
      }
      onClick={() => {
        this.props.handleToggleSelect(this.props.groupName);
        this.showRomaji();
      }}
      onMouseDown={this.showKana}
      onMouseOut={this.showRomaji}
      onTouchStart={this.showKana}
      onTouchEnd={this.showRomaji}
    >
      <span className={this.props.selected ?
          'glyphicon glyphicon-small glyphicon-check' :
          'glyphicon glyphicon-small glyphicon-unchecked'}></span> {this.state.shownChars}
      </div>
    );
  }
}

export default CharacterGroup;
