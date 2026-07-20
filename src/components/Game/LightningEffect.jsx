import React, { Component } from 'react';
import { getEdgeMargins } from './edgeMargins';
import { startLightningSound, stopLightningSound } from '../../data/soundEffects';
import './LightningEffect.scss';

const MIN_BAND = 40;
const MAX_REACH = 140;
const ACTIVE_COMBO = 5;

function getTier(combo) {
  if (combo >= 15) return 3;
  if (combo >= 10) return 2;
  return 1;
}

// Extra room around the drawn shape, inside the SVG's own coordinate
// space, for the drop-shadow glow to bleed into. `overflow: visible` on
// the <svg> isn't reliable for this - some browsers still clip filter
// output to the viewBox regardless, so the box itself is padded instead.
const GLOW_PAD = 14;
const BASE_WIDTH = 6;
const TIP_WIDTH = 0.8;

// Jagged zigzag spine from the edge (x=0) inward to x=reach - real electric
// arcs don't follow a smooth curve, so each segment jumps to a random y.
// Rendered as a filled polygon (a ribbon traced along both sides of the
// spine) rather than a stroked polyline, tapering from BASE_WIDTH at the
// source down to TIP_WIDTH at the tip, so the bolt reads as a spark that
// discharges FROM the edge rather than a uniform wire.
function buildBoltPolygon(reach, laneHeight) {
  const segments = 5 + Math.floor(Math.random() * 3);
  const centerY = GLOW_PAD + laneHeight / 2;
  const spine = [];
  for (let i = 0; i <= segments; i++) {
    spine.push({
      x: (i / segments) * reach,
      y: centerY + (Math.random() - 0.5) * laneHeight * 0.7
    });
  }

  const top = [];
  const bottom = [];
  for (let i = 0; i < spine.length; i++) {
    const t = i / (spine.length - 1);
    const halfWidth = (BASE_WIDTH + (TIP_WIDTH - BASE_WIDTH) * t) / 2;

    // Normal of the local direction (averaged over the adjacent segments
    // for interior points) so the ribbon stays roughly perpendicular to
    // the spine instead of only ever facing straight up/down.
    const prev = spine[Math.max(i - 1, 0)];
    const next = spine[Math.min(i + 1, spine.length - 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    top.push(`${(spine[i].x + nx * halfWidth).toFixed(1)},${(spine[i].y + ny * halfWidth).toFixed(1)}`);
    bottom.push(`${(spine[i].x - nx * halfWidth).toFixed(1)},${(spine[i].y - ny * halfWidth).toFixed(1)}`);
  }

  return top.concat(bottom.reverse()).join(' ');
}

function buildBolts(edge, spanLength, reach, count, seq) {
  const laneHeight = 60;
  const bolts = [];
  for (let i = 0; i < count; i++) {
    const along = ((i + 0.5) / count) * 100;
    bolts.push({
      id: `${edge}-${seq}-${i}`,
      points: buildBoltPolygon(reach, laneHeight),
      width: reach + GLOW_PAD,
      height: laneHeight + GLOW_PAD * 2,
      along,
      delay: Math.random() * 0.3,
      duration: 0.5 + Math.random() * 0.4
    });
  }
  return bolts;
}

class LightningEffect extends Component {
  state = { leftBolts: [], rightBolts: [] };
  seq = 0;

  componentDidMount() {
    this.tick();
    if (!this.props.silentSound && (this.props.combo || 0) >= ACTIVE_COMBO) startLightningSound();
  }

  componentDidUpdate(prevProps) {
    const wasActive = (prevProps.combo || 0) >= ACTIVE_COMBO;
    const isActive = (this.props.combo || 0) >= ACTIVE_COMBO;
    if (isActive && !wasActive) {
      this.tick();
      if (!this.props.silentSound) startLightningSound();
    } else if (!isActive && wasActive) {
      clearTimeout(this.regenTimer);
      this.setState({ leftBolts: [], rightBolts: [] });
      if (!this.props.silentSound) stopLightningSound();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.regenTimer);
    stopLightningSound();
  }

  // Bolts reshuffle on an interval (rather than every frame) so the arcs
  // look alive without re-rendering constantly - faster and denser the
  // longer the streak runs.
  tick = () => {
    const combo = this.props.combo || 0;
    if (combo < ACTIVE_COMBO) return;

    const tier = getTier(combo);
    const count = tier;
    const margins = getEdgeMargins(this.props.safeZoneRef && this.props.safeZoneRef.current);
    this.seq++;

    if (margins) {
      const leftReach = Math.min(margins.left, MAX_REACH);
      const rightReach = Math.min(margins.right, MAX_REACH);
      this.setState({
        leftBolts: margins.left >= MIN_BAND ? buildBolts('left', window.innerHeight, leftReach, count, this.seq) : [],
        rightBolts: margins.right >= MIN_BAND ? buildBolts('right', window.innerHeight, rightReach, count, this.seq) : []
      });
    }

    const interval = Math.max(1100 - tier * 250, 500);
    this.regenTimer = setTimeout(this.tick, interval);
  }

  renderEdge(edge, bolts) {
    if (!bolts.length) return null;
    return (
      <div className={`lightning-edge lightning-edge-${edge}`}>
        {bolts.map(b => (
          <svg
            key={b.id}
            className="lightning-bolt"
            width={b.width}
            height={b.height}
            viewBox={`0 0 ${b.width} ${b.height}`}
            style={{ top: b.along + '%', animationDelay: b.delay + 's', animationDuration: b.duration + 's' }}
          >
            <polygon points={b.points} />
          </svg>
        ))}
      </div>
    );
  }

  render() {
    const combo = this.props.combo || 0;
    if (combo < ACTIVE_COMBO) return null;
    if (!this.state.leftBolts.length && !this.state.rightBolts.length) return null;

    return (
      <div className="lightning-overlay">
        {this.renderEdge('left', this.state.leftBolts)}
        {this.renderEdge('right', this.state.rightBolts)}
      </div>
    );
  }
}

export default LightningEffect;
