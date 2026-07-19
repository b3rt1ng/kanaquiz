import React, { Component } from 'react';
import { getEdgeMargins } from './edgeMargins';
import './GlitchEffect.scss';

const EDGES = ['top', 'bottom', 'left', 'right'];
// Edges with less free space than this (e.g. the sides of a full-width kana
// grid) are skipped entirely.
const MIN_BAND = 24;

function randomGlitchRect(margins) {
  const candidates = EDGES.filter(e => margins[e] >= MIN_BAND);
  if (!candidates.length) return null;

  const edge = candidates[Math.floor(Math.random() * candidates.length)];
  const budget = margins[edge];
  const along = Math.random() * 100;
  const style = { [edge === 'top' || edge === 'bottom' ? 'left' : 'top']: along + '%' };

  if (edge === 'top' || edge === 'bottom') {
    const width = 90 + Math.random() * 170;
    const height = Math.min(22 + Math.random() * 42, budget - 4);
    style.width = width + 'px';
    style.height = height + 'px';
    style[edge] = Math.random() * (budget - height) + 'px';
  } else {
    const width = Math.min(22 + Math.random() * 42, budget - 4);
    const height = 90 + Math.random() * 170;
    style.width = width + 'px';
    style.height = height + 'px';
    style[edge] = Math.random() * (budget - width) + 'px';
  }

  return { edge, style };
}

class GlitchEffect extends Component {
  state = { rects: [] };
  seq = 0;
  // Set, not array: each timer removes itself once fired, so pending timers
  // don't accumulate over a long session.
  cleanupTimers = new Set();

  componentDidMount() {
    this.scheduleNext();
  }

  componentWillUnmount() {
    clearTimeout(this.burstTimer);
    this.cleanupTimers.forEach(clearTimeout);
  }

  scheduleNext = () => {
    const combo = this.props.combo || 0;
    if (combo < 1) {
      this.burstTimer = setTimeout(this.scheduleNext, 500);
      return;
    }
    const minDelay = Math.max(2200 - combo * 150, 500);
    const maxDelay = Math.max(4400 - combo * 230, 1100);
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    this.burstTimer = setTimeout(() => {
      this.spawnBurst();
      this.scheduleNext();
    }, delay);
  }

  spawnBurst = () => {
    const margins = getEdgeMargins(this.props.safeZoneRef && this.props.safeZoneRef.current);
    if (!margins) return;

    const combo = this.props.combo || 0;
    const count = combo >= 15 ? 5 : combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
    const offset = 5 + Math.min(combo * 0.7, 14);
    const newRects = [];

    for (let i = 0; i < count; i++) {
      const rect = randomGlitchRect(margins);
      if (!rect) continue;

      this.seq++;
      const id = this.seq;
      const duration = 120 + Math.random() * 110;
      newRects.push({ id, ...rect, duration, offset });

      const cleanupTimer = setTimeout(() => {
        this.cleanupTimers.delete(cleanupTimer);
        this.setState(prev => ({ rects: prev.rects.filter(r => r.id !== id) }));
      }, duration + 40);
      this.cleanupTimers.add(cleanupTimer);
    }

    if (newRects.length) this.setState(prev => ({ rects: [...prev.rects, ...newRects] }));
  }

  render() {
    if (!this.state.rects.length) return null;

    return (
      <div className="glitch-overlay">
        {this.state.rects.map(r => (
          <div
            key={r.id}
            className={`glitch-rect glitch-edge-${r.edge}`}
            style={{ ...r.style, animationDuration: r.duration + 'ms', '--glitch-offset': r.offset + 'px' }}
          />
        ))}
      </div>
    );
  }
}

export default GlitchEffect;
