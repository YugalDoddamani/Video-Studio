# Motion and Timing

## Motion philosophy

Motion should create tension and guide attention.

Use smooth, controlled movement. A still moment after an alarming message
can be more effective than constant movement.

All animation must be reproducible from the frame number and scene data.

## Timing defaults

- Frame rate: 30 fps.
- Target video length: 30–45 seconds.
- Minimum duration: use only when the story remains understandable.
- Longer durations are acceptable when necessary for reading.

At 30 fps:
- 0.2 seconds = 6 frames.
- 0.5 seconds = 15 frames.
- 1 second = 30 frames.

Use whole frame counts for final timing.

## Standard motions

### Message arrival
- Fade in and move upward slightly.
- Default duration: 8–12 frames.
- Hold still afterward for reading.

### Typing indicator
- Three dots pulse sequentially.
- Use for anticipation, not as filler.
- Default duration: 1–2 seconds.

### Notification
- Slide down from the top of the safe content region.
- Pause long enough to read.
- Optional subtle exit upward.

### Incoming call
- Fade in the call screen.
- Use a slow, restrained pulse around the call icon.
- Avoid flashing or intense screen shake.

### Reveal
- Reveal a message, transcript, image placeholder, or alert in stages.
- Give the viewer time to understand each stage.

### Transition
- Prefer short fades or vertical interface movement.
- Avoid unnecessary spins, zooms, or glitch effects.

## Escalation

Early scenes:
- Calm transitions.
- Normal interface colors.
- Minimal motion.

Middle scenes:
- Slightly faster arrivals.
- Longer pauses before important messages.
- Restrained amber accents.

Final scenes:
- Stronger contrast and an occasional red accent.
- One deliberate reveal.
- Hold the final line long enough to read.

## Readability rule

Do not animate a plot-critical message continuously while it is being read.

Each important text state should have a stable hold.
Preview actual timing rather than relying only on estimated durations.

## Deterministic animation

Use frame-derived time:

    timeSeconds = frameNumber / fps

Animations must depend on explicit scene timing and frame number.

Do not use:
- Real clock time.
- Unseeded randomness.
- Uncontrolled CSS animations.
- Network-dependent content.
