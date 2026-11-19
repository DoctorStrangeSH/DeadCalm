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

The data model and state API are implemented. A player-facing graph visualization, authored relationship content, and narrative event producers remain future work. Do not describe those future features as already implemented.
