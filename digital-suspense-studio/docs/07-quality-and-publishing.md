# Quality, Safety, and Publishing

## Story checklist

- [ ] The hook is clear.
- [ ] The story can be understood without audio.
- [ ] Each major event advances the story.
- [ ] The twist follows from the setup.
- [ ] The ending has a payoff or intentional cliffhanger.
- [ ] Names and accounts are fictional.
- [ ] The video clearly says "FICTIONAL STORY".
- [ ] The publishing caption says the story is fictional.

## Visual checklist

- [ ] Important text is readable on a phone.
- [ ] Text has sufficient contrast.
- [ ] No text is clipped or hidden behind likely platform overlays.
- [ ] Message order and timestamps make sense.
- [ ] Animations are smooth and not distracting.
- [ ] Important text remains still long enough to read.
- [ ] No blank, broken, or missing-asset frames are visible in sampled checks.
- [ ] The final line remains visible long enough to register.

## Technical checklist

- [ ] MP4 exists and opens.
- [ ] Resolution is 1080 × 1920.
- [ ] Frame rate is 30 fps.
- [ ] Duration matches the scene configuration.
- [ ] Video uses a compatible H.264/yuv420p encoding.
- [ ] Audio, if present, is synchronized and audible.
- [ ] If no audio is present, the user is told.
- [ ] ffprobe results are recorded or summarized.

### If the video has its own mix

- [ ] The mix is reproducible: a script under `projects/<slug>/audio/`
      rebuilds the file from its stems, and the stems are committed.
- [ ] `ffprobe` shows exactly one audio stream, AAC, matching the video
      length (the encoder uses `-shortest`).
- [ ] Levels were measured, not guessed. Record the peak/mean of the
      loudest and quietest window in the render report or `story.md`.
- [ ] The silence at the end is real silence. Digital silence is part of
      the edit, not a missing track — `volumedetect` should read about
      -91 dB, and a platform normaliser must not be allowed to pad it.
- [ ] Say plainly if nobody listened to it. A measured mix is not an
      auditioned mix, and the difference belongs in the report.

Where tools permit, inspect a preview and sample frames throughout the video.
Do not claim a visual review was performed if it was not.

## Asset rights

- Use only assets that are original, appropriately licensed, or supplied by the
  user with permission.
- Record asset sources and licenses in the project when applicable.
- Avoid copyrighted music unless the user has the necessary rights.
- Do not use real people's private messages, photos, or phone numbers.

## Publishing document

Each project must contain `publishing.md` with:

1. Suggested title.
2. Short Instagram caption.
3. Clear fiction disclosure.
4. Three to five relevant, non-misleading hashtags.
5. Suggested cover text and frame.
6. Audio status and asset-rights notes.
7. Any known review issues.

## Final report to user

Report:
- Video path.
- Story and configuration paths.
- Duration, resolution, and frame rate.
- Whether the video contains audio.
- Checks actually performed.
- Any issues requiring human review.

Do not publish to Instagram unless the user explicitly requests it and a
supported, authorized publishing workflow exists.
