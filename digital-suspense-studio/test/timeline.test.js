'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Timeline = require('../src/stage/timeline.js');
const Motion = require('../src/stage/motion.js');

test('normalizeConfig computes contiguous start frames and duration', () => {
  const config = Timeline.normalizeConfig({
    title: 'Test',
    format: { width: 1080, height: 1920, fps: 30 },
    scenes: [
      { id: 'a', type: 'lock-screen', durationFrames: 60, data: {} },
      { id: 'b', type: 'end-card', durationFrames: 90, data: {} },
    ],
  });

  assert.equal(config.scenes[0].startFrame, 0);
  assert.equal(config.scenes[1].startFrame, 60);
  assert.equal(config.totalFrames, 150);
  assert.equal(config.durationSeconds, 5);
});

test('normalizeConfig respects explicit startFrame', () => {
  const config = Timeline.normalizeConfig({
    scenes: [
      { id: 'a', type: 'end-card', startFrame: 0, durationFrames: 30 },
      { id: 'b', type: 'end-card', startFrame: 120, durationFrames: 30 },
    ],
  });
  assert.equal(config.scenes[1].startFrame, 120);
  assert.equal(config.totalFrames, 150);
});

test('normalizeConfig falls back to defaults for missing format', () => {
  const config = Timeline.normalizeConfig({ scenes: [{ durationFrames: 30 }] });
  assert.deepEqual(config.format, { width: 1080, height: 1920, fps: 30 });
  assert.equal(config.scenes[0].type, 'notification');
  assert.equal(config.scenes[0].id, 'scene-01');
});

test('sceneIndexAt uses start-inclusive, end-exclusive intervals', () => {
  const config = Timeline.normalizeConfig({
    scenes: [
      { id: 'a', durationFrames: 30 },
      { id: 'b', durationFrames: 30 },
    ],
  });
  assert.equal(Timeline.sceneIndexAt(config, 0), 0);
  assert.equal(Timeline.sceneIndexAt(config, 29), 0);
  assert.equal(Timeline.sceneIndexAt(config, 30), 1);
  assert.equal(Timeline.sceneIndexAt(config, 59), 1);
  // Outside the timeline the index clamps instead of returning -1.
  assert.equal(Timeline.sceneIndexAt(config, 9999), 1);
});

test('wordSchedule keeps words in place and orders reveals', () => {
  const schedule = Timeline.wordSchedule('one two three', 10, 30);
  assert.equal(schedule.length, 3);
  assert.equal(schedule[0].startFrame, 10);
  assert.ok(schedule[1].startFrame > schedule[0].startFrame);
  assert.ok(schedule[2].startFrame > schedule[1].startFrame);
  assert.deepEqual(
    schedule.map((entry) => entry.word),
    ['one', 'two', 'three']
  );
});

test('formatClock renders m:ss', () => {
  assert.equal(Timeline.formatClock(0, 30), '0:00');
  assert.equal(Timeline.formatClock(90, 30), '0:03');
  assert.equal(Timeline.formatClock(30 * 75, 30), '1:15');
});

test('slugify produces URL-safe slugs', () => {
  assert.equal(Timeline.slugify('The Voicemail From Tomorrow!'), 'the-voicemail-from-tomorrow');
  assert.equal(Timeline.slugify('  A  --  B  '), 'a-b');
  assert.equal(Timeline.isSlug('good-slug'), true);
  assert.equal(Timeline.isSlug('Bad Slug'), false);
});

test('motion primitives are bounded and stable', () => {
  assert.equal(Motion.clamp01(-4), 0);
  assert.equal(Motion.clamp01(4), 1);
  assert.equal(Motion.tween(0, 10, 10), 0);
  assert.equal(Motion.tween(20, 10, 10), 1);
  assert.equal(Motion.tween(15, 10, 10), Motion.ease.outCubic(0.5), 'mid-tween follows the easing curve');
  assert.equal(Motion.tween(5, 10, 0), 0, 'zero-duration stays at 0 before start');
  assert.equal(Motion.tween(10, 10, 0), 1, 'zero-duration jumps to 1 at start');

  const a = Motion.seededSeries('seed', 5);
  const b = Motion.seededSeries('seed', 5);
  const c = Motion.seededSeries('other', 5);
  assert.deepEqual(a, b, 'same seed gives the same series');
  assert.notDeepEqual(a, c, 'different seed gives a different series');
  a.forEach((value) => assert.ok(value >= 0 && value < 1));
});

test('hashString is stable across calls', () => {
  assert.equal(Motion.hashString('voicemail'), Motion.hashString('voicemail'));
  assert.notEqual(Motion.hashString('a'), Motion.hashString('b'));
});
