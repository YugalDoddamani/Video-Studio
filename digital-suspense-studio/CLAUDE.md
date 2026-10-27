# Claude Code Instructions

## Project

This project creates fictional digital suspense stories for Instagram Reels.

Stories are told through animated phone interfaces: messages, notifications,
incoming calls, maps, voice notes, system alerts, and other screen-based visuals.

Read the relevant files in `docs/` before implementing or generating anything.

## First-time setup

If the renderer and scripts do not exist:

1. Read all documentation in `docs/`.
2. Inspect the environment and determine which dependencies are available.
3. Build the smallest working end-to-end implementation that follows the docs.
4. Install dependencies only when the environment and user permissions allow it.
5. Create or update the README with the exact commands that actually work.
6. Render a short test and verify the output.
7. Clearly report anything that could not be installed, tested, or rendered.

Do not claim the pipeline is working until an actual render has been verified.

## Creating a video

When the user says "create a video", "create today's video", or similar:

1. Use the supplied topic. If none is supplied, select the first unused topic
   in `topics.md`.
2. Create a unique project folder under `projects/`.
3. Write an original fictional story based on the topic.
4. Save the story, scene plan, and machine-readable video configuration.
5. Create or reuse the necessary components and animations.
6. Generate a preview if possible.
7. Render the final video if the dependencies are available.
8. Perform the checks in `docs/07-quality-and-publishing.md`.
9. Save a caption, hashtags, and a cover suggestion in the project folder.
10. Report the output paths, duration, checks performed, and any limitations.

Only mark a topic as completed after the final video has been generated
and checked. If generation fails, leave it available and explain why.

## Creative defaults

- Genre: fictional digital suspense.
- Format: vertical Instagram Reel.
- Target duration: 30–45 seconds unless the story needs a different length.
- Narrative perspective: a story experienced through a phone screen.
- No realistic character animation is required.
- Every story should have a hook, escalation, twist, and ending.
- Label the story as fiction in the video and publishing caption.
- Keep text readable on a phone.

## Technical defaults

- Resolution: 1080 × 1920.
- Frame rate: 30 fps.
- Render with a headless browser and stitch frames with FFmpeg.
- Animation must be deterministic and driven by frame time.
- Use local assets. Do not depend on network access during rendering.
- Never assume an external AI voice or music service is configured.
- If no approved audio is available, render a silent video and report it.
- Never fabricate quality checks or claim to have viewed an output you did not inspect.

## Working rules

- Reuse components instead of building a new visual system for every video.
- Preserve the established visual style unless the user requests a change.
- Do not overwrite existing project outputs without permission.
- If a topic is vague, make reasonable creative decisions and continue.
- Ask only when a decision is necessary and cannot be safely inferred.
- Follow `docs/07-quality-and-publishing.md` for safety and asset rights.
- Keep implementation simple, documented, and reproducible.

## Expected project output

projects/<video-slug>/
├── story.md
├── scenes.json
├── publishing.md
├── preview/             # Optional preview and inspection images
├── frames/              # Generated frames; may be removed after verification
└── output/
    └── final.mp4
