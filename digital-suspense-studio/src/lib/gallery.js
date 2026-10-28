'use strict';

/**
 * gallery.js - a synthetic config that renders one frame of every scene type.
 * Used by `npm run gallery` to review the visual system without a story.
 */

const SCENE_SECONDS = 1;
const FPS = 30;

function config() {
  const scenes = [
    {
      id: 'gallery-lock',
      type: 'lock-screen',
      data: {
        time: '8:14',
        dateLabel: 'Thursday, 12 June',
        appLabel: 'VOICEMAIL',
        title: 'New voicemail',
        body: 'From: Me · tomorrow, 8:14 AM',
        highlight: 'Me',
        when: 'now',
      },
      events: [{ type: 'show-notification', atFrame: 4, durationFrames: 8 }],
    },
    {
      id: 'gallery-notification',
      type: 'notification',
      data: {
        appLabel: 'VOICEMAIL',
        title: 'New voicemail from Me',
        body: 'Received: tomorrow, 8:14 AM',
        highlight: 'tomorrow',
        warning: true,
        alert: { heading: 'Unusual timestamp', body: 'This message was recorded in the future.', severity: 'warning' },
      },
      events: [
        { type: 'show-notification', atFrame: 3, durationFrames: 8 },
        { type: 'show-alert', atFrame: 12, durationFrames: 8 },
      ],
    },
    {
      id: 'gallery-voice',
      type: 'voice-note',
      data: {
        headerTitle: 'VOICEMAIL',
        headerSubtitle: 'Received tomorrow',
        sender: 'Me',
        subtitle: 'Received tomorrow · 8:14 AM',
        highlight: 'tomorrow',
        durationLabel: '0:13',
        avatarInitials: 'ME',
        bars: 56,
        transcript: {
          revealFrames: 40,
          lineStaggerFrames: 30,
          lines: [
            'Sarah, don\u2019t go to the bridge tomorrow at 8:15.',
            'The blue truck \u2014 it\u2019s already here.',
            'And whatever you do, don\u2019t open the door.',
          ],
        },
      },
      events: [
        { type: 'start-playback', atFrame: 2, durationFrames: 120 },
        { type: 'show-transcript', atFrame: 4, durationFrames: 10 },
      ],
    },
    {
      id: 'gallery-call',
      type: 'incoming-call',
      data: { caller: 'Me', subtitle: 'mobile · tomorrow', avatarInitials: 'ME' },
      events: [{ type: 'incoming-call', atFrame: 2, durationFrames: 10 }],
    },
    {
      id: 'gallery-thread',
      type: 'message-thread',
      data: {
        contact: 'Me',
        headerSubtitle: 'mobile',
        messages: [
          { from: 'them', text: 'Don\u2019t open the door.', atFrame: 2 },
          { from: 'me', text: 'Who is this?', atFrame: 10 },
          { from: 'them', text: 'You know who this is.', atFrame: 18 },
        ],
        typing: [{ startFrame: 0, endFrame: 8 }],
      },
      events: [],
    },
    {
      id: 'gallery-photo',
      type: 'photo-viewer',
      data: {
        contact: 'Me',
        headerSubtitle: 'your number',
        stamp: '8:41 PM',
        sinceLabel: 'sent just now',
        caption: '8:41 PM · from your number',
      },
      events: [{ type: 'photo-received', atFrame: 6, durationFrames: 18 }],
    },
    {
      id: 'gallery-signal-loss',
      type: 'signal-loss',
      data: {
        headerTitle: 'VOICEMAIL',
        headerSubtitle: 'Playing',
        sender: 'Me',
        subtitle: 'your number · 6:47 AM',
        durationLabel: '0:18',
        avatarInitials: 'ME',
        progress: 0.965,
        voicemailFrames: 540,
        seed: 'gallery-static',
        transcript: { revealFrames: 4, window: 1, lines: [{ text: 'That\u2019s why I\u2019m calling from\u2014', revealAtFrame: 0 }] },
        loss: { atFrame: 0, tearFrames: 10, snowAtFrame: 8, snowFrames: 10, blackFrames: 0 },
      },
      events: [],
    },
    {
      id: 'gallery-video-call',
      type: 'video-call',
      data: {
        caller: 'Me',
        callerSubtitle: 'your number',
        timerStartSeconds: 12,
        zoom: 0.95,
        strip: { outAtFrame: 18 },
        pip: { doorAtFrame: 14, doorFrames: 12 },
        seed: 'gallery-call',
      },
      events: [],
    },
    {
      id: 'gallery-alert',
      type: 'system-alert',
      data: {
        heading: 'Location shared',
        body: 'Your location is being shared with an unknown device.',
        severity: 'danger',
        footnote: 'Shared since 8:14 AM',
        caption: 'A system alert can carry a beat on its own.',
      },
      events: [{ type: 'show-alert', atFrame: 3, durationFrames: 10 }],
    },
    {
      id: 'gallery-street',
      type: 'street',
      data: { caption: 'The blue truck is still running.', headlights: { atFrame: 2, durationFrames: 16 } },
      events: [],
    },
    {
      id: 'gallery-reflection',
      type: 'reflection',
      data: {},
      events: [
        { type: 'glitch', atFrame: 6, durationFrames: 8 },
        { type: 'door-open', atFrame: 4, durationFrames: 24 },
        { type: 'silhouette', atFrame: 8, durationFrames: 20 },
      ],
    },
    {
      id: 'gallery-end',
      type: 'end-card',
      data: {
        lines: [
          { text: 'The voicemail was from tomorrow.', atFrame: 0 },
          { text: 'She was the one who sent it.', atFrame: 12, accent: true },
        ],
        followPrompt: 'FICTIONAL STORY',
      },
      events: [],
    },
  ].map((scene, index) => ({
    ...scene,
    startFrame: index * SCENE_SECONDS * FPS,
    durationFrames: SCENE_SECONDS * FPS,
  }));

  return {
    title: 'Component gallery',
    slug: 'component-gallery',
    fictional: true,
    fictionLabel: 'FICTIONAL STORY',
    format: { width: 1080, height: 1920, fps: FPS },
    audio: { mode: 'silent', tracks: [] },
    scenes,
  };
}

module.exports = { galleryConfig: config };
