# Project and Workflow

## Purpose

Create short, original fictional suspense stories using animated digital
interfaces rather than character animation or live-action footage.

The project should turn a topic into a publishable-looking draft with minimal
manual work, while preserving an opportunity for human review.

## Audience and platform

- Primary platform: Instagram Reels.
- Primary viewing device: a phone.
- Primary format: vertical video.
- Stories must work without requiring the viewer to hear audio.
- On-screen text carries the plot; sound adds atmosphere when available.

## Standard workflow

1. Receive a topic from the user or select one from `topics.md`.
2. Develop a short fictional premise.
3. Write the story in the format defined in `02-story-and-writing.md`.
4. Convert the story into timed scenes using reusable components.
5. Save the machine-readable scene configuration.
6. Render selected preview frames and, if practical, a low-resolution preview.
7. Inspect readability, visual consistency, timing, and clipping.
8. Render the final video.
9. Run the technical and editorial checks.
10. Save publishing copy and report all output paths.

## Human review

The generated video is a draft until the user reviews it.

The user should review:
- The story and ending.
- Text readability and pacing.
- Whether audio is appropriate and licensed.
- Whether the final video accurately says it is fictional.

## Standard project folder

projects/<slug>/
- story.md: premise, script, scene breakdown, and creative notes.
- scenes.json: exact scene timing, visual content, and audio references.
- publishing.md: caption, hashtags, cover idea, and fiction disclosure.
- preview/: sampled frames and optional preview video.
- frames/: numbered rendered frames.
- output/final.mp4: final video.

A slug should be lowercase, use hyphens, and be unique.
If the slug already exists, append a number rather than overwrite it.

## Success criteria

A successful run produces:
- A coherent fictional story with a clear ending.
- A readable vertical MP4.
- Correct duration and frame rate.
- No missing assets, clipped text, or blank frames.
- A publishing document.
- An honest report of checks performed and any missing audio or limitations.
