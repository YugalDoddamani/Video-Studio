# Story Topics

Claude should select the first unchecked topic when asked to choose a topic.

Only check a topic after a final video has been rendered and verified.
Add new topics whenever needed.

## Ready to generate

- [x] A woman receives a voicemail from tomorrow.
- [x] Someone receives a text from their own number: "Don't open the door."
- [ ] A stranger sends a photo taken inside the recipient's locked apartment.
- [ ] A phone starts receiving messages from a group chat that does not exist.
- [ ] A lost phone's location moves closer even though it is beside its owner.
- [ ] A delivery app says a package has arrived, but the tracking photo shows
      the recipient asleep.
- [ ] Someone receives a calendar reminder for an event they never created:
      "Last chance to leave."
- [ ] A smart doorbell records a visitor, but the live camera shows nobody.
- [ ] A contact who has been offline for years starts typing.
- [ ] A phone receives a low-battery warning for a device its owner does not own.
- [ ] A voice note plays a conversation that has not happened yet.
- [ ] A person keeps getting screenshots of messages before they send them.
- [ ] A navigation app starts giving directions to a place called "HOME",
      but the route does not lead home.
- [ ] A phone's photo memories show pictures from tomorrow.
- [ ] A stranger asks for help through a shared notes app, then the note changes
      while the owner watches.

## Completed

| Topic | Project folder | Completed |
| --- | --- | --- |
| A woman receives a voicemail from tomorrow. | `projects/voicemail-from-tomorrow/` | 2026-10-27 |
| A woman receives a voicemail from tomorrow. *(30s revision, with sound)* | `projects/voicemail-from-tomorrow-30s/` | 2026-10-28 |
| A woman receives a voicemail from tomorrow. *(part 2 — "You Answer")* | `projects/you-answer/` | 2026-10-28 |
| A woman receives a voicemail from tomorrow. *(part 3 — "It's Inside")* | `projects/its-inside/` | 2026-10-28 |
| A woman receives a voicemail from tomorrow. *(part 4 — "It Was You", the finale)* | `projects/it-was-you/` | 2026-10-28 |
| Someone receives a text from their own number: "Don't open the door." | `projects/dont-open-the-door/` | 2026-10-28 |

Only mark a topic complete once `output/final.mp4` exists and `npm run verify`
passes for that project.
