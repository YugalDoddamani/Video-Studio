'use strict';

/**
 * config.js - load, validate, and normalize a project's scenes.json.
 *
 * Validation is deliberately strict: a broken config should fail before a
 * 900 frame render, not during it. All problems are collected and reported
 * together.
 */

const fs = require('fs');
const yamlFreeJson = require('./json.js');
const Timeline = require('../stage/timeline.js');
const Scenes = require('../stage/scenes.js');

const KNOWN_SCENE_TYPES = Scenes.sceneTypes();

function error(message, where) {
  return { severity: 'error', message, where };
}

function warn(message, where) {
  return { severity: 'warn', message, where };
}

/**
 * Validate a raw (un-normalized) video config.
 * Returns { issues, config } where config is normalized.
 */
function validate(raw, options) {
  const opts = options || {};
  const issues = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { issues: [error('Config must be a JSON object.')], config: null };
  }

  if (!raw.title) issues.push(warn('Missing "title". Falling back to "Untitled".', 'title'));
  if (raw.fictional === false) {
    issues.push(warn('"fictional" is false. Stories must be labeled as fiction; the fiction label will still render.', 'fictional'));
  }

  if (raw.format) {
    ['width', 'height', 'fps'].forEach((key) => {
      if (raw.format[key] !== undefined) {
        const value = Number(raw.format[key]);
        if (!Number.isFinite(value) || value <= 0) {
          issues.push(error(`format.${key} must be a positive number.`, `format.${key}`));
        }
      }
    });
    if (raw.format.width && Number(raw.format.width) !== 1080) {
      issues.push(warn(`format.width is ${raw.format.width}. Instagram Reels are 1080 wide.`, 'format.width'));
    }
    if (raw.format.height && Number(raw.format.height) !== 1920) {
      issues.push(warn(`format.height is ${raw.format.height}. Instagram Reels are 1920 tall.`, 'format.height'));
    }
    if (raw.format.fps && Number(raw.format.fps) !== 30) {
      issues.push(warn(`format.fps is ${raw.format.fps}. The pipeline defaults to 30.`, 'format.fps'));
    }
  }

  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    issues.push(error('"scenes" must be a non-empty array.', 'scenes'));
    return { issues, config: null };
  }

  const seenIds = new Set();
  raw.scenes.forEach((scene, index) => {
    const where = `scenes[${index}]`;
    if (!scene || typeof scene !== 'object') {
      issues.push(error('Scene must be an object.', where));
      return;
    }
    if (scene.type && !KNOWN_SCENE_TYPES.includes(scene.type)) {
      issues.push(
        error(`Unknown scene type "${scene.type}". Known types: ${KNOWN_SCENE_TYPES.join(', ')}.`, `${where}.type`)
      );
    }
    const duration = Number(scene.durationFrames);
    if (!Number.isFinite(duration) || duration <= 0) {
      issues.push(error('durationFrames must be a positive whole number of frames.', `${where}.durationFrames`));
    } else if (!Number.isInteger(duration)) {
      issues.push(warn(`durationFrames ${duration} is not a whole number; it will be rounded.`, `${where}.durationFrames`));
    }
    if (scene.id) {
      if (seenIds.has(scene.id)) issues.push(error(`Duplicate scene id "${scene.id}".`, `${where}.id`));
      seenIds.add(scene.id);
    }
    if (Array.isArray(scene.events)) {
      scene.events.forEach((event, eventIndex) => {
        const eventWhere = `${where}.events[${eventIndex}]`;
        if (!event.type) issues.push(error('Event is missing "type".', eventWhere));
        const atFrame = Number(event.atFrame);
        if (!Number.isFinite(atFrame) || atFrame < 0) {
          issues.push(error('Event "atFrame" must be a number >= 0.', `${eventWhere}.atFrame`));
        } else if (Number.isFinite(duration) && atFrame > duration) {
          issues.push(
            warn(`Event "${event.type}" starts at frame ${atFrame}, after the scene ends at ${duration}.`, `${eventWhere}.atFrame`)
          );
        }
      });
    }
  });

  let config = null;
  if (!issues.some((issue) => issue.severity === 'error')) {
    config = Timeline.normalizeConfig(raw);
    if (config.totalFrames < 30) {
      issues.push(warn(`The whole video is only ${config.totalFrames} frames.`, 'scenes'));
    }
    if (config.durationSeconds > 90) {
      issues.push(warn(`The video is ${config.durationSeconds.toFixed(1)}s. Reels are usually under 90s.`, 'scenes'));
    }
    if (opts.projectDir) {
      (config.audio.tracks || []).forEach((track, index) => {
        const file = track.file || track.path;
        const where = `audio.tracks[${index}]`;
        if (!file) {
          issues.push(error('Audio track is missing "file".', where));
          return;
        }
        if (!fs.existsSync(require('path').resolve(opts.projectDir, file))) {
          issues.push(error(`Audio file not found: ${file}`, where));
        }
      });
    }
  }

  return { issues, config };
}

/** Read + validate a scenes.json path. Throws on unreadable JSON. */
function loadConfigFile(file, options) {
  const text = fs.readFileSync(file, 'utf8');
  let raw;
  try {
    raw = yamlFreeJson.parse(text);
  } catch (parseError) {
    return {
      issues: [error(`scenes.json is not valid JSON: ${parseError.message}`)],
      config: null,
      raw: null,
    };
  }
  const result = validate(raw, options);
  return { ...result, raw };
}

function formatIssues(issues) {
  return issues.map((issue) => `${issue.severity === 'error' ? 'ERROR' : 'WARN '} ${issue.where ? `[${issue.where}] ` : ''}${issue.message}`);
}

module.exports = { validate, loadConfigFile, formatIssues, KNOWN_SCENE_TYPES };
