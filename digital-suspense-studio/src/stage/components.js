/**
 * components.js - the reusable visual vocabulary of Digital Suspense Studio.
 *
 * Every component is a pure function: (props, frameState) -> HTML string.
 * Components never touch the DOM, the clock, or the network, so the same
 * props always produce the same markup for the same frame.
 *
 * Components (see docs/05-components-and-scenes.md):
 *   StatusBar, PhoneShell, LockScreen, NotificationCard, MessageThread,
 *   TypingIndicator, IncomingCall, VoiceNote (Waveform + Transcript),
 *   SystemAlert, FictionLabel, EndCard
 *
 * Scene extensions used by the first story:
 *   RainyStreet (environment insert), PhoneReflection (mirror reveal)
 */
(function (global) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const Motion = isNode ? require('./motion.js') : global.Motion;
  const Timeline = isNode ? require('./timeline.js') : global.Timeline;

  const tween = Motion.tween;
  const clamp01 = Motion.clamp01;
  const seededSeries = Motion.seededSeries;
  const hashString = Motion.hashString;

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  /** Escape user-authored text before it enters the DOM. */
  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Frame to animate against.
   *
   * All event and reveal timings in scenes.json (events[].atFrame,
   * transcript.revealAtFrame, messages[].atFrame, end card lines) are
   * SCENE-LOCAL. Components must therefore animate on localFrame, never on
   * the global frame, or reveals fire at the wrong moment (or all at once).
   * The fallback keeps standalone component usage ergonomic.
   */
  function frameOf(state) {
    if (!state) return 0;
    return state.localFrame !== undefined ? state.localFrame : state.frame || 0;
  }

  function highlightEscaped(escapedText, needle, progress) {
    if (!needle) return escapedText;
    const safeNeedle = esc(needle);
    const index = escapedText.indexOf(safeNeedle);
    if (index === -1) return escapedText;
    return (
      escapedText.slice(0, index) +
      `<span class="hl" style="opacity:${clamp01(progress).toFixed(3)}">${safeNeedle}</span>` +
      escapedText.slice(index + safeNeedle.length)
    );
  }

  // ---------------------------------------------------------------------------
  // StatusBar / chrome
  // ---------------------------------------------------------------------------

  const ICONS = {
    signal:
      '<svg width="28" height="28" viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">' +
      '<rect x="1" y="19" width="5" height="9" rx="1.6"/><rect x="8.5" y="14" width="5" height="14" rx="1.6"/>' +
      '<rect x="16" y="9" width="5" height="19" rx="1.6"/><rect x="23.5" y="4" width="5" height="24" rx="1.6" opacity=".3"/></svg>',
    wifi:
      '<svg width="28" height="28" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M4 11.5a16 16 0 0 1 22 0"/><path d="M8.5 16.5a10 10 0 0 1 13 0" opacity=".6"/>' +
      '<circle cx="15" cy="22.4" r="1.8" fill="currentColor" stroke="none"/></svg>',
    battery:
      '<svg width="32" height="28" viewBox="0 0 34 30" fill="none" aria-hidden="true">' +
      '<rect x="1" y="9" width="27" height="13" rx="4" stroke="currentColor" stroke-width="2" opacity=".45"/>' +
      '<rect x="4" y="12" width="13" height="7" rx="2" fill="currentColor"/>' +
      '<path d="M30.5 13.5v4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity=".45"/></svg>',
    back:
      '<svg width="42" height="42" viewBox="0 0 46 46" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M28 10 14 23l14 13"/></svg>',
    voicemail:
      '<svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M8 12v12M14 16v4M20 9v18M26 15v6M32 12v12"/></svg>',
    play:
      '<svg width="40" height="40" viewBox="0 0 44 44" fill="currentColor" aria-hidden="true">' +
      '<path d="M14 10.5 33 22 14 33.5z"/></svg>',
    phone:
      '<svg width="48" height="48" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 9l6 8-4 5a24 24 0 0 0 10 10l5-4 8 6-2 6a4 4 0 0 1-4 3C20 42 10 32 9 15a4 4 0 0 1 3-4z"/></svg>',
    phoneDown:
      '<svg width="48" height="48" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 43l6-8-4-5a24 24 0 0 1 10-10l5 4 8-6-2-6a4 4 0 0 0-4-3C20 10 10 20 9 37a4 4 0 0 0 3 4z"/></svg>',
    warning:
      '<svg width="40" height="40" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M22 7 40 37H4z"/><path d="M22 17v10"/><circle cx="22" cy="32" r="1.6" fill="currentColor" stroke="none"/></svg>',
    door:
      '<svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 32V6h16v26"/><path d="M8 32h20"/><circle cx="20" cy="19" r="1.6" fill="currentColor" stroke="none"/></svg>',
  };

  function statusBar(options) {
    const opts = options || {};
    return `
      <div class="statusbar">
        <span class="statusbar__time">${esc(opts.time || '8:14')}</span>
        <span class="statusbar__icons">${ICONS.signal}${ICONS.wifi}${ICONS.battery}</span>
      </div>`;
  }

  function appHeader(title, subtitle, variant) {
    const titleClass = variant === 'contact' ? 'apphead__title apphead__title--contact' : 'apphead__title';
    return `
      <div class="apphead">
        <span class="apphead__back">${ICONS.back}</span>
        <span class="apphead__center">
          <span class="${titleClass}">${esc(title)}</span>
          ${subtitle ? `<span class="apphead__sub">${esc(subtitle)}</span>` : ''}
        </span>
        <span class="apphead__spacer"></span>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // NotificationCard
  // ---------------------------------------------------------------------------

  function notificationCard(props, state) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const highlightProgress = clamp01(props.highlightProgress === undefined ? 1 : props.highlightProgress);
    const lift = (1 - progress) * -64;
    const body = highlightEscaped(esc(props.body || ''), props.highlight, highlightProgress);
    const icon = props.icon === 'warning' ? ICONS.warning : ICONS.voicemail;

    return `
      <div class="notif ${props.warning ? 'notif--warning' : ''}"
           style="opacity:${progress.toFixed(3)};transform:translateY(${lift.toFixed(1)}px) scale(${(0.978 + 0.022 * progress).toFixed(4)})">
        <div class="notif__head">
          <span class="notif__icon">${icon}</span>
          <span class="notif__app">${esc(props.appLabel || 'NOTIFICATION')}</span>
          <span class="notif__when">${esc(props.when || 'now')}</span>
        </div>
        <div class="notif__title">${esc(props.title || '')}</div>
        ${props.body ? `<div class="notif__body">${body}</div>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // MessageThread / TypingIndicator
  // ---------------------------------------------------------------------------

  function typingIndicator(props, frame) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const period = num(props.periodFrames, 18);
    const dots = [0, 1, 2]
      .map((index) => {
        const phase = Motion.pulse(frame - index * (period / 3), period, 0);
        const scale = 0.7 + 0.3 * phase;
        const opacity = 0.35 + 0.55 * phase;
        return `<span class="typing__dot" style="opacity:${opacity.toFixed(3)};transform:scale(${scale.toFixed(3)})"></span>`;
      })
      .join('');
    return `<div class="typing" style="opacity:${progress.toFixed(3)}">${dots}</div>`;
  }

  function bubble(props) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const outgoing = props.from === 'me' || props.from === 'outgoing';
    const offset = (1 - progress) * 24;
    const meta = props.meta ? `<span class="bubble__meta">${esc(props.meta)}</span>` : '';
    return `
      <div class="bubble-row ${outgoing ? 'bubble-row--out' : 'bubble-row--in'}"
           style="opacity:${progress.toFixed(3)};transform:translateY(${offset.toFixed(1)}px)">
        <div class="bubble ${outgoing ? 'bubble--out' : 'bubble--in'}">${esc(props.text || '')}</div>
        ${meta}
      </div>`;
  }

  function messageThread(props, state) {
    const frame = frameOf(state);
    const messages = (props.messages || [])
      .filter((message) => frame >= num(message.atFrame, 0))
      .map((message) =>
        bubble({
          from: message.from,
          text: message.text,
          meta: message.meta,
          progress: tween(frame, num(message.atFrame, 0), num(message.arriveFrames, 10)),
        })
      )
      .join('');

    const typing = (props.typing || []).some(
      (window) => frame >= num(window.startFrame, 0) && frame < num(window.endFrame, 0)
    )
      ? typingIndicator({ progress: 1 }, frame)
      : '';

    return `
      <div class="thread">
        <div class="thread__msgs">${messages}${typing}</div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // IncomingCall
  // ---------------------------------------------------------------------------

  function incomingCall(props, state) {
    const frame = frameOf(state);
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const callState = props.callState || 'incoming';
    const pulse = Motion.pulse(frame, num(props.pulsePeriodFrames, 78), 0);

    const rings = [0, 1]
      .map((index) => {
        const phase = (frame / num(props.pulsePeriodFrames, 78) + index * 0.5) % 1;
        const scale = 1 + phase * 0.62;
        const opacity = (1 - phase) * 0.28;
        return `<span class="call__ring" style="transform:translate(-50%,-50%) scale(${scale.toFixed(3)});opacity:${opacity.toFixed(3)}"></span>`;
      })
      .join('');

    return `
      <div class="call" style="opacity:${progress.toFixed(3)}">
        <div class="call__label">${esc(callState === 'incoming' ? 'INCOMING CALL' : 'CALLING')}</div>
        <div class="call__avatar-wrap" style="transform:scale(${(0.99 + pulse * 0.012).toFixed(4)})">
          ${rings}
          <div class="call__avatar">${esc(props.avatarInitials || '??')}</div>
        </div>
        <div class="call__name">${esc(props.caller || 'Unknown')}</div>
        <div class="call__sub">${esc(props.subtitle || '')}</div>
        <div class="call__actions">
          <div class="call__action call__action--decline">${ICONS.phoneDown}<span>Decline</span></div>
          <div class="call__action call__action--accept">${ICONS.phone}<span>Accept</span></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // VoiceNote / Waveform / Transcript
  // ---------------------------------------------------------------------------

  function waveform(props, frame) {
    const total = num(props.bars, 52);
    const seed = hashString(props.seed || 'waveform');
    const series = seededSeries(seed, total);
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const playedIndex = progress * total;
    const height = num(props.height, 132);

    let bars = '';
    for (let i = 0; i < total; i++) {
      const base = series[i];
      const played = i < playedIndex;
      // Gentle deterministic life while the bar is in the played region.
      const wobble = played ? 0.1 * Math.sin(frame * 0.24 + i * 0.7) : 0;
      const value = Motion.clamp(base * 0.82 + 0.14 + wobble, 0.08, 1);
      const barHeight = Math.max(6, value * height);
      bars += `<span class="wave__bar ${played ? 'wave__bar--played' : ''}" style="height:${barHeight.toFixed(1)}px"></span>`;
    }

    return `<div class="wave" style="height:${height}px">${bars}</div>`;
  }

  function transcript(props, state) {
    const frame = frameOf(state);
    const lines = props.lines || [];
    if (!lines.length) return '';
    const html = lines
      .map((line) => {
        const words = line.words
          .map((entry) => {
            const opacity = tween(frame, entry.startFrame, num(line.revealFrames, 9));
            return `<span class="word" style="opacity:${opacity.toFixed(3)}">${esc(entry.word)}</span>`;
          })
          .join(' ');
        return `<p class="transcript__line">${words}</p>`;
      })
      .join('');
    return `
      <div class="transcript">
        <div class="transcript__label">${esc(props.label || 'TRANSCRIPT')}</div>
        ${html}
      </div>`;
  }

  function voiceNote(props, state) {
    const frame = frameOf(state);
    const durationLabel = props.durationLabel || '0:13';
    const progress = clamp01(props.progress === undefined ? 0 : props.progress);

    return `
      <div class="player">
        <div class="player__head">
          <div class="avatar avatar--lg">${esc(props.avatarInitials || 'ME')}</div>
          <div class="player__name">${esc(props.sender || 'Me')}</div>
          <div class="player__meta">${highlightEscaped(esc(props.subtitle || ''), props.highlight, 1)}</div>
        </div>
        <div class="player__wave">
          ${waveform({ bars: props.bars, progress, seed: props.seed || 'voicemail', height: props.waveHeight }, frame)}
          <div class="wave__times">
            <span class="wave__elapsed">${Timeline.formatClock(progress * (props.durationFrames || 390), state.fps)}</span>
            <span class="wave__total">${esc(durationLabel)}</span>
          </div>
        </div>
        ${transcript({ lines: props.lines, label: props.transcriptLabel }, state)}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // SystemAlert
  // ---------------------------------------------------------------------------

  function systemAlert(props) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const severity = props.severity || 'warning';
    const offset = (1 - progress) * 18;
    return `
      <div class="alert alert--${esc(severity)}" style="opacity:${progress.toFixed(3)};transform:translateY(${offset.toFixed(1)}px)">
        <div class="alert__head">
          <span class="alert__icon">${ICONS.warning}</span>
          <span class="alert__heading">${esc(props.heading || '')}</span>
        </div>
        <div class="alert__body">${esc(props.body || '')}</div>
        ${props.footnote ? `<div class="alert__foot">${esc(props.footnote)}</div>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // FictionLabel / EndCard
  // ---------------------------------------------------------------------------

  function fictionLabel(props) {
    const opacity = clamp01(props.opacity === undefined ? 1 : props.opacity);
    const text = props.text || 'FICTIONAL STORY';
    return `<div class="fiction" style="opacity:${opacity.toFixed(3)}"><span class="fiction__dot"></span>${esc(text)}</div>`;
  }

  function endCard(props, state) {
    const frame = frameOf(state);
    const lines = props.lines || [];
    const html = lines
      .map((line) => {
        const progress = tween(frame, num(line.atFrame, 0), num(line.revealFrames, 16), Motion.ease.outCubic);
        const accent = line.accent ? ' endcard__line--accent' : '';
        return `<p class="endcard__line${accent}" style="opacity:${progress.toFixed(3)};transform:translateY(${((1 - progress) * 20).toFixed(1)}px)">${esc(line.text)}</p>`;
      })
      .join('');
    return `
      <div class="endcard">
        <div class="endcard__rule" style="opacity:${tween(frame, 0, 14).toFixed(3)}"></div>
        ${html}
        ${props.followPrompt ? `<p class="endcard__follow">${esc(props.followPrompt)}</p>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Scene extension: RainyStreet
  // ---------------------------------------------------------------------------

  /** Deterministic headlight ignition: stuttering on, then steady. */
  function headlightIntensity(frame, event) {
    if (!event) return 0.9;
    const start = num(event.atFrame, 0);
    const duration = num(event.durationFrames, 18);
    if (frame < start) return 0;
    const elapsed = frame - start;
    if (elapsed < duration) {
      const pattern = [1, 0.12, 0.95, 0.05, 0.8, 0.3, 1];
      const step = Math.min(pattern.length - 1, Math.floor((elapsed / duration) * pattern.length));
      return pattern[step] * clamp01(elapsed / 4);
    }
    return 1 - 0.06 * Motion.pulse(frame, 96, 0);
  }

  function rainyStreet(props, state) {
    // Event atFrame values are scene-local, so animate on localFrame.
    const frame = state.localFrame;
    const random = Motion.mulberry32(hashString(props.seed || 'rainy-street'));

    // Glass droplets: fixed, seeded.
    const droplets = [];
    for (let i = 0; i < 96; i++) {
      const x = random() * 1080;
      const y = random() * 1920;
      const radius = 1.2 + random() * 4.4;
      const opacity = 0.05 + random() * 0.15;
      droplets.push(
        `<span class="drop" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${(radius * 2).toFixed(1)}px;height:${(radius * 2.4).toFixed(1)}px;opacity:${opacity.toFixed(3)}"></span>`
      );
    }

    // Rain streaks: seeded columns, position derived only from frame.
    const streaks = [];
    const streakCount = 62;
    for (let i = 0; i < streakCount; i++) {
      const x = random() * 1180 - 50;
      const speed = 14 + random() * 20;
      const length = 60 + random() * 170;
      const offset = random() * 2200;
      const y = ((offset + frame * speed) % 2200) - 180;
      const opacity = 0.06 + random() * 0.18;
      const width = 1 + random() * 1.4;
      streaks.push(
        `<span class="streak" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;height:${length.toFixed(1)}px;width:${width.toFixed(1)}px;opacity:${opacity.toFixed(3)}"></span>`
      );
    }

    // Street lamp poles for scale and depth.
    const poles = [0.16, 0.84]
      .map(
        (fraction) => `
        <div class="street__pole" style="left:${(fraction * 1080).toFixed(0)}px">
          <span class="street__lamp"></span>
        </div>`
      )
      .join('');

    const lights = headlightIntensity(frame, props.headlights);
    const glow = clamp01(lights).toFixed(3);

    return `
      <div class="stage street">
        <div class="street__sky"></div>
        <div class="street__halo"></div>
        ${poles}
        <div class="street__houses"></div>
        <div class="street__road"></div>
        <div class="street__puddles"></div>
        <div class="street__reflection" style="opacity:${(0.1 + lights * 0.32).toFixed(3)}"></div>
        <div class="car" style="transform:translateX(-50%) scale(${(1 + clamp01(lights) * 0.004).toFixed(4)})">
          <div class="car__shadow"></div>
          <div class="car__beam" style="opacity:${(lights * 0.55).toFixed(3)}"></div>
          <div class="car__body">
            <div class="car__cabin"></div>
            <div class="car__glass"></div>
            <div class="car__hood"></div>
            <div class="car__grille"></div>
            <div class="car__plate"></div>
          </div>
          <div class="car__lamp car__lamp--l" style="opacity:${glow}"></div>
          <div class="car__lamp car__lamp--r" style="opacity:${glow}"></div>
          <div class="car__wheel car__wheel--l"></div>
          <div class="car__wheel car__wheel--r"></div>
        </div>
        <div class="street__glass">${droplets.join('')}${streaks.join('')}</div>
        <div class="street__runoff"></div>
        <div class="vignette"></div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Scene extension: PhoneReflection
  // ---------------------------------------------------------------------------

  function phoneReflection(props, state) {
    // Event atFrame values are scene-local, so animate on localFrame.
    const frame = state.localFrame;
    const duration = state.durationFrames;
    const events = props.eventsByType || {};

    const glitchEvent = events.glitch;
    const glitch = glitchEvent
      ? 1 -
        clamp01(
          Math.abs(frame - (num(glitchEvent.atFrame, 0) + num(glitchEvent.durationFrames, 8) / 2)) /
            Math.max(1, num(glitchEvent.durationFrames, 8) / 2)
        )
      : 0;

    const doorEvent = events['door-open'] || { atFrame: 40, durationFrames: 130 };
    const doorProgress = tween(frame, num(doorEvent.atFrame, 40), num(doorEvent.durationFrames, 130), Motion.ease.inOutCubic);

    const silhouetteEvent = events.silhouette || { atFrame: 80, durationFrames: 100 };
    const silhouetteProgress = tween(
      frame,
      num(silhouetteEvent.atFrame, 80),
      num(silhouetteEvent.durationFrames, 100),
      Motion.ease.outCubic
    );

    const zoom = 1 + (frame / Math.max(1, duration)) * 0.035;

    // The leaf foreshortens as it swings away from the viewer: width shrinks
    // and a slight skew sells the perspective. 2D transforms only, so the
    // glass keeps clipping its contents.
    const leafScale = 1 - doorProgress * 0.62;
    const leafSkew = -doorProgress * 1.6;
    const gapWidth = 12 + doorProgress * 236;
    const figureScale = 0.94 + silhouetteProgress * 0.1;
    const figureY = (1 - silhouetteProgress) * 26;

    return `
      <div class="stage reflect">
        <div class="reflect__ambient"></div>
        <div class="mirror" style="transform:translateX(-50%) scale(${zoom.toFixed(4)})">
          <div class="mirror__glass">
            <div class="mirror__room">
              <div class="mirror__wall"></div>
              <div class="mirror__floor"></div>
              <div class="mirror__skirting"></div>
              <div class="mirror__picture"></div>
              <div class="mirror__doorway">
                <div class="mirror__gap" style="width:${gapWidth.toFixed(1)}px;opacity:${(0.55 + doorProgress * 0.45).toFixed(3)}"></div>
                <div class="mirror__figure" style="opacity:${(silhouetteProgress * 0.98).toFixed(3)};transform:translateX(-50%) translateY(${figureY.toFixed(1)}px) scale(${figureScale.toFixed(3)})">
                  <span class="figure__hair"></span>
                  <span class="figure__head"></span>
                  <span class="figure__neck"></span>
                  <span class="figure__torso"></span>
                  <span class="figure__arm figure__arm--l"></span>
                  <span class="figure__arm figure__arm--r"></span>
                </div>
                <div class="mirror__leaf" style="transform:scaleX(${leafScale.toFixed(4)}) skewY(${leafSkew.toFixed(2)}deg)">
                  <span class="leaf__panel leaf__panel--a"></span>
                  <span class="leaf__panel leaf__panel--b"></span>
                  <span class="leaf__handle"></span>
                </div>
                <div class="mirror__jamb"></div>
              </div>
              <div class="mirror__haze"></div>
              <div class="mirror__smudge mirror__smudge--a"></div>
              <div class="mirror__smudge mirror__smudge--b"></div>
              <div class="mirror__sheen"></div>
              <div class="mirror__glitch" style="opacity:${(glitch * 0.92).toFixed(3)}">
                <span class="glitch__band glitch__band--a" style="transform:translateX(${(glitch * -16).toFixed(1)}px)"></span>
                <span class="glitch__band glitch__band--b" style="transform:translateX(${(glitch * 12).toFixed(1)}px)"></span>
                <span class="glitch__band glitch__band--c" style="transform:translateX(${(glitch * -8).toFixed(1)}px)"></span>
              </div>
            </div>
          </div>
          <div class="mirror__edge"></div>
          <div class="mirror__bezel-light"></div>
        </div>
        <div class="vignette"></div>
      </div>`;
  }

  const Components = {
    esc,
    ICONS,
    statusBar,
    appHeader,
    notificationCard,
    messageThread,
    bubble,
    typingIndicator,
    incomingCall,
    waveform,
    transcript,
    voiceNote,
    systemAlert,
    fictionLabel,
    endCard,
    rainyStreet,
    phoneReflection,
    headlightIntensity,
  };

  if (isNode) {
    module.exports = Components;
  } else {
    global.Components = Components;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
