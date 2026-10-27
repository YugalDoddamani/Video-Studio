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

## Component rules

- Components must use the shared palette and typography.
- Important content must remain in the safe region.
- Components must render predictably at any requested frame.
- Do not use real app logos, private data, or external interface screenshots
  without permission.
- Reuse existing components whenever possible.
