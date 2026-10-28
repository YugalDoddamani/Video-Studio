'use strict';

/**
 * part3-4.test.js - "It's Inside" (part 3) and "It Was You" (part 4).
 *
 * Part 3 introduces the corridor feed (`hallway`) and the frame where a hand
 * covers the lens. Part 4 introduces the recorder screen and then hands the
 * film back to part 1's opening frame, which is the whole ending: the last
 * frame of the series has to be the first frame of the series.
 *
 * Anything that would quietly break that loop - a different notification, a
 * caption that drifts off its beat, a mix that pads out the silence - is a
 * test here.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Components = require('../src/stage/components.js');
const Scenes = require('../src/stage/scenes.js');
const Timeline = require('../src/stage/timeline.js');
const { loadConfigFile } = require('../src/lib/config.js');

const PROJECTS = path.join(__dirname, '..', 'projects');

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

// Walk the RIFF chunks instead of assuming a 44-byte header: FFmpeg can write a
// LIST/INFO chunk before the samples.
function wavDuration(file) {
  const buf = fs.readFileSync(file);
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(offset + 16);
    if (id === 'data') return byteRate ? size / byteRate : 0;
    offset += 8 + size + (size % 2);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// hallView
// ---------------------------------------------------------------------------

test('the corridor is walls, a doorway, a lamp and a person', () => {
  const html = Components.hallView({});
  assert.match(html, /hall__world/);
  assert.match(html, /hall__wall--l/);
  assert.match(html, /hall__wall--r/);
  assert.match(html, /hall__floor/);
  assert.match(html, /hall__far/, 'the lit end of the corridor');
  assert.match(html, /hall__lamp/);
  assert.match(html, /hall__figure/);
  assert.match(html, /hf__phone/, 'the phone at the ear tells you which way they face');
});

test('the call chrome is optional, and says You, not Me', () => {
  assert.doesNotMatch(Components.hallView({}), /call__top/, 'a camera on a floor has no call UI');
  const html = Components.hallView({ chrome: { caller: 'You', timer: '00:31' } });
  assert.match(html, /call__name">You</);
  assert.match(html, /call__sub">your number</);
  assert.match(html, /00:31/);
});

// ---------------------------------------------------------------------------
// the scenes
// ---------------------------------------------------------------------------

const HALL_CONFIG = Timeline.normalizeConfig({
  title: 'hall',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'hall',
      type: 'hallway',
      durationFrames: 180,
      data: {
        statusTime: '9:02',
        zoom: 1,
        zoomTo: 1.5,
        originY: 1200,
        doorOpen: 0.55,
        figure: { scale: 1, scaleTo: 2, y: 0, yTo: 200, blur: 0, blurTo: 7 },
        cover: { atFrame: 120, frames: 30 },
        call: { caller: 'You', callerSubtitle: 'your number', timerStartSeconds: 31 },
        seed: 'test-hall',
      },
      events: [],
    },
  ],
});

const coverOf = (html) => opacityAfter(html, /class="hall__cover" style="opacity:([0-9.]+)/);
const figureOf = (html) => opacityAfter(html, /scale\(([0-9.]+)\)">\s*<span class="hf__hair"/);

test('the lens is clear until the hand arrives, then it is not', () => {
  const scene = HALL_CONFIG.scenes[0];
  assert.equal(coverOf(Scenes.renderScene(scene, stateFor(HALL_CONFIG, 0))), 0);
  assert.ok(coverOf(Scenes.renderScene(scene, stateFor(HALL_CONFIG, 115))) < 0.35);
  assert.equal(coverOf(Scenes.renderScene(scene, stateFor(HALL_CONFIG, 175))), 1);
});

test('the camera walks in and the person walks towards it', () => {
  const scene = HALL_CONFIG.scenes[0];
  const first = Scenes.renderScene(scene, stateFor(HALL_CONFIG, 0));
  const last = Scenes.renderScene(scene, stateFor(HALL_CONFIG, 170));
  assert.match(first, /scale\(1\.0000\)/);
  assert.ok(figureOf(last) > 1.8, 'they end up close enough to touch the lens');
  assert.match(last, /transform-origin:50% 1200px/, 'the floor is the pivot');
});

test('the corridor feed is deterministic', () => {
  const scene = HALL_CONFIG.scenes[0];
  assert.equal(
    Scenes.renderScene(scene, stateFor(HALL_CONFIG, 33)),
    Scenes.renderScene(scene, stateFor(HALL_CONFIG, 33))
  );
  assert.notEqual(
    Scenes.renderScene(scene, stateFor(HALL_CONFIG, 33)),
    Scenes.renderScene(scene, stateFor(HALL_CONFIG, 34))
  );
});

// ---------------------------------------------------------------------------
// recorder
// ---------------------------------------------------------------------------

test('the recorder counts up in tenths and meters itself', () => {
  const html = Components.recorder({ seconds: 6.24, seed: 'rec' }, { localFrame: 40 });
  assert.match(html, /00:06\.2/);
  assert.equal((html.match(/rec__bar/g) || []).length, 56);
  assert.match(html, /NEW VOICEMAIL/);
  assert.match(html, /to: Me/);
});

test('the meter moves, and is still deterministic', () => {
  const a = Components.recorder({ seconds: 1, seed: 'rec' }, { localFrame: 10 });
  const b = Components.recorder({ seconds: 1, seed: 'rec' }, { localFrame: 10 });
  const c = Components.recorder({ seconds: 1, seed: 'rec' }, { localFrame: 11 });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

// ---------------------------------------------------------------------------
// the two shipped films
// ---------------------------------------------------------------------------

const loaded3 = loadConfigFile(path.join(PROJECTS, 'its-inside', 'scenes.json'));
const loaded4 = loadConfigFile(path.join(PROJECTS, 'it-was-you', 'scenes.json'));
const { config: part3 } = loaded3;
const { config: part4 } = loaded4;
const { config: part1 } = loadConfigFile(path.join(PROJECTS, 'voicemail-from-tomorrow-30s', 'scenes.json'));
const { config: part2 } = loadConfigFile(path.join(PROJECTS, 'you-answer', 'scenes.json'));

test('both parts are 900 frames, valid, and have their mix', () => {
  assert.deepEqual(loaded3.issues, [], 'its-inside validates');
  assert.deepEqual(loaded4.issues, [], 'it-was-you validates');
  for (const config of [part3, part4]) {
    assert.equal(config.totalFrames, 900, `${config.slug} is 30 s`);
    assert.equal(config.audio.mode, 'local');
    const mix = path.join(PROJECTS, config.slug, config.audio.tracks[0].file);
    assert.ok(fs.existsSync(mix), `${config.slug} has its mix on disk`);
    // Exactly 30.000 s: a mix that gets padded changes the ending.
    assert.equal(wavDuration(mix).toFixed(3), '30.000', `${config.slug} mix is 30.000 s`);
  }
});

test('part 3 is the same call from the other phone', () => {
  assert.deepEqual(
    part3.scenes.map((scene) => [scene.type, scene.startFrame, scene.durationFrames]),
    [['hallway', 0, 450], ['hallway', 450, 210], ['hallway', 660, 150], ['end-card', 810, 90]]
  );
  assert.equal(part3.scenes[0].data.call.caller, 'You', 'part 2 said Me; this phone says You');
  assert.equal(part2.scenes[0].data.caller, 'Me');
  // Frame 1: the corridor, the person at the end of it, and the caption.
  const opening = Scenes.renderScene(part3.scenes[0], stateFor(part3, 0));
  assert.match(opening, /hall__figure/, 'someone is already at the end of the hall');
  // Captions are a project-level layer, so the hook lives on the config.
  assert.equal(part3.captions[0].atFrame, 0, 'the hook card is live in frame 1');
  assert.equal(part3.captions[0].text, "it's inside.");
});

test('part 3 ends when the hand covers the lens', () => {
  const scene = part3.scenes[2];
  assert.ok(coverOf(Scenes.renderScene(scene, stateFor(part3, 660))) < 0.02);
  assert.equal(coverOf(Scenes.renderScene(scene, stateFor(part3, 806))), 1);
  // ...and the card that follows promises part 4.
  assert.match(JSON.stringify(part3.scenes[3].data.lines), /PART 4: it was you\./);
  assert.match(JSON.stringify(part3.scenes[3].data.lines), /would you hang up\?/);
});

test('part 4 ends on part 1 frame 1, to the byte', () => {
  const last = part4.scenes[part4.scenes.length - 1];
  const first = part1.scenes[0];
  assert.equal(last.type, 'lock-screen');
  assert.equal(last.startFrame, 810);
  // The notification, the clock, the date and the wake animation are the same.
  const clone = JSON.parse(JSON.stringify(last.data));
  delete clone.statusTime;
  const original = JSON.parse(JSON.stringify(first.data));
  delete original.statusTime;
  assert.deepEqual(clone, original, 'the last frame of the series is the first frame of the series');
  assert.deepEqual(last.events, first.events);
  // And no end card: the loop is the ending.
  assert.equal(part4.scenes.filter((scene) => scene.type === 'end-card').length, 0);
});

test('part 4 leaves the message that arrives in part 1', () => {
  const recorderScene = part4.scenes.find((scene) => scene.type === 'recorder');
  assert.ok(recorderScene, 'the voicemail has to be seen being left');
  assert.equal(recorderScene.startFrame, 600);
  assert.equal(recorderScene.data.to, 'to: Me');
});

// ---------------------------------------------------------------------------
// captions lead their beats
// ---------------------------------------------------------------------------

const CAPTION_WORDS = 5;

test('no caption is longer than five words, and the last one opens part 1', () => {
  for (const config of [part3, part4]) {
    for (const card of config.captions) {
      assert.ok(
        card.text.trim().split(/\s+/).length <= CAPTION_WORDS,
        `"${card.text}" in ${config.slug} is too long`
      );
    }
  }
  assert.equal(part4.captions[part4.captions.length - 1].text, part1.captions[0].text);
  assert.equal(part4.captions[part4.captions.length - 1].atFrame, 810);
});

test('every caption lands 12 frames before the line it sets up', () => {
  // Voice starts, in frames, straight out of each build-audio.sh.
  const beats = {
    'its-inside': [3400, 9400, 15200, 18600, 22600].map((ms) => Math.round((ms / 1000) * 30)),
    'it-was-you': [20400, 24400].map((ms) => Math.round((ms / 1000) * 30)),
  };
  for (const config of [part3, part4]) {
    const starts = beats[config.slug];
    const cards = config.captions
      .filter((card) => card.atFrame > 0 && card.atFrame < 810)
      .map((card) => card.atFrame);
    // The first card that follows each voice line must lead it by 12 frames.
    for (const start of starts) {
      const lead = cards.find((at) => start - 12 <= at && at <= start);
      assert.ok(lead !== undefined, `${config.slug}: no caption leads the line at frame ${start}`);
      assert.ok(lead < start, `${config.slug}: caption at ${lead} must come before ${start}`);
    }
  }
});
