# Technical and Rendering Specification

## Output

- Resolution: 1080 × 1920.
- Aspect ratio: 9:16.
- Frame rate: 30 frames per second.
- Container: MP4.
- Video codec: H.264.
- Pixel format: yuv420p.
- Audio codec: AAC when audio is present.
- Add fast-start metadata when supported.

These settings are project defaults. Confirm current Instagram requirements
before publishing.

## Implemented stack

- Node.js (18+), no build step.
- `playwright-core` driving a Chromium build.
- HTML/CSS/SVG for visuals.
- FFmpeg for encoding and optional audio mixing.
- ffprobe for verifying the output.

Tool discovery is layered so the pipeline works on a laptop and in a bare
container without configuration:

| Tool | Order |
| --- | --- |
| Chromium | `CHROMIUM_PATH` → Playwright browser → system Chrome/Chromium → `@sparticuz/chromium` |
| FFmpeg | `FFMPEG_PATH` → `PATH` → `@ffmpeg-installer/ffmpeg` |
| ffprobe | `FFPROBE_PATH` → `PATH` → `@ffprobe-installer/ffprobe` |

`src/lib/tooling.js` owns this. `npm run doctor` prints the resolution for each.

### How the stage is served

The renderer starts a short-lived local HTTP server (ephemeral port, bound to
127.0.0.1) that serves the stage page, its scripts and bundled fonts, and the
project's `scenes.json`. The browser loads that page, then is driven one frame
at a time via `window.__studio.renderFrame(n)` followed by a screenshot. When
the session closes, the server and browser are torn down.

A render never touches the public internet.

## Frame model

A video is composed of ordered scenes.

Each scene has:
- A unique ID.
- A type.
- A start frame.
- A duration in frames.
- Component data.
- Timed events within the scene.

Define intervals as:
- Start frame inclusive.
- End frame exclusive.

For a 30 fps video with 900 frames:
- Frame indexes are 0 through 899.
- Duration is 30 seconds.

Compute scene-local frame:

    localFrame = globalFrame - sceneStartFrame

Use explicit frame-driven functions to calculate all visual states.

## Rendering

1. Load the scene configuration.
2. Start the browser at 1080 × 1920 with device scale factor 1.
3. Wait for fonts and required local assets to load.
4. Set the requested global frame.
5. Render the corresponding scene state.
6. Capture the frame as a zero-padded PNG.
7. Repeat for all frames.
8. Encode the image sequence with FFmpeg.
9. Add approved audio if available.
10. Verify the resulting file with ffprobe.

Example frame naming:

    frame_000000.png
    frame_000001.png
    frame_000002.png

The FFmpeg input frame rate and the frame numbering must match the renderer.

## Layout verification

Because the page is a real DOM, quality checks are measured rather than guessed.
After rendering a frame the stage reports, per element, whether text leaves the
safe area, overflows its container, or is clipped. `npm run check` runs this
across sampled frames and fails the render on errors before any encoding starts.

Glyph bounds are measured rather than block boxes, so centred text that spans
the full canvas width is not falsely flagged.

## Preview workflow

Before the full render:
- Capture representative frames at scene starts, reveals, and endings.
- Check text clipping, safe zones, and loaded assets.
- If practical, render a lower-resolution preview video.
- Preview timing at the same frame rate as the final.

## Determinism

- Do not use real-time clocks.
- Do not rely on unseeded randomness.
- Avoid autonomous CSS animations or timers.
- Do not fetch fonts, images, or scripts from the internet during rendering.
- Ensure all assets are ready before capture.
- The same configuration and assets should produce the same visual states.

## Audio

Silent is still the default: a project with `"audio": { "mode": "silent" }`
renders with `-an` and `verify` asserts there is no audio stream.

A project can carry one mixed track instead:

```json
"audio": {
  "mode": "local",
  "tracks": [{ "file": "audio/mix.wav", "role": "mix" }]
}
```

- The file is resolved relative to the project directory and validated at
  config load, so a missing track fails before a 900 frame render.
- `encode` mixes it with `-c:a aac -b:a 192k -shortest`; `verify` then asserts
  an AAC stream is present and checks its sample rate.
- Only the first track is used. Mix it yourself: `voicemail-from-tomorrow-30s`
  ships `audio/build-audio.sh`, which layers the seven voice takes with a room
  tone, a chime, a static burst, a ringtone and three knocks into one 30 s file.

### Rules for generated audio

- **Nothing third-party.** The 30 s cut's score is synthesized from FFmpeg's
  signal generators and its voice is generated text-to-speech, so there is no
  sample to clear. No commercial music, no licensed stingers.
- **Measure levels, don't trust generators.** On this FFmpeg `sine` renders at
  0.125 instead of full scale, and `amix` divides by its input count — a
  fourteen-input mix comes out 23 dB quieter than the sum of its parts. So
  `build-audio.sh` fits every element to a *measured* target (peak for the
  effects, mean for the voice), sums them, measures the result, and applies one
  make-up gain that puts the loudest moment of the film at −0.5 dBFS. The same
  numbers then mean the same thing on a different FFmpeg.
- **Deterministic noise only.** `anoisesrc` is unseeded on this build and
  returns a different file each run; `aevalsrc`'s `random()` is deterministic
  and keeps a rebuild byte-identical.
- **Report the limitation.** `render-report.json` records `audio.mode` and
  whether the film is silent, so a silent render can never be mistaken for a
  mixed one.

## Storage

PNG sequences can consume significant disk space.

- Check available space before long renders when possible.
- Keep frames until the final video passes verification.
- Do not automatically delete frames unless the user has approved cleanup
  or the project provides a clearly documented cleanup command.

## Failures

If a dependency is missing:
- Explain what is missing.
- Provide the installation command appropriate to the environment.
- Do not claim a final render was produced.

If rendering fails:
- Preserve the story and configuration.
- Report the failing command and error.
- Keep the topic unchecked until a final video is verified.
