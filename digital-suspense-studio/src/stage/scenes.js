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

  /**
   * Full-screen phone surface: backdrop, status bar, optional header.
   *
   * `layer` paints between the backdrop and the chrome (the dark room behind a
   * sleeping phone). `wake` dims the whole chrome at once, which is how a phone
   * screen coming on is staged.
   */
  function screen(options) {
    const { inner, statusTime, header, headerTitle, headerSubtitle, headerVariant, extraClass, layer, wake } = options;
    const headerHtml =
      header === false ? '' : header || (headerTitle ? Components.appHeader(headerTitle, headerSubtitle, headerVariant) : '');
    const chrome = `${Components.statusBar({ time: statusTime })}${headerHtml}${inner}`;
    const body =
      wake === undefined ? chrome : `<div class="wake" style="opacity:${Number(wake).toFixed(3)}">${chrome}</div>`;
    return `
      <div class="stage ${extraClass || ''}">
        <div class="backdrop"></div>
        ${layer || ''}
        ${body}
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

  /**
   * Piecewise interpolation over [[frame, value], ...] keyframes.
   *
   * Scene data describes a map as a few points in time ("2.8 km at frame 0,
   * 1.1 km at 100") and this turns them into a value for the current frame.
   * The easing is per-segment, so a distance can crawl and then accelerate.
   */
  function keyframes(frame, keys, easing) {
    if (!Array.isArray(keys) || keys.length === 0) return 0;
    if (frame <= keys[0][0]) return keys[0][1];
    for (let index = 1; index < keys.length; index += 1) {
      const endFrame = keys[index][0];
      if (frame <= endFrame) {
        const startFrame = keys[index - 1][0];
        const span = Math.max(1, endFrame - startFrame);
        const progress = (easing || Motion.ease.inOutCubic)(clamp01((frame - startFrame) / span));
        return keys[index - 1][1] + (keys[index][1] - keys[index - 1][1]) * progress;
      }
    }
    return keys[keys.length - 1][1];
  }

  /** 2800 metres reads as "2.8 km"; 3 metres reads as "3 m". */
  function formatDistance(metres) {
    if (metres >= 995) return { value: (metres / 1000).toFixed(1), unit: 'km' };
    return { value: String(Math.max(1, Math.round(metres))), unit: 'm' };
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
    // A card scheduled for frame 0 is not an entrance: the film joins the story
    // with the notification already on the glass, so frame 1 is the impossible
    // image rather than an empty lock screen. Anything later keeps its spring.
    const notifProgress = notifEvent.atFrame === 0 ? 1 : clamp01(notifRaw);
    const highlightEvent = eventAt(state.eventsByType, 'highlight-timestamp', {
      atFrame: notifEvent.atFrame + notifEvent.durationFrames + 8,
      durationFrames: 18,
    });
    // Same rule as the card: a highlight scheduled for frame 0 is already lit.
    // The token replaces the word in the body, so fading it in would leave
    // "received , 6:47 AM" on screen for the first quarter of a second.
    const highlightProgress = highlightEvent.atFrame === 0
      ? 1
      : tween(frame, highlightEvent.atFrame, highlightEvent.durationFrames);
    const pulseGlow = 0.14 + 0.1 * Motion.pulse(frame, 62, 0) * notifProgress;

    // Hook staging: the room is real, the phone is asleep, and the screen is
    // what wakes it. With darkRoom the chrome fades up instead of hard-cutting
    // in, and a near-black room layer sits underneath.
    const wakeEvent = data.wake || { atFrame: 0, durationFrames: 16 };
    const wake = data.darkRoom
      ? tween(frame, Number(wakeEvent.atFrame) || 0, Number(wakeEvent.durationFrames) || 16, Motion.ease.outCubic)
      : undefined;
    // The clock rides the wake: on a dark-room shot it is already there at
    // frame 1, dim with the screen, rather than fading up out of nothing.
    const clockOpacity = Math.max(tween(frame, 0, 12), wake || 0);
    const room = data.darkRoom
      ? `<div class="room">
           <div class="room__wall"></div>
           <div class="room__window"></div>
           <div class="room__door"></div>
           <div class="room__floor"></div>
           <div class="room__glow" style="opacity:${(0.18 + wake * 0.82).toFixed(3)}"></div>
           <div class="room__dim" style="opacity:${(0.88 - wake * 0.68).toFixed(3)}"></div>
         </div>`
      : '';
    const glowOpacity = 0.14 + 0.1 * Motion.pulse(frame, 62, 0) * notifProgress;

    return screen({
      statusTime: data.statusTime || data.time || '8:14',
      extraClass: data.darkRoom ? 'stage--room' : '',
      layer: room,
      wake,
      inner: `
        <div class="lock">
          <div class="lock__clock-group" style="opacity:${clockOpacity.toFixed(3)}">
            <div class="lock__time">${Components.esc(data.time || '8:14')}</div>
            <div class="lock__date">${Components.esc(data.dateLabel || '')}</div>
          </div>
          <div class="lock__glow" style="opacity:${glowOpacity.toFixed(3)}"></div>
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
            window: Number((scene.data.transcript || {}).window) || 0,
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
  // signal-loss: the phone dies while the message is still playing.
  // ---------------------------------------------------------------------------

  /**
   * The picture tears, the sound is cut off mid-word, and the caption finishes
   * the sentence the audio could not. Everything here is derived from the frame
   * number and a seed, so a re-render produces byte-identical static.
   */
  function renderSignalLoss(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const duration = state.durationFrames;
    const loss = data.loss || {};

    const atFrame = Math.max(0, Math.round(Number(loss.atFrame) || 3));
    const tearFrames = Math.max(1, Math.round(Number(loss.tearFrames) || 20));
    const snowAtFrame = Math.round(Number(loss.snowAtFrame) || 16);
    const snowFrames = Math.max(1, Math.round(Number(loss.snowFrames) || 18));
    const blackFrames = Math.max(0, Math.round(Number(loss.blackFrames) || 6));

    const tear = tween(frame, atFrame, tearFrames, Motion.ease.inCubic);
    const snow = tween(frame, snowAtFrame, snowFrames, Motion.ease.outCubic);
    // A hard cut, not a dim: the screen dies on a frame boundary.
    const black = blackFrames && frame >= duration - blackFrames ? 1 : 0;

    // A fresh stream of noise every frame, seeded by frame number.
    const random = Motion.mulberry32(Motion.hashString(`${data.seed || scene.id}:${frame}`));

    const jitterX = (random() * 2 - 1) * 30 * tear;
    const jitterY = (random() * 2 - 1) * 9 * tear;

    // Slices of the picture, displaced sideways as the signal degrades.
    const bands = [];
    for (let i = 0; i < 20; i += 1) {
      const top = random() * 1920;
      const height = 10 + random() * 62;
      const dx = (random() * 2 - 1) * 210 * tear;
      const opacity = (0.22 + random() * 0.58) * tear;
      bands.push(
        `<span class="loss__band" style="top:${top.toFixed(0)}px;height:${height.toFixed(0)}px;transform:translateX(${dx.toFixed(0)}px);opacity:${opacity.toFixed(3)}"></span>`
      );
    }

    // Snow. Short bright dashes read as signal noise at 1080x1920 far better
    // than a full-frame noise texture, and cost one element each.
    const specks = [];
    for (let i = 0; i < 170; i += 1) {
      const left = random() * 1080;
      const top = random() * 1920;
      const width = 14 + random() * 190;
      const height = 2 + random() * 5;
      const opacity = 0.06 + random() * 0.85;
      specks.push(
        `<span class="loss__speck" style="left:${left.toFixed(0)}px;top:${top.toFixed(0)}px;width:${width.toFixed(0)}px;height:${height.toFixed(1)}px;opacity:${opacity.toFixed(3)}"></span>`
      );
    }

    const flash = Math.max(0, 1 - Math.abs(frame - (snowAtFrame + 2)) / 3) * 0.5;
    const pictureOpacity = clamp01(1 - snow * 1.15);

    // What is dying on screen. A voicemail player is the default; a live call is
    // passed in whole, chrome and self-view included, so the whole frame tears.
    const callData = data.call || {};
    // A map that is already on screen when the phone dies must die too: the
    // tear belongs to the picture the viewer was looking at, not to a stand-in.
    const inner = data.picture === 'map'
      ? mapInnerHtml(Object.assign({ statusTime: '23:58' }, data.map || {}), state)
      : data.picture === 'call'
      ? Components.callView(
          Object.assign({}, callData, { timer: callData.timer || Components.timerLabel(callData.timerSeconds) })
        )
      : `${Components.statusBar({ time: data.statusTime || '8:47' })}
         ${Components.appHeader(data.headerTitle || 'VOICEMAIL', data.headerSubtitle || 'Playing')}
         <div class="screen screen--player">
          ${Components.voiceNote(
            {
              avatarInitials: data.avatarInitials || 'ME',
              sender: data.sender || 'Me',
              subtitle: data.subtitle || '',
              highlight: data.highlight,
              durationLabel: data.durationLabel || '0:18',
              bars: data.bars || 56,
              waveHeight: data.waveHeight || 124,
              seed: data.seed || scene.id,
              progress: Number(data.progress) || 0.96,
              durationFrames: Number(data.voicemailFrames) || 540,
              lines: buildTranscriptLines(scene, state),
              transcriptLabel: data.transcriptLabel || 'TRANSCRIPT',
              window: Number((data.transcript || {}).window) || 0,
            },
            state
          )}
        </div>`;

    // Once the picture has faded out it is not painted at all: keeping the call
    // chrome in the layout would only make the frame checker measure text that
    // nobody can see.
    const picture = pictureOpacity === 0
      ? ''
      : `
      <div class="loss__picture" style="opacity:${pictureOpacity.toFixed(3)};transform:translate(${jitterX.toFixed(1)}px, ${jitterY.toFixed(1)}px)">
        ${inner}
      </div>`;

    return `
      <div class="stage stage--loss">
        <div class="backdrop"></div>
        ${picture}
        <div class="loss__tear">${bands.join('')}</div>
        <div class="loss__snow" style="opacity:${snow.toFixed(3)}">
          ${specks.join('')}
          <div class="loss__scanlines"></div>
          <div class="loss__flash" style="opacity:${flash.toFixed(3)}"></div>
        </div>
        <div class="loss__black" style="opacity:${clamp01(black).toFixed(3)}"></div>
        <div class="fiction-wrap">
          ${Components.fictionLabel({
            text: state.config.fictionLabel,
            opacity: tween(state.localFrame, 6, 14, Motion.ease.outCubic),
          })}
        </div>
        <div class="vignette"></div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // video-call: the feed is a door, the self-view is you standing in the room.
  // ---------------------------------------------------------------------------

  function renderVideoCall(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const duration = Math.max(1, state.durationFrames);

    const zoomFrom = Number(data.zoom) || 1;
    const zoomTo = data.zoomTo === undefined ? zoomFrom : Number(data.zoomTo);
    const zoom = zoomFrom + (zoomTo - zoomFrom) * clamp01(frame / duration);

    // A camera in a hand is never still. Two slow sines with different periods
    // drift without ever repeating inside a scene, and stay deterministic.
    const drift = {
      x: Math.sin(frame / 47) * 5,
      y: Math.sin(frame / 61 + 1.1) * 3.5,
    };

    const strip = data.strip || {};
    const stripOutAt = Number(strip.outAtFrame);
    const stripOpacity = Number.isFinite(stripOutAt) && stripOutAt < 9000
      ? 1 - tween(frame, stripOutAt, Math.max(1, Number(strip.outFrames) || 3), Motion.ease.outCubic)
      : 1;

    // When the strip goes out the camera's gain comes up, which is the only
    // reason anything is still visible on the door for the rest of the scene.
    const glow = Number.isFinite(stripOutAt) && stripOutAt < 9000
      ? tween(frame, stripOutAt, 14, Motion.ease.outCubic)
      : 0;

    const pip = data.pip || {};
    const pipDoor = tween(frame, Number(pip.doorAtFrame) || 99999, Math.max(1, Number(pip.doorFrames) || 30), Motion.ease.inOutCubic);

    return screen({
      statusTime: data.statusTime || '9:00',
      extraClass: 'stage--call',
      layer: Components.callView({
        caller: data.caller,
        callerSubtitle: data.callerSubtitle,
        timer: Components.timerLabel((Number(data.timerStartSeconds) || 0) + frame / 30),
        zoom,
        drift,
        strip: stripOpacity,
        glow,
        pipDoor,
      }),
      inner: fictionFooter(state, { fromFrame: 4 }),
    });
  }

  // ---------------------------------------------------------------------------
  // hallway: the same call, filmed from the other phone.
  //
  // The corridor is one flat drawing (see Components.hallView). This scene only
  // decides where the camera is, how big the person at the end of the hall is,
  // and when a hand covers the lens.
  // ---------------------------------------------------------------------------

  function renderHallway(scene, state) {
    const data = scene.data;
    const frame = state.localFrame;
    const duration = Math.max(1, state.durationFrames);
    const trip = Motion.ease.inOutCubic(clamp01(frame / duration));

    const zoomFrom = Number(data.zoom) || 1;
    const zoomTo = data.zoomTo === undefined ? zoomFrom : Number(data.zoomTo);
    const zoom = zoomFrom + (zoomTo - zoomFrom) * trip;

    // A phone held in one hand, walking. Same trick as the door feed.
    const drift = {
      x: Math.sin(frame / 53) * 4.5,
      y: Math.sin(frame / 67 + 0.7) * 3.2,
    };

    const mix = (from, to) => {
      const a = Number(from);
      const b = Number(to);
      const start = Number.isFinite(a) ? a : 0;
      const end = Number.isFinite(b) ? b : start;
      return start + (end - start) * trip;
    };

    const fig = data.figure || {};
    const figure = {
      scale: mix(fig.scale === undefined ? 1 : fig.scale, fig.scaleTo),
      y: mix(fig.y === undefined ? 0 : fig.y, fig.yTo),
      // A phone at arm's length cannot focus. Ramping the blur as the figure
      // closes is what keeps a flat silhouette from looking like a diagram.
      blur: mix(fig.blur === undefined ? 0 : fig.blur, fig.blurTo),
      opacity: clamp01(fig.opacity === undefined ? 1 : fig.opacity),
    };

    const coverData = data.cover || {};
    const coverAt = Number(coverData.atFrame);
    const cover = Number.isFinite(coverAt)
      ? tween(frame, coverAt, Math.max(1, Number(coverData.frames) || 18), Motion.ease.inCubic)
      : 0;

    const call = data.call;
    const chrome = call
      ? {
          caller: call.caller,
          callerSubtitle: call.callerSubtitle,
          timer: Components.timerLabel((Number(call.timerStartSeconds) || 0) + frame / 30),
        }
      : null;

    return screen({
      statusTime: data.statusTime || '9:02',
      extraClass: 'stage--call',
      layer: Components.hallView({
        zoom,
        drift,
        originY: data.originY,
        tilt: data.tilt,
        figure,
        cover,
        doorOpen: mix(data.doorOpen === undefined ? 0.4 : data.doorOpen, data.doorOpenTo),
        lamp: mix(data.lamp === undefined ? 0.8 : data.lamp, data.lampTo),
        phoneGlow: mix(data.phoneGlow === undefined ? 0.85 : data.phoneGlow, data.phoneGlowTo),
        chrome,
      }),
      inner: fictionFooter(state, { fromFrame: 4 }),
    });
  }

  // ---------------------------------------------------------------------------
  // recorder: the screen that is making the message, not playing it.
  // ---------------------------------------------------------------------------

  function renderRecorder(scene, state) {
    const data = scene.data;
    const seconds = (Number(data.startSeconds) || 0) + state.localFrame / 30;
    return screen({
      statusTime: data.statusTime || '9:05',
      extraClass: 'stage--rec',
      layer: Components.recorder(
        { label: data.label, to: data.to, seconds, seed: data.seed || scene.id },
        state
      ),
      inner: fictionFooter(state, { fromFrame: 6 }),
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

  // ---------------------------------------------------------------------------
  // map: a device that closes the distance on its own
  //
  // The map is honest and the world is not - nothing on this screen
  // malfunctions. The distance falls because the other device is moving, not
  // because the app is wrong.
  // ---------------------------------------------------------------------------

  /** Status bar + map, without the stage wrapper or the disclosure.
   *
   *  Split out so a scene that tears the picture (signal-loss) can tear the
   *  same map the viewer was already looking at, instead of substituting a
   *  different app behind the static.
   */
  function mapInnerHtml(data, state) {
    const frame = state.localFrame;

    if (data.empty) {
      return `
          ${Components.statusBar({ time: data.statusTime })}
          ${Components.mapView({ empty: true, emptyTitle: data.emptyTitle, emptySub: data.emptySub })}`;
    }

    const zoom = keyframes(frame, data.zoom);
    const metres = keyframes(frame, data.distance);
    const pinX = keyframes(frame, data.pinX);
    const pinY = keyframes(frame, data.pinY);
    const distance = formatDistance(metres);
    const distanceText = `${distance.value} ${distance.unit}`;

    const labelAt = Number(data.labelAtFrame);
    const flipped = Number.isFinite(labelAt) && frame >= labelAt;
    const flash = flipped && frame < labelAt + 14;

    const outAt = Number(data.selfOutAtFrame);
    const selfOpacity = Number.isFinite(outAt) ? 1 - tween(frame, outAt, 12, Motion.ease.inOutCubic) : 1;
    // The row must not report the loss before the dot has finished fading:
    // this film's whole promise is that the software is honest.
    const gone = Number.isFinite(outAt) && frame >= outAt + 12;

    const bannerEvent = data.banner || null;
    const banner = bannerEvent
      ? {
          title: bannerEvent.title,
          body: bannerEvent.body,
          progress: tween(
            frame,
            Number(bannerEvent.atFrame) || 0,
            Number(bannerEvent.durationFrames) || 10,
            Motion.ease.outCubic
          ),
        }
      : null;

    const rows = [
      {
        name: flipped ? data.labelAfter : data.labelBefore,
        meta: data.deviceModel || 'iPhone 15 Pro',
        dist: distanceText,
      },
      gone
        ? { name: data.goneName || 'No location found', meta: data.goneMeta || 'Last updated \u2014', tone: 'muted' }
        : { name: data.selfName || 'This iPhone', meta: data.selfMeta || 'You are here', dist: 'now' },
    ];

    // A sheet can also *grow*: `sheetTop` accepts a keyframe list so the card
    // rises up the screen instead of appearing at its final height.
    const sheetTop = Array.isArray(data.sheetTop) ? keyframes(frame, data.sheetTop) : Number(data.sheetTop);

    // "Where it's been" is evidence, so each line arrives when it is mentioned
    // rather than printing the whole history at once.
    const history = (Array.isArray(data.history) ? data.history : []).map((entry) => ({
      name: entry.name,
      meta: entry.meta,
      atFrame: entry.atFrame,
      fadeFrames: entry.fadeFrames,
    }));

    const historyOpacity = Array.isArray(data.historyOpacity)
      ? keyframes(frame, data.historyOpacity)
      : Number.isFinite(Number(data.historyOpacity))
        ? Number(data.historyOpacity)
        : 1;

    return `
          ${Components.statusBar({ time: data.statusTime })}
          ${Components.mapView({
            seed: data.seed,
            zoom,
            panX: Number(data.panX) || 0,
            panY: Number(data.panY) || 0,
            accuracy: 1 + (1 - clamp01(metres / 2800)) * 0.4,
            self: { x: 540, y: 720, opacity: selfOpacity },
            other: { x: pinX, y: pinY, label: flipped ? data.labelAfter : data.labelBefore, flash },
            chip: { value: distance.value, unit: distance.unit },
            banner,
            rows,
            sheetTitle: data.sheetTitle,
            sheetTop: Number.isFinite(sheetTop) ? sheetTop : undefined,
            historySheet:
              Number.isFinite(Number(data.historySheetAtFrame)) && frame >= Number(data.historySheetAtFrame),
            history,
            historyOpacity,
            frame,
          })}`;
  }

  function renderMap(scene, state) {
    return `
      <div class="stage stage--map">
        ${mapInnerHtml(scene.data || {}, state)}
        ${fictionFooter(state, { fromFrame: 8, fadeFrames: 16 })}
      </div>`;
  }

  function renderEndCard(scene, state) {
    const data = scene.data;
    // "Cut to black on the third knock": hold the frame at true backdrop for
    // the first N frames so the knocks land on nothing at all.
    const blackoutFrames = Math.max(0, Math.round(Number(data.blackoutFrames) || 0));
    if (blackoutFrames && state.localFrame < blackoutFrames) {
      // No backdrop: a cut to black has to be black, not the house gradient.
      // The disclosure still arrives — it is a promise, not a decoration.
      return `<div class="stage stage--endcard">
        ${fictionFooter(state, { fromFrame: 16, fadeFrames: 16 })}
      </div>`;
    }
    // ...and the room comes back up as the card arrives.
    const backdropOpacity = blackoutFrames
      ? tween(state.localFrame, blackoutFrames, 10, Motion.ease.outCubic)
      : 1;
    const zoom = 1 + (state.localFrame / Math.max(1, state.durationFrames)) * 0.02;
    const glow = 0.12 + 0.06 * Motion.pulse(state.localFrame, 90, 0);
    return `
      <div class="stage stage--endcard">
        <div class="backdrop" style="opacity:${backdropOpacity.toFixed(3)}"></div>
        <div class="endcard__glow" style="opacity:${glow.toFixed(3)};transform:translateX(-50%) scale(${zoom.toFixed(4)})"></div>
        ${Components.endCard(
          {
            lines: data.lines || [],
            followPrompt: data.followPrompt,
            ruleAtFrame: data.ruleAtFrame,
            arrow: data.arrow === true,
            arrowAtFrame: data.arrowAtFrame,
          },
          state
        )}
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
    'signal-loss': { render: renderSignalLoss, label: 'Phone dying - torn signal and static' },
    'video-call': { render: renderVideoCall, label: 'Answered video call - camera feed and self-view' },
    hallway: { render: renderHallway, label: 'Interior corridor feed - someone at the far end' },
    recorder: { render: renderRecorder, label: 'Voicemail being recorded - timer and level meter' },
    map: { render: renderMap, label: 'Map with device pins closing in' },
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
