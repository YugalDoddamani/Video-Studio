# Video Studio

Fictional digital-suspense stories for vertical video, generated from a line of text.

The whole studio lives in [`digital-suspense-studio/`](digital-suspense-studio).
Start there:

```bash
cd digital-suspense-studio
npm install
npm run doctor
npm run build -- voicemail-from-tomorrow
```

It ships with a finished 43-second film:

**`digital-suspense-studio/projects/voicemail-from-tomorrow/output/final.mp4`**

A woman gets a voicemail from her own number — timestamped tomorrow. It warns her
about a blue truck outside, and tells her not to open the door.

| | |
| --- | --- |
| Resolution | 1080 × 1920 (9:16) |
| Runtime | 43.00 s @ 30 fps (1290 frames) |
| Codec | H.264, yuv420p, faststart |
| Audio | Silent (no licensed assets used) |

---

### What's in here

```
digital-suspense-studio/
├── README.md      setup, commands, and the config format
├── CLAUDE.md      instructions for an AI coding agent working in the repo
├── docs/          the design spec: story, style, motion, components, rendering, QC
├── src/           the renderer and CLI
├── projects/      one folder per video, including the finished example
├── assets/        bundled font + licence
├── templates/     starting points for a new story
├── topics.md      idea backlog, tracked as stories ship
└── test/          unit tests
```

Requirements are Node.js 18+, FFmpeg, and a Chromium build — the README covers
what happens when they aren't installed yet.
