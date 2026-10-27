#!/usr/bin/env node
'use strict';

/**
 * cli.js - command line entry point.
 *
 *   npm run doctor                 check the toolchain
 *   npm run list                   list projects
 *   npm run new -- --title "..."   scaffold a project
 *   npm run preview -- <slug>      sampled frames + layout report
 *   npm run check -- <slug>        layout/safe-area checks only
 *   npm run render -- <slug>       full render + encode + verify
 *   npm run build -- <slug>        preview + render + encode + verify
 *   npm run verify -- <slug>       re-probe an existing final.mp4
 *   npm run determinism -- <slug>  prove frames are reproducible
 *   npm run gallery                render one frame of every scene type
 *   npm run clean -- <slug>        remove rendered frames
 */

const fs = require('fs');
const path = require('path');

const { log, table, color } = require('./lib/report.js');
const { detectToolchain } = require('./lib/tooling.js');
const { listProjects, projectPaths, PROJECTS_DIR, toPosix, ensureProjectDirs } = require('./lib/paths.js');
const { loadConfigFile, formatIssues } = require('./lib/config.js');
const projectLib = require('./lib/project.js');
const framesLib = require('./lib/frames.js');
const encodeLib = require('./lib/encode.js');
const serverLib = require('./lib/server.js');
const browserLib = require('./lib/browser.js');
const { StudioSession, StudioError, buildProject, summarizeIssues } = require('./lib/render.js');
const { galleryConfig } = require('./lib/gallery.js');
const pkg = require('../package.json');

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [key, inline] = token.slice(2).split('=');
      if (inline !== undefined) {
        args[key] = inline;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function requireSlug(args, hint) {
  const slug = args._[0] || args.project;
  if (!slug || slug === true) {
    const available = listProjects();
    const suffix = available.length ? `\nAvailable projects: ${available.join(', ')}` : '';
    throw new StudioError(`${hint || 'This command needs a project slug.'}${suffix}`);
  }
  return String(slug);
}

function ms(value) {
  return `${(value / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

async function commandDoctor() {
  const toolchain = await detectToolchain();
  log.title('Digital Suspense Studio — environment check');

  const rows = [];
  rows.push(['Node.js', toolchain.node.version, 'ok', toolchain.node.path]);
  rows.push([
    'FFmpeg',
    toolchain.ffmpeg ? toolchain.ffmpeg.source : 'missing',
    toolchain.ffmpeg ? 'ok' : 'FAIL',
    toolchain.ffmpeg ? toolchain.ffmpeg.version : toolchain.hints.ffmpeg,
  ]);
  rows.push([
    'ffprobe',
    toolchain.ffprobe ? toolchain.ffprobe.source : 'missing',
    toolchain.ffprobe ? 'ok' : 'FAIL',
    toolchain.ffprobe ? toolchain.ffprobe.version : toolchain.hints.ffprobe,
  ]);
  rows.push([
    'Chromium',
    toolchain.chromium ? toolchain.chromium.source : 'missing',
    toolchain.chromium ? 'ok' : 'FAIL',
    toolchain.chromium ? toolchain.chromium.path : toolchain.hints.chromium,
  ]);

  table(rows, ['Tool', 'Resolved from', '', 'Detail']);

  if (toolchain.chromium && toolchain.chromium.bundledLibs) {
    log.dim(`Using bundled NSS libraries from ${toolchain.chromium.bundledLibs}`);
  }

  const projects = listProjects();
  log.title('Projects');
  if (!projects.length) {
    log.warn(`No projects yet. Create one with: npm run new -- --title "My story"`);
  } else {
    table(projectLib.index().map((item) => [item.slug, item.title, `${item.durationSeconds.toFixed(1)}s`, item.hasVideo ? 'rendered' : '—']), [
      'Slug',
      'Title',
      'Length',
      'Video',
    ]);
  }

  // Disk space: a 900 frame PNG sequence is roughly 0.5-1.5 GB.
  try {
    const stats = fs.statfsSync(PROJECTS_DIR);
    const freeGb = (stats.bavail * stats.bsize) / 1024 ** 3;
    log.title('Storage');
    log.info(`${freeGb.toFixed(1)} GB free for rendered frames`);
    if (freeGb < 2) log.warn('Less than 2 GB free. A full HD frame render may fail.');
  } catch (error) {
    /* statfs is not available everywhere */
  }

  log.title('Result');
  const missing = ['ffmpeg', 'ffprobe', 'chromium'].filter((key) => !toolchain[key]);
  if (missing.length) {
    missing.forEach((key) => log.fail(`${key} is not available. ${toolchain.hints[key]}`));
    return 1;
  }
  log.ok('All required tools are available. You can render.');
  return 0;
}

async function commandList() {
  const items = projectLib.index();
  log.title('Projects');
  if (!items.length) {
    log.warn('No projects yet. Create one with: npm run new -- --title "My story"');
    return 0;
  }
  table(
    items.map((item) => [
      item.slug,
      item.title,
      `${item.scenes} scenes`,
      `${item.durationSeconds.toFixed(1)}s`,
      item.hasVideo ? 'rendered' : '—',
    ]),
    ['Slug', 'Title', 'Scenes', 'Length', 'Video']
  );
  return 0;
}

async function commandNew(args) {
  const title = args.title || args._[0];
  if (!title || title === true) {
    throw new StudioError('Provide a title: npm run new -- --title "The voicemail from tomorrow"');
  }
  const result = projectLib.createProject({
    title: String(title),
    slug: args.slug ? String(args.slug) : undefined,
    topic: args.topic ? String(args.topic) : undefined,
    force: Boolean(args.force),
  });

  log.title('Project created');
  log.ok(`Slug: ${result.slug}`);
  log.ok(`Folder: ${toPosix(path.relative(process.cwd(), result.paths.dir))}`);
  log.plain(`scenes.json   starter config (3 scenes, renderable now)`);
  log.plain(`story.md      story template`);
  log.plain(`publishing.md caption + disclosure template`);
  log.title('Next');
  log.dim(`npm run preview -- ${result.slug}`);
  log.dim(`npm run build -- ${result.slug}`);
  return 0;
}

async function commandPreview(args) {
  const slug = requireSlug(args);
  const paths = ensureProjectDirs(slug);
  const session = await StudioSession.create({ slug });
  try {
    const config = session.config;
    log.title(`Preview — ${config.title}`);
    log.dim(`${config.scenes.length} scenes · ${config.totalFrames} frames · ${config.durationSeconds.toFixed(2)}s · ${config.format.width}x${config.format.height} @ ${config.format.fps}fps`);

    if (session.warnings.length) {
      session.warnings.forEach((issue) => log.warn(`${issue.where ? `[${issue.where}] ` : ''}${issue.message}`));
    }

    const explicit = framesLib.parseFrameList(args.frames ? String(args.frames) : null, config.totalFrames);
    const frameList = explicit && explicit.length ? explicit : framesLib.sampleFrames(config, { perScene: Number(args.perScene) || 3 });
    log.info(`Sampling ${frameList.length} frames: ${frameList.join(', ')}`);

    const outDir = path.join(paths.preview, 'frames');
    fs.rmSync(outDir, { recursive: true, force: true });
    await session.writeFrames(frameList, outDir);
    const inspected = await session.inspectFrames(frameList);
    const summary = summarizeIssues(inspected);

    log.title('Layout checks');
    if (!summary.issues.length) {
      log.ok('No overflow, clipping, or safe-area problems in the sampled frames.');
    } else {
      summary.errors.forEach((issue) => log.fail(`${issue.message} (frames ${issue.frames.slice(0, 4).join(', ')})`));
      summary.warnings.forEach((issue) => log.warn(`${issue.message} (frames ${issue.frames.slice(0, 4).join(', ')})`));
    }

    if (session.toolchain.ffmpeg) {
      const sheet = path.join(paths.preview, 'contact-sheet.png');
      await session.contactSheet(
        fs.readdirSync(outDir).sort().map((name) => path.join(outDir, name)),
        sheet
      );
      log.info(`Contact sheet: ${toPosix(path.relative(process.cwd(), sheet))}`);
    }

    log.title('Output');
    log.ok(`${frameList.length} preview frames in ${toPosix(path.relative(process.cwd(), outDir))}`);
    log.dim('Open the contact sheet to review pacing, contrast, and clipping.');

    return summary.errors.length ? 1 : 0;
  } finally {
    await session.close();
  }
}

async function commandCheck(args) {
  const slug = requireSlug(args);
  const session = await StudioSession.create({ slug });
  try {
    const config = session.config;
    log.title(`Layout check — ${config.title}`);
    const frameList = framesLib.sampleFrames(config, { perScene: Number(args.perScene) || 4 });
    log.info(`Inspecting ${frameList.length} frames across ${config.scenes.length} scenes`);
    const inspected = await session.inspectFrames(frameList);
    const summary = summarizeIssues(inspected);

    if (!summary.issues.length) {
      log.ok('Every sampled frame is inside the safe area with no clipping.');
      return 0;
    }
    summary.errors.forEach((issue) => log.fail(`${issue.message} (frames ${issue.frames.slice(0, 6).join(', ')})`));
    summary.warnings.forEach((issue) => log.warn(`${issue.message} (frames ${issue.frames.slice(0, 6).join(', ')})`));
    log.title('Summary');
    log.plain(`${summary.errors.length} errors, ${summary.warnings.length} warnings`);
    return summary.errors.length ? 1 : 0;
  } finally {
    await session.close();
  }
}

async function commandRender(args) {
  const slug = requireSlug(args);
  const report = await buildProject(slug, {
    crf: args.crf ? Number(args.crf) : undefined,
    preset: args.preset ? String(args.preset) : undefined,
    perScene: Number(args.perScene) || 3,
    skipPreview: Boolean(args['skip-preview']),
    force: Boolean(args.force),
  });
  return report ? 0 : 1;
}

async function commandVerify(args) {
  const slug = requireSlug(args);
  const paths = projectPaths(slug);
  const toolchain = await detectToolchain();
  if (!toolchain.ffprobe) throw new StudioError(`ffprobe not found.\n${toolchain.hints.ffprobe}`);
  if (!fs.existsSync(paths.finalVideo)) {
    throw new StudioError(`No rendered video at ${toPosix(path.relative(process.cwd(), paths.finalVideo))}. Run: npm run render -- ${slug}`);
  }
  const loaded = loadConfigFile(paths.config);
  if (!loaded.config) throw new StudioError(`Cannot verify: ${formatIssues(loaded.issues).join('; ')}`);

  log.title(`Verify — ${loaded.config.title}`);
  const probeResult = await encodeLib.probe(toolchain.ffprobe.path, paths.finalVideo);
  const verification = encodeLib.verify(probeResult, loaded.config);
  verification.checks.forEach((check) => {
    if (check.ok) log.ok(`${check.check} — ${check.detail}`);
    else log.fail(`${check.check} — ${check.detail}`);
  });
  log.title('Summary');
  log.plain(
    `${(probeResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB · ${probeResult.durationSeconds.toFixed(2)}s · ` +
      `${probeResult.video ? `${probeResult.video.width}x${probeResult.video.height}` : 'no video'} · ` +
      `${probeResult.audio ? 'audio present' : 'silent'}`
  );
  if (verification.ok) log.ok('All technical checks passed.');
  return verification.ok ? 0 : 1;
}

async function commandDeterminism(args) {
  const slug = requireSlug(args);
  log.title('Determinism check');
  const first = await StudioSession.create({ slug });
  const config = first.config;
  const frameList = framesLib.parseFrameList(args.frames ? String(args.frames) : null, config.totalFrames) ||
    framesLib.sampleFrames(config, { perScene: 2 });
  const sample = frameList.slice(0, Number(args.count) || 8);

  let hashes;
  try {
    log.info(`Capturing ${sample.length} frames`);
    hashes = [];
    for (const frame of sample) {
      const buffer = await framesLib.capture(first.page, frame);
      hashes.push({ frame, hash: framesLib.sha256(buffer) });
    }
  } finally {
    await first.close();
  }

  const second = await StudioSession.create({ slug });
  let secondHashes;
  try {
    log.info('Re-rendering the same frames in a fresh browser');
    secondHashes = [];
    for (const frame of sample) {
      const buffer = await framesLib.capture(second.page, frame);
      secondHashes.push({ frame, hash: framesLib.sha256(buffer) });
    }
  } finally {
    await second.close();
  }

  let mismatches = 0;
  table(
    sample.map((frame, index) => {
      const a = hashes[index].hash.slice(0, 12);
      const b = secondHashes[index].hash.slice(0, 12);
      const same = a === b;
      if (!same) mismatches += 1;
      return [frame, a, b, same ? 'identical' : 'DIFFERENT'];
    }),
    ['Frame', 'Run 1', 'Run 2', '']
  );

  log.title('Result');
  if (mismatches === 0) {
    log.ok('Identical output across two browser sessions. Rendering is deterministic.');
    return 0;
  }
  log.fail(`${mismatches} frame(s) differ. Something is using time or unseeded randomness.`);
  return 1;
}

async function commandGallery(args) {
  const toolchain = await detectToolchain();
  if (!toolchain.chromium) throw new StudioError(`No Chromium binary found.\n${toolchain.hints.chromium}`);

  const slug = 'component-gallery';
  const config = galleryConfig();
  log.title('Component gallery');

  const server = await serverLib.start({ overrides: { [slug]: config } });
  const browser = await browserLib.launch(toolchain.chromium);
  try {
    const stage = await browserLib.openStage(browser, server.stageUrl(slug));
    const outDir = path.join(PROJECTS_DIR, '..', 'preview', 'gallery');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const files = [];
    for (let index = 0; index < config.scenes.length; index += 1) {
      const frame = config.scenes[index].startFrame + Math.round(config.scenes[index].durationFrames / 2);
      const buffer = await framesLib.capture(stage.page, frame);
      const file = path.join(outDir, `${String(index + 1).padStart(2, '0')}-${config.scenes[index].type}.png`);
      fs.writeFileSync(file, buffer);
      files.push(file);
      log.ok(`${config.scenes[index].type} — frame ${frame}`);
    }

    if (toolchain.ffmpeg) {
      const sheet = path.join(outDir, 'gallery.png');
      await encodeLib.contactSheet({ ffmpeg: toolchain.ffmpeg.path, files, outputFile: sheet, columns: 4 });
      log.info(`Contact sheet: ${toPosix(path.relative(process.cwd(), sheet))}`);
    }

    log.title('Output');
    log.ok(`Gallery frames in ${toPosix(path.relative(process.cwd(), outDir))}`);
    return 0;
  } finally {
    await browser.close().catch(() => {});
    await server.close();
  }
}

async function commandClean(args) {
  const slug = requireSlug(args);
  const paths = projectPaths(slug);
  const targets = [];
  if (args.all || args.frames) targets.push(paths.frames);
  if (args.all || args.preview) targets.push(paths.preview);
  if (!targets.length) {
    throw new StudioError('Choose what to clean: --frames, --preview, or --all. Nothing is deleted without this flag.');
  }
  if (!args.yes && !args.y) {
    log.warn('Dry run. Add --yes to actually delete:');
    targets.forEach((dir) => log.plain(dir));
    return 0;
  }
  targets.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log.ok(`Removed ${toPosix(path.relative(process.cwd(), dir))}`);
    }
  });
  return 0;
}

function printHelp() {
  const bold = color.bold;
  process.stdout.write(`
${bold('Digital Suspense Studio')} ${pkg.version}
Fictional phone-interface stories for vertical Instagram Reels.

${bold('Usage')}
  node src/cli.js <command> [project-slug] [options]

${bold('Commands')}
  doctor                     Check Node, FFmpeg, ffprobe, and Chromium
  list                       List projects in projects/
  new --title "..."          Scaffold a renderable project
  preview <slug>             Sample frames + contact sheet + layout report
  check <slug>               Layout and safe-area checks only
  render <slug>              Full render, encode, and verify
  verify <slug>              Re-check an existing output/final.mp4
  determinism <slug>         Prove two renders are pixel-identical
  gallery                    Render one frame of every scene type
  clean <slug> --frames      Remove rendered frames (needs --yes)

${bold('Options')}
  --frames 0,45,120          Explicit frames for preview/determinism
  --frames 0-300:30          Frame range with step
  --per-scene 3              Sample depth per scene (default 3)
  --crf 18                   H.264 quality (lower is better)
  --preset veryfast          x264 preset
  --force                    Continue past layout errors
  --skip-preview             Skip preview images (layout is still checked)
  --yes                      Confirm destructive clean

${bold('Pipeline')}
  npm install && npm run doctor
  npm run preview -- my-story
  npm run build   -- my-story
`);
}

// ---------------------------------------------------------------------------
// entry
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'help';
  const args = parseArgs(argv.slice(command === 'help' ? 0 : 1));

  if (args.version || command === 'version') {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  switch (command) {
    case 'doctor':
      return commandDoctor();
    case 'list':
    case 'ls':
      return commandList();
    case 'new':
    case 'create':
      return commandNew(args);
    case 'preview':
      return commandPreview(args);
    case 'check':
      return commandCheck(args);
    case 'render':
    case 'build':
      return commandRender(args);
    case 'verify':
      return commandVerify(args);
    case 'determinism':
      return commandDeterminism(args);
    case 'gallery':
      return commandGallery(args);
    case 'clean':
      return commandClean(args);
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return 0;
    default:
      log.fail(`Unknown command "${command}".`);
      printHelp();
      return 1;
  }
}

main()
  .then((code) => {
    process.exitCode = code === undefined ? 0 : code;
  })
  .catch((error) => {
    log.blank();
    if (error instanceof StudioError) {
      log.fail(error.message);
    } else {
      log.fail(error && error.stack ? error.stack : String(error));
    }
    process.exitCode = 1;
  });
