/**
 * app.js - browser entry point for the render stage.
 *
 * Loads a project config, exposes a deterministic frame renderer, and can
 * report layout problems (overflow, clipping, text leaving the safe area)
 * back to the CLI so quality checks are measured rather than assumed.
 *
 * Runs inside the headless browser; nothing here is used by the CLI directly.
 */
(function () {
  'use strict';

  const state = {
    config: null,
    project: null,
    ready: false,
    error: null,
  };

  const root = document.getElementById('root');

  function query(name, fallback) {
    const value = new URLSearchParams(window.location.search).get(name);
    return value === null || value === '' ? fallback : value;
  }

  function indexEvents(scene) {
    const map = {};
    (scene.events || []).forEach((event) => {
      if (!map[event.type]) map[event.type] = event;
    });
    return map;
  }

  /** Frame state handed to every scene renderer. */
  function frameState(config, scene, globalFrame) {
    return {
      frame: globalFrame,
      localFrame: globalFrame - scene.startFrame,
      durationFrames: scene.durationFrames,
      fps: config.format.fps,
      config,
      eventsByType: indexEvents(scene),
    };
  }

  function compose(config, globalFrame) {
    const index = Timeline.sceneIndexAt(config, globalFrame);
    const scene = config.scenes[index];
    if (!scene) {
      return '<div class="stage"><div class="error">This project has no scenes.</div></div>';
    }

    // Cross-fade: during the first N frames of a scene, hold the previous
    // scene's final frame underneath and fade the new one in over it.
    const transition = scene.transition;
    if (transition && transition.type === 'fade' && index > 0) {
      const local = globalFrame - scene.startFrame;
      if (local < transition.durationFrames) {
        const previous = config.scenes[index - 1];
        const previousFrame = previous.startFrame + previous.durationFrames - 1;
        const progress = Motion.clamp01(local / transition.durationFrames);
        const outgoing = Scenes.renderScene(previous, frameState(config, previous, previousFrame));
        const incoming = Scenes.renderScene(scene, frameState(config, scene, globalFrame));
        return (
          `<div class="layer">${outgoing}</div>` +
          `<div class="layer" style="opacity:${progress.toFixed(4)}">${incoming}</div>`
        );
      }
    }

    return Scenes.renderScene(scene, frameState(config, scene, globalFrame));
  }

  /**
   * Render a frame into the DOM.
   * Returns a small summary used by screenshots and layout checks.
   */
  function renderFrame(globalFrame) {
    if (!state.config) throw new Error('Config not loaded');
    const config = state.config;
    const frame = Math.max(0, Math.min(config.totalFrames - 1, Math.round(Number(globalFrame) || 0)));
    const index = Timeline.sceneIndexAt(config, frame);
    const scene = config.scenes[index];

    root.innerHTML = compose(config, frame);
    // Force layout so measurements below are accurate.
    void root.offsetHeight;

    return {
      frame,
      sceneIndex: index,
      sceneId: scene ? scene.id : null,
      sceneType: scene ? scene.type : null,
      count: config.totalFrames,
    };
  }

  // -------------------------------------------------------------------------
  // Layout inspection
  // -------------------------------------------------------------------------

  const SAFE = { left: 90, right: 90, top: 250, bottom: 320 };
  const CHECKED = [
    '.notif',
    '.transcript',
    '.alert',
    '.bubble',
    '.endcard__line',
    '.fiction',
    '.player__name',
    '.player__meta',
    '.call__name',
    '.call__sub',
    '.thread__contact',
    '.lock__time',
    '.lock__date',
    '.lock__notif',
    '.screen__caption',
    '.street__caption',
  ];

  function rectOf(element) {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }

  function describe(element) {
    const text = (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48);
    const classes = element.className && typeof element.className === 'string' ? `.${element.className.split(' ').join('.')}` : '';
    return `${element.tagName.toLowerCase()}${classes}${text ? ` "${text}"` : ''}`;
  }

  /**
   * Bounding box of the actual glyphs inside an element, line by line.
   * Block-level boxes span the full 1080px canvas even when the text is
   * centred, so safe-area checks must measure the text, not the box.
   */
  function textRectOf(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1);
    if (!rects.length) return null;
    return {
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
      top: Math.min(...rects.map((rect) => rect.top)),
      bottom: Math.max(...rects.map((rect) => rect.bottom)),
    };
  }

  /**
   * Inspect the currently rendered frame.
   * Returns { issues, boxes } where issues have a severity of 'error' or 'warn'.
   */
  function inspect() {
    const issues = [];
    const stage = root.querySelector('.stage');
    if (!stage) {
      return { issues: [{ severity: 'error', message: 'Nothing rendered on the stage.' }], boxes: [] };
    }

    if (document.body.scrollWidth > 1080 || document.body.scrollHeight > 1920) {
      issues.push({
        severity: 'error',
        message: `Page overflows the canvas (${document.body.scrollWidth}x${document.body.scrollHeight}).`,
      });
    }

    const boxes = [];
    CHECKED.forEach((selector) => {
      root.querySelectorAll(selector).forEach((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || Number(style.opacity) === 0) return;
        const rect = rectOf(element);
        if (rect.width === 0 || rect.height === 0) return;
        const textRect = textRectOf(element);
        const area = textRect || rect;
        boxes.push({ selector, label: describe(element), ...rect, text: textRect });

        if (area.left < SAFE.left - 1 || area.right > 1080 - SAFE.right + 1) {
          issues.push({
            severity: 'warn',
            message: `${describe(element)} leaves the horizontal safe area (${Math.round(area.left)}..${Math.round(area.right)}).`,
          });
        }
        if (area.top < SAFE.top - 1) {
          issues.push({ severity: 'warn', message: `${describe(element)} starts above the safe area (top ${Math.round(area.top)}).` });
        }
        if (area.bottom > 1920 - SAFE.bottom + 1) {
          issues.push({
            severity: 'warn',
            message: `${describe(element)} dips into the bottom overlay zone (bottom ${Math.round(area.bottom)}).`,
          });
        }
        if (area.bottom > 1920 + 1 || area.top < -1) {
          issues.push({ severity: 'error', message: `${describe(element)} is outside the 1080x1920 canvas.` });
        }
        if (element.scrollHeight > element.clientHeight + 2 && style.overflow !== 'visible') {
          issues.push({ severity: 'error', message: `${describe(element)} is clipped vertically.` });
        }
        if (element.scrollWidth > element.clientWidth + 2 && style.overflow !== 'visible') {
          issues.push({ severity: 'error', message: `${describe(element)} is clipped horizontally.` });
        }

        // Text that spills past its own box is the most common readability bug.
        if (textRect && (textRect.right > rect.right + 2 || textRect.left < rect.left - 2)) {
          issues.push({ severity: 'warn', message: `${describe(element)} overflows its container horizontally.` });
        }
        // Large display type legitimately paints outside its line box (ascenders
        // and descenders), so only flag real spills, not a few pixels of glyph
        // overshoot on oversized text.
        const glyphOvershoot = parseFloat(style.fontSize) * 0.25;
        if (textRect && textRect.bottom > rect.bottom + glyphOvershoot) {
          issues.push({ severity: 'warn', message: `${describe(element)} overflows its container vertically.` });
        }
      });
    });

    return { issues, boxes };
  }

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  async function loadConfig(project) {
    const response = await fetch(`/api/config?project=${encodeURIComponent(project)}`, { cache: 'no-store' });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Could not load config for "${project}" (${response.status}): ${detail.slice(0, 200)}`);
    }
    return response.json();
  }

  async function boot() {
    const project = query('project', 'voicemail-from-tomorrow');
    state.project = project;
    try {
      const raw = await loadConfig(project);
      state.config = Timeline.normalizeConfig(raw);
      // Wait for every weight we use, otherwise the first frames shift.
      await Promise.all(
        [400, 500, 600, 700].map((weight) => document.fonts.load(`${weight} 40px Inter`))
      );
      await document.fonts.ready;
      renderFrame(0);
      state.ready = true;
    } catch (error) {
      state.error = String(error && error.message ? error.message : error);
      root.innerHTML = `<div class="stage"><div class="error">${Components.esc(state.error)}</div></div>`;
      state.ready = true;
    }
  }

  window.__studio = {
    state,
    renderFrame,
    inspect,
    get config() {
      return state.config;
    },
    isReady: () => state.ready && !state.error,
    error: () => state.error,
    meta: () =>
      state.config
        ? {
            title: state.config.title,
            slug: state.config.slug,
            totalFrames: state.config.totalFrames,
            durationSeconds: state.config.durationSeconds,
            format: state.config.format,
            scenes: state.config.scenes.map((scene) => ({
              id: scene.id,
              type: scene.type,
              startFrame: scene.startFrame,
              durationFrames: scene.durationFrames,
            })),
          }
        : null,
  };

  boot();
})();
