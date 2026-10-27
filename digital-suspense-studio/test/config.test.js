'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { validate } = require('../src/lib/config.js');
const { galleryConfig } = require('../src/lib/gallery.js');
const { sampleFrames, parseFrameList, frameName } = require('../src/lib/frames.js');
const { PROJECTS_DIR, toPosix } = require('../src/lib/paths.js');

const VALID = {
  title: 'Valid',
  format: { width: 1080, height: 1920, fps: 30 },
  scenes: [{ id: 'a', type: 'lock-screen', durationFrames: 60, data: {}, events: [] }],
};

test('a well-formed config passes with no errors', () => {
  const { issues, config } = validate(VALID);
  assert.equal(issues.filter((issue) => issue.severity === 'error').length, 0);
  assert.ok(config);
});

test('the component gallery config is valid', () => {
  const { issues, config } = validate(galleryConfig());
  const errors = issues.filter((issue) => issue.severity === 'error');
  assert.deepEqual(errors, []);
  assert.equal(config.scenes.length, 9);
});

test('every shipped project config is valid', () => {
  const projects = fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.ok(projects.length > 0, 'at least one project exists');

  projects.forEach((slug) => {
    const file = path.join(PROJECTS_DIR, slug, 'scenes.json');
    if (!fs.existsSync(file)) return;
    const { issues } = validate(JSON.parse(fs.readFileSync(file, 'utf8')));
    const errors = issues.filter((issue) => issue.severity === 'error');
    assert.deepEqual(errors, [], `${slug} is valid`);
  });
});

test('missing scenes is an error', () => {
  const { issues, config } = validate({ title: 'x', scenes: [] });
  assert.ok(issues.some((issue) => issue.severity === 'error'));
  assert.equal(config, null);
});

test('unknown scene type is an error that names the alternatives', () => {
  const { issues } = validate({ scenes: [{ type: 'nope', durationFrames: 30 }] });
  const error = issues.find((issue) => issue.severity === 'error');
  assert.match(error.message, /Unknown scene type/);
  assert.match(error.message, /lock-screen/);
});

test('non-positive durations are errors', () => {
  [0, -10, 'abc'].forEach((duration) => {
    const { issues } = validate({ scenes: [{ type: 'notification', durationFrames: duration }] });
    assert.ok(issues.some((issue) => issue.severity === 'error'), `duration ${duration} rejected`);
  });
});

test('duplicate scene ids are errors', () => {
  const { issues } = validate({
    scenes: [
      { id: 'same', type: 'notification', durationFrames: 30 },
      { id: 'same', type: 'notification', durationFrames: 30 },
    ],
  });
  assert.ok(issues.some((issue) => /Duplicate scene id/.test(issue.message)));
});

test('off-spec format values warn instead of failing', () => {
  const { issues, config } = validate({
    ...VALID,
    format: { width: 720, height: 1280, fps: 24 },
  });
  assert.equal(issues.filter((issue) => issue.severity === 'error').length, 0);
  assert.equal(issues.filter((issue) => /Instagram Reels/.test(issue.message)).length >= 2, true);
  assert.ok(config);
});

test('events after the end of a scene warn', () => {
  const { issues } = validate({
    scenes: [{ type: 'notification', durationFrames: 30, events: [{ type: 'x', atFrame: 90, durationFrames: 4 }] }],
  });
  assert.ok(issues.some((issue) => issue.severity === 'warn' && /after the scene ends/.test(issue.message)));
});

test('missing audio tracks are reported against the project folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dss-audio-'));
  try {
    const { issues } = validate(
      {
        scenes: [{ type: 'voice-note', durationFrames: 30 }],
        audio: { mode: 'local', tracks: [{ file: 'audio/missing.wav', startFrame: 0 }] },
      },
      { projectDir: dir }
    );
    assert.ok(issues.some((issue) => issue.severity === 'error' && /Audio file not found/.test(issue.message)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sampleFrames covers scene starts, events, and the last frame', () => {
  const config = {
    totalFrames: 300,
    scenes: [
      { startFrame: 0, durationFrames: 150, events: [{ atFrame: 20, durationFrames: 5 }] },
      { startFrame: 150, durationFrames: 150, events: [] },
    ],
  };
  const frames = sampleFrames(config, { perScene: 2 });
  assert.ok(frames.includes(0));
  assert.ok(frames.includes(20));
  assert.ok(frames.includes(25));
  assert.ok(frames.includes(150));
  assert.ok(frames.includes(299));
  assert.deepEqual([...frames].sort((a, b) => a - b), frames, 'sorted and de-duplicated');
});

test('parseFrameList understands lists, ranges, and seconds', () => {
  assert.deepEqual(parseFrameList('0, 10,20', 100), [0, 10, 20]);
  assert.deepEqual(parseFrameList('0-10:5', 100), [0, 5, 10]);
  assert.deepEqual(parseFrameList('2s', 300), [60]);
  assert.deepEqual(parseFrameList('0,999', 100), [0], 'out-of-range frames are dropped');
  assert.equal(parseFrameList('', 100), null);
});

test('frame names are zero padded for FFmpeg', () => {
  assert.equal(frameName(0), 'frame_000000.png');
  assert.equal(frameName(1234), 'frame_001234.png');
});

test('toPosix normalises paths for reporting', () => {
  assert.equal(toPosix('a/b'), 'a/b');
  assert.ok(!toPosix(path.join('a', 'b')).includes('\\'));
});

test('the shipped example config template is valid', () => {
  const template = require('../templates/video-config.example.json');
  const { issues, config } = validate(template);
  assert.deepEqual(issues.filter((issue) => issue.severity === 'error'), []);
  assert.ok(config.totalFrames > 0);
});
