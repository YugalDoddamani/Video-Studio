'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Components = require('../src/stage/components.js');
const Scenes = require('../src/stage/scenes.js');
const Timeline = require('../src/stage/timeline.js');

function stateFor(config, frame) {
  const index = Timeline.sceneIndexAt(config, frame);
  const scene = config.scenes[index];
  const eventsByType = {};
  scene.events.forEach((event) => {
    if (!eventsByType[event.type]) eventsByType[event.type] = { ...event, atFrame: event.atFrame };
  });
  return {
    scene,
    state: {
      frame,
      localFrame: frame - scene.startFrame,
      durationFrames: scene.durationFrames,
      fps: config.format.fps,
      config,
      eventsByType,
    },
  };
}

const CONFIG = Timeline.normalizeConfig({
  title: 'Component test',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'lock',
      type: 'lock-screen',
      durationFrames: 60,
      data: { time: '11:47', dateLabel: 'Thursday', appLabel: 'VOICEMAIL', title: 'New voicemail', body: 'From: Me' },
      events: [{ type: 'show-notification', atFrame: 10, durationFrames: 8 }],
    },
    {
      id: 'voice',
      type: 'voice-note',
      durationFrames: 90,
      data: { sender: 'Me', transcript: { lines: ['Do not open the door.'] } },
      events: [
        { type: 'start-playback', atFrame: 4, durationFrames: 80 },
        { type: 'show-transcript', atFrame: 6, durationFrames: 8 },
      ],
    },
    {
      id: 'street',
      type: 'street',
      durationFrames: 60,
      data: { caption: 'Still running.' },
      events: [{ type: 'headlights-on', atFrame: 12, durationFrames: 10 }],
    },
    {
      id: 'mirror',
      type: 'reflection',
      durationFrames: 60,
      data: {},
      events: [
        { type: 'door-open', atFrame: 6, durationFrames: 20 },
        { type: 'silhouette', atFrame: 12, durationFrames: 20 },
        { type: 'glitch', atFrame: 20, durationFrames: 4 },
      ],
    },
    { id: 'end', type: 'end-card', durationFrames: 60, data: { lines: [{ text: 'Done.', atFrame: 0 }] }, events: [] },
  ],
});

test('every scene type renders without throwing', () => {
  CONFIG.scenes.forEach((scene) => {
    const html = Scenes.renderScene(scene, stateFor(CONFIG, scene.startFrame + 5).state);
    assert.equal(typeof html, 'string');
    assert.ok(html.length > 100, `${scene.type} produced output`);
    assert.ok(!html.includes('undefined'), `${scene.type} has no literal "undefined" in its markup`);
    assert.ok(!html.includes('NaN'), `${scene.type} has no NaN in its markup`);
  });
});

test('sceneTypes lists all registered renderers', () => {
  const types = Scenes.sceneTypes();
  ['lock-screen', 'notification', 'voice-note', 'incoming-call', 'message-thread', 'system-alert', 'street', 'reflection', 'end-card'].forEach(
    (type) => assert.ok(types.includes(type), `${type} is registered`)
  );
});

test('unknown scene types degrade to a visible error card instead of throwing', () => {
  const config = Timeline.normalizeConfig({ scenes: [{ id: 'x', type: 'no-such-scene', durationFrames: 30 }] });
  const { state } = stateFor(config, 0);
  const html = Scenes.renderScene(config.scenes[0], state);
  assert.match(html, /Unknown scene type/);
});

test('user text is escaped, never interpolated as markup', () => {
  const html = Components.notificationCard({
    title: '<img src=x onerror=alert(1)>',
    body: 'a & b',
    progress: 1,
    highlightProgress: 1,
  });
  assert.ok(!html.includes('<img'), 'tags are escaped');
  assert.match(html, /&lt;img/);
  assert.match(html, /a &amp; b/);
});

test('notification card animates from hidden to visible', () => {
  const hidden = Components.notificationCard({ title: 'x', progress: 0, highlightProgress: 0 });
  const shown = Components.notificationCard({ title: 'x', progress: 1, highlightProgress: 1 });
  assert.match(hidden, /opacity:0\.000/);
  assert.match(shown, /opacity:1\.000/);
});

test('highlight only colours the matching words', () => {
  const html = Components.notificationCard({
    body: 'Received tomorrow at 8',
    highlight: 'tomorrow',
    progress: 1,
    highlightProgress: 1,
  });
  assert.match(html, /<span class="hl" style="opacity:1\.000">tomorrow<\/span>/);
});

test('headlight ignition is deterministic and stutters before holding', () => {
  const event = { atFrame: 10, durationFrames: 20 };
  const before = Components.headlightIntensity(9, event);
  const atStart = Components.headlightIntensity(10, event);
  const samples = [];
  for (let frame = 10; frame < 30; frame++) samples.push(Components.headlightIntensity(frame, event));
  const after = Components.headlightIntensity(200, event);

  assert.equal(before, 0, 'off before the event');
  assert.ok(atStart <= 1);
  assert.ok(new Set(samples.map((value) => value.toFixed(2))).size > 2, 'ignition flickers rather than ramping linearly');
  assert.ok(after > 0.85, 'holds near full brightness afterwards');

  // Same frame, same value: no clock, no randomness.
  assert.equal(Components.headlightIntensity(18, event), Components.headlightIntensity(18, event));
});

test('waveform bars are seeded and stable for a given frame', () => {
  const a = Components.waveform({ bars: 24, seed: 'x', progress: 0.5 }, 100);
  const b = Components.waveform({ bars: 24, seed: 'x', progress: 0.5 }, 100);
  const c = Components.waveform({ bars: 24, seed: 'x', progress: 0.5 }, 101);
  assert.equal(a, b);
  assert.notEqual(a, c, 'the played region moves with frame time');
});

test('transcript reveals words progressively and keeps layout slots', () => {
  const words = Timeline.wordSchedule('one two three four', 10, 40);
  const early = Components.transcript({ lines: [{ words, revealFrames: 4 }] }, { frame: 12 });
  const late = Components.transcript({ lines: [{ words, revealFrames: 4 }] }, { frame: 60 });
  const countVisible = (html) => (html.match(/opacity:1\.000/g) || []).length;
  assert.ok(countVisible(late) > countVisible(early), 'more words are visible later');
  assert.equal((early.match(/class="word"/g) || []).length, 4, 'all four words keep their slot from the start');
});

test('reflection scene reveals the door and the figure over time', () => {
  const scene = CONFIG.scenes.find((entry) => entry.id === 'mirror');
  const early = stateFor(CONFIG, scene.startFrame + 2);
  const late = stateFor(CONFIG, scene.startFrame + 55);
  const earlyHtml = Scenes.renderScene(scene, early.state);
  const lateHtml = Scenes.renderScene(scene, late.state);

  // Grab the inline opacity declared on the element that carries the class.
  const opacity = (html, cls) => {
    const match = new RegExp(`class="${cls}"[^>]*opacity:([0-9.]+)`).exec(html);
    return match ? Number(match[1]) : null;
  };
  assert.equal(opacity(earlyHtml, 'mirror__figure'), 0, 'figure starts invisible');
  assert.ok(opacity(lateHtml, 'mirror__figure') > 0.9, 'figure is fully revealed later');
});

test('fiction label appears on every scene renderer', () => {
  CONFIG.scenes.forEach((scene) => {
    const html = Scenes.renderScene(scene, stateFor(CONFIG, scene.startFrame + scene.durationFrames - 1).state);
    assert.match(html, /FICTIONAL STORY|fictionLabel/i, `${scene.type} carries the disclosure`);
  });
});

test('components animate on scene-local frames, not global frames', () => {
  // A scene that starts late in the timeline. Global frames are large; its
  // own timings are small. If a component uses the global frame, every reveal
  // appears already finished on the first frame of the scene.
  const config = Timeline.normalizeConfig({
    scenes: [
      { id: 'lead-in', type: 'notification', durationFrames: 900, data: {}, events: [] },
      {
        id: 'late',
        type: 'message-thread',
        durationFrames: 120,
        data: {
          contact: 'Me',
          messages: [
            { from: 'them', text: 'first', atFrame: 10 },
            { from: 'them', text: 'second', atFrame: 60 },
          ],
        },
        events: [],
      },
    ],
  });
  const scene = config.scenes[1];

  const firstFrame = stateFor(config, scene.startFrame).state;
  const lateFrame = stateFor(config, scene.startFrame + 80).state;

  const visibleBubbles = (html) => (html.match(/class="bubble bubble--in">/g) || []).length;

  assert.equal(visibleBubbles(Scenes.renderScene(scene, firstFrame)), 0, 'no messages on the scene first frame');
  assert.equal(visibleBubbles(Scenes.renderScene(scene, lateFrame)), 2, 'both messages after their local frames');
});

test('end card lines reveal on their own local frames', () => {
  const config = Timeline.normalizeConfig({
    scenes: [
      { id: 'lead-in', type: 'notification', durationFrames: 600, data: {}, events: [] },
      {
        id: 'end',
        type: 'end-card',
        durationFrames: 90,
        data: { lines: [{ text: 'one', atFrame: 0 }, { text: 'two', atFrame: 40 }] },
        events: [],
      },
    ],
  });
  const scene = config.scenes[1];
  const early = Scenes.renderScene(scene, stateFor(config, scene.startFrame + 4).state);
  const late = Scenes.renderScene(scene, stateFor(config, scene.startFrame + 70).state);

  const dimLine = (html) => /class="endcard__line" style="opacity:0\.000/.test(html);
  assert.ok(dimLine(early), 'the second line is still hidden at the start of the card');
  assert.ok(!dimLine(late), 'the second line is revealed later');
});

test('transcript lines are hidden before their reveal frame', () => {
  const config = Timeline.normalizeConfig({
    scenes: [
      { id: 'lead', type: 'notification', durationFrames: 300, data: {}, events: [] },
      {
        id: 'voice',
        type: 'voice-note',
        durationFrames: 300,
        data: {
          transcript: {
            revealFrames: 20,
            lines: [
              { text: 'visible now', revealAtFrame: 5 },
              { text: 'later only', revealAtFrame: 200 },
            ],
          },
        },
        events: [{ type: 'show-transcript', atFrame: 2, durationFrames: 8 }],
      },
    ],
  });
  const scene = config.scenes[1];
  const html = Scenes.renderScene(scene, stateFor(config, scene.startFrame + 60).state);

  const words = [...html.matchAll(/class="word" style="opacity:([0-9.]+)">([^<]+)</g)].map((match) => ({
    opacity: Number(match[1]),
    word: match[2],
  }));
  const later = words.filter((entry) => ['later', 'only'].includes(entry.word));
  const early = words.filter((entry) => ['visible', 'now'].includes(entry.word));

  assert.ok(early.every((entry) => entry.opacity > 0.9), 'the first line is readable');
  assert.ok(later.every((entry) => entry.opacity === 0), 'the second line has not appeared yet');
});
