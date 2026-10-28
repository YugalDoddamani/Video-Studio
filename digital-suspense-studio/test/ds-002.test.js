'use strict';

/**
 * ds-002.test.js - "2.8 km", the first film on the map surface.
 *
 * The map scene is driven entirely by frame-numbered keyframes, so these tests
 * pin the contract rather than the pixels: the readout at each beat, the label
 * resolving at the frame it was designed to resolve on, her dot leaving the map
 * exactly once, and a deterministic geometry.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const Timeline = require('../src/stage/timeline.js');
const Scenes = require('../src/stage/scenes.js');
const Components = require('../src/stage/components.js');
const Config = require('../src/lib/config.js');

const PROJECT = path.join(__dirname, '..', 'projects', '28-km');

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

test('the film is three scenes and exactly thirty seconds', () => {
  const config = load();
  assert.equal(config.scenes.length, 3);
  assert.equal(config.totalFrames, 900);
  assert.equal(config.durationSeconds.toFixed(2), '30.00');
  assert.deepEqual(
    config.scenes.map((scene) => scene.type),
    ['map', 'map', 'map']
  );
});

test('the caption track is ordered, short, and never overlaps', () => {
  const config = load();
  assert.equal(config.captions.length, 8);
  let previousEnd = 0;
  config.captions.forEach((caption) => {
    assert.ok(caption.atFrame >= previousEnd, `caption "${caption.text}" starts after the previous card ends`);
    assert.ok(caption.text.trim().split(/\s+/).length <= 5, `caption "${caption.text}" is five words or fewer`);
    assert.ok(caption.endFrame <= config.totalFrames, 'caption ends inside the film');
    previousEnd = caption.endFrame;
  });
  assert.ok(previousEnd <= 810, 'captions stop before the empty map');
});

test('frame 1 is the impossible readout', () => {
  const config = load();
  const html = render(config, 0);
  assert.match(html, /2\.8/);
  assert.match(html, /Devices/);
  assert.match(html, /This iPhone/);
  // Both rows are on screen at frame 1: the device that is her, and the device
  // that also claims to be her.
  assert.ok(html.includes('Me'), 'the pin is labelled Me');
});

test('the distance counts down instead of cutting', () => {
  const config = load();
  assert.match(render(config, 0), /2\.8/);
  assert.match(render(config, 100), /1\.1/);
  assert.match(render(config, 200), /400/);
  assert.match(render(config, 510), />3</);
});

test('the pin resolves to a name at frame 630 and not before', () => {
  const config = load();
  assert.ok(!render(config, 629).includes('Asha'), 'still "Me" one frame earlier');
  assert.ok(render(config, 630).includes('Asha'), 'the name lands on frame 630');
});

test('her own dot leaves the map at frame 735 and the sheet says so', () => {
  const config = load();
  const before = render(config, 734);
  assert.ok(before.includes('You are here'), 'her row is still reporting a position');
  assert.ok(render(config, 740).includes('You are here'), 'the row waits for the dot to finish fading');
  const after = render(config, 748);
  assert.ok(after.includes('No location found'), 'the row drops to the empty state once the dot is gone');
  assert.ok(after.includes('map__row--muted'), 'and goes quiet rather than shouting');
});

test('the film closes on an empty map, not a card', () => {
  const config = load();
  const html = render(config, 850);
  assert.ok(html.includes('No devices found'));
  assert.ok(!html.includes('endcard'), 'no end-card in this film');
});

test('map geometry is deterministic for a seed', () => {
  const props = {
    seed: '28km',
    zoom: 1.42,
    chip: { value: '412', unit: 'm' },
    other: { x: 640, y: 640, label: 'Me' },
    self: { x: 540, y: 720 },
    rows: [{ name: 'Me', meta: 'iPhone 15 Pro', dist: '412 m' }],
  };
  assert.equal(Components.mapView(props), Components.mapView(props));
  const other = Components.mapView({ ...props, seed: 'different' });
  assert.notEqual(Components.mapView(props), other, 'a different seed draws a different city');
});

test('no sampled frame leaks undefined or NaN into the markup', () => {
  const config = load();
  for (let frame = 0; frame < config.totalFrames; frame += 37) {
    const html = render(config, frame);
    assert.ok(!html.includes('undefined'), `frame ${frame} is clean`);
    assert.ok(!html.includes('NaN'), `frame ${frame} is clean`);
  }
});
