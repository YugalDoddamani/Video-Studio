'use strict';

/**
 * tooling.js - locate the external tools the pipeline needs.
 *
 * Resolution order for every tool is: explicit environment variable, then a
 * system binary on PATH, then an npm-packaged binary. This keeps the project
 * portable across machines where FFmpeg is or is not pre-installed.
 *
 *   FFMPEG_PATH, FFPROBE_PATH, CHROMIUM_PATH  override discovery
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch (error) {
    return false;
  }
}

function which(binary) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const names = process.platform === 'win32' ? [`${binary}.exe`, `${binary}.cmd`, binary] : [binary];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

function version(file, args) {
  try {
    const output = execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
    return output.split('\n')[0].trim();
  } catch (error) {
    return null;
  }
}

function findFfmpeg() {
  if (process.env.FFMPEG_PATH) {
    const override = process.env.FFMPEG_PATH;
    if (!isExecutable(override)) {
      throw new Error(`FFMPEG_PATH is set to "${override}" but that file is not executable.`);
    }
    return { path: override, source: 'FFMPEG_PATH', version: version(override, ['-version']) };
  }
  const system = which('ffmpeg');
  if (system) return { path: system, source: 'system PATH', version: version(system, ['-version']) };

  try {
    const packaged = require('@ffmpeg-installer/ffmpeg');
    if (packaged && packaged.path && isExecutable(packaged.path)) {
      return { path: packaged.path, source: 'npm @ffmpeg-installer/ffmpeg', version: version(packaged.path, ['-version']) };
    }
  } catch (error) {
    /* not installed */
  }
  return null;
}

function findFfprobe() {
  if (process.env.FFPROBE_PATH) {
    const override = process.env.FFPROBE_PATH;
    if (!isExecutable(override)) {
      throw new Error(`FFPROBE_PATH is set to "${override}" but that file is not executable.`);
    }
    return { path: override, source: 'FFPROBE_PATH', version: version(override, ['-version']) };
  }
  const system = which('ffprobe');
  if (system) return { path: system, source: 'system PATH', version: version(system, ['-version']) };

  try {
    const packaged = require('@ffprobe-installer/ffprobe');
    if (packaged && packaged.path && isExecutable(packaged.path)) {
      return { path: packaged.path, source: 'npm @ffprobe-installer/ffprobe', version: version(packaged.path, ['-version']) };
    }
  } catch (error) {
    /* not installed */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Minimal ustar reader. Only regular files are extracted; the bundled Chromium
// archive is a flat lib/ directory of small .so files.
// ---------------------------------------------------------------------------

function untar(buffer, destination) {
  let offset = 0;
  const written = [];
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    // An all-zero header marks the end of the archive.
    if (header.every((byte) => byte === 0)) break;

    const rawName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const sizeField = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeField, 8) || 0;
    const typeFlag = String.fromCharCode(header[156] || 48);

    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (rawName && (typeFlag === '0' || typeFlag === '\0' || typeFlag === '7')) {
      const target = path.join(destination, rawName);
      const resolved = path.resolve(target);
      if (!resolved.startsWith(path.resolve(destination))) {
        throw new Error(`Refusing to extract outside the destination: ${rawName}`);
      }
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, buffer.subarray(dataStart, dataEnd));
      written.push(resolved);
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return written;
}

/**
 * @sparticuz/chromium ships a Chromium build linked against Amazon Linux. On
 * hosts without the matching NSS libraries it needs its bundled copies. We
 * decompress them once into node_modules/.cache and prepend the directory to
 * LD_LIBRARY_PATH. Harmless on hosts that already have the libraries.
 */
function unpackBundledLibs(packageDir) {
  const cacheRoot = path.join(__dirname, '..', '..', 'node_modules', '.cache', 'digital-suspense-studio');
  const extractRoot = path.join(cacheRoot, 'chromium-libs');
  const libDir = path.join(extractRoot, 'lib');
  const expected = path.join(libDir, 'libnspr4.so');

  if (fs.existsSync(expected)) return libDir;

  const archive = path.join(packageDir, 'bin', 'al2023.tar.br');
  if (!fs.existsSync(archive)) return null;

  try {
    const tar = zlib.brotliDecompressSync(fs.readFileSync(archive));
    fs.mkdirSync(extractRoot, { recursive: true });
    // Archive entries already include the leading "lib/" directory.
    untar(tar, extractRoot);
    return fs.existsSync(expected) ? libDir : null;
  } catch (error) {
    return null;
  }
}

function playwrightBrowsersPresent() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);
  return roots.some((root) => {
    try {
      return fs.readdirSync(root).some((entry) => entry.startsWith('chromium'));
    } catch (error) {
      return false;
    }
  });
}

/**
 * Find a Chromium build.
 * Returns { path, source, args, env } or null when nothing is installed.
 */
async function findChromium() {
  const explicit = process.env.CHROMIUM_PATH;
  if (explicit) {
    if (!isExecutable(explicit)) {
      throw new Error(`CHROMIUM_PATH is set to "${explicit}" but that file is not executable.`);
    }
    return { path: explicit, source: 'CHROMIUM_PATH', args: [], env: {} };
  }

  // 1. A browser installed for Playwright.
  try {
    const { chromium } = require('playwright-core');
    const candidate = chromium.executablePath();
    if (candidate && fs.existsSync(candidate)) {
      return { path: candidate, source: 'playwright browser', args: [], env: {} };
    }
  } catch (error) {
    /* playwright-core missing or no browser */
  }

  // 2. Any installed system browser.
  const systemCandidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  for (const candidate of systemCandidates) {
    if (isExecutable(candidate)) {
      return { path: candidate, source: 'system browser', args: [], env: {} };
    }
  }
  const fromPath = which('google-chrome') || which('chromium') || which('chromium-browser') || which('chrome');
  if (fromPath) return { path: fromPath, source: 'system browser', args: [], env: {} };

  // 3. The Chromium build bundled with @sparticuz/chromium (npm-only installs).
  try {
    const moduleEntry = require.resolve('@sparticuz/chromium');
    const packageDir = path.resolve(moduleEntry, '..', '..');
    const exported = require('@sparticuz/chromium');
    const sparticuz = exported && exported.default ? exported.default : exported;
    const executable = await sparticuz.executablePath();
    if (executable && fs.existsSync(executable)) {
      const libDir = unpackBundledLibs(packageDir);
      const env = libDir
        ? { LD_LIBRARY_PATH: [libDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter) }
        : {};
      const args = Array.isArray(sparticuz.args) ? sparticuz.args.slice() : [];
      return { path: executable, source: '@sparticuz/chromium (npm)', args, env, bundledLibs: libDir };
    }
  } catch (error) {
    /* not installed or unpacking failed */
  }

  return null;
}

/** Human-readable install hints for missing tools. */
function installHints() {
  return {
    ffmpeg:
      'Install FFmpeg (macOS: brew install ffmpeg, Debian/Ubuntu: sudo apt install ffmpeg, Windows: winget install Gyan.FFmpeg) ' +
      'or run npm install to use the bundled @ffmpeg-installer/ffmpeg binary.',
    ffprobe:
      'Install ffprobe (ships with FFmpeg) or run npm install to use the bundled @ffprobe-installer/ffprobe binary.',
    chromium:
      'Run npx playwright install chromium, or install Chrome/Chromium, or run npm install to use @sparticuz/chromium, ' +
      'or point CHROMIUM_PATH at an existing browser binary.',
  };
}

/** One call that resolves everything and reports what is missing. */
async function detectToolchain() {
  const ffmpeg = findFfmpeg();
  const ffprobe = findFfprobe();
  const chromium = await findChromium();
  const node = { path: process.execPath, version: process.version };
  return {
    node,
    ffmpeg,
    ffprobe,
    chromium,
    playwrightBrowsers: playwrightBrowsersPresent(),
    ok: Boolean(ffmpeg && ffprobe && chromium),
    hints: installHints(),
  };
}

module.exports = {
  which,
  isExecutable,
  findFfmpeg,
  findFfprobe,
  findChromium,
  detectToolchain,
  installHints,
  untar,
};
