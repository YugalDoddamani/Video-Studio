# Video Studio: Content Strategy, Audience Growth, and Agent Operating Guide

> **Purpose:** This document is an operating brief for the AI agent that creates content for the Video Studio repository. It defines the channel direction, topic system, story standards, audience interaction strategy, publishing workflow, measurement system, and improvement roadmap.
>
> **Repository:** https://github.com/YugalDoddamani/Video-Studio  
> **Working directory:** `digital-suspense-studio/`  
> **Primary content format:** Fictional digital-suspense stories for vertical short-form video.
>
> **Important:** This is a content and growth strategy. Do not rewrite the renderer, publish automatically, or introduce new dependencies unless explicitly asked. Preserve the existing production pipeline and safety checks.

---

## 1. Executive direction

### 1.1 What the channel is

Create short, fictional digital-horror and suspense stories that unfold through familiar digital interfaces: text messages, missed calls, voicemails, lock screens, location sharing, photo galleries, smart-home notifications, calendars, delivery apps, video calls, and other everyday technologies.

The audience should feel that an ordinary digital experience has become impossible, personal, or threatening.

**Core promise:** *Your phone knows something it shouldn't.*

This is a positioning direction, not mandatory on-screen copy. Test alternative channel taglines before committing to one permanently.

### 1.2 What makes the concept distinctive

The channel should not become a generic collection of scary stories with unrelated visuals. Its recognizable format is the story being experienced through a phone or digital interface. That provides:

- An immediately understandable visual language.
- A practical way to create stories without expensive live-action production.
- A natural fit for vertical video and sound-off viewing.
- Repeatable visual components without making every story identical.
- Opportunities for recurring characters, objects, mysteries, and story arcs.
- A recognizable series that viewers can identify in a crowded feed.

### 1.3 Primary strategic objective

Build a sustainable, recognizable short-form fiction channel by improving these outcomes in order:

1. **Stop the scroll:** viewers understand the unsettling premise immediately.
2. **Hold attention:** each beat adds information, tension, or a new question.
3. **Deliver a payoff:** the ending feels earned, surprising, or deliberately unresolved.
4. **Create participation:** viewers have a specific reason to comment, rewatch, share, or follow.
5. **Build return viewing:** stories connect through recurring formats, sequels, or a larger mystery.
6. **Learn from evidence:** actual audience behaviour determines what to make next.

Do not optimize only for views. A video can receive impressions but fail to retain viewers, generate meaningful interaction, or bring people back.

---

## 2. Repository assessment

This assessment is based on the repository's README, `digital-suspense-studio/CLAUDE.md`, `topics.md`, the quality/publishing guide, and selected existing `publishing.md` records. Treat this as a strategic review of the visible project documentation, not a full code-level audit of every renderer file.

### 2.1 Existing strengths to preserve

- **Clear niche:** fictional digital suspense told through screens and notifications.
- **Reproducible production:** a topic becomes a story, scene configuration, rendered frames, and a final MP4.
- **Reusable scene vocabulary:** lock screens, message threads, incoming calls, voice notes, photo viewers, signal loss, video calls, street scenes, reflections, system alerts, and end cards.
- **Agent workflow:** the existing `CLAUDE.md` already defines how to create a project, preview it, render it, verify it, and write publishing metadata.
- **Visual verification:** preview/contact-sheet checks and safe-area/layout checks exist.
- **Technical verification:** the pipeline records rendering details and supports verification and deterministic rendering.
- **Fiction and asset safeguards:** the project already requires fictional disclosure, invented accounts/numbers, rights-aware assets, and human review before publishing.
- **Topic tracking:** `topics.md` separates ready-to-generate topics from completed projects.
- **Series potential:** the existing “voicemail from tomorrow” and “you answer” projects show that connected stories are possible.

Do not replace these strengths with a generic AI content workflow.

### 2.2 Gaps that matter most for growth

1. **The topic backlog is premise-led, not audience-led.** It lists ideas, but does not track the emotional trigger, subgenre, hook, expected payoff, audience question, series potential, production cost, or actual performance.
2. **There is no documented content portfolio.** The system does not define how much content should explore different suspense subgenres or how to prevent repetition.
3. **Publishing metadata is not yet a learning system.** A caption and hashtags are useful, but they do not record the hypothesis behind a post or its results.
4. **The comment strategy is underdeveloped.** Each story should have a natural, non-forced way to invite a viewer response.
5. **Series relationships need structure.** A sequel should be understandable to a new viewer while rewarding returning viewers.
6. **Platform adaptations are not explicitly planned.** A master 9:16 export can be reused, but titles, captions, covers, descriptions, and calls to action should be reviewed for each platform.
7. **The existing checklist is mainly technical and editorial.** Add a separate growth-readiness checklist without weakening technical or safety requirements.
8. **Audio review needs a reliable human step.** Some publishing notes explicitly identify mixes that were measured but not auditioned. Measurement is not a substitute for listening.
9. **No analytics feedback loop is defined.** The agent needs a way to use retention, completion, rewatch, shares, saves, comments, and follows when those data are available.
10. **The visual format could become repetitive.** Reuse the design system, but vary story mechanics, pacing, reveal patterns, sound, and interface types.

### 2.3 Priorities

| Priority | Improvement | Why it matters |
|---|---|---|
| P0 | Topic metadata and scoring | Improves the quality and variety of ideas before production begins |
| P0 | Stronger story and hook criteria | The story itself is the primary product |
| P0 | Fiction disclosure and trust checks | Prevents misleading presentation and protects audience trust |
| P0 | Publishing record and analytics log | Creates a measurable learning loop |
| P1 | Series and sequel map | Encourages repeat viewing without making every story a cliffhanger |
| P1 | Platform-specific packaging | Makes one master story easier to adapt responsibly |
| P1 | Comment prompts and response rules | Gives viewers a reason to participate |
| P1 | Sound and mobile-readability review | Protects the experience on real devices |
| P2 | More scene types and rendering features | Add only when a story concept cannot be expressed well with existing components |
| P2 | Automated analytics integrations | Consider after a consistent manual tracking process is working |

---

## 3. Positioning, niche, and audience

### 3.1 Core niche

**Primary niche:** fictional digital horror / digital suspense / technology-mediated microfiction.

**Supporting flavours:** psychological suspense, mystery, uncanny technology, surveillance anxiety, unreliable messages, time anomalies, and domestic suspense.

These are creative categories, not claims about real devices or real events.

### 3.2 Initial audience hypotheses

Do not assume demographics without evidence. Begin by testing content appeal among people who enjoy:

- Short horror and suspense fiction.
- Creepy stories with a twist.
- Mystery and “notice the detail” videos.
- Phone-screen storytelling and chat-based narratives.
- Connected episodes and recurring mysteries.
- Stories that invite interpretation or prediction.

Treat these as audience hypotheses, not established facts about followers.

### 3.3 Content pillars

Use the following pillars to keep the channel coherent while creating variety.

| Pillar | Story engine | Example premise |
|---|---|---|
| Messages from the impossible | A message arrives from the wrong time, identity, or place | A reply appears before the original message is sent |
| Home and personal-space intrusion | A familiar device reveals an impossible presence | A doorbell records someone standing inside the locked house |
| Identity and impersonation | The protagonist's number, account, voice, or digital identity behaves independently | A message arrives from the protagonist's number while their phone is offline |
| Time and prediction | A device shows a future event or a record that should not exist yet | A calendar alert warns about an event that has not been created |
| Location and navigation | A map or location service reveals an impossible movement | A shared location approaches while the person is physically beside the protagonist |
| Digital memory | Photos, recordings, backups, or histories change meaning | A photo memory contains a detail that was not there yesterday |
| Connected-system mystery | Separate apps or devices reveal a common hidden pattern | A delivery alert, camera notification, and calendar event share the same impossible timestamp |
| Audience-choice experiments | The viewer is asked to interpret evidence or choose between plausible actions | Two screenshots suggest different explanations for the same event |

Start with the first six as the main creative pool. Use connected-system mysteries and audience-choice experiments selectively so they feel like meaningful formats rather than gimmicks.

### 3.4 Content mix for the first 20 posts

Use this as a starting experiment, not a permanent algorithm rule:

- 5 message/identity stories.
- 4 home/security stories.
- 3 time/prediction stories.
- 3 location/navigation stories.
- 3 digital-memory stories.
- 2 connected-system or audience-choice experiments.

After 20 posts, compare performance by pillar and story mechanic. Shift the mix based on evidence while retaining enough variety to avoid premature conclusions.

---

## 4. The topic system: turn `topics.md` into an editorial backlog

Keep `topics.md` as the quick human-readable list, but add a structured topic record for each serious candidate. The initial system can remain Markdown; a database is not required.

### 4.1 Required fields for every topic

Each candidate should include:

- **ID:** stable unique identifier such as `DS-001`.
- **Working title:** descriptive, not necessarily the final video title.
- **Premise:** one sentence describing what happens.
- **Pillar:** one of the content pillars.
- **Subgenre / emotion:** e.g. identity, intrusion, anticipation, dread, paranoia, curiosity.
- **Hook:** the first visual or line that makes the premise clear.
- **Central question:** what the viewer wants answered.
- **Escalation:** how the situation becomes more consequential.
- **Reveal / payoff:** what changes the viewer's understanding.
- **Ending type:** resolved, twist, ambiguous, or sequel bridge.
- **Participation angle:** a genuine question, clue, prediction, or choice.
- **Series link:** standalone, sequel, prequel, recurring character, or shared universe.
- **Freshness note:** how it differs from existing stories.
- **Production needs:** existing scene types, audio, custom visual, or proposed new scene type.
- **Platform packaging idea:** possible cover image or opening frame.
- **Status:** idea, shortlisted, scripted, in production, rendered, reviewed, published, measured, or retired.
- **Results:** post URL, publication date, and available metrics once published.

### 4.2 Topic scoring

Score each candidate from 1 to 5 on:

1. Hook clarity: can the premise be understood immediately?
2. Curiosity: does it create a strong question?
3. Visual readability: can the key information be communicated through the existing screen-based style?
4. Payoff potential: can it deliver a satisfying reveal?
5. Originality within this channel: does it avoid repeating a recent story?
6. Participation: is there a natural reason to comment or rewatch?
7. Production feasibility: can it be executed well with the current renderer and available assets?

Use a weighted score:

- Hook clarity: 20%
- Curiosity: 20%
- Payoff potential: 20%
- Originality: 15%
- Visual readability: 10%
- Participation: 10%
- Production feasibility: 5%

Formula: `score = sum((rating / 5) * weight)` where weights total 100. Record the score out of 100.

**Decision guidance:**
- 80–100: shortlist for production.
- 65–79: improve the premise or story mechanism before production.
- Below 65: hold, combine with a stronger idea, or retire.

These thresholds are editorial heuristics, not predictive performance guarantees. The score should help compare ideas, not override creative judgement.

### 4.3 Novelty check before scripting

Before developing a topic, the agent must compare it against:

- Existing items in `topics.md`.
- Existing project titles and premises.
- The last 5–10 published stories, when publication records exist.
- Repeated devices, such as messages from one's own number, future timestamps, a photo of the protagonist, and warnings about a door.

If an idea resembles an existing story, change at least two of the following: the mechanism, protagonist's goal, source of evidence, emotional tension, reveal, or ending. A new notification on its own does not make a new story.

### 4.4 Topic lifecycle

Use one clear state per topic:

`idea → shortlisted → scripted → in-production → rendered → reviewed → published → measured`

A topic is not complete merely because a script or MP4 exists.

- Mark `rendered` only when output exists and technical verification passes.
- Mark `reviewed` only after visual review and required audio review.
- Mark `published` only after a human confirms the actual post URL/date.
- Mark `measured` only after recording the metrics available at the agreed review point.
- Keep retired topics with a reason. Do not silently delete useful learning.

Never claim that a video was published, received engagement, or performed well without evidence.

---

## 5. Story design standards

### 5.1 Recommended story structure

For a 30–45 second story, use this as a flexible pacing model:

1. **0–2 seconds: Immediate hook.** Show the impossible or unsettling detail, not a long introduction.
2. **2–8 seconds: Context.** Establish what the protagonist expected and why the event is wrong.
3. **8–20 seconds: Escalation.** Each new notification, reply, image, or action changes the situation.
4. **20–32 seconds: Reinterpretation.** Reveal evidence that makes the viewer rethink what they saw.
5. **Final seconds: Payoff.** Deliver a twist, consequence, or carefully chosen unresolved question.

For a 30-second film, compress the beats. For a 45-second film, allow breathing room only when it increases tension. Do not stretch scenes simply to hit a target duration.

### 5.2 The first frame must work without context

The opening should show a specific event or contradiction. Avoid:

- Generic “Have you ever…” introductions.
- Long title cards before the story begins.
- Explanations of the premise before the viewer sees evidence.
- Fake breaking-news framing or claims that a fictional incident is real.
- A hook that promises a reveal the story never delivers.

Examples of hook shapes, not scripts to reuse verbatim:

- A timestamp is dated tomorrow.
- A familiar contact is typing from an impossible account.
- A doorbell alert shows a person who should be elsewhere.
- A location dot moves while the phone is physically present.
- A voice note contains a reply to a question nobody has asked yet.

### 5.3 Escalation must add information

Every major beat should do at least one of the following:

- Increase the apparent risk.
- Narrow the protagonist's options.
- Reveal a new piece of evidence.
- Contradict a previously accepted fact.
- Change who the viewer believes is in control.
- Reframe an earlier detail.

Do not use repeated notifications, arbitrary glitches, or loud sound effects as substitutes for story progression.

### 5.4 Endings and cliffhangers

Vary ending types:

- **Closed twist:** the central question is answered in an unexpected way.
- **Consequential reveal:** the protagonist now faces a clear new problem.
- **Ambiguous ending:** evidence supports more than one interpretation.
- **Sequel bridge:** one mystery is resolved while a new one is introduced.
- **Audience interpretation:** the evidence is complete enough for viewers to debate what it means.

Do not end every video on a cliffhanger. If every story refuses to pay off, the audience may stop trusting the format.

A sequel must reward viewers who watched the previous part, but it should include enough context that a new viewer can understand the immediate conflict.

### 5.5 Sound and sound-off design

- The story must remain understandable with audio muted.
- Sound should add texture, timing, atmosphere, or a meaningful clue.
- Use silence deliberately, not as a default caused by missing assets.
- Keep voice, music, and effects intelligible and balanced.
- Use only original, supplied-with-permission, or properly licensed assets.
- Never assume a cloud TTS, music, or generation service is configured.
- Listen to the final mix end to end when audio exists. If no one has listened, record that as an unresolved review issue.
- Captions should complement the visual story rather than simply repeat every visible message.

### 5.6 Text and mobile readability

- Use short, natural dialogue.
- Keep critical evidence visible long enough to read.
- Avoid dense chat screens that require pausing to understand the plot.
- Check important details on a phone-sized preview, not only a desktop contact sheet.
- Keep text away from likely platform interface overlays and edge crops.
- Do not make a small icon or tiny detail the only way to understand the story.
- If a tiny clue is part of the mystery, make the main story understandable without it; the clue should reward a rewatch, not punish first-time viewers.

### 5.7 Visual consistency without monotony

Preserve the existing visual language and reusable components. Vary:

- Which interface carries the story.
- The timing and frequency of new information.
- Whether tension comes from absence, contradiction, urgency, or a pattern.
- The use of sound versus silence.
- The reveal structure.
- The balance between interface close-ups and environmental shots.
- The ending type.

Do not introduce a new scene type just because a story could use one. Reuse existing scene types first. Add a scene type only when it materially improves a story and cannot be achieved cleanly with existing components.

---

## 6. Audience interaction system

Interaction must grow naturally from the story. Do not append generic engagement bait to every video.

### 6.1 Interaction patterns to rotate

**Prediction**
- Invite viewers to predict what the next notification will reveal.
- Use only when the story genuinely sets up a prediction.

**Evidence spotting**
- Include a small but fair clue that viewers can notice on a rewatch.
- If the caption references a clue, ensure the clue is actually visible.

**Interpretation**
- Invite viewers to explain which of two plausible explanations fits the evidence.
- Keep both interpretations supported by the story.

**Moral or tactical choice**
- Ask what the viewer would do when a character faces a meaningful decision.
- Do not use the same “Would you open the door?” question repeatedly.

**Continuity**
- Let returning viewers notice a recurring number, symbol, account, location, or character.
- Keep a private continuity record so recurring details remain consistent.

**Viewer-submitted ideas**
- Invite fictional prompts or harmless story premises.
- Do not solicit private messages, phone numbers, addresses, screenshots of personal conversations, or identifying information.
- Treat submissions as suggestions, not permission to reproduce personal data.

**Community follow-up**
- Use a later video to answer a recurring interpretation or revisit a genuinely popular theory.
- Do not claim a comment inspired a story unless it actually did and permission is appropriate.

### 6.2 One primary CTA per post

Each post should have one main interaction objective. Choose the best fit:

- Comment with a theory.
- Notice a clue.
- Predict what happens next.
- Follow for a clearly related next episode.
- Share with someone who enjoys this kind of story.
- Save when the story contains clues or a connected sequence worth revisiting.

Do not stack “like, comment, share, save, follow, tag three friends” in one caption. It sounds mechanical and distracts from the story.

The story itself should remain worth watching even if the viewer ignores the CTA.

### 6.3 Comment handling

When responding manually:

- Stay in the fictional storytelling voice only when it is clearly understood as roleplay.
- Do not mislead people into believing a fictional threat is real.
- Do not reveal a planned twist before the audience has had a fair chance to experience it.
- Use thoughtful theories as evidence about what the story communicated, not as proof that the audience “understood it wrong.”
- Avoid arguing with viewers who did not understand a beat. Review whether the visual or writing could be clearer.
- Never repeat or expose a viewer's private information.
- Do not use automated spam, fake comments, purchased engagement, or engagement exchanges.

### 6.4 Comment prompts should be written into the story brief

Before rendering, the agent should complete:

- **Likely viewer question:** What will the viewer naturally want to know?
- **Best discussion angle:** What can viewers reasonably disagree about?
- **Primary CTA:** What single action fits this story?
- **Spoiler risk:** Does the caption reveal too much?
- **Safety/trust risk:** Could the prompt make viewers believe the fictional event is real?

If no natural interaction angle exists, do not force one. A satisfying story can be published without a question.

---

## 7. Series and world-building

### 7.1 Use a three-level structure

**Level 1: Standalone stories**
- Complete premise and payoff.
- No prior viewing required.
- Best for testing new story mechanics and reaching new viewers.

**Level 2: Mini-series**
- Two or three connected episodes.
- Each episode has its own hook and meaningful ending.
- Use a short, clear series identifier in the title/caption when useful.
- Maintain a continuity note that identifies what the audience already knows.

**Level 3: Shared universe**
- Recurring details connect otherwise independent stories.
- The detail should enrich the story without requiring the viewer to track every post.
- Keep a private universe ledger for names, numbers, symbols, rules, dates, and unresolved mysteries.

Start with standalone stories and a small number of mini-series. Do not create an elaborate fictional universe before the audience demonstrates interest in recurring connections.

### 7.2 Series rules

- Every episode must work for a first-time viewer.
- A sequel should provide a quick visual reminder of the relevant prior event.
- Avoid making the only meaningful payoff depend on watching another post.
- Keep a record of continuity facts and unresolved questions.
- Do not label unrelated videos “Part 2” just to encourage follows.
- If a sequel is delayed or cancelled, the earlier episode should still feel like a deliberate piece of fiction.

### 7.3 Use existing projects carefully

The repository already contains multiple versions and connected entries around “voicemail from tomorrow” and “you answer,” plus “don't open the door.” These are useful material for testing series packaging and continuity. They should not automatically dictate the entire future channel.

Do not repost near-identical cuts without a clear reason. When comparing versions, document what changed (duration, sound, hook, captions, or ending) and what question the test is intended to answer.

---

## 8. Platform strategy and social-media norms

### 8.1 One master video, platform-aware packaging

The renderer's 9:16, 1080 × 1920 output is a useful master format. Before posting, prepare platform-specific metadata and verify the actual current requirements of the chosen platform.

For each video, create:

- A concise title or opening text.
- A platform-appropriate caption/description.
- A clear fictional disclosure.
- A small set of relevant hashtags, only where useful.
- A cover frame and legible cover text.
- Captions/subtitles or accessible on-screen text.
- Audio and asset-rights notes.
- A primary CTA.
- A record of the final URL and posting date once published.

Do not assume every platform rewards the same duration, caption style, hashtags, sound, or posting schedule. Check current official creator guidance when requirements or features may have changed.

### 8.2 Instagram Reels

- Keep the core story in vertical 9:16 and review the cover crop in the actual publishing interface.
- Ensure important text is not hidden by the account name, caption area, buttons, or other interface elements.
- Make the opening legible immediately and preserve sound-off comprehension.
- Use a clear fiction disclosure in the video and caption.
- Use relevant hashtags, not a large block of unrelated trending tags.
- Consider whether the cover remains understandable on the profile grid.
- Review current Instagram creator guidance for recommendations, original content, eligibility, and current format constraints before making platform-specific claims.

### 8.3 YouTube Shorts

- Create a title that describes the hook without spoiling the reveal.
- Make the story understandable to viewers who arrive without seeing earlier episodes.
- Use the description for the fiction disclosure, relevant context, and series links where appropriate.
- Review thumbnail/cover options available for the account and publishing workflow; do not assume every Shorts surface behaves like a standard long-form video thumbnail.
- Use playlists or other supported organization for connected stories where useful.
- Review current official YouTube guidance on Shorts, metadata, analytics, and monetization before changing strategy around platform rules.

### 8.4 TikTok and other vertical-video platforms

- Adapt the caption, cover, and CTA to the platform's current features and audience behaviour.
- Do not simply copy every metadata field without checking how it renders.
- Review the current official creator guidance and any relevant synthetic-media disclosure rules before posting.
- Keep fiction clearly identifiable as fiction, especially if realistic-looking phone interfaces or synthetic voices are used.

### 8.5 General norms and trust

- Do not use copyrighted music or third-party footage without appropriate rights.
- Do not impersonate a real person or reproduce a real private conversation.
- Do not present fictional events as genuine emergencies, leaks, news reports, or real surveillance footage.
- Disclose synthetic or altered media when required by platform policy or when necessary to avoid misleading viewers.
- Do not buy views, followers, comments, or shares.
- Do not use unrelated trending hashtags or misleading titles.
- Do not promise “true story” or “real footage” when the content is fictional.
- Do not publish automatically. The current project explicitly keeps publication under human control.
- Platform policies and recommendation systems change. Verify current official guidance at the time of publishing rather than encoding rumours or permanent algorithm claims into this document.

---

## 9. Packaging: title, cover, caption, hashtags

### 9.1 Titles

A good title should create curiosity without explaining the whole plot.

Prefer:
- A concrete digital event.
- A contradiction.
- A short quote from the fictional interface.
- A consequence or question.

Avoid:
- Generic titles such as “Scariest Story Ever.”
- Unsupported claims that a story is real.
- Excessive capitalization or emoji strings.
- Revealing the twist in the title.
- Reusing the same title template on every post.

Draft 3 options during planning, then choose the clearest one. Store the alternatives in the project record if useful for later review.

### 9.2 Covers

- Select a frame with a clear visual focal point.
- Use few words, preferably a short phrase that survives small-screen viewing.
- Do not make the cover depend on tiny text.
- Preserve required fiction disclosure where appropriate.
- Ensure the cover does not reveal the twist unnecessarily.
- Check the crop in the destination platform.
- Do not create a cover that promises a scene absent from the video.

### 9.3 Captions

The caption should add context or invite a useful response, not duplicate the entire story.

A practical structure:
1. One short hook or premise line.
2. One optional discussion prompt.
3. Clear fiction disclosure.
4. Relevant series context or credits, if needed.

Do not force all four elements into a long caption when a short caption is stronger. Never omit the fiction disclosure just to make the post feel more realistic.

### 9.4 Hashtags

Start with a small set of relevant tags rather than a large generic block. Use a mix of:
- Format/genre.
- Specific story theme.
- Series/brand tag, if one is established.

The existing publishing guideline asks for three to five relevant, non-misleading hashtags. Keep that as the default unless current platform guidance or measured results justify a change. Hashtags are metadata, not a substitute for a compelling hook and story.

---

## 10. Analytics and experimentation

### 10.1 Build a lightweight feedback loop first

Do not begin by building a complex analytics integration. Record available metrics in a Markdown or CSV log. Use native platform analytics and manual entry initially.

For every post, record:

- Topic ID and project slug.
- Pillar and story mechanic.
- Duration.
- Hook type.
- Ending type.
- Audio status.
- CTA type.
- Platform.
- Publication date/time and post URL.
- Review date/time after publication.
- Views/reach or impressions, as available.
- Average watch time, if available.
- Completion/retention metrics, if available.
- Rewatches, if available.
- Likes, comments, shares, saves, and follows attributed to the post, where available.
- Notable audience theories or confusion.
- One lesson and one next experiment.

Metric availability and names vary by platform and account. Do not fabricate missing values or compare unlike metrics as though they were identical.

### 10.2 Use comparable review windows

Choose a consistent review window, such as 24 hours and 7 days after posting, based on the platform's available analytics. Record the timestamp and do not compare a 2-hour-old post directly with a 7-day-old post.

Use platform-specific baselines. Compare each post with other posts on the same platform and similar age, rather than assuming one universal benchmark.

### 10.3 Metrics and what they can indicate

| Metric | Possible interpretation | Caution |
|---|---|---|
| Early retention / opening drop-off | Whether the opening communicates the premise and earns attention | Traffic source and audience mix can differ |
| Average watch time | How much of the video people tend to watch | Compare alongside duration |
| Completion rate | Whether viewers reach the ending | Definitions vary by platform |
| Rewatches or loops | Whether people replay the story or inspect clues | Not always available or directly comparable |
| Shares | Whether viewers want someone else to experience the story | Can be driven by different motives |
| Saves | Whether viewers want to revisit the content | Not available or equally meaningful on every platform |
| Comments | Whether the story creates interpretation or discussion | Raw volume alone does not indicate quality |
| Follows attributed to a post | Whether the video gives viewers a reason to return | Attribution can be limited |
| Negative feedback / reports | Potential mismatch, confusion, or trust/safety issue | Investigate context before drawing conclusions |

Do not treat any single metric as a guaranteed ranking factor. Use metrics to develop and test hypotheses.

### 10.4 Experiments

Run one clear experiment at a time where possible. Examples:

- Show the impossible detail in the first frame versus reveal it after brief context.
- Compare a 30-second cut with a 40-second cut of a story designed for both.
- Compare a closed twist with a sequel bridge.
- Compare a message-thread opening with an incoming-call opening.
- Compare a clue-focused CTA with an interpretation question.
- Compare silent delivery with an original, rights-cleared sound design.

For each experiment, write:

- Hypothesis.
- What changed.
- What stayed the same.
- Primary metric.
- Review window.
- Result.
- Confidence/limitations.
- Next action.

Do not change hook, duration, sound, cover, caption, and CTA all at once and then claim to know which change caused the result.

### 10.5 Weekly review

At a regular cadence, answer:

1. Which posts held attention best relative to comparable posts?
2. Which topics generated meaningful discussion?
3. Which endings earned replays or theories?
4. Which stories were confusing for unintended reasons?
5. Which creative choices appear promising but need another test?
6. Which content pillar is underrepresented?
7. What should be repeated, refined, or retired next week?

Use the results to change the next batch of ideas. Do not rewrite the entire strategy after one unusually good or bad post.

---

## 11. Recommended agent workflow

The agent must follow the repository's existing `CLAUDE.md` and `docs/07-quality-and-publishing.md`. This section adds the content-strategy layer; it does not replace the technical instructions.

### Phase A: Choose and validate a topic

1. Read `topics.md`, relevant project records, and this strategy document.
2. Check for duplicates and recent repetition.
3. Select a high-potential unused topic or a user-supplied topic.
4. Fill out the topic metadata and score it.
5. Identify the emotional engine, central question, payoff, and interaction angle.
6. If the idea fails the novelty or payoff check, improve it before creating a project.

### Phase B: Story brief

Before writing scenes, produce a concise internal brief containing:

- Working title and topic ID.
- One-sentence premise.
- Target emotional response.
- First-frame hook.
- Beat-by-beat escalation.
- Reveal and ending type.
- Sound-off comprehension plan.
- Audio intention and rights source.
- Viewer discussion angle and primary CTA.
- Continuity notes, if connected to another story.
- Any potential confusion, disclosure, or safety concern.

### Phase C: Script and scene configuration

1. Create the project using the existing CLI.
2. Write `story.md`.
3. Build `scenes.json` using existing scene types where possible.
4. Use the established frame timing and deterministic rendering model.
5. Keep captions short and readable.
6. Preserve fiction labels and avoid misleading real-world presentation.
7. Do not introduce new scene types or dependencies without a clear reason.

### Phase D: Render and review

1. Run the repository's environment checks.
2. Run tests where required by the existing workflow.
3. Preview frames and inspect the contact sheet.
4. Fix clipping, tiny text, confusing timestamps, visual repetition, and weak pacing.
5. Render the final video.
6. Run the existing verification commands.
7. Inspect the final output. Listen to the mix if audio exists.
8. Report honestly any checks that could not be performed.

### Phase E: Publishing package

Complete `publishing.md` with:

- Suggested title and alternatives, if helpful.
- Caption and explicit fiction disclosure.
- Three to five relevant hashtags by default.
- Cover frame and cover text.
- Primary CTA.
- Audio status.
- Asset rights/source notes.
- Series relationship and previous/next links, if known.
- Platform-specific adjustments, if the target platform is known.
- Outstanding review issues.
- A short test hypothesis for the post.

Do not invent a post URL, publication time, audience result, or account capability.

### Phase F: After publication

This phase requires real post data or user-supplied analytics:

1. Add the post URL and publication date.
2. Record metrics at the chosen review windows.
3. Summarize comments and audience theories without exposing private information.
4. Identify one thing to preserve and one thing to test next.
5. Update the topic/analytics record.
6. Mark the topic measured only when the review is complete.

The current repository does not publish videos automatically. Keep final posting under human control unless the user explicitly requests and authorizes a supported publishing workflow.

---

## 12. Suggested files and lightweight data structure

Do not build a database or new application merely to store editorial metadata. Start with Markdown files that work with the existing agent workflow.

Suggested future structure:

```text
digital-suspense-studio/
├── VIDEO_STUDIO_CONTENT_STRATEGY.md   # this document
├── topics.md                          # pointer to content/topics.md
├── content/
│   ├── topics.md                      # backlog, fields, scores, status
│   ├── continuity.md                  # continuity ledger / series rules
│   ├── analytics.csv                  # post-level metrics (empty until posting)
│   └── briefs/                        # production briefs before scaffolding
└── projects/
    └── <slug>/
        ├── story.md
        ├── scenes.json
        ├── publishing.md
        └── render-report.json
```

*(The 20/20/20/15/10/10/5 rubric lives in §4.2 of this document rather than a
separate `topic-schema.md`, so there is one source of truth.)*

The agent should not create all these files automatically if an equivalent already exists. Inspect the repository first and avoid duplicate sources of truth.

### 12.1 Analytics CSV columns

Recommended starting columns:

```text
topic_id,project_slug,platform,post_url,published_at,reviewed_at,
pillar,hook_type,ending_type,duration_seconds,audio_status,cta_type,
views_or_reach,average_watch_time,completion_rate,rewatches,
likes,comments,shares,saves,follows_attributed,notable_feedback,
lesson,next_experiment
```

Use blanks for unavailable values. Document units and platform-specific metric definitions if necessary. If a field does not exist on the platform, do not fill it with an invented estimate.

### 12.2 Continuity ledger

For connected stories, track:

- Character or account aliases.
- Fictional phone numbers or identifiers.
- Known dates/times.
- Locations and environmental details.
- Rules established by the story world.
- Evidence already shown to the viewer.
- Questions answered.
- Questions deliberately unresolved.
- Planned sequel details.
- Contradictions to avoid.

All identities and contact details must remain fictional.

---

## 13. Roadmap

### Stage 1: Editorial foundation

Do this before major technical changes:

- Add this strategy file to the repository.
- Expand the topic records and scoring.
- Classify existing projects by pillar, hook, ending, audio, and series relationship.
- Identify repeated story mechanisms.
- Define a small set of interaction patterns.
- Ensure every new project has a clear publishing hypothesis.

**Done when:** the next 10 candidate topics are distinct, scored, and have a hook, payoff, and proposed interaction angle.

### Stage 2: Consistent publishing and measurement

- Publish a manageable, sustainable test batch.
- Keep the production workflow quality-first rather than forcing a high posting frequency.
- Track available metrics at consistent review windows.
- Record confusion and theories from comments.
- Compare performance by content pillar and story mechanic.
- Keep human approval before posting.

**Done when:** at least 10 posts have usable publishing records and comparable results, where posting volume and available analytics permit.

### Stage 3: Improve proven formats

- Repeat promising story mechanics with fresh premises.
- Test alternative openings and durations.
- Develop a small mini-series if returning-viewer signals support it.
- Improve audio review and mobile-readability checks.
- Update topic scoring based on observed evidence.

**Done when:** creative decisions are supported by repeated observations, not a single viral or underperforming post.

### Stage 4: Optional automation

Only after the editorial system is working:

- Automate validation of required topic fields.
- Add a report that identifies repeated premises and underrepresented pillars.
- Generate an analytics summary from a maintained CSV.
- Consider platform analytics integrations only if permitted, available, and worth the maintenance cost.
- Keep human review for story quality, rights, disclosure, and publication.

**Do not prioritize** a complex content dashboard, automatic posting, or additional renderer features until the basic strategy demonstrates what needs to scale.

---

## 14. Quality gate: do not publish until these are true

### Story
- [ ] The premise is clear immediately.
- [ ] The hook is supported by the story.
- [ ] Each major beat adds information or tension.
- [ ] The reveal feels earned.
- [ ] The ending provides a payoff or intentional ambiguity.
- [ ] The story is distinct from recent posts.
- [ ] A first-time viewer can understand the immediate conflict.

### Viewer experience
- [ ] The story works without sound.
- [ ] Important text is readable on a phone.
- [ ] The pacing has no accidental dead space.
- [ ] The opening and cover are not misleading.
- [ ] The CTA, if present, fits the story.
- [ ] Any clue is fair and actually visible.

### Trust and rights
- [ ] Fiction is clearly disclosed in the video and caption.
- [ ] Names, numbers, accounts, and events are invented.
- [ ] Assets are original, supplied with permission, or appropriately licensed.
- [ ] Synthetic media is disclosed where required or necessary to avoid misleading viewers.
- [ ] No private messages or personal information are exposed.

### Production
- [ ] Preview/contact sheet has been inspected.
- [ ] Layout and safe-area checks have passed or known issues are documented.
- [ ] Final MP4 exists and verification passes.
- [ ] Audio has been listened to when present, or the limitation is clearly reported.
- [ ] Publishing metadata is complete.
- [ ] The agent reports only checks actually performed.

### Growth readiness
- [ ] Topic ID and pillar are recorded.
- [ ] Hook type and ending type are recorded.
- [ ] One primary interaction objective is selected, or intentionally omitted.
- [ ] A post-publication learning hypothesis is documented.
- [ ] No performance claim is made before metrics exist.

---

## 15. Agent rules: non-negotiable

1. Follow the repository's current `CLAUDE.md`, README, and quality/publishing guide.
2. Read the relevant files before changing project behaviour.
3. Preserve the existing deterministic renderer and its tests.
4. Use existing scene types unless a new type is necessary and justified.
5. Never overwrite an existing rendered project to make a new version. Use a new slug/version as instructed by the repository.
6. Never mark a topic complete before final rendering and verification.
7. Keep fictional disclosure visible in the video and present in publishing copy.
8. Never fabricate engagement, posting status, analytics, quality checks, or audience feedback.
9. Never claim a final mix was auditioned if it was only measured.
10. Never assume network services, external voices, music, or APIs are available.
11. Never auto-publish or make account changes without explicit authorization and a supported workflow.
12. Do not chase trends unrelated to the niche merely because they are popular.
13. Do not repeat the same story mechanic with only superficial changes.
14. Do not force a question or cliffhanger into every video.
15. Prefer learning from a small, well-documented experiment over making many uncontrolled changes.
16. When evidence is unavailable, label the idea as a hypothesis and explain how it can be tested.
17. Keep the document and project records concise enough that the next agent can follow them reliably.

---

## 16. First assignment for the agent

When asked to apply this strategy, do the following in order:

1. Audit the current repository structure and identify whether this document or equivalent files already exist.
2. Classify every existing completed project by pillar, hook, story mechanism, ending, duration, audio status, and relationship to other projects.
3. Review the remaining backlog for duplicate or overly similar premises.
4. Add topic metadata and score the best 10 unused topics.
5. Propose a first batch of 10 videos with a deliberate mix of standalone stories and, at most, one small connected sequence.
6. For each proposed video, provide the premise, first-frame hook, beat outline, payoff, primary interaction angle, cover idea, and why it is meaningfully different.
7. Identify the smallest documentation changes needed to maintain topic status and post-publication metrics.
8. Report recommendations and proposed changes before undertaking broad renderer refactors or publishing anything.

Do not generate all 10 finished videos automatically as the first step. Establish the editorial plan, review it, then create content in manageable batches.

---

## 17. Reference and verification policy

This strategy is based primarily on the current repository design and common short-form storytelling principles. It does not claim to know the channel's audience demographics, account analytics, or platform-specific performance.

Before implementing a platform-specific rule, verify current official guidance:

- Instagram Creators: https://creators.instagram.com/
- YouTube Help for Shorts: https://support.google.com/youtube/
- TikTok Creator Portal: https://www.tiktok.com/creator-academy/

Use current platform documentation for changing requirements, disclosure rules, and analytics definitions. Do not present third-party algorithm rumours as official rules.

---

## Final direction

**Scale the editorial system before scaling production volume.** The competitive advantage is not the ability to render more videos; it is the ability to consistently create distinct, readable, emotionally effective digital-suspense stories, invite meaningful participation, and learn from real audience behaviour.

Keep the renderer stable. Make the topic system smarter. Give each story a strong reason to exist. Measure what happens after publishing. Then scale the formats that earn repeated audience interest.
