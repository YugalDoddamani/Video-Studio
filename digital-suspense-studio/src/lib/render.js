'use strict';

/**
 * render.js - the pipeline: validate, preview, render, encode, verify.
 *
 * A StudioSession owns the toolchain check, the local asset server, and the
 * headless browser. Commands create one, use it, and close it.
 */

const fs = require('fs');
const path = require('path');

const { detectToolchain } = require('./tooling.js');
const { loadConfigFile } = require('./config.js');
const { projectPaths, ensureProjectDirs, toPosix } = require('./paths.js');
const server = require('./server.js');
const browserLib = require('./browser.js');
const framesLib = require('./frames.js');
const encodeLib = require('./encode.js');
const { log, color } = require('./report.js');

class StudioError extends Error {}

class StudioSession {
  static async create(options) {
    const opts = options || {};
    const paths = projectPaths(opts.slug);
    if (!fs.existsSync(paths.config)) {
      throw new StudioError(
        `No scenes.json in ${toPosix(paths.dir)}. Create one with: npm run new -- --title "Your title"`
      );
    }

    const toolchain = await detectToolchain();
    if (!toolchain.chromium) {
      throw new StudioError(`No Chromium binary found.\n${toolchain.hints.chromium}`);
    }
    if (opts.requireFfmpeg && !toolchain.ffmpeg) {
      throw new StudioError(`FFmpeg is required for this command but was not found.\n${toolchain.hints.ffmpeg}`);
    }
    if (opts.requireFfmpeg && !toolchain.ffprobe) {
      throw new StudioError(`ffprobe is required to verify the output but was not found.\n${toolchain.hints.ffprobe}`);
    }

    const loaded = loadConfigFile(paths.config, { projectDir: paths.dir });
    const errors = loaded.issues.filter((issue) => issue.severity === 'error');
    if (errors.length) {
      throw new StudioError(
        `scenes.json has ${errors.length} error(s):\n` +
          loaded.issues.map((issue) => `  - ${issue.where ? `[${issue.where}] ` : ''}${issue.message}`).join('\n')
      );
    }
    const config = loaded.config;

    const session = new StudioSession({ slug: opts.slug, paths, toolchain, config, warnings: loaded.issues });

    try {
      session.server = await server.start({ projectIndex: null });
      session.browser = await browserLib.launch(toolchain.chromium);
      const stage = await browserLib.openStage(session.browser, session.server.stageUrl(opts.slug));
      session.context = stage.context;
      session.page = stage.page;
      session.consoleErrors = stage.consoleErrors;

      // The browser re-normalizes the config; disagreeing timelines mean a bug.
      const meta = await session.page.evaluate(() => window.__studio.meta());
      if (!meta || meta.totalFrames !== config.totalFrames) {
        throw new StudioError(
          `The stage computed ${meta ? meta.totalFrames : 'no'} frames but the CLI computed ${config.totalFrames}. Check scenes.json for invalid frames.`
        );
      }

      return session;
    } catch (error) {
      // Never leak a server or browser process when setup fails.
      await session.close();
      throw error;
    }
  }

  constructor({ slug, paths, toolchain, config, warnings }) {
    this.slug = slug;
    this.paths = paths;
    this.toolchain = toolchain;
    this.config = config;
    this.warnings = warnings || [];
    this.server = null;
    this.browser = null;
    this.page = null;
    this.context = null;
    this.consoleErrors = [];
  }

  /** Render frames to disk. */
  async writeFrames(frameList, outDir, options) {
    const opts = options || {};
    return framesLib.renderFrames({
      page: this.page,
      frames: frameList,
      outDir,
      onFrame: opts.onFrame,
    });
  }

  /** Render frames in memory and return layout inspection results. */
  async inspectFrames(frameList) {
    const results = [];
    for (const frame of frameList) {
      const info = await this.page.evaluate((value) => {
        window.__studio.renderFrame(value);
        return window.__studio.inspect();
      }, frame);
      results.push({ frame, issues: info.issues, boxes: info.boxes });
    }
    return results;
  }

  /** Concatenate sampled frames into one review image. */
  async contactSheet(files, outputFile, options) {
    return encodeLib.contactSheet({
      ffmpeg: this.toolchain.ffmpeg.path,
      files,
      outputFile,
      columns: (options && options.columns) || 4,
      width: (options && options.width) || 270,
      height: (options && options.height) || 480,
    });
  }

  async close() {
    try {
      if (this.browser) await this.browser.close();
    } catch (error) {
      /* ignore */
    }
    try {
      if (this.server) await this.server.close();
    } catch (error) {
      /* ignore */
    }
  }
}

/** Sum issues by severity across inspected frames. */
function summarizeIssues(results) {
  const unique = new Map();
  results.forEach((result) => {
    result.issues.forEach((issue) => {
      const key = `${issue.severity}:${issue.message}`;
      if (!unique.has(key)) unique.set(key, { ...issue, frames: [] });
      unique.get(key).frames.push(result.frame);
    });
  });
  const issues = [...unique.values()];
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warn'),
  };
}

function printIssues(summary) {
  if (!summary.issues.length) {
    log.ok('Layout checks passed: no overflow, clipping, or safe-area problems.');
    return;
  }
  const bySeverity = (severity) => summary.issues.filter((issue) => issue.severity === severity);
  bySeverity('error').forEach((issue) => log.fail(`${issue.message} (frames ${issue.frames.slice(0, 4).join(', ')})`));
  bySeverity('warn').forEach((issue) => log.warn(`${issue.message} (frames ${issue.frames.slice(0, 4).join(', ')})`));
}

/**
 * The full pipeline used by `build`:
 * validate -> preview frames + layout check -> render -> encode -> verify.
 */
async function buildProject(slug, options) {
  const opts = options || {};
  const started = Date.now();
  const session = await StudioSession.create({ slug, requireFfmpeg: true });

  try {
    const config = session.config;
    const paths = ensureProjectDirs(slug);
    const report = {
      slug,
      title: config.title,
      generatedAt: new Date().toISOString(),
      format: config.format,
      totalFrames: config.totalFrames,
      durationSeconds: Number(config.durationSeconds.toFixed(3)),
      toolchain: {
        node: session.toolchain.node.version,
        ffmpeg: { source: session.toolchain.ffmpeg.source, version: session.toolchain.ffmpeg.version },
        ffprobe: { source: session.toolchain.ffprobe.source, version: session.toolchain.ffprobe.version },
        chromium: { source: session.toolchain.chromium.source, path: toPosix(session.toolchain.chromium.path) },
      },
      audio: config.audio.mode === 'silent' ? 'silent' : 'local',
      limitations: [],
      checks: [],
    };

    if (session.warnings.length) {
      report.warnings = session.warnings.map((issue) => issue.message);
    }

    // 1. Preview frames + layout inspection.
    //    --skip-preview trades the visual review for speed: layout is still
    //    checked on the sampled frames, but no preview PNGs are written.
    const previewFrames = framesLib.sampleFrames(config, { perScene: opts.perScene || 3 });
    log.title('Preview');
    if (opts.skipPreview) {
      log.info(`Skipping preview images; still checking layout on ${previewFrames.length} sampled frames`);
    } else {
      log.info(`Rendering ${previewFrames.length} sample frames`);
    }

    const previewDir = path.join(paths.preview, 'frames');
    if (!opts.skipPreview) {
      await session.writeFrames(previewFrames, previewDir);
    }

    const inspected = await session.inspectFrames(previewFrames);
    const summary = summarizeIssues(inspected);
    printIssues(summary);
    report.preview = {
      frames: previewFrames,
      skippedImages: Boolean(opts.skipPreview),
      dir: opts.skipPreview ? null : toPosix(path.relative(paths.dir, previewDir)),
      errors: summary.errors.map((issue) => issue.message),
      warnings: summary.warnings.map((issue) => issue.message),
    };

    if (summary.errors.length && !opts.force) {
      throw new StudioError(
        `Stopping before the full render: ${summary.errors.length} layout error(s). Fix them or re-run with --force.`
      );
    }

    if (!opts.skipPreview && session.toolchain.ffmpeg) {
      const sheetFile = path.join(paths.preview, 'contact-sheet.png');
      await session.contactSheet(fs.readdirSync(previewDir).sort().map((name) => path.join(previewDir, name)), sheetFile, {
        columns: 4,
      });
      log.ok(`Contact sheet: ${toPosix(path.relative(process.cwd(), sheetFile))}`);
      report.preview.contactSheet = toPosix(path.relative(paths.dir, sheetFile));
    }

    // 2. Full render.
    log.title('Render');
    framesLib.clearFrames(paths.frames);
    const allFrames = Array.from({ length: config.totalFrames }, (_, index) => index);
    const renderStart = Date.now();
    let lastReported = 0;
    await session.writeFrames(allFrames, paths.frames, {
      onFrame: ({ index, total }) => {
        const now = Date.now();
        if (now - lastReported < 250 && index !== total) return;
        lastReported = now;
        const percent = Math.round((index / total) * 100);
        process.stdout.write(`\r  ${color.gray('›')} frame ${index}/${total} (${percent}%)   `);
      },
    });
    process.stdout.write('\n');
    const renderSeconds = (Date.now() - renderStart) / 1000;
    log.ok(`Rendered ${config.totalFrames} frames in ${renderSeconds.toFixed(1)}s`);
    report.render = { frames: config.totalFrames, seconds: Number(renderSeconds.toFixed(2)), dir: toPosix(path.relative(paths.dir, paths.frames)) };

    // 3. Encode.
    log.title('Encode');
    const audioFile = resolveAudio(config, paths.dir);
    if (audioFile) {
      log.info(`Mixing audio: ${toPosix(path.relative(paths.dir, audioFile))}`);
    } else {
      log.warn('No approved audio configured. Writing a silent video.');
      report.limitations.push('Silent video: no audio assets were configured.');
    }

    await encodeLib.encodeVideo({
      ffmpeg: session.toolchain.ffmpeg.path,
      framesDir: paths.frames,
      outputFile: paths.finalVideo,
      fps: config.format.fps,
      crf: opts.crf,
      preset: opts.preset,
      audioFile,
      width: config.format.width,
      height: config.format.height,
    });
    log.ok(`Wrote ${toPosix(path.relative(process.cwd(), paths.finalVideo))}`);

    // 4. Verify.
    log.title('Verify');
    const probeResult = await encodeLib.probe(session.toolchain.ffprobe.path, paths.finalVideo);
    const verification = encodeLib.verify(probeResult, config);
    verification.checks.forEach((check) => {
      if (check.ok) log.ok(`${check.check} — ${check.detail}`);
      else log.fail(`${check.check} — ${check.detail}`);
    });
    report.probe = {
      durationSeconds: Number(probeResult.durationSeconds.toFixed(3)),
      sizeBytes: probeResult.sizeBytes,
      video: probeResult.video,
      audio: probeResult.audio,
    };
    report.checks = verification.checks;

    if (session.consoleErrors.length) {
      report.browserConsoleErrors = session.consoleErrors.slice(0, 10);
      log.warn(`Browser reported ${session.consoleErrors.length} console error(s); see render-report.json.`);
    }

    report.elapsedSeconds = Number(((Date.now() - started) / 1000).toFixed(2));
    fs.writeFileSync(paths.report, JSON.stringify(report, null, 2) + '\n');

    if (!verification.ok) {
      throw new StudioError('The encoded file failed verification. See the checks above.');
    }

    log.title('Done');
    log.ok(`Video: ${toPosix(path.relative(process.cwd(), paths.finalVideo))}`);
    log.ok(`Report: ${toPosix(path.relative(process.cwd(), paths.report))}`);
    log.dim(
      `${(probeResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB · ${probeResult.durationSeconds.toFixed(2)}s · ${probeResult.video.width}x${probeResult.video.height} · ${probeResult.video.fps} fps`
    );
    if (report.limitations.length) {
      log.title('Limitations');
      report.limitations.forEach((limitation) => log.warn(limitation));
    }

    return report;
  } finally {
    await session.close();
  }
}

/** Resolve the first local audio track, if any. */
function resolveAudio(config, projectDir) {
  const tracks = (config.audio && config.audio.tracks) || [];
  if (config.audio.mode === 'silent' || !tracks.length) return null;
  const first = tracks[0];
  const file = first.file || first.path;
  if (!file) return null;
  const resolved = path.resolve(projectDir, file);
  return fs.existsSync(resolved) ? resolved : null;
}

module.exports = { StudioSession, StudioError, buildProject, summarizeIssues, resolveAudio };
