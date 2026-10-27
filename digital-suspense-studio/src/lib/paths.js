'use strict';

/**
 * paths.js - single source of truth for where things live.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const STAGE_DIR = path.join(ROOT, 'src', 'stage');
const ASSETS_DIR = path.join(ROOT, 'assets');
const FONTS_DIR = path.join(ASSETS_DIR, 'fonts');
const PROJECTS_DIR = path.join(ROOT, 'projects');
const DOCS_DIR = path.join(ROOT, 'docs');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    throw new Error(
      `Invalid project slug "${slug}". Slugs are lowercase letters, numbers, and hyphens (example: voicemail-from-tomorrow).`
    );
  }
  return slug;
}

function projectDir(slug) {
  return path.join(PROJECTS_DIR, assertSlug(slug));
}

function projectPaths(slug) {
  const dir = projectDir(slug);
  return {
    dir,
    story: path.join(dir, 'story.md'),
    config: path.join(dir, 'scenes.json'),
    publishing: path.join(dir, 'publishing.md'),
    preview: path.join(dir, 'preview'),
    frames: path.join(dir, 'frames'),
    output: path.join(dir, 'output'),
    finalVideo: path.join(dir, 'output', 'final.mp4'),
    report: path.join(dir, 'render-report.json'),
  };
}

/** Ensure the standard folders from docs/01-project-and-workflow.md exist. */
function ensureProjectDirs(slug) {
  const paths = projectPaths(slug);
  [paths.dir, paths.preview, paths.frames, paths.output].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });
  return paths;
}

function listProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SLUG.test(entry.name))
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(PROJECTS_DIR, slug, 'scenes.json')))
    .sort();
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

module.exports = {
  ROOT,
  STAGE_DIR,
  ASSETS_DIR,
  FONTS_DIR,
  PROJECTS_DIR,
  DOCS_DIR,
  TEMPLATES_DIR,
  SLUG,
  assertSlug,
  projectDir,
  projectPaths,
  ensureProjectDirs,
  listProjects,
  toPosix,
};
