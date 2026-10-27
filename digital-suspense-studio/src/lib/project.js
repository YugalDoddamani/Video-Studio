'use strict';

/**
 * project.js - project folders and starter scaffolds.
 */

const fs = require('fs');
const path = require('path');
const json = require('./json.js');
const { projectPaths, ensureProjectDirs, listProjects, assertSlug, toPosix } = require('./paths.js');
const { loadConfigFile } = require('./config.js');

/** Every known project with a one-line summary. */
function index() {
  return listProjects().map((slug) => {
    const paths = projectPaths(slug);
    let title = slug;
    let totalFrames = 0;
    let durationSeconds = 0;
    let scenes = 0;
    let hasVideo = fs.existsSync(paths.finalVideo);
    try {
      const { config } = loadConfigFile(paths.config);
      if (config) {
        title = config.title;
        totalFrames = config.totalFrames;
        durationSeconds = config.durationSeconds;
        scenes = config.scenes.length;
      }
    } catch (error) {
      /* a broken project still shows up in the list */
    }
    return { slug, title, totalFrames, durationSeconds, scenes, hasVideo, dir: paths.dir };
  });
}

function slugTaken(slug) {
  return fs.existsSync(projectPaths(slug).dir);
}

function uniqueSlug(base) {
  let slug = assertSlug(base);
  if (!slugTaken(slug)) return slug;
  let counter = 2;
  while (slugTaken(`${slug}-${counter}`)) counter += 1;
  return `${slug}-${counter}`;
}

const STARTER_SCENES = (title) => ({
  title,
  slug: '',
  fictional: true,
  fictionLabel: 'FICTIONAL STORY',
  format: { width: 1080, height: 1920, fps: 30 },
  audio: { mode: 'silent', tracks: [] },
  scenes: [
    {
      id: 'scene-01',
      type: 'lock-screen',
      startFrame: 0,
      durationFrames: 120,
      data: {
        time: '8:14',
        dateLabel: 'Thursday, 12 June',
        appLabel: 'VOICEMAIL',
        title: 'New voicemail',
        body: 'From: Me',
        when: 'now',
      },
      events: [{ type: 'show-notification', atFrame: 24, durationFrames: 10 }],
    },
    {
      id: 'scene-02',
      type: 'notification',
      startFrame: 120,
      durationFrames: 120,
      data: {
        appLabel: 'NOTIFICATION',
        title: 'Write your first beat here',
        body: 'Replace this scene in scenes.json.',
        warning: true,
      },
      events: [{ type: 'show-notification', atFrame: 12, durationFrames: 10 }],
    },
    {
      id: 'scene-03',
      type: 'end-card',
      startFrame: 240,
      durationFrames: 150,
      data: {
        lines: [
          { text: 'Every story needs a hook, a twist,', atFrame: 10 },
          { text: 'and an ending.', atFrame: 30 },
        ],
        followPrompt: 'FICTIONAL STORY',
      },
      events: [],
    },
  ],
});

const STORY_TEMPLATE = (title, slug, topic) => `# Story: ${title}

## Project details

- Topic: ${topic}
- Slug: ${slug}
- Target duration: 20 seconds
- Fiction disclosure: Fictional digital suspense.
- Audio: silent (no approved audio assets yet)

## Premise

[One or two sentences describing the fictional story.]

## Characters

- [Fictional name]: [Role]

## Story structure

### Hook

[The unusual event in the first 2-3 seconds.]

### Setup

[What the viewer must understand.]

### Escalation

[What gets stranger.]

### Twist

[What changes the viewer's understanding.]

### Ending

[The final payoff.]

## Scene breakdown

### Scene 01 - lock-screen (120 frames)

- On-screen: a notification that should not exist.
- Motion: notification slides in, timestamp highlights.

### Scene 02 - notification (120 frames)

- On-screen: the consequence.
- Motion: card arrival.

### Scene 03 - end-card (150 frames)

- On-screen: the final line and the fiction label.

## Asset notes

- No external assets. Interface is drawn with HTML/CSS/SVG.
- Font: Inter (SIL Open Font License) bundled in \`assets/fonts\`.

## Review notes

- [ ] Story checklist in \`docs/07-quality-and-publishing.md\`.
`;

const PUBLISHING_TEMPLATE = (title) => `# Publishing: ${title}

## Suggested title

${title}

## Caption

[A short caption that hooks without spoiling. Keep it under 220 characters.]

## Disclosure

This is a work of fiction. All names, accounts, and events are invented.

## Hashtags

#fiction #suspense #shortstory #digitalhorror #reels

## Cover

- Frame: the notification moment.
- Cover text: keep it under 6 words.

## Audio status

Silent video. No licensed music or narration is included.

## Asset rights

- Interface graphics: original HTML/CSS/SVG.
- Font: Inter, SIL Open Font License 1.1.

## Known review issues

- [ ] Human review of pacing and readability.
`;

/**
 * Create a new project folder with a renderable starter config.
 * Returns { slug, paths, config }.
 */
function createProject(options) {
  const { title, topic, force } = options;
  const { slugify } = require('../stage/timeline.js');
  let slug = options.slug ? assertSlug(options.slug) : slugify(title);
  if (!slug) throw new Error('Could not derive a slug. Pass --slug with lowercase letters, numbers, and hyphens.');
  if (force) {
    assertSlug(slug);
  } else {
    slug = uniqueSlug(slug);
  }

  const paths = ensureProjectDirs(slug);
  const config = STARTER_SCENES(title);
  config.slug = slug;

  fs.writeFileSync(paths.config, json.stringify(config));
  if (!fs.existsSync(paths.story) || force) {
    fs.writeFileSync(paths.story, STORY_TEMPLATE(title, slug, topic || 'Original topic'));
  }
  if (!fs.existsSync(paths.publishing) || force) {
    fs.writeFileSync(paths.publishing, PUBLISHING_TEMPLATE(title));
  }

  return { slug, paths, config };
}

function readStory(slug) {
  const paths = projectPaths(slug);
  return fs.existsSync(paths.story) ? fs.readFileSync(paths.story, 'utf8') : null;
}

module.exports = { index, createProject, readStory, slugTaken, uniqueSlug, toPosix };
