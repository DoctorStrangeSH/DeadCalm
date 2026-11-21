# Dead Calm — аудит чистоты репозитория перед 1.0

**Дата:** 2026-11-20  
**Базовая ветка:** `main`  
**Рабочая ветка:** `chore/pre-release-repository-hygiene`  
**Статус:** безопасная уборка и статические проверки выполнены; GitHub Actions CI успешно прошёл (305/305 тестов на run `44894671507`); ручной браузерный/gameplay/PWA QA остаётся открытым.

Этот документ фиксирует уборку репозитория как отдельную техническую задачу. Он не меняет игровой scope и не заменяет `docs/MASTER_GAME_SPEC_RU.md`.

## Правила безопасной уборки

- Не удалять файлы только по названию, возрасту или малому размеру.
- Перед удалением проверять импорты, динамические маршруты, HTML/CSS ссылки, Service Worker precache, тесты и документацию.
- Не трогать шесть утверждённых портретов и их эмоциональные варианты.
- Не менять сюжет, игровые механики, набор локаций и лимит трёх мини-игр.
- Не смешивать эту уборку с PR #2 (`feat/case001-npc-memory-reactions`).
- Удаление допускается только после доказанной недостижимости и прохождения CI.
- Сомнительные материалы сначала классифицировать как `KEEP`, `FINISH`, `SIMPLIFY`, `REMOVE` или `DEFER`.

## Подтверждённый снимок main на начало аудита

- Default branch: `main`.
- Корневой `package.json` присутствует; тесты запускаются через Node.js built-in test runner, Node.js >=22.
- Workflow `.github/workflows/ci.yml` присутствует.
- `README.md` отсутствовал — добавлен в рабочую ветку.
- `.gitignore` отсутствовал — добавлен в рабочую ветку.
- `CONTRADICTIONS.md` теперь короткий указатель; исторический журнал сохранён в `docs/INVESTIGATION_SYSTEM_CHANGELOG_RU.md`. Исполняемые правила находятся в `src/data/contradictions.json`.
- Каноническая спецификация: `docs/MASTER_GAME_SPEC_RU.md`.
- Канонические документы истории: `docs/CASE_001_STORY_BIBLE_RU.md`, `docs/CASE_001_DETECTIVE_BLUEPRINT_RU.md`, `docs/CANON_LEDGER_RU.md`.
- Пост-релизная архитектура вынесена в `docs/CASE_ARCHITECTURE_POST_1.0_RU.md`; она не является разрешением добавлять её реализацию в 1.0.
- Модули `old-case-*` НЕ являются мусором: `crime-scene.js` импортирует `old-case-crosscheck.js`, а `police-station.js` импортирует цепочку `old-case-*`; полный маршрут дополнительно покрыт `tests/old-case-full-route.test.mjs`. Оставить их и продолжать сверять реализацию с каноном.
- `src/js/scenes/investigation.js` вызывается из `office.js` и остаётся в проекте. `minigame-test.js` и `chase-scene.js` не имели входящих переходов из игровых сцен; `Minigames.start()` вызывался только из этих двух сцен. Реестр `Minigames` динамически загружал компоненты lockpick/cipher/fingerprints/chase, которые не входили в утверждённый набор трёх мини-игр 1.0. Эта недостижимая цепочка удалена в рабочей ветке.
- `src/css/style.css` не подключался из `index.html` (там используются `main.css`, `animations.css`, `art-direction.css`) и не импортировался из других таблиц стилей; файл удалён. Также удалён из `main.css` отдельный legacy-блок CSS для старых мини-игр/QTE/chase.
- `manifest.json` использует два авторских SVG в `assets/icons/`; существование файлов и включение в precache проверяются автоматически. Браузерная проверка установки и отображения иконок остаётся открытой.
- Tailwind CSS загружается с `cdn.tailwindcss.com`; без сети стили CDN не гарантированы.
- Статическая проверка Node.js выявила и помогла исправить четыре ранее скрытые ошибки production-сцен: некорректные буквальные `\\n` в обработчиках `bar.js` и `port.js`, повторное объявление `assignments` в `crime-scene.js`, некорректную вложенную шаблонную строку результата в `mechanical-repair.js`. Исправления включены в PR.
- Service Worker содержит собственный precache; любые перемещения/удаления должны сопровождаться синхронной проверкой `sw.js` и `tests/service-worker-assets.test.mjs`.

## Чек-лист уборки

### A. Корень и документация
- [x] Добавить краткий `README.md`: запуск, требования Node.js, тесты, структура и ссылка на master spec.
- [x] Добавить `.gitignore` для подтверждённых локальных/генерируемых файлов.
- [x] Классифицировать `CONTRADICTIONS.md`: исторический журнал перенесён в `docs/INVESTIGATION_SYSTEM_CHANGELOG_RU.md`; корневой файл стал указателем на канонические источники.
- [ ] Проверить устаревшие документы и ссылки на несуществующие файлы.
- [x] Проверить получение обязательных улик по реальным диалогам, сценам и мини-играм; ручное прохождение остаётся отдельным QA.
- [ ] Свести статусы этапов в master spec / отдельный release checklist; не дублировать несколько конкурирующих roadmap.

### B. Код и сцены
- [x] Проверить статические импорты и переходы между игровыми сценами для legacy-прототипов.
- [x] Проверить связи `old-case-*`: они используются production-сценами и регрессионным маршрутом; сохранить.
- [x] Удалить недостижимые test/debug scenes и старый реестр мини-игр, не входящие в утверждённый набор 1.0.
- [x] Удалить не подключённый `style.css` и отдельный legacy CSS-блок прототипных мини-игр; массовый форматирующий рефакторинг не проводился.
- [x] Для каждого удалённого кандидата зафиксировать решение и доказательство отсутствия использования: реестр решений ниже; удалена только подтверждённая недостижимая цепочка.

### C. Ассеты и PWA
- [x] Исправить ссылки на иконки в `manifest.json` и проверить реальные файлы; regression suite проверяет существование обоих SVG и их включение в precache.
- [ ] Сверить реальные ссылки на все изображения, шрифты и аудио.
- [x] Провести первичную инвентаризацию визуальных ассетов без затрагивания защищённых портретов: 7 фонов, 24 портретных файла и 2 SVG-иконки; фоновые файлы используются сценами/CSS/картой, портреты подключены через карту диалогов.
- [x] Сверить размеры и точные Git blob SHA визуальных ассетов: максимальный файл — 415862 байт; совпадающих blob SHA не обнаружено.
- [x] Проверить состав precache и синхронность версии кеша автоматическими тестами (`tests/service-worker-assets.test.mjs`).
- [ ] Проверить offline fallback, установку и обновление Service Worker вручную в браузере.
- [ ] Не объявлять полную offline-готовность до браузерного QA, включая внешний Tailwind CDN.

### D. Проверки и релизная чистота
- [x] `npm test` проходит на ветке уборки: 298/298 тестов, 0 failures (run `44872200356`, HEAD `46d74eb0`).
- [x] `node --check` для всех production JS-файлов и Service Worker выполняется в regression suite.
- [x] Все JSON из `src/data/` и `manifest.json` валидны (проверяется regression suite).
- [x] Локальные статические импорты разрешаются; production scene links, найденные в рамках аудита, проверены. Полный ручной маршрут остаётся отдельным QA.
- [x] Статические локальные ссылки в `index.html`, CSS `url()`, фоны сцен и портреты диалогов проверяются тестом `tests/asset-integrity.test.mjs`.
- [x] Проверены имена всех отслеживаемых файлов на `.env`, логи, дампы, временные/резервные файлы и архивы: подозрительных имён не найдено.
- [ ] Отдельное сканирование содержимого на секреты и персональные данные ещё не выполнялось; не считать отсутствие подозрительных имён доказательством отсутствия секретов.
- [x] Проверены размеры всех 212 отслеживаемых файлов и дубли визуальных ассетов: крупнейший файл — 415862 байт; совпадающих blob SHA среди 33 визуальных ассетов: 0.
- [ ] Ручной браузерный прогон desktop/mobile и сохранений выполнен отдельно от unit-тестов.

## Реестр решений по найденным кандидатам

| Кандидат | Статус | Условие решения |
|---|---|---|
| `README.md` | DONE | Добавлена инструкция запуска и структура |
| `.gitignore` | DONE | Игнорируются node_modules, coverage, OS-файлы, локальные env и логи |
| `CONTRADICTIONS.md` | INDEX | Короткий указатель; исторический журнал перемещён в `docs/INVESTIGATION_SYSTEM_CHANGELOG_RU.md`, runtime-правила — в `src/data/contradictions.json` |
| `old-case-*` модули/тесты | KEEP | Подключены к `crime-scene.js` / `police-station.js`, покрыты full-route тестом |
| `minigame-test.js` | REMOVED | Нет входящих игровых переходов; был единственным тестовым входом к старому менеджеру мини-игр |
| `investigation.js` | KEEP | Вызывается из `office.js` как активная доска расследования |
| `chase-scene.js` / chase component | REMOVED | Нет входящих игровых переходов; legacy QTE/chase цепочка вне scope 1.0 |
| cipher/fingerprints/lockpick components | REMOVED | Загружались только через недостижимый legacy manager; не входят в утверждённый набор мини-игр |
| `src/css/style.css` | REMOVED | Не подключался приложением и не импортировался другими стилями |
| Иконки manifest | DONE / BROWSER QA OPEN | Добавлены два авторских SVG, manifest и precache обновлены; install/offline QA ожидает браузерной проверки |
| прочие крупные файлы | AUDIT | Не дробить/переписывать без измеримого риска или критерия |

## Итоговый статус

- [x] Создан отдельный рабочий branch от актуальной `main`.
- [x] Зафиксированы правила безопасной уборки и scope lock.
- [x] Составлен первичный список подтверждённых кандидатов.
- [x] Добавлены README и .gitignore в рабочую ветку.
- [x] Проверены импорты и достижимость удалённой legacy-цепочки.
- [x] Исправлены ссылки на PWA icons: manifest ссылается на два существующих SVG-ресурса.
- [x] Удалены 9 доказанно недостижимых файлов: 2 сцены, 5 компонентов, 1 менеджер, 1 CSS-файл.
- [x] Regression suite и статические проверки пройдены в GitHub Actions: 298/298, 0 failures (run `44873941145`, implementation HEAD `a6e4f7b8`; документационные follow-up коммиты не меняли runtime-код).
- [ ] Выполнен install/offline/update QA в браузере.
- [x] Основные локальные ссылки HTML/CSS/сцен/портретов проверяются автоматически.
- [ ] Ручной браузерный маршрут desktop/mobile и сохранений выполнен отдельно от unit-тестов.
- [x] PR #3 прошёл CI: 298/298 тестов, 0 failures (run `44873941145`); ручной browser/PWA QA и решение о merge остаются открытыми.

**Важно:** удалена только недостижимая legacy-цепочка, подтверждённая проверкой переходов и импортов. Старые системы `old-case-*`, которые реально используются в расследовании, сохранены. Четыре ошибки синтаксиса/рендеринга production-сцен исправлены и покрыты общей проверкой синтаксиса. HTML/CSS/сценовые фоны/портреты и manifest icons проходят статическую проверку. Ручной браузерный QA всё ещё не выполнен.


### Дополнение после PWA-аудита — 2026-11-20
- Созданы авторские векторные иконки Blackford lighthouse: `assets/icons/icon-192.svg`, `assets/icons/icon-512.svg`.
- `manifest.json` ссылается на существующие SVG с размерами `any`; 512-вариант помечен `maskable`.
- `index.html` использует 512-вариант как favicon.
- `sw.js` обновлён до `dead-calm-visual-v103`; обе иконки добавлены в precache.
- Regression suite дополнен проверками существования manifest icons и наличия иконок в precache.
- Визуальное отображение, установка, обновление и offline-поведение всё ещё требуют ручной браузерной проверки.


### Финальная защита концовок — 2026-11-20
- Условия обеих концовок проверяются в `GameState.completeCampaign()`, а не только в UI.
- Признание Маркуса и все обязательные документы нужны для любого финала.
- Компромиссный финал допускает радиофрагмент или плёнку; публичный финал требует кадр качества ≥95.
- Повторный вход в порт после завершения показывает сохранённый финал.
- Прямой вызов `GameState.setCampaignDay()` не может обойти дневные evidence gates.
- Проверка на implementation HEAD `1526924e`, run `44794568155`: **276/276, 0 failures**, включая прямую защиту дневных переходов и повторный вход в порт.


### Маршрут признания Маркуса — 2026-11-20
- Показания Маркуса — отдельная улика пятого дня в порту; она не выдаётся автоматически при загрузке локации.
- Получение привязано к действию игрока и реплике признания; только после этого появляется финальное предъявление.
- Добавлена проверка сценарного маршрута и условий доступа.
- GitHub Actions run `44796270418`: **277/277, 0 failures**.


### Финальное досье и ограничения доказательств — 2026-11-20
- В финальной сцене добавлено досье с фактом и пределом каждого ключевого источника.
- Неизвестный звонящий, радиоголос и частичный кадр не превращаются в ложную идентификацию.
- Проверка unit-тестами: GitHub Actions run `44796931029`, **279/279, 0 failures**.


### Сюжетная непрерывность: источник Марты — 2026-11-20
- Первая встреча больше не раскрывает Марте личность анонимного источника; реплика соответствует канону истории.
- Добавлен регрессионный тест. Run `44797252446`: **280/280, 0 failures**.


### NPC-диалоги и стартовое доверие — 2026-11-20
- Исправлено применение `initial_trust` из профилей персонажей; существующие сохранения сохраняют текущее доверие.
- Добавлен автоматический аудит шести NPC и зависимостей диалоговых реплик.
- Улики Анны о последнем вечере и содержимом коробки разделены на два источника.
- GitHub Actions run `44799061961`: **284/284, 0 failures**.


### Критические решения NPC — 2026-11-20
- Добавлен интеграционный регрессионный тест шести вариантов критических выборов Лидии и Рэя.
- Проверяются доверие, флаги памяти, тексты последствий и защита от повторного выбора.
- GitHub Actions run `44799917961`: **285/285, 0 failures**.


### Четыре оставшиеся ветки критических диалогов — 2026-11-21
- Добавлены решения и последствия для Марты Хейз, отца Томаса, Анны Холт и Себастьяна Блэквуда.
- Проверены доверие, сохранение флагов, тексты последствий и отсутствие повторного выбора.
- Регрессионный тест также защищает ключевые сюжетные ограничения персонажей.
- GitHub Actions run `44871661012`: **287/287, 0 failures**.


### Сквозная проверка маршрутов улик — 2026-11-21
- Добавлен тест реальных путей получения обязательных улик через шесть NPC, сценовые действия и три мини-игры.
- Подтверждён обязательный шаг связывания первичного рапорта и вскрытия в гипотезе до открытия вопроса Рэя о звонке.
- Проверены пороги качества плёнки и радио, а также доступность действий в соответствующие дни.
- GitHub Actions run `44872200356`: **298/298, 0 failures**.
- Это не закрывает ручной браузерный QA и проверку desktop/mobile.


### Story-gated mini-games — 2026-11-21
- Доступ к трём мини-играм синхронизирован с канонической последовательностью четвёртого дня.
- Радиоприём открывается с четвёртого дня; ремонт часов — после получения вещей Маркуса от Анны; реставрация плёнки — только после получения ключа из часов.
- Ограничения работают и в карточках кабинета, и при прямом открытии сцены; закрытая сцена показывает объяснение и возврат в кабинет.
- Добавлены minigame-access.js и tests/minigame-access.test.mjs; CI run 44873829358: **298/298, 0 failures**.


### Инвентаризация визуальных ассетов — 2026-11-21
- В дереве проекта найдено 33 визуальных файлов: 7 фоновых WebP, 24 портрета (6 персонажей × 4 состояния) и 2 SVG-иконки PWA.
- Крупнейший ресурс: 415862 байт (406.1 KiB); файлов с одинаковым Git blob SHA: 0.
- Фоновые ресурсы используются сценами, картой города или общей арт-дирекцией; 24 портретных состояния перечислены в src/js/components/dialog-box.js; PWA-иконки указаны в manifest и Service Worker.
- В репозитории нет отдельных аудиофайлов. `Audio` mixer теперь принимает и сохраняет уровни музыки/SFX, но `playSfx()` и `startAmbient()` пока заглушки; источники музыки, атмосферы и эффектов не реализованы. Это остаётся открытой задачей аудио 1.0.
- Главное меню теперь содержит доступную панель настроек: громкость музыки/SFX, скорость текста, Escape/focus trap, сохранение и нормализация настроек. Настройка скорости применяется к печати диалогов. Проверено CI; визуальный браузерный QA панели ещё открыт.


### Проверка файлового дерева — 2026-11-21
- В рабочей ветке 212 отслеживаемых файлов.
- По именам не обнаружены `.env`, логи, дампы, временные/резервные файлы и архивы.
- Крупнейший файл — `src/assets/backgrounds/blackford-city-atlas.webp` (415862 байт). Остальные крупные файлы — production-сцены, CSS и данные кампании; удалять или дробить их без конкретного дефекта не требуется.
- Сканирование содержимого на секреты/персональные данные не запускалось; этот пункт оставлен открытым, чтобы не выдавать поверхностную проверку имён за полноценный secret scan.


### Аудит внешних зависимостей и адреса размещения — 2026-11-21
- `package.json` не содержит runtime npm dependencies и build step; Node.js 22 используется только для regression tests.
- Единственная подтверждённая внешняя runtime-зависимость оформления — `https://cdn.tailwindcss.com` в `index.html`. При недоступности CDN utility-классы Tailwind не гарантированы; это уже отражено в README и остаётся релизным ограничением до локальной сборки CSS либо принятия осознанного сетевого требования.
- В `index.html` используются локальные CSS и ES module entrypoint; шрифты Google Fonts и внешние изображения не подключены. Игровые шрифты — системные Courier/Georgia.
- В `src/js/core/app.js` регистрация Service Worker задана абсолютным путём `/sw.js`; `sw.js` использует origin-root пути `/...` для всего precache; CSS/HTML также содержат пути от корня. Такой вариант рассчитан на публикацию в корне origin.
- GitHub API подтверждает, что Pages включён для репозитория, но у репозитория нет `homepage` и в репозитории не найдено явного deployment-конфига, однозначно фиксирующего production URL. Поэтому нельзя утверждать, что root-origin предположение соответствует фактической публикации.
- [x] Зафиксировать целевой хостинг: Vercel, статическая публикация из корня origin. Это соответствует текущим абсолютным путям `/...` и не требует GitHub Pages project-subpath адаптации.
- [x] Добавить `vercel.json`: entrypoint, manifest и Service Worker получают no-cache; Service Worker явно разрешён для корня origin.
- [x] Добавить `tests/vercel-deployment.test.mjs` для cache headers, Service-Worker-Allowed и отсутствия выдуманного build/runtime dependency.
- [x] Создать Vercel project `dead-calm` в команде `SherlockDS` и подключить `DoctorStrangeSH/DeadCalm`; feature branch получает Preview deployment.
- [ ] Подтвердить фактический preview URL и проверить в браузере загрузку ресурсов, сохранения и PWA. Production не публиковать до RC.
- Ручная проверка загрузки Tailwind при отключённой сети и install/update/offline Service Worker остаётся частью браузерного QA.


### Vercel static hosting preparation — 2026-11-21
- Выбран Vercel как целевой хостинг: приложение является статическим ES-module сайтом без runtime npm dependencies и build step; root-origin размещение совместимо с текущими путями и Service Worker scope.
- Добавлен `vercel.json` с no-cache для `/`, `/index.html`, `/manifest.json`, `/sw.js`, а также `Service-Worker-Allowed: /` для SW.
- Добавлен `tests/vercel-deployment.test.mjs`: проверяет Vercel cache rules, Service Worker scope и отсутствие runtime/build dependency.
- Vercel project `dead-calm` создан в team `SherlockDS` (Hobby), GitHub-репозиторий подключён. Project ID: `prj_0Zz8xgWCU80YWg8JGhoN6Nns47nx`; production branch — `main`.
- При первом push сразу после создания Git-проекта Vercel создал bootstrap deployment `dpl_Ab5U8Hbp3KFrMXihL4cMKqEG43L4` с `target: production` и стандартным alias `dead-calm.vercel.app`; Git metadata указывает feature branch. Интеграция при создании сообщила production branch `main`.
- Последующие push в ту же feature branch создали корректные preview deployments (`target: null` в API; Preview в deployment card) с отдельным branch alias. Последний подтверждённый Preview указан ниже.
- В качестве защиты включён SSO для **всех** deployment targets (`deploymentType: all`), включая bootstrap production alias и preview. Анонимный публичный доступ закрыт; пользовательские домены не подключались.
- Попытка включить Vercel Deployment Policies отклонена тарифом Hobby (`pro_plan_required`); автоматическая Git production deployment policy не настраивалась. Production branch reported as `main`; перед релизом проверить её в Vercel Project Settings.
- Preview build READY подтверждает сборку и публикацию файлов, но не заменяет ручной браузерный smoke test.


### Vercel deployment protection follow-up — 2026-11-21
- GitHub Actions run `44894131637` completed successfully; regression suite including the new Vercel config tests passed.
- Vercel deployment `dpl_Ab5U8Hbp3KFrMXihL4cMKqEG43L4` is READY from commit `78ac6723a82e45ca30387088de7f481e9ebbfd50` (feature branch). Vercel API reports `target: production` and attached default aliases; this is an unexpected target/branch mismatch and must be resolved before further automatic deployments.
- SSO protection was changed from `all_except_custom_domains` to `all`, covering default aliases and any future custom domain until deliberately changed.
- Deployment Policies are unavailable on current Hobby plan (`403 pro_plan_required`). This limitation is explicit; do not claim Git production deployment prevention is configured.
- No production release was intentionally promoted, no custom domain was added, and no manual browser QA has been completed.


### Latest Vercel preview verification — 2026-11-21
- Latest feature-branch deployment: `dpl_8u8ZCKEjP5QSYTkVH5GbxHVLGfhG`, state READY, preview target, commit `9cf66a86888d9c6792815caace4ddd56b7f86194`.
- Последний Preview на момент этого аудита: `dpl_876z4rFcXyvb74ELz9pGMekZijoy`, READY, commit `d816a4e03ff5386e8ed959e437a913e6ec4d8bde`; URL `https://dead-calm-6rh9mq1tn-sherlock-ds.vercel.app`; branch alias `https://dead-calm-git-chore-pre-release-repository-hygiene-sherlock-ds.vercel.app`.
- Bootstrap production deployment remains SSO-protected; project SSO mode is `all`. No custom domain or public release was configured.
- Vercel Hobby does not support Deployment Policies; do not claim a Git-production policy gate exists. Verify production branch `main` in the dashboard before a release.
- GitHub Actions run `44894131637`: **301/301 tests passed**, 0 failures. This run includes `tests/vercel-deployment.test.mjs`.
- Browser QA is still outstanding; deployment READY is not a gameplay acceptance result.


### Settings completion slice — 2026-11-21
- Удалена заглушка `alert()` из кнопки настроек главного меню; добавлена панель в стиле Blackford Noir с доступными range/select controls, `aria`-диалогом, Escape, возвратом фокуса и ограничением Tab-фокуса.
- `GameState` нормализует сохранённые настройки: громкость ограничена 0..1, неподдерживаемая скорость текста возвращается к `normal`.
- `Audio.init(settings)` применяет сохранённые уровни к mixer gain nodes; setters ограничивают значения и игнорируют нечисловые.
- Скорость диалогового typewriter теперь учитывает `slow` (42 ms), `normal` (25 ms), `fast` (12 ms), `instant` (0 ms); `prefers-reduced-motion` по-прежнему показывает реплику сразу.
- Service Worker cache version повышен до `dead-calm-visual-v105`; тесты ожидают новую версию.
- Добавлены проверки `tests/audio-settings.test.mjs`, нормализации сохранённых настроек и интеграции панели в `tests/visual-integrity.test.mjs`.
- GitHub Actions run `44894671507`: **305/305 tests passed**, 0 failures. Vercel preview `dpl_876z4rFcXyvb74ELz9pGMekZijoy` READY на commit `d816a4e`; более новый deployment создаётся автоматически при последующих push.
- Ограничение: реальное воспроизведение музыки/SFX/ambient не завершено — `playSfx()`/`startAmbient()` остаются заглушками, аудиоисточников в репозитории нет. Не помечать весь аудио-этап как готовый.
