'use strict';

/**
 * browser.js - launch Chromium and open the render stage.
 */

const BASE_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--force-device-scale-factor=1',
];

function mergeArgs(extra) {
  const seen = new Set();
  const merged = [];
  [...extra.filter(Boolean), ...BASE_ARGS].forEach((arg) => {
    const key = arg.split('=')[0];
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(arg);
  });
  return merged;
}

/** Launch a browser described by detectToolchain(). */
async function launch(chromium, options) {
  const opts = options || {};
  if (!chromium) {
    throw new Error('No Chromium binary found. Run "npm run doctor" for install options.');
  }
  const { chromium: playwrightChromium } = require('playwright-core');

  const launchOptions = {
    headless: true,
    executablePath: chromium.path,
    args: mergeArgs(chromium.args || []),
    env: { ...process.env, ...(chromium.env || {}) },
    timeout: opts.timeout || 60000,
  };

  return playwrightChromium.launch(launchOptions);
}

/**
 * Open the stage for a project and wait until the config is loaded and fonts
 * are ready, so the first screenshot is not a flash of unstyled text.
 */
async function openStage(browser, stageUrl, options) {
  const opts = options || {};
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout || 60000);

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error && error.message ? error.message : error)));

  await page.goto(stageUrl, { waitUntil: 'load', timeout: opts.timeout || 60000 });
  await page.waitForFunction(() => window.__studio && window.__studio.isReady(), null, {
    timeout: opts.timeout || 60000,
  });

  const failure = await page.evaluate(() => (window.__studio.error ? window.__studio.error() : null));
  if (failure) {
    throw new Error(`The stage failed to load: ${failure}`);
  }

  return { context, page, consoleErrors };
}

module.exports = { launch, openStage, BASE_ARGS, mergeArgs };
