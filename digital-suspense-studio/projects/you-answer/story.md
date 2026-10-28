# Story: You Answer — part 2

- **Topic:** `topics.md` #1 — "A woman receives a voicemail from tomorrow." (part 2)
- **Slug:** `you-answer`
- **Cut:** strict 30.00 s (900 frames @ 30 fps), 1080×1920
- **Fiction disclosure:** `FICTIONAL STORY` on screen in every scene
- **Audio:** synthesized score + processed voice-over (see `audio/build-audio.sh`)
- **Continues:** `projects/voicemail-from-tomorrow-30s/` (part 1, 30 s, with sound)

Part 1 ended on three knocks and then silence, with a card that promised
`PART 2: you answer.` This is that film. Part 1 is untouched.

## Premise

You answered the call. The caller is your own number, and the camera is pointed
at your front door — from the outside. Your hallway light is on underneath it.
You are inside the house, and the door is locked from in there.

Then the light under the door goes out, and in the little self-view at the top
right you can see your own back, standing in the dark — and the door behind you
is opening.

There is no explanation, and no resolution. The last instruction on screen is
`don't turn around`; the last thing the voice says is "Turn arou—" and the
picture dies mid-word.

## Why the clock reads 00:04

The call has already been connected for four seconds when the film starts: you
answered *before* the story began, which is the premise of the sequel, not a
detail to stage. That is also why frame 1 is not an entrance — see below.

## Frame 1

Same rule as part 1: anything scheduled for frame 0 is **already on screen**, so
nothing animates in over the hook. Frame 1 has the door, the lit strip under it,
the self-view with a person in it, the caller name, the running timer, and the
first caption at full opacity. The only thing that moves in the first second is
the camera, which drifts because a phone in a hand is never still.

## Beat sheet

| Time | Frames | Scene | Visual | Audio | Caption |
|---|---|---|---|---|---|
| 0:00–0:03 | 0–89 | video-call | Door mid-frame, light strip lit, self-view: you, back to camera | room tone + line hiss | `you picked up.` |
| 0:03–0:09 | 90–269 | video-call | The camera walks in; the door grows; timestamp 9:00 | "Hey... it's me." *(part 1's take)* | `your number. your hallway.` |
| 0:09–0:15 | 270–449 | video-call | Closer. The timer runs 00:13 → 00:18 | "Don't hang up." · "I'm not outside." | `but you're inside.` · `you locked it from inside.` |
| 0:15–0:18 | 450–539 | video-call | **Hard cut to the door filling the frame.** At 15.4 s the strip goes out | the switch, then only the line | `the small picture, top right` |
| 0:18–0:21 | 540–629 | video-call | Camera gain comes up. In the self-view, the door behind you opens | "I'm right behind you." | `it's your back` · `don't turn around` |
| 0:21–0:25 | 630–749 | signal-loss | The call tears, snows, and dies | "Turn arou—" **[STATIC]** | — |
| 0:25–0:27 | 750–809 | signal-loss | Black. The call is over | three knocks, from inside | — |
| 0:27–0:30 | 810–899 | end-card | Black, then the card | the latch, then silence | `PART 3: it's inside.` / `would you look behind you?` |

## Voice-over

Six lines, twenty words. Line 1 is part 1's opening take, reused byte-for-byte and
re-processed for the call, so the caller is provably the same voice.

| # | Line | Starts | Note |
|---|---|---|---|
| 1 | Hey... it's me. | 3.40 s | `vo-01.mp3`, carried over from part 1 |
| 2 | Don't hang up. | 9.40 s | |
| 3 | I'm not outside. | 13.00 s | |
| 4 | Look at the little picture. | 16.60 s | the self-view |
| 5 | I'm right behind you. | 18.60 s | |
| 6 | Turn around. | 20.43 s | cut at 21.00 s by the static, mid-word |

Processing is part 1's: pitch down 2.5 semitones, bit-crush saturation, a
compress/limit pass and a 40 ms ghost copy. The band is narrower here
(240 Hz – 3.2 kHz) because this voice comes down a phone line.

## Caption track

Captions are a project-level layer, timed on the global frame, and they are not
subtitles: the voice says *I*, the captions say *you*, and no card repeats a
line. Every card lands **12 frames (0.40 s) before** the beat it belongs to —
except the first, which opens the film.

| # | Frames | Caption | Beat it precedes |
|---|---|---|---|
| 1 | 0–90 | `you picked up.` | opens the film |
| 2 | 90–270 | `your number. your hallway.` | VO 1 (102) |
| 3 | 270–378 | `but you're inside.` | VO 2 (282) |
| 4 | 378–486 | `you locked it from inside.` | VO 3 (390) |
| 5 | 486–546 | `the small picture, top right` | VO 4 (498) |
| 6 | 546–601 | `it's your back` | VO 5 (558) |
| 7 | 601–630 | `don't turn around` | VO 6 (613) — and then the static |

`don't turn around` is the whole idea of the caption track in three words: the
voice is telling you to turn around, and the caption is telling you not to.
Nobody is subtitled; the two narrators disagree.

## Audio design

Everything is generated in-repo: no third-party audio, nothing to license.

- **Room tone:** part 1's fridge hum, dead at 21.0 s with the picture.
- **Line hiss:** a band-limited 420 Hz–5.2 kHz hiss at −42 dB mean, running to
  26.0 s. It is inaudible under the voice and it is the *only* thing left once
  the feed dies — then it stops, which is the sound of the call ending.
- **Static:** the same burst as part 1, at 21.0 s, peak −0.5 dBFS: the loudest
  moment in the film.
- **The switch:** a single tick at 15.4 s, when the light under the door goes
  out.
- **Knocks:** three, at 26.4 / 26.9 / 27.4 s, peak −6.9 dBFS — the same knock as
  part 1 but from the inside, with the bottom end kept.
- **The latch:** 27.85 s, a quarter of a second before the card, and then
  nothing.
- **Levels are fitted, not guessed:** every element is scaled until its measured
  peak or mean hits its target, then one measured make-up gain puts the static
  at −0.5 dBFS.

Measured from the encoded `final.mp4`:

| Window | Mean | Peak |
|---|---|---|
| 0.0–3.4 pickup | −41.9 dB | −30.0 dB |
| 3.4–21.0 the call | −25.1 dB | −4.6 dB |
| 21.0–22.1 static | −13.6 dB | **−0.5 dB** |
| 22.1–26.0 dead line | −42.9 dB | −31.3 dB |
| 26.0–27.5 knocks | −27.4 dB | −6.9 dB |
| 27.85–28.1 latch | −27.4 dB | −10.9 dB |
| 28.2–30.0 silence | −91.0 dB | −91.0 dB |

The static is 11.5 dB above the voice on mean level and 4.0 dB above it on peak,
so the one audio rule the series keeps — the failure is the loudest thing in the
film — holds in part 2 as well.

## What part 2 borrows from part 1

The sequel is a sequel, not a remix: the same voice, the same static burst, the
same three knocks — moved from outside the door to inside it — and the same end
card grammar. What is new is the picture: part 1 was a phone; this one is a
camera pointed at the thing the phone was warning about.

| Part 1 | Part 2 |
|---|---|
| `lock-screen` → `voice-note` | `video-call` wide → `video-call` close |
| the impossible notification | the impossible call: your number, your hallway |
| captions describe the message | captions describe the room you are standing in |
| knocks from outside, then silence | knocks from inside, then a latch |
| "PART 2: you answer." | "PART 3: it's inside." |

## Assets and rights

- Interface, corridor, door, figures: original HTML/CSS/SVG.
- Voice-over: generated text-to-speech, processed in-repo.
- Score: synthesized from FFmpeg signal generators (`audio/build-audio.sh`).
- Font: Inter, SIL Open Font License 1.1, bundled in `assets/fonts`.

## Review notes

- The mix was **measured, not auditioned**. Every level above is a measurement;
  nobody has listened to the film end to end.
- The film spends 3.0 s on black (25.0–28.0 s) with only three knocks and a
  latch in it. That is deliberate — the call is over — but it is the part most
  worth judging by ear rather than by frame.
- While the call tears apart, the whole picture is displaced by up to 30 px by
  the tear jitter. The picture is fully faded out by then, so the loss scene
  stops rendering it rather than leaving invisible call chrome in the layout —
  that keeps the frame checker honest (it measures geometry, not visibility).
- The self-view is the only thing in the frame that changes meaning: the same
  silhouette is "you" at 0:00 and "someone behind you" at 0:18. If a viewer
  misses it, the caption `it's your back` is the second chance.
