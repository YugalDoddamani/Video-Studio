# Story: 2.8 km

## Project details

- **Topic:** `content/topics.md` DS-002 — "Her phone is in her hand, but Find My shows a second device named Me, 2.8 km away, and it is closing."
- **Slug:** `28-km`
- **Target duration:** 30.00 s / 900 frames
- **Fiction disclosure:** `FICTIONAL STORY`, on every scene
- **Audio:** local mix, no voice-over (`audio/build-audio.sh`)

## Premise

Asha is using her phone when Find My lists a device called **Me** — a phone that is not hers, 
in a place she is not. She watches it close the distance, 2.8 km to 3 m, without ever moving.

## Characters

- **Asha:** the only person in the film. She is not seen, she is not heard, and she does not
  speak a word. She is a dot on a map and a row in a list.

## Story structure

### Hook

Frame 1 is the impossible readout: her own blue dot at the centre of a night map, and a grey
pin labelled **Me** three kilometres up the ring road. The distance chip reads `2.8 km`.
The first caption lands with it: *you've got your phone.*

### Setup

Nothing on this screen is broken. The distance falls because the other device is moving. The
device list shows two rows — `Me · iPhone 15 Pro · 2.8 km` and `This iPhone · You are here · now`
— and only one of them can be true.

### Escalation

`1.1 km` → `400 m` → the banner: `Me — Started sharing location` → the map zooms to the floor
→ `3 m`. The pings climb in pitch as the distance falls, and the readout never sits still.

### Twist

At three metres the pin's label stops being **Me** and becomes **ASHA** — the app resolving
which device it has been tracking. Her own blue dot fades out of the map, and the second row
of the sheet stops reporting a location: `No location found / Last updated —`.

### Ending

The map empties: `No devices found`. No epigram, no sequel card, no question. The film stops
on an interface string.

## Why this film exists

The catalogue is five conversations and a door. This one has no sender: no call, no message,
no voice, and no character on screen. It opens the `location` pillar, it is the first film with
no spoken word, and it is the first to end without a two-line card.

The rule that keeps it honest: **the map never lies**. Every number on screen is correct for
what it is tracking. The impossibility is the world, not the software.

## Scene breakdown

### Scene 01 — map (0–390)

- 0.00–3.33 s: `2.8 km`. Her dot at (540, 720) never moves. The pin walks from (900, 600)
  toward the centre. Caption: `you've got your phone.`
- 3.33 s: the chip rolls to `1.1 km` (a countdown, not a cut). Caption: `it's coming this way.`
- 6.67 s: `400 m`. Caption: `you haven't moved.`
- 10.00 s: the notification banner slides down — `Me / Started sharing location` — and the
  chime lands with it. The distance keeps falling underneath it (400 m → 240 m by the cut):
  the app never holds still, and it never contradicts itself. Caption: `it knows where you are.`

### Scene 02 — map (390–810)

- 13.00 s: the map zooms to 1.85× and the countdown runs `400 m → 3 m` in four seconds.
  Caption: `inside the building.`
- 17.00 s: `3 m`. Caption: `three metres.`
- 21.00 s: the label becomes **ASHA** with one frame-accurate flash. Caption: `it has your name.`
- 24.50 s: her dot fades out over 12 frames; the second row goes to `No location found`.
  Caption: `you're not on it.`

### Scene 03 — map, empty (810–900)

- 27.00 s: the streets are gone. `No devices found` / `LAST UPDATED —`. True silence.

## Caption track

Captions are her interior voice, never a transcript, never more than five words, and each one
lands 12 frames (0.40 s) before the beat it belongs to.

| Frame | Text | Beat it precedes |
|---|---|---|
| 0 | you've got your phone. | the film's opening readout |
| 98 | it's coming this way. | `1.1 km` at 100 |
| 198 | you haven't moved. | `400 m` at 200 |
| 288 | it knows where you are. | the banner at 300 |
| 378 | inside the building. | the zoom at 390 |
| 498 | three metres. | `3 m` at 510 |
| 618 | it has your name. | the label flip at 630 |
| 723 | you're not on it. | her dot fading at 735 |

## Sound

No voice at all. Seven pings, each a decaying sine with a noise transient on the front, rising
in pitch from 1100 Hz to 1430 Hz as the distance falls. One two-tone chime at 10.0 s. One
dropout at 24.5 s — a 58 Hz thud under a short static crackle, the loudest moment in the film.
Room tone at −46 dB mean, then nothing: 27.0 s onward is true digital silence.

Measured on the encoded film (window mean / peak):

| Window | Mean | Peak |
|---|---|---|
| 0.0–3.0 hook | −44.1 | −17.9 |
| 3.0–7.0 distance | −42.3 | −17.1 |
| 9.9–11.0 chime | −28.3 | −12.2 |
| 13.9–14.3 ping | −34.7 | −16.1 |
| 24.4–25.4 dropout | −30.2 | −10.5 |
| 27.2–30.0 silence | −91.0 | −91.0 |

## Asset notes

- No external assets. The map, the pins, the sheet and the banner are HTML, CSS and inline SVG.
- Street geometry is generated from a fixed seed, so a rebuild is pixel-identical.
- Font: Inter (SIL Open Font License) bundled in `assets/fonts`.

## Review notes

- [x] Story checklist in `docs/07-quality-and-publishing.md`.
- [x] Growth-readiness gate in `docs/07-quality-and-publishing.md` (topic ID, pillar, hook type,
      ending type, one CTA, hypothesis, no performance claim).
- [ ] Human listen of the mix — levels are measured, not auditioned.
