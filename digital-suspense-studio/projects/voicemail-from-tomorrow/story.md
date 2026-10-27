# Story: Voicemail from Tomorrow

## Project details

- Topic: A woman receives a voicemail from tomorrow.
- Slug: voicemail-from-tomorrow
- Target duration: 43 seconds (1290 frames at 30 fps)
- Fiction disclosure: Fictional digital suspense. The video carries a
  "FICTIONAL STORY" label in every scene and `publishing.md` repeats it.
- Audio: silent (no approved audio assets available)

## Premise

At 11:47 PM, Sarah's phone shows a voicemail from her own number, timestamped
8:14 AM tomorrow. The message warns her about a blue truck and a bridge — and
tells her not to open the door.

## Characters

- **Sarah** — late twenties, alone in her flat, tired and already on edge.
  Never seen on camera; the story is told entirely through her screen and her
  point of view.
- **Future Sarah** — the voice in the voicemail. Same person, recorded
  thirteen hours from now. Only her transcript is shown.

Both are invented. No real person, number, or address is referenced.

## Story structure

### Hook (scene 01, first 6s)

A phone lock screen at 11:47 PM. A single notification arrives:
"New voicemail — From: Me · received tomorrow, 8:14 AM". The timestamp
highlights in amber. The viewer should register the impossible detail before
the scene ends.

### Setup (scene 02, 15s)

The voicemail player. The waveform moves; the transcript appears line by line:

1. "Sarah, don't go to the bridge tomorrow at 8:15."
2. "The blue truck — it's already here."
3. "And whatever you do, don't open the door."

The second line is what turns a strange message into a threat: the truck is
not a future event, it is present tense.

### Escalation (scene 03, 9s)

Her point of view through a rain-covered window. A blue truck is parked across
the street, facing the flat. It was not there five minutes ago. Its headlights
stutter on.

### Twist (scene 04, 10s)

The phone screen goes dark enough to act as a mirror. In the reflection, the
door behind her opens on its own, light spilling across the floor, and a
silhouette steps into the frame. One short glitch — the only one in the video —
lands on the reveal.

### Ending (scene 05, 3s)

"The voicemail was from tomorrow."
"So was the voice behind her."

The last line states the twist the visuals already implied: the caller is the
figure in her doorway.

## Scene breakdown

### Scene 01 — lock-screen (0–179, 180 frames, 6.0s)

- On-screen: status bar, 11:47 clock, date, notification card.
- Motion: card drops in at frame 28; the timestamp and highlight fade to amber
  at frame 52 and hold.
- Purpose: hook. The impossible detail must be readable for at least 3 seconds.

### Scene 02 — voice-note (180–629, 450 frames, 15.0s)

- On-screen: voicemail player, "Me" avatar, waveform, transcript card.
- Motion: playback starts at local frame 12; waveform fills over 430 frames;
  transcript lines reveal word by word at local frames 40, 170, and 300.
- Purpose: setup and first escalation. Words are revealed slowly enough to read
  and are never moved while being read.

### Scene 03 — street (630–899, 270 frames, 9.0s)

- On-screen: rain on glass, street, blue truck, caption.
- Motion: static camera; deterministic rain; headlights stutter on at local
  frame 54 and hold.
- Purpose: escalation. The threat is now outside the phone.

### Scene 04 — reflection (900–1199, 300 frames, 10.0s)

- On-screen: blurred room reflection, doorway, light spill, silhouette.
- Motion: slow push-in over the scene; door opens from local 36 to 206;
  silhouette arrives at local 120; 8-frame glitch at local 140.
- Purpose: twist. One deliberate reveal, then hold.

### Scene 05 — end-card (1200–1289, 90 frames, 3.0s)

- On-screen: final two lines, fiction label.
- Motion: lines fade in at frames 0 and 14; fiction label fades in at local 32.
- Purpose: payoff and disclosure.

## Asset notes

- No external images, footage, or audio.
- Interface, truck, rain, and silhouette are drawn with HTML/CSS/SVG.
- Font: Inter (SIL Open Font License 1.1), bundled in `assets/fonts/`.

## Review notes

Verified on 2026-10-27 with the checked-in `scenes.json`:

- [x] Story checklist (`docs/07-quality-and-publishing.md`).
- [x] Layout/safe-area check: 36 sampled frames, no overflow, clipping, or
      safe-area problems (`npm run check`).
- [x] Full render: 1290 frames in 588s.
- [x] Technical verification: 10/10 ffprobe checks passed — 1080x1920,
      H.264 High profile, yuv420p, 30 fps, 1290 frames, 43.00s, 2.97 MB.
- [x] Determinism: identical SHA-256 across two browser sessions for
      8 sampled frames (`npm run determinism`).
- [ ] Human review of pacing and audio appropriateness. The video is silent;
      the transcript carries the whole story, which the checklist allows but
      a reviewer should confirm reads well on a phone.

### Timing runs

| Scene | Global frames | Local event frames |
| --- | --- | --- |
| 01 lock-screen | 0–179 | notification 28, highlight 52 |
| 02 voice-note | 180–629 | playback 12, lines 40 / 170 / 300 |
| 03 street | 630–899 | headlights 54 |
| 04 reflection | 900–1199 | door 36, silhouette 120, glitch 140 |
| 05 end-card | 1200–1289 | line 1 at 0, line 2 at 14 |

Scene-local frames are what `events[].atFrame` and `revealAtFrame` refer to.
Frames were inspected at scene starts, event boundaries, and scene ends.
