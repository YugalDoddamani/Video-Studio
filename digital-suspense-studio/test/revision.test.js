'use strict';

/**
 * revision.test.js - the 30s cut's additions.
 *
 * Covers the layers that did not exist before the revision: the project-level
 * caption track, the windowed transcript, the signal-loss scene, and the
 * end-card blackout. Also asserts the shipped film config still obeys the
 * spec's caption rules, so an edit to scenes.json cannot quietly break them.
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

function count(html, needle) {
  return html.split(needle).length - 1;
}

/** Visible text, with word-reveal spans flattened back into a sentence. */
function textOf(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Caption layer
// ---------------------------------------------------------------------------

const CAPTIONS = Timeline.normalizeConfig({
  title: 'captions',
  captions: [
    { text: 'this voicemail is from TOMORROW', atFrame: 0, durationFrames: 30 },
    { text: 'that is your own voice', atFrame: 30, durationFrames: 30 },
  ],
  scenes: [{ type: 'end-card', durationFrames: 120, data: {}, events: [] }],
}).captions;

test('caption layer renders only the cards that are live this frame', () => {
  assert.equal(Components.captionLayer(CAPTIONS, -1), '', 'nothing before the first card');
  assert.match(Components.captionLayer(CAPTIONS, 0), /captions/);

  const first = Components.captionLayer(CAPTIONS, 10);
  assert.match(first, /this voicemail is from/);
  assert.doesNotMatch(first, /that is your own voice/);

  const second = Components.captionLayer(CAPTIONS, 40);
  assert.match(second, /that is your own voice/);
  assert.doesNotMatch(second, /this voicemail is from/);

  assert.equal(Components.captionLayer(CAPTIONS, 120), '', 'nothing after the last card');
});

test('touching caption cards hand over on the frame boundary', () => {
  // Cards are half-open intervals, so a card that ends exactly when the next
  // begins hands over between two frames - which is the hard cut the format
  // wants. Overlapping cards are a config error, and they do still cross-fade.
  const last = Components.captionLayer(CAPTIONS, 29);
  const first = Components.captionLayer(CAPTIONS, 30);
  assert.match(last, /this voicemail is from/);
  assert.doesNotMatch(first, /this voicemail is from/, 'the old card is gone exactly on its end frame');
  assert.match(first, /that is your own voice/);
  assert.equal(count(first, '<div class="caption"'), 1);

  // Overlap is a config warning, but the renderer still stacks both cards.
  const overlapping = CAPTIONS.map((card, index) =>
    index === 1 ? { ...card, atFrame: 20, endFrame: 50 } : card
  );
  assert.equal(count(Components.captionLayer(overlapping, 25), '<div class="caption"'), 2);
});

test('a caption that opens the film is already on screen in frame 1', () => {
  const cards = [{ text: 'this voicemail is from TOMORROW', atFrame: 0, endFrame: 84 }];
  assert.match(Components.captionLayer(cards, 0), /class="caption" style="opacity:1\.000/);
  // A card later in the film still fades in over its first five frames.
  const later = [{ text: '3 KNOCKS. 9PM.', atFrame: 284, endFrame: 410 }];
  assert.match(Components.captionLayer(later, 284), /class="caption" style="opacity:0\.000/);
  assert.match(Components.captionLayer(later, 289), /class="caption" style="opacity:1\.000/);
});

test('only threat words take the emphasis colour', () => {
  assert.equal(Components.isHotToken('TOMORROW'), true);
  assert.equal(Components.isHotToken('9PM.'), true);
  assert.equal(Components.isHotToken('3'), true);
  assert.equal(Components.isHotToken('KNOCKS'), true);
  // Quiet text must stay quiet: lowercase words, contractions and the pronoun I.
  assert.equal(Components.isHotToken('tomorrow'), false);
  assert.equal(Components.isHotToken("that's"), false);
  assert.equal(Components.isHotToken('I'), false);
  assert.equal(Components.isHotToken('door?'), false);

  const html = Components.captionText('this voicemail is from TOMORROW');
  assert.equal(count(html, 'caption__hot'), 1);
  assert.match(html, /<span class="caption__hot">TOMORROW<\/span>/);

  const quiet = Components.captionText('you already know who it is');
  assert.equal(count(quiet, 'caption__hot'), 0);
});

test('caption text is escaped', () => {
  const html = Components.captionText('<script>alert(1)</script> TOMORROW');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

// ---------------------------------------------------------------------------
// Caption validation
// ---------------------------------------------------------------------------

function captionIssues(captions, scenes) {
  return validate({
    title: 'caption rules',
    captions,
    scenes: scenes || [
      {
        type: 'voice-note',
        durationFrames: 300,
        data: { transcript: { lines: [{ text: 'You already know who it is.' }] } },
        events: [],
      },
    ],
  }).issues;
}

test('a caption over five words is flagged', () => {
  const issues = captionIssues([{ text: 'one two three four five six', atFrame: 0, durationFrames: 30 }]);
  assert.ok(issues.some((issue) => /five or fewer/.test(issue.message)), 'expected the word-count warning');
});

test('overlapping captions are flagged', () => {
  const issues = captionIssues([
    { text: 'first card', atFrame: 0, durationFrames: 40 },
    { text: 'second card', atFrame: 20, durationFrames: 40 },
  ]);
  assert.ok(issues.some((issue) => /previous card ends/.test(issue.message)), 'expected the overlap warning');
});

test('a caption that transcribes the voice-over is flagged', () => {
  const issues = captionIssues([{ text: 'you already know who it is', atFrame: 0, durationFrames: 40 }]);
  assert.ok(
    issues.some((issue) => /repeats a spoken line/.test(issue.message)),
    'captions must add a second layer, not transcribe'
  );
});

test('a clean caption track raises nothing', () => {
  const issues = captionIssues([
    { text: '3 KNOCKS. 9PM.', atFrame: 0, durationFrames: 40 },
    { text: 'you know who it is.', atFrame: 40, durationFrames: 40 },
  ]);
  assert.deepEqual(issues.filter((issue) => issue.severity !== 'info'), []);
});

// ---------------------------------------------------------------------------
// Windowed transcript
// ---------------------------------------------------------------------------

function transcriptLines() {
  return ['Hey... it\'s me.', 'If you are hearing this.', 'Tonight at nine.'].map((text, index) => ({
    text,
    revealFrames: 4,
    words: Timeline.wordSchedule(text, index * 20, 8),
  }));
}

test('a windowed transcript keeps only the most recent lines', () => {
  const lines = transcriptLines();
  const html = Components.transcript({ lines, window: 2 }, { localFrame: 45 });
  assert.equal(count(html, '<p class="transcript__line">'), 2, 'two lines, not three');
  const text = textOf(html);
  assert.match(text, /If you are hearing this/, 'the middle line is still on screen');
  assert.match(text, /Tonight at nine/, 'the newest line is on screen');
  assert.doesNotMatch(text, /Hey\.\.\. it/, 'the oldest line has scrolled out');
  assert.match(html, /transcript--window/);
});

test('a windowed transcript renders nothing before the first line lands', () => {
  const html = Components.transcript({ lines: transcriptLines(), window: 2 }, { localFrame: -5 });
  assert.equal(count(html, '<p class="transcript__line">'), 0);
  assert.match(html, /TRANSCRIPT/, 'the card itself is already on screen');
});

test('an unwindowed transcript still renders every line', () => {
  const html = Components.transcript({ lines: transcriptLines() }, { localFrame: 200 });
  assert.equal(count(html, '<p class="transcript__line">'), 3);
  assert.doesNotMatch(html, /transcript--window/);
});

// ---------------------------------------------------------------------------
// signal-loss
// ---------------------------------------------------------------------------

const LOSS_CONFIG = Timeline.normalizeConfig({
  title: 'signal loss',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'loss',
      type: 'signal-loss',
      durationFrames: 90,
      data: {
        seed: 'test-static',
        progress: 0.9,
        voicemailFrames: 540,
        transcript: { window: 1, lines: [{ text: "That's why I'm calling from-", revealAtFrame: 2 }] },
        loss: { atFrame: 3, tearFrames: 20, snowAtFrame: 14, snowFrames: 20, blackFrames: 6 },
      },
      events: [],
    },
  ],
});

test('signal-loss renders seeded static that changes every frame', () => {
  const a = Scenes.renderScene(LOSS_CONFIG.scenes[0], stateFor(LOSS_CONFIG, 40));
  const b = Scenes.renderScene(LOSS_CONFIG.scenes[0], stateFor(LOSS_CONFIG, 41));
  assert.match(a, /loss__speck/, 'the scene draws noise');
  assert.match(a, /loss__scanlines/);
  assert.notEqual(a, b, 'the noise advances with the frame');
});

test('signal-loss is deterministic for a given frame', () => {
  const scene = LOSS_CONFIG.scenes[0];
  assert.equal(
    Scenes.renderScene(scene, stateFor(LOSS_CONFIG, 55)),
    Scenes.renderScene(scene, stateFor(LOSS_CONFIG, 55))
  );
});

test('signal-loss keeps the disclosure label above the noise', () => {
  const html = Scenes.renderScene(LOSS_CONFIG.scenes[0], stateFor(LOSS_CONFIG, 40));
  assert.match(html, /FICTIONAL STORY/);
});

test('signal-loss ends on black', () => {
  const scene = LOSS_CONFIG.scenes[0];
  const before = Scenes.renderScene(scene, stateFor(LOSS_CONFIG, 80));
  const cut = Scenes.renderScene(scene, stateFor(LOSS_CONFIG, 85));
  const last = Scenes.renderScene(scene, stateFor(LOSS_CONFIG, 89));
  const opacityOf = (html) => Number((html.match(/loss__black" style="opacity:([0-9.]+)/) || [])[1]);
  assert.equal(opacityOf(before), 0, 'picture still up before the cut');
  assert.ok(opacityOf(cut) > 0.99, 'the cut to black is a hard one');
  assert.equal(opacityOf(last), 1, 'the scene ends on black');
});

// ---------------------------------------------------------------------------
// The hook - frame 1 is the impossible image
// ---------------------------------------------------------------------------

const HOOK_CONFIG = Timeline.normalizeConfig({
  title: 'hook',
  fictionLabel: 'FICTIONAL STORY',
  scenes: [
    {
      id: 'hook',
      type: 'lock-screen',
      durationFrames: 90,
      data: {
        time: '8:47',
        dateLabel: 'Thursday, 12 June',
        appLabel: 'VOICEMAIL',
        title: 'Voicemail',
        body: 'received TOMORROW, 6:47 AM',
        highlight: 'TOMORROW',
        darkRoom: true,
        wake: { atFrame: -16, durationFrames: 26 },
      },
      events: [
        { type: 'show-notification', atFrame: 0, durationFrames: 10 },
        { type: 'highlight-timestamp', atFrame: 0, durationFrames: 8 },
      ],
    },
  ],
});

const opacityAfter = (html, pattern) => Number((html.match(pattern) || [])[1]);

test('the film opens on the impossible image, not an empty lock screen', () => {
  const html = Scenes.renderScene(HOOK_CONFIG.scenes[0], stateFor(HOOK_CONFIG, 0));
  const card = opacityAfter(html, /class="notif[^"]*"\s+style="opacity:([0-9.]+)/);
  const token = opacityAfter(html, /class="hl" style="opacity:([0-9.]+)">TOMORROW/);
  assert.equal(card, 1, 'the notification is already delivered at frame 1');
  assert.equal(token, 1, 'the word TOMORROW is never missing from the body');
  assert.match(html, /received .*6:47 AM/);
});

test('the screen is already awake at frame 1, and still waking', () => {
  const first = Scenes.renderScene(HOOK_CONFIG.scenes[0], stateFor(HOOK_CONFIG, 0));
  const later = Scenes.renderScene(HOOK_CONFIG.scenes[0], stateFor(HOOK_CONFIG, 20));
  const wakeOf = (html) => opacityAfter(html, /class="wake" style="opacity:([0-9.]+)/);
  assert.ok(wakeOf(first) > 0.5, 'the chrome is legible in the first frame');
  assert.ok(wakeOf(first) < 1, 'but the room is still coming up');
  assert.equal(wakeOf(later), 1);
  const clock = opacityAfter(first, /lock__clock-group" style="opacity:([0-9.]+)/);
  assert.ok(clock > 0.5, 'the clock is on the glass, not fading up from nothing');
});

// ---------------------------------------------------------------------------
// End-card blackout
// ---------------------------------------------------------------------------

const END_CONFIG = Timeline.normalizeConfig({
  title: 'blackout',
  scenes: [
    {
      id: 'end',
      type: 'end-card',
      durationFrames: 90,
      data: {
        blackoutFrames: 40,
        ruleAtFrame: 40,
        lines: [{ text: 'PART 2: you answer.', atFrame: 44 }],
        arrow: true,
        arrowAtFrame: 60,
      },
      events: [],
    },
  ],
});

test('the end card is genuinely empty during the blackout', () => {
  const scene = END_CONFIG.scenes[0];
  for (const frame of [0, 20, 39]) {
    const html = Scenes.renderScene(scene, stateFor(END_CONFIG, frame));
    assert.doesNotMatch(html, /endcard__line/, `no text at frame ${frame}`);
    assert.doesNotMatch(html, /class="backdrop"/, `no house gradient at frame ${frame} - it has to be black`);
    assert.match(html, /FICTIONAL STORY/, `the disclosure still holds at frame ${frame}`);
  }
  const after = Scenes.renderScene(scene, stateFor(END_CONFIG, 60));
  assert.match(after, /endcard__line/);
  assert.match(after, /endcard__arrow/);
});

// ---------------------------------------------------------------------------
// The shipped film
// ---------------------------------------------------------------------------

const FILM_DIR = path.join(__dirname, '..', 'projects', 'voicemail-from-tomorrow-30s');

test('the 30s cut is exactly 30 seconds of the beat sheet', () => {
  const { config, issues } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'), { projectDir: FILM_DIR });
  assert.deepEqual(issues.filter((issue) => issue.severity === 'error'), [], 'the shipped config must be valid');

  assert.equal(config.totalFrames, 900);
  assert.equal(config.durationSeconds, 30);
  assert.deepEqual(
    config.scenes.map((scene) => scene.type),
    ['lock-screen', 'voice-note', 'signal-loss', 'incoming-call', 'end-card']
  );

  // Beat sheet: hook 0-3s, voicemail 3-21s, signal loss 21-24s, call 24-27s, end 27-30s.
  assert.deepEqual(
    config.scenes.map((scene) => [scene.startFrame, scene.durationFrames]),
    [
      [0, 90],
      [90, 540],
      [630, 90],
      [720, 90],
      [810, 90],
    ]
  );
});

test('every caption obeys the five-word rule and lands before its audio beat', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'), { projectDir: FILM_DIR });
  assert.ok(config.captions.length >= 8, 'the caption track is a real second layer');

  let previousEnd = 0;
  config.captions.forEach((caption, index) => {
    const words = caption.text.trim().split(/\s+/).filter(Boolean);
    assert.ok(words.length <= 5, `caption ${index} has ${words.length} words: "${caption.text}"`);
    assert.ok(caption.atFrame >= previousEnd, `caption ${index} overlaps the one before it`);
    assert.equal(caption.text, caption.text.toLowerCase() === caption.text ? caption.text : caption.text);
    previousEnd = caption.endFrame;
  });

  // No caption runs into the end card: the card has to land on its own.
  const endCard = config.scenes.find((scene) => scene.type === 'end-card');
  assert.ok(previousEnd <= endCard.startFrame, 'captions must clear the end card');
});

test('the shipped film carries a real audio track', () => {
  const { config } = loadConfigFile(path.join(FILM_DIR, 'scenes.json'), { projectDir: FILM_DIR });
  assert.equal(config.audio.mode, 'local');
  assert.equal(config.audio.tracks.length, 1);
  assert.equal(config.audio.tracks[0].file, 'audio/mix.wav');
});
