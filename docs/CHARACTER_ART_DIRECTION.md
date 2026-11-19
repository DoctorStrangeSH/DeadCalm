# Dead Calm — Character Art Direction

Status: visual reference lock for the Blackford character portrait set.
Scope: this document describes the existing portrait artwork in `src/assets/portraits/`. It does not authorize replacing, repainting, or regenerating those assets without review.

## The visual standard

Dead Calm uses grounded, cinematic, painterly character portraits. The intended finish is premium narrative-game concept art, not generic stock photography, caricature, or cartoon illustration.

Keep these characteristics consistent:

- Expressive, individual faces with natural anatomy and believable age.
- Painterly surface treatment with visible, controlled brushwork and detailed fabric, hair, and skin.
- Restrained noir palette: cool rain-washed blue/teal shadows balanced by warm amber practical lights.
- Atmospheric Blackford interiors and rainy windows where present.
- Character-specific wardrobe and silhouette; no interchangeable template faces.
- Consistent portrait framing, scale, lighting logic, and level of finish across the cast.
- Emotional variants must preserve the same person's identity, facial structure, hairstyle, age, and clothing continuity. Only expression, pose, and emotional lighting may change as authored.

## Existing portrait set — preserve as the reference

| Character | Base portrait | Emotional variants |
|---|---|---|
| Dr Lydia Winter | `lydia-winter.webp` | `lydia-winter-tension.webp`, `lydia-winter-warmth.webp`, `lydia-winter-withdrawal.webp` |
| Detective Ray Morgan | `ray-morgan.webp` | `ray-morgan-tension.webp`, `ray-morgan-warmth.webp`, `ray-morgan-withdrawal.webp` |
| Anna Holt | `anna-holt.webp` | `anna-holt-tension.webp`, `anna-holt-warmth.webp`, `anna-holt-withdrawal.webp` |
| Marta Hayes | `marta-hayes.webp` | `marta-hayes-tension.webp`, `marta-hayes-warmth.webp`, `marta-hayes-withdrawal.webp` |
| Father Thomas | `father-thomas.webp` | `father-thomas-tension.webp`, `father-thomas-warmth.webp`, `father-thomas-withdrawal.webp` |
| Sebastian Blackwood | `sebastian-blackwood.webp` | `sebastian-blackwood-tension.webp`, `sebastian-blackwood-warmth.webp`, `sebastian-blackwood-withdrawal.webp` |

All files live under `src/assets/portraits/`. The mapping and emotional-variant selection are already wired in `src/js/components/dialog-box.js`.

## Non-negotiable rules for future character art

1. Reuse the existing portrait set and its identity continuity as the first reference.
2. Do not substitute generic generated portraits, stock images, or unrelated web imagery.
3. Do not infer a character's appearance, nationality, or ethnicity from a localized name or dialogue language.
4. Russian localization applies to UI and dialogue; it does not dictate character appearance or art direction.
5. Do not introduce a new character portrait until it has been reviewed beside the existing six base portraits and their variants.
6. Do not overwrite or delete a working portrait or variant as part of routine refactoring.
7. For any new portrait, create a complete consistent set of emotional states only when the character's dialogue system needs them; otherwise add a single portrait that matches the established framing and finish.

## Review checklist

- Does the face read as a distinct, memorable person?
- Does it match the painterly realism and noir lighting of the existing set?
- Is the same identity preserved across emotional variants?
- Does the clothing fit the character's role and remain coherent between states?
- Does it look convincing beside Lydia Winter, Ray Morgan, Anna Holt, Marta Hayes, Father Thomas, and Sebastian Blackwood?
- Has the asset been connected through the existing portrait map rather than a one-off inline image?

If any answer is no, do not ship the portrait.


## Approved portrait assets — identity lock

The six existing base portraits and their authored emotional variants are the approved character-art canon. Preserve them as the primary visual reference:

- Lydia Winter: `lydia-winter.webp` and her tension / warmth / withdrawal variants.
- Ray Morgan: `ray-morgan.webp` and his tension / warmth / withdrawal variants.
- Anna Holt: `anna-holt.webp` and her tension / warmth / withdrawal variants.
- Marta Hayes: `marta-hayes.webp` and her tension / warmth / withdrawal variants.
- Father Thomas: `father-thomas.webp` and his tension / warmth / withdrawal variants.
- Sebastian Blackwood: `sebastian-blackwood.webp` and his tension / warmth / withdrawal variants.

These portraits define the intended finish: premium painterly realism, individual attractive adult faces, natural anatomy, nuanced expression, period-appropriate clothing, rain-cooled teal shadows and warm amber practical lighting. They belong to Blackford's fictional international/British-noir setting.

Russian is the game's localization language only. It must never be used as a visual brief for national stereotypes, facial features, wardrobe, or character identity. Keep the cast's established names, backgrounds, and designs.

Do not use image-search previews, generic stock art, or unrelated generated portraits in the game UI or as substitutes in design reviews. The images shown in conversational mockups are not game assets. When discussing in-game character art, reference the actual files above.

Orlov and Klimov currently have narrative dossiers but are not part of the six approved portrait set. Do not assign them guessed portraits or force them into the cast visually. If they need portraits later, design them intentionally beside the approved set and review identity, framing, palette, and finish before integration.
