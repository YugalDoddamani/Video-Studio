# Components and Scene Types

## Required reusable components

Build the smallest reusable components necessary for the first story.
Add more when a story genuinely needs them.

### PhoneShell
Full-screen fictional device interface.

Inputs:
- Header title.
- Optional status information.
- Scene content.

### MessageThread
A conversation containing incoming and outgoing messages.

Inputs:
- Contact name.
- Ordered messages.
- Message direction.
- Message text.
- Appearance frame.
- Optional delivery status.

### TypingIndicator
Animated three-dot typing state.

Inputs:
- Start frame.
- End frame.
- Position in the conversation.

### NotificationCard
A system-style notification.

Inputs:
- App label.
- Heading.
- Body.
- Appearance and disappearance frames.
- Optional warning state.

### IncomingCall
A fictional incoming call screen.

Inputs:
- Caller name.
- Optional subtitle.
- Call state.
- Timing.

### VoiceNote
A message with a waveform and optional transcript.

Inputs:
- Sender.
- Duration label.
- Transcript.
- Timing.

The waveform can be decorative when no actual voice audio is included.
Do not imply a viewer can hear speech if the video is silent.

### SystemAlert
An in-story warning or confirmation.

Inputs:
- Heading.
- Body.
- Severity.
- Timing.

### FictionLabel
A clear label stating "FICTIONAL STORY".

Inputs:
- Appearance time.
- Duration.

### EndCard
A short ending or final story line.

Inputs:
- Final line.
- Optional fiction label.
- Optional unobtrusive follow prompt.

## Optional future components

- Fictional map and location marker.
- Shared notes screen.
- Photo viewer with locally created images.
- Calendar reminder.
- Delivery tracker.
- Lock screen.
- Search history.
- Email inbox.

## Scene types

1. Opening hook
2. Message conversation
3. Notification or alert
4. Incoming call
5. Voice note or transcript
6. Reveal
7. Final payoff / end card

A story does not need every scene type.

## Implemented registry

The code lives in `src/stage/components.js` and `src/stage/scenes.js`.

Components: `StatusBar`, `NotificationCard`, `MessageThread`, `Bubble`,
`ThreadSeparator`, `ThreadSystem`, `TypingIndicator`, `IncomingCall`,
`Waveform`, `Transcript`, `VoiceNote`, `SystemAlert`, `FictionLabel`,
`EndCard`, `CaptionLayer`, plus three scene extensions: `PhotoCard`,
`RainyStreet`, and `PhoneReflection`.

### Caption layer

Captions are a **project-level** layer, not a scene property, because one card
often has to outlive the scene it started in:

```json
"captions": [
  { "text": "this voicemail is from TOMORROW", "atFrame": 0, "durationFrames": 84 },
  { "text": "tomorrow already happened.", "atFrame": 155, "durationFrames": 129 }
]
```

- `atFrame` is a **global** frame, not scene-local. The stage paints the layer
  above every scene, so a card can run from a player into a scene cut.
- Cards render in a fixed band at `top: 1180px`, above the disclosure chip and
  below the story content, so a reader never has to hunt for the text.
- `atFrame: 0` means **already on screen**, with no fade: the first frame of a
  film is the frame a feed shows before play, so the hook cannot animate in.
  The same rule applies to a lock screen's notification and its highlighted
  word, and for the same reason.
- Only live cards render, and a card's first/last `fadeFrames` (default 5) are
  a fade in/out. Contiguous cards hand over on the frame boundary.
- Any all-caps or numeric token is tinted with `--warning`: `TOMORROW`,
  `3 KNOCKS`, `9PM`. Everything else stays quiet. The rule is in
  `Components.isHotToken`.
- `validate` warns when a card is longer than five words, overlaps the previous
  card, runs past the end of the film, or repeats a line of dialogue verbatim.
  Captions are a second narrator, not subtitles.

### Windowed transcript

`Transcript` accepts `window: N` to keep only the N most recently started
lines. The card has a fixed height and stacks from the bottom, so a new line
pushes the previous one up instead of resizing the player mid-sentence — the
story stays still while the words move. Omit `window` to keep the original
behaviour of rendering every line.

### End card extras

- `blackoutFrames: N` renders nothing at all for the first N frames, so a
  "cut to black" is actually black rather than the house backdrop gradient.
  The backdrop then fades up as the card arrives.
- `ruleAtFrame` delays the accent rule; `arrow: true` with `arrowAtFrame` adds
  the vector down-arrow used for comment-bait CTAs. It is drawn, not typed:
  the stage ships Inter only, so an emoji would render as a tofu box.

### Conversation rows

`messageThread` accepts rows of three kinds, all timed with scene-local
`atFrame` values:

| `kind` | Renders |
| --- | --- |
| *(default)* | A chat bubble; `from: "me"` right-aligns it |
| `separator` | A centred time marker, e.g. "Today 8:41 PM" |
| `system` | A centred event chip, e.g. a missed call (`icon: "call"`) |

Bubbles may carry `attachment: { label }` to render a photo preview inline, and
every row springs in on arrival. Rows collapse upward from the bottom of the
frame, the way a chat client behaves, and the disclosure chip is a layout row
beneath them so it can never cover story content.

### Transitions

Any scene may declare a cross-fade into itself:

```json
"transition": { "type": "fade", "durationFrames": 12 }
```

The stage holds the previous scene's final frame underneath and fades the new
scene in over it. Only `fade` is supported; unknown or zero-length transitions
are ignored during normalisation.

Scene types and the components they compose:

| Scene type | Composition |
| --- | --- |
| `lock-screen` | StatusBar + clock + NotificationCard + FictionLabel; `darkRoom` adds a room behind it and `wake` brings the screen and the room up together |
| `notification` | StatusBar + NotificationCard (+ optional SystemAlert) |
| `voice-note` | AppHeader + VoiceNote (Waveform + Transcript) |
| `incoming-call` | IncomingCall |
| `message-thread` | AppHeader + MessageThread (bubbles, separators, system rows, attachments, TypingIndicator) |
| `photo-viewer` | AppHeader + PhotoCard (a photo opened full screen from a chat) |
| `signal-loss` | A dying picture: torn bands, seeded snow, scanlines, hard cut to black |
| `video-call` | CallView: camera feed of a door, self-view, name/timer, three call buttons |
| `hallway` | HallView: a CSS corridor with a lit doorway, a figure and a lens cover |
| `recorder` | Recorder: the screen that is leaving the message, timer + level meter |
| `system-alert` | SystemAlert |
| `street` | RainyStreet |
| `reflection` | PhoneReflection |
| `end-card` | EndCard + FictionLabel |

Every renderer is a pure function of `(scene, frameState)`. A component receives
plain props and returns an HTML string; it is never allowed to read the clock,
`Math.random`, or the network. This is what `npm run determinism` verifies.

### signal-loss

The picture dies while the audio is still talking. `data.loss` drives the
phases: `atFrame` (tearing starts), `tearFrames`, `snowAtFrame`, `snowFrames`,
`blackFrames`.

```json
"loss": { "atFrame": 3, "tearFrames": 20, "snowAtFrame": 14, "snowFrames": 20, "blackFrames": 6 }
```

The noise is a pure function of `(seed, frame)` — 20 displaced picture bands
and 170 bright dashes regenerated every frame — so the static never repeats on
screen but is byte-identical on a re-render. The disclosure chip is layered
above the snow: the label is a promise, not decoration.

### video-call

A call that has already been answered. The feed is a phone pointed at a door:
wall, floor, door leaf, two panels, a handle and the strip of light underneath
it. The self-view is the person holding the phone, and the chrome is a name, a
timer and three buttons.

```json
"data": {
  "caller": "Me", "callerSubtitle": "your number", "timerStartSeconds": 4,
  "zoom": 0.86, "zoomTo": 1.02,
  "strip": { "outAtFrame": 9999 },
  "pip": { "doorAtFrame": 78, "doorFrames": 35 }
}
```

- `zoom` / `zoomTo` push the camera in over the scene. The world scales about
  the floor line (`transform-origin: 50% 1120px`), so pushing in keeps the strip
  of light where it is — which is how a real camera behaves and what makes the
  wide-to-close cut read as one continuous shot.
- `strip.outAtFrame` cuts the light under the door. The moment it goes out the
  camera gain comes up (`.feed__glow`), which is the only reason the door is
  still visible afterwards.
- `pip.doorAtFrame` opens the door in the self-view: the gap widens and lights
  up behind the silhouette.
- The camera drifts on two slow sines of the frame number, so it is hand-held
  but byte-identical on a re-render.
- `signal-loss` can tear this scene instead of its default player by setting
  `"picture": "call"` and passing a `call` object — a dying call keeps its
  chrome and its self-view, which is the point.

### hallway

The same call chrome as `video-call`, but the feed is inside the house: a
corridor seen straight on, a lit doorway at the far end, and someone standing in
it with a phone at their ear.

```json
"data": {
  "zoom": 1, "zoomTo": 1.55, "originY": 1200,
  "doorOpen": 0.55, "lamp": 0.8, "phoneGlow": 0.9,
  "figure": { "scale": 0.5, "scaleTo": 2.6, "y": 0, "yTo": 520, "blur": 0, "blurTo": 7 },
  "cover": { "atFrame": 56, "frames": 26 },
  "call": { "caller": "You", "callerSubtitle": "your number", "timerStartSeconds": 31 }
}
```

- The corridor is four `clip-path` polygons meeting at the same four corners, so
  the walls converge without a transform. Camera push-in scales the world about
  `originY` (the floor line), which is why the doorway stays planted.
- `figure.scale` / `scaleTo` and `y` / `yTo` walk the person towards the lens;
  `blur` / `blurTo` is the phone failing to focus as they arrive. Without the
  blur a flat silhouette reads as a diagram once it fills half the frame.
- `cover.atFrame` closes a palm over the lens. The picture goes before the sound
  does — put the loudest hit in the mix on that frame.
- `tilt` (degrees) rotates the whole feed for a phone lying on a floor. The
  component scales the feed by `1 + |tilt|/90 * 1.02` so the rotation never
  exposes the stage behind it at the corners.
- `call` is optional: leave it out and you have a camera, not a call.

### recorder

The other half of the voicemail — the screen you would be looking at while the
message that arrives tomorrow is being left today.

```json
"data": { "statusTime": "9:05", "label": "NEW VOICEMAIL", "to": "to: Me", "startSeconds": 0 }
```

The timer counts in tenths, the 56 bars are seeded per project and modulated by
the frame number, so the meter moves but a re-render is byte-identical.

### Adding a scene type

1. Write a `renderX(scene, state)` function in `src/stage/scenes.js`.
2. Register it in the `SCENES` map with a human-readable label.
3. Add styles to `src/stage/style.css`.
4. Add it to the gallery config in `src/lib/gallery.js`.
5. Run `npm run gallery` and look at the result.

## Component rules

- Components must use the shared palette and typography.
- Important content must remain in the safe region.
- Components must render predictably at any requested frame.
- Do not use real app logos, private data, or external interface screenshots
  without permission.
- Reuse existing components whenever possible.
