import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { canChallengeGuard, resolveGuardChallenge } from '../systems/court-guard.js';
import { canTraceSecretary, canConfrontOrlov, resolveOrlovConfrontation, canConfrontKlimov, resolveKlimovConfrontation } from '../systems/witness-provenance.js';
import { setupCourtWorkflow } from '../systems/court-workflow.js';
import { NPCMemory } from '../systems/npc-memory.js';
import { getWitnessRecallLine } from '../systems/witness-interview-history.js';
import { getNPCDossier } from '../systems/npc-dossiers.js';
import { canAssembleReaderTimeline, READER_TIMELINE_EVENTS, getReaderTimelineFollowUp } from '../systems/reader-timeline.js';
import { compareReaderTheories, snapshotReaderTheory, evaluateTheoryChanges, resolveTheoryApproach, resolveWitnessRecall, getReaderEvidenceRoute, READER_THEORIES } from '../systems/reader-theories.js';
import { assessReaderInvestigation } from '../systems/investigation-quality.js';
import { buildInvestigationGaps, GAP_STATUS_LABELS, getInvestigationGapStatus, updateInvestigationGapStatus } from '../systems/investigation-gaps.js';
import { buildReaderEpisodeConclusion, hasNewConclusionEvidence } from '../systems/episode-conclusion.js';
import { reviewReaderConclusion } from '../systems/conclusion-review.js';
import { planReviewDirective } from '../systems/review-directives.js';
import { assessOldCaseCrosscheck, recordOldCaseReading, OLD_CASE_READINGS } from '../systems/old-case-crosscheck.js';

export function render(container, data) {
  var location = data?.location || { name: 'Место преступления', description: 'Зал суда' };
  const orlovRecall = getWitnessRecallLine(NPCMemory.getMemory('npc_pavel_orlov'), 'Орлов');
  const klimovRecall = getWitnessRecallLine(NPCMemory.getMemory('npc_nikolay_klimov'), 'Климов');
  const orlovDossier = getNPCDossier('npc_pavel_orlov');
  const klimovDossier = getNPCDossier('npc_nikolay_klimov');

  container.innerHTML = `
    <div class="scene court-crime-scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">${location.name}</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">День 1, раннее утро</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="court-art">
        <img src="src/assets/backgrounds/blackford-courtroom.webp" alt="Пустой зал суда после убийства: контур тела на полу, разбитые весы, судейский стол и следы на стене" loading="eager" />
        <div class="court-hotspots" aria-label="Зоны осмотра места преступления">
          <button type="button" class="court-hotspot court-hotspot-body" data-trigger="btn-zone-body" aria-label="Осмотреть контур тела"><span>01</span><em>Контур тела</em></button>
          <button type="button" class="court-hotspot court-hotspot-wall" data-trigger="btn-zone-wall" aria-label="Изучить надпись на стене"><span>02</span><em>Надпись</em></button>
          <button type="button" class="court-hotspot court-hotspot-scales" data-trigger="btn-zone-scales" aria-label="Осмотреть сломанные весы"><span>03</span><em>Весы</em></button>
          <button type="button" class="court-hotspot court-hotspot-desk" data-trigger="btn-zone-desk" aria-label="Осмотреть стол судьи"><span>04</span><em>Стол судьи</em></button>
        </div>
      </div>
      <p class="court-scan-hint">ОСМОТР МЕСТА ПРЕСТУПЛЕНИЯ · Выберите отметку на изображении или улику из списка</p>

      <div class="court-narrative mb-6">
        <p class="text-gray-400 text-sm italic">
          Вы переступаете через жёлтую ленту. В зале суда тихо — так тихо, что слышно, как где-то капает вода.
          Воздух густой, спёртый, с металлическим привкусом. Так пахнут места, где произошло что-то непоправимое.
        </p>
        <p class="text-gray-400 text-sm italic mt-2">
          На полу — меловой контур тела. Руки раскинуты, ноги неестественно вывернуты. Судья умер не сразу — мел зафиксировал его последнюю позу, позу человека, который пытался ползти.
          На стене, над судейским креслом, алеет надпись: <span class="text-blood">«СЛЕПОЕ ПРАВОСУДИЕ»</span>. Буквы неровные, выведены пальцем. Кровь уже потемнела, но послание всё ещё кричит.
        </p>
      </div>

      <div class="court-zone-list grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <button id="btn-zone-body" class="card text-left court-zone-card">
          <p class="card-title">01 / ТЕЛО СУДЬИ</p>
          <p class="card-subtitle">Очерченный мелом силуэт на полу</p>
        </button>

        <button id="btn-zone-wall" class="card text-left court-zone-card">
          <p class="card-title">02 / НАДПИСЬ НА СТЕНЕ</p>
          <p class="card-subtitle">«СЛЕПОЕ ПРАВОСУДИЕ» — послание убийцы</p>
        </button>

        <button id="btn-zone-scales" class="card text-left court-zone-card">
          <p class="card-title">03 / СЛОМАННЫЕ ВЕСЫ</p>
          <p class="card-subtitle">Весы Фемиды разбиты</p>
        </button>

        <button id="btn-zone-desk" class="card text-left court-zone-card">
          <p class="card-title">04 / СТОЛ СУДЬИ</p>
          <p class="card-subtitle">Ящики, бумаги, личные вещи</p>
        </button>
      </div>

      <div class="court-workflow-toolbar" aria-label="Ход расследования в суде">
        <div>
          <p class="court-workflow-overline">МАТЕРИАЛЫ ДЕЛА · ПРОВЕРКИ</p>
          <p id="court-workflow-status" class="court-workflow-status" role="status" aria-live="polite"></p>
        </div>
        <button id="court-show-completed" class="btn-noir court-workflow-toggle" hidden>ПОКАЗАТЬ ЗАВЕРШЁННЫЕ</button>
      </div>
      <div id="court-workflow-stages" class="court-workflow-stages"></div>

      <section id="reader-timeline-view" class="reader-timeline-view mb-6" aria-label="Сводная хронология расследования" ${GameState.hasClue('reader_reconstructed_timeline') ? '' : 'hidden'}>
        <p class="reader-timeline-kicker">АРХИВ СЛЕДСТВИЯ / ХРОНОЛОГИЯ</p>
        <h3 class="reader-timeline-title">Вечер у служебного входа</h3>
        <p class="reader-timeline-intro">Выберите событие, чтобы увидеть документ и то, чего он пока не доказывает.</p>
        <div class="reader-timeline-events" role="group" aria-label="События по времени">
          ${READER_TIMELINE_EVENTS.map((item, index) => `
            <button type="button" class="reader-timeline-event" data-timeline-index="${index}" aria-pressed="${index === 0}">
              <time>${item.time}</time><span>${item.event}</span>
            </button>`).join('')}
        </div>
        <div id="reader-timeline-detail" class="reader-timeline-detail" aria-live="polite"></div>
        <button type="button" id="reader-timeline-follow-up" class="reader-timeline-follow-up" hidden></button>
        <p id="reader-timeline-follow-up-status" class="reader-timeline-follow-up-status" role="status" aria-live="polite"></p>
        <p class="reader-timeline-warning">Несколько регистраций не доказывают, что все действия совершил один человек.</p>
      </section>

      <section id="reader-theories-view" class="reader-theories-view mb-6" aria-label="Альтернативные версии событий" ${GameState.hasClue('reader_reconstructed_timeline') ? '' : 'hidden'}>
        <p class="reader-timeline-kicker">АНАЛИТИКА / НЕПРОВЕРЕННЫЕ ВЕРСИИ</p>
        <h3 class="reader-timeline-title">Кто действовал у служебного входа?</h3>
        <p class="reader-timeline-intro">Выберите версию, чтобы увидеть имеющиеся документы, проведённые проверки и главное возражение. Ни одна версия пока не доказана.</p>
        <div id="reader-theories-options" class="reader-theories-options" role="group" aria-label="Выбор версии"></div>
        <div id="reader-theories-detail" class="reader-theories-detail" aria-live="polite"></div>
        <button type="button" id="reader-theory-record" class="reader-timeline-follow-up">ЗАКРЕПИТЬ ВЕРСИЮ В ДЕЛЕ</button>
        <p id="reader-theory-change-note" class="reader-theory-change-note" role="status" aria-live="polite"></p>
        <div id="reader-theory-approaches" class="reader-theory-approaches" hidden>
          <p>КАК ОБРАТИТЬСЯ К СВИДЕТЕЛЮ ПО ЗАКРЕПЛЁННОЙ ВЕРСИИ?</p>
          <button type="button" id="reader-theory-discreet" class="reader-theories-option">Попросить уточнить документы</button>
          <button type="button" id="reader-theory-accusation" class="reader-theories-option">Предъявить обвинение без прямых доказательств</button>
        </div>
        <p id="reader-theory-approach-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
        <div id="reader-theory-revisit" class="reader-theory-approaches" hidden>
          <p>СВИДЕТЕЛЬ ПОМНИТ ПРЕДЫДУЩУЮ БЕСЕДУ · ВЫБЕРИТЕ ДАЛЬНЕЙШИЙ ПУТЬ</p>
          <button type="button" id="reader-theory-revisit-talk" class="reader-theories-option">Повторно обратиться к свидетелю</button>
          <button type="button" id="reader-theory-revisit-formal" class="reader-theories-option">Продолжить официальной проверкой документов</button>
        </div>
        <p id="reader-theory-revisit-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
        <button type="button" id="reader-theory-evidence" class="reader-timeline-follow-up" hidden></button>
        <p id="reader-theory-evidence-status" class="reader-theory-change-note" role="status" aria-live="polite"></p>
        <div id="reader-theory-history" class="reader-theory-history" aria-label="История версий"></div>
      </section>

      <section id="reader-quality-view" class="reader-theories-view reader-quality-view mb-6" aria-label="Аудит расследования" ${GameState.hasClue('reader_reconstructed_timeline') ? '' : 'hidden'}>
        <p class="reader-timeline-kicker">ОЦЕНКА МАТЕРИАЛОВ / БЕЗ СПОЙЛЕРОВ</p>
        <h3 class="reader-timeline-title">Насколько обоснованы выводы?</h3>
        <p class="reader-timeline-intro">Аудит показывает полноту проверок и доказанные расхождения. Это не рейтинг раскрытия преступления.</p>
        <div id="reader-quality-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="reader-gaps-detail" class="reader-theories-detail" aria-live="polite" aria-label="Пробелы расследования"></div>
        <div id="reader-gap-journal" class="reader-gap-journal" aria-label="Журнал следственных поручений"></div>
        <button type="button" id="reader-conclusion-save" class="reader-timeline-follow-up">СОСТАВИТЬ ПРОМЕЖУТОЧНОЕ ЗАКЛЮЧЕНИЕ</button>
        <button type="button" id="reader-conclusion-submit" class="reader-timeline-follow-up" hidden>ПЕРЕДАТЬ ЗАКЛЮЧЕНИЕ НА ПРОВЕРКУ</button>
        <div id="reader-conclusion-reviews" class="reader-theory-history" aria-label="Замечания по заключениям"></div>
        <button type="button" id="reader-review-directive" class="reader-timeline-follow-up" hidden>ПОЛУЧИТЬ СЛЕДУЮЩЕЕ ПОРУЧЕНИЕ</button>
        <div id="reader-review-directions" class="reader-theory-history" aria-label="Поручения по проверкам"></div>
        <div id="reader-conclusion-history" class="reader-theory-history" aria-label="Сохранённые заключения"></div>
      </section>

      <section id="old-case-crosscheck" class="reader-theories-view mb-6" aria-label="Сверка дневника и старого дела" hidden>
        <p class="reader-timeline-kicker">АРХИВ / ДВАДЦАТЬ ЛЕТ НАЗАД</p>
        <h3 class="reader-timeline-title">Кого ждал судья?</h3>
        <p class="reader-timeline-intro">Сопоставьте две найденные записи и зафиксируйте рабочее прочтение. Это не обвинение.</p>
        <div id="old-case-crosscheck-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="old-case-crosscheck-options" class="reader-theories-options" role="group" aria-label="Интерпретация дневника"></div>
        <p id="old-case-crosscheck-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>

      <div id="court-records" class="mb-6" ${GameState.hasClue('court_phone_register_copy') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА · НОМЕР 17</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-court-directory" class="card text-left" ${GameState.hasClue('court_extension_directory') ? 'disabled' : ''}>
            <p class="card-title">СПРАВОЧНИК ВНУТРЕННИХ НОМЕРОВ</p><p class="card-subtitle">Выяснить, где установлен телефон 17.</p>
          </button>
          <button id="btn-court-access" class="card text-left" ${GameState.hasClue('court_access_ledger') ? 'disabled' : ''}>
            <p class="card-title">ЖУРНАЛ КЛЮЧЕЙ ОХРАНЫ</p><p class="card-subtitle">Проверить, кто мог попасть в комнату.</p>
          </button>
        </div>
      </div>

      <div id="court-witnesses" class="mb-6" ${GameState.hasClue('court_access_ledger') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ПРОВЕРКА ДОСТУПА · СВИДЕТЕЛИ И КЛЮЧИ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-guard-testimony" class="card text-left" ${GameState.hasClue('guard_key_testimony') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ НОЧНОГО ОХРАННИКА</p><p class="card-subtitle">Восстановить его дежурство у комнаты секретарей.</p>
          </button>
          <button id="btn-spare-key" class="card text-left" ${GameState.hasClue('spare_key_inventory') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ОПИСЬ РЕЗЕРВНЫХ КЛЮЧЕЙ</p><p class="card-subtitle">Сверить слова охранника с учётом хозяйственной службы.</p>
          </button>
        </div>
      </div>

      <div id="guard-follow-up" class="card p-4 mb-6" hidden>
        <p class="card-title">ПОВТОРНЫЙ ДОПРОС ВИКТОРА БЕЛЛА</p>
        <p class="card-subtitle mt-2 mb-3">Вы доказали, что дубликат ключа существует. Как предъявить охраннику противоречие?</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-guard-patient" class="btn-noir text-xs py-3">СПОКОЙНО ПРЕДЪЯВИТЬ ОПИСЬ</button>
          <button id="btn-guard-pressure" class="btn-noir text-xs py-3">ПОТРЕБОВАТЬ ОБЪЯСНЕНИЙ</button>
        </div>
      </div>

      <div id="court-visitors" class="mb-6" ${GameState.hasClue('guard_round_sheet') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">НОЧНОЙ ДОСТУП · ЧУЖИЕ СЛЕДЫ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-visitor-log" class="card text-left" ${GameState.hasClue('court_visitor_log') ? 'disabled' : ''}>
            <p class="card-title">ЖУРНАЛ СЛУЖЕБНЫХ ПРОПУСКОВ</p><p class="card-subtitle">Проверить выдачу пропусков во время обхода охраны.</p>
          </button>
          <button id="btn-secretary-testimony" class="card text-left" ${GameState.hasClue('secretary_access_testimony') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ СЕКРЕТАРЯ САВЕЛЬЕВУ</p><p class="card-subtitle">Выяснить, кто оставался в суде после закрытия.</p>
          </button>
        </div>
      </div>

      <div id="secretary-follow-up" class="mb-6" hidden>
        <p class="text-gold text-xs tracking-widest mb-3">ПРОВЕРКА ИСТОЧНИКОВ · ПРОПУСК № 041</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-secretary-source" class="card text-left" ${GameState.hasClue('secretary_source_statement') ? 'disabled' : ''}>
            <p class="card-title">ВЫЯСНИТЬ ИСТОЧНИК СЛОВ САВЕЛЬЕВОЙ</p><p class="card-subtitle">Кто рассказал ей о ночном доступе?</p>
          </button>
          <button id="btn-pass-counterfoil" class="card text-left" ${GameState.hasClue('pass_041_counterfoil') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ КОРЕШОК ПРОПУСКА</p><p class="card-subtitle">Есть ли независимая регистрация № 041?</p>
          </button>
        </div>
      </div>

      <div id="orlov-inquiry" class="mb-6" ${GameState.hasClue('secretary_source_statement') && GameState.hasClue('pass_041_counterfoil') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ПАВЕЛ ОРЛОВ · ПРОВЕРКА АЛИБИ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-orlov-statement" class="card text-left" ${GameState.hasClue('orlov_evening_statement') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ ПАВЛА ОРЛОВА</p><p class="card-subtitle">Почему он сообщил Савельевой о ночном закрытии?</p>
          </button>
          <button id="btn-orlov-badge" class="card text-left" ${GameState.hasClue('orlov_badge_scan') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ СЛУЖЕБНУЮ КАРТОЧКУ</p><p class="card-subtitle">Сопоставить слова Орлова с системой прохода.</p>
          </button>
        </div>
      </div>

      <div id="orlov-confrontation" class="card p-4 mb-6" hidden>
        <p class="card-title">ПРОВЕРКА АЛИБИ · ПОВТОРНЫЙ ДОПРОС ОРЛОВА</p>
        <p class="card-subtitle mt-2 mb-3">Карточка отмечена на входе после предполагаемого ухода Орлова. Как предъявить несостыковку?</p>
        <div id="orlov-dossier" class="npc-dossier" aria-label="Известные особенности Орлова"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-orlov-patient" class="btn-noir text-xs py-3">УТОЧНИТЬ СУДЬБУ КАРТОЧКИ</button>
          <button id="btn-orlov-pressure" class="btn-noir text-xs py-3">ОБВИНИТЬ В СОКРЫТИИ</button>
        </div>
      </div>

      <div id="nk-identity" class="mb-6" ${GameState.hasClue('orlov_badge_handover') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ИНИЦИАЛЫ «Н. К.» · ПРОВЕРКА ЛИЧНОСТИ</p>
        <p id="orlov-memory-callback" class="witness-memory-callback" role="note" hidden></p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-nk-staff" class="card text-left" ${GameState.hasClue('court_nk_staff_index') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ КАДРОВУЮ КАРТОТЕКУ</p><p class="card-subtitle">Кому в суде могли принадлежать инициалы «Н. К.»?</p>
          </button>
          <button id="btn-nk-service" class="card text-left" ${GameState.hasClue('reader_service_ticket') ? 'disabled' : ''}>
            <p class="card-title">НАЙТИ НАРЯД НА ПРОВЕРКУ СЧИТЫВАТЕЛЯ</p><p class="card-subtitle">Были ли запланированы работы после 19:50?</p>
          </button>
        </div>
      </div>

      <div id="reader-verification" class="mb-6" ${GameState.hasClue('court_nk_staff_index') && GameState.hasClue('reader_service_ticket') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">РЕМОНТ СЧИТЫВАТЕЛЯ · ПРОВЕРКА ПРИСУТСТВИЯ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-reader-access" class="card text-left" ${GameState.hasClue('reader_maintenance_access_log') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ЖУРНАЛ ТЕХНИЧЕСКОГО ПОМЕЩЕНИЯ</p><p class="card-subtitle">Был ли зафиксирован проход к считывателю?</p>
          </button>
          <button id="btn-reader-signoff" class="card text-left" ${GameState.hasClue('reader_service_signoff') ? 'disabled' : ''}>
            <p class="card-title">НАЙТИ АКТ ЗАВЕРШЕНИЯ РАБОТ</p><p class="card-subtitle">Кто и когда закрыл ремонтный наряд?</p>
          </button>
        </div>
      </div>

      <div id="reader-interviews" class="mb-6" ${GameState.hasClue('reader_maintenance_access_log') && GameState.hasClue('reader_service_signoff') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ДВА СВИДЕТЕЛЯ · ПРОВЕРКА ВЕЧЕРНИХ СОБЫТИЙ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-klimov-interview" class="card text-left" ${GameState.hasClue('klimov_evening_account') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ НИКОЛАЯ КЛИМОВА</p><p class="card-subtitle">Кто проверял считыватель и закрывал наряд?</p>
          </button>
          <button id="btn-kostina-interview" class="card text-left" ${GameState.hasClue('kostina_evening_account') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ НАДЕЖДУ КОСТИНУ</p><p class="card-subtitle">Что происходило в административном крыле?</p>
          </button>
        </div>
      </div>

      <div id="witness-corroboration" class="mb-6" ${GameState.hasClue('klimov_evening_account') && GameState.hasClue('kostina_evening_account') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ПРОВЕРКА ПОКАЗАНИЙ · НЕЗАВИСИМЫЕ ЗАПИСИ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-tool-issue" class="card text-left" ${GameState.hasClue('maintenance_tool_issue_ledger') ? 'disabled' : ''}>
            <p class="card-title">ЖУРНАЛ ВЫДАЧИ КЛЮЧЕЙ И ИНСТРУМЕНТОВ</p><p class="card-subtitle">На чьё имя оформили универсальный ключ?</p>
          </button>
          <button id="btn-archive-register" class="card text-left" ${GameState.hasClue('archive_room_register') ? 'disabled' : ''}>
            <p class="card-title">ЖУРНАЛ АРХИВНОЙ КОМНАТЫ</p><p class="card-subtitle">Есть ли записи о дежурстве Костиной?</p>
          </button>
        </div>
      </div>

      <div id="klimov-confrontation" class="card p-4 mb-6" hidden>
        <p class="card-title">ПОВТОРНЫЙ ДОПРОС · НИКОЛАЙ КЛИМОВ</p>
        <p class="card-subtitle mt-2 mb-3">Ключ оформлен на его табельный номер, хотя он отрицает получение. Как предъявить запись?</p>
        <div id="klimov-dossier" class="npc-dossier" aria-label="Известные особенности Климова"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-klimov-patient" class="btn-noir text-xs py-3">УТОЧНИТЬ ПОРЯДОК ВЫДАЧИ</button>
          <button id="btn-klimov-pressure" class="btn-noir text-xs py-3">ОБВИНИТЬ В СОКРЫТИИ КЛЮЧА</button>
        </div>
      </div>

      <div id="key-note-trace" class="mb-6" ${GameState.hasClue('key_issue_clerk_note') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ПРОИСХОЖДЕНИЕ ЗАПИСКИ · КТО ОСТАВИЛ НОМЕР?</p>
        <p id="klimov-memory-callback" class="witness-memory-callback" role="note" hidden></p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-note-paper" class="card text-left" ${GameState.hasClue('key_note_paper_trace') ? 'disabled' : ''}>
            <p class="card-title">ИЗУЧИТЬ БУМАГУ И ОТРЫВНОЙ КРАЙ</p><p class="card-subtitle">Из какого блока взяли листок?</p>
          </button>
          <button id="btn-note-desk" class="card text-left" ${GameState.hasClue('supply_desk_shift_register') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ДОСТУП К СТОЛУ ВЫДАЧИ</p><p class="card-subtitle">Кто мог оставить листок без свидетелей?</p>
          </button>
        </div>
      </div>

      <div id="note-authorship" class="mb-6" ${GameState.hasClue('key_note_paper_trace') && GameState.hasClue('supply_desk_shift_register') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ЛИСТОК С НОМЕРОМ · ПРОВЕРКА ВОЗМОЖНОСТИ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-desk-access" class="card text-left" ${GameState.hasClue('supply_counter_access_roster') ? 'disabled' : ''}>
            <p class="card-title">СПИСОК ДОПУЩЕННЫХ К ХОЗЯЙСТВЕННОЙ СТОЙКЕ</p><p class="card-subtitle">Кто мог войти в общий коридор без сопровождения?</p>
          </button>
          <button id="btn-note-imprint" class="card text-left" ${GameState.hasClue('key_note_impression_report') ? 'disabled' : ''}>
            <p class="card-title">СВЕРИТЬ ВДАВЛЕННЫЕ ЗАПИСИ</p><p class="card-subtitle">Что было написано на листке под запиской?</p>
          </button>
        </div>
      </div>

      <div id="extension-seventeen-check" class="mb-6" ${GameState.hasClue('key_note_impression_report') && GameState.hasClue('court_extension_directory') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">«17 / ВЕЧЕР» · ПРОВЕРИТЬ ЗНАЧЕНИЕ ПОМЕТЫ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-numbered-requests" class="card text-left" ${GameState.hasClue('supply_evening_request_codes') ? 'disabled' : ''}>
            <p class="card-title">СВЕРИТЬ ОБОЗНАЧЕНИЯ В ЗАЯВКАХ</p><p class="card-subtitle">Был ли номер 17 внутренним кодом хозяйственной службы?</p>
          </button>
          <button id="btn-telephone-trace" class="card text-left" ${GameState.hasClue('switchboard_call_detail') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ДЕТАЛИЗАЦИЮ ЗВОНКА</p><p class="card-subtitle">Есть ли независимая связь с запиской?</p>
          </button>
        </div>
      </div>

      <div id="kit-seventeen-audit" class="mb-6" ${GameState.hasClue('supply_evening_request_codes') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">НАБОР № 17 · ФАКТИЧЕСКОЕ ДВИЖЕНИЕ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-kit-register" class="card text-left" ${GameState.hasClue('kit_seventeen_loan_log') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ВЫДАЧУ И ВОЗВРАТ НАБОРА</p><p class="card-subtitle">Когда набор покинул склад?</p>
          </button>
          <button id="btn-kit-checklist" class="card text-left" ${GameState.hasClue('kit_seventeen_service_checklist') ? 'disabled' : ''}>
            <p class="card-title">СВЕРИТЬ ОТМЕТКИ О ПРОВЕРКЕ</p><p class="card-subtitle">Связан ли набор с работами на считывателе?</p>
          </button>
        </div>
      </div>

      <div id="reader-chronology" class="mb-6" ${canAssembleReaderTimeline(id => GameState.hasClue(id)) ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ХРОНОЛОГИЯ · СОПОСТАВИТЬ НЕЗАВИСИМЫЕ ЗАПИСИ</p>
        <button id="btn-reader-chronology" class="card text-left" ${GameState.hasClue('reader_reconstructed_timeline') ? 'disabled' : ''}>
          <p class="card-title">СОСТАВИТЬ ХРОНОЛОГИЮ РЕМОНТА</p>
          <p class="card-subtitle">Восстановить последовательность по карточке, набору, ключу и акту.</p>
        </button>
      </div>

      <div class="court-clues-panel">
        <p class="text-gray-500 text-xs mb-2">НАЙДЕННЫЕ УЛИКИ:</p>
        <div id="found-clues" class="text-gold text-xs"></div>
      </div>
    </div>
  `;
  function renderNPCDossier(targetId, profile) {
    const target = container.querySelector(targetId);
    if (!target || !profile) return;
    const rows = [
      ['НАБЛЮДАЕМЫЙ МОТИВ', profile.observedMotive],
      ['КАК НАЧАТЬ РАЗГОВОР', profile.cooperationOpening],
      ['ГРАНИЦА СОТРУДНИЧЕСТВА', profile.boundary],
      ['ЧЕГО МЫ НЕ ЗНАЕМ', profile.unknown],
      ['ОСНОВАНИЕ', profile.basis]
    ];
    target.replaceChildren();
    for (const [label, value] of rows) {
      const row = document.createElement('p');
      const heading = document.createElement('strong');
      heading.textContent = label + ' · ';
      const detail = document.createElement('span');
      detail.textContent = value;
      row.append(heading, detail);
      target.appendChild(row);
    }
  }
  renderNPCDossier('#orlov-dossier', orlovDossier);
  renderNPCDossier('#klimov-dossier', klimovDossier);
  const orlovMemoryNote = container.querySelector('#orlov-memory-callback');
  if (orlovMemoryNote && orlovRecall) {
    orlovMemoryNote.textContent = orlovRecall;
    orlovMemoryNote.hidden = false;
  }
  const klimovMemoryNote = container.querySelector('#klimov-memory-callback');
  if (klimovMemoryNote && klimovRecall) {
    klimovMemoryNote.textContent = klimovRecall;
    klimovMemoryNote.hidden = false;
  }

  updateCluesList();
  const refreshCourtWorkflow = setupCourtWorkflow(container);
  const timelineDetail = container.querySelector('#reader-timeline-detail');
  const timelineFollowUp = container.querySelector('#reader-timeline-follow-up');
  const timelineFollowUpStatus = container.querySelector('#reader-timeline-follow-up-status');
  const theoryOptions = container.querySelector('#reader-theories-options');
  const theoryDetail = container.querySelector('#reader-theories-detail');
  const theoryRecordButton = container.querySelector('#reader-theory-record');
  const theoryChangeNote = container.querySelector('#reader-theory-change-note');
  const theoryHistory = container.querySelector('#reader-theory-history');
  const theoryApproaches = container.querySelector('#reader-theory-approaches');
  const theoryApproachResult = container.querySelector('#reader-theory-approach-result');
  const theoryRevisit = container.querySelector('#reader-theory-revisit');
  const theoryRevisitResult = container.querySelector('#reader-theory-revisit-result');
  const theoryEvidenceButton = container.querySelector('#reader-theory-evidence');
  const theoryEvidenceStatus = container.querySelector('#reader-theory-evidence-status');
  const qualityDetail = container.querySelector('#reader-quality-detail');
  const gapsDetail = container.querySelector('#reader-gaps-detail');
  const gapJournal = container.querySelector('#reader-gap-journal');
  const conclusionButton = container.querySelector('#reader-conclusion-save');
  const conclusionHistory = container.querySelector('#reader-conclusion-history');
  const conclusionSubmit = container.querySelector('#reader-conclusion-submit');
  const conclusionReviews = container.querySelector('#reader-conclusion-reviews');
  const directiveButton = container.querySelector('#reader-review-directive');
  const directiveHistory = container.querySelector('#reader-review-directions');
  const oldCasePanel = container.querySelector('#old-case-crosscheck');
  const oldCaseDetail = container.querySelector('#old-case-crosscheck-detail');
  const oldCaseOptions = container.querySelector('#old-case-crosscheck-options');
  const oldCaseResult = container.querySelector('#old-case-crosscheck-result');
  function refreshOldCaseCrosscheck() {
    const check = assessOldCaseCrosscheck(id => GameState.hasClue(id), GameState.flags.court_reader_review_directives);
    oldCasePanel.hidden = !check;
    oldCaseDetail.replaceChildren();
    oldCaseOptions.replaceChildren();
    if (!check) return;
    const details = check.ready
      ? [check.commonGround, check.limit]
      : [`Нужна независимая сверка. Получено источников: ${check.available.length} из 2.`,
        !GameState.hasClue('judge_notes') ? 'Осмотрите стол судьи в зале суда.' : 'Получите архивные сведения о старом деле через полицейское расследование.'];
    for (const detail of details) {
      const paragraph = document.createElement('p');
      paragraph.textContent = detail;
      oldCaseDetail.appendChild(paragraph);
    }
    const recorded = GameState.flags.court_old_case_reading;
    oldCaseResult.textContent = recorded ? `Записанная версия: ${recorded.assessment}` : '';
    if (!check.ready || recorded) return;
    for (const reading of OLD_CASE_READINGS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = reading.label;
      button.addEventListener('click', () => {
        const saved = recordOldCaseReading(reading.id, assessOldCaseCrosscheck(id => GameState.hasClue(id), GameState.flags.court_reader_review_directives), GameState.flags.court_old_case_reading);
        if (!saved) return;
        GameState.setFlag('court_old_case_reading', saved);
        refreshOldCaseCrosscheck();
      });
      oldCaseOptions.appendChild(button);
    }
  }
  let qualityRules = [];
  function refreshReaderQuality() {
    const audit = assessReaderInvestigation(GameState.currentCase, qualityRules, GameState.flags);
    qualityDetail.replaceChildren();
    gapsDetail.replaceChildren();
    if (!audit) return;
    const gaps = buildInvestigationGaps(GameState.currentCase);
    const gapStatuses = GameState.flags.court_investigation_gap_statuses;
    const gapsHeading = document.createElement('h4');
    gapsHeading.textContent = 'ПРОБЕЛЫ, КОТОРЫЕ ЕЩЁ НУЖНО ПРОВЕРИТЬ';
    gapsDetail.appendChild(gapsHeading);
    if (!gaps.length) {
      const empty = document.createElement('p');
      empty.textContent = 'По уже открытым материалам явных пробелов этого типа не выявлено. Это не означает, что дело раскрыто.';
      gapsDetail.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'investigation-gaps-list';
      for (const gap of gaps) {
        const item = document.createElement('li');
        item.dataset.gapId = gap.id;
        item.tabIndex = -1;
        const title = document.createElement('strong');
        title.textContent = gap.title;
        const detail = document.createElement('p');
        detail.textContent = gap.detail;
        const controls = document.createElement('div');
        controls.className = 'investigation-gap-controls';
        const statusLabel = document.createElement('span');
        const status = getInvestigationGapStatus(gapStatuses, gap.id);
        statusLabel.textContent = 'План проверки: ' + GAP_STATUS_LABELS[status];
        controls.appendChild(statusLabel);
        for (const [choice, caption] of [['active', 'В работу'], ['deferred', 'Отложить'], ['pending', 'Сбросить']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = caption;
          button.disabled = status === choice;
          button.setAttribute('aria-label', caption + ': ' + gap.title);
          button.addEventListener('click', () => {
            const current = buildInvestigationGaps(GameState.currentCase);
            const updated = updateInvestigationGapStatus(current, GameState.flags.court_investigation_gap_statuses, gap.id, choice);
            if (!updated) return;
            GameState.setFlag('court_investigation_gap_statuses', updated);
            refreshReaderQuality();
          });
          controls.appendChild(button);
        }
        item.append(title, detail, controls);
        list.appendChild(item);
      }
      gapsDetail.appendChild(list);
    }
    gapJournal.replaceChildren();
    const journalHeading = document.createElement('h4');
    journalHeading.textContent = 'ЖУРНАЛ СЛЕДСТВЕННЫХ ПОРУЧЕНИЙ';
    gapJournal.appendChild(journalHeading);
    const assignments = buildInvestigationAssignmentJournal(gaps, gapStatuses);
    if (!assignments.length) {
      const emptyJournal = document.createElement('p');
      emptyJournal.textContent = 'Нет проверок, взятых в работу или отложенных. Назначьте действие в списке пробелов выше.';
      gapJournal.appendChild(emptyJournal);
    } else {
      const journalList = document.createElement('ul');
      journalList.className = 'investigation-assignment-list';
      for (const assignment of assignments) {
        const entry = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = assignment.title;
        const status = document.createElement('span');
        status.className = 'investigation-assignment-status';
        status.textContent = assignment.statusLabel;
        const detail = document.createElement('p');
        detail.textContent = assignment.detail;
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'investigation-assignment-open';
        open.textContent = 'К СВЯЗАННОЙ ПРОВЕРКЕ';
        open.addEventListener('click', () => {
          const target = Array.from(gapsDetail.querySelectorAll('[data-gap-id]'))
            .find(element => element.dataset.gapId === assignment.id);
          if (!target) return;
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.focus({ preventScroll: true });
        });
        entry.append(title, status, detail, open);
        journalList.appendChild(entry);
      }
      gapJournal.appendChild(journalList);
    }
    const rows = [
      ['Документы', `${audit.found.length} из ${audit.found.length + audit.remaining.length} ключевых проверок`],
      ['Подтверждённые расхождения', String(audit.verifiedContradictions.length)],
      ['Работа со свидетелем', audit.conduct],
      ['Предел доказательств', audit.verdict]
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label + ': ';
      row.append(strong, document.createTextNode(value));
      qualityDetail.appendChild(row);
    }
    const heading = document.createElement('strong');
    heading.textContent = 'Что проверить дальше:';
    qualityDetail.appendChild(heading);
    const list = document.createElement('ul');
    for (const step of audit.nextSteps) {
      const item = document.createElement('li');
      item.textContent = step;
      list.appendChild(item);
    }
    qualityDetail.appendChild(list);
    const history = Array.isArray(GameState.flags.court_reader_conclusions) ? GameState.flags.court_reader_conclusions : [];
    const draft = buildReaderEpisodeConclusion(GameState.currentCase, qualityRules, GameState.flags, history);
    const canRevise = hasNewConclusionEvidence(history.at(-1), draft);
    conclusionButton.disabled = !canRevise;
    conclusionButton.textContent = !history.length ? 'СОСТАВИТЬ ПРОМЕЖУТОЧНОЕ ЗАКЛЮЧЕНИЕ'
      : canRevise ? 'ОБНОВИТЬ ЗАКЛЮЧЕНИЕ ПО НОВЫМ ФАКТАМ' : '✓ ЗАКЛЮЧЕНИЕ СОХРАНЕНО · НОВЫХ ФАКТОВ НЕТ';
    const reviews = Array.isArray(GameState.flags.court_reader_conclusion_reviews) ? GameState.flags.court_reader_conclusion_reviews : [];
    const latest = history.at(-1);
    const alreadyReviewed = reviews.some(item => item.conclusionVersion === latest?.version);
    conclusionSubmit.hidden = !latest;
    conclusionSubmit.disabled = !latest || alreadyReviewed;
    conclusionSubmit.textContent = alreadyReviewed ? '✓ ПОСЛЕДНЯЯ РЕДАКЦИЯ ПРОВЕРЕНА' : 'ПЕРЕДАТЬ ЗАКЛЮЧЕНИЕ НА ПРОВЕРКУ';
    conclusionReviews.replaceChildren();
    for (const review of reviews) {
      const block = document.createElement('div');
      block.className = 'reader-conclusion-entry';
      const title = document.createElement('strong');
      title.textContent = `Рецензия на версию ${review.conclusionVersion} · ${review.status}`;
      block.appendChild(title);
      for (const comment of review.comments) {
        const line = document.createElement('p');
        line.textContent = comment;
        block.appendChild(line);
      }
      conclusionReviews.appendChild(block);
    }
    const assignments = Array.isArray(GameState.flags.court_reader_review_directives) ? GameState.flags.court_reader_review_directives : [];
    const lastReview = reviews.at(-1);
    const reviewedConclusion = history.find(item => item.version === lastReview?.conclusionVersion);
    const directive = planReviewDirective(lastReview, reviewedConclusion, assignments);
    directiveButton.hidden = !directive;
    directiveButton.textContent = directive?.kind === 'next_lead' ? 'ПОЛУЧИТЬ НАПРАВЛЕНИЕ К СЛЕДУЮЩЕЙ ЗАЦЕПКЕ' : 'ПОЛУЧИТЬ ПОРУЧЕНИЕ НА ДОПОЛНИТЕЛЬНУЮ ПРОВЕРКУ';
    directiveHistory.replaceChildren();
    for (const assignment of assignments) {
      const line = document.createElement('p');
      line.textContent = `Версия ${assignment.conclusionVersion} · ${assignment.text}`;
      directiveHistory.appendChild(line);
    }
    refreshOldCaseCrosscheck();
    conclusionHistory.replaceChildren();
    if (history.length) {
      const heading = document.createElement('p');
      heading.textContent = 'АРХИВ ПРОМЕЖУТОЧНЫХ ЗАКЛЮЧЕНИЙ';
      conclusionHistory.appendChild(heading);
      for (const entry of history) {
        const block = document.createElement('div');
        block.className = 'reader-conclusion-entry';
        const title = document.createElement('strong');
        title.textContent = `Версия ${entry.version} · ${entry.status}`;
        const facts = document.createElement('p');
        facts.textContent = `Установлено: ${entry.established.join(' ')}`;
        const gaps = document.createElement('p');
        gaps.textContent = `Требует проверки: ${entry.unresolved.join(' ')}`;
        const verdict = document.createElement('p');
        verdict.textContent = `Вывод: ${entry.verdict}`;
        block.append(title, facts, gaps, verdict);
        conclusionHistory.appendChild(block);
      }
    }
  }
  conclusionButton.addEventListener('click', () => {
    const history = Array.isArray(GameState.flags.court_reader_conclusions) ? GameState.flags.court_reader_conclusions : [];
    const draft = buildReaderEpisodeConclusion(GameState.currentCase, qualityRules, GameState.flags, history);
    if (!hasNewConclusionEvidence(history.at(-1), draft)) return;
    GameState.setFlag('court_reader_conclusions', [...history, draft]);
    refreshReaderQuality();
  });
  conclusionSubmit.addEventListener('click', () => {
    const history = GameState.flags.court_reader_conclusions;
    const latest = Array.isArray(history) ? history.at(-1) : null;
    const reviews = Array.isArray(GameState.flags.court_reader_conclusion_reviews) ? GameState.flags.court_reader_conclusion_reviews : [];
    const result = reviewReaderConclusion(latest, reviews);
    if (!result) return;
    GameState.setFlag('court_reader_conclusion_reviews', [...reviews, result]);
    refreshReaderQuality();
  });
  directiveButton.addEventListener('click', () => {
    const history = GameState.flags.court_reader_conclusions || [];
    const reviews = GameState.flags.court_reader_conclusion_reviews || [];
    const assignments = GameState.flags.court_reader_review_directives || [];
    const lastReview = reviews.at(-1);
    const related = history.find(item => item.version === lastReview?.conclusionVersion);
    const directive = planReviewDirective(lastReview, related, assignments);
    if (!directive) return;
    GameState.setFlag('court_reader_review_directives', [...assignments, directive]);
    refreshReaderQuality();
  });
  let selectedTheoryId = 'single_operator';
  function refreshReaderTheories() {
    const theories = compareReaderTheories(id => GameState.hasClue(id));
    theoryOptions.replaceChildren();
    for (const theory of theories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = theory.title;
      button.setAttribute('aria-pressed', String(selectedTheoryId === theory.id));
      button.addEventListener('click', () => { selectedTheoryId = theory.id; refreshReaderTheories(); });
      theoryOptions.appendChild(button);
    }
    const selected = theories.find(theory => theory.id === selectedTheoryId);
    if (!selected) { theoryDetail.textContent = ''; theoryRecordButton.hidden = true; return; }
    const evidenceName = id => GameState.currentCase.clues.find(clue => clue.id === id)?.name || id;
    theoryDetail.replaceChildren();
    const lines = [
      ['Версия', selected.premise],
      ['Материалы', selected.observed.map(evidenceName).join('; ') || 'Нет доступных документов'],
      ['Ещё не изучено', selected.unavailable.length ? selected.unavailable.length + ' документ(а)' : 'Исходные документы собраны'],
      ['Дополнительные проверки', selected.verifiedChecks.map(evidenceName).join('; ') || 'Не проводились'],
      ['Ожидают проверки', selected.pendingChecks.length ? selected.pendingChecks.length + ' направление(я)' : 'Все доступные проверки проведены'],
      ['Что не доказано', selected.question]
    ];
    for (const [label, value] of lines) {
      const paragraph = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label + ': ';
      paragraph.append(strong, document.createTextNode(value));
      theoryDetail.appendChild(paragraph);
    }
    const caution = document.createElement('p');
    caution.className = 'reader-theories-verdict';
    caution.textContent = selected.status + ' · Наличие документа не подтверждает автоматически выбранную версию.';
    theoryDetail.appendChild(caution);
    const history = Array.isArray(GameState.flags.court_reader_theory_history) ? GameState.flags.court_reader_theory_history : [];
    const latest = history.at(-1);
    const consequence = GameState.flags.court_reader_theory_consequence;
    const change = latest?.theoryId === selected.id ? evaluateTheoryChanges(latest, selected) : null;
    theoryRecordButton.hidden = false;
    theoryRecordButton.disabled = latest?.theoryId === selected.id && !change?.changed;
    theoryRecordButton.textContent = latest?.theoryId !== selected.id ? 'ЗАКРЕПИТЬ ЭТУ ВЕРСИЮ В ДЕЛЕ'
      : change?.changed ? 'ПЕРЕСМОТРЕТЬ ВЕРСИЮ С НОВЫМИ ДАННЫМИ' : '✓ ВЕРСИЯ ЗАПИСАНА · НОВЫХ ДАННЫХ НЕТ';
    theoryChangeNote.textContent = change?.changed
      ? `После записи версии появились новые материалы: ${change.newDocuments.length} документ(а), ${change.newChecks.length} проверк(и). Вывод по-прежнему не доказан.` : '';
    theoryApproaches.hidden = !latest || !!consequence;
    theoryApproachResult.textContent = consequence
      ? consequence.response + ` Доверие: ${consequence.trustDelta > 0 ? '+' : ''}${consequence.trustDelta}.` : '';
    const revisit = GameState.flags.court_reader_theory_revisit;
    theoryRevisit.hidden = !consequence || !!revisit;
    theoryRevisitResult.textContent = revisit ? revisit.text + ` Изменение доверия: ${revisit.trustDelta > 0 ? '+' : ''}${revisit.trustDelta}.` : '';
    const evidenceRoute = getReaderEvidenceRoute(consequence, revisit);
    const evidenceDiscovered = GameState.hasClue('reader_archive_crosscheck');
    theoryEvidenceButton.hidden = !evidenceRoute;
    theoryEvidenceButton.disabled = !evidenceRoute || evidenceDiscovered;
    theoryEvidenceButton.textContent = evidenceDiscovered ? '✓ АРХИВНАЯ СВЕРКА ПОЛУЧЕНА' : evidenceRoute?.label || '';
    theoryEvidenceStatus.textContent = evidenceDiscovered
      ? GameState.getClue('reader_archive_crosscheck')?.description || '' : '';
    theoryHistory.replaceChildren();
    if (history.length) {
      const title = document.createElement('p');
      title.textContent = 'ЖУРНАЛ РАССУЖДЕНИЙ';
      theoryHistory.appendChild(title);
      for (const entry of history) {
        const item = document.createElement('p');
        const name = READER_THEORIES.find(theory => theory.id === entry.theoryId)?.title || 'Неизвестная версия';
        item.textContent = `Запись ${entry.version} · ${name} · ${entry.observed.length} документ(а) · ${entry.verifiedChecks.length} проверк(и) · ${entry.status}`;
        theoryHistory.appendChild(item);
      }
    }
    refreshReaderQuality();
  }
  theoryRecordButton.addEventListener('click', () => {
    if (!GameState.hasClue('reader_reconstructed_timeline')) return;
    const current = compareReaderTheories(id => GameState.hasClue(id)).find(theory => theory.id === selectedTheoryId);
    if (!current) return;
    const history = Array.isArray(GameState.flags.court_reader_theory_history) ? GameState.flags.court_reader_theory_history : [];
    const latest = history.at(-1);
    if (latest?.theoryId === current.id && !evaluateTheoryChanges(latest, current)?.changed) return;
    const snapshot = snapshotReaderTheory(current, history);
    if (!snapshot) return;
    GameState.setFlag('court_reader_theory_history', [...history, snapshot]);
    refreshReaderTheories();
  });
  function handleTheoryApproach(approach) {
    if (!GameState.hasClue('reader_reconstructed_timeline') || GameState.flags.court_reader_theory_consequence) return;
    const history = GameState.flags.court_reader_theory_history;
    const latest = Array.isArray(history) ? history.at(-1) : null;
    const outcome = resolveTheoryApproach(latest, approach);
    if (!outcome) return;
    GameState.setFlag('court_reader_theory_consequence', outcome);
    GameState.updateRelationship(outcome.npcId, outcome.trustDelta);
    refreshReaderTheories();
  }
  container.querySelector('#reader-theory-discreet').addEventListener('click', () => handleTheoryApproach('discreet'));
  container.querySelector('#reader-theory-accusation').addEventListener('click', () => handleTheoryApproach('accusation'));
  function revisitTheoryWitness(route) {
    const consequence = GameState.flags.court_reader_theory_consequence;
    if (!GameState.hasClue('reader_reconstructed_timeline') || !consequence || GameState.flags.court_reader_theory_revisit) return;
    const result = resolveWitnessRecall(consequence, route);
    if (!result) return;
    NPCMemory.setFlag(consequence.npcId, result.memoryFlag);
    GameState.setFlag('court_reader_theory_revisit', result);
    if (result.trustDelta) GameState.updateRelationship(consequence.npcId, result.trustDelta);
    refreshReaderTheories();
  }
  container.querySelector('#reader-theory-revisit-talk').addEventListener('click', () => revisitTheoryWitness('conversation'));
  container.querySelector('#reader-theory-revisit-formal').addEventListener('click', () => revisitTheoryWitness('formal'));
  theoryEvidenceButton.addEventListener('click', async () => {
    const route = getReaderEvidenceRoute(GameState.flags.court_reader_theory_consequence, GameState.flags.court_reader_theory_revisit);
    if (!route || GameState.hasClue('reader_archive_crosscheck')) return;
    const narrative = route.id === 'cooperation'
      ? 'Свидетель помогает запросить архивную сверку: в документе есть запись о проверке считывателя в 20:31 и закрытии акта в 20:52, но не указано имя исполнителя. Содействие ускорило доступ к копии, а не установило виновного.'
      : 'По официальному запросу канцелярия выдаёт ту же архивную сверку. Личная помощь свидетеля не потребовалась. Документ подтверждает последовательность работ, но не устанавливает участника ремонта.';
    await inspectCourtRecord('reader-theory-evidence', 'reader_archive_crosscheck', narrative, 'reader_reconstructed_timeline');
    refreshReaderTheories();
  });
  refreshReaderTheories();
  let selectedTimelineIndex = 0;
  function selectTimelineEvent(index) {
    const item = READER_TIMELINE_EVENTS[index];
    if (!item) return;
    selectedTimelineIndex = index;
    const source = GameState.currentCase.clues.find(clue => clue.id === item.source);
    timelineDetail.textContent = `${item.time} · ${source?.name || 'Документ'} — ${item.gap}`;
    const followUp = getReaderTimelineFollowUp(index);
    timelineFollowUp.hidden = !followUp;
    timelineFollowUp.disabled = !followUp || GameState.hasClue(followUp.clueId);
    timelineFollowUp.textContent = followUp && GameState.hasClue(followUp.clueId)
      ? '✓ Проверка проведена: ' + followUp.label : followUp ? followUp.label + ' →' : '';
    timelineFollowUpStatus.textContent = followUp && GameState.hasClue(followUp.clueId)
      ? GameState.currentCase.clues.find(clue => clue.id === followUp.clueId)?.description || '' : '';
    container.querySelectorAll('[data-timeline-index]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.timelineIndex) === index));
    });
  }
  container.querySelectorAll('[data-timeline-index]').forEach(button => {
    button.addEventListener('click', () => selectTimelineEvent(Number(button.dataset.timelineIndex)));
  });
  timelineFollowUp.addEventListener('click', async () => {
    if (!GameState.hasClue('reader_reconstructed_timeline')) return;
    const followUp = getReaderTimelineFollowUp(selectedTimelineIndex);
    if (!followUp || GameState.hasClue(followUp.clueId)) return;
    await inspectCourtRecord('reader-timeline-follow-up', followUp.clueId, followUp.narrative, 'reader_reconstructed_timeline');
    selectTimelineEvent(selectedTimelineIndex);
    refreshReaderTheories();
  });
  selectTimelineEvent(0);

  async function loadCourtRules() {
    const response = await fetch('src/data/contradictions.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  }

  loadCourtRules().then(rules => {
    qualityRules = rules;
    refreshReaderQuality();
    if (!GameState.hasClue('guard_round_sheet') && canChallengeGuard(GameState.currentCase, rules)) {
      container.querySelector('#guard-follow-up').hidden = false;
    }
    if (canTraceSecretary(GameState.currentCase, rules)) {
      container.querySelector('#secretary-follow-up').hidden = false;
    }
    if (!GameState.hasClue('orlov_badge_handover') && canConfrontOrlov(GameState.currentCase, rules)) {
      container.querySelector('#orlov-confrontation').hidden = false;
    }
    if (!GameState.hasClue('key_issue_clerk_note') && canConfrontKlimov(GameState.currentCase, rules)) {
      container.querySelector('#klimov-confrontation').hidden = false;
    }
    refreshCourtWorkflow();
  }).catch(error => console.warn('[Court] Не удалось проверить основания для повторного опроса:', error));

  container.querySelectorAll('.court-hotspot').forEach(function(button) {
    button.addEventListener('click', function() {
      container.querySelector('#' + button.dataset.trigger)?.click();
    });
  });

  document.getElementById('btn-zone-body').addEventListener('click', function() {
    if (!GameState.hasClue('body_examination')) {
      GameState.addClue({
        id: 'body_examination',
        name: 'Осмотр тела судьи',
        category: 'observation',
        description: 'Судья был отравлен. На запястьях — следы от верёвок. Глаза завязаны при жизни. Убийца хотел, чтобы он знал, что умирает.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Вы опускаетесь на корточки рядом с меловым контуром. Судья Гаррисон. Двадцать лет на скамье. Двадцать лет он решал судьбы. ' +
        'Теперь кто-то решил его судьбу. На запястьях — характерные ссадины: его связывали. Но не били. Не пытали. ' +
        'Его просто заставили ждать. Судья знал, что умирает. Убийца дал ему время подумать о всех вынесенных приговорах.',
        'Осмотр тела судьи'
      );
    } else {
      showNarrative('Вы уже осмотрели тело. Мел, кровь, верёвки — картина ясна. Но что-то в этом деле всё ещё ускользает.');
    }
  });

  document.getElementById('btn-zone-wall').addEventListener('click', function() {
    if (!GameState.hasClue('wall_inscription')) {
      GameState.addClue({
        id: 'wall_inscription',
        name: 'Надпись на стене',
        category: 'observation',
        description: '«СЛЕПОЕ ПРАВОСУДИЕ» — написано кровью жертвы. Отсылка к Фемиде, богине правосудия, которую изображают с завязанными глазами.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Вы проводите пальцем в сантиметре от надписи. Кровь судьи. Убийца макал палец в рану и выводил каждую букву медленно, почти любовно. ' +
        'Фемида. Богиня с завязанными глазами. Беспристрастное правосудие. Вот только глаза судье завязали не для беспристрастности — а чтобы он не видел лица своего палача. ' +
        'Или чтобы не видел, как тот улыбается.',
        'Надпись на стене'
      );
    } else {
      showNarrative('Надпись уже изучена. «СЛЕПОЕ ПРАВОСУДИЕ» — послание тому, кто умеет читать между строк.');
    }
  });

  document.getElementById('btn-zone-scales').addEventListener('click', function() {
    if (!GameState.hasClue('broken_scales')) {
      GameState.addClue({
        id: 'broken_scales',
        name: 'Сломанные весы',
        category: 'object',
        description: 'Одна чаша весов сломана пополам. На второй — отпечаток пальца. Убийца сделал это намеренно.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Весы Фемиды — символ правосудия — валяются на полу. Одна чаша расколота надвое. Вы поднимаете вторую: на ней чёткий отпечаток пальца. ' +
        'Убийца не пытался его стереть. Он хотел, чтобы вы его нашли. Он играет с вами. И пока что — ведёт в счёте.',
        'Сломанные весы'
      );
    } else {
      showNarrative('Вы уже осмотрели весы. Отпечаток пальца — улика или приглашение? Этот убийца ничего не делает случайно.');
    }
  });

  document.getElementById('btn-zone-desk').addEventListener('click', function() {
    if (!GameState.hasClue('judge_notes')) {
      GameState.addClue({
        id: 'judge_notes',
        name: 'Записи судьи',
        category: 'document',
        description: 'В ящике стола — ежедневник. Последняя запись: «Он вернулся. Спустя 20 лет. Боюсь, что справедливость настигнет нас всех».',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'В ящике стола — ежедневник в кожаном переплёте. Судья вёл записи почти тридцать лет. Вы пролистываете страницы: ' +
        'заседания, приговоры, фамилии. А потом — пустые страницы. И наконец, последняя запись, сделанная дрожащей рукой: ' +
        '<br><br><em>«Он вернулся. Спустя 20 лет. Я думал, мы похоронили это дело вместе с ней. Но мёртвые не молчат. ' +
        'Он придёт за всеми нами. И знаете что? Мы это заслужили.»</em>',
        'Записи судьи'
      );
    } else {
      showNarrative('Вы перечитываете записи судьи. Двадцать лет. Дело, которое пытались похоронить. Кто "она"? И кто "он"?');
    }
    refreshOldCaseCrosscheck();
  });

  async function inspectCourtRecord(buttonId, clueId, narrative, prerequisite = 'court_phone_register_copy') {
    if (!GameState.hasClue(prerequisite) || GameState.hasClue(clueId)) return;
    const button = container.querySelector('#' + buttonId);
    button.disabled = true;
    try {
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog[clueId]) throw new Error('Не найдена запись в каталоге');
      GameState.addClue(catalog[clueId]);
      if (clueId === 'reader_reconstructed_timeline') {
        container.querySelector('#reader-timeline-view').hidden = false;
        container.querySelector('#reader-theories-view').hidden = false;
        container.querySelector('#reader-quality-view').hidden = false;
      }
      if (clueId === 'court_access_ledger') container.querySelector('#court-witnesses').hidden = false;
      if (GameState.hasClue('court_nk_staff_index') && GameState.hasClue('reader_service_ticket')) {
        container.querySelector('#reader-verification').hidden = false;
      }
      if (GameState.hasClue('reader_maintenance_access_log') && GameState.hasClue('reader_service_signoff')) {
        container.querySelector('#reader-interviews').hidden = false;
      }
      if (GameState.hasClue('klimov_evening_account') && GameState.hasClue('kostina_evening_account')) {
        container.querySelector('#witness-corroboration').hidden = false;
      }
      if (GameState.hasClue('key_issue_clerk_note')) container.querySelector('#key-note-trace').hidden = false;
      if (GameState.hasClue('key_note_paper_trace') && GameState.hasClue('supply_desk_shift_register')) {
        container.querySelector('#note-authorship').hidden = false;
      }
      if (GameState.hasClue('key_note_impression_report') && GameState.hasClue('court_extension_directory')) {
        container.querySelector('#extension-seventeen-check').hidden = false;
      }
      if (GameState.hasClue('supply_evening_request_codes')) container.querySelector('#kit-seventeen-audit').hidden = false;
      if (canAssembleReaderTimeline(id => GameState.hasClue(id))) container.querySelector('#reader-chronology').hidden = false;
      refreshCourtWorkflow();
      refreshReaderTheories();
      showNarrative(narrative, catalog[clueId].name);
    } catch (error) {
      button.disabled = false;
      console.error('[Court] Не удалось открыть документ:', error);
      showNarrative('Документ пока не удалось получить. Повторите проверку.', 'АРХИВ НЕДОСТУПЕН');
    }
  }

  container.querySelector('#btn-court-directory').addEventListener('click', function() {
    inspectCourtRecord('btn-court-directory', 'court_extension_directory',
      'В старом справочнике под номером 17 значится общая комната секретарей. Не кабинет судьи и не личный телефон. Сотрудники могли пользоваться аппаратом по очереди — нужна проверка доступа.');
  });
  container.querySelector('#btn-court-access').addEventListener('click', function() {
    inspectCourtRecord('btn-court-access', 'court_access_ledger',
      'Охрана записала: ключ от комнаты секретарей вернули в 19:40, до 22:00 доступ закрыт. Но в 20:15 с номера 17 кто-то звонил в участок. Ошибка в журнале? Запасной ключ? Пока это только расхождение документов.');
  });
  container.querySelector('#btn-guard-testimony').addEventListener('click', function() {
    inspectCourtRecord('btn-guard-testimony', 'guard_key_testimony',
      'Виктор Белл, ночной охранник, уверяет: «В 19:40 ключ вернули. Запасного у нас вообще нет. Коридор с восьми до половины девятого был пуст». На вопрос о непрерывном наблюдении он уточняет: «Я уходил на обход, но ненадолго». Его слова нужно сверить с учётом ключей.',
      'court_access_ledger');
  });
  container.querySelector('#btn-spare-key').addEventListener('click', function() {
    inspectCourtRecord('btn-spare-key', 'spare_key_inventory',
      'В хозяйственной описи значится запасной ключ от комнаты секретарей. Он числится в опечатанном шкафу, но отметки о проверке пломбы в тот день нет. Это ещё не доказательство вскрытия шкафа — однако слова охранника о единственном ключе неверны.',
      'court_access_ledger');
  });
  container.querySelector('#btn-visitor-log').addEventListener('click', function() {
    inspectCourtRecord('btn-visitor-log', 'court_visitor_log',
      'Вы листаете журнал поста. В 20:08 выписан пропуск № 041 с допуском к коридору секретарей. Имя в графе получателя затёрто, подписи о возврате нет. Это может быть след, ошибка или поздняя запись: сначала нужно проверить источник.',
      'guard_round_sheet');
  });
  container.querySelector('#btn-secretary-testimony').addEventListener('click', function() {
    inspectCourtRecord('btn-secretary-testimony', 'secretary_access_testimony',
      'Елена Савельева складывает руки: «После половины восьмого пропуска больше не выдавали. Последний вернули ещё в 19:25». Вы уточняете, была ли она на ночном посту. «Нет, я ушла до восьми. Мне так передали». Её уверенность опирается на чужие слова.',
      'guard_round_sheet');
  });

  async function traceSecretary(buttonId, clueId, narrative) {
    const button = container.querySelector('#' + buttonId);
    if (GameState.hasClue(clueId)) return;
    button.disabled = true;
    try {
      const rules = await loadCourtRules();
      if (!canTraceSecretary(GameState.currentCase, rules)) return;
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog[clueId]) throw new Error('Не найдена запись в каталоге');
      GameState.addClue(catalog[clueId]);
      if (GameState.hasClue('secretary_source_statement') && GameState.hasClue('pass_041_counterfoil')) {
        container.querySelector('#orlov-inquiry').hidden = false;
      }
      refreshCourtWorkflow();
      showNarrative(narrative, catalog[clueId].name);
    } catch (error) {
      console.error('[Court] Не удалось проверить источник:', error);
      showNarrative('Дополнительная проверка временно недоступна. Попробуйте ещё раз.', 'ПОИСК ПРЕРВАН');
    } finally {
      if (!GameState.hasClue(clueId)) button.disabled = false;
    }
  }

  container.querySelector('#btn-secretary-source').addEventListener('click', function() {
    traceSecretary('btn-secretary-source', 'secretary_source_statement',
      '«Мне позвонил Павел Орлов, старший делопроизводитель», — поясняет Савельева. «Он ссылался на Белла. Я сама вечернюю книгу не видела». Следовательно, два похожих рассказа не подтверждают друг друга: оба восходят к одному охраннику.');
  });
  container.querySelector('#btn-pass-counterfoil').addEventListener('click', function() {
    traceSecretary('btn-pass-counterfoil', 'pass_041_counterfoil',
      'В корешковой книге сохранился № 041 со штампом 20:08. Зона допуска совпадает с журналом, но строки для имени остались пустыми. Выдача зарегистрирована дважды; кому достался пропуск, по этим бумагам всё ещё неизвестно.');
  });

  function inspectOrlov(buttonId, clueId, narrative) {
    if (!GameState.hasClue('secretary_source_statement') || !GameState.hasClue('pass_041_counterfoil')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'secretary_source_statement');
  }

  container.querySelector('#btn-orlov-statement').addEventListener('click', function() {
    inspectOrlov('btn-orlov-statement', 'orlov_evening_statement',
      'Павел Орлов поправляет галстук: «Я ушёл в 19:45. В суд не возвращался. Около 20:40 позвонил Савельевой из дома: Белл говорил, что коридор был закрыт». На уточнение о пропуске № 041 он отвечает: «Не мой номер. Моя карточка служебная». Утверждения стоит проверить по регистрации входа.');
  });
  container.querySelector('#btn-orlov-badge').addEventListener('click', function() {
    inspectOrlov('btn-orlov-badge', 'orlov_badge_scan',
      'Считыватель служебного входа зарегистрировал карточку Орлова в 20:02 и 20:47. Значит, карточка находилась в здании после его предполагаемого ухода. Но данные считывателя не устанавливают лицо, использовавшее карточку. Пропуск № 041 — другой документ.',
    );
  });

  container.querySelector('#btn-nk-staff').addEventListener('click', function() {
    inspectCourtRecord('btn-nk-staff', 'court_nk_staff_index',
      'Кадровая картотека выдаёт две фамилии на «Н. К.»: техник Николай Климов и архивист Надежда Костина. Оба имеют доступ в административное крыло. Совпадение инициалов само по себе не устанавливает, кто получил карточку.',
      'orlov_badge_handover');
  });
  container.querySelector('#btn-nk-service').addEventListener('click', function() {
    inspectCourtRecord('btn-nk-service', 'reader_service_ticket',
      'В ремонтном журнале найден наряд с 19:55 до 20:30 на проверку считывателя. Ответственным назначен Николай Климов. Это правдоподобная причина передать ему карточку, но наряд не подтверждает, что он действительно явился на работу.',
      'orlov_badge_handover');
  });

  function inspectReaderRecord(buttonId, clueId, narrative) {
    if (!GameState.hasClue('court_nk_staff_index') || !GameState.hasClue('reader_service_ticket')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'reader_service_ticket');
  }

  container.querySelector('#btn-reader-access').addEventListener('click', function() {
    inspectReaderRecord('btn-reader-access', 'reader_maintenance_access_log',
      'В журнале технического помещения запись о входе Климова отсутствует. В 20:06 зафиксирован вход по универсальному ключу без имени. Журнал заполнялся вручную и не доказывает, что Климов там не был, а безымянная отметка не устанавливает личность посетителя.');
  });
  container.querySelector('#btn-reader-signoff').addEventListener('click', function() {
    inspectReaderRecord('btn-reader-signoff', 'reader_service_signoff',
      'Наряд закрыт отметкой «считыватель проверен» в 20:52. Подпись исполнителя неразборчива, поле проверки руководителем пустое. Время закрытия позже планового окна работ и выхода карточки Орлова в 20:47: это повод проверить исполнителя, но не доказательство подлога.');
  });

  function inspectReaderWitness(buttonId, clueId, narrative) {
    if (!GameState.hasClue('reader_maintenance_access_log') || !GameState.hasClue('reader_service_signoff')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'reader_service_signoff');
  }

  container.querySelector('#btn-klimov-interview').addEventListener('click', function() {
    inspectReaderWitness('btn-klimov-interview', 'klimov_evening_account',
      'Климов вспоминает: «Заявку видел, но универсального ключа не брал. В районе 20:25 передал инструмент дежурному и ушёл. Акт в 20:52 не подписывал». Это личные показания, которым пока нет независимого подтверждения: нужно проверить выдачу инструмента и подлинность подписи.');
  });
  container.querySelector('#btn-kostina-interview').addEventListener('click', function() {
    inspectReaderWitness('btn-kostina-interview', 'kostina_evening_account',
      'Костина отвечает: «После восьми разбирала архив. Около 20:50 услышала шаги у хозяйственной канцелярии, но никого не видела». Она отрицает получение карточки Орлова. Звук шагов не определяет посетителя, а её нахождение в архиве пока подтверждено лишь её словами.');
  });

  function inspectWitnessRecord(buttonId, clueId, narrative) {
    if (!GameState.hasClue('klimov_evening_account') || !GameState.hasClue('kostina_evening_account')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'klimov_evening_account');
  }

  container.querySelector('#btn-tool-issue').addEventListener('click', function() {
    inspectWitnessRecord('btn-tool-issue', 'maintenance_tool_issue_ledger',
      'В книге выдачи универсальный ключ записан за табельным номером Климова в 20:03. Возврат помечен в 20:56, подпись получателя смазана. Это не совпадает с его утверждением, что ключ он не брал, но запись под номером не удостоверяет, кто фактически получил его. Сопоставьте оба документа на доске гипотез.');
  });
  container.querySelector('#btn-archive-register').addEventListener('click', function() {
    inspectWitnessRecord('btn-archive-register', 'archive_room_register',
      'В архивной книге есть строки с инициалами Костиной в 20:12 и 20:44. Журнал поддерживает её рассказ о работе, но заполнялся вручную без контроля времени: установить, оставалась ли она в архиве непрерывно, по этим строкам нельзя.');
  });

  async function confrontKlimov(tone) {
    if (GameState.hasClue('key_issue_clerk_note')) return;
    const outcome = resolveKlimovConfrontation(tone);
    if (!outcome) return;
    const panel = container.querySelector('#klimov-confrontation');
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => { button.disabled = true; });
    try {
      const rules = await loadCourtRules();
      if (!canConfrontKlimov(GameState.currentCase, rules)) return;
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog.key_issue_clerk_note) throw new Error('Не найдена записка кладовщика');
      GameState.addClue(catalog.key_issue_clerk_note);
      GameState.setFlag('court_klimov_interview_tone', tone);
      GameState.updateRelationship('npc_nikolay_klimov', outcome.trustDelta);
      NPCMemory.recordInterview('npc_nikolay_klimov', {
        tone,
        response: tone === 'patient' ? 'shared_lead' : 'declined_further_comment',
        statementRef: 'key_issue_clerk_note',
        presentedEvidenceIds: ['klimov_evening_account', 'maintenance_tool_issue_ledger'],
        trustAfter: GameState.getRelationship('npc_nikolay_klimov').trust
      });
      panel.hidden = true;
      container.querySelector('#key-note-trace').hidden = false;
      refreshCourtWorkflow();
      showNarrative(outcome.text + ' Объяснение сменного кладовщика добавлено к материалам дела.', 'ПОВТОРНЫЙ ДОПРОС КЛИМОВА');
    } catch (error) {
      console.error('[Court] Не удалось проверить выдачу ключа:', error);
      showNarrative('Запись сейчас недоступна. Повторите запрос позже.', 'ДОПРОС ПРЕРВАН');
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  container.querySelector('#btn-klimov-patient').addEventListener('click', () => confrontKlimov('patient'));
  container.querySelector('#btn-klimov-pressure').addEventListener('click', () => confrontKlimov('pressure'));

  container.querySelector('#btn-note-paper').addEventListener('click', function() {
    inspectCourtRecord('btn-note-paper', 'key_note_paper_trace',
      'В архиве хозяйственной службы сохранился листок: бумага и зубчатый край совпадают с общим блокнотом заявок у стойки выдачи. На соседнем листе различим продавленный номер Климова, но автор записи не установлен. Такой блокнот был доступен нескольким сотрудникам.',
      'key_issue_clerk_note');
  });
  container.querySelector('#btn-note-desk').addEventListener('click', function() {
    inspectCourtRecord('btn-note-desk', 'supply_desk_shift_register',
      'По книге дежурств кладовщик отсутствовал у стойки с 19:56 до 20:04. В этот промежуток хозяйственный стол не закрывали, и пропуск поимённо не проверяли. Это объясняет возможность оставить записку, но не показывает, кто именно вошёл.',
      'key_issue_clerk_note');
  });

  function inspectNoteOrigin(buttonId, clueId, narrative) {
    if (!GameState.hasClue('key_note_paper_trace') || !GameState.hasClue('supply_desk_shift_register')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'key_note_paper_trace');
  }

  container.querySelector('#btn-desk-access').addEventListener('click', function() {
    inspectNoteOrigin('btn-desk-access', 'supply_counter_access_roster',
      'В список допущенных к хозяйственной стойке входят работники канцелярии, архивариус Костина, техник Климов и сменный курьер. Допуск не является отметкой фактического посещения. Проверить необходимо именно перемещения в 19:56–20:04.');
  });
  container.querySelector('#btn-note-imprint').addEventListener('click', function() {
    inspectNoteOrigin('btn-note-imprint', 'key_note_impression_report',
      'Исследование продавленных строк обнаруживает рядом с табельным номером помету «17 / вечер». Это похоже на внутренний номер 17, но назначение пометы неизвестно. Один и тот же блокнот использовали для разных заявок; приписывать текст конкретному человеку нельзя.');
  });

  function inspectSeventeenLink(buttonId, clueId, narrative) {
    if (!GameState.hasClue('key_note_impression_report') || !GameState.hasClue('court_extension_directory')) return;
    inspectCourtRecord(buttonId, clueId, narrative, 'key_note_impression_report');
  }

  container.querySelector('#btn-numbered-requests').addEventListener('click', function() {
    inspectSeventeenLink('btn-numbered-requests', 'supply_evening_request_codes',
      'В хозяйственных заявках найдено обозначение «17 / вечер»: так помечают вечерние заявки на набор № 17 для проверки оборудования. Совпадение с надписью на листке даёт бытовое объяснение числу, но не устанавливает, кто оставил записку и использовался ли номер также для телефона.');
  });
  container.querySelector('#btn-telephone-trace').addEventListener('click', function() {
    inspectSeventeenLink('btn-telephone-trace', 'switchboard_call_detail',
      'Детализация подтверждает звонок с внутреннего номера 17 в 20:15, но не содержит имени говорившего и ссылок на ремонтную заявку. Одновременное появление числа 17 в двух источниках само по себе не связывает их.');
  });

  container.querySelector('#btn-kit-register').addEventListener('click', function() {
    inspectCourtRecord('btn-kit-register', 'kit_seventeen_loan_log',
      'Набор № 17 записан как выданный в 19:58 на вечернюю ремонтную заявку и возвращённый в 20:58. Получатель обозначен «дежурная бригада», без имени. Это подтверждает движение набора, но не то, кто держал инструменты и ключ.',
      'supply_evening_request_codes');
  });
  container.querySelector('#btn-kit-checklist').addEventListener('click', function() {
    inspectCourtRecord('btn-kit-checklist', 'kit_seventeen_service_checklist',
      'В контрольном листе набора № 17 указана проверка считывателя служебного входа. В 20:31 отмечено «тест выполнен», однако строка исполнителя пуста. Это связывает хозяйственную заявку с местом работ, но не доказывает, кто проводил проверку и зачем позже закрыли акт в 20:52.',
      'supply_evening_request_codes');
  });

  container.querySelector('#btn-reader-chronology').addEventListener('click', function() {
    if (!canAssembleReaderTimeline(id => GameState.hasClue(id))) return;
    const sequence = READER_TIMELINE_EVENTS.map(item => `${item.time} — ${item.event}`).join('<br>');
    inspectCourtRecord('btn-reader-chronology', 'reader_reconstructed_timeline',
      sequence + '<br><br>Источники показывают движение карточки, ключа и инструментов, но не доказывают, что ими пользовался один человек. Гостевой пропуск № 041 остаётся отдельным документом.',
      'kit_seventeen_loan_log');
  });

  async function confrontOrlov(tone) {
    if (GameState.hasClue('orlov_badge_handover')) return;
    const outcome = resolveOrlovConfrontation(tone);
    if (!outcome) return;
    const panel = container.querySelector('#orlov-confrontation');
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => { button.disabled = true; });
    try {
      const rules = await loadCourtRules();
      if (!canConfrontOrlov(GameState.currentCase, rules)) return;
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog.orlov_badge_handover) throw new Error('Не найдена ведомость передачи карточек');
      GameState.addClue(catalog.orlov_badge_handover);
      GameState.setFlag('court_orlov_interview_tone', tone);
      GameState.updateRelationship('npc_pavel_orlov', outcome.trustDelta);
      NPCMemory.recordInterview('npc_pavel_orlov', {
        tone,
        response: tone === 'patient' ? 'shared_lead' : 'declined_further_comment',
        statementRef: 'orlov_badge_handover',
        presentedEvidenceIds: ['orlov_evening_statement', 'orlov_badge_scan'],
        trustAfter: GameState.getRelationship('npc_pavel_orlov').trust
      });
      panel.hidden = true;
      container.querySelector('#nk-identity').hidden = false;
      refreshCourtWorkflow();
      showNarrative(outcome.text + ' Документ добавлен в архив улик.', 'ПОВТОРНЫЙ ДОПРОС ОРЛОВА');
    } catch (error) {
      console.error('[Court] Не удалось провести повторный допрос Орлова:', error);
      showNarrative('Документ сейчас недоступен. Вы сможете вернуться к этому вопросу.', 'ДОПРОС ПРЕРВАН');
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  container.querySelector('#btn-orlov-patient').addEventListener('click', () => confrontOrlov('patient'));
  container.querySelector('#btn-orlov-pressure').addEventListener('click', () => confrontOrlov('pressure'));

  async function challengeGuard(tone) {
    if (GameState.hasClue('guard_round_sheet')) return;
    const choice = resolveGuardChallenge(tone);
    if (!choice) return;
    const panel = container.querySelector('#guard-follow-up');
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => { button.disabled = true; });
    try {
      const rules = await loadCourtRules();
      if (!canChallengeGuard(GameState.currentCase, rules)) return;
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog.guard_round_sheet) throw new Error('Нет маршрутного листа в каталоге');
      GameState.addClue(catalog.guard_round_sheet);
      GameState.setFlag('court_guard_interview_tone', tone);
      GameState.updateRelationship('npc_viktor_bell', choice.trustDelta);
      panel.hidden = true;
      container.querySelector('#court-visitors').hidden = false;
      refreshCourtWorkflow();
      showNarrative(choice.text + ' Маршрутный лист добавлен в архив улик.', 'ПОВТОРНЫЙ ДОПРОС');
    } catch (error) {
      console.error('[Court] Ошибка повторного допроса:', error);
      showNarrative('Проверка документов временно недоступна. Попробуйте повторить разговор.', 'ДОПРОС ПРЕРВАН');
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  container.querySelector('#btn-guard-patient').addEventListener('click', () => challengeGuard('patient'));
  container.querySelector('#btn-guard-pressure').addEventListener('click', () => challengeGuard('pressure'));

  document.getElementById('btn-leave').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'city-map' });
  });

  function showNarrative(text, title) {
    var notification = document.createElement('div');
    notification.className = 'fixed inset-0 z-30 flex items-center justify-center p-4';
    notification.innerHTML = `
      <div class="bg-noir-950 border border-gold p-6 max-w-lg w-full animate-fade-in">
        <p class="text-gold text-xs tracking-widest mb-3">${title || 'НАХОДКА'}</p>
        <p class="text-gray-300 text-sm leading-relaxed">${text}</p>
        <button class="btn-noir text-xs py-2 mt-4 close-narrative">ПРИНЯТЬ К СВЕДЕНИЮ</button>
      </div>
    `;
    document.body.appendChild(notification);

    notification.querySelector('.close-narrative').addEventListener('click', function() {
      notification.remove();
      updateCluesList();
    });
  }

  function updateCluesList() {
    var cluesEl = document.getElementById('found-clues');
    if (cluesEl) {
      var clueIds = ['body_examination', 'wall_inscription', 'broken_scales', 'judge_notes'];
      var clues = GameState.currentCase.clues.filter(function(clue) { return clueIds.includes(clue.id); });
      container.querySelectorAll('.court-hotspot').forEach(function(button) {
        var index = ['btn-zone-body', 'btn-zone-wall', 'btn-zone-scales', 'btn-zone-desk'].indexOf(button.dataset.trigger);
        button.classList.toggle('is-found', GameState.hasClue(clueIds[index]));
      });
      if (clues.length === 0) {
        cluesEl.innerHTML = '<span class="text-gray-600">Пока ничего не найдено</span>';
      } else {
        cluesEl.innerHTML = clues.map(function(c) {
          return '<span class="mr-2">📎 ' + c.name + '</span>';
        }).join('');
      }
    }
  }
}
