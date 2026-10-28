# Digital Suspense Studio

Turn a one-line topic into a finished vertical video: fictional suspense stories
told entirely through a phone screen — messages, voicemails, calls, notifications,
and the room reflected back at you.

Every frame is drawn with HTML/CSS/SVG in a headless browser, then stitched with
FFmpeg. Rendering is deterministic: the same config always produces the same pixels.

```
topic → story.md → scenes.json → frames → final.mp4
```

---

## Quick start

```bash
cd digital-suspense-studio
npm install
npm run doctor                              # confirm Node, FFmpeg, Chromium
npm run preview -- it-was-you                    # sampled frames + contact sheet
npm run build   -- it-was-you                    # render + encode + verify
```

Six finished films ship with the repo:

| Film | Length | About |
| --- | --- | --- |
| `arrived` | 60s | **Standalone, narrated.** Her phone says she got home at 23:11. There is a second phone in her flat, and it has her name on it. |
| `28-km-60s` | 60s | The earlier 60 s cut of the same idea: *Me* walks her night backwards. |
| `28-km` | 30s | The silent 30 s cut of the same idea, kept for comparison. |
| `it-was-you` | 30s | **Part 4, the finale.** The phone on the floor records the message that part 1 receives. Ends on part 1's first frame. |
| `its-inside` | 30s | **Part 3.** The call from part 2 is still up, and the phone is inside the house, walking towards you. |
| `you-answer` | 30s | Part 2: you answer a call from your own number. The camera is outside your door. |
| `voicemail-from-tomorrow-30s` | 30s | Part 1: a voicemail from your own voice, dated tomorrow. Sound on. |
| `dont-open-the-door` | 45s | A text from her own number arrives with a photo of her, taken from across the room. |
| `voicemail-from-tomorrow` | 43s | The first cut of the same story, kept for comparison. Silent. |

Output lands in `projects/<slug>/`:

```
projects/voicemail-from-tomorrow/
├── scenes.json          # the video, as frames
├── story.md             # premise, structure, scene breakdown
├── publishing.md        # caption, hashtags, disclosure, cover idea
├── render-report.json   # toolchain, timings, every check that ran
├── preview/
│   ├── contact-sheet.png
│   └── frames/
├── frames/              # 1290 PNGs, regenerable
└── output/final.mp4
```

---

## Requirements

| Tool | Needed for | Notes |
| --- | --- | --- |
| **Node.js 18+** | everything | Tested on Node 22 |
| **FFmpeg + ffprobe** | encoding and verification | Auto-detected, or bundled via npm |
| **A Chromium build** | drawing frames | Playwright, system Chrome, or npm |

Nothing else. No cloud services, no API keys, no network access during rendering.

`npm run doctor` reports exactly what it found and where, or how to install what's
missing. Resolution order for each tool:

1. `FFMPEG_PATH`, `FFPROBE_PATH`, `CHROMIUM_PATH` environment variables
2. A binary on `PATH` (or `/usr/bin`, `/Applications`, …)
3. The npm-packaged fallback (`@ffmpeg-installer`, `@ffprobe-installer`, `@sparticuz/chromium`)

The npm fallbacks are `optionalDependencies`, so a machine that already has FFmpeg
and Chrome never downloads them.

### If you have no browser installed

```bash
npx playwright install chromium     # preferred
```

On a minimal Linux container with no system libraries, `@sparticuz/chromium`
works out of the box: the pipeline unpacks its bundled NSS libraries on first use
and points Chromium at them automatically.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run doctor` | Environment report: tools, projects, free disk |
| `npm run list` | Every project with length and render status |
| `npm run new -- --title "…"` | Scaffold a renderable 3-scene project |
| `npm run preview -- <slug>` | Sample frames, layout check, contact sheet |
| `npm run check -- <slug>` | Safe-area / clipping / overflow checks only |
| `npm run render -- <slug>` | Full pipeline: preview → render → encode → verify |
| `npm run verify -- <slug>` | Re-probe an existing `final.mp4` |
| `npm run determinism -- <slug>` | Prove two renders are byte-identical |
| `npm run gallery` | One frame of every scene type |
| `npm run clean -- <slug> --frames --yes` | Delete regenerable frames |
| `npm test` | Unit tests (34, no browser needed) |

Useful flags: `--frames 0,120,300` or `--frames 0-300:30` to pick exact frames,
`--crf 16` for higher quality, `--force` to continue past layout errors.

---

## How a video is described

A project is one `scenes.json`. Scenes are placed on a frame timeline at **30 fps**;
intervals are start-inclusive and end-exclusive, so 1290 frames is exactly 43.00s.

```json
{
  "title": "Voicemail from Tomorrow",
  "slug": "voicemail-from-tomorrow",
  "fictional": true,
  "fictionLabel": "FICTIONAL STORY",
  "format": { "width": 1080, "height": 1920, "fps": 30 },
  "audio": { "mode": "silent", "tracks": [] },
  "scenes": [
    {
      "id": "scene-01-lock",
      "type": "lock-screen",
      "startFrame": 0,
      "durationFrames": 180,
      "data": {
        "time": "11:47",
        "dateLabel": "Thursday, 12 June",
        "appLabel": "VOICEMAIL",
        "title": "New voicemail",
        "body": "From: Me · received tomorrow, 8:14 AM",
        "highlight": "tomorrow, 8:14 AM"
      },
      "events": [
        { "type": "show-notification", "atFrame": 28, "durationFrames": 10 },
        { "type": "highlight-timestamp", "atFrame": 52, "durationFrames": 20 }
      ]
    }
  ]
}
```

`events[].atFrame` is **scene-local**. Every visual state is a pure function of
`(config, frame)`, which is what makes the output reproducible.

A scene can cross-fade in from the one before it:

```json
"transition": { "type": "fade", "durationFrames": 12 }
```

Rows in a `message-thread` can be bubbles, time separators, or system rows:

```json
{ "kind": "separator", "text": "Today 8:41 PM", "atFrame": 18 },
{ "from": "them", "text": "Don't open the door.", "atFrame": 34 },
{ "from": "them", "attachment": { "label": "Photo" }, "atFrame": 210 },
{ "kind": "system", "text": "Missed call · your number", "icon": "call", "atFrame": 128 }
```

A caption track sits beside `scenes`, timed in **global** frames so one card can
survive a scene change:

```json
"captions": [
  { "text": "this voicemail is from TOMORROW", "atFrame": 0, "durationFrames": 84 },
  { "text": "3 KNOCKS. 9PM.", "atFrame": 284, "durationFrames": 126 }
]
```

Caps and numbers are tinted automatically (`TOMORROW`, `3 KNOCKS`, `9PM`) and
everything else stays quiet. `npm run check` warns when a card runs longer than
five words, overlaps the next card, or simply transcribes a line of dialogue.

`npm run check` validates the file before a render: unknown scene types, zero
durations, duplicate ids, events past the end of a scene, captions that break the
rules above, and missing audio files all fail loudly with the field name.

### Scene types

| Type | Renders |
| --- | --- |
| `lock-screen` | Clock, date, and a notification that should not exist (optionally in a dark room that wakes up) |
| `notification` | A notification card, optionally with a system alert |
| `voice-note` | Voicemail player: waveform, timer, word-by-word transcript |
| `incoming-call` | Caller, pulsing rings, accept / decline |
| `message-thread` | Chat bubbles, time separators, system rows, attachments, typing |
| `photo-viewer` | A photo opened full screen out of a conversation |
| `signal-loss` | A dying phone: torn bands, seeded static, hard cut to black |
| `video-call` | An answered call: a camera pointed at a door, a self-view, the chrome |
| `hallway` | A call filmed from inside the house: a corridor, a lit doorway, someone in it |
| `recorder` | A voicemail being left: `to: Me`, a red dot, a timer and a level meter |
| `system-alert` | In-story warning or confirmation |
| `street` | Rain on glass, a parked car, headlights igniting |
| `reflection` | A dark phone screen reflecting a doorway that opens |
| `end-card` | Final line, accent line, optional blackout and CTA arrow |

---

## Safety and disclosure

Every scene renders a **FICTIONAL STORY** label, and `publishing.md` repeats the
disclosure. Names, numbers, and accounts are invented. The pipeline never
publishes anywhere — you review the draft, then post it yourself.

See `docs/07-quality-and-publishing.md` for the full checklists.

---

## Audio

Audio is optional and off by default. A project renders silent unless
`audio.tracks` lists a local file that exists, in which case it is mixed in as
AAC. The pipeline never assumes TTS, music, or a cloud service is available, and
`render-report.json` always records whether the result has audio.

`voicemail-from-tomorrow-30s` shows the whole path: seven text-to-speech takes
are pitched down, banded and doubled, then mixed with a synthesized score by
`audio/build-audio.sh`. Every element is scaled until its *measured* peak or
mean hits a stated target, because FFmpeg builds disagree about how loud a
generator is. The script prints the level of every window it cares about and
fails if the loudest moment is not where the film needs it.

---

## Repository layout

```
digital-suspense-studio/
├── package.json            npm scripts = the CLI
├── src/
│   ├── cli.js              command dispatch
│   ├── lib/                node side: tooling, server, browser, frames, encode
│   └── stage/              browser side: motion, timeline, components, scenes, CSS
├── assets/fonts/           Inter, SIL OFL 1.1, with its licence
├── content/                editorial system: topics, continuity, analytics
├── projects/               one folder per video
├── templates/              story + config starting points
├── docs/                   the design spec, kept in sync with the code
└── test/                   unit tests
```

The split is deliberate: `src/stage/` is plain browser JavaScript with no build
step, so a frame can be inspected by opening the stage in any browser. `src/lib/`
owns everything with side effects — processes, sockets, files.

Read `docs/` before changing behaviour. `CLAUDE.md` explains how an agent should
extend the project.
