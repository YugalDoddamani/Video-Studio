# Digital Suspense Studio

A Claude Code project for generating fictional phone-screen suspense stories
as vertical Instagram Reels.

## What a video looks like

A story unfolds through animated messages, calls, notifications, voice notes,
and other fictional phone interface elements.

The system uses HTML, CSS, and browser rendering to generate frames, then uses
FFmpeg to stitch those frames into a video.

## Requirements

Expected requirements:

- VS Code
- Claude Code
- Node.js and npm
- FFmpeg and ffprobe available on the command line
- A browser installed through the chosen browser automation tool
- Enough disk space for rendered frames

The implementation and exact installation commands will be added here after
Claude Code builds and tests the pipeline.

## First-time setup

Open this folder in VS Code, start Claude Code, and type:

> Read CLAUDE.md and the docs. Build the first working version of this
> digital suspense video pipeline. Create a short test story, render it,
> and verify the output. Update this README with the exact setup and commands.

Claude may need permission to install packages or run commands.

## Generate a video from a topic

Ask Claude Code:

> Create today's video: A woman receives a voicemail from tomorrow.

Or ask it to select an unused topic:

> Pick the next unused topic from topics.md and create the video.

## Outputs

Each video has its own folder in `projects/`, containing:

- The written story
- The scene configuration
- Preview images, when generated
- The final MP4
- A suggested Instagram caption and cover

## Audio

Audio is optional in the first version.

If approved local sound effects or music are available, Claude may use them.
If not, the system creates a silent video and reports that clearly.

## Fiction disclosure

Stories must be clearly labeled as fiction in both the video and caption.
Do not present fictional messages or events as real evidence.

## Important

The documentation defines the system, but the actual renderer must be built
and tested before video generation works.
