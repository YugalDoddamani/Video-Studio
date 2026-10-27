'use strict';

/**
 * frames.js - drive the stage page frame by frame and save PNGs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function frameName(index) {
  return `frame_${String(index).padStart(6, '0')}.png`;
}

/** Render a single frame into a PNG buffer (used by the determinism check). */
async function capture(page, frame) {
  await page.evaluate((value) => window.__studio.renderFrame(value), frame);
  return page.screenshot({ type: 'png' });
}

/**
 * Render a list of frame numbers into outDir.
 * Returns { written, frames } with per-frame output paths.
 */
async function renderFrames(options) {
  const { page, frames, outDir, onFrame } = options;
  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  const total = frames.length;
  let index = 0;

  for (const frame of frames) {
    const buffer = await capture(page, frame);
    const file = path.join(outDir, frameName(frame));
    fs.writeFileSync(file, buffer);
    written.push(file);
    index += 1;
    if (onFrame) onFrame({ frame, index, total, file });
  }

  return { written, frames, dir: outDir };
}

/** Remove stale PNGs so a shorter render cannot leave old frames behind. */
function clearFrames(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir).filter((name) => /^frame_\d{6}\.png$/.test(name));
  entries.forEach((name) => fs.unlinkSync(path.join(dir, name)));
  return entries.length;
}

/**
 * Sample frames across the timeline: every scene start, every reveal event,
 * the two-thirds point of each scene, and the final frame.
 */
function sampleFrames(config, options) {
  const opts = options || {};
  const perScene = opts.perScene || 3;
  const picks = new Set([0, config.totalFrames - 1]);

  config.scenes.forEach((scene) => {
    picks.add(scene.startFrame);
    picks.add(Math.min(config.totalFrames - 1, scene.startFrame + scene.durationFrames - 1));
    (scene.events || []).forEach((event) => {
      const at = scene.startFrame + event.atFrame;
      if (at >= 0 && at < config.totalFrames) picks.add(at);
      const end = at + (event.durationFrames || 1);
      if (end >= 0 && end < config.totalFrames) picks.add(end);
    });
    for (let i = 1; i < perScene; i++) {
      const at = scene.startFrame + Math.round((scene.durationFrames * i) / perScene);
      if (at < config.totalFrames) picks.add(at);
    }
  });

  (opts.extra || []).forEach((frame) => {
    if (frame >= 0 && frame < config.totalFrames) picks.add(frame);
  });

  return [...picks].sort((a, b) => a - b);
}

/** Parse a --frames value such as "0,45,120" or "0-120:30". */
function parseFrameList(value, totalFrames) {
  if (!value) return null;
  const frames = new Set();
  String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const range = /^(\d+)\s*-\s*(\d+)(?::(\d+))?$/.exec(part);
      if (range) {
        const from = Math.max(0, Number(range[1]));
        const to = Math.min(totalFrames - 1, Number(range[2]));
        const step = Math.max(1, Number(range[3] || 1));
        for (let frame = from; frame <= to; frame += step) frames.add(frame);
        return;
      }
      const seconds = /^(\d+(?:\.\d+)?)s$/.exec(part);
      if (seconds) {
        frames.add(Math.round(Number(seconds[1]) * 30));
        return;
      }
      const frame = Number(part);
      if (Number.isFinite(frame) && frame >= 0 && frame < totalFrames) frames.add(Math.floor(frame));
    });
  return [...frames].sort((a, b) => a - b);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { frameName, capture, renderFrames, clearFrames, sampleFrames, parseFrameList, sha256 };
