# Story: Don't Open the Door

## Project details

- Topic: Someone receives a text from their own number: "Don't open the door."
- Slug: dont-open-the-door
- Target duration: 45 seconds (1350 frames at 30 fps)
- Fiction disclosure: Fictional digital suspense. Every scene carries a
  "FICTIONAL STORY" label and `publishing.md` repeats it.
- Audio: silent (no approved audio assets available)

## Premise

At 8:41 PM, Maya's phone receives a text from her own number. It tells her not
to open the door. Then it sends a photo of her, taken from across the room she
is sitting in — and she is alone in the flat.

## Characters

- **Maya** — late twenties, alone, sitting on her couch answering messages.
  Never named on screen; never shown with a face. The photo is taken from
  behind her, so the audience shares her worst angle: her own back.
- **Her number** — the sender. It types, it answers, it calls. Whatever it is,
  it is using her phone number and it can see her.

Both are invented. The number is never displayed, only labelled "your number".

## Story structure

### Hook (scene 01, first 8s)

A normal chat header: **Me**, subtitle **your number**. A timestamp
separates the conversation, then:

> **Don't open the door.**

The horror is entirely in the header. The viewer reads the contact name before
the message, so the threat arrives already knowing it is her own number.

### Setup (scene 01, 3–10s)

She does the sensible thing and questions it: *Who is this?* / *You're using my
number.* The typing indicator answers before any words do. Then a photo lands
in the thread — a tiny room with a lamp, a couch, and her silhouette.

### Escalation (scene 02, 11–21s)

The photo opens full screen. It is her living room: the same window, the same
lamp, the couch she is sitting on. Her figure is lit only by the phone in her
hands. The camera has been behind her the whole time.

### Twist (scenes 03–04, 21–41s)

Back in the thread, she asks the only question left: *Who took this?*

> **You did.**
> **Tomorrow.**

Then the escalation closes on her: *Don't answer it.* A missed call from her
own number. And finally, quietly:

> **I didn't listen either.**

The sender is a version of Maya who already made the mistake. The advice is
not a warning from a stranger; it is a report from further along the same night.

### Ending (scene 05, 41–45s)

> She never opened the door.
> **The door opened anyway.**

Four seconds, two lines, no imagery. The ending withholds the reveal: the film
never shows what came through, which is the point.

## Scene breakdown

### Scene 01 — message-thread (0–329, 330 frames, 11.0s)

- On-screen: chat with "Me / your number", timestamp separator, three messages,
  then an incoming photo attachment.
- Motion: message rows spring in at local frames 34, 96, 132; typing indicator
  at 78–96 and 186–214; the photo attachment arrives at 210.
- Purpose: hook + setup. The contact name must be readable before the threat.

### Scene 02 — photo-viewer (330–629, 300 frames, 10.0s)

- Transition: 12-frame cross-fade from the thread.
- On-screen: the photo full screen, chrome showing "8:41 PM · sent just now",
  caption "8:41 PM · from your number".
- Motion: opens with a brief shutter flash and a 16px blur that resolves over
  30 frames, then holds perfectly still so it can be read.
- Purpose: the escalation. Nothing moves because the viewer needs to look.

### Scene 03 — message-thread (630–929, 300 frames, 9.0s)

- Transition: 12-frame cross-fade.
- On-screen: "Who took this?" → *You did.* → *Tomorrow.*
- Motion: typing indicators before each reply (76–108, 140–172).
- Purpose: the twist. Two short lines carry it.

### Scene 04 — message-thread (930–1229, 300 frames, 10.0s)

- Transition: 12-frame cross-fade.
- On-screen: *Don't answer it.* · system row: **Missed call · your number ·
  8:48 PM** · *I didn't listen either.*
- Motion: the system row lands at 128, the final line at 214.
- Purpose: the closing escalation, with the phone acting on its own.

### Scene 05 — end-card (1230–1349, 120 frames, 4.0s)

- Transition: 18-frame cross-fade.
- On-screen: two lines, the second in amber.
- Purpose: payoff. The final line states what the film refused to show.

## Asset notes

- No external images, footage, or audio.
- Every visual — chat chrome, the room photo, the thumbnail, the couch,
  the silhouette — is drawn in HTML/CSS at frame time.
- Font: Inter (SIL Open Font License 1.1), bundled in `assets/fonts/`.

## Review notes

- [x] Story checklist (`docs/07-quality-and-publishing.md`).
- [x] Layout/safe-area check across sampled frames.
- [x] Rendering deterministic across browser sessions.
- [ ] Human review of pacing: the photo holds for 10 seconds by design — confirm
      it earns the stillness rather than feeling stalled.

### Timing runs

| Scene | Global frames | Local event frames |
| --- | --- | --- |
| 01 message-thread | 0–329 | separator 18, messages 34 / 96 / 132, photo 210 |
| 02 photo-viewer | 330–629 | fade-in 0–12, photo reveal 24–54 |
| 03 message-thread | 630–929 | separator 20, messages 34 / 108 / 172 |
| 04 message-thread | 930–1229 | separator 16, message 30, missed call 128, final line 214 |
| 05 end-card | 1230–1349 | line 1 at 0, line 2 at 22 |

Scene-local frames are what `events[].atFrame` refers to.
