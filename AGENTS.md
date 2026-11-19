# Instructions for AI agents working on Dead Calm

## Character art is a protected production area

Before creating, editing, replacing, or integrating ANY character portrait, read:

- `docs/CHARACTER_ART_DIRECTION.md`

That document contains the first-artist reference study, the six approved original portraits, hard anti-repetition rules, and the required art-production workflow. It is mandatory.

### Non-negotiable rules

- The six original characters — Lydia Winter, Ray Morgan, Anna Holt, Marta Hayes, Father Thomas, and Sebastian Blackwood — are locked. Never redesign, repaint, replace, or overwrite their approved base portraits or expression variants unless the user explicitly requests it.
- Inspect the actual six base image files before designing a new character. Do not rely on written descriptions alone.
- Every new character must have a visibly distinct face, age, facial proportions, hair, silhouette, clothing, posture, and personality. Never reuse the same face with different clothes.
- Every new character must have a location and composition motivated by their role and story. Do not repeat the same dark office, desk lamp, leather chair, bookshelf, and rainy window for every portrait.
- Keep the original painterly, cinematic noir art direction. Consistency means matching finish and quality, NOT repeating the same character or scene template.
- Create one finished individual portrait at a time. Do not deliver sketch sheets, collages, moodboards, contact sheets, or repeated near-identical variations unless the user explicitly asks.
- Do not infer appearance, nationality, or ethnicity from Russian-localized names or text. Blackford is not a Russian setting; Russian is a localization language only.
- A generated image is not an in-game asset until the real file is committed, the portrait registry and scene integration are updated, and the project is checked. Never claim otherwise.
- If a proposed character looks too similar to an existing character or repeats an already-used location/composition, reject it and redesign before showing or integrating it.

When unsure, preserve existing art and ask for clarification rather than making an irreversible visual change.


## Role expectation: artist + technical lead

The AI is expected to operate as a senior artist and technical lead for Dead Calm. Do not behave like a prompt generator waiting for the user to art-direct every detail.

- Own the full task: inspect the existing project, make the design decisions, create finished assets, integrate them, validate them, and report the exact result.
- For character art, follow the **First-pass final-art standard — no drafts** in `docs/CHARACTER_ART_DIRECTION.md`.
- Never send the user rough sketches, draft sheets, repeated variants, or the same character/location formula. Prepare internally and present only a finished, intentional result.
- Do not claim an asset is integrated until the committed game files, registry/scene wiring, and validation confirm it.
- Preserve the six original portraits without exception unless the user explicitly authorizes a change.
- Apply these standards to future AI agents and handoffs; do not make the user repeat them in later sessions.


## NPC social graph

Before adding or consuming NPC-to-NPC relationships, read `docs/NPC_SOCIAL_GRAPH.md`. Keep NPC-to-player trust separate, require authored/evidence-backed relationship bases, and never seed speculative ties. The social graph is currently a persistent data model/API; do not claim a player-facing relationship map or autonomous NPC simulation exists until implemented and tested.


## NPC knowledge ledger

Read `docs/NPC_SOCIAL_GRAPH.md` before working with NPC knowledge. NPC knowledge is attributed information, not objective truth. Require explicit provenance for every claim, keep rumors unverified, preserve state-change reasons, and never propagate secrets automatically. The ledger is currently a persistent data model/API; automatic rumor propagation and dialogue integration remain future work.


## NPC daily-life schedules

Read `docs/NPC_SOCIAL_GRAPH.md` before editing NPC schedules. Only author source-backed schedules; use in-game day/minute, never wall-clock time. Schedule lookup does not advance time or simulate movement. Record occurrences only against a matching authored schedule with an explicit basis. Do not invent routines for the six protected original characters. Autonomous simulation and time integration remain future work.
