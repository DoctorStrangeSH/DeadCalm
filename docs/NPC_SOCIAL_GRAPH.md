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
- a player-witnessed live NPC-to-NPC meeting scene;
- schedule-driven occurrence production;
- knowledge/rumor transfer between NPCs (the existing transfer API still requires an explicit shared meeting event plus compatible schedule occurrences);
- automatic rumor propagation or dialogue consumption.

Knowledge transfer guard: `GameState.transferNpcKnowledge` and `GameState.transferNpcRumor` require a matching social event explicitly marked `sourceType: direct_observation` and `certainty: corroborated`, plus two authored schedule occurrences for the participants at the same location and within 15 in-game minutes. An interview/testimony event (including the two new unverified records above) cannot authorize a relay. This keeps a participant's account from being mistaken for a witnessed encounter.
Validation for this implementation slice: GitHub Actions run #833 passed **465/465 tests, 0 failures** on code/test HEAD `dde287ade1b7a6173a1328e9d2c67d41c546083f`. The test suite covers dialogue discovery, source attribution, save export/import, event normalization, duplicate rejection, and the stricter witnessed-meeting gate for knowledge relay. Manual browser/mobile presentation QA remains outstanding.