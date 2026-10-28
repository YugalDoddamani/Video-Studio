# Claude Code Instructions

## Project

This project creates fictional digital suspense stories for Instagram Reels.

Stories are told through animated phone interfaces: messages, notifications,
incoming calls, maps, voice notes, system alerts, and other screen-based visuals.

The pipeline is built and working. Read the relevant files in `docs/` before
changing behaviour, and read `README.md` for the commands that actually run.

## Current state

- Renderer: `src/stage/` (browser, no build step) + `src/lib/` (Node).
- CLI: `src/cli.js`, exposed through npm scripts.
- Scene types: `lock-screen`, `notification`, `voice-note`, `incoming-call`,
  `message-thread`, `photo-viewer`, `signal-loss`, `video-call`, `hallway`,
  `recorder`, `map`, `system-alert`, `street`, `reflection`, `end-card`.
- Project-level caption track: `captions[]`, timed in **global** frames.
- Audio: **every reel carries a voice-over.** One mixed track per project
  (`audio/mix.wav`), encoded to AAC. A silent cut is a bug, not a style.
- Films: `28-km` (30s, standalone, no voice), `it-was-you` (30s, part 4, the
  finale), `its-inside` (30s, part 3), `you-answer` (30s, part 2),
  `voicemail-from-tomorrow-30s` (30s, part 1), `dont-open-the-door` (45s),
  `voicemail-from-tomorrow` (43s, first cut).
- Tests: `npm test` (102 unit tests, no browser required).

Verify before you claim anything works:

```bash
npm run doctor
npm test
npm run check -- <slug>
npm run render -- <slug>
```

## Creating a video

When the user says "create a video", "create today's video", or similar:

1. Use the supplied topic. If none is supplied, open `content/topics.md` and
   take the highest-scoring topic with status `shortlisted` — not the next
   unticked line. Record the topic ID in `story.md`.
2. Create a project folder: `npm run new -- --title "..."` (it refuses to
   overwrite; a taken slug gets a `-2` suffix).
3. Write an original fictional story based on the topic in `story.md`.
4. Translate it into `scenes.json` using the existing scene types. Reuse
   components; only add a new scene type when no combination fits.
5. Run `npm run preview -- <slug>` and actually look at the contact sheet.
6. Fix layout warnings, then `npm run render -- <slug>`.
7. Perform the checks in `docs/07-quality-and-publishing.md`.
8. Complete `publishing.md`: caption, hashtags, cover suggestion, disclosure.
9. Report output paths, duration, checks performed, and limitations.

Advance a topic through `content/topics.md` one state at a time:
`scripted → in-production → rendered → reviewed → published`. `rendered` needs an
encoded, verified `output/final.mp4`. `reviewed` also needs a human listen of any
audio mix — measurement is not review. `published` needs a confirmed post URL and
a row in `content/analytics.csv`. Nothing in this repository is published yet.

A revision of a shipped film gets its own project folder (with a `-30s` / `-v2`
suffix) — never overwrite a rendered project, so the old cut stays available for
comparison.

## Revision work

When the user sends a written revision spec (beat sheet, caption rules, audio
design), treat the numbers in it as the contract:

- Convert its timecodes to frames at 30 fps and check the totals add up.
- Where the spec contradicts itself (a 5-word caption rule next to a 6-word
  example), follow the rule and say so in `story.md`.
- Capture the mix in a script under `projects/<slug>/audio/` so it can be
  rebuilt, and measure levels rather than trusting generator defaults.
- Put the honest unknowns in the report: a mix that was measured but never
  auditioned is not a finished mix.

## Creative defaults

- Genre: fictional digital suspense.
- Format: vertical Instagram Reel.
- Target duration: 30–45 seconds unless the story needs a different length.
- Narrative perspective: a story experienced through a phone screen.
- No realistic character animation is required.
- Every story should have a hook, escalation, twist, and ending.
- Label the story as fiction in the video and publishing caption.
- Keep text readable on a phone.

## Technical defaults

- Resolution: 1080 × 1920.
- Frame rate: 30 fps.
- Render with a headless browser and stitch frames with FFmpeg.
- Animation must be deterministic and driven by frame time.
- Use local assets. Do not depend on network access during rendering.
- Never assume an external AI voice or music service is configured.
- **Voice-over is mandatory on every reel.** The narration carries the context
  the visuals cannot: who this is, what is at stake, and what the viewer should
  fear. A cut with no spoken word does not ship. If a voice is genuinely
  unavailable, stop and report it — do not quietly render a silent film.
- Never fabricate quality checks or claim to have viewed an output you did not inspect.

## Working rules

- Reuse components instead of building a new visual system for every video.
- Preserve the established visual style unless the user requests a change.
- Do not overwrite existing project outputs without permission.
- If a topic is vague, make reasonable creative decisions and continue.
- Ask only when a decision is necessary and cannot be safely inferred.
- Follow `docs/07-quality-and-publishing.md` for safety and asset rights.
- Keep implementation simple, documented, and reproducible.

## Where to change what

| Goal | File |
| --- | --- |
| Add a scene type | `src/stage/scenes.js`, then register in `SCENES` |
| Add a UI component | `src/stage/components.js`, style in `src/stage/style.css` |
| Change palette or type scale | `src/stage/style.css` (`:root` custom properties) |
| Change timing maths | `src/stage/timeline.js` |
| Add an easing curve | `src/stage/motion.js` |
| Change the output format | `src/lib/encode.js` |
| Add a CLI command | `src/cli.js` |
| Add a validation rule | `src/lib/config.js` |
| Change tool discovery | `src/lib/tooling.js` |
| Teach the docs a new behaviour | `docs/`, then `README.md` |

Keep all visual state a pure function of `(config, frame)`. Do not introduce
`Date.now()`, `Math.random()`, CSS animations, or network requests into
`src/stage/` — `npm run determinism -- <slug>` will catch it.

After changing anything in `src/`, run `npm test` and re-render the example to
confirm frames still look right.

## Expected project output

```
projects/<video-slug>/
├── story.md
├── scenes.json
├── publishing.md
├── render-report.json
├── preview/
│   ├── contact-sheet.png
│   └── frames/
├── frames/              # generated, git-ignored, safe to delete after verification
└── output/
    └── final.mp4
```
