# Story: Voicemail from Tomorrow — 30s cut

- **Topic:** `topics.md` #1 — "A woman receives a voicemail from tomorrow." (revision)
- **Slug:** `voicemail-from-tomorrow-30s`
- **Cut:** strict 30.00 s (900 frames @ 30 fps), 1080×1920
- **Fiction disclosure:** `FICTIONAL STORY` on screen in every scene
- **Audio:** synthesized score + processed voice-over (see `audio/build-audio.sh`)
- **Status:** rendered, verified, deterministic

This is the revision of the shipped 43 s film `projects/voicemail-from-tomorrow`.
That cut is kept as-is for comparison; nothing in it was overwritten.

## Premise

A voicemail arrives timestamped 6:47 AM **tomorrow**. It is the listener's own
voice, and it is warning about a knock at nine o'clock tonight. The message is
cut off mid-sentence. Then the phone rings, and the caller is `ME`.

The film never explains the mechanism. "You already know who it is" is the
whole lore, and the ending is a cliffhanger rather than a resolution.

## Why 8:47

The clock reads 8:47 PM. The voicemail is stamped 6:47 AM tomorrow. "It's
almost 9" and the knock at nine are therefore thirteen minutes away — the
film's warning arrives *after* the event it is warning about, which is the
horror, not a plot hole. Across the static the phone's clock jumps to 8:59:
the signal loss eats twelve minutes.

## Frame 1

The hook is a *frame*, not a beat: frame 0 has to be the impossible image on its
own, because that is the frame a feed shows before anyone presses play. Three
things therefore ignore their entrance animations when they are scheduled at
frame 0 — the notification card, the highlighted word `TOMORROW`, and the first
caption card. The screen is still waking (`.wake` runs from frame −16 over 26
frames), so the room brightens under the image instead of fading up from nothing.

The rule is enforced in the renderer, not in the config: `atFrame: 0` means
"already on the glass". A card scheduled at any later frame keeps its spring.

## Beat sheet

| Time | Frames | Visual | Audio | Caption |
|---|---|---|---|---|
| 0:00–0:03 | 0–89 | Dark room, screen coming up. The notification is **already there in frame 1**: `received TOMORROW, 6:47 AM` | room tone → chime at 0.12 s | `this voicemail is from TOMORROW` |
| 0:03–0:07 | 90–209 | Player. Sender is `Me · your number`. Waveform begins | "Hey... it's me." | `that's your own voice` |
| 0:07–0:11 | 210–329 | Transcript scrolls | "If you're hearing this... tomorrow already happened." | `tomorrow already happened.` |
| 0:11–0:15 | 330–449 | Transcript scrolls | "Tonight at 9, there's a knock. Three knocks." | `3 KNOCKS. 9PM.` |
| 0:15–0:19 | 450–569 | Transcript scrolls | "Don't open it. You already know who it is." | `you know who it is.` |
| 0:19–0:21 | 570–629 | Transcript scrolls | "Last time... I opened it." | `last time, you opened it` |
| 0:21–0:24 | 630–719 | The picture tears, then snow | "That's why I'm calling from—" **[STATIC]** | `calling from…` → `tomorrow.` |
| 0:24–0:27 | 720–809 | Incoming call. Caller ID `ME` | stock ringtone + whisper "It's almost 9." | `it's almost 9.` |
| 0:27–0:30 | 810–899 | Cut to black on the third knock → end card | knock · knock · knock → true silence | `PART 2: you answer.` / `would you open the door?` |

## Voice-over

Recorded as seven separate takes, then pitched down 2.5 semitones and mixed
under a 40 ms ghost copy. Timings are absolute (film time), not scene-relative.

| # | Line | Starts | Window |
|---|---|---|---|
| 1 | Hey... it's me. | 3.20 s | 2.0 s |
| 2 | If you're hearing this... tomorrow already happened. | 5.57 s | 4.0 s |
| 3 | Tonight at 9, there's a knock. Three knocks. | 9.87 s | 3.9 s |
| 4 | Don't open it. You already know who it is. | 14.07 s | 3.9 s |
| 5 | Last time... I opened it. | 18.17 s | 2.4 s |
| 6 | That's why I'm calling from— | 20.63 s | cut at 22.17 s by the static |
| 7 | It's almost 9. *(whispered)* | 24.60 s | under the ringtone |

## Caption track

Captions are a project-level layer (`captions[]` in `scenes.json`), timed on
the global frame so one card can straddle a scene cut. They are not subtitles:
each one adds information the voice-over does not say, and the split is
deliberate — the voice says *I*, the captions say *you*.

Every card lands **12 frames (0.40 s) before** the audio beat it belongs to.
That pre-lag is the whole trick: anticipation beats synchronisation. The first
card is the exception — it opens the film, so it *is* the hook rather than a
pre-echo of one.

| # | Frames | Caption | Beat it precedes |
|---|---|---|---|
| 1 | 0–84 | `this voicemail is from TOMORROW` | opens the film; the chime answers it at frame 4 |
| 2 | 84–155 | `that's your own voice` | VO 1 (96) |
| 3 | 155–284 | `tomorrow already happened.` | VO 2 (167) |
| 4 | 284–410 | `3 KNOCKS. 9PM.` | VO 3 (296) |
| 5 | 410–533 | `you know who it is.` | VO 4 (422) |
| 6 | 533–607 | `last time, you opened it` | VO 5 (545) |
| 7 | 607–666 | `calling from…` | VO 6 (619) |
| 8 | 666–726 | `tomorrow.` | the static cut — no lag, the card lands *on* the cut |
| 9 | 726–804 | `it's almost 9.` | the whisper (738) |

Caps are spent only on threat words (`TOMORROW`, `3 KNOCKS`, `9PM`); the
renderer tints any all-caps or numeric token and leaves everything else quiet.

Two places where this cut deliberately departs from the written spec:

- The spec's own table used `you already know who it is` (6 words) while its
  rules cap cards at 5. The five-word rule won: `you know who it is.`
- The spec ends the CTA with 👇. The stage ships Inter only and has no emoji
  font, so the emoji would render as a tofu box on every machine. It is drawn
  as a vector arrow instead.

## Audio design

Everything is generated in-repo: no third-party audio, nothing to license.

- **Voice:** pitch −2.5 semitones (`asetrate` + `atempo` correction), light
  bit-crush saturation, 170 Hz–3.6 kHz telephone band, 40 ms ghost at −10 dB.
- **Room tone:** 52 Hz + 104 Hz hum plus filtered noise, dead by 28.15 s.
- **Chime:** two tones (1046.5 Hz, 1568 Hz) at 0.12 s, peak −4 dBFS —
  deliberately too loud for the room.
- **Static:** the loudest moment in the film, peak −0.5 dBFS, mean −12.7 dB.
- **Ringtone:** stock 440 + 480 Hz, 1 s on / 0.6 s off / 1 s on, peak −20 dBFS.
- **Knocks:** three, 0.5 s apart (27.00 / 27.49 / 28.02 s), peak −6 dBFS, then
  **true silence**: the last 1.8 s of the film measures −91 dBFS (digital zero).
- **Levels are fitted, not guessed.** Every element is scaled until its measured
  peak or mean hits its target, then one make-up gain puts the static at
  −0.5 dBFS. `amix` divides by its input count, so a fourteen-stem sum has to be
  measured back up rather than assumed.

Measured from the encoded `final.mp4`:

| Window | Mean | Peak |
|---|---|---|
| 0.0–3.0 hook | −25.6 dB | −4.0 dB |
| 3.0–21.0 voicemail | −22.0 dB | −2.6 dB |
| 22.2–23.3 static | −12.7 dB | **−0.5 dB** |
| 24.0–27.0 ring + whisper | −25.0 dB | −8.2 dB |
| 27.0–28.2 knocks | −25.2 dB | −6.0 dB |
| 28.2–30.0 silence | −91.0 dB | −91.0 dB |

The static is 9.3 dB above the voice on mean level and 2.1 dB above it on peak:
it is the loudest thing in the film by every measure, which is the one audio
rule the brief stated outright.

In the 300–3400 Hz speech band the whisper window (24.65–26.35 s) measures
−25.2 dB mean against −33.0 dB for the ringtone alone just before it. The voice
sits 7.8 dB above the ring where intelligibility lives, without being mixed
louder overall.

## Diff against the 43 s cut

| 43 s cut | 30 s cut | Why |
|---|---|---|
| 1,290 frames / 43.00 s | 900 frames / 30.00 s | Reels reward the tighter cut |
| `lock-screen` 0–179 (6 s), clock 11:47 | 0–89 (3 s), clock 8:47 | Hook, not setup |
| notification `From: Me · received tomorrow, 8:14 AM` | `received TOMORROW, 6:47 AM` | The impossible stamp *is* the image; drop the sender |
| `voice-note` 180–629, 3 transcript lines | 90–629, 6 lines in a 2-line window | The whole message, one line at a time |
| "Sarah, don't go to the bridge tomorrow at 8:15." | — | Backstory, cut |
| "The blue truck — it's already here." | — | Backstory, cut |
| — | `signal-loss` 630–719 | The interruption had no picture before |
| — | `incoming-call` 720–809, caller `ME` | The caller is you; the twist lands on screen |
| `street` 630–899 (9 s), blue truck | — | Cut |
| `reflection` 900–1199 (10 s), door opens, silhouette | — | Cut: the film no longer explains |
| end card "The voicemail was from tomorrow. / So was the voice behind her." | "PART 2: you answer. / would you open the door?" | No resolution; story-native comment bait |
| "New story every night." | — | Generic CTA, replaced |
| silent | full mix | The spec's audio design |

## Assets and rights

- Interface, static, and room: original HTML/CSS/SVG.
- Voice-over: generated text-to-speech, processed in-repo.
- Score: synthesized from FFmpeg signal generators (`audio/build-audio.sh`).
- Font: Inter, SIL Open Font License 1.1, bundled in `assets/fonts`.

## Review notes

- The mix was **measured, not auditioned**. Every level above is a real
  measurement taken from the encoded `final.mp4`; nobody has listened to it end
  to end yet. Levels are not taste.
- Line 6 is cut by a hard trim at 22.15 s, so the word "from" is clipped
  mid-syllable rather than faded — that is the gag, but check it by ear.
- The end card holds roughly 1.3 s of fully-visible text. That is the format,
  but it is the tightest read in the film.
- The three knocks land on a frame with **nothing on it but the disclosure
  chip**: the card is genuinely black for its first 40 frames (27.0–28.33 s),
  and the text arrives as the backdrop lifts behind it.
- Feed audio is usually muted: the captions carry the entire story on their
  own, which is why they are a second layer rather than a transcript.
