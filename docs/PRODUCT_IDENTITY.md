# Dead Calm — Product Identity and Boundary with Ghost Signal

This document is a mandatory product-direction guardrail for every contributor and AI agent.

## Why this exists

The owner also develops **Ghost Signal** as a separate detective project. Dead Calm must retain its own identity, player fantasy, pacing, interaction model, and progression. Shared genre vocabulary (mystery, noir, secrets, witnesses) does not authorize copying the other game's structure.

## Verified distinction: Ghost Signal

Ghost Signal's repository README describes it as an interactive detective terminal in a noir style. Its documented player loop includes:
- loading unsolved cases from an archive;
- moving around a city map and exploring locations;
- searching scenes for clues;
- calling and interviewing witnesses;
- connecting clues on an investigation board;
- code-breaking and hidden-object mini-games;
- day/night availability changes for locations and NPCs;
- keeping notes from documents.

These are recognizable Ghost Signal pillars. Dead Calm must not simply reproduce this package as a reusable, repeatable case-terminal loop under different names. The owner has approved retaining a single authored city map, courtroom evidence sequence, witness conversations and investigation board for case №001. They exist to serve this one story and are not a template that every future case must repeat. Mini-games are allowed and desired in Dead Calm; their interaction design and fiction must be distinct rather than copied.

## Dead Calm direction

The owner has explicitly approved a stronger detective identity for Dead Calm 1.0. The first release is a character-driven noir investigation: one authored murder case, a carefully constructed evidence trail, unreliable and incomplete testimony, and personal consequences that persist beyond the scene. The player should feel like a detective, but the experience must not become a clone of Ghost Signal's terminal-style case loop.

The existing first courtroom investigation is retained as a single, authored case-specific sequence. Its authored courtroom evidence sequence and provenance checks are valuable because they teach the player not to confuse a record with a person or a hypothesis with a fact. This is not permission to repeat the same clue-board structure in every future case.

Dead Calm's differentiating foundation remains persistent character state and continuity across the fictional community. Its implemented foundations include:
- NPC-to-NPC social ties, separate from player-to-NPC trust;
- attributed NPC knowledge with explicit provenance and uncertainty;
- authored NPC schedules in in-game time;
- recorded NPC occurrences tied to an authored schedule, time, and location;
- persistent save/load support for these data models.

These foundations should support character-driven narrative consequences: what a character knows, remembers, chooses to reveal, avoids, or changes over time. They are not a second implementation of Ghost Signal's detective terminal.

## Hard product boundaries

Do not add the following to Dead Calm merely because they exist in Ghost Signal:
1. A case archive / unsolved-case selection loop.
2. A generic city-map navigation loop reused as the primary structure for every future case. The existing authored Blackford map for case №001 is retained.
3. A repeated clue-hunting or hidden-object loop. The existing courtroom evidence sequence for case №001 is retained as authored content.
4. A generic evidence-board system reused across all cases. The existing case №001 board remains in scope but must not become a universal case-terminal framework.
5. A reusable witness-call / interrogation hub as the central interaction loop. Authored conversations in the first case remain in scope.
6. Code-breaking or hidden-object mini-games as default investigation gates. This is not a ban on mini-games: Dead Calm should have its own varied, tactile, character- and world-grounded mini-games as specified in `docs/MINIGAME_DESIGN.md`.
7. A notebook that duplicates Ghost Signal's document-fragment collection loop.
8. A day/night system whose main purpose is toggling NPC and location availability.

If a future design genuinely needs one of these, it must be justified by Dead Calm's own core fantasy and approved by the owner before implementation. Do not clone a mechanic just because it is convenient or familiar.

## What Dead Calm should deepen instead

Prioritize mechanics that grow naturally from its established persistent-character foundations:
- NPCs maintain their own relationships and private agendas.
- NPC knowledge is attributed: who told them, what they saw, what they misunderstood, and what remains uncertain.
- Characters remember promises, favors, betrayals, absences, and unresolved personal consequences.
- Schedules and off-screen occurrences create continuity, not a map-based checklist.
- The player encounters consequences through authored scenes, character behavior, environmental aftermath, and narrative timing.
- The first case may use its authored map, courtroom evidence sequence, witness conversations and evidence board; future cases are free to use different interactions and must not inherit this loop by default.
- The same event can affect different characters differently because they have different histories and knowledge.
- Choices should change relationships, obligations, access, trust, and future character decisions—not merely add/remove evidence tokens.

These are direction priorities, not claims that every feature is already implemented.

## Feature proposal gate

Before implementing a major feature, answer in its design note:
1. What is the player's fantasy in Dead Calm for this feature?
2. How is its interaction loop different from Ghost Signal?
3. Does it deepen character continuity, personal stakes, or consequences?
4. Could a player reasonably mistake it for a Ghost Signal feature under another name?
5. What existing Dead Calm system does it build on?

If the answer to #4 is yes, redesign it or ask the owner before coding.

## Engineering and honesty rules

- Reuse generic engineering patterns only when appropriate; do not copy Ghost Signal's product flow or UI.
- Keep Dead Calm's character-art rules and six original portraits protected.
- Do not seed speculative NPC schedules, relationships, secrets, or events.
- A persistent data model is not an autonomous simulation. Clearly distinguish implemented storage/API from actual in-game behavior.
- Update this document when the owner explicitly approves a change in product direction.
