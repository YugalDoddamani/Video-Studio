# Visual Style Guide

## Creative direction

Name: Digital Suspense

A cinematic, fictional phone interface with a dark, restrained design.
The interface should feel familiar without copying a specific operating system
or messaging app exactly.

The screen should feel like an active environment, not a slideshow.

## Color palette

Use these as CSS custom properties:

--bg: #080B12;
--surface: #111827;
--surface-raised: #1C2534;
--text-primary: #F5F7FA;
--text-secondary: #A9B4C4;
--accent: #6DB7FF;
--warning: #FFBA5A;
--danger: #FF5C68;
--border: #2A3547;

Usage:
- Backgrounds: near-black and dark blue-gray.
- Primary text: near-white.
- Secondary text: muted gray, but still readable.
- Blue: normal interactive elements and selected highlights.
- Amber: unusual activity and suspense.
- Red: exceptional danger or the final reveal.

Do not fill the screen with red for every suspenseful moment.
Use color sparingly so escalation feels meaningful.

## Typography

Use a locally available sans-serif font.

Suggested stack:
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

If a bundled font is later added, include its license and load it locally.

At 1080 × 1920, starting sizes:
- Main hook: 64–84 px.
- Contact name / scene heading: 52–64 px.
- Message text: 48–58 px.
- Supporting interface labels: 32–40 px.
- Fiction label: at least 36 px.

These are starting points. Adjust based on actual mobile readability.
Avoid body text so small that the plot cannot be read comfortably.

## Layout

The video is 1080 × 1920.

Use a fictional full-screen phone interface rather than a tiny phone mockup
floating inside the frame.

Default content-safe area:
- Keep essential text at least 90 px from the left and right edges.
- Keep essential text at least 250 px below the top.
- Keep essential text at least 320 px above the bottom.

These are conservative design defaults, not guaranteed Instagram safe zones.
Check current platform overlays before publishing.

The main story content belongs in the central safe area.

## Interface details

- Rounded message bubbles with generous padding.
- Clear visual distinction between incoming and outgoing messages.
- Subtle borders and shadows.
- Simple line icons or locally defined SVG icons.
- Restrained status-bar elements.
- Optional subtle background grain, only if deterministic and not distracting.

Do not use official app logos or exact branded interfaces by default.

## Accessibility and readability

- Maintain strong contrast between text and backgrounds.
- Do not communicate plot-critical information through color alone.
- Avoid rapid flashing.
- Avoid text moving while viewers are expected to read it.
- Keep message lines short and use sufficient line spacing.
