import React, { Component } from 'react';
import './Confetti.scss';

const COLORS = ['#ff4d6d', '#ff2e88', '#ffb703', '#a6ff3c', '#fff3e0'];
const PIECE_COUNT = 60;
const CANNONS = [8, 92]; // left%/right% launch points, instead of spawning across the full width

// One-shot celebration burst. Pieces are generated once in the constructor
// (not in render) so a parent re-render can't reshuffle them mid-flight,
// and the motion itself is transform-only so every piece composites
// without repaints. The parent decides how long the overlay stays mounted.
//
// Pieces launch from two fixed points near the bottom corners (like a
// pair of confetti cannons) rather than spawning across the full width,
// and arc back down (real projectile motion, not just a fall) - see
// Confetti.scss's kq-confetti-launch: each piece gets its own
// --confetti-peak (how high it rises) and
// --confetti-drift (how far past its start it ends up, always net
// downward) as CSS custom properties, plugged into a shared keyframe
// that's hand-sampled from y(t) = -4*peak*t*(1-t) + drift*t - the
// standard parabola shape for "launched up, gravity brings it back down
// and past the start," piecewise-linear-interpolated at every 10% of t
// (precss has no loops/interpolation to generate this from a formula, so
// it's written out by hand, same as the combo-404-shadow keyframe).
class Confetti extends Component {
  constructor(props) {
    super(props);
    this.pieces = [];
    for (let i = 0; i < PIECE_COUNT; i++) {
      const cannonLeft = CANNONS[i % CANNONS.length];
      // Aimed toward (and past) the center rather than straight up, so the
      // two bursts cross over each other and cover the whole width - the
      // left cannon sways right, the right cannon sways left, each by a
      // wide, randomized amount (in vw, so it scales with screen width
      // instead of a fixed pixel count that barely register on a wide
      // screen).
      const towardCenter = cannonLeft < 50 ? 1 : -1;
      this.pieces.push({
        left: cannonLeft + (Math.random() - 0.5) * 4, // small jitter so it reads as a nozzle, not a single pixel
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.2,
        sway: towardCenter * (15 + Math.random() * 75),
        peak: 65 + Math.random() * 33, // vh risen above the launch point
        drift: 30 + Math.random() * 25, // vh descended past the launch point by the end
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
              '--confetti-sway': p.sway + 'vw',
              '--confetti-peak': p.peak + 'vh',
              '--confetti-drift': p.drift + 'vh',
              '--confetti-spin': p.spin + 'deg'
            }}
          />
        ))}
      </div>
    );
  }
}

export default Confetti;
