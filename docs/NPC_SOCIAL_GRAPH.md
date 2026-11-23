# NPC Social Graph

## Purpose

The social graph stores relationships and concrete interactions between NPCs independently of the player's trust score toward each NPC. It is a persistent data model, not yet a player-facing relationship-map screen.

## Data model

- `ties`: current known relationship records.
- `events`: dated interactions between two NPCs.

Supported relationship types: `family`, `colleague`, `friend`, `rival`, `debt`, `protective`, `romantic`, `unknown`.

Supported statuses: `active`, `strained`, `broken`, `uncertain`.

Each tie requires:
- stable `id`
- `fromNpcId` and `toNpcId` (must be different)
- valid `type` and `status`
- non-empty `basis` explaining why the relationship is recorded
- optional `sourceRefs` pointing to evidence, authored canon, or narrative records
- `updatedAt`

Each event requires two distinct NPC IDs, a non-empty description, and may include source references and an occurrence timestamp.

## Integrity rules

1. Never infer a relationship from proximity, shared workplace, a rumor, or a player's assumption.
2. Record a tie only when supported by authored canon or an explicit in-game discovery. Put the reason in `basis`; preserve evidence IDs in `sourceRefs`.
3. A rumor may create an `uncertain` tie only if the game explicitly records that rumor as a relationship claim. Do not silently upgrade it to fact.
4. Events do not automatically change a tie's status. A documented event and a relationship conclusion are separate records.
5. NPC-to-player trust in `GameState.relationships` remains separate from NPC-to-NPC social ties.
6. Old saves without `socialGraph` migrate to an empty graph. Invalid legacy records are discarded safely.
7. Use `GameState.recordSocialTie`, `GameState.recordSocialEvent`, `GameState.getSocialTies`, and `GameState.getSocialContext` rather than mutating arrays directly.
8. Do not seed speculative connections between Orlov, Klimov, or the original six characters. Add authored relationships only after narrative evidence exists.

## Current implementation

- Module: `src/js/systems/npc-social-graph.js`
- Persistence/API: `src/js/core/state.js`
- Tests: `tests/npc-social-graph.test.mjs`
- PWA cache: `sw.js`

The data model and state API are implemented. Two canon-backed family relationships are now discovered through dialogue and shown in both the dialogue discovery card and the investigation board. NPC-to-NPC event producers, the wider relationship map, and autonomous social simulation remain future work. Do not describe those future features as already implemented.

## NPC knowledge ledger

The knowledge ledger records which claims an NPC has encountered and where that information came from. It is separate from the social graph: a relationship is not proof that one NPC knows another NPC's secret.

- Module: `src/js/systems/npc-knowledge.js`
- State API: `GameState.recordNpcKnowledge(input)`, `GameState.updateNpcKnowledgeState(entryId, state, reason)`, `GameState.getNpcKnowledge(npcId)`, `GameState.getNpcKnowledgeContext(npcId)`
- Tests: `tests/npc-knowledge.test.mjs`

Allowed source types: `direct_observation`, `document`, `interview`, `rumor`, `inference`.
Allowed knowledge states: `unverified`, `corroborated`, `disputed`.

Integrity rules:
1. A ledger entry records what the NPC has encountered or believes, not whether the claim is objectively true.
2. Every entry requires a claim reference, a source type, and a non-empty provenance explanation.
3. Rumors remain attributed hearsay; do not convert them to corroborated knowledge without a separate reasoned update.
4. Knowledge-state changes require an explanation and are retained in `stateHistory`.
5. Do not automatically copy knowledge from one NPC to another. A transfer must be explicitly recorded with `sourceNpcId` and a provenance explanation.
6. Do not expose hidden claims to dialogue merely because an NPC is connected to someone who knows them.
7. Old saves without `knowledgeLedger` migrate to an empty ledger; malformed entries and duplicate IDs are discarded.
8. The ledger is a data model/API only. Automatic rumor propagation, schedules, and dialogue consumption are not implemented yet.

## NPC daily-life schedule model

- Module: `src/js/systems/npc-daily-life.js`
- State API: `GameState.setNpcSchedule(input)`, `GameState.getNpcScheduleAt(npcId, day, minute)`, `GameState.recordNpcOccurrence(input)`, `GameState.getNpcOccurrences(npcId)`
- Tests: `tests/npc-daily-life.test.mjs`

Schedules are authored records with an NPC ID, activity, in-game weekday set (1–7), start/end minute, location ID, and non-empty basis/source references. Activities are limited to work, travel, meal, rest, social, private, and unknown. Overlapping schedules intentionally resolve to no result rather than choosing arbitrarily.

Integrity rules:
1. Never infer a schedule from a job title, home, workplace, or character stereotype. Add only authored/source-backed schedules.
2. Time uses the game's own day and minute values; it is not wall-clock time.
3. A schedule lookup is descriptive only. It does not move NPCs, trigger conversations, or advance time.
4. An occurrence can be recorded only when it matches an authored schedule's NPC, day, time, and location, and includes a non-empty description and basis.
5. Passing time must never fabricate an occurrence. Discoveries/events require an explicit narrative/system producer.
6. No schedules are pre-seeded for the six protected original characters without approved canon.
7. Legacy saves without `npcDailyLife` migrate to an empty model.
8. Autonomous simulation, rumor propagation, player-facing schedule UI, and time advancement integration are not implemented yet.


## Dialogue-driven relationship discovery — 2026-11-23

The social graph now receives two canon-backed family ties only after the player hears the relevant in-game testimony. Discovery metadata is authored on the corresponding response in `src/data/dialogues.json`; the dialogue engine does not hard-code story-specific question IDs:

- `npc_lydia_winter → npc_gabriel` (`family`): created after the player asks Lydia `her_background`. Her explicit statement identifies Gabriel as her brother.
- `npc_anna_holt → npc_markus_holt` (`family`): created after the player asks Anna `anna_markus_last_seen`. The conversation identifies Markus as her father.

Both records preserve a dialogue source reference and a plain-language basis. They are not seeded from hidden character profiles, do not reveal themselves before the player hears the source, and are idempotent. The anonymous source behind Marta's documents is deliberately not linked to Markus: Marta does not know that identity. A regression test also checks that only these two source-backed relationships are currently discoverable.

The new relationship discovery is shown in the dialogue result and in the investigation board's **«Люди и их связи»** section. The board explicitly labels these as source-backed relationships, not deductions from proximity or rumor.

Still not implemented:
- NPC-to-NPC event producers for actual on-screen meetings;
- automatic rumor propagation and dialogue consumption;
- authored schedules and autonomous movement/time simulation;
- broader relationship changes between the six active NPCs. These must wait for explicit story evidence rather than be fabricated.

## Dialogue-driven interaction testimony — 2026-11-23

Two one-off interactions are now recorded only after the player hears the participant's own account:

- `event-anna-markus-last-evening`: Anna reports that Markus warned her not to hand over the wooden box without an explanation, on the evening before he disappeared.
- `event-sebastian-harrison-delivery-meeting`: Sebastian states that he met Judge Harold Harrison and delivered a sealed belladonna vial on the evening of Harrison's death.

Each event preserves both participants, the participant who reported it, an in-story time label (not the real-world save timestamp), the dialogue source reference, source type `interview`, and certainty `unverified`.

The board and dialogue discovery card label these records as testimony requiring verification. Sebastian's statement is not proof that Harrison opened or consumed the vial, or that Sebastian caused his death. Anna's recollection is not silently upgraded into an independently witnessed event.

Event metadata is optional for compatibility with older saves. The normalizer rejects invalid reporters, unsupported source/certainty values, and empty story-time labels. Recording the same authored event ID twice is idempotent.

Still not implemented:
- schedule-driven occurrence production and autonomous NPC movement;
- automatic rumor propagation or dialogue consumption.

Knowledge transfer guard: `GameState.transferNpcKnowledge` and `GameState.transferNpcRumor` require a matching social event explicitly marked `sourceType: direct_observation` and `certainty: corroborated`, plus two authored schedule occurrences for the participants at the same location and within 15 in-game minutes. An interview/testimony event (including the two new unverified records above) cannot authorize a relay. This keeps a participant's account from being mistaken for a witnessed encounter.
Validation for this implementation slice: GitHub Actions run #833 passed **465/465 tests, 0 failures** on code/test HEAD `dde287ade1b7a6173a1328e9d2c67d41c546083f`. The test suite covers dialogue discovery, source attribution, save export/import, event normalization, duplicate rejection, and the stricter witnessed-meeting gate for knowledge relay. Manual browser/mobile presentation QA remains outstanding.
## Player-witnessed finale encounter — 2026-11-23

The day-five port finale now records the authored face-to-face confrontation between Markus Holt and Sebastian Blackwood when the player chooses to find Markus. The scene explicitly shows Markus admitting his own falsification, Sebastian confronting him, and Sebastian trying to seize the box containing the originals.

The event is persisted as `direct_observation` / `corroborated`, with source reference `scene:port:day5:final_confrontation`. It is not recorded from a character's hearsay, and it does not claim that the confrontation proves who killed Harrison. The board attributes the source to John Rivers' personal observation.

This is a single authored story encounter, **not** an autonomous daily schedule. No clock time or recurring NPC routine has been invented. Knowledge/rumor relay remains unavailable until compatible, source-backed schedule occurrences exist for both participants; this finale encounter alone does not fabricate those occurrences.

Manual verification still required: reach day five in a browser, visit the port, trigger the confrontation, confirm the board entry, reload the save, and verify the entry remains present.

Automated validation after the implementation: GitHub Actions run #842 passed **466/466 tests, 0 failures**. The added story-integrity regression verifies that the encounter is gated to day five, records the correct participants and source classification, and does not create fictional schedule occurrences. Browser/mobile playthrough and save-reload QA are still pending.
## Canon-backed NPC presence on the city map — 2026-11-23

The city atlas now displays whether a location's authored NPC can appear on the current campaign day. The resolver in `src/js/systems/npc-presence.js` requires all three facts to agree:

1. the location is unlocked by its existing story flag;
2. the character dossier assigns that NPC to this exact location;
3. the campaign day has reached the dossier's explicit `first_appearance` value.

The map loads `characters.json` and shows the character's name plus one of three grounded states: available, appears later, or no confirmed appearance. Unknown or malformed canon fails closed.

This deliberately does **not** simulate walking, invent clock times, create recurring schedules, or record an occurrence. It is a player-facing availability layer that makes the current story route legible while the schedule/movement system remains unimplemented.

Examples:
- Anna's dossier says `first_appearance: day_1`, but the Holt house remains locked until day 4; she is therefore not shown as available before the house opens.
- Sebastian's mansion opens on day 3 and his first appearance is day 3; both gates must be satisfied.
- The map does not claim that a character is physically present at another location merely because the location is nearby.

Automated coverage: `tests/npc-presence.test.mjs` checks location gates, first-appearance gates, mismatched locations, malformed canon, and the absence of fabricated schedules. Visual-integrity tests verify the map integration. Manual browser/mobile QA remains pending.


Automated validation after map integration: GitHub Actions run #858 passed **473/473 tests, 0 failures**. This includes six new NPC-presence tests, map integration checks, map re-entry regression, and full Service Worker import/precache validation. Manual browser/mobile QA remains outstanding.


### Direct conversation from the city atlas — 2026-11-23

A location's NPC panel now exposes a **«ПОГОВОРИТЬ»** action only when the canonical presence resolver returns `available: true`. The action re-checks availability at click time before opening the existing `DialogBox`, so a stale panel cannot bypass the story gate. «ОТПРАВИТЬСЯ» remains a separate action for entering the location scene.

The resolver and its regression tests are present in the release branch:
- `src/js/systems/npc-presence.js`
- `tests/npc-presence.test.mjs`

This is still story availability, not a claim that the character is physically standing at a particular coordinate or following a minute-by-minute schedule.


### Canonical atlas roster completion — 2026-11-23

The atlas roster now links all six original NPC dossiers to exactly one canonical location. A concrete gap was fixed: `npc_sebastian_blackwood` existed in `characters.json` with `location: blackwood_mansion`, but the mansion record had no `npc` reference, so the atlas could never show his availability or direct conversation action. `locations.json` now declares that reference.

No time-of-day schedule was invented. The story bible establishes a 19:30 appointment with Sebastian on day one at the courthouse, but that is a specific plot event—not a recurring daily routine. The existing daily-life ledger remains empty until recurring schedules are explicitly authored in canon.

Regression coverage: `tests/npc-location-canon.test.mjs` verifies every dossier maps to exactly one matching atlas location, every location reference resolves, and Sebastian's day-three introduction remains intact.


### Reciprocal NPC/location identity guard — 2026-11-23

The presence resolver now requires both sides of the authored relationship to agree: `character.location === location.id` and `location.npc === character.id`. A one-sided or stale reference fails closed as `not_here`; a mismatched NPC can no longer be offered a direct conversation merely because the character dossier points at that location. Regression coverage is in `tests/npc-presence.test.mjs`. PWA cache revision: `dead-calm-visual-v113`.


## Transactional NPC memory reset — 2026-11-23

`NPCMemory.resetNPC(npcId)` and `NPCMemory.resetAll()` now return a boolean and treat storage success as the commit boundary. A failed/throwing save restores the previous NPC memory and reports `false`; a successful save reports `true`. The all-NPC reset restores the original collection reference on failure. These reset operations do not alter player-to-NPC trust or other case evidence. Regression coverage: `tests/npc-memory-persistence.test.mjs` (failed and successful reset paths). PWA cache revision: `dead-calm-visual-v114`.


## Persisted return-visit counter — 2026-11-23

`NPCMemory.recordConversation(npcId, consumedFlag?)` now increments the NPC's `conversationCount` for each successfully persisted return visit. When a one-time authored return reaction is pending, the visit counter and consumed-reaction flag are written in the same memory transaction; a failed save changes neither, so retrying does not double-count or lose the reaction. Ordinary return visits are counted only after their own successful save. First meetings continue to use the existing atomic `commitFirstMeeting` path and are counted once. Regression coverage: `tests/npc-memory-persistence.test.mjs` and `tests/npc-return-reactions.test.mjs`. PWA cache revision: `dead-calm-visual-v115`.


## Promise fulfilment evidence — Ray Morgan — 2026-11-23

Ray's authored promise to check the incoming-call register is now explicitly closed only by the `inspect_incoming_calls` response. That response already requires the promise flag and the preceding confrontation question; it now also carries `memory_set: ray_check_calls_fulfilled`. `DialogueEngine.askQuestion()` passes this authored consequence into `NPCMemory.markQuestionAsked()`, which persists the answered-question ID and fulfilment flag in one save. If the save fails, neither is committed and the player can retry. The flag means Ray produced the call-log evidence; it does not identify the anonymous caller or imply the case is solved. Coverage: `tests/npc-dialogue-integrity.test.mjs` and `tests/npc-memory-persistence.test.mjs`. PWA cache revision: `dead-calm-visual-v116`.


Ray now has a one-time follow-up on the next meeting after the call-log evidence is recorded. He acknowledges that the register confirms a call from the courthouse switchboard but explicitly states that the caller's identity remains unknown; he points the investigation toward the original registration book. The reaction consumes `return_seen_ray_calls_fulfilled` together with the return-visit counter, so it cannot repeat after a successful save. Coverage: `tests/npc-dialogue-integrity.test.mjs` verifies the evidence boundary and one-time display. PWA cache revision: `dead-calm-visual-v117`.


## Atomic outcomes for authored return scenes — 2026-11-23

`NPCMemory.recordConversation(npcId, consumedFlag?, memorySet?)` now supports an optional authored outcome flag. `DialogueEngine._getPendingReturnReaction()` commits the visit counter, one-time reaction-consumed flag, and outcome flag in the same save. A failed save rolls all three back; a successful save emits `npc:flag_set` only after persistence. This is now used for Marta's confirmation that the source remained protected (`marta_source_protection_confirmed`), Father Thomas's preserved letter context (`thomas_letter_context_preserved`), and Sebastian's acknowledgement of the records request (`sebastian_records_request_acknowledged`). These flags record only what the scene establishes; they do not assert that a source identity, disputed historical claim, or complete archive has been verified. Coverage: `tests/npc-memory-persistence.test.mjs` and `tests/npc-return-reactions.test.mjs`. PWA cache revision: `dead-calm-visual-v118`.
