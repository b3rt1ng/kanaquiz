import React, { Component } from 'react';
import './Confetti.scss';

const COLORS = ['#ff4d6d', '#ff2e88', '#ffb703', '#a6ff3c', '#fff3e0'];
const PIECE_COUNT = 60;

// One-shot celebration burst. Pieces are generated once in the constructor
// (not in render) so a parent re-render can't reshuffle them mid-fall, and
// the fall itself is transform-only so every piece composites without
// repaints. The parent decides how long the overlay stays mounted.
class Confetti extends Component {
  constructor(props) {
    super(props);
    this.pieces = [];
    for (let i = 0; i < PIECE_COUNT; i++) {
      this.pieces.push({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        sway: (Math.random() - 0.5) * 160,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        color: COLORS[i % COLORS.length],
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8
      });
    }
  }

  render() {
    return (
      <div className="confetti-overlay">
        {this.pieces.map((p, i) => (
          <div
            className="confetti-piece"
            key={i}
            style={{
              left: p.left + '%',
              width: p.width + 'px',
              height: p.height + 'px',
              backgroundColor: p.color,
              animationDelay: p.delay + 's',
              animationDuration: p.duration + 's',
              '--confetti-sway': p.sway + 'px',
              '--confetti-spin': p.spin + 'deg'
            }}
          />
        ))}
      </div>
    );
  }
}

export default Confetti;
