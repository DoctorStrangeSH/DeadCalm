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


## Non-photographic character presentation

The cast consists of fictional, illustrated game characters. The portraits must read as authored digital paintings, never as photographs of real people.

Keep the approved painterly treatment, cinematic composition, expressive faces, and textured brushwork, but preserve clear illustration cues: designed shapes, intentional edge treatment, controlled facial detail, and art-directed color grouping. Do not push future work toward raw photorealism, camera-like skin texture, celebrity likeness, or documentary photography.

The goal is a beautiful, premium illustrated noir cast: believable and emotionally expressive, but unmistakably fictional artwork. Russian dialogue and UI do not determine the characters' nationality or appearance.


## First-artist reference study — mandatory for every future AI

The six shipped base portraits were inspected directly from the repository. They are the primary visual benchmark. Do not reduce their style to "dark portrait + warm lamp + rainy window". Their quality comes from the combination of painterly finish AND deliberate character/location differentiation.

### What makes the original six work

| Character | Face / silhouette cues | Role and wardrobe cues | Distinct environment / composition |
|---|---|---|---|
| Dr Lydia Winter | Adult woman; composed, intelligent gaze; dark hair gathered back; defined, mature facial structure | Medical professional; pale lab coat over dark shirt | Clinical examination room, cool overhead fluorescent light, medical storage and work surfaces; close portrait |
| Detective Ray Morgan | Older, weathered man; broad, heavy features; short dark hair with grey; visible stubble | Detective; worn brown leather jacket, loosened tie, badge | Police/detective office; filing cabinet, desk lamp, rain-lit city window; square, direct framing |
| Anna Holt | Younger adult woman; softer oval face; long, loose dark hair; restrained, thoughtful expression | Modest cardigan and blouse; understated civilian clothing | Book-lined study / archive with desk, books and warm table lamp; seated three-quarter composition |
| Marta Hayes | Adult woman; strong, angular features; short-to-medium tousled dark hair; confident, guarded gaze | Practical olive field jacket and dark knitwear | Intimate pub / booth-like interior, amber wall light, notes and recorder on table; relaxed leaning pose |
| Father Thomas | Slim adult man; tired, narrow features; dark tousled hair; solemn eyes | Clerical collar, dark cardigan and cross | Church interior, stained glass, candle and crucifix; frontal, restrained composition |
| Sebastian Blackwood | Older, silver-haired man; long, refined facial structure; controlled expression | Expensive tailored dark suit, waistcoat and burgundy tie | Private executive study/library with nautical/map objects and arched rain window; formal seated composition |

These are visual observations from the existing assets, not permission to rewrite their canon or infer ethnic/national identity.

### Hard rules: uniqueness before generation

1. **One character must not inherit another character's face.** Before generating, write a distinct face design: age range, face shape, jaw, nose, eye shape, skin details, hair texture/style, build and signature silhouette. Compare it against all six existing portraits and every new character already approved.
2. **No default "same handsome man" template.** Vary age, facial proportions, body type, hairline, facial hair, posture and expression according to the character's role and biography. Not every man is young, dark-haired, clean-shaven or conventionally handsome; not every woman has the same oval face and long dark hair.
3. **Every character gets a reason-specific location.** Choose a location from their actual life and work: clinic, church, police records room, harbor, factory floor, station platform, cramped flat, hotel kitchen, courtroom archive, etc. Do not repeatedly use the same dark study, desk lamp, leather chair, bookshelf, rain window or office.
4. **Vary composition deliberately.** Change camera distance, head angle, body pose, eye line, framing and background depth. Do not make every portrait a centered bust looking at camera.
5. **Keep the art style consistent, not the image recipe identical.** Preserve the original painterly digital-oil finish, expressive natural anatomy, nuanced brushwork, restrained cinematic palette and premium narrative-game quality. Consistency is in rendering quality and art direction; diversity is in faces, silhouettes, wardrobe, setting, lighting and composition.
6. **Create one finished portrait, not a sheet of drafts.** The requested deliverable is a polished, production-quality individual portrait. No contact sheets, sketch pages, moodboards, repeated variations or multiple near-identical attempts unless the user explicitly asks for them.
7. **Do not generate a batch of characters in one image.** One portrait per character, with a clean composition and no captions, labels, borders, UI mockups or watermarks.
8. **Do not keep regenerating an already approved portrait.** Once the user approves a character, lock that face and only create expression variants or new poses by referencing that exact approved image. Do not reinterpret the design from text alone.
9. **Do not modify the original six.** Lydia Winter, Ray Morgan, Anna Holt, Marta Hayes, Father Thomas and Sebastian Blackwood are first-artist canon. Never repaint, replace, redesign or "improve" them without explicit user instruction.
10. **No nationality stereotypes.** Blackford is not a Russian setting. Russian text is localization only. Names or translated dialogue must never determine a character's facial features, clothing, ethnicity or cultural stereotypes. Keep the cast's international fictional setting grounded in story and role.
11. **Review against the originals before shipping.** Put the proposed portrait beside the six actual base files and ask: Is the face unmistakably distinct? Is the location different and motivated? Is the composition fresh? Does it still look like it belongs in the same game? If any answer is no, stop and redesign before integrating.
12. **Never claim a generated concept is in the game.** A portrait is not integrated until its real asset file is committed, the portrait registry is updated, the scene uses it, and the project has been checked.

### Required workflow for every future AI handoff

- Read this document before touching character art.
- Open and inspect all six original base portraits from `src/assets/portraits/`; do not rely on text descriptions or generated substitutes.
- Inspect existing portrait registry and already-approved new character assets to avoid duplicating faces.
- Write a short identity + location + composition brief for the new character before generating.
- Generate exactly one finished individual portrait at a time.
- Compare it against the original six and all approved new characters.
- Only then create the needed emotion variants, preserving the exact identity.
- Integrate and test the actual asset; otherwise leave it as a concept and say so honestly.

**Quality gate:** if a new character could be mistaken for an existing character, or if the image looks like another portrait in the same room with only the clothes changed, it is rejected. Do not ship it and do not ask the user to accept repeated near-duplicates.
