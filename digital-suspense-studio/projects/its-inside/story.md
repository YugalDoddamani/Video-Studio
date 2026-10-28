# Story: It's Inside — part 3

- **Topic:** `topics.md` #1 — "A woman receives a voicemail from tomorrow." (part 3)
- **Slug:** `its-inside`
- **Cut:** strict 30.00 s (900 frames @ 30 fps), 1080×1920
- **Fiction disclosure:** `FICTIONAL STORY` on screen in every scene
- **Audio:** synthesized score + processed voice-over (see `audio/build-audio.sh`)
- **Continues:** `projects/you-answer/` (part 2), `projects/voicemail-from-tomorrow-30s/` (part 1)

Part 2 ended with the picture tearing apart mid-word and a card that promised
`PART 3: it's inside.` This is that film. Parts 1 and 2 are untouched.

## Premise

The call from part 2 never ended. The phone that was pointed at your front door
is now inside the house, walking down your hallway towards you — and you are
standing at the far end of it, back to the lens, your phone at your ear.

The camera is the intruder's phone. There is no self-view any more, because the
person holding it does not want to be seen. You can see them: the light from
your own front door, still ajar, is behind them.

You turn around. You walk towards the camera. You reach for it. The hand closes
over the lens at 23.87 s and the corridor is gone.

## Why the caller reads "You" and not "Me"

Part 2's screen said `Me — your number`: the phone in your hand, being called by
your own number. Part 3's screen says `You — your number`, because this phone is
calling *you*. Same layout, one word changed, and that word is the whole point of
view flip. Nothing is explained.

## Frame 1

Same rule as parts 1 and 2: anything scheduled for frame 0 is already on screen.
Frame 1 has the corridor, the lamp, the open front door at the far end, the person
standing in it with a phone at their ear, the caller name, the running timer
(00:31 — seven seconds after part 2's call died) and the first caption at full
opacity. The camera is already drifting, because a phone in a hand is never still.

## Beat sheet

| Time | Frames | Scene | Visual | Audio | Caption |
|---|---|---|---|---|---|
| 0:00–0:03 | 0–89 | hallway | Corridor, lamp, open door at the far end, you standing in it | room tone + line hiss + footsteps | `it's inside.` |
| 0:03–0:09 | 90–269 | hallway | The camera walks in. The figure grows | "You locked the front door." | `count the doors.` |
| 0:09–0:15 | 270–449 | hallway | Closer again. The timer runs 00:40 → 00:45 | "I know. I watched." | `one of them is open.` |
| 0:15–0:18 | 450–539 | hallway | You turn around | "You didn't check the others." | `you can't see me.` |
| 0:18–0:22 | 540–659 | hallway | You walk towards the camera; the phone at your ear goes dark | "Don't stop." | `i can see you.` · `five steps away.` |
| 0:22–0:24 | 660–716 | hallway | You fill the frame; the lens cannot focus | "Too late." | `closer.` |
| 0:24–0:27 | 716–809 | hallway | A hand closes over the lens. Black | the grab, then the front door | — |
| 0:27–0:30 | 810–899 | end-card | Black, then the card | the latch, then silence | `PART 4: it was you.` / `would you hang up?` |

## Voice-over

Five lines, twenty words. Same chain as parts 1 and 2 — the same voice on an even
worse line: 2.5 semitones down, bit-crush, a 240 Hz – 3.2 kHz band, a 40 ms ghost.

| # | Line | Starts | Note |
|---|---|---|---|
| 1 | You locked the front door. | 3.40 s | |
| 2 | I know. I watched. | 9.40 s | |
| 3 | You didn't check the others. | 15.20 s | on the turn |
| 4 | Don't stop. | 18.60 s | they are walking towards the lens |
| 5 | Too late. | 22.60 s | cut at 23.87 s by the hand |

Levels are fitted by measurement: every take is scaled to −22 dB mean **with a
−6 dB peak ceiling**, because a short take with little silence otherwise gets a
gain that puts its consonants above the loudest hit in the film.

## Caption track

Captions are a project-level layer, timed on the global frame. The voice says
*I*; the captions say *you*. Every card lands **12 frames (0.40 s) before** the
beat it belongs to, except the first, which opens the film.

| # | Frames | Caption | Beat it precedes |
|---|---|---|---|
| 1 | 0–90 | `it's inside.` | opens the film |
| 2 | 90–270 | `count the doors.` | VO 1 (102) |
| 3 | 270–378 | `one of them is open.` | VO 2 (282) |
| 4 | 378–444 | `you can't see me.` | the turn |
| 5 | 444–546 | `i can see you.` | VO 3 (456) |
| 6 | 546–666 | `five steps away.` | VO 4 (558) |
| 7 | 666–810 | `closer.` | VO 5 (678) |

## Audio design

Everything is generated in-repo: no third-party audio, nothing to license.

- **Room tone:** part 1's fridge hum, dead by 28.2 s.
- **Line hiss:** the call is still connected, 420 Hz – 5.2 kHz, −42 dB mean. It
  stops dead at 26.0 s, which is when the call ends, and what is left is the room.
- **Footsteps:** eight of them, 1.06 s apart, walking *towards* the microphone.
  Each one is slightly louder than the last.
- **The grab:** 23.87 s, peak **−1.0 dBFS** — the loudest moment in the film, and
  the reason the picture goes before the sound does.
- **The front door:** 25.40 s, from inside.
- **The latch:** 27.30 s, a quarter of a second before the card.
- **Master:** the make-up gain is measured, not assumed. The mix is built at
  unity, the grab window is read back, and the whole mix is scaled by the error.

Measured from the encoded `final.mp4`:

| Window | Mean | Peak |
|---|---|---|
| 0.0–3.4 corridor | −39.2 dB | −19.5 dB |
| 3.4–21.0 the call | −26.3 dB | −5.7 dB |
| 23.87–24.19 the grab | −16.4 dB | **−1.0 dB** |
| 25.4–25.8 the front door | −16.3 dB | −3.3 dB |
| 27.3–27.4 the latch | −30.9 dB | −11.6 dB |
| 28.2–30.0 silence | −91.0 dB | −91.0 dB |

## Review notes

- The whole film is one CSS drawing of a corridor, so the thing worth watching is
  whether the perspective holds when the camera pushes in. It does: the wall,
  floor and ceiling planes are polygons on the same four corners, and the doors
  on the side walls are quads on the corridor's own lines.
- The figure is deliberately flat. It is blurred as it closes, because a phone
  held at arm's length cannot focus — that ramp is what stops a silhouette from
  looking like a diagram once it fills half the frame.
- 2.5 s of black before the card. The card is promised, not earned.
