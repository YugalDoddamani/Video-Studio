'use strict';

/**
 * arrived.test.js - "Arrived", the single-episode rewrite of DS-002.
 *
 * The film has one promise it cannot break: every line of narration names
 * something the viewer can see at that second. Most of these tests exist to
 * keep the picture and the script in the same room — the chip has to print the
 * number the narration says, the house has to be on screen when she says "my
 * flat", and the two rows have to agree when the voice says "three metres".
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const Scenes = require('../src/stage/scenes.js');
const Timeline = require('../src/stage/timeline.js');
const { validate, loadConfigFile } = require('../src/lib/config.js');

const PROJECT = path.join(__dirname, '..', 'projects', 'arrived');
const { config } = loadConfigFile(path.join(PROJECT, 'scenes.json'));

function stateFor(frame) {
  const index = Timeline.sceneIndexAt(config, frame);
  const scene = config.scenes[index];
  const eventsByType = {};
  (scene.events || []).forEach((event) => {
    if (!eventsByType[event.type]) eventsByType[event.type] = event;
  });
  return {
    frame,
    localFrame: frame - scene.startFrame,
    durationFrames: scene.durationFrames,
    fps: config.format.fps,
    config,
    eventsByType,
  };
}

const at = (frame) => {
  const index = Timeline.sceneIndexAt(config, frame);
  return Scenes.renderScene(config.scenes[index], stateFor(frame));
};

test('the project validates and fits the 60 s budget', () => {
  const { issues } = validate(config);
  const errors = issues.filter((issue) => issue.level !== 'warn');
  assert.deepEqual(errors, [], errors.map((issue) => issue.message).join('; '));
  const total = config.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
  assert.equal(total, 1800);
  assert.equal(total / config.format.fps, 60);
});

test('every scene start matches the frame the previous one ended', () => {
  let frame = 0;
  config.scenes.forEach((scene) => {
    assert.equal(scene.startFrame, frame, `${scene.id} starts where the last one stopped`);
    frame += scene.durationFrames;
  });
});

test('frame 1 is the impossible statement, not a title card', () => {
  const html = at(0);
  assert.match(html, /23:12/);
  assert.match(html, /You arrived at 23:11/);
  // A hook scene, not a card: no end-card stage and no intro copy behind it.
  assert.doesNotMatch(html, /stage--endcard/);
  assert.doesNotMatch(html, /subscribe|follow/i);
});

test('the hook scene names the lie on the notification, not in a caption', () => {
  // The first spoken line contradicts this card, so the card has to carry the
  // claim on its own: app, device name, arrival time.
  const html = at(60);
  assert.match(html, /FIND MY/);
  assert.match(html, /Home/);
  assert.match(html, /23:11/);
});

test('the distance chip prints the number the narration says', () => {
  // VO 2 lands at 7.0 s saying "two point eight kilometres apart".
  assert.match(at(210 + 8), />2\.8</);
  assert.match(at(210 + 8), /km/);
  // VO 7 lands at 44.6 s on "three metres", and the last beat is zero.
  assert.match(at(1320 + 60), />3</);
  assert.match(at(1529), />0</);
});

test('the house and the second pin are on screen before she names them', () => {
  // "That's my flat" (7.0 s) and "there's a second phone in my flat" (12.4 s).
  const early = at(210 + 10);
  assert.match(early, /map__home/);
  assert.match(early, /Home/);
  assert.match(early, /map__pin-chip[^>]*>Me</);
});

test('the camera feed announces itself as a feed', () => {
  // Without the chrome a corridor reads as a room she is standing in.
  const html = at(540 + 30);
  assert.match(html, /CAM 02 · HALL/);
  assert.match(html, /feedbar__live/);
});

test('the device sheet is off in the scenes that need the whole map', () => {
  assert.doesNotMatch(at(210 + 60), /map__sheet/);
  assert.doesNotMatch(at(1050 + 60), /map__sheet/);
  // ...and on when the two rows are the point of the shot.
  assert.match(at(1320 + 180), /map__sheet/);
});

test('at the arrival both rows print the same distance', () => {
  const html = at(1320 + 200);
  const distances = html.match(/map__row-dist">([^<]+)</g) || [];
  assert.equal(distances.length, 2, 'two device rows');
  const values = distances.map((chunk) => chunk.replace(/^.*>/, '').replace(/<$/, ''));
  assert.equal(values[0], values[1], 'Me and This iPhone agree on 0 m');
});

test('the film ends on an empty hall with the door open', () => {
  const html = at(1790);
  assert.match(html, /CAM 02 · HALL/);
  // The figure is painted at zero opacity, so the corridor is empty.
  assert.match(html, /hall__figure" style="opacity:0\.000/);
  // doorOpen 1.0 leaves the far door fully open.
  assert.match(html, /hall__front" style="left:-52px/);
});

test('captions stay short, stay ordered, and never overlap', () => {
  const cards = config.captions || [];
  assert.ok(cards.length >= 6, 'the film carries a caption layer');
  cards.forEach((card) => {
    const words = card.text.replace(/\s+/g, ' ').trim().split(' ');
    assert.ok(words.length <= 5, `"${card.text}" is ${words.length} words`);
  });
  const sorted = [...cards].sort((a, b) => a.atFrame - b.atFrame);
  assert.deepEqual(sorted, cards, 'captions are listed in order');
  cards.slice(1).forEach((card, index) => {
    const previous = cards[index];
    assert.ok(
      previous.atFrame + previous.durationFrames <= card.atFrame,
      `"${previous.text}" runs into "${card.text}"`
    );
  });
});

test('no caption repeats a line of the voice-over', () => {
  const lines = [
    "i'm a night nurse",
    'six years of this walk',
    "that's my flat",
    'using my name',
    'after the break-in',
    "that's my corridor",
    'coming down my street',
    'three metres',
    'my hall is empty',
    'the door is open',
  ];
  (config.captions || []).forEach((card) => {
    const text = card.text.toLowerCase();
    lines.forEach((line) => {
      assert.ok(!text.includes(line), `caption "${card.text}" echoes "${line}"`);
    });
  });
});
