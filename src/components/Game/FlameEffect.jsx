import React, { Component } from 'react';
import { getEdgeMargins } from './edgeMargins';
import { startFireSound, stopFireSound } from '../../data/soundEffects';
import './FlameEffect.scss';

const MIN_BAND = 60;
const MAX_REACH = 240;
const ACTIVE_COMBO = 15;

class FlameEffect extends Component {
  componentDidMount() {
    if ((this.props.combo || 0) >= ACTIVE_COMBO) startFireSound();
  }

  componentDidUpdate(prevProps) {
    const wasBurning = (prevProps.combo || 0) >= ACTIVE_COMBO;
    const isBurning = (this.props.combo || 0) >= ACTIVE_COMBO;
    if (isBurning && !wasBurning) startFireSound();
    else if (!isBurning && wasBurning) stopFireSound();
  }

  componentWillUnmount() {
    stopFireSound();
  }

  render() {
    const combo = this.props.combo || 0;
    if (combo < ACTIVE_COMBO) return null;

    const margins = getEdgeMargins(this.props.safeZoneRef && this.props.safeZoneRef.current);
    if (!margins || margins.bottom < MIN_BAND) return null;

    // Half the visual height: the band renders at half resolution and is
    // compositor-scaled 2x (see FlameEffect.scss).
    return (
      <div
        className="flame-band"
        style={{ height: Math.min(margins.bottom, MAX_REACH) / 2 + 'px' }}
      />
    );
  }
}

export default FlameEffect;
