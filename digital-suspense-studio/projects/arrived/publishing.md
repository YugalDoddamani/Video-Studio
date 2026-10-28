# Publishing — Arrived (60 s)

Nothing here has been posted. This file is the package for the day someone does.

## Title

**Arrived**

Alternates, in order of preference:

1. **Arrived** — one word, and it is the lie the whole film hangs on.
2. **My phone says I got home at 23:11. I'm still walking.** — longer, but survives a muted feed.
3. **2.8 km** — the number, if this is posted alongside the earlier cuts.

## Cover

Frame 300: the Find My map with `2.8 km` on the chip, the pin labelled **Me** sitting on the
house marked **Home**, and her blue dot nowhere near it. Cover text: **it says you're home**
(four words). Keep the `FICTIONAL STORY` chip in the crop.

Frame 1420 is the stronger image but it is the ending: the sheet printing `3 m` twice gives away
that the two devices meet. Do not use it as a cover.

## Caption

> My phone says I got home at 23:11. I'm still walking.
>
> Then Find My shows a second phone in my flat, with my name on it.
>
> Where would you go?
>
> (Fictional story. Invented street, invented devices, invented night.)

The question is real, not rhetorical: the film answers it, and the comments are for people who
would have turned round.

## Hashtags

`#fictionalshortstory` `#horrorstory` `#suspense` `#digitalhorror` `#storytime`

## Disclosure

Every frame carries `FICTIONAL STORY`. Nothing here is presented as a real event or a real app
behaviour. The flat, the street, the camera and the devices are invented. The voice is synthetic.

## Audio status

Sound on. Original mix built in `audio/build-audio.sh` from eight voice-over takes and FFmpeg
signal generators: room tone, three blips under the zoom, one relay click as the camera opens,
two low blips as the pin closes, one sub hit at the arrival, one hollow tone for the empty hall.
No licensed music, no samples, nothing to clear. If a platform asks for a sound credit:
"original score and narration".

The final 2.5 s is near-silence on purpose, and the last 0.6 s fades to digital black. Do not let
a platform normalise or pad it; the corridor and then nothing is the ending.

## Sound-off check

The film has to work muted before it is posted:

- [x] Frame 1 reads as a contradiction without sound: `23:12` and `You arrived at 23:11`.
- [x] The map states the geography in one look: a house marked **Home**, a pin called **Me** on it,
      a blue dot 2.8 km away, and the number on the chip.
- [x] The camera feed is labelled `CAM 02 · HALL`, so the corridor cannot be mistaken for a room
      she is standing in.
- [x] The device sheet prints the same distance for both devices at the end. A muted viewer sees
      the two rows agree.
- [x] No line of narration carries a fact the picture does not show.

## Asset rights

- Interface, map, corridor and camera chrome: original HTML/CSS/SVG, generated at frame time.
- Map geometry: procedural, seeded, deterministic — no map data, no tiles, no third-party service.
- Voice-over: synthetic, generated for this project.
- Score: synthesized with FFmpeg signal generators; see `audio/build-audio.sh`.
- Font: Inter, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).

## Known review issues

- [ ] The mix has been measured, not auditioned. No human has listened to it end to end.
- [ ] The map is a stylised city, not a real place: no street names, no landmarks. Deliberate, but
      it means the geography is carried by the house glyph and the dots, not by the map itself.
- [ ] The figure in the corridor is a silhouette with no face and no coat detail. Check that it
      reads as a person at phone size and not as a doorway.
- [ ] The two hallway shots differ only in scale and door position. Check that the cut between them
      reads as time passing and not as a jump cut.
