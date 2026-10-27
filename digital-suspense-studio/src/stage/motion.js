/**
 * motion.js - deterministic animation primitives for the render stage.
 *
 * Every visual state must be derivable from (frame, config). Nothing in this
 * file reads the real clock, Math.random, or the network. It is loaded as a
 * plain <script> in the browser and can also be required from Node for tests.
 */
(function (global) {
  'use strict';

  /** Clamp a number into [lo, hi]. */
  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  /** Clamp a number into [0, 1]. */
  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  /** Linear interpolation. */
  function lerp(from, to, t) {
    return from + (to - from) * t;
  }

  /** Linear interpolation constrained to t in [0, 1]. */
  function mix(from, to, t) {
    return lerp(from, to, clamp01(t));
  }

  function easeLinear(t) {
    return clamp01(t);
  }

  function easeOutQuad(t) {
    t = clamp01(t);
    return 1 - (1 - t) * (1 - t);
  }

  function easeOutCubic(t) {
    t = clamp01(t);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    t = clamp01(t);
    return t * t * t;
  }

  function easeInOutCubic(t) {
    t = clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutBack(t) {
    t = clamp01(t);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /**
   * Progress of an animation that starts at `startFrame` and runs for
   * `durationFrames`. Returns 0 before it starts, 1 after it ends.
   */
  function tween(frame, startFrame, durationFrames, easing) {
    const ease = easing || easeOutCubic;
    if (durationFrames <= 0) {
      return frame >= startFrame ? 1 : 0;
    }
    return ease(clamp01((frame - startFrame) / durationFrames));
  }

  /** True when start <= frame < end. Intervals are start-inclusive, end-exclusive. */
  function between(frame, start, end) {
    return frame >= start && frame < end;
  }

  /** A single 0..1 wave with the given period, in frames. */
  function pulse(frame, periodFrames, phase) {
    const period = Math.max(1, periodFrames);
    const offset = phase || 0;
    return 0.5 + 0.5 * Math.sin(((frame / period) + offset) * Math.PI * 2);
  }

  /** FNV-1a string hash, used to derive stable per-scene seeds. */
  function hashString(input) {
    let hash = 2166136261;
    const text = String(input);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /** Small, fast, seeded PRNG. Same seed always yields the same sequence. */
  function mulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Deterministic array of `count` values in [0, 1). */
  function seededSeries(seed, count) {
    const random = mulberry32(typeof seed === 'number' ? seed : hashString(seed));
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(random());
    }
    return values;
  }

  /** Per-item progress for staggered arrivals. */
  function stagger(count, frame, startFrame, perItemFrames, easing) {
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(tween(frame, startFrame + i * perItemFrames, perItemFrames, easing));
    }
    return values;
  }

  const Motion = {
    clamp,
    clamp01,
    lerp,
    mix,
    between,
    tween,
    pulse,
    stagger,
    hashString,
    mulberry32,
    seededSeries,
    ease: {
      linear: easeLinear,
      outQuad: easeOutQuad,
      outCubic: easeOutCubic,
      inCubic: easeInCubic,
      inOutCubic: easeInOutCubic,
      outBack: easeOutBack,
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Motion;
  } else {
    global.Motion = Motion;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
