/**
 * timeline.js - frame maths for the render stage.
 *
 * A video is an ordered list of scenes. Each scene has a start frame and a
 * duration in frames. Intervals are start-inclusive and end-exclusive, so a
 * 900 frame video at 30 fps uses frames 0..899 and lasts 30 seconds.
 *
 * Pure functions only: shared by the browser stage and by Node (validation,
 * tests, CLI reporting).
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    width: 1080,
    height: 1920,
    fps: 30,
    sceneType: 'notification',
  };

  const KNOWN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function positiveInt(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    const rounded = Math.round(number);
    return rounded > 0 ? rounded : fallback;
  }

  /**
   * Fill in every optional field, compute contiguous start frames, and return
   * the canonical config the renderer and the validator both work from.
   */
  function normalizeConfig(raw) {
    const format = raw.format || {};
    const width = positiveInt(format.width, DEFAULTS.width);
    const height = positiveInt(format.height, DEFAULTS.height);
    const fps = positiveInt(format.fps, DEFAULTS.fps);

    const audio = raw.audio || { mode: 'silent', tracks: [] };
    const tracks = Array.isArray(audio.tracks) ? audio.tracks : [];

    let cursor = 0;
    const scenes = (raw.scenes || []).map((scene, index) => {
      const durationFrames = positiveInt(scene.durationFrames, 0);
      const hasExplicitStart = Number.isFinite(Number(scene.startFrame));
      const startFrame = hasExplicitStart ? Math.max(0, Math.round(Number(scene.startFrame))) : cursor;
      cursor = startFrame + durationFrames;

      const events = (scene.events || []).map((event, eventIndex) => ({
        type: event.type || 'event',
        atFrame: Number.isFinite(Number(event.atFrame)) ? Math.round(Number(event.atFrame)) : 0,
        durationFrames: positiveInt(event.durationFrames, 1),
        _index: eventIndex,
      }));

      // Optional cross-fade into this scene from the one before it.
      const rawTransition = scene.transition;
      const transition =
        rawTransition && rawTransition.type === 'fade' && positiveInt(rawTransition.durationFrames, 0) > 0
          ? { type: 'fade', durationFrames: positiveInt(rawTransition.durationFrames, 12) }
          : null;

      return {
        id: scene.id || `scene-${String(index + 1).padStart(2, '0')}`,
        type: scene.type || DEFAULTS.sceneType,
        startFrame,
        durationFrames,
        transition,
        data: scene.data || {},
        events,
      };
    });

    const totalFrames = scenes.reduce((max, scene) => Math.max(max, scene.startFrame + scene.durationFrames), 0);

    // Captions are a project-level layer, not a scene property: they are timed
    // against the global timeline so a single card can straddle a scene change
    // (the "calling from…" card runs from the player straight into the static).
    const captions = (Array.isArray(raw.captions) ? raw.captions : []).map((caption, index) => {
      const source = caption && typeof caption === 'object' ? caption : { text: String(caption || '') };
      const atFrame = Number.isFinite(Number(source.atFrame)) ? Math.max(0, Math.round(Number(source.atFrame))) : 0;
      const durationFrames = positiveInt(source.durationFrames, 0);
      return {
        text: String(source.text || ''),
        atFrame,
        durationFrames,
        endFrame: atFrame + durationFrames,
        fadeFrames: positiveInt(source.fadeFrames, 5),
        // Optional lift, in pixels, out of the default lower-third band. A
        // scene whose own interface owns that band (a chat thread, a tall map
        // sheet) raises its card instead of burying it under the UI.
        lift: Number.isFinite(Number(source.lift)) ? Math.round(Number(source.lift)) : 0,
        _index: index,
      };
    });

    return {
      title: raw.title || 'Untitled',
      slug: raw.slug || slugify(raw.title || 'untitled'),
      cut: raw.cut || '',
      captions,
      fictional: raw.fictional !== false,
      fictionLabel: raw.fictionLabel || 'FICTIONAL STORY',
      description: raw.description || '',
      format: { width, height, fps },
      audio: { mode: audio.mode || (tracks.length ? 'local' : 'silent'), tracks },
      output: raw.output || {},
      scenes,
      totalFrames,
      durationSeconds: totalFrames / fps,
    };
  }

  /** Index of the scene that owns `globalFrame`. Clamps outside the timeline. */
  function sceneIndexAt(config, globalFrame) {
    const scenes = config.scenes || [];
    if (!scenes.length) return -1;
    if (globalFrame < scenes[0].startFrame) return 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (globalFrame >= scene.startFrame && globalFrame < scene.startFrame + scene.durationFrames) {
        return i;
      }
    }
    return scenes.length - 1;
  }

  /** Frame position inside its own scene. */
  function localFrameFor(scene, globalFrame) {
    return globalFrame - scene.startFrame;
  }

  /**
   * Word-level reveal schedule.
   * Words keep their layout slot from the first frame so nothing moves while
   * the viewer is reading; only opacity changes.
   */
  function wordSchedule(text, startFrame, revealFrames) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const reveal = Math.max(1, Math.round(revealFrames || 1));
    const perWord = reveal / words.length;
    return words.map((word, index) => ({
      word,
      startFrame: startFrame + Math.round(index * perWord),
      endFrame: startFrame + Math.round(index * perWord) + Math.max(1, Math.round(perWord)),
    }));
  }

  /** Format a frame count as m:ss for on-screen timecodes. */
  function formatClock(frames, fps) {
    const total = Math.max(0, Math.round(frames));
    const seconds = Math.floor(total / fps);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  const Timeline = {
    DEFAULTS,
    normalizeConfig,
    sceneIndexAt,
    localFrameFor,
    wordSchedule,
    formatClock,
    slugify,
    isSlug: (value) => KNOWN_SLUG.test(String(value || '')),
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timeline;
  } else {
    global.Timeline = Timeline;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
