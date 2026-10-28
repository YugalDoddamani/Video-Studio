# Publishing: You Answer (part 2)

## Suggested title

You answered.

## Caption

you picked up. it's your number calling, and the camera is pointed at your own
front door — from the outside.

you're inside. you locked it from there.

look at the small picture, top right.

(FICTIONAL STORY — invented characters, invented number, invented night.)

## Disclosure

This is a work of fiction. All names, accounts, numbers and events are
invented. The voice is synthetic. Part 1 is in the same folder series
(`voicemail-from-tomorrow-30s`); post it first if you want the callback to land.

## Hashtags

#fiction #suspense #shortstory #digitalhorror #reels #creepy #part2

## Cover

- Frame: 620 (the self-view with the door open behind the silhouette) — the
  only frame that explains the film after you have seen it twice.
- Cover text: under 6 words — "look at the small picture".

## Audio status

Sound on. Full mix: voice, room tone, phone-line hiss, a switch, one static
burst, three knocks and a latch. No licensed music, nothing to clear.

The last 1.8 s is digital silence on purpose. Do not let a platform normalise
or pad it; the latch → silence → text is the ending.

The phone-line hiss between 22 and 26 seconds is a deliberate choice: the
picture has died but the call has not. It is removed at 26.0 s, which is the
sound of the line dropping.

## Sound-off check

The captions carry the plot without audio: `you picked up` → `your number,
your hallway` → `but you're inside` → `you locked it from inside` → `the small
picture, top right` → `it's your back` → `don't turn around`. A muted viewer gets the whole twist; what
they lose is the timing of the knocks.

## Asset rights

- Interface, corridor, door, silhouettes: original HTML/CSS/SVG.
- Voice-over: generated text-to-speech, processed in-repo. Line 1 is the same
  audio file as part 1.
- Score: synthesized with FFmpeg signal generators; see `audio/build-audio.sh`.
  No samples used.
- Font: Inter, SIL Open Font License 1.1.

## Known review issues

- [ ] Listen to the mix end to end (levels were measured, not auditioned).
- [ ] Check that the light going out at 0:15.4 reads as a beat and not as a
      dropped frame.
- [ ] Confirm the self-view is legible on a phone at arm's length — it is 280 px
      wide on a 1080 px canvas.
- [ ] Check how the 3 s of black before the end card feels on a platform that
      auto-plays with sound off.
