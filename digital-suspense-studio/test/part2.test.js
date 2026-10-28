'use strict';

/**
 * part2.test.js - "You Answer", the sequel.
 *
 * Covers the one new scene type (`video-call`) and the parts of it a careless
 * edit could quietly break: the frame-1 rule, the light going out, the camera
 * gain coming up behind it, the self-view opening, and the fact that the
 * signal-loss beat tears the call rather than a voicemail player.
 *
 * The last block asserts the shipped film still matches its own beat sheet.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const Components = require('../src/stage/components.js');
const Scenes = require('../src/stage/scenes.js');
const Timeline = require('../src/stage/timeline.js');
const { validate, loadConfigFile } = require('../src/lib/config.js');

function stateFor(config, frame) {
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

const opacityAfter = (html, pattern) => Number((html.match(pattern) || [])[1]);

// ---------------------------------------------------------------------------
// callView
// ---------------------------------------------------------------------------

test('the call timer counts in minutes and seconds', () => {
  assert.equal(Components.timerLabel(0), '00:00');
  assert.equal(Components.timerLabel(4), '00:04');
  assert.equal(Components.timerLabel(65), '01:05');
  assert.equal(Components.timerLabel(15.9), '00:15');
});

test('the feed is a door, a self-view and the chrome', () => {
  const html = Components.callView({ caller: 'Me', timer: '00:06' });
  assert.match(html, /feed__door/, 'a door is what the camera is pointed at');
  assert.match(html, /feed__strip/, 'the light under it');
  assert.match(html, /class="pip"/, 'the self-view');
  assert.match(html, /figure__torso/, 'and a person in it');
  assert.match(html, /00:06/);
});

// ---------------------------------------------------------------------------
// the scene
// ---------------------------------------------------------------------------

const CALL_CONFIG = Timeline.normalizeConfig({
  title: 'call',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'call',
      type: 'video-call',
      durationFrames: 180,
      data: {
        caller: 'Me',
        callerSubtitle: 'your number',
        timerStartSeconds: 4,
        zoom: 1,
        zoomTo: 1.2,
        strip: { outAtFrame: 120, outFrames: 3 },
        pip: { doorAtFrame: 60, doorFrames: 30 },
        seed: 'test-call',
      },
      events: [],
    },
  ],
});

const stripOf = (html) => opacityAfter(html, /class="feed__strip" style="opacity:([0-9.]+)/);
const glowOf = (html) => opacityAfter(html, /class="feed__glow" style="opacity:([0-9.]+)/);
const pipWidthOf = (html) => opacityAfter(html, /class="pip__door" style="width:([0-9.]+)px/);

test('the light is on at frame 1 and gone after the switch', () => {
  const scene = CALL_CONFIG.scenes[0];
  assert.equal(stripOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 0))), 1);
  assert.equal(stripOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 119))), 1);
  assert.ok(stripOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 129))) < 0.05);
});

test('the camera gain comes up when the light goes out', () => {
  const scene = CALL_CONFIG.scenes[0];
  assert.equal(glowOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 100))), 0);
  assert.ok(glowOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 160))) > 0.9);
});

test('the door behind you is shut, then opens', () => {
  const scene = CALL_CONFIG.scenes[0];
  const shut = pipWidthOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 10)));
  const open = pipWidthOf(Scenes.renderScene(scene, stateFor(CALL_CONFIG, 150)));
  assert.ok(shut < 5, 'nothing is lit in that room at the start');
  assert.ok(open > 150, 'by the end the doorway is wide');
});

test('the feed drifts, deterministically', () => {
  const scene = CALL_CONFIG.scenes[0];
  const a = Scenes.renderScene(scene, stateFor(CALL_CONFIG, 40));
  const b = Scenes.renderScene(scene, stateFor(CALL_CONFIG, 40));
  const c = Scenes.renderScene(scene, stateFor(CALL_CONFIG, 90));
  assert.equal(a, b, 'same frame, same bytes');
  assert.notEqual(a, c, 'the camera is not locked off');
});

test('the video-call scene carries the disclosure', () => {
  const html = Scenes.renderScene(CALL_CONFIG.scenes[0], stateFor(CALL_CONFIG, 40));
  assert.match(html, /FICTIONAL STORY/);
});

// ---------------------------------------------------------------------------
// signal-loss takes over a call
// ---------------------------------------------------------------------------

const LOSS_CALL = Timeline.normalizeConfig({
  title: 'loss',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'loss',
      type: 'signal-loss',
      durationFrames: 90,
      data: {
        picture: 'call',
        seed: 'test-loss-call',
        call: { timerSeconds: 25, zoom: 1.57, strip: 0, pipDoor: 1 },
        loss: { atFrame: 0, tearFrames: 18, snowAtFrame: 12, snowFrames: 24, blackFrames: 30 },
      },
      events: [],
    },
  ],
});

test('signal-loss can tear a call instead of a player', () => {
  const html = Scenes.renderScene(LOSS_CALL.scenes[0], stateFor(LOSS_CALL, 10));
  assert.match(html, /feed__door/, 'the call is what dies');
  assert.doesNotMatch(html, /transcript__line/, 'no voicemail player underneath');
  assert.match(html, /00:25/, 'and the call clock is frozen where the call stopped');
});

test('a call-signal scene still ends on black', () => {
  const html = Scenes.renderScene(LOSS_CALL.scenes[0], stateFor(LOSS_CALL, 85));
  assert.ok(opacityAfter(html, /loss__black" style="opacity:([0-9.]+)/) === 1);
});

// ---------------------------------------------------------------------------
// The shipped film
// ---------------------------------------------------------------------------

const FILM_DIR = path.join(__dirname, '..', 'projects', 'you-answer');

test('the shipped film is 30 seconds of the beat sheet', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'));
  assert.equal(config.scenes.reduce((total, scene) => total + scene.durationFrames, 0), 900);
  assert.equal(config.format.fps, 30);
  assert.deepEqual(
    config.scenes.map((scene) => [scene.type, scene.startFrame, scene.durationFrames]),
    [
      ['video-call', 0, 450],
      ['video-call', 450, 180],
      ['signal-loss', 630, 180],
      ['end-card', 810, 90],
    ]
  );
});

test('the shipped film opens on the call, not on an entrance', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'));
  const html = Scenes.renderScene(config.scenes[0], stateFor(config, 0));
  assert.match(html, /feed__door/);
  assert.match(html, /class="pip"/);
  assert.equal(stripOf(html), 1, 'the hallway light is already on in frame 1');
  assert.match(html, /00:04/, 'the call has been connected for four seconds');
});

test('every caption obeys the five-word rule and lands before its beat', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'));
  assert.ok(config.captions.length >= 6);
  config.captions.forEach((caption) => {
    assert.ok(caption.text.trim().split(/\s+/).length <= 5, `"${caption.text}" is over five words`);
    assert.ok(caption.atFrame >= 0 && caption.endFrame <= 900, `"${caption.text}" runs past the film`);
  });
  // The voice starts where the sound design says it does; every card but the
  // first (which opens the film) must land 12 frames before its line.
  const voiceStarts = [102, 282, 390, 498, 558, 613];
  const cards = config.captions.slice(1);
  cards.forEach((caption, index) => {
    assert.equal(voiceStarts[index] - caption.atFrame, 12, `"${caption.text}" is out of step`);
  });
});

test('the shipped film carries a real audio track', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'));
  assert.equal(config.audio.mode, 'local');
  assert.equal(config.audio.tracks.length, 1);
  assert.match(config.audio.tracks[0].file, /^audio\/.*\.wav$/);
});

test('the shipped film has no validation issues', () => {
  const raw = JSON.parse(require('fs').readFileSync(path.join(FILM_DIR, 'scenes.json'), 'utf8'));
  const { issues } = validate(raw, { projectDir: FILM_DIR });
  assert.deepEqual(issues.filter((issue) => issue.level === 'error'), []);
});
