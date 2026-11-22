# Dead Calm — аудит чистоты репозитория перед 1.0

**Дата:** 2026-11-20  
**Базовая ветка:** `main`  
**Рабочая ветка:** `chore/pre-release-repository-hygiene`  
**Статус:** безопасная уборка и статические проверки выполнены; процедурная аудиосистема реализована; GitHub Actions run `44896658535` успешно прошёл: 309/309 тестов на кодовом HEAD `c3c494d`; после этого выполнено только обновление release register; ручной браузерный/gameplay/PWA и listening QA остаются открытыми.

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
- В репозитории нет отдельных аудиофайлов: вместо них реализован оригинальный процедурный Web Audio слой. Музыка, ambience и SFX синтезируются локально без сетевых запросов и npm dependencies. Ручная проверка звучания/баланса остаётся открытой.
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
- [x] Подтвердить Preview URL: `https://dead-calm-jlr8c4e6g-sherlock-ds.vercel.app` (READY, commit `4460105a23e4504c9fe0ec1b465a092534de53a8`, SSO protected).
- [ ] Проверить в браузере загрузку ресурсов, сохранения, звук и PWA. Production не публиковать до RC.
- Ручная проверка загрузки Tailwind при отключённой сети и install/update/offline Service Worker остаётся частью браузерного QA.


### Vercel static hosting preparation — 2026-11-21
- Выбран Vercel как целевой хостинг: приложение является статическим ES-module сайтом без runtime npm dependencies и build step; root-origin размещение совместимо с текущими путями и Service Worker scope.
- Добавлен `vercel.json` с no-cache для `/`, `/index.html`, `/manifest.json`, `/sw.js`, а также `Service-Worker-Allowed: /` для SW.
- Добавлен `tests/vercel-deployment.test.mjs`: проверяет Vercel cache rules, Service Worker scope и отсутствие runtime/build dependency.
- Vercel project `dead-calm` создан в team `SherlockDS` (Hobby), GitHub-репозиторий подключён. Project ID: `prj_0Zz8xgWCU80YWg8JGhoN6Nns47nx`; production branch — `main`.
- При первом push сразу после создания Git-проекта Vercel создал bootstrap deployment `dpl_Ab5U8Hbp3KFrMXihL4cMKqEG43L4` с `target: production` и стандартным alias `dead-calm.vercel.app`; Git metadata указывает feature branch. Интеграция при создании сообщила production branch `main`.
- Последующие push в ту же feature branch создают корректные preview deployments (`target: null` в API; Preview в deployment card) с отдельным branch alias. Последний подтверждённый Preview указан ниже.
- В качестве защиты включён SSO для **всех** deployment targets (`deploymentType: all`), включая bootstrap production alias и preview. Анонимный публичный доступ закрыт; пользовательские домены не подключались. Первый bootstrap deployment не означает production release.
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
- Service Worker cache version в последующем аудио-срезе повышен до `dead-calm-visual-v106`; тесты ожидают актуальную версию.
- Добавлены проверки `tests/audio-settings.test.mjs`, нормализации сохранённых настроек и интеграции панели в `tests/visual-integrity.test.mjs`.
- GitHub Actions run `44894671507`: **305/305 tests passed**, 0 failures. Vercel preview `dpl_876z4rFcXyvb74ELz9pGMekZijoy` READY на commit `d816a4e`; более новый deployment создаётся автоматически при последующих push.
- Ограничение: реальное воспроизведение музыки/SFX/ambient не завершено — `playSfx()`/`startAmbient()` остаются заглушками, аудиоисточников в репозитории нет. Не помечать весь аудио-этап как готовый.


### Procedural audio foundation — 2026-11-21
- Добавлен оригинальный Web Audio синтез: четыре музыкальных профиля (menu / investigation / tension / finale), редкие мелодические ноты, процедурный шум дождя/порта/интерьера, отдельные master/music/SFX/ambient gain chains.
- Реализованы короткие сигналы UI, открытия/закрытия диалога, переходов, получения улики, успеха/ошибки и взаимодействий; звук включается только после первого пользовательского жеста, чтобы соблюдать autoplay policy браузеров.
- Сцены маршрутизируют музыку и окружение; завершённая кампания удерживает финальную тему. Видимость вкладки приостанавливает и возобновляет AudioContext.
- Шум окружения формируется из локального буфера и фильтруется high-pass/low-pass; сетевые запросы и аудиофайлы не нужны. Все цепочки имеют fade/cleanup.
- Добавлен `tests/audio-engine.test.mjs` для музыкальных профилей, ambience, SFX и pause/resume. CI ожидается; до его результата аудио-этап не помечать проверенным.


### Procedural audio implementation QA — 2026-11-21
- Музыка: menu / investigation / tension / finale — синтезированные слои и редкая мелодическая линия; переход между темами с плавным fade.
- Атмосфера: дождь, портовый ветер/волна и тихий интерьер — brown-noise buffer с high-pass/low-pass фильтрами и медленной амплитудной модуляцией. Ambient gain идёт в music bus, поэтому регулятор музыки управляет и атмосферой.
- Сигналы: UI click/adjust, открытие/закрытие диалога, переход сцены, новая улика, успех/ошибка и действие мини-игры. Клики/ползунки подключены делегированно в приложении.
- AudioContext разблокируется только первым pointer/keyboard жестом; при уходе вкладки suspend, при возвращении resume и восстановление сцены. В финале включается отдельная музыкальная тема.
- Исправлен уровень ambient bus: он должен быть unity gain, а уровень каждого профиля задаётся его локальным envelope. Убрана неиспользуемая зависимость Events из audio core.
- CI: запуск `44896211670` ожидает выполнения на исходном коммите теста; проверить свежий head и исправить все падения перед отметкой. Последний подтверждённый Preview до этой корректировки: READY, commit `76fac8c`.

- Follow-up lifecycle hardening: old ambience callbacks capture their own filter/gain nodes before a scene switch, so delayed `onended` cleanup cannot disconnect the newly started location ambience. Sustained music filters are also disconnected after fade-out.
- Mini-game-specific clicks use a distinct short mechanical cue; sliders retain a rate-limited adjustment tick.


### Audio 1.0 implementation — 2026-11-21
- [x] Синтезировать четыре музыкальных темы: меню, расследование, напряжённая мини-игра, финал.
- [x] Добавить атмосферу дождя, порта и тихого интерьера на основе локального noise buffer и фильтров.
- [x] Добавить UI/dialogue/evidence/mini-game сигналы; отдельный rate-limited tick для регуляторов.
- [x] Подключить аудио к смене сцен, завершению дела и результатам мини-игр.
- [x] Разблокировать AudioContext только после pointer/keyboard жеста; suspend/resume при смене видимости вкладки.
- [x] Разделить music/SFX/ambient gain; ambient подчиняется регулятору музыки.
- [x] Добавить cleanup для oscillator/filter/source и тест защиты от stale ambience callback при переходе сцены.
- [x] Устранить первый-click cooldown edge case; обновить тесты Web Audio AudioParam mock.
- [x] Получить зелёный CI на кодовом HEAD `c3c494dafe72d451d253dde870090f41b7d7f913`: run `44896658535`, **309/309**, 0 failures. После этого выполнено только обновление release register.
- [ ] Ручная проверка слухом: дождь/порт/интерьер, четыре музыкальные темы, громкость, пауза вкладки, autoplay policy, desktop/mobile.
- Latest Vercel Preview: `dpl_9ccETTgGJvbFe6Y3j4fjRxaPSJvY`, READY, `https://dead-calm-jlr8c4e6g-sherlock-ds.vercel.app`; SSO protection enabled. Production не менялся.

- Final confirmed Preview after the cache-test correction: `dpl_DA2i4sUJaerMU211yyw8azUhX3H6`, READY, commit `c3c494dafe72d451d253dde870090f41b7d7f913`, URL `https://dead-calm-dp0e8v78j-sherlock-ds.vercel.app` (SSO protected). No production promotion.


### Mini-game final projection blocker — 2026-11-21
- Найдена критическая UI-ошибка в Film Restoration: после обработки последнего кадра `frameIndex` указывает за конец массива, а кнопка запуска проектора продолжала проверять `frames[frameIndex].restored`; поэтому финальная проекция оставалась disabled.
- Вынесено единое правило `canAdvanceFilm(session)`: оно разрешает финальную проекцию в фазе `projection`, но продолжает блокировать опасную протяжку и завершённую катушку.
- Сцена использует один и тот же predicate при первичном рендере и при обновлении натяжения/скорости. Добавлены regression tests для последнего кадра, запуска проекции, завершённой катушки и опасного натяжения.

- Film Restoration final-projection blocker fixed and verified: CI run `44896892950` passed **311/311 tests, 0 failures** on code head `9faf63ec2b1e54463c7691acd033157a3d78e953`.
- Preview for that code head: READY, `https://dead-calm-2guobdop3-sherlock-ds.vercel.app` (`dpl_69oAvMuqS6gqQvjkuz9uHy2JFCFK`, SSO protected). Production unchanged. Manual gameplay/browser QA remains open.


### Outcome-aware mini-game audio — 2026-11-21
- Исправлено ложное звуковое подтверждение: раньше любое событие `minigame:completed` проигрывало success cue, даже если результат был `damaged` или `unreadable`.
- Добавлен чистый resolver `getMiniGameResultCue(outcome)`: `success`/`clear` → success; `failure`/`damaged`/`unreadable` → failure; `partial`/`fragmented` и неизвестные значения → без ложного победного/штрафного сигнала.
- Добавлены unit-тесты результата и обновлена проверка интеграции звука.
- GitHub Actions run `44897303654`: **314/314 tests passed**, 0 failures, head `47ad10ee8ff5480fa5cccc4dc9371e40f25a6a1e`.
- Ручная проверка звука в браузере остаётся открытой; автоматический тест проверяет маршрутизацию cue, а не фактическое звучание Web Audio.


### Evidence integrity guard — 2026-11-21
- Исправлена проверка входных результатов мини-игр на границе создания улик: исход и числовое качество теперь должны соответствовать друг другу; NaN, бесконечность, значения вне 0–100 и противоречивые исходы отклоняются.
- Радио: fragmented 68–91, clear 92–100. Плёнка: partial 70–94, success 95–100. Повреждённый/неразборчивый результат не создаёт улику.
- Обновлён интеграционный тест, который ранее ожидал разрешение выдавать улику только по одному quality без outcome; теперь он проверяет полную согласованность результата.
- GitHub Actions run `44897945012`: **317/317 tests passed**, 0 failures, HEAD `6cc44258f2813d1dd2f65858a0be0fa8208dda74`.


### Mini-game save/load evidence regression — 2026-11-21
- Добавлен интеграционный тест `partial mini-game evidence survives reload and upgrades in place after a stronger replay`.
- Проверен сценарий partial radio 78 → сохранение → clear radio 96 → повторная загрузка. После восстановления сохранения одна улика содержит обновлённое описание и качество; история попыток и лучший результат сохранены.
- Проверка выполняется через фактические `GameState.recordMiniGameResult`, `recordCase001MiniGameEvidence`, `GameState.save` и `GameState.init` с тестовым хранилищем.
- GitHub Actions run `44898592744`: **318/318 PASS**, 0 failures, HEAD `e49f72cf9bb50b3a5b2d6428080316b73f391399`.


### Full investigation persistence audit — 2026-11-21
- Найден и исправлен дефект `GameState.export()`: поле `currentCase` экспортировалось выборочно и теряло гипотезы/историю и дополнительные поля дела. Теперь используется глубокая копия всего `currentCase`.
- Добавлен round-trip тест через реальные методы GameState: clue + hypothesis revision history, campaign day/flags, trust, NPC memory, social ties/events, knowledge provenance/state history, NPC schedule/occurrence, notebook и settings.
- Проверена независимость экспортированной вложенной истории гипотез от оригинального состояния.
- GitHub Actions run `44899315228`: **319/319 PASS**, 0 failures, HEAD `7e76d17650502200544ce5274240ea09a41ab7d0`.


### Save recovery hardening — 2026-11-21
- `Storage.save()` now stages serialized data under `__pending`, backs up the previous valid primary under `__backup`, and only then commits the new primary. Returns a boolean for success/failure.
- `Storage.load()` recovers from valid backup or pending JSON if primary is missing/corrupt; a valid primary always wins, so a failed newer write cannot silently replace a known-good save.
- `exists`, `remove`, and `clearAll` now include auxiliary records. Added five storage regression tests: backup rotation, corrupt-primary fallback, pending recovery, cleanup scope, and simulated quota failure.
- GitHub Actions run `44899585246`: **324/324 PASS**, 0 failures, HEAD `97190d685d8b7eda59b90b4fa17cc74126b94e8f`.


### Versioned save migrations and compatibility guard — 2026-11-21
- Added `src/js/core/save-migrations.js` with schema version 1 and a v0 migration for unversioned legacy saves.
- Migration supplies safe defaults for supported collections while retaining unknown top-level, case-level and clue-level fields. Applying it twice is idempotent.
- New GameState writes include `schemaVersion`; successful legacy migrations are persisted immediately.
- Future schema versions and malformed versions are rejected without downgrade. `GameState.save()` is blocked until an explicit new-game/reset action.
- Added `Storage.hasAnyRecord()` so unrecoverable corrupt primary/backup/pending records are distinguished from a genuinely absent save. Startup refuses to silently create a blank campaign over existing unreadable data.
- Main menu displays the incompatibility/corruption message and disables Continue; explicit New Game remains available with confirmation.
- Added migration and integration regression tests. Code/test HEAD: `1222a42543952a0485134e599f5428ad9862db14`.
- GitHub Actions run `44900170637`: **332/332 PASS**, 0 failures. Later commits changed documentation only. Vercel Preview is READY; production unchanged.
- Remaining QA: CI result, manual browser reload/recovery, and import/export round-trip.


### Save export/import implementation — 2026-11-21
- Added `src/js/core/save-transfer.js`: versioned `dead-calm-save` JSON envelope, canonical JSON SHA-256 checksum, format/schema compatibility checks, and structural validation for campaign sections/settings.
- `GameState.export()` now returns a deep detached snapshot of the full save payload including schemaVersion. `GameState.importSave()` validates/migrates first, commits through resilient Storage before changing in-memory state, and returns false without applying state if storage rejects the write.
- Main menu now offers Export and Import. Export downloads a JSON file. Import limits files to 5 MB, verifies the file before asking to replace the current campaign, commits transactionally, and reloads only after success. Previous primary is rotated to Storage backup.
- Legacy partial nested records now receive safe defaults while preserving supplied and unknown fields.
- Tests cover round-trip, checksum tampering, invalid JSON/format, future transfer format and game schema, invalid structure with recomputed checksum, legacy migration, detached export, successful import and failed-write rollback.
- GitHub Actions run `44900954168`: **342/342 PASS**, 0 failures on code/test HEAD `9eb4250d39294e96fffee11c20d3b9ded145ac29`. A subsequent UI copy-only commit is `02f0533784dc29cc03a18015dc428c4d8b7e0f23`.
- Vercel Preview for latest UI HEAD is READY. Production unchanged.
- Security scope: SHA-256 detects accidental corruption/content mismatch; without a trusted signing key it does not authenticate the sender or prevent a malicious party from recomputing the checksum. Do not describe it as a digital signature.
- Remaining QA: manual download/import in a second browser profile, cancellation path, and reload verification.


### Finale narrative consistency fix — 2026-11-21
- Audit found the compromise ending falsely claimed Sebastian confessed to poisoning Harrison, while both authored Sebastian critical-choice outcomes explicitly deny/withhold any admission and no dialogue grants a confession.
- Updated `src/js/scenes/port.js`: the compromise ending is now a closed agreement not to publish disputed Calliope materials before independent review, with a procedural opening of part of Blackwood corporate archives. It explicitly states Sebastian does not confess to poisoning Harrison.
- Updated the finale briefing to describe independent evidence as a cumulative suspicion, not as Sebastian's corroborating words.
- Added `tests/finale-narrative-integrity.test.mjs` to prevent unsupported confession and keep both ending choices wired to the evidence-gated GameState boundary.
- GitHub Actions run `44901287238`: **345/345 PASS**, 0 failures, HEAD `18da2b1a2a07426ddae2780f4bc2bba1fa64a2f1`.
- Manual playthrough of both endings remains open QA; do not mark the narrative acceptance as fully player-tested.


### NPC choice persistence regression — 2026-11-21
- Added `tests/npc-choice-persistence.test.mjs`: executes Anna's first meeting and critical choice, exports and imports the full GameState, opens a new dialogue session, then verifies trust, consequence flags, critical-choice guard and asked-question lock all persist.
- CI run `44901573943`: **346/346 tests passed**, 0 failures, HEAD `d28c0cfc768afdc7109bcd5ba24082b9e46c9e59`.
- Coverage is a save/load integration test for one representative full critical choice; it does not claim all six NPC branches have been manually played.


### Full NPC critical-choice persistence matrix — 2026-11-21
- Added `tests/npc-all-choice-persistence.test.mjs`, deriving scenarios from authored dialogue data rather than a hand-maintained list. It covers all 14 choice branches across all six NPCs (Lydia 3, Ray 3, Marta 2, Father Thomas 2, Anna 2, Sebastian 2).
- Each branch is executed, exported, imported into GameState, and reopened in a fresh DialogueEngine session. Assertions cover clamped trust, choice/node memory flags, one-time guard, asked-question history, and no re-offer after restore.
- Two initial test-only assumptions were corrected against actual authored data/closed-topic behavior: the source contains 14 (not 15) branches; a closed topic may return no `questions` array, which is also a valid no-reoffer result.
- Final CI run `44902111642`: **347/347 tests passed**, 0 failures, HEAD `a034a68fea7ae517b751d797df536db1120983b9`.
- Manual browser playthrough remains open; automated persistence coverage is not described as manual acceptance.


### Cross-character knowledge and relationship persistence audit — 2026-11-21
- Added `tests/npc-cross-character-persistence.test.mjs` covering an explicitly authored family tie (Anna is Markus's adoptive daughter, grounded in `characters.json`) and an explicitly attributed interview knowledge record for Marta sourced from Anna.
- Verified save/export/import preserves tie status and evidence refs, knowledge recipient/source IDs, source type, corroborated state and state history. Verified the knowledge record is not automatically copied to the source NPC or unrelated NPCs.
- Test fixture was corrected to avoid inventing an unsupported sibling relation or an unrecorded NPC-to-NPC event; no new story content or production relationship was seeded.
- Latest code CI run `44902367935`: **348/348 passed**, 0 failures on HEAD `1498512d96b24b1d37930e3021bea14e10eb5839`.
- Important scope boundary: social graph and knowledge ledger are persistence/data APIs, not a completed cross-NPC consequence system. Producers/consumers that propagate authored knowledge or change other NPCs' dialogue based on the player's choices remain open; do not infer these from proximity or rumor.


### Contradiction evidence integrity fix — 2026-11-21
- Hardened `src/js/systems/contradictions.js`: authored rules with duplicate evidence IDs are rejected; malformed hypothesis/clue/rule collections and invalid clue records fail closed without exceptions.
- Added regression coverage in `tests/contradictions.test.mjs` for `['a','a']` fake two-clue rules, duplicate discovered records, null/malformed collections and clue records.
- Existing discovery + same-hypothesis attachment requirements are unchanged.
- GitHub Actions run `44902590231`: **350/350 tests passed**, 0 failures, HEAD `9f277c1e4238a6cd1e6f25f40f8a17ee6c5c8c3a`.
- Next audit item: inspect whether the UI can manually label a hypothesis `confirmed` without a minimum evidence/independence threshold; no policy changed yet.


### Защита статуса подтверждения гипотезы — 2026-11-21
- Проверен полный путь от `<select>` на доске расследования до `GameState.reviseHypothesis()` и доменной функции.
- Ручная установка `confirmed` теперь отклоняется в `src/js/systems/hypotheses.js`, а опция убрана из новых оценок интерфейса. Для старых сохранений сохранена обратная совместимость: legacy статус отображается отдельно, доступно понижение, но повторное ручное подтверждение невозможно.
- Добавлены регрессионные проверки в `tests/hypotheses.test.mjs`.
- Автоматическое подтверждение не добавлялось: нет формально утверждённого критерия достаточности/независимости доказательств. Финальное обвинение потребует отдельной проверки доказательной базы.
- CI run `44902916208` для `3d580207090aa12b7eb9487661e08ad6ea8e4254` ожидает завершения.


### Финальная формулировка доказательств — 2026-11-21
- В `port.js` изменён текст исхода `open_case`: материалы передаются для независимого официального расследования; Себастьян не объявляется доказанным убийцей.
- Явно отражено, что восстановленный кадр относится к делу Каллиопы и проверке старого алиби, а не устанавливает, кто дал яд Гаррисону.
- Evidence gates не ослаблялись. Добавлен тест `tests/finale-narrative-integrity.test.mjs` на отсутствие необоснованного обвинения.
- CI run `44903984224`: **353/353 PASS**, 0 failures на `417e9567be8765fe0719eed1ec34e509ac50872d`.
- Открытый вопрос по сюжету: прямого доказательства передачи яда Гаррисону в текущем досье нет; открытая концовка корректно означает начало расследования, не доказанный вердикт.


### Разделение полного раскрытия и доказанности убийства — 2026-11-21
- `assessFinalEvidence()` возвращает явный `fullDisclosureReady`; `publicReady` оставлен совместимым alias. Название отражает назначение гейта: полный публичный комплект материалов, а не доказанность того, кто лично передал яд.
- `GameState.completeCampaign('open_case')` и `port.js` используют новое поле. UI поясняет, что восстановленная плёнка относится к старому делу и не доказывает передачу яда Гаррисону.
- Добавлены тесты совместимости alias и семантики интерфейса; тестовый заголовок исправлен, чтобы не называть gate «финальным обвинением».
- Аудит Story Bible/Blueprint/диалогов выявил незакрытый сюжетный blocker: Себастьян — канонический убийца, но текущая игровая цепочка не показывает, как он передал/применил белладонну. Маркус не видел убийства, Себастьян не признаётся, плёнка — про 1967 год. Не маскировать этот пробел косвенными уликами.
- CI run #525 (`9099fa6792cae300df5aaed3d3e13847759c4ecf`) ожидает завершения.


### Запечатанное признание в компромиссной концовке — 2026-11-21
- Исправлено расхождение между Story Bible и игрой: выбор «Цена молчания» теперь создаёт сохраняемую улику `sebastian_sealed_confession` с письменным признанием Себастьяна в передаче белладонны Гаррисону.
- Признание запечатано, передано следствию и не публикуется; его происхождение и обстоятельства подлежат независимой проверке. Сделка не даёт Маркусу иммунитета.
- Режиссёрский план синхронизирован с библией. Regression test проверяет появление улики в ветке сделки.
- Run #530: **354/354 passed**. Run #531 для документации ожидает завершения.


### Завершение открытой концовки — 2026-11-21
- Синхронизирована концовка «Открытое дело» с Story Bible и Detective Blueprint: публикация цепочки, официальное обвинение Себастьяна на основании совокупности независимых источников, раскрытие фальсификации Маркуса, последствия для Анны и Лидии.
- Формальное обвинение прямо отделено от судебного приговора. Отсутствие прямого свидетельства передачи яда Гаррисону обозначено как предел, а не скрыто.
- В досье добавлен отдельный пункт с основаниями обвинения и пределом доказательств.
- CI #537: **354/354 passed**, 0 failures.
- Осталась ручная приёмка обеих концовок и полного прохождения пяти дней на desktop/mobile.


### Проверка альтернативного пути к публичной концовке — 2026-11-21
- Добавлен integration test, доказывающий, что игрок, выбравший радиофрагмент как независимый источник дня 4, не теряет возможность получить качественную плёнку: вещи Анны → ремонт часов → `markus_watch_key` → реставрация → `restored_film_frame` quality 100.
- Радиомаршрут по-прежнему разрешает «Цену молчания», но сам по себе не открывает полное публичное раскрытие; гейт качества плёнки сохранён.
- CI #541: **355/355 passed**, 0 failures.


### Канонизация сохранения при импорте — 2026-11-21
- `GameState.importSave` теперь вычисляет нормализованную кампанию и соответствующие `day_2…day_5` флаги до коммита в Storage. Не допускается запись дня 3 с устаревшим `day_5=true` или отсутствующим `day_2`.
- Импорт сохраняет транзакционный порядок: запись в Storage предшествует изменению live state; неудачная запись не применяет импорт.
- Добавлен интеграционный round-trip тест для кампании, улик, качества мини-игры, отношений и памяти NPC, социального графа, ledger знаний, расписаний, заметок и настроек; тестирует последующую загрузку в новой сессии.
- Фиктивные тестовые записи социальных связей/знаний/расписаний обновлены под валидные схемы нормализаторов.
- CI #547: **356/356 passed**, 0 failures.


### NPC return-reaction audit — 2026-11-21
- Исправлен обнаруженный разрыв: 14 критических выборов уже сохраняли доверие и память, но повторная встреча не подтверждала игроку последствия большинства решений.
- Добавлены 12 авторских одноразовых реплик следующей встречи для всех не-terminal исходов шести NPC; окончательные отказы Лидии и Рэя не изменены.
- Реакции используют существующие флаги NPCMemory, сохраняются через текущую систему сохранений и не создают автоматического распространения слухов.
- Добавлен интеграционный тест tests/npc-return-reactions.test.mjs на все 12 веток, round-trip save/import и одноразовое отображение.
- Commits: 095d9730, a035e335, f48cc713.
- CI ещё не подтверждён для актуального HEAD; Vercel сообщает build rate limit. Ручная browser QA остаётся открытой.


### Hypothesis confirmation guard — 2026-11-21
- Audit выявил, что legacy-гипотезу со статусом confirmed можно было редактировать, не снимая подтверждение.
- Теперь любые содержательные изменения подтверждённой версии требуют предварительно явно понизить её статус; чтение/no-op остаётся безопасным.
- Добавлен тест на edit guard, снятие статуса и дальнейшее редактирование.
- Commits: 3752305b, 44df700a.
- CI для актуального HEAD не подтверждён. Vercel quota не позволяет использовать preview как замену тестам.


### NPC knowledge-boundary regression — 2026-11-21
- Добавлен отдельный тест на ограничения знаний шести персонажей и происхождение ключевых показаний.
- Он защищает анонимность источника Марты, чужое происхождение письма у Томаса, ограниченность знания Лидии и Анны, неустановленную личность судебного звонящего и отсутствие преждевременного признания Себастьяна.
- Не добавлялись producers или автоматическая передача информации: текущие social/knowledge/daily-life модули остаются API и хранилищем, а не заявленной симуляцией.
- Commit: de407cd2.
- CI для текущего HEAD не подтверждён.


### Campaign route and finale audit — 2026-11-21
- Проверены обязательные улики дней 1–4, доступность нужных локаций и фактические источники получения.
- Проверена развилка дня 4: радио и плёнка обе открывают переход; radio-first не блокирует позже восстановление плёнки через вещи Анны и ремонт часов.
- Проверен день 5: встреча с Маркусом запускается игроком вручную; признание не подменяет обязательные независимые доказательства.
- Проверены ограничения концовок и запечатанное признание Себастьяна в ветке сделки.
- Исправлена опечатка в regression test границ знаний NPC (commit 3d569f14).
- Полный локальный запуск тестов и браузерная приёмка не выполнены; актуальный Actions run для HEAD не обнаружен.


### Cases dialog state audit — 2026-11-21
- Удалена статическая заглушка «Дело №001 — активно / завершённых дел: 0».
- Диалог теперь показывает состояние кампании и соответствующую концовку из getCampaignCaseSummary; добавлена базовая семантическая доступность.
- Добавлен tests/campaign-cases-dialog.test.mjs.
- Commits: c2dd4ba2, 038590c6.
- CI для актуального HEAD пока не подтверждён.


### Main menu save-context audit — 2026-11-21
- Экран продолжения теперь объясняет, на каком дне остановился игрок и что делать дальше: недостающие требования, возможность завершить день, финальная встреча или завершённое дело.
- Сохранены отдельные состояния отсутствующего и заблокированного сохранения; порядок GameState.init перед переходом в кабинет не изменён.
- Добавлен tests/campaign-main-menu-summary.test.mjs.
- Commits: ed32e3bf, a2c20b8f.
- CI для актуального HEAD ещё не подтверждён.


### Staged save recovery order — 2026-11-21
- Исправлен приоритет восстановления: последняя валидная staged-запись больше не теряется за более старой backup-копией.
- Успешное восстановление продвигает staged в primary и сохраняет предыдущую primary в backup; при ошибке записи данные staged всё равно отдаются в память без уничтожения исходных записей.
- Невалидная staged-запись не мешает восстановлению primary/backup.
- Добавлен tests/storage-staged-recovery.test.mjs (4 сценария).
- Commits: 666114c0, 6760397f.
- CI актуального HEAD пока не подтверждён.


### Critical NPC choice interruption audit — 2026-11-21
- Исправлен сценарий закрытия игры после показа критического выбора, но до ответа: вопрос не помечается завершённым, а guard-флаг не выставляется преждевременно.
- После явного выбора фиксируются asked-question и guard-флаг; уже принятое решение не появляется повторно после импорта.
- Добавлен tests/npc-critical-choice-interruption.test.mjs с полным циклом прерывания/восстановления.
- Commits: 35032d41, 3d998db0.
- CI актуального HEAD пока не подтверждён.


### Investigation board connection recovery — 2026-11-21
- Исправлена потеря визуальных связей после перезагрузки: коллекция линий реконструируется из уже сохранённых connection-флагов и реально найденных игроком улик.
- Не раскрываются связи с материалами, которых ещё нет в текущем деле; повторное сохранение не создаёт дублей.
- Добавлен tests/investigation-connection-recovery.test.mjs (2 сценария).
- Commits: aed0be8e, 7d7c2002.
- CI актуального HEAD пока не подтверждён.


### Notebook provenance and evidence integrity — 2026-11-21
- Исправлено смешение источника и места обнаружения в архиве улик: карточки и детали используют source как происхождение, location показывается отдельно.
- Экспорт дневника включает source и timestamp, безопасно обрабатывает старые частичные записи.
- Подтверждено тестом, что удаление заметки не затрагивает currentCase.clues.
- Добавлен tests/notebook-evidence-integrity.test.mjs (3 сценария).
- Commits: 0ef44016, f376999c, 87e1df95.
- CI актуального HEAD пока не подтверждён.


### End-to-end evidence pipeline and complete journal export — 2026-11-21
- Экспорт дневника теперь содержит найденные улики (описание, источник, место/время/день обнаружения, ID) и архив гипотез (название, статус, обоснование, имена доступных опорных улик).
- Ссылки на недоступные доказательства не раскрываются при экспорте гипотез.
- Добавлен сквозной регрессионный сценарий: получение материалов → связь на доске → восстановление связи → гипотеза → изменение статуса → экспорт.
- Commits: bc555797, 3a26baa8, acce77f8, fcf3c3e2.
- CI и ручная браузерная приёмка пока не подтверждены.


### Finale save/reload regression — 2026-11-21
- Добавлена проверка сохранения обеих концовок через GameState.export/importSave.
- Проверяется, что выбранный финал переживает перезагрузку и завершённую кампанию нельзя переключить на альтернативный исход.
- Commit: f371d99d.
- CI и ручная браузерная приёмка не подтверждены.


### City map repeated-entry cleanup — 2026-11-21
- Устранено накопление delegated click listeners при повторном открытии карты в одном контейнере.
- Предыдущий listener снимается через WeakMap перед регистрацией нового; проверка доступности локаций и маршрутизация сохранены.
- Добавлен tests/map-reentry.test.mjs с проверками re-entry и всех девяти направлений.
- Commits: 6eb75c42, cdd2e935.
- CI и браузерная проверка пока не подтверждены.


### NPC dialogue access guards — 2026-11-21
- Закрытые темы больше нельзя открыть прямым вызовом `selectTopic`; вопросы ищутся только в открытых темах.
- Обычные вопросы после ответа блокируются от повторного исполнения, включая stale/double click.
- Критический выбор остаётся повторно доступным до явного решения и закрывается после выбора.
- Добавлен `tests/npc-dialogue-access-guards.test.mjs` с тремя регрессионными сценариями.
- Commits: 2bc1283a, affce3c2.
- Полный CI и ручная приёмка не подтверждены.


### NPC knowledge history integrity — 2026-11-21
- Возвращаемые снимки NPC knowledge теперь глубоко копируют stateHistory; внешняя мутация результата не затрагивает сохранённую запись.
- Legacy history нормализуется: удаляются переходы с неизвестными статусами, одинаковым from/to или пустой причиной.
- Добавлены два регрессионных теста в tests/npc-knowledge.test.mjs.
- Commits: 0c9ed082, 31a283b0.
- Полный CI и браузерная приёмка пока не подтверждены.


### NPC-to-NPC knowledge provenance — 2026-11-21
- Межперсонажное знание теперь требует отдельного sourceNpcId и минимум одной sourceRefs-ссылки на запись, подтверждающую передачу.
- Отклоняются самоссылочные и непроверяемые записи; legacy-нормализация фильтрует оба вида повреждений.
- Добавлены два теста в tests/npc-knowledge.test.mjs.
- Commits: 97064a9f, 78beb8b0.
- Полный CI и ручная браузерная проверка не подтверждены.


### Evidence-to-hypothesis contradiction pipeline — 2026-11-21
- Добавлен сквозной тест: обнаружение документов → гипотеза → раскрытие противоречия → изменение гипотезы → сохранение/загрузка → повторная проверка.
- Необнаруженные документы не раскрывают содержание противоречия; оба документа должны быть найдены и прикреплены к одной версии.
- Изменение версии не удаляет уже обнаруженные улики; исключение одной улики из версии закрывает только зависимое продолжение.
- Commit: 8e8de6ad.
- CI и браузерная приёмка не подтверждены.


### Authenticity validation for provisional conclusions — 2026-11-21
- Review no longer trusts documentIds/contradictionIds supplied by a saved report.
- Review now requires the live case and authored contradiction rules.
- Document references are checked against discovered audit materials; contradictions are recomputed from currently discovered clues attached to one hypothesis.
- Forged, unavailable, and unsupported references cause the report to be returned for clarification.
- Missing live case/rules fails closed.
- Updated crime-scene integration and added forged-reference/fail-closed regression tests.
- Commits: 588cec41, 66773fee, 37f55ce5.
- Full CI and browser acceptance remain unconfirmed.


### Investigation history save/reload coverage — 2026-11-21
- Added a fresh-session persistence regression test for conclusion versions, review history, review directives, NPC narrative choices, relationships, promises, hypotheses, notebook and settings.
- Exported snapshot mutation is verified not to alter live game state.
- The test restores only from the persisted payload via GameState.init().
- Save schema remains version 1; no migration behavior was changed.
- Commit: 067b0cf5.
- CI and browser acceptance remain unconfirmed.


### CI regression expectation corrections — 2026-11-21
- Corrected the contradiction pipeline test: discovering a new clue does not silently attach it to an existing hypothesis; the player must explicitly add it during revision.
- Corrected storage recovery expectation: a complete staged payload is newer than the old primary and must be returned when promotion fails, remaining staged for retry.
- No gameplay or storage protections were weakened.
- Commits: 175427ed, cba3e3f2, 579753be.
- GitHub Actions run 44921717853: **395/395 passed, 0 failures** on HEAD 579753be.
- The test now verifies that a contradiction unlocks only after both clues are discovered and explicitly attached to the same hypothesis.
- Storage recovery test confirms that a newer complete staged payload wins over an older primary when promotion fails.
- Manual browser, PWA and gameplay acceptance remain open.


### Untrusted imported hypothesis status — 2026-11-21
- Audited the investigation-board UI, domain transition, save persistence, and save-file import path.
- Current UI excludes `confirmed` from new choices; the domain function also rejects manual promotion.
- Save-file SHA-256 is an integrity checksum, not proof of an in-game evidence review. Imported `confirmed` labels are now downgraded to `probable`, original history is retained, a review entry is appended, and the UI explains the downgrade until the player revises the hypothesis.
- Existing local legacy saves remain readable as historical records; no automatic confirmation rule was introduced.
- Added state-import, revision-history and player-facing UI regression tests.
- GitHub Actions run 44922019068: **397/397 passed, 0 failures** on HEAD `90470aee`.
- Independent-evidence criteria for a future automatic `confirmed` state remain intentionally open.


### Финальная проверка защиты концовки и CI — 2026-11-22

- На уровне `GameState.completeCampaign()` концовка «Цена молчания» требует сохранённую улику `sebastian_sealed_confession`; проверка не ограничивается наличием кнопки в сцене.
- Сценарий `tests/campaign-state.test.mjs` проверяет отказ без признания и успешное завершение после добавления признания. Тест экспорта `tests/campaign-export.test.mjs` использует валидный fixture с этой уликой.
- Сцена порта создаёт запечатанное признание только после явного выбора игроком «ЗАКЛЮЧИТЬ СДЕЛКУ»; описание улики сохраняет требование независимой проверки.
- Исправлен старый тестовый fixture, который пытался завершить компромиссную концовку без обязательного признания. Условия игры не ослаблялись.
- GitHub Actions run `44990040538`: **397/397 тестов, 0 failures**, HEAD `8d93ae06b69210558ceadbb8a348513a36883065`.
- PR #3 остаётся открытым; `main` не изменён этим PR. CI подтверждает автоматические регрессии, но не заменяет ручное прохождение.
- [ ] Ручное прохождение New Game → оба финала в браузере.
- [ ] Проверка Continue / Export / Import / перезапуск страницы на реальном браузере.
- [ ] Desktop/mobile, установка PWA, обновление Service Worker и offline fallback.
- [ ] Прослушивание музыки и эффектов на desktop/mobile.
- [ ] Сканирование содержимого репозитория на секреты и персональные данные.


### Транзакционное завершение кампании — 2026-11-22

- Найден пограничный дефект: `completeCampaign()` выставлял `completed/ending` и публиковал событие даже при неуспешной записи сохранения.
- Теперь завершение транзакционно: при `save() !== true` или исключении исходные значения `completed/ending` восстанавливаются, событие `campaign:completed` не отправляется, метод возвращает `false`.
- После восстановления Storage игрок может повторить выбор; при успешной записи событие отправляется ровно один раз.
- Добавлен regression test на отказ записи, откат состояния, отсутствие события и успешную повторную попытку.
- Обновлены тестовые Storage mocks: успешная запись теперь явно возвращает `true`, как требует реальный контракт Storage.
- GitHub Actions run `44990293293` (#630): **398/398 тестов, 0 failures**, HEAD `6a3143f5794078218fea5f01b44f700095dcf59a`.
- [ ] Ручная проверка поведения при заполненном/недоступном browser storage в настоящем браузере.


### Пользовательская обратная связь при сбое сохранения финала — 2026-11-22

- Сцена порта теперь обрабатывает отказ `GameState.completeCampaign()` для обеих концовок и показывает понятное сообщение: выбор не потерян, нужно проверить хранилище браузера и повторить попытку.
- Сообщение использует `role="alert"` и `aria-live="assertive"`; оно не подменяет финальную сцену и не показывает ложное завершение.
- Добавлен `tests/finale-save-feedback.test.mjs` для проверки обоих обработчиков и доступного сообщения.
- GitHub Actions run `44990381171` (#633): **399/399 тестов, 0 failures**, HEAD `7c420578a1f5cfd1b17db9bd9dd91010fc3df8e7`.
- [ ] Проверить фактический отказ записи и повторную попытку в реальном браузере; автоматический тест подтверждает ветку обработки, но не браузерную квоту/поведение ОС.


### Целостность переходов кампании и получения улик — 2026-11-22

- В ходе DC-STORY-002 найден тот же класс риска, что и у финала: переход на следующий день и добавление улики меняли состояние и публиковали событие даже при отказе записи.
- `GameState.setCampaignDay()` теперь откатывает день и сюжетные флаги при `save() === false` или исключении; событие `campaign:day_changed` публикуется только после успешной записи.
- Откат сохраняет исходную ссылку на общий объект `flags`, чтобы не ломать подписчиков и другие модули.
- `GameState.addClue()` теперь откатывает новую запись при ошибке сохранения, не публикует `clue:added` до успешной записи и не допускает дублирующую выдачу.
- Кабинет показывает доступное сообщение об ошибке, если все условия дня выполнены, но переход не удалось сохранить.
- Добавлены регрессионные проверки: отказ/повторная попытка для перехода дня, откат улики, отсутствие ложных событий, сохранение ссылки на флаги и доступное сообщение кабинета.
- GitHub Actions run `44990798251` (#640): **402/402 теста, 0 failures**, HEAD `8b0719c928c5d7c1441c9c3fa4aee36c0c2fa45b`.
- [ ] Ручное прохождение всех пяти дней в браузере, включая реальный отказ browser storage, остаётся открытым критерием.


### Сохранение обязательных улик из диалогов — 2026-11-22

- Сквозная проверка выявила зависимость: движок помечал вопрос NPC использованным до подтверждения сохранения выданной улики.
- Теперь вопрос отмечается в памяти NPC только после успешной записи улики. При отказе записи вопрос остаётся доступен для повторной попытки, а движок не сообщает о ложном получении доказательства.
- Диалог показывает доступное предупреждение `role="alert"` / `aria-live="assertive"` и объясняет, что вопрос можно повторить.
- Добавлены интеграционный тест повторной попытки на реальном `DialogueEngine` и отдельный тест доступного UI-предупреждения.
- GitHub Actions run `44990980759` (#646): **404/404 теста, 0 failures**, HEAD `6f8bf2d747bfa58a9d1f6786d42b2c77d5389dec`.


### Атомарное сохранение решающих выборов NPC — 2026-11-22

- Ранее выбор персонажа сохранял вопрос, флаг решения, изменение доверия и дополнительные флаги отдельными операциями. При отказе хранилища состояние могло зафиксироваться частично.
- Добавлен единый `NPCMemory.commitCriticalChoice()`: вопрос, флаг однократного решения, изменения памяти и доверия сохраняются одной записью.
- При отказе или исключении запись откатывается; ссылки на объекты памяти и массивы диалогового движка сохраняются, чтобы активная беседа не получила устаревшее состояние.
- События `npc:flag_set` и `relationship:changed` публикуются только после успешного сохранения.
- При неудаче выбор остаётся на экране, игрок видит доступное предупреждение и может повторить действие.
- Добавлен интеграционный тест отказа, проверки полного отката, отсутствия ложных событий и успешной повторной попытки.
- GitHub Actions run `44992698598` (#652): **405/405 тестов, 0 failures**, HEAD `806df7ea97a3ed1c5d75010c12ccf76abcd0f847`.


### Обычные разговоры, обещания NPC и надёжность памяти — 2026-11-22

- Обычные мутации памяти NPC теперь транзакционные: `setFlag`, `clearFlag`, `markMet`, `markQuestionAsked`, `unlockTopics`, `incrementQuestionCount` и `recordInterview` откатывают изменения при отказе хранилища/исключении.
- Откат сохраняет ссылки на вложенные флаги, списки тем, вопросы и историю интервью; события о флагах отправляются только после успешной записи.
- Первая встреча и первоначальная разблокировка тем записываются одним действием. Если сохранение не удалось, игра не отмечает NPC как встреченного и предлагает повторить разговор.
- Обычный вопрос не блокируется до подтверждения сохранения. Заметки блокнота откатываются при ошибке записи; игрок не получает ложного сообщения о сохранённой заметке.
- Одноразовые реакции NPC на прошлые решения не показываются и не потребляются, пока флаг просмотра не сохранён.
- Обещание Рэя проверить журнал входящих теперь имеет явный флаг `ray_promised_check_calls`; вопрос о найденном журнале требует и ранее заданного вопроса, и сохранённого обещания. Сам факт разговора больше не считается выполнением обещания.
- Добавлены интеграционные тесты отказа/повтора для первой встречи, обычного вопроса, заметки блокнота и возвращающейся реакции NPC; отдельные проверки транзакционных мутаций памяти и сохранения обещания после Export/Import.
- GitHub Actions run `44993562759` (#673): **413/413 тестов, 0 failures**, HEAD `32405afff388da0239e70f5a4652a9d60b2093a7`.
- [ ] Ручное прохождение диалогов после нескольких игровых дней и проверка отношений/обещаний в реальном браузере остаются открытыми.

### DC-STORY-005 — проверяемая передача знаний между NPC — 2026-11-22

- Добавлен transferNpcKnowledge(): передача возможна только от NPC, у которого уже есть запись об этом claimRef; произвольный источник и передача самому себе отклоняются.
- Получатель всегда получает отдельную запись со статусом unverified. Подтверждённость исходной записи не повышает достоверность пересказа; исходная запись не изменяется.
- Запись передачи атрибутирована отправителю и ссылается на исходную запись знаний.
- GameState дополнительно требует явное социальное событие между участниками и две зафиксированные occurrence-записи в одном месте и в пределах 15 минут. Без такого свидетельства передача невозможна.
- Повторная передача той же исходной записи тому же NPC блокируется детерминированным ID; события публикуются только после успешного сохранения.
- Добавлены тесты неизвестного источника, self-transfer, недопустимого канала, повторной передачи, отсутствия встречи, отката при ошибке хранилища и успешной передачи.
- GitHub Actions run 44994441774 (#684): **418/418 тестов, 0 failures**, HEAD 033c52aaedaa5bbe4ec8c51e59dbdc48c0a7cfb9.
- [ ] Автоматическое моделирование слухов и подключение конкретных сюжетных разговоров к передаче знаний пока не включены. Передача остаётся явной операцией; время само по себе не создаёт разговоров.
- [ ] Проверка полного игрового маршрута и состояния после реальной перезагрузки браузера остаётся открытой.

### DC-STORY-006 — цепочка слухов и зафиксированные искажения — 2026-11-22

- Добавлен transferNpcRumor(): слух переносится только из существующей записи конкретного NPC, с явной атрибуцией отправителя и неизменным claimRef.
- Каждый новый участник получает собственную запись со статусом unverified; исходная запись и её достоверность не меняются.
- rumorTrail сохраняет последовательность отправитель → получатель, ID исходной записи, время передачи и список изменений деталей.
- Искажение не генерируется автоматически: автор операции обязан указать деталь, прежнее и новое значение, причину и признак intentional. Неизменённые, неподдерживаемые и неатрибутированные изменения отклоняются.
- В цепочке различаются непреднамеренная ошибка/догадка и сознательная ложь; сама метка намерения описывает передатчика, но не доказывает истинность содержания.
- GameState требует социальное событие и подтверждённое совместное присутствие в одном месте в пределах 15 минут; запись и события транзакционны.
- Чтение истории слуха возвращает глубокую копию: вызывающий код не может незаметно переписать сохранённую цепочку.
- Тесты покрывают две последовательные передачи, смешение намеренных и случайных искажений, плохие данные, нормализацию сохранения, отсутствие встречи, откат и запрет дублирующей ветки.
- GitHub Actions run 44995611808 (#691): **422/422 теста, 0 failures**, HEAD 6786943bb58cb806b9715b9dcd00db05dc2cbc9c.
- [ ] Пока нет автоматического изменения слухов с течением времени и автоматического выбора NPC, которые решат поговорить. Механизм работает только при явно вызванной, подтверждённой передаче.
- [ ] Визуальная подача слухов в блокноте и диалогах, а также ручной браузерный прогон остаются открытыми.
