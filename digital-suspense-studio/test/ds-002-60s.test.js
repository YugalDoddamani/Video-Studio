'use strict';

/**
 * ds-002-60s.test.js - the narrated rebuild of "2.8 km".
 *
 * Same map, same rule, a person underneath it. These tests pin what the longer
 * cut promises and the short one never had to: a caption track that carries the
 * story muted, a history sheet that replaces the device list instead of growing
 * over the map, and a voice-over slot for every beat that needs one.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const Timeline = require('../src/stage/timeline.js');
const Scenes = require('../src/stage/scenes.js');
const Config = require('../src/lib/config.js');

const PROJECT = path.join(__dirname, '..', 'projects', '28-km-60s');

function load() {
  const loaded = Config.loadConfigFile(path.join(PROJECT, 'scenes.json'), { projectDir: PROJECT });
  assert.equal(loaded.issues.filter((issue) => issue.severity === 'error').length, 0, 'config has no errors');
  return loaded.config;
}

function render(config, frame) {
  const index = Timeline.sceneIndexAt(config, frame);
  const scene = config.scenes[index];
  const eventsByType = {};
  (scene.events || []).forEach((event) => {
    if (!eventsByType[event.type]) eventsByType[event.type] = { ...event };
  });
  const state = {
    frame,
    localFrame: frame - scene.startFrame,
    durationFrames: scene.durationFrames,
    fps: config.format.fps,
    config,
    eventsByType,
  };
  return Scenes.renderScene(scene, state);
}

test('the film is eight scenes and exactly sixty seconds', () => {
  const config = load();
  assert.equal(config.scenes.length, 8);
  assert.equal(config.totalFrames, 1800);
  assert.equal(config.durationSeconds.toFixed(2), '60.00');
  assert.deepEqual(
    config.scenes.map((scene) => scene.type),
    ['map', 'street', 'map', 'map', 'message-thread', 'map', 'signal-loss', 'lock-screen']
  );
});

test('the caption track is ordered, short, and never overlaps', () => {
  const config = load();
  assert.equal(config.captions.length, 11);
  let previousEnd = 0;
  config.captions.forEach((caption) => {
    assert.ok(caption.atFrame >= previousEnd, `caption "${caption.text}" starts after the previous card ends`);
    assert.ok(caption.text.trim().split(/\s+/).length <= 5, `caption "${caption.text}" is five words or fewer`);
    assert.ok(caption.endFrame <= config.totalFrames, 'caption ends inside the film');
    previousEnd = caption.endFrame;
  });
});

test('only the thread card leaves the lower third, and only by 700px', () => {
  const config = load();
  const lifted = config.captions.filter((caption) => caption.lift);
  assert.equal(lifted.length, 1);
  assert.equal(lifted[0].text, 'she let someone in.');
  assert.equal(lifted[0].lift, 700);
  // Scenes 5 owns the bottom third; every other card stays in the band.
  assert.ok(lifted[0].atFrame >= 1050 && lifted[0].endFrame <= 1440);
});

test('frame 1 is the impossible readout, with no card in front of it', () => {
  const config = load();
  const html = render(config, 0);
  assert.match(html, /2\.8/);
  assert.match(html, /Devices/);
  assert.match(html, /This iPhone/);
  assert.ok(html.includes('>Me<'), 'the pin is labelled Me');
  assert.ok(config.captions[0].atFrame > 0, 'the first card does not cover the hook');
});

test('the sheet becomes a history instead of growing over the map', () => {
  const config = load();
  // Scene 4 starts at 660. Before the tap: a device list.
  assert.ok(render(config, 665).includes('Devices'), 'the card starts as a device list');
  assert.ok(render(config, 665).includes('This iPhone'), 'her own phone is still listed');
  // After the tap: the same card, one level deeper.
  const tapped = render(config, 790);
  assert.ok(tapped.includes('WHERE IT'), 'the card becomes a history');
  assert.ok(!tapped.includes('This iPhone'), 'the device rows are replaced, not stacked on');
  assert.ok(tapped.includes('Hospital'), 'the first place it has been is already listed');
  assert.ok(!tapped.includes('Bus stop'), 'the second place waits its turn');
  assert.ok(render(config, 950).includes('Bus stop'), 'and arrives');
  assert.ok(!render(config, 950).includes('Ring road'), 'the last one is later still');
  assert.ok(render(config, 1000).includes('Ring road'), 'the list ends where she is standing');
});

test('the pin resolves to her name at 1590, not a frame earlier', () => {
  const config = load();
  assert.ok(!render(config, 1589).includes('Asha'), 'still "Me" one frame earlier');
  assert.ok(render(config, 1590).includes('Asha'), 'the name lands on frame 1590');
});

test('her own dot leaves the map, and the row waits for it', () => {
  const config = load();
  assert.ok(render(config, 1639).includes('You are here'), 'her row is still reporting a position');
  assert.ok(render(config, 1650).includes('You are here'), 'the row waits for the dot to finish fading');
  assert.ok(render(config, 1660).includes('No location found'), 'then it goes quiet');
});

test('the phone dies on the map it was showing', () => {
  const config = load();
  const html = render(config, 1690);
  assert.ok(html.includes('map__pin'), 'the tear happens over the map, not a stand-in');
  assert.ok(html.includes('Asha'), 'and the map is still her map');
  assert.ok(html.includes('loss__tear'), 'the picture is tearing');
});

test('the last shot is a lock screen that woke by itself', () => {
  const config = load();
  const html = render(config, 1780);
  assert.ok(html.includes('0 m away'), 'the readout follows her home');
  assert.ok(html.includes('FIND MY'), 'the app is named, not implied');
  assert.ok(html.includes('room'), 'the phone is lighting a dark room, not a lock screen in a void');
});

test('the long and short cuts are the same map', () => {
  const long = load();
  const shortPath = path.join(__dirname, '..', 'projects', '28-km', 'scenes.json');
  const short = Config.loadConfigFile(shortPath, { projectDir: path.dirname(shortPath) }).config;
  assert.equal(long.scenes[0].data.seed, short.scenes[0].data.seed, 'one map world, two films');
  assert.equal(long.scenes[0].data.labelBefore, short.scenes[0].data.labelBefore);
});

test('every frame is deterministic', () => {
  const config = load();
  assert.equal(render(config, 900), render(config, 900));
  assert.equal(render(config, 1760), render(config, 1760));
});
