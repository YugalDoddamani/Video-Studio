/**
 * scenes.js - scene renderers.
 *
 * A scene type is a composition of components. Each renderer receives the
 * normalized scene plus a frame state:
 *
 *   { frame, localFrame, fps, durationFrames, config, eventsByType }
 *
 * and returns an HTML fragment filling the 1080x1920 stage.
 *
 * Add a new scene type here and register it in SCENES. Keep renderers pure and
 * frame-driven so the same frame number always yields the same pixels.
 */
(function (global) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Motion = isNode ? require('./motion.js') : global.Motion;
  const Timeline = isNode ? require('./timeline.js') : global.Timeline;
  const Components = isNode ? require('./components.js') : global.Components;

  const tween = Motion.tween;
  const clamp01 = Motion.clamp01;

  // ---------------------------------------------------------------------------
  // shared scaffolding
  // ---------------------------------------------------------------------------

  /** Full-screen phone surface: backdrop, status bar, optional header. */
  function screen(options) {
    const { inner, statusTime, header, headerTitle, headerSubtitle, headerVariant, extraClass } = options;
    return `
      <div class="stage ${extraClass || ''}">
        <div class="backdrop"></div>
        ${Components.statusBar({ time: statusTime })}
        ${header === false ? '' : header || (headerTitle ? Components.appHeader(headerTitle, headerSubtitle, headerVariant) : '')}
        ${inner}
        <div class="vignette"></div>
      </div>`;
  }

  /** The fiction disclosure, pinned above the bottom overlay zone. */
  function fictionFooter(state, options) {
    const opts = options || {};
    const start = opts.fromFrame === undefined ? 6 : opts.fromFrame;
    const opacity = tween(state.localFrame, start, opts.fadeFrames || 14, Motion.ease.outCubic);
    return `<div class="fiction-wrap">
      ${Components.fictionLabel({ text: state.config.fictionLabel, opacity })}
    </div>`;
  }

  function eventAt(eventsByType, type, fallback) {
    return eventsByType[type] || fallback;
  }

  // ---------------------------------------------------------------------------
  // lock-screen: the hook. Clock, date, one notification.
  // ---------------------------------------------------------------------------

  function renderLockScreen(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const notifEvent = eventAt(state.eventsByType, 'show-notification', {
      atFrame: Math.round(state.durationFrames * 0.18),
      durationFrames: 10,
    });
    // outBack overshoots past 1, which is right for scale but not for opacity.
    const notifRaw = tween(frame, notifEvent.atFrame, notifEvent.durationFrames, Motion.ease.outBack);
    const notifProgress = clamp01(notifRaw);
    const highlightEvent = eventAt(state.eventsByType, 'highlight-timestamp', {
      atFrame: notifEvent.atFrame + notifEvent.durationFrames + 8,
      durationFrames: 18,
    });
    const highlightProgress = tween(frame, highlightEvent.atFrame, highlightEvent.durationFrames);
    const clockOpacity = tween(frame, 0, 12);
    const glow = 0.14 + 0.1 * Motion.pulse(frame, 62, 0) * notifProgress;

    return screen({
      statusTime: data.statusTime || data.time || '8:14',
      inner: `
        <div class="lock">
          <div class="lock__clock-group" style="opacity:${clockOpacity.toFixed(3)}">
            <div class="lock__time">${Components.esc(data.time || '8:14')}</div>
            <div class="lock__date">${Components.esc(data.dateLabel || '')}</div>
          </div>
          <div class="lock__glow" style="opacity:${glow.toFixed(3)}"></div>
          <div class="lock__notif">
            ${Components.notificationCard({
              appLabel: data.appLabel || 'VOICEMAIL',
              title: data.title || 'New voicemail',
              body: data.body || '',
              highlight: data.highlight,
              when: data.when || 'now',
              warning: data.warning === true,
              progress: notifProgress,
              highlightProgress,
            })}
          </div>
          ${fictionFooter(state, { fromFrame: 4 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // notification: a notification or alert as the main subject.
  // ---------------------------------------------------------------------------

  function renderNotification(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const notifEvent = eventAt(state.eventsByType, 'show-notification', {
      atFrame: Math.round(state.durationFrames * 0.12),
      durationFrames: 10,
    });
    const notifProgress = clamp01(tween(frame, notifEvent.atFrame, notifEvent.durationFrames, Motion.ease.outBack));
    const alertEvent = eventAt(state.eventsByType, 'show-alert', null);
    const alertProgress = alertEvent ? tween(frame, alertEvent.atFrame, alertEvent.durationFrames, Motion.ease.outCubic) : 0;

    const alert =
      alertEvent && data.alert
        ? `<div class="screen__alert">${Components.systemAlert({
            heading: data.alert.heading,
            body: data.alert.body,
            footnote: data.alert.footnote,
            severity: data.alert.severity || 'warning',
            progress: alertProgress,
          })}</div>`
        : '';

    return screen({
      statusTime: data.statusTime || '8:14',
      inner: `
        <div class="screen screen--notification">
          <div class="screen__notif">
            ${Components.notificationCard({
              appLabel: data.appLabel || 'NOTIFICATION',
              title: data.title || '',
              body: data.body || '',
              highlight: data.highlight,
              when: data.when || 'now',
              warning: data.warning === true,
              progress: notifProgress,
              highlightProgress: tween(frame, notifEvent.atFrame + notifEvent.durationFrames + 10, 16),
            })}
          </div>
          ${alert}
          ${data.caption ? `<div class="screen__caption">${Components.esc(data.caption)}</div>` : ''}
          ${fictionFooter(state, { fromFrame: 8 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // voice-note: the voicemail player with a word-by-word transcript.
  // ---------------------------------------------------------------------------

  function buildTranscriptLines(scene, state) {
    const transcript = scene.data.transcript || {};
    const rawLines = Array.isArray(transcript) ? transcript : transcript.lines || [];
    const revealFrames = Number(transcript.revealFrames) || 46;
    const lineStaggerFrames = Number(transcript.lineStaggerFrames) || 78;
    const baseEvent = eventAt(state.eventsByType, 'show-transcript', {
      atFrame: Math.round(state.durationFrames * 0.12),
      durationFrames: 12,
    });

    return rawLines.map((line, index) => {
      const text = typeof line === 'string' ? line : line.text || '';
      const startFrame =
        typeof line === 'object' && Number.isFinite(Number(line.revealAtFrame))
          ? Math.round(Number(line.revealAtFrame))
          : baseEvent.atFrame + index * lineStaggerFrames;
      return {
        text,
        revealFrames: (typeof line === 'object' && Number(line.revealFrames)) || Math.round(revealFrames / 4),
        words: Timeline.wordSchedule(text, startFrame, revealFrames),
      };
    });
  }

  function renderVoiceNote(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const playbackEvent = eventAt(state.eventsByType, 'start-playback', {
      atFrame: 8,
      durationFrames: Math.max(30, state.durationFrames - 40),
    });
    const progress = clamp01((frame - playbackEvent.atFrame) / Math.max(1, playbackEvent.durationFrames));

    return screen({
      statusTime: data.statusTime || '8:14',
      headerTitle: data.headerTitle || 'VOICEMAIL',
      headerSubtitle: data.headerSubtitle || '',
      inner: `
        <div class="screen screen--player">
          ${Components.voiceNote({
            avatarInitials: data.avatarInitials || 'ME',
            sender: data.sender || 'Me',
            subtitle: data.subtitle || '',
            highlight: data.highlight,
            durationLabel: data.durationLabel || '0:13',
            bars: data.bars || 56,
            waveHeight: data.waveHeight || 132,
            seed: data.seed || scene.id,
            progress,
            durationFrames: playbackEvent.durationFrames,
            lines: buildTranscriptLines(scene, state),
            transcriptLabel: data.transcriptLabel || 'TRANSCRIPT',
          }, state)}
          ${fictionFooter(state, { fromFrame: 10 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // incoming-call
  // ---------------------------------------------------------------------------

  function renderIncomingCall(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const callEvent = eventAt(state.eventsByType, 'incoming-call', { atFrame: 2, durationFrames: 14 });
    const progress = tween(frame, callEvent.atFrame, callEvent.durationFrames, Motion.ease.outCubic);

    return screen({
      statusTime: data.statusTime || '8:15',
      inner: `
        <div class="screen screen--call">
          ${Components.incomingCall({
            caller: data.caller || 'Unknown',
            subtitle: data.subtitle || '',
            avatarInitials: data.avatarInitials || '??',
            callState: data.callState || 'incoming',
            pulsePeriodFrames: data.pulsePeriodFrames || 78,
            progress,
          }, state)}
          ${fictionFooter(state, { fromFrame: 12 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // message-thread
  // ---------------------------------------------------------------------------

  function renderMessageThread(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const messages = (data.messages || []).map((message) => {
      const atFrame = Number.isFinite(Number(message.atFrame))
        ? Number(message.atFrame)
        : Math.round(Number(message.revealAtSeconds || 0) * state.fps);
      return { ...message, atFrame };
    });

    return screen({
      statusTime: data.statusTime || '8:14',
      header: Components.appHeader(data.contact || 'Messages', data.headerSubtitle || '', 'contact'),
      inner: `
        <div class="screen screen--thread">
          ${Components.messageThread({
            contact: data.contact || 'Messages',
            headerSubtitle: data.headerSubtitle || 'mobile',
            messages,
            typing: data.typing || [],
          }, state)}
          <div class="thread-footer">
            ${Components.fictionLabel({
              text: state.config.fictionLabel,
              opacity: tween(state.localFrame, 10, 14, Motion.ease.outCubic),
            })}
          </div>
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // photo-viewer: a photo opened full screen out of a conversation.
  // ---------------------------------------------------------------------------

  function renderPhotoViewer(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const revealEvent = eventAt(state.eventsByType, 'photo-received', { atFrame: 30, durationFrames: 26 });
    const progress = tween(frame, revealEvent.atFrame, revealEvent.durationFrames, Motion.ease.outCubic);

    return screen({
      statusTime: data.statusTime || '8:41',
      header: Components.appHeader(
        data.contact || 'Me',
        data.headerSubtitle || 'your number',
        'contact'
      ),
      inner: `
        <div class="screen screen--photo">
          ${Components.photoCard({
            progress,
            stamp: data.stamp || '8:41 PM',
            sinceLabel: data.sinceLabel || 'sent just now',
            caption: data.caption || '',
          }, state)}
          ${fictionFooter(state, { fromFrame: 10 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // system-alert
  // ---------------------------------------------------------------------------

  function renderSystemAlert(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const event = eventAt(state.eventsByType, 'show-alert', { atFrame: 6, durationFrames: 12 });
    const progress = tween(frame, event.atFrame, event.durationFrames, Motion.ease.outCubic);

    return screen({
      statusTime: data.statusTime || '8:14',
      inner: `
        <div class="screen screen--alert">
          ${Components.systemAlert({
            heading: data.heading || 'Warning',
            body: data.body || '',
            footnote: data.footnote,
            severity: data.severity || 'warning',
            progress,
          })}
          ${data.caption ? `<div class="screen__caption screen__caption--alert">${Components.esc(data.caption)}</div>` : ''}
          ${fictionFooter(state, { fromFrame: 8 })}
        </div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // street / reflection (scene extensions)
  // ---------------------------------------------------------------------------

  function renderStreet(scene, state) {
    return `
      ${Components.rainyStreet({
        seed: scene.data.seed || scene.id,
        headlights: scene.data.headlights || eventAt(state.eventsByType, 'headlights-on', null),
      }, state)}
      ${scene.data.caption ? `<div class="street__caption">${Components.esc(scene.data.caption)}</div>` : ''}
      ${fictionFooter(state, { fromFrame: 14 })}`;
  }

  function renderReflection(scene, state) {
    return `
      ${Components.phoneReflection({ seed: scene.data.seed || scene.id, eventsByType: state.eventsByType }, state)}
      ${scene.data.caption ? `<div class="street__caption">${Components.esc(scene.data.caption)}</div>` : ''}
      ${fictionFooter(state, { fromFrame: 10 })}`;
  }

  // ---------------------------------------------------------------------------
  // end-card
  // ---------------------------------------------------------------------------

  function renderEndCard(scene, state) {
    const data = scene.data;
    const zoom = 1 + (state.localFrame / Math.max(1, state.durationFrames)) * 0.02;
    const glow = 0.12 + 0.06 * Motion.pulse(state.localFrame, 90, 0);
    return `
      <div class="stage stage--endcard">
        <div class="backdrop"></div>
        <div class="endcard__glow" style="opacity:${glow.toFixed(3)};transform:translateX(-50%) scale(${zoom.toFixed(4)})"></div>
        ${Components.endCard({ lines: data.lines || [], followPrompt: data.followPrompt }, state)}
        <div class="fiction-wrap">
          ${Components.fictionLabel({
            text: state.config.fictionLabel,
            opacity: tween(state.localFrame, Math.round(state.durationFrames * 0.35), 16),
          })}
        </div>
        <div class="vignette"></div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // registry
  // ---------------------------------------------------------------------------

  const SCENES = {
    'lock-screen': { render: renderLockScreen, label: 'Lock screen with notification' },
    notification: { render: renderNotification, label: 'Notification card' },
    'voice-note': { render: renderVoiceNote, label: 'Voicemail / voice note player' },
    'incoming-call': { render: renderIncomingCall, label: 'Incoming call screen' },
    'message-thread': { render: renderMessageThread, label: 'Message conversation' },
    'photo-viewer': { render: renderPhotoViewer, label: 'Photo opened from a conversation' },
    'system-alert': { render: renderSystemAlert, label: 'System alert' },
    street: { render: renderStreet, label: 'Rainy street insert' },
    reflection: { render: renderReflection, label: 'Mirror / doorway reveal' },
    'end-card': { render: renderEndCard, label: 'Final line / credits card' },
  };

  function sceneTypes() {
    return Object.keys(SCENES);
  }

  /** Render the frame for a given scene. Unknown types degrade gracefully. */
  function renderScene(scene, state) {
    const entry = SCENES[scene.type];
    if (!entry) {
      return screen({
        inner: `<div class="screen screen--alert">${Components.systemAlert({
          heading: 'Unknown scene type',
          body: `"${scene.type}" is not registered in src/stage/scenes.js`,
          severity: 'danger',
          progress: 1,
        })}</div>`,
      });
    }
    return entry.render(scene, state);
  }

  const Scenes = { SCENES, sceneTypes, renderScene };

  if (isNode) {
    module.exports = Scenes;
  } else {
    global.Scenes = Scenes;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
