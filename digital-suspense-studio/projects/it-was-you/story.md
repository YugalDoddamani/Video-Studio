# Story: It Was You — part 4 (the last one)

- **Topic:** `topics.md` #1 — "A woman receives a voicemail from tomorrow." (part 4)
- **Slug:** `it-was-you`
- **Cut:** strict 30.00 s (900 frames @ 30 fps), 1080×1920
- **Fiction disclosure:** `FICTIONAL STORY` on screen in every scene
- **Audio:** synthesized score + processed voice-over (see `audio/build-audio.sh`)
- **Continues:** `projects/its-inside/` (part 3)
- **Ends:** the series. There is no part 5.

Part 3 ended with a hand closing over the lens and a card that promised
`PART 4: it was you.` This is that film, and it is the one that closes the loop:
**the last frame of part 4 is the first frame of part 1.**

## Premise

The phone that filmed you is on the floor of your own hallway, still connected,
still counting. Somebody is walking out of your front door. Then the phone is
picked up, the call ends, and the person holding it starts recording a message.

You hear the message. Then the film cuts to the phone that receives it — at 8:47,
the next morning, with a voicemail that was received **tomorrow**.

Nothing is explained. Two facts are placed next to each other and the viewer does
the rest.

## Why it ends on part 1's frame, and not on a card

Every other film in the series ends on a card that promises the next one. This
one cannot, so it doesn't. The last 90 frames rebuild `voicemail-from-tomorrow-30s`
frame 1 exactly — the same clock (8:47), the same date, the same notification,
the same wake animation and the same caption (`this voicemail is from TOMORROW`).
A test asserts that the two scene definitions are identical, so a future edit to
either film breaks the loop loudly instead of quietly.

The one difference is timing: the card fades in and out like every other card in
the series, so the very first and the very last frames of the film are a fade
rather than a snap. That reads as an ending, which is what it is.

## Frame 1

Same rule as parts 1–3: anything scheduled for frame 0 is already on screen.
Frame 1 is the hallway from floor height — tilted, because the phone is lying on
its side — with the front door standing open at the far end, someone walking
away from it, and the call still up: `You · your number · 00:58`.

## Beat sheet

| Time | Frames | Scene | Visual | Audio | Caption |
|---|---|---|---|---|---|
| 0:00–0:10 | 0–299 | hallway | Phone on the floor. The front door is open. Someone is walking out of it | room tone + line hiss + four footsteps, each quieter | `nobody's holding it.` · `the door is open.` |
| 0:10–0:20 | 300–599 | hallway | The phone is picked up. The corridor comes upright. The door is all that is left | the pick-up scrape, then the call is gone | `you got out.` · `almost.` |
| 0:20–0:27 | 600–809 | recorder | `NEW VOICEMAIL · to: Me`, a red dot, the level meter moving | "Hey... it's me." · "I'm sorry." | `you're recording this.` · `you know how this ends.` |
| 0:27–0:30 | 810–899 | lock-screen | **Part 1, frame 1.** 8:47. `Voicemail — received TOMORROW, 6:47 AM` | the notification chime, then silence | `this voicemail is from TOMORROW` |

## Voice-over

Two lines, six words, and the first one is not new: it is part 1's opening take,
byte-for-byte, copied into this folder exactly the way part 2 copied it. The
message that is left here is the message that arrives there.

| # | Line | Starts | Note |
|---|---|---|---|
| 1 | Hey... it's me. | 20.40 s | `vo-01.mp3`, part 1's take, reused |
| 2 | I'm sorry. | 24.40 s | |

The chain is part 1's with a wider band and a smaller ghost copy — this voice is
being recorded into a phone at close range, not played down a bad line.

## Caption track

| # | Frames | Caption | Beat it precedes |
|---|---|---|---|
| 1 | 0–120 | `nobody's holding it.` | opens the film |
| 2 | 120–330 | `the door is open.` | the footsteps |
| 3 | 330–540 | `you got out.` | the pick-up |
| 4 | 540–600 | `almost.` | the recorder |
| 5 | 600–720 | `you're recording this.` | VO 1 (612) |
| 6 | 720–810 | `you know how this ends.` | VO 2 (732) |
| 7 | 810–894 | `this voicemail is from TOMORROW` | part 1's first card, exactly |

The last card is the only caption in the series that repeats another film's
caption. That is the point of it.

## Audio design

- **Room tone:** the same fridge hum, dead by 27.0 s — after that the film belongs
  to the phone screen.
- **Line hiss:** the call is still connected while the phone is on the floor. It
  stops at 11.4 s, when the phone is picked up.
- **Footsteps:** four, walking *away* from the microphone, each quieter.
- **The pick-up:** 11.40 s, a plastic scrape and a click.
- **Record:** 20.00 s, a click, not a beep.
- **The chime:** 27.30 s, the same notification chime part 1 opens with — because
  this is that notification.
- **Master:** calibrated on the chime window, which has to land on −4.0 dBFS.

Measured from the encoded `final.mp4`:

| Window | Mean | Peak |
|---|---|---|
| 0.0–11.4 the floor | −41.7 dB | −22.4 dB |
| 11.4–11.7 pick-up | −31.5 dB | −15.6 dB |
| 20.4–24.4 the message | −26.5 dB | −7.5 dB |
| 27.3–27.9 the chime | −18.6 dB | **−4.0 dB** |
| 28.2–30.0 silence | −91.0 dB | −91.0 dB |

## Review notes

- The hallway is the same component as part 3, seen from the floor: `originY`
  1460 and a −7.5° tilt, both of which resolve to a normal eye line as the phone
  comes up. That single move is what tells the viewer the phone changed hands.
- The recorder screen is the only new UI in the film, and it exists to make one
  thing legible without narration: this is a message being *left*.
- The loop only works if the last card is readable. It is part 1's card, at part
  1's size, in part 1's position.
