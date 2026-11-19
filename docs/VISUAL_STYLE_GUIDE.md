# Dead Calm — Visual Style Guide

This is the visual source of truth for every new scene, mini-game, interface, illustration, and environmental asset. Derive visual decisions from the shipped game, not from generic noir references.

## Primary visual references in the repository

- Main title environment: `src/assets/backgrounds/blackford-harbor.webp`
- Detective's office environment: `src/assets/backgrounds/holt-office.webp`
- Approved character portrait canon: `src/assets/portraits/`
- Character-specific visual breakdown and identity lock: `docs/CHARACTER_ART_DIRECTION.md`
- Shared scene language: `src/css/art-direction.css`

The two environment paintings and six character portraits are the quality and art-direction references. Do not replace them with generic stock or unrelated image-search art.

## Visual DNA

- Cinematic, painterly, authored digital illustration; not flat vector UI, cartoon art, generic stock photography, or raw photorealism.
- Rain-washed blue/teal and blue-green shadows, slate and charcoal surfaces, deep ink-black negative space.
- Warm amber practical light used selectively: desk lamps, windows, candles, instrument indicators.
- Aged wood, worn leather, tarnished brass, dark painted metal, rain-streaked glass, damp stone, paper and archival textures.
- Strong environmental storytelling and distinct location compositions. Do not reuse the same room/background composition for every scene.
- Editorial serif typography for dramatic headings and readable prose; typewriter/monospace for timestamps, labels, frequencies, file metadata, and technical readouts.
- Subtle grain, restrained scanline texture, layered atmospheric depth, realistic shadows, and controlled highlights.
- UI should feel physically situated in Blackford: dark teal panels, muted warm-metal borders, parchment-like text accents, restrained interaction states. Avoid large bright-gold blocks and generic brown fantasy interfaces.

## Mini-game presentation

Mini-games may have different physical objects and interaction patterns, but must belong to the same Blackford world:
- Mechanical repair: cool steel and dark teal mechanism housing, aged brass only on small functional parts, localized amber work light.
- Radio tuning: dark enamel/wood receiver, cool green-blue display, muted brass controls, signal glow that feels like period hardware.
- Future activities must each have a distinct composition and object silhouette. Do not reuse a single generic centered panel or identical device mockup.
- Controls should be tactile and legible; feedback is integrated into the diegetic instrument/environment.
- Never let a CSS placeholder illustration masquerade as a finished painted asset. Label prototype art honestly and replace it with reviewed bespoke assets before final release.

## Character identity lock

The six approved characters and all authored emotional variants are protected. Do not repaint, regenerate, replace, or homogenize their faces. New character art requires comparison against all six approved portraits and review under `docs/CHARACTER_ART_DIRECTION.md`.

## Mandatory review before shipping

1. Compare the scene at desktop and mobile sizes against the title harbor and office background.
2. Confirm cool teal/blue shadows and selective amber lighting.
3. Confirm painted environment assets or clearly labeled prototype illustration; no unrelated stock/image-search art.
4. Check typography, material treatment, contrast, focus states, and reduced-motion behavior.
5. Ensure the scene has its own composition and silhouette rather than repeating another mini-game.
6. Confirm the six original portraits and their variants are unchanged.

When the user supplies a live website URL or screenshot, add it as a reference and update this guide only after comparing it with the shipped assets.
