> **Scope lock для версии 1.0.0:** этот документ описывает принципы и уже существующие прототипы мини-игр. Количество мини-игр в релизе ограничено тремя: Mechanical Repair, Analog Radio Tuning и Film Restoration. Новые мини-игры до 1.0 не добавлять. При расхождении по объёму приоритет имеет `docs/MASTER_GAME_SPEC_RU.md`. Исторические пометки «предлагается/планируется» ниже не являются обещанием добавить новые активности.

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


## История разработки игровых сцен (архив)

Раздел сохранён для истории решений и не описывает актуальный статус. Все перечисленные ниже ранние прототипы с тех пор получили игровые сцены, входы из кабинета, сохранение результатов и сюжетные награды. Источник актуального статуса и критериев приёмки — раздел **«Текущий статус реализации для релиза 1.0»** ниже.

- **Mechanical Repair:** исходная машина состояний из четырёх этапов (осмотр, снятие натяжения, совмещение детали, проверка хода) стала сценой `src/js/scenes/mechanical-repair.js`.
- **Analog Radio Tuning:** непрерывная настройка частоты и фильтра помех стала сценой `src/js/scenes/radio-tuning.js`.
- **Film Restoration:** управление протяжкой и восстановление трёх дефектов стало сценой `src/js/scenes/film-restoration.js`.
- Ранние значения кеша Service Worker и незаконченные статусы из прототипного периода не являются текущими критериями релиза. Актуальный кеш — `dead-calm-visual-v104`.

---

## Текущий статус реализации для релиза 1.0 — 2026-11-21

Этот раздел фиксирует состояние фактической ветки разработки и имеет приоритет над историческими статусами прототипов выше. Старые разделы сохраняются как журнал эволюции реализации.

### Общая интеграция
- Все три сцены доступны из кабинета детектива: `mechanical-repair`, `radio-tuning`, `film-restoration`.
- Результаты завершённых попыток сохраняются через `GameState.recordMiniGameResult`: количество попыток, последний и лучший результат/качество.
- Повторная попытка не затирает лучший результат худшим.
- Сюжетные улики выдаются отдельно от журнала активности и проходят проверку порогов в `src/js/systems/case-001-evidence.js`.
- Ручное браузерное прохождение и QA desktop/mobile ещё не подтверждены. Автоматические тесты не заменяют визуальную и интерактивную проверку в браузере.

### Mechanical Repair — часы Маркуса
- **Сцена и вход:** реализованы, вход из кабинета.
- **Игровой цикл:** осмотр пружины → контролируемое снятие натяжения → совмещение зубца → осторожная проверка хода.
- **Восстановление:** неверный осмотр/монтаж можно повторить; применение силы оставляет повреждение и переводит итог в частичный.
- **Сюжетная награда:** ключ из часов выдаётся только при результате `success`; частичный ремонт не раскрывает содержимое механизма.
- **Сохранение:** итог попытки записывается в историю мини-игр; ключ сохраняется как улика.
- **Ограничения качества:** иллюстрация механизма CSS-based; отдельные анимация шестерён, звук, контроллер и авторский painted asset не реализованы.
- **QA:** автоматические проверки логики есть; ручная проверка сцены и адаптивности ожидается.

### Analog Radio Tuning — портовый эфир
- **Сцена и вход:** реализованы, вход из кабинета и из портовой локации.
- **Игровой цикл:** непрерывная настройка частоты и фильтра помех; результат оценивается как чистый, фрагментарный или неразборчивый.
- **Сюжетная награда:** чистый или достаточно разборчивый фрагментарный сигнал может дать радиофрагмент. Неразборчивый шум уликой не становится.
- **Порог выдачи улики:** качество не ниже 68%, что соответствует нижней границе класса `fragmented` в `getRadioSignal`. Это предотвращает ошибочное описание неразборчивого сигнала как фрагментарного.
- **Сохранение:** попытки и лучший результат сохраняются; повторная настройка доступна после завершения.
- **Ограничения качества:** приёмник нарисован CSS; реальное воспроизведение шума/голоса, авторская озвучка и отдельный painted asset не реализованы.
- **QA:** автоматические проверки логики и порога улики есть; ручная проверка сцены и адаптивности ожидается.

### Film Restoration — архивная катушка
- **Сцена и вход:** реализованы, вход из кабинета.
- **Игровой цикл:** настройка натяжения/скорости → очистка пыли → полировка царапины → склейка разрыва → контрольная проекция.
- **Оценка:** чистый, частичный или повреждённый результат; ошибки и повреждения учитываются.
- **Сюжетная награда:** кадр с качеством не ниже 70% может стать уликой; при качестве от 95% личности на кадре могут быть различимы, ниже — не подтверждаются.
- **Сохранение:** попытки и лучший результат сохраняются; повторная реставрация доступна после завершения.
- **Ограничения качества:** оборудование и кадр визуализированы CSS; отдельная авторская иллюстрация аппарата, анимация движения плёнки и звук не реализованы.
- **QA:** автоматические проверки логики и порога улики есть; ручная проверка сцены и адаптивности ожидается.

### Критерии закрытия мини-игр для 1.0
- [x] Все три сцены существуют и подключены к реальным входам игры.
- [x] Для каждой логики есть автоматические тесты успешного/ошибочного результата и восстановления.
- [x] Результаты попыток сохраняются; лучший результат не ухудшается при повторе.
- [x] Сюжетные награды отделены от истории активности.
- [x] Неразборчивый радиосигнал не выдаёт улику; порог соответствует классу сигнала.
- [ ] Ручной браузерный прогон всех трёх сцен на desktop.
- [ ] Ручной прогон узкого мобильного viewport и touch-управления.
- [x] Реализированы видимый клавиатурный фокус, reduced-motion правила, озвучивание статусов/прогресса и touch targets от 44 px.
- [ ] Ручная проверка клавиатуры, экранного диктора, reduced motion и touch-жестов в браузере.
- [ ] Решение по финальному визуалу и звуку: завершить в рамках 1.0 либо явно исключить конкретные необязательные элементы без расширения scope.


- **Accessibility baseline:** видимый `:focus-visible` для интерактивных элементов, 44 px для кнопок, 22 px для ползунков, вертикальная прокрутка не блокируется жестом на range controls; статусы эфира объявляются через `aria-live`, шкалы эфира и реставрации размечены как `progressbar`. CSS учитывает `prefers-reduced-motion`.
- **Offline integration:** `minigame-access.js` и `minigame-lock-screen.js` включены в Service Worker precache; cache key обновлён до `dead-calm-visual-v104`. `tests/service-worker-assets.test.mjs` проверяет оба пути.
- Последний CI после обновления precache: run `44874881467`, **299/299, 0 failures**.
