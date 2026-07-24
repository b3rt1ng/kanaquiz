import React, { PureComponent } from 'react';
import { getEdgeMargins } from './edgeMargins';
import { startFireSound, stopFireSound } from '../../data/soundEffects';
import { getEffectSettings } from '../../data/effectSettings';
import './FlameEffect.scss';

const MIN_BAND = 60;
const MAX_REACH = 240;
const ACTIVE_COMBO = 15;

// PureComponent matters more here than for the other effects: render()
// calls getEdgeMargins(), which forces a synchronous layout read
// (getBoundingClientRect). Without this, that read fired on every parent
// re-render - e.g. every keystroke while typing during a 15+ combo streak,
// even though combo/safeZoneRef never changed. A shallow-prop-equal
// re-render now bails out before render() runs at all, so the layout read
// only happens when something that actually affects the output changed.
class FlameEffect extends PureComponent {
  // Muted either by the exercise itself (silentSound - e.g. Kanji/Listening,
  // which already have their own reading audio to not talk over) or by the
  // user's own "Effect sounds" setting - either one is enough to keep it quiet.
  soundAllowed = () => !this.props.silentSound && getEffectSettings().effectSounds !== false

  componentDidMount() {
    if (this.soundAllowed() && (this.props.combo || 0) >= ACTIVE_COMBO) startFireSound();
  }

  componentDidUpdate(prevProps) {
    if (!this.soundAllowed()) {
      const wasAllowed = !prevProps.silentSound && getEffectSettings().effectSounds !== false;
      if (wasAllowed) stopFireSound();
      return;
    }

    const wasBurning = !prevProps.silentSound && (prevProps.combo || 0) >= ACTIVE_COMBO;
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
    // compositor-scaled 2x (see FlameEffect.scss). The band is a clipping
    // viewport onto three inner layers that scroll via `transform`
    // (GPU-compositable, unlike animating `background-position`, which
    // was the dominant cost here - see FlameEffect.scss for the measured
    // breakdown) rather than a single element's animated background.
    return (
      <div
        className="flame-band"
        style={{ height: Math.min(margins.bottom, MAX_REACH) / 2 + 'px' }}
      >
        <div className="flame-gradient" />
        <div className="flame-layer flame-layer-2" />
        <div className="flame-layer flame-layer-1" />
      </div>
    );
  }
}

export default FlameEffect;
