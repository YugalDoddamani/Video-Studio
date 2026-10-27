'use strict';

/**
 * encode.js - stitch a PNG sequence into an MP4 and verify it.
 *
 * Output defaults follow docs/06-technical-and-rendering.md:
 * H.264, yuv420p, 30 fps, 1080x1920, MP4, faststart, AAC if audio is present.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function run(command, args, options) {
  const opts = options || {};
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (opts.onStdout) opts.onStdout(chunk.toString());
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (opts.onStderr) opts.onStderr(chunk.toString());
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        const tail = stderr.trim().split('\n').slice(-12).join('\n');
        const error = new Error(`${path.basename(command)} exited with code ${code}.\n${tail}`);
        error.stderr = stderr;
        error.stdout = stdout;
        error.code = code;
        reject(error);
      }
    });
  });
}

/**
 * Encode frames into an MP4.
 * frames: { dir, first, count } - first is always 0 for our sequences.
 */
function encodeVideo(options) {
  const { ffmpeg, framesDir, outputFile, fps, crf, preset, audioFile, width, height } = options;
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-framerate',
    String(fps),
    '-start_number',
    '0',
    '-i',
    path.join(framesDir, 'frame_%06d.png'),
  ];

  if (audioFile) args.push('-i', audioFile);

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    preset || 'veryfast',
    '-crf',
    String(crf === undefined ? 18 : crf),
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.2',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-r',
    String(fps)
  );

  if (width && height) args.push('-s', `${width}x${height}`);

  if (audioFile) {
    args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  } else {
    args.push('-an');
  }

  args.push('-movflags', '+faststart', '-f', 'mp4', outputFile);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  return run(ffmpeg, args);
}

/**
 * Build a contact sheet from a list of PNG files so a whole preview can be
 * reviewed at a glance. Frames are copied into a temp dir with sequential
 * names because FFmpeg's image demuxer needs a contiguous sequence.
 */
async function contactSheet(options) {
  const os = require('os');
  const { ffmpeg, files, outputFile, columns, width, height } = options;
  if (!files.length) throw new Error('contactSheet: no frames supplied.');
  const columnsCount = Math.max(1, columns || 4);
  const rows = Math.ceil(files.length / columnsCount);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dss-sheet-'));

  try {
    files.forEach((file, index) => {
      fs.copyFileSync(file, path.join(tmp, `frame_${String(index).padStart(6, '0')}.png`));
    });
    const filter = [
      `scale=${width || 270}:${height || 480}`,
      `tile=${columnsCount}x${rows}:padding=6:margin=6:color=0x080B12`,
    ].join(',');
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    await run(ffmpeg, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-framerate',
      '1',
      '-i',
      path.join(tmp, 'frame_%06d.png'),
      '-vf',
      filter,
      '-frames:v',
      '1',
      outputFile,
    ]);
    return outputFile;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Probe a media file and return the fields the checklists care about. */async function probe(ffprobe, file) {
  const args = [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    file,
  ];
  const { stdout } = await run(ffprobe, args);
  const data = JSON.parse(stdout);
  const video = (data.streams || []).find((stream) => stream.codec_type === 'video') || null;
  const audio = (data.streams || []).find((stream) => stream.codec_type === 'audio') || null;

  const frameRate = video ? video.avg_frame_rate || video.r_frame_rate : null;
  let fps = null;
  if (frameRate && frameRate.includes('/')) {
    const [num, den] = frameRate.split('/').map(Number);
    if (den) fps = num / den;
  } else if (frameRate) {
    fps = Number(frameRate);
  }

  return {
    file,
    sizeBytes: Number(data.format && data.format.size) || (fs.existsSync(file) ? fs.statSync(file).size : 0),
    durationSeconds: Number(data.format && data.format.duration) || 0,
    formatName: (data.format && data.format.format_name) || null,
    video: video
      ? {
          codec: video.codec_name,
          width: video.width,
          height: video.height,
          pixelFormat: video.pix_fmt,
          fps,
          frameCount: Number(video.nb_frames) || null,
          profile: video.profile || null,
        }
      : null,
    audio: audio
      ? {
          codec: audio.codec_name,
          sampleRate: Number(audio.sample_rate) || null,
          channels: audio.channels || null,
        }
      : null,
    raw: data,
  };
}

/**
 * Compare a probe result with the project config.
 * Returns [{ check, ok, detail }].
 */
function verify(probeResult, config, options) {
  const opts = options || {};
  const fps = config.format.fps;
  const checks = [];
  const add = (check, ok, detail) => checks.push({ check, ok: Boolean(ok), detail });

  add('File exists', fs.existsSync(probeResult.file), probeResult.file);
  add('Container is MP4', /mp4|mov/.test(String(probeResult.formatName || '')), String(probeResult.formatName));
  add('Has a video stream', Boolean(probeResult.video), probeResult.video ? probeResult.video.codec : 'none');

  if (probeResult.video) {
    const video = probeResult.video;
    add('Resolution is 1080x1920', video.width === 1080 && video.height === 1920, `${video.width}x${video.height}`);
    add('Codec is H.264', video.codec === 'h264', String(video.codec));
    add('Pixel format is yuv420p', video.pixelFormat === 'yuv420p', String(video.pixelFormat));
    add(
      `Frame rate is ${fps} fps`,
      video.fps !== null && Math.abs(video.fps - fps) < 0.01,
      video.fps === null ? 'unknown' : `${Number(video.fps.toFixed(3))} fps`
    );
    if (video.frameCount) {
      add('Frame count matches config', video.frameCount === config.totalFrames, `${video.frameCount} vs ${config.totalFrames}`);
    }
  }

  const expected = config.totalFrames / fps;
  const tolerance = Math.max(0.2, 2 / fps);
  add(
    `Duration is about ${expected.toFixed(2)}s`,
    Math.abs(probeResult.durationSeconds - expected) <= tolerance,
    `${probeResult.durationSeconds.toFixed(2)}s`
  );

  const expectsAudio = config.audio && config.audio.mode !== 'silent' && (config.audio.tracks || []).length > 0;
  add(
    expectsAudio ? 'Audio stream present' : 'Silent video (no audio configured)',
    expectsAudio ? Boolean(probeResult.audio) : !probeResult.audio,
    probeResult.audio ? `${probeResult.audio.codec} @ ${probeResult.audio.sampleRate} Hz` : 'no audio stream'
  );

  if (probeResult.audio) {
    add('Audio codec is AAC', probeResult.audio.codec === 'aac', String(probeResult.audio.codec));
  }

  return { checks, ok: checks.every((check) => check.ok) };
}

module.exports = { run, encodeVideo, probe, verify, contactSheet };
