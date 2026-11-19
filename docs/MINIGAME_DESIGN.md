# Dead Calm — Original Mini-game Design

This document defines the mini-game direction for Dead Calm. Mini-games are explicitly part of the intended experience. The goal is variety and strong tactile interaction, not removing mini-games to distinguish the project from Ghost Signal.

## Design principle

A Dead Calm mini-game should feel like performing a tense, physical, social, or sensory action inside the world. It should not feel like opening a generic puzzle panel. Each activity needs a clear fiction, readable feedback, meaningful failure/recovery, and a consequence that can persist in the character/world systems.

Mini-games may be optional, mandatory, repeatable, or skill-based depending on their narrative role. Do not make every interaction a puzzle gate.

## Distinction from Ghost Signal

Ghost Signal's documented mini-game examples include code-breaking and hidden-object search. Dead Calm should not reuse those activities as its signature mini-game identity.

Avoid:
- substitution ciphers, keypad/code guessing, password cracking;
- hidden-object scenes where the task is to find listed objects;
- recreating Ghost Signal's investigation board or clue-linking loop as a mini-game;
- dressing the same puzzle in a different UI and calling it new.

Shared genre conventions are allowed only when the interaction, fiction, presentation, and consequences are genuinely distinct.

## Mini-game families for Dead Calm

### 1. Delicate mechanical work
Examples: freeing a jammed mechanism, repairing a watch, aligning a mechanical part, operating an old winch.
- Player manipulates a small number of physical components.
- Feedback comes from resistance, vibration, sound, movement, and wear.
- Rushing can damage the mechanism or consume scarce materials.
- No code or symbol sequence is required.

### 2. Audio and signal handling
Examples: tuning a temperamental radio receiver, isolating a voice through interference, matching a recorded sound to a live acoustic environment.
- Use continuous tuning, filtering, rhythm, and listening.
- The challenge is perception and adjustment, not decoding a cipher.
- Success may yield a clearer recording; failure can leave uncertainty rather than a binary dead end.

### 3. Social pressure and conversation
Examples: keeping a fragile conversation calm, choosing when to interrupt, managing silence, noticing discomfort, deciding whether to press or back off.
- The challenge is timing and emotional judgment, not selecting a hidden correct dialogue password.
- Outcomes should depend on the NPC's established memory, knowledge, relationship, and current circumstances.
- A failed attempt can change trust or willingness without erasing prior story progress.

### 4. Physical composure under pressure
Examples: steadying hands during delicate treatment, controlling breathing during a dangerous wait, maintaining balance while moving through a hazardous environment.
- Use accessible timing, rhythm, or controlled input.
- Avoid punishing reflex tests as the only route through critical story content.
- Outcomes should create graded consequences and recovery opportunities.

### 5. Environmental operation
Examples: manually operating a pump, balancing pressure in a boiler, restoring power through physical switches and load management.
- The player learns a small system through clear cause and effect.
- The challenge is operational understanding, not searching a scene for listed objects.
- The world should visibly respond to the player's actions.

## First recommended prototype: Mechanical Repair

Build one polished, short interaction around repairing a jammed pocket watch or small mechanical device.

Core loop:
1. Inspect the mechanism with a close-up camera.
2. Identify which component is under tension using visual/audio feedback.
3. Release pressure carefully.
4. Align and seat the component.
5. Test the mechanism and observe its behavior.

Requirements:
- 2–4 meaningful interaction steps, not a long sequence of arbitrary clicks.
- Clear hover/focus affordances and controller/keyboard accessibility.
- Audio and animation feedback for correct, incorrect, and risky actions.
- At least one recoverable mistake; no silent softlocks.
- A short and satisfying success animation.
- Persist only the narrative result and any justified resource/time cost; do not store transient UI state as story truth.
- The activity must be reusable with different authored mechanisms, not just a one-off generic puzzle.

This is a proposed first prototype, not an implemented feature.

## Quality and accessibility rules

- Teach controls in context before asking for precision.
- Provide adjustable timing/accessibility options for reflex-based variants.
- Never make color the only source of information.
- Use distinct mechanics between mini-game families; do not reskin one interaction repeatedly.
- Keep sessions concise and purposeful.
- Let narrative state influence the activity when appropriate, but never fabricate NPC knowledge or outcomes.
- Test keyboard, mouse, controller where supported, focus order, reduced motion, and failure recovery.

## Approval and implementation gate

Before implementing a mini-game, document:
1. Its fictional purpose.
2. Its core player action.
3. Why it is not a Ghost Signal clone.
4. How success, partial success, and failure affect the world.
5. Accessibility and recovery behavior.
6. The smallest playable vertical slice and its tests.

Do not claim a mini-game is playable until it is integrated into the actual game flow and manually or automatically validated.


## Prototype status — Mechanical Repair

Implemented logic module: `src/js/systems/mechanical-repair.js`.
Tests: `tests/mechanical-repair.test.mjs`.

The current prototype is a framework-independent state machine with four player actions:
1. Inspect and identify the spring under tension.
2. Release pressure with a controlled action.
3. Align the component to its tooth mark.
4. Wind gently to test the mechanism.

It supports recoverable observation/alignment mistakes, records action history, distinguishes clean success from partial success after damage or mistakes, and rejects out-of-order actions.

**Important status:** this is a tested gameplay-logic prototype only. It is not yet a rendered, playable scene; it has no art, animation, audio, input bindings, save integration, or in-game entry point. Do not call it a finished mini-game until those are implemented and validated.


## Playable scene integration

The first mechanical-repair vertical slice now has a real scene:
- Entry point: the new **МАСТЕРСКАЯ** card in the detective office.
- Scene: `src/js/scenes/mechanical-repair.js`.
- Styling: appended dedicated `repair-*` styles in `src/css/main.css`.
- Logic: `src/js/systems/mechanical-repair.js`.
- The scene provides an interactive four-stage repair flow, recoverable mistakes, a force-damage path, a result state, replay, and return-to-office navigation.
- The service worker precaches the scene and its cache key is bumped to `dead-calm-visual-v90`.

The mechanism illustration is currently CSS-based interface artwork, not a finished bespoke painted asset. Audio, bespoke animated gears, controller bindings, save-persisted repair outcomes, and narrative consequences are not yet implemented. The scene is a playable prototype, not a final art-complete mini-game.


## Second mini-game — Analog Radio Tuning

Implemented:
- Logic: `src/js/systems/radio-tuning.js`
- Tests: `tests/radio-tuning.test.mjs`
- Scene: `src/js/scenes/radio-tuning.js`
- Styling: dedicated `radio-*` styles in `src/css/main.css`
- Entry: **РАДИОПРИЁМНАЯ** card in the detective office.
- Service worker cache: `dead-calm-visual-v91`.

The player continuously tunes an analog frequency and adjusts an interference filter. Signal clarity is graded as clear, fragmented, or unreadable. Slider readouts update in place so the range control remains mounted during pointer/keyboard interaction. This is distinct from mechanical repair: it is continuous sensory tuning rather than sequential component manipulation.

The radio uses a CSS-rendered receiver illustration, not a bespoke painted asset. Actual audio/static playback, authored voice content, persistent narrative reward, and manual browser playtesting are not yet implemented.


## Persistent mini-game progress

A shared progress record is now part of the save model:
- Logic and migration: `src/js/systems/minigame-progress.js`.
- Save integration: `src/js/core/state.js` under `miniGameProgress`.
- Both radio tuning and mechanical repair write a result only when the player completes the activity.
- Each activity tracks attempt count, last outcome/quality, best outcome/quality, and completion timestamp.
- Replays never downgrade the saved best result. A stronger result can improve it.
- Existing saves without this field migrate to an empty progress object; reset clears it; export includes a deep copy.
- The detective office cards display attempts and the best recorded result.
- Unit tests: `tests/minigame-progress.test.mjs`.
- Service worker cache key: `dead-calm-visual-v92`.

These records are activity history, not fabricated clues or narrative facts. Story consequences should be authored and connected separately when a specific transmission or repair is tied to a case.
