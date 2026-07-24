import React, { Component } from 'react';
import { EFFECT_LIST, PRESETS, getEffectSettings, setEffectSetting, applyPreset, matchingPresetKey } from '../../data/effectSettings';
import './SettingsScreen.scss';

const GROUPS = [
  { key: 'visual', title: 'Visual Effects' },
  { key: 'sound', title: 'Sound' }
];

class SettingsScreen extends Component {
  state = { effects: getEffectSettings() };

  handleToggle = (key) => {
    this.setState(prev => ({ effects: setEffectSetting(key, !prev.effects[key]) }));
  }

  handlePreset = (presetKey) => {
    this.setState({ effects: applyPreset(presetKey) });
  }

  renderPresets() {
    const activeKey = matchingPresetKey(this.state.effects);
    return (
      <div className="settings-presets">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            className={'btn btn-default settings-preset-btn' + (key === activeKey ? ' active' : '')}
            onClick={() => this.handlePreset(key)}
          >{label}</button>
        ))}
      </div>
    );
  }

  renderGroup({ key, title }) {
    const items = EFFECT_LIST.filter(e => e.group === key);
    return (
      <div className="settings-group" key={key}>
        <h4 className="settings-group-title">{title}</h4>
        {items.map(({ key: effectKey, label }) => (
          <label className="settings-row" key={effectKey}>
            <span className="settings-row-label">{label}</span>
            <span className="kq-switch">
              <input
                type="checkbox"
                checked={this.state.effects[effectKey] !== false}
                onChange={() => this.handleToggle(effectKey)}
              />
              <span className="kq-switch-track"><span className="kq-switch-knob"></span></span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="settings-screen">
        <div className="row">
          <div className="col-sm-8 col-sm-offset-2 col-xs-12">
            <div className="panel panel-default">
              <div className="panel-heading">Settings</div>
              <div className="panel-body">
                {this.renderPresets()}
                {GROUPS.map(group => this.renderGroup(group))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center"><button className="btn btn-default" onClick={this.props.onBack}>Back to menu</button></p>
      </div>
    );
  }
}

export default SettingsScreen;
