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
  // Icons that only a connected call needs: a microphone and a camera body.
  // Drawn here rather than borrowed from ICONS because they are strokes, not
  // fills, and they sit on tinted glass rather than on the page background.
  const CALL_ICONS = {
    mic:
      '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
      '<rect x="9" y="2.6" width="6" height="10.6" rx="3"/><path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0"/><path d="M12 17.6V21"/></svg>',
    camera:
      '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="2.6" y="6.4" width="12" height="11.2" rx="2.6"/><path d="M14.6 10.2 21.4 6.6v10.8l-6.8-3.6z"/></svg>',
  };


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
    const offset = (1 - progress) * 22;
    // A whisper of overshoot makes the arrival feel like a message landing
    // rather than a block fading in. Subtle: 0.965 -> ~1.001.
    const scale = 0.965 + 0.035 * Motion.ease.outBack(progress);
    const meta = props.meta ? `<span class="bubble__meta">${esc(props.meta)}</span>` : '';
    // An attachment renders a small preview of the room photo inside the
    // bubble, so the reveal later in the film lands as a callback.
    const attachment = props.attachment
      ? `<span class="bubble__thumb">
           <span class="thumb__wrap">
             <span class="thumb__window"></span>
             <span class="thumb__lamp"></span>
             <span class="thumb__couch"></span>
             <span class="thumb__figure"></span>
             <span class="thumb__glow"></span>
           </span>
           <span class="thumb__label">${esc(props.attachment.label || 'Photo')}</span>
         </span>`
      : '';
    const body = props.text ? `<span class="bubble__text">${esc(props.text)}</span>` : '';
    return `
      <div class="bubble-row ${outgoing ? 'bubble-row--out' : 'bubble-row--in'}"
           style="opacity:${progress.toFixed(3)};transform:translateY(${offset.toFixed(1)}px)">
        <div class="bubble ${outgoing ? 'bubble--out' : 'bubble--in'} ${props.attachment ? 'bubble--media' : ''}"
             style="transform:scale(${scale.toFixed(4)})">${attachment}${body}</div>
        ${meta}
      </div>`;
  }

  /** Centred time marker that separates runs of messages, like a real client. */
  function threadSeparator(props) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    return `<div class="thread__sep" style="opacity:${progress.toFixed(3)}">${esc(props.text || '')}</div>`;
  }

  /** Centred one-line event inside a thread: a missed call, a read receipt. */
  function threadSystem(props, state) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const icon = props.icon === 'call' ? ICONS.phoneDown : '';
    return `
      <div class="thread__system" style="opacity:${progress.toFixed(3)}">
        ${icon}<span>${esc(props.text || '')}</span>
      </div>`;
  }

  function messageThread(props, state) {
    const frame = frameOf(state);
    const rows = (props.messages || [])
      .filter((message) => frame >= num(message.atFrame, 0))
      .map((message) => {
        const progress = tween(frame, num(message.atFrame, 0), num(message.arriveFrames, 10));

        if (message.kind === 'separator') {
          return threadSeparator({ text: message.text, progress });
        }
        if (message.kind === 'system') {
          return threadSystem({ text: message.text, icon: message.icon, progress }, state);
        }
        return bubble({
          from: message.from,
          text: message.text,
          meta: message.meta,
          attachment: message.attachment,
          progress,
        });
      })
      .join('');

    const typing = (props.typing || []).some(
      (window) => frame >= num(window.startFrame, 0) && frame < num(window.endFrame, 0)
    )
      ? typingIndicator({ progress: 1 }, frame)
      : '';

    return `
      <div class="thread">
        <div class="thread__msgs">${rows}${typing}</div>
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

    // A windowed transcript keeps only the lines that have started. The card
    // has a fixed height and stacks from the bottom, so a new line pushes the
    // previous one up instead of resizing the player mid-sentence.
    const windowSize = num(props.window, 0);
    const started = lines.filter((line) => {
      const first = line.words && line.words[0];
      return frame >= (first ? first.startFrame : 0);
    });
    const visible = windowSize > 0 ? started.slice(-windowSize) : lines;

    const html = visible
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
      <div class="transcript${windowSize > 0 ? ' transcript--window' : ''}">
        <div class="transcript__label">${esc(props.label || 'TRANSCRIPT')}</div>
        <div class="transcript__lines">${html}</div>
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
        ${transcript({ lines: props.lines, label: props.transcriptLabel, window: props.window }, state)}
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
    // The spec ends on a comment-bait arrow. It is drawn as a vector because
    // the stage ships Inter only - there is no emoji font to fall back on, so
    // "👇" would render as a tofu box on every machine.
    const arrow = props.arrow
      ? `<div class="endcard__arrow" style="opacity:${tween(frame, num(props.arrowAtFrame, 40), 10, Motion.ease.outCubic).toFixed(3)}">
           <svg width="54" height="54" viewBox="0 0 54 54" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
             <path d="M27 10v30"/><path d="M14 28l13 13 13-13"/>
           </svg>
         </div>`
      : '';
    return `
      <div class="endcard">
        <div class="endcard__rule" style="opacity:${tween(frame, num(props.ruleAtFrame, 0), 14).toFixed(3)}"></div>
        ${html}
        ${props.followPrompt ? `<p class="endcard__follow">${esc(props.followPrompt)}</p>` : ''}
        ${arrow}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // CaptionLayer
  // ---------------------------------------------------------------------------

  /**
   * Tokens that earn the threat colour: an all-caps word, or anything carrying
   * a digit ("3", "9PM"). Every other word stays lowercase, because the spec
   * keeps quiet text quiet and spends colour only on the threat.
   */
  function isHotToken(token) {
    const bare = token.replace(/[^\p{L}\p{N}']/gu, '');
    if (!bare) return false;
    if (/\d/.test(bare)) return true;
    return /^[A-Z]{2,}$/.test(bare);
  }

  function captionText(text) {
    return String(text || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => (isHotToken(token) ? `<span class="caption__hot">${esc(token)}</span>` : esc(token)))
      .join(' ');
  }

  /**
   * The caption layer is a second narrator.
   *
   * It is timed on the GLOBAL frame, not the scene-local one, so one card can
   * survive a scene cut (the "calling from…" card runs out of the player and
   * straight into the static). Only cards that are live this frame render, and
   * two live cards cross-fade instead of popping.
   */
  function captionLayer(captions, frame) {
    const list = Array.isArray(captions) ? captions : [];
    const active = list.filter((caption) => frame >= caption.atFrame && frame < caption.endFrame);
    if (!active.length) return '';
    const cards = active
      .map((caption) => {
        const local = frame - caption.atFrame;
        const remaining = caption.endFrame - frame;
        const fade = Math.max(1, num(caption.fadeFrames, 5));
        // A card that opens the film is already on screen in frame 1: the hook
        // has to be readable in the frame a feed shows as the thumbnail.
        const entering = caption.atFrame === 0 ? 1 : clamp01(local / fade);
        const leaving = clamp01(remaining / fade);
        const opacity = Math.min(entering, leaving);
        const lift = (1 - Motion.ease.outCubic(entering)) * 16;
        return `<div class="caption" style="opacity:${opacity.toFixed(3)};transform:translateY(${lift.toFixed(1)}px)">
          <span class="caption__scrim"></span>
          <p class="caption__text">${captionText(caption.text)}</p>
        </div>`;
      })
      .join('');
    return `<div class="captions" data-live="${active.length}">${cards}</div>`;
  }

  // ---------------------------------------------------------------------------
  // PhotoCard - a photo sent into a conversation, shown full screen.
  //
  // The picture is drawn entirely in CSS: a living room seen from the corner
  // behind the couch, a figure lit only by the phone in her hands. Nothing is
  // loaded from disk, so it renders identically everywhere and offline.
  // ---------------------------------------------------------------------------

  function photoCard(props, state) {
    const progress = clamp01(props.progress === undefined ? 1 : props.progress);
    const eased = Motion.ease.outCubic(progress);
    const blur = (1 - eased) * 16;
    const scale = 1.05 - 0.05 * eased;
    // A brief flash as the photo lands, like a camera shutter catching up.
    const flash = progress < 0.3 ? (1 - progress / 0.3) * 0.22 : 0;
    const opacity = clamp01(progress * 1.6);
    const since = props.sinceLabel ? `<span class="photo__since">${esc(props.sinceLabel)}</span>` : '';

    return `
      <div class="photo">
        <div class="photo__card"
             style="opacity:${opacity.toFixed(3)};filter:blur(${blur.toFixed(2)}px);transform:scale(${scale.toFixed(4)})">
          <div class="photo__room">
            <div class="photo__wall"></div>
            <div class="photo__floor"></div>
            <div class="photo__skirting"></div>
            <div class="photo__window">
              <span class="window__pane"></span>
              <span class="window__blind window__blind--a"></span>
              <span class="window__blind window__blind--b"></span>
              <span class="window__blind window__blind--c"></span>
            </div>
            <div class="photo__lamp">
              <span class="lamp__shade"></span>
              <span class="lamp__stand"></span>
              <span class="lamp__halo"></span>
            </div>
            <div class="photo__couch">
              <span class="couch__back"></span>
              <span class="couch__seat"></span>
              <span class="couch__arm couch__arm--l"></span>
              <span class="couch__arm couch__arm--r"></span>
              <span class="couch__cushion couch__cushion--a"></span>
              <span class="couch__cushion couch__cushion--b"></span>
            </div>
            <div class="photo__figure">
              <span class="figure-side__hair"></span>
              <span class="figure-side__head"></span>
              <span class="figure-side__shoulder"></span>
              <span class="figure-side__back"></span>
              <span class="figure-side__arm"></span>
            </div>
            <div class="photo__glow"></div>
            <div class="photo__grain"></div>
            <div class="photo__vig"></div>
          </div>
          <div class="photo__flash" style="opacity:${flash.toFixed(3)}"></div>
          <div class="photo__chrome">
            <span class="photo__stamp">${esc(props.stamp || '8:41 PM')}</span>
            ${since}
          </div>
        </div>
        <div class="photo__caption" style="opacity:${clamp01((progress - 0.55) / 0.45).toFixed(3)}">
          ${esc(props.caption || '')}
        </div>
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
  // Scene extension: VideoCall
  //
  // A live camera pointed at a door, a self-view in the corner, and the chrome
  // of a call that has already been answered. Everything is CSS, so the feed
  // renders identically offline and scales with the zoom the camera does.
  // ---------------------------------------------------------------------------

  function timerLabel(seconds) {
    const total = Math.max(0, Math.floor(num(seconds, 0)));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function callView(props) {
    const p = props || {};
    const zoom = num(p.zoom, 1);
    const strip = clamp01(p.strip === undefined ? 1 : p.strip);
    const pipDoor = clamp01(p.pipDoor === undefined ? 0 : p.pipDoor);
    const drift = p.drift || {};
    // The door behind you starts shut and nearly invisible: nothing is lit in
    // that room until it opens.
    const doorWidth = 2 + pipDoor * 162;

    return `
      <div class="feed">
        <div class="feed__world" style="transform:translate(${num(drift.x, 0).toFixed(2)}px, ${num(drift.y, 0).toFixed(2)}px) scale(${zoom.toFixed(4)})">
          <div class="feed__wall"></div>
          <div class="feed__floor"></div>
          <div class="feed__door">
            <span class="feed__panel feed__panel--top"></span>
            <span class="feed__panel feed__panel--bottom"></span>
            <span class="feed__handle"></span>
            <span class="feed__strip" style="opacity:${strip.toFixed(3)}"></span>
          </div>
        </div>
        <div class="feed__scanlines"></div>
        <div class="feed__vignette"></div>
      </div>
      <div class="feed__glow" style="opacity:${clamp01(p.glow === undefined ? 0 : p.glow).toFixed(3)}"></div>
      <div class="pip">
        <div class="pip__wall"></div>
        <div class="pip__door" style="width:${doorWidth.toFixed(1)}px;opacity:${(0.12 + pipDoor * 0.8).toFixed(3)}"></div>
        <div class="pip__figure">
          <span class="figure__hair"></span>
          <span class="figure__head"></span>
          <span class="figure__neck"></span>
          <span class="figure__torso"></span>
          <span class="figure__arm figure__arm--l"></span>
          <span class="figure__arm figure__arm--r"></span>
        </div>
      </div>
      <div class="call__top">
        <span class="call__who">
          <span class="call__name">${esc(p.caller || 'Me')}</span>
          <span class="call__sub">${esc(p.callerSubtitle || 'your number')}</span>
        </span>
        <span class="call__timer">${esc(p.timer || timerLabel(p.timerSeconds))}</span>
      </div>
      <div class="call__actions call__actions--video">
        <span class="call__action call__action--mute">${CALL_ICONS.mic}</span>
        <span class="call__action call__action--end">${ICONS.phoneDown}</span>
        <span class="call__action call__action--flip">${CALL_ICONS.camera}</span>
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
    captionLayer,
    captionText,
    isHotToken,
    statusBar,
    appHeader,
    notificationCard,
    messageThread,
    bubble,
    threadSeparator,
    threadSystem,
    typingIndicator,
    incomingCall,
    waveform,
    transcript,
    voiceNote,
    systemAlert,
    fictionLabel,
    endCard,
    photoCard,
    rainyStreet,
    phoneReflection,
    callView,
    timerLabel,
    headlightIntensity,
  };

  if (isNode) {
    module.exports = Components;
  } else {
    global.Components = Components;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
