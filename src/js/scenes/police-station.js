import { Events } from '../core/events.js';
import { DialogBox } from '../components/dialog-box.js';
import { GameState } from '../core/state.js';
import { assessOldCaseClosure, recordOldCaseClosure } from '../systems/old-case-closure.js';
import { assessOldCaseOrder, recordOldCaseOrderInterpretation, OLD_CASE_ORDER_INTERPRETATIONS } from '../systems/old-case-order.js';
import { assessOldCaseSignature, recordOldCaseSignatureAction, OLD_CASE_SIGNATURE_ACTIONS } from '../systems/old-case-signature.js';
import { assessOldCaseFollowUp, recordOldCaseFollowUp } from '../systems/old-case-follow-up.js';
import { NPCMemory } from '../systems/npc-memory.js';
import { canApproachMorganAboutOldCase, resolveMorganOldCaseApproach, OLD_CASE_MORGAN_APPROACHES } from '../systems/old-case-morgan.js';
import { planMorganRevisit, recordMorganRevisit } from '../systems/old-case-morgan-revisit.js';
import { assessOldCaseSources, recordOldCaseSourceReading, OLD_CASE_SOURCE_READINGS } from '../systems/old-case-source-audit.js';
import { assessOldCaseWitnesses, recordOldCaseWitnessReading, OLD_CASE_WITNESS_STATEMENTS } from '../systems/old-case-witnesses.js';
import { planOldCaseWitnessFollowUp, recordOldCaseWitnessFollowUp } from '../systems/old-case-witness-follow-up.js';
import { assessOldCaseDiscrepancy, recordOldCaseDiscrepancy, OLD_CASE_DISCREPANCY_CHOICES } from '../systems/old-case-discrepancy.js';
import { assessOldCasePortLog, recordOldCasePortLogReading, OLD_CASE_PORT_LOG_READINGS } from '../systems/old-case-port-log.js';
import { assessOldCaseWaybill, recordOldCaseWaybillReading, OLD_CASE_WAYBILL_READINGS } from '../systems/old-case-waybill.js';
import { planMorganBriefing, recordMorganBriefing, MORGAN_BRIEFING_APPROACHES } from '../systems/old-case-morgan-briefing.js';
import { getOldCaseNavigation } from '../systems/old-case-navigation.js';

export function render(container, data) {
  container.innerHTML = `
    <div class="scene precinct-scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">УЧАСТОК</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Центральный участок Блэкфорда</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="precinct-art" role="img" aria-label="Полицейский участок Блэкфорда ночью: дежурная стойка, коридор и дождь за окнами">
        <div class="precinct-art-caption"><span>БЛЭКФОРД · НОЯБРЬ 1987</span><strong>Центральный полицейский участок</strong></div>
      </div>

      <div class="precinct-description mb-6">
        <p class="text-gray-400 text-sm italic">
          В участке пахнет дешёвым растворимым кофе и застарелым табачным дымом — той особой смесью, которая въедается в стены всех полицейских участков мира.
          За обшарпанной стойкой дежурный лениво листает газету трёхдневной давности, делая вид, что не замечает вас.
          Где-то в глубине коридора слышен приглушённый крик — кого-то допрашивают, и, судя по тону, допрашиваемый проигрывает.
        </p>
        <p class="text-gray-500 text-xs mt-3">
          Детектив Рэй Морган сидит за столом в дальнем углу. Перед ним — гора папок, пепельница, полная окурков, и кружка с надписью «Лучший папа», происхождение которой вызывает вопросы.
        </p>
      </div>

      <div id="precinct-actions" class="space-y-3 mb-6">
        <button id="btn-talk-ray" class="card precinct-action text-left w-full">
          <p class="card-title">ПОГОВОРИТЬ С ДЕТЕКТИВОМ МОРГАНОМ <span aria-hidden="true">↗</span></p>
          <p class="card-subtitle">Расспросить о деле. Если он, конечно, в настроении.</p>
        </button>
        <button id="btn-request-register" class="card precinct-action text-left w-full" ${GameState.hasClue('court_switchboard_log') && !GameState.hasClue('court_phone_register_copy') ? '' : 'hidden'}>
          <p class="card-title">ПОДАТЬ ЗАПРОС НА КНИГУ СОЕДИНЕНИЙ <span aria-hidden="true">↗</span></p>
          <p class="card-subtitle">Предъявить выписку дежурному и запросить заверенную копию по делу.</p>
        </button>
      </div>

      <div id="precinct-register-result" class="hidden card p-4 mb-6" role="status" aria-live="polite"></div>
      <p id="precinct-archive-error" class="reader-theory-change-note" role="alert" hidden></p>
      <nav id="precinct-archive-route" class="reader-theories-view mb-6" aria-label="Маршрут архивного расследования" hidden>
        <p class="reader-timeline-kicker">ПУТЕВОДИТЕЛЬ ПО РАССЛЕДОВАНИЮ</p>
        <h3 class="reader-timeline-title">Дело Каллиопы · архивные проверки</h3>
        <p id="precinct-archive-route-summary" class="reader-timeline-intro" aria-live="polite"></p>
        <div id="precinct-archive-route-links" class="reader-theories-options"></div>
      </nav>
      <section id="precinct-old-case" class="reader-theories-view mb-6" aria-label="Архив дела Каллиопы" hidden>
        <p class="reader-timeline-kicker">АРХИВ УЧАСТКА / ДЕЛО КАЛЛИОПЫ</p>
        <h3 class="reader-timeline-title">Почему дело закрыли за три дня?</h3>
        <div id="precinct-old-case-status" class="reader-theories-detail" aria-live="polite"></div>
        <button id="precinct-old-case-register" class="reader-timeline-follow-up">ЗАПРОСИТЬ ВЫПИСКУ ИЗ КНИГИ ЗАКРЫТЫХ ДЕЛ</button>
        <button id="precinct-old-case-inventory" class="reader-timeline-follow-up">ЗАПРОСИТЬ ОПИСЬ АРХИВНОЙ ПАПКИ</button>
        <button id="precinct-old-case-assess" class="reader-timeline-follow-up">СОСТАВИТЬ ЗАМЕТКУ О ПОЛНОТЕ АРХИВА</button>
      </section>
      <section id="precinct-old-case-order" class="reader-theories-view mb-6" aria-label="Проверка постановления о закрытии дела" hidden>
        <p class="reader-timeline-kicker">АРХИВ / ПОЛНОМОЧИЯ И ПОДПИСЬ</p>
        <h3 class="reader-timeline-title">Кто подписал постановление?</h3>
        <div id="precinct-old-case-order-detail" class="reader-theories-detail" aria-live="polite"></div>
        <button id="precinct-old-case-order-request" class="reader-timeline-follow-up">ЗАПРОСИТЬ КОПИЮ ПОСТАНОВЛЕНИЯ</button>
        <button id="precinct-old-case-roster-request" class="reader-timeline-follow-up">СВЕРИТЬ ЖУРНАЛ ВРЕМЕННЫХ ПОЛНОМОЧИЙ</button>
        <div id="precinct-old-case-order-options" class="reader-theories-options" role="group" aria-label="Рабочая оценка полномочий"></div>
        <p id="precinct-old-case-order-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-old-case-signature" class="reader-theories-view mb-6" aria-label="Независимая проверка подписи" hidden>
        <p class="reader-timeline-kicker">ЭКСПЕРТИЗА / ПРОВЕРКА ПОДПИСИ</p>
        <h3 class="reader-timeline-title">Сохранился ли исходный росчерк?</h3>
        <div id="precinct-old-case-signature-detail" class="reader-theories-detail" aria-live="polite"></div>
        <button id="precinct-signature-original" class="reader-timeline-follow-up">ЗАПРОСИТЬ ОРИГИНАЛ ПОСТАНОВЛЕНИЯ</button>
        <button id="precinct-signature-samples" class="reader-timeline-follow-up">ПОЛУЧИТЬ НЕЗАВИСИМЫЕ ОБРАЗЦЫ ПОДПИСЕЙ</button>
        <div id="precinct-old-case-signature-options" class="reader-theories-options" role="group" aria-label="Выбор дополнительной проверки"></div>
        <p id="precinct-old-case-signature-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-old-case-follow-up" class="reader-theories-view mb-6" aria-label="Результат выбранной проверки подписи" hidden>
        <p class="reader-timeline-kicker">ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА / ПО ВЫБРАННОМУ МАРШРУТУ</p>
        <h3 class="reader-timeline-title">Что удалось установить?</h3>
        <button id="precinct-old-case-follow-up-request" class="reader-timeline-follow-up"></button>
        <div id="precinct-old-case-follow-up-detail" class="reader-theories-detail" aria-live="polite"></div>
        <button id="precinct-old-case-follow-up-save" class="reader-timeline-follow-up" hidden>ЗАФИКСИРОВАТЬ РЕЗУЛЬТАТ И ДАЛЬНЕЙШИЙ ЗАПРОС</button>
      </section>
      <section id="precinct-morgan-old-case" class="reader-theories-view mb-6" aria-label="Обсуждение старого дела с Морганом" hidden>
        <p class="reader-timeline-kicker">РАЗГОВОР / ЦЕНА ПРЕЖДЕВРЕМЕННОГО ВЫВОДА</p>
        <h3 class="reader-timeline-title">Что сказать Моргану?</h3>
        <p class="reader-timeline-intro">Морган помнит, как детектив обращается с неполными доказательствами. Официальный запрос доступен при любом выборе.</p>
        <div id="precinct-morgan-old-case-options" class="reader-theories-options" role="group" aria-label="Тон разговора с Морганом"></div>
        <div id="precinct-morgan-old-case-result" class="reader-theories-detail" role="status" aria-live="polite"></div>
      </section>
      <section id="precinct-morgan-revisit" class="reader-theories-view mb-6" aria-label="Повторное обращение по старому делу" hidden>
        <p class="reader-timeline-kicker">АРХИВ / ПОСЛЕДСТВИЯ РАЗГОВОРА</p>
        <h3 class="reader-timeline-title">Найти карточку передачи дела</h3>
        <button id="precinct-morgan-revisit-request" class="reader-timeline-follow-up"></button>
        <div id="precinct-morgan-revisit-result" class="reader-theories-detail" role="status" aria-live="polite"></div>
      </section>
      <section id="precinct-source-audit" class="reader-theories-view mb-6" aria-label="Сверка архивных источников" hidden>
        <p class="reader-timeline-kicker">ДЕЛО КАЛЛИОПЫ / ПРОИСХОЖДЕНИЕ СВЕДЕНИЙ</p>
        <h3 class="reader-timeline-title">Что в действительности подтверждено?</h3>
        <div id="precinct-source-audit-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-source-audit-options" class="reader-theories-options" role="group" aria-label="Оценка независимых источников"></div>
        <p id="precinct-source-audit-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-old-witnesses" class="reader-theories-view mb-6" aria-label="Архивные свидетельства по делу Каллиопы" hidden>
        <p class="reader-timeline-kicker">АРХИВ / ПРЯМОЕ НАБЛЮДЕНИЕ И ПЕРЕСКАЗ</p>
        <h3 class="reader-timeline-title">Кто действительно был очевидцем?</h3>
        <div id="precinct-old-witness-requests" class="reader-theories-options"></div>
        <div id="precinct-old-witness-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-old-witness-choices" class="reader-theories-options" role="group" aria-label="Оценить происхождение показаний"></div>
        <p id="precinct-old-witness-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-witness-follow-up" class="reader-theories-view mb-6" aria-label="Повторная проверка архивных показаний" hidden>
        <p class="reader-timeline-kicker">АРХИВ / УТОЧНЕНИЕ ПОКАЗАНИЙ</p>
        <h3 class="reader-timeline-title">Как проверить воспоминание двадцатилетней давности?</h3>
        <div id="precinct-witness-follow-up-options" class="reader-theories-options" role="group" aria-label="Выбор проверки"></div>
        <div id="precinct-witness-follow-up-result" class="reader-theories-detail" role="status" aria-live="polite"></div>
      </section>
      <section id="precinct-old-discrepancy" class="reader-theories-view mb-6" aria-label="Оценка расхождений в архивных показаниях" hidden>
        <p class="reader-timeline-kicker">ЖУРНАЛ ПРОТИВОРЕЧИЙ / ПРОВЕРКА ИСТОЧНИКА</p>
        <h3 class="reader-timeline-title">Противоречие или пробел в сведениях?</h3>
        <div id="precinct-old-discrepancy-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-old-discrepancy-options" class="reader-theories-options" role="group" aria-label="Классификация расхождения"></div>
        <p id="precinct-old-discrepancy-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-port-log" class="reader-theories-view mb-6" aria-label="Архивный журнал посещения порта" hidden>
        <p class="reader-timeline-kicker">НОВЫЙ ИСТОЧНИК / ЖУРНАЛ ПОРТОВОГО ПОСТА</p>
        <h3 class="reader-timeline-title">Кто въезжал в порт двадцать лет назад?</h3>
        <button id="precinct-port-log-request" class="reader-timeline-follow-up">ЗАПРОСИТЬ СОХРАНИВШИЙСЯ ЖУРНАЛ ВЪЕЗДА</button>
        <div id="precinct-port-log-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-port-log-options" class="reader-theories-options" role="group" aria-label="Оценка нового документа"></div>
        <p id="precinct-port-log-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-waybill" class="reader-theories-view mb-6" aria-label="Сверка путевого листа с журналом порта" hidden>
        <p class="reader-timeline-kicker">АРХИВ / НЕЗАВИСИМЫЙ ТРАНСПОРТНЫЙ ИСТОЧНИК</p>
        <h3 class="reader-timeline-title">Был ли это один и тот же рейс?</h3>
        <button id="precinct-waybill-request" class="reader-timeline-follow-up">ЗАПРОСИТЬ ПУТЕВОЙ ЛИСТ</button>
        <div id="precinct-waybill-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-waybill-options" class="reader-theories-options" role="group" aria-label="Сопоставление транспортных записей"></div>
        <p id="precinct-waybill-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <section id="precinct-morgan-briefing" class="reader-theories-view mb-6" aria-label="Повторный разговор с Морганом о портовых документах" hidden>
        <p class="reader-timeline-kicker">МОРГАН / ПАМЯТЬ О ПРЕЖНИХ РЕШЕНИЯХ</p>
        <h3 class="reader-timeline-title">Что сказать Моргану о совпавших датах?</h3>
        <div id="precinct-morgan-briefing-detail" class="reader-theories-detail" aria-live="polite"></div>
        <div id="precinct-morgan-briefing-options" class="reader-theories-options" role="group" aria-label="Выбор тона разговора"></div>
        <p id="precinct-morgan-briefing-result" class="reader-theory-change-note" role="status" aria-live="polite"></p>
      </section>
      <div id="dialog-container" class="hidden"></div>
    </div>
  `;

  const oldCasePanel = container.querySelector('#precinct-old-case');
  const archiveError = container.querySelector('#precinct-archive-error');
  const routePanel = container.querySelector('#precinct-archive-route');
  const routeSummary = container.querySelector('#precinct-archive-route-summary');
  const routeLinks = container.querySelector('#precinct-archive-route-links');
  function refreshArchiveRoute() {
    const route = getOldCaseNavigation(GameState.flags, id => GameState.hasClue(id));
    routePanel.hidden = route.stages.length === 0;
    routeLinks.replaceChildren();
    if (routePanel.hidden) return;
    routeSummary.textContent = `Завершено этапов: ${route.completed} из ${route.stages.length} доступных. ${route.next ? `Следующая проверка: ${route.next.label}.` : 'Все доступные этапы завершены.'}`;
    for (const stage of route.stages) {
      const target = container.querySelector(`#${stage.target}`);
      if (!target || target.hidden) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = `${stage.status === 'done' ? '✓' : '→'} ${stage.label}`;
      button.addEventListener('click', () => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
      routeLinks.appendChild(button);
    }
  }
  const oldCaseStatus = container.querySelector('#precinct-old-case-status');
  const oldCaseRegister = container.querySelector('#precinct-old-case-register');
  const oldCaseInventory = container.querySelector('#precinct-old-case-inventory');
  const oldCaseAssess = container.querySelector('#precinct-old-case-assess');
  const orderPanel = container.querySelector('#precinct-old-case-order');
  const orderDetail = container.querySelector('#precinct-old-case-order-detail');
  const orderRequest = container.querySelector('#precinct-old-case-order-request');
  const rosterRequest = container.querySelector('#precinct-old-case-roster-request');
  const orderOptions = container.querySelector('#precinct-old-case-order-options');
  const orderResult = container.querySelector('#precinct-old-case-order-result');
  const signaturePanel = container.querySelector('#precinct-old-case-signature');
  const signatureDetail = container.querySelector('#precinct-old-case-signature-detail');
  const signatureOriginal = container.querySelector('#precinct-signature-original');
  const signatureSamples = container.querySelector('#precinct-signature-samples');
  const signatureOptions = container.querySelector('#precinct-old-case-signature-options');
  const signatureResult = container.querySelector('#precinct-old-case-signature-result');
  const followUpPanel = container.querySelector('#precinct-old-case-follow-up');
  const followUpRequest = container.querySelector('#precinct-old-case-follow-up-request');
  const followUpDetail = container.querySelector('#precinct-old-case-follow-up-detail');
  const followUpSave = container.querySelector('#precinct-old-case-follow-up-save');
  const morganPanel = container.querySelector('#precinct-morgan-old-case');
  const morganOptions = container.querySelector('#precinct-morgan-old-case-options');
  const morganResult = container.querySelector('#precinct-morgan-old-case-result');
  const revisitPanel = container.querySelector('#precinct-morgan-revisit');
  const revisitButton = container.querySelector('#precinct-morgan-revisit-request');
  const revisitResult = container.querySelector('#precinct-morgan-revisit-result');
  const auditPanel = container.querySelector('#precinct-source-audit');
  const auditDetail = container.querySelector('#precinct-source-audit-detail');
  const auditOptions = container.querySelector('#precinct-source-audit-options');
  const auditResult = container.querySelector('#precinct-source-audit-result');
  const witnessesPanel = container.querySelector('#precinct-old-witnesses');
  const witnessRequests = container.querySelector('#precinct-old-witness-requests');
  const witnessDetail = container.querySelector('#precinct-old-witness-detail');
  const witnessChoices = container.querySelector('#precinct-old-witness-choices');
  const witnessResult = container.querySelector('#precinct-old-witness-result');
  const witnessFollowUpPanel = container.querySelector('#precinct-witness-follow-up');
  const witnessFollowUpOptions = container.querySelector('#precinct-witness-follow-up-options');
  const witnessFollowUpResult = container.querySelector('#precinct-witness-follow-up-result');
  const discrepancyPanel = container.querySelector('#precinct-old-discrepancy');
  const discrepancyDetail = container.querySelector('#precinct-old-discrepancy-detail');
  const discrepancyOptions = container.querySelector('#precinct-old-discrepancy-options');
  const discrepancyResult = container.querySelector('#precinct-old-discrepancy-result');
  const portLogPanel = container.querySelector('#precinct-port-log');
  const portLogRequest = container.querySelector('#precinct-port-log-request');
  const portLogDetail = container.querySelector('#precinct-port-log-detail');
  const portLogOptions = container.querySelector('#precinct-port-log-options');
  const portLogResult = container.querySelector('#precinct-port-log-result');
  const waybillPanel = container.querySelector('#precinct-waybill');
  const waybillRequest = container.querySelector('#precinct-waybill-request');
  const waybillDetail = container.querySelector('#precinct-waybill-detail');
  const waybillOptions = container.querySelector('#precinct-waybill-options');
  const waybillResult = container.querySelector('#precinct-waybill-result');
  const briefingPanel = container.querySelector('#precinct-morgan-briefing');
  const briefingDetail = container.querySelector('#precinct-morgan-briefing-detail');
  const briefingOptions = container.querySelector('#precinct-morgan-briefing-options');
  const briefingResult = container.querySelector('#precinct-morgan-briefing-result');
  function refreshMorganBriefing() {
    const briefing = planMorganBriefing(id => GameState.hasClue(id),
      GameState.flags.court_old_case_waybill_reading, GameState.flags.court_old_case_morgan_approach,
      GameState.flags.court_old_case_morgan_briefing);
    briefingPanel.hidden = !briefing;
    briefingOptions.replaceChildren();
    briefingDetail.textContent = briefing?.lead || '';
    briefingResult.textContent = briefing?.saved ? `${briefing.saved.response} ${briefing.saved.nextStep}` : '';
    if (!briefing || briefing.saved) return;
    for (const approach of MORGAN_BRIEFING_APPROACHES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = approach.label;
      button.addEventListener('click', () => {
        const result = recordMorganBriefing(approach.id, briefing,
          GameState.flags.court_old_case_morgan_approach, NPCMemory.getTrust('npc_ray_morgan'),
          GameState.flags.court_old_case_morgan_briefing);
        if (!result) return;
        GameState.setFlag('court_old_case_morgan_briefing', result);
        NPCMemory.changeTrust('npc_ray_morgan', result.trustDelta);
        refreshMorganBriefing();
        refreshArchiveRoute();
      });
      briefingOptions.appendChild(button);
    }
  }
  function refreshWaybill() {
    const check = assessOldCaseWaybill(id => GameState.hasClue(id),
      GameState.flags.court_old_case_port_log_reading, GameState.flags.court_old_case_waybill_reading);
    waybillPanel.hidden = !check;
    waybillOptions.replaceChildren();
    waybillRequest.hidden = !check || check.found;
    waybillDetail.textContent = !check ? '' : check.found ? check.question : 'Для сопоставления нужен независимый транспортный документ.';
    waybillResult.textContent = check?.saved ? `${check.saved.finding} ${check.saved.nextStep}` : '';
    if (!check?.found || check.saved) return;
    for (const reading of OLD_CASE_WAYBILL_READINGS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = reading.label;
      button.addEventListener('click', () => {
        const result = recordOldCaseWaybillReading(reading.id, check, GameState.flags.court_old_case_waybill_reading);
        if (!result) return;
        if (!result.correct) { waybillResult.textContent = result.feedback; return; }
        GameState.setFlag('court_old_case_waybill_reading', result);
        refreshWaybill();
        refreshMorganBriefing();
        refreshArchiveRoute();
      });
      waybillOptions.appendChild(button);
    }
  }
  function refreshPortLog() {
    const check = assessOldCasePortLog(id => GameState.hasClue(id),
      GameState.flags.court_old_case_discrepancy, GameState.flags.court_old_case_port_log_reading);
    portLogPanel.hidden = !check;
    portLogOptions.replaceChildren();
    portLogDetail.textContent = check?.found ? check.question : 'Нужен первичный журнал, чтобы проверить возможный визит независимо от слуха.';
    portLogRequest.hidden = !check || check.found;
    portLogResult.textContent = check?.saved ? `${check.saved.finding} ${check.saved.nextStep}` : '';
    if (!check?.found || check.saved) return;
    for (const reading of OLD_CASE_PORT_LOG_READINGS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = reading.label;
      button.addEventListener('click', () => {
        const result = recordOldCasePortLogReading(reading.id, check, GameState.flags.court_old_case_port_log_reading);
        if (!result) return;
        if (!result.correct) { portLogResult.textContent = result.feedback; return; }
        GameState.setFlag('court_old_case_port_log_reading', result);
        queueMicrotask(refreshArchiveRoute);
        refreshPortLog();
        refreshWaybill();
      });
      portLogOptions.appendChild(button);
    }
  }
  function refreshOldDiscrepancy() {
    const check = assessOldCaseDiscrepancy(id => GameState.hasClue(id),
      GameState.flags.court_old_case_witness_reading, GameState.flags.court_old_case_witness_follow_up,
      GameState.flags.court_old_case_discrepancy);
    discrepancyPanel.hidden = !check;
    discrepancyOptions.replaceChildren();
    discrepancyDetail.textContent = check ? check.question : '';
    discrepancyResult.textContent = check?.saved ? `${check.saved.finding} ${check.saved.nextStep}` : '';
    if (!check || check.saved) return;
    for (const choice of OLD_CASE_DISCREPANCY_CHOICES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = choice.label;
      button.addEventListener('click', () => {
        const result = recordOldCaseDiscrepancy(choice.id, check, GameState.flags.court_old_case_discrepancy);
        if (!result) return;
        if (!result.correct) { discrepancyResult.textContent = result.feedback; return; }
        GameState.setFlag('court_old_case_discrepancy', result);
        queueMicrotask(refreshArchiveRoute);
        refreshOldDiscrepancy();
        refreshPortLog();
      });
      discrepancyOptions.appendChild(button);
    }
  }
  function refreshWitnessFollowUp() {
    const saved = GameState.flags.court_old_case_witness_follow_up;
    const options = planOldCaseWitnessFollowUp(GameState.flags.court_old_case_witness_reading);
    witnessFollowUpPanel.hidden = !options;
    witnessFollowUpOptions.replaceChildren();
    witnessFollowUpResult.replaceChildren();
    if (!options) return;
    if (saved) {
      for (const line of [saved.response, saved.limitation]) {
        const p = document.createElement('p');
        p.textContent = line;
        witnessFollowUpResult.appendChild(p);
      }
      return;
    }
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = option.label;
      button.addEventListener('click', () => {
        const result = recordOldCaseWitnessFollowUp(option.id, GameState.flags.court_old_case_witness_reading,
          id => GameState.hasClue(id), GameState.flags.court_old_case_witness_follow_up);
        if (!result) return;
        GameState.setFlag('court_old_case_witness_follow_up', result);
        queueMicrotask(refreshArchiveRoute);
        refreshWitnessFollowUp();
        refreshOldDiscrepancy();
      });
      witnessFollowUpOptions.appendChild(button);
    }
  }
  function refreshOldWitnesses() {
    const check = assessOldCaseWitnesses(id => GameState.hasClue(id), GameState.flags.court_old_case_source_audit);
    witnessesPanel.hidden = !check;
    witnessRequests.replaceChildren();
    witnessDetail.replaceChildren();
    witnessChoices.replaceChildren();
    if (!check) return;
    for (const statement of OLD_CASE_WITNESS_STATEMENTS) {
      if (GameState.hasClue(statement.clueId)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-timeline-follow-up';
      button.textContent = statement.button;
      button.addEventListener('click', () => retrieveOldCaseDocument(statement.clueId, button));
      witnessRequests.appendChild(button);
    }
    const note = document.createElement('p');
    note.textContent = check.ready ? check.question : `Получено свидетельств: ${check.found.length} из 2. Запросите оба документа.`;
    witnessDetail.appendChild(note);
    const saved = GameState.flags.court_old_case_witness_reading;
    witnessResult.textContent = saved ? `${saved.conclusion} ${saved.nextStep}` : '';
    if (!check.ready || saved) return;
    for (const [id, label] of [
      ['both_direct', 'Оба показания — независимые наблюдения.'],
      ['direct_only', 'Только приём папки описан очевидцем; рассказ о судье — пересказ.'],
      ['both_rumor', 'Оба показания являются слухами.']
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = label;
      button.addEventListener('click', () => {
        const result = recordOldCaseWitnessReading(id, check, GameState.flags.court_old_case_witness_reading);
        if (!result) return;
        if (!result.correct) { witnessResult.textContent = result.feedback; return; }
        GameState.setFlag('court_old_case_witness_reading', result);
        queueMicrotask(refreshArchiveRoute);
        refreshOldWitnesses();
        refreshWitnessFollowUp();
      });
      witnessChoices.appendChild(button);
    }
  }
  function refreshSourceAudit() {
    const check = assessOldCaseSources(id => GameState.hasClue(id), GameState.flags.court_old_case_source_audit);
    auditPanel.hidden = !check;
    auditDetail.replaceChildren();
    auditOptions.replaceChildren();
    if (!check) return;
    const facts = check.saved
      ? [check.established, check.limit]
      : ['Морган называет участников старого дела. Реестр фиксирует срок и основание закрытия; карточка — передачу папки с названием подразделения.', 'Выберите, какие сведения подтверждаются независимо от устного сообщения.'];
    for (const sentence of facts) {
      const p = document.createElement('p');
      p.textContent = sentence;
      auditDetail.appendChild(p);
    }
    auditResult.textContent = check.saved ? `${check.saved.conclusion} ${check.saved.nextStep}` : '';
    if (check.saved) return;
    for (const reading of OLD_CASE_SOURCE_READINGS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = reading.label;
      button.addEventListener('click', () => {
        const result = recordOldCaseSourceReading(reading.id, check, GameState.flags.court_old_case_source_audit);
        if (!result) return;
        if (!result.correct) { auditResult.textContent = result.feedback; return; }
        GameState.setFlag('court_old_case_source_audit', result);
        queueMicrotask(refreshArchiveRoute);
        refreshSourceAudit();
        refreshOldWitnesses();
      });
      auditOptions.appendChild(button);
    }
  }
  function refreshMorganRevisit() {
    const saved = GameState.flags.court_old_case_morgan_revisit;
    const route = planMorganRevisit(GameState.flags.court_old_case_morgan_approach, null);
    revisitPanel.hidden = !route;
    revisitResult.replaceChildren();
    if (!route) return;
    revisitButton.hidden = !!saved;
    revisitButton.textContent = route.button;
    if (saved) {
      for (const info of [saved.response, saved.limit]) {
        const p = document.createElement('p');
        p.textContent = info;
        revisitResult.appendChild(p);
      }
    }
  }
  function refreshMorganOldCase() {
    const followUp = GameState.flags.court_old_case_follow_up;
    morganPanel.hidden = !canApproachMorganAboutOldCase(followUp);
    morganOptions.replaceChildren();
    morganResult.replaceChildren();
    if (morganPanel.hidden) return;
    const saved = GameState.flags.court_old_case_morgan_approach;
    if (saved) {
      for (const content of [saved.response, saved.result]) {
        const line = document.createElement('p');
        line.textContent = content;
        morganResult.appendChild(line);
      }
      return;
    }
    for (const approach of OLD_CASE_MORGAN_APPROACHES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = approach.label;
      button.addEventListener('click', () => {
        const decision = resolveMorganOldCaseApproach(approach.id, GameState.flags.court_old_case_follow_up, GameState.flags.court_old_case_morgan_approach);
        if (!decision) return;
        GameState.setFlag('court_old_case_morgan_approach', decision);
        queueMicrotask(refreshArchiveRoute);
        NPCMemory.setFlag('npc_ray_morgan', decision.flag);
        NPCMemory.changeTrust('npc_ray_morgan', decision.trustDelta);
        refreshMorganOldCase();
        refreshMorganRevisit();
      });
      morganOptions.appendChild(button);
    }
  }
  function refreshOldCaseFollowUp() {
    const check = assessOldCaseFollowUp(GameState.flags.court_old_case_signature_action, id => GameState.hasClue(id));
    followUpPanel.hidden = !check;
    followUpDetail.replaceChildren();
    if (!check) return;
    followUpRequest.hidden = check.found;
    followUpRequest.textContent = check.button;
    followUpSave.hidden = !check.found || !!GameState.flags.court_old_case_follow_up;
    const saved = GameState.flags.court_old_case_follow_up;
    for (const detail of [
      check.found ? check.conclusion : 'Дождитесь ответа на выбранный запрос, чтобы оценить найденные материалы.',
      ...(check.found ? [check.commonLimit] : []),
      ...(saved ? ['Результат сохранён в материалах дела.'] : [])
    ]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = detail;
      followUpDetail.appendChild(paragraph);
    }
  }
  function refreshOldCaseSignature() {
    const assessment = assessOldCaseSignature(id => GameState.hasClue(id), GameState.flags.court_old_case_order_interpretation);
    signaturePanel.hidden = !assessment;
    signatureDetail.replaceChildren();
    signatureOptions.replaceChildren();
    if (!assessment) return;
    signatureOriginal.hidden = GameState.hasClue('old_case_order_physical_original');
    signatureSamples.hidden = GameState.hasClue('old_case_signature_samples');
    for (const detail of [`Собрано источников: ${assessment.found.length} из 2.`,
      ...(assessment.ready ? [assessment.finding, assessment.limit] : [])]) {
      const line = document.createElement('p');
      line.textContent = detail;
      signatureDetail.appendChild(line);
    }
    const saved = GameState.flags.court_old_case_signature_action;
    signatureResult.textContent = saved ? saved.result : '';
    if (!assessment.ready || saved) return;
    for (const action of OLD_CASE_SIGNATURE_ACTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        const current = assessOldCaseSignature(id => GameState.hasClue(id), GameState.flags.court_old_case_order_interpretation);
        const selected = recordOldCaseSignatureAction(action.id, current, GameState.flags.court_old_case_signature_action);
        if (!selected) return;
        GameState.setFlag('court_old_case_signature_action', selected);
        queueMicrotask(refreshArchiveRoute);
        refreshOldCaseSignature();
        refreshOldCaseFollowUp();
      });
      signatureOptions.appendChild(button);
    }
  }
  function refreshOldCaseOrder() {
    const check = assessOldCaseOrder(id => GameState.hasClue(id), GameState.flags.court_old_case_closure_review);
    orderPanel.hidden = !check;
    orderOptions.replaceChildren();
    orderDetail.replaceChildren();
    if (!check) return;
    orderRequest.hidden = GameState.hasClue('old_case_original_order');
    rosterRequest.hidden = GameState.hasClue('old_case_authority_roster');
    for (const info of [`Получено документов: ${check.found.length} из 2.`,
      ...(check.ready ? [check.established, check.limitation] : [])]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = info;
      orderDetail.appendChild(paragraph);
    }
    const saved = GameState.flags.court_old_case_order_interpretation;
    orderResult.textContent = saved ? `${saved.finding} Следующий шаг: ${saved.nextStep}` : '';
    if (!check.ready || saved) return;
    for (const interpretation of OLD_CASE_ORDER_INTERPRETATIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-theories-option';
      button.textContent = interpretation.label;
      button.addEventListener('click', () => {
        const assessment = assessOldCaseOrder(id => GameState.hasClue(id), GameState.flags.court_old_case_closure_review);
        const result = recordOldCaseOrderInterpretation(interpretation.id, assessment, GameState.flags.court_old_case_order_interpretation);
        if (!result) return;
        GameState.setFlag('court_old_case_order_interpretation', result);
        queueMicrotask(refreshArchiveRoute);
        refreshOldCaseOrder();
        refreshOldCaseSignature();
      });
      orderOptions.appendChild(button);
    }
  }
  function refreshOldCase() {
    const check = assessOldCaseClosure(id => GameState.hasClue(id), GameState.flags.court_old_case_reading);
    oldCasePanel.hidden = !check;
    if (!check) return;
    const note = GameState.flags.court_old_case_closure_review;
    oldCaseRegister.hidden = GameState.hasClue('old_case_closure_register');
    oldCaseInventory.hidden = GameState.hasClue('old_case_archive_inventory');
    oldCaseAssess.hidden = !check.ready || !!note;
    oldCaseStatus.replaceChildren();
    for (const detail of [
      `Проверено источников: ${check.found.length} из ${check.found.length + check.missing.length}.`,
      ...(GameState.hasClue('old_case_closure_register') ? [check.established] : []),
      ...(GameState.hasClue('old_case_archive_inventory') ? [check.uncertainty] : []),
      ...(note ? [`Дальнейшее поручение: ${note.nextStep}`] : [])
    ]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = detail;
      oldCaseStatus.appendChild(paragraph);
    }
  }
  async function retrieveOldCaseDocument(clueId, button) {
    const isOrderDocument = ['old_case_original_order', 'old_case_authority_roster'].includes(clueId);
    const isSignatureDocument = ['old_case_order_physical_original', 'old_case_signature_samples'].includes(clueId);
    const followUp = assessOldCaseFollowUp(GameState.flags.court_old_case_signature_action, id => GameState.hasClue(id));
    const isFollowUpDocument = ['old_case_specialist_memo', 'old_case_custody_extract'].includes(clueId);
    const revisit = planMorganRevisit(GameState.flags.court_old_case_morgan_approach);
    const isWitnessDocument = OLD_CASE_WITNESS_STATEMENTS.some(item => item.clueId === clueId);
    if (clueId === 'old_case_port_waybill' ? GameState.flags.court_old_case_port_log_reading?.choice !== 'limited_record'
      : clueId === 'old_case_port_visitor_log' ? GameState.flags.court_old_case_discrepancy?.id !== 'source_gap'
      : isWitnessDocument ? !GameState.flags.court_old_case_source_audit
      : clueId === 'old_case_transfer_card' ? !revisit
      : isFollowUpDocument ? followUp?.clueId !== clueId
      : isSignatureDocument ? !GameState.flags.court_old_case_order_interpretation
      : isOrderDocument ? !GameState.flags.court_old_case_closure_review : !GameState.flags.court_old_case_reading) return;
    if (GameState.hasClue(clueId)) return;
    archiveError.hidden = true;
    archiveError.textContent = '';
    button.disabled = true;
    try {
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog[clueId]) throw new Error('Архивный документ не найден');
      GameState.addClue(catalog[clueId]);
      refreshOldCase();
      refreshOldCaseOrder();
      refreshOldCaseSignature();
      refreshOldCaseFollowUp();
      refreshMorganRevisit();
      refreshSourceAudit();
      refreshOldWitnesses();
      refreshPortLog();
      refreshWaybill();
      refreshMorganBriefing();
      refreshArchiveRoute();
    } catch (error) {
      button.disabled = false;
      archiveError.textContent = 'Архив временно недоступен. Повторите запрос позже — текущие результаты сохранены.';
      archiveError.hidden = false;
      archiveError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      console.error('[Precinct] Архив Каллиопы:', error);
    }
  }
  oldCaseRegister.addEventListener('click', () => retrieveOldCaseDocument('old_case_closure_register', oldCaseRegister));
  oldCaseInventory.addEventListener('click', () => retrieveOldCaseDocument('old_case_archive_inventory', oldCaseInventory));
  orderRequest.addEventListener('click', () => retrieveOldCaseDocument('old_case_original_order', orderRequest));
  rosterRequest.addEventListener('click', () => retrieveOldCaseDocument('old_case_authority_roster', rosterRequest));
  signatureOriginal.addEventListener('click', () => retrieveOldCaseDocument('old_case_order_physical_original', signatureOriginal));
  signatureSamples.addEventListener('click', () => retrieveOldCaseDocument('old_case_signature_samples', signatureSamples));
  followUpRequest.addEventListener('click', () => {
    const followUp = assessOldCaseFollowUp(GameState.flags.court_old_case_signature_action, id => GameState.hasClue(id));
    if (followUp && !followUp.found) retrieveOldCaseDocument(followUp.clueId, followUpRequest);
  });
  followUpSave.addEventListener('click', () => {
    const check = assessOldCaseFollowUp(GameState.flags.court_old_case_signature_action, id => GameState.hasClue(id));
    const result = recordOldCaseFollowUp(check, GameState.flags.court_old_case_follow_up);
    if (!result) return;
    GameState.setFlag('court_old_case_follow_up', result);
    queueMicrotask(refreshArchiveRoute);
    refreshOldCaseFollowUp();
    refreshMorganOldCase();
  });
  revisitButton.addEventListener('click', async () => {
    const route = planMorganRevisit(GameState.flags.court_old_case_morgan_approach, GameState.flags.court_old_case_morgan_revisit);
    if (!route) return;
    if (!GameState.hasClue(route.clueId)) await retrieveOldCaseDocument(route.clueId, revisitButton);
    const saved = recordMorganRevisit(route, id => GameState.hasClue(id), GameState.flags.court_old_case_morgan_revisit);
    if (!saved) return;
    GameState.setFlag('court_old_case_morgan_revisit', saved);
    queueMicrotask(refreshArchiveRoute);
    refreshMorganRevisit();
    refreshSourceAudit();
  });
  portLogRequest.addEventListener('click', () => retrieveOldCaseDocument('old_case_port_visitor_log', portLogRequest));
  waybillRequest.addEventListener('click', () => retrieveOldCaseDocument('old_case_port_waybill', waybillRequest));
  oldCaseAssess.addEventListener('click', () => {
    const note = recordOldCaseClosure(assessOldCaseClosure(id => GameState.hasClue(id), GameState.flags.court_old_case_reading), GameState.flags.court_old_case_closure_review);
    if (!note) return;
    GameState.setFlag('court_old_case_closure_review', note);
    queueMicrotask(refreshArchiveRoute);
    refreshOldCase();
    refreshOldCaseOrder();
  });
  refreshOldCase();
  refreshOldCaseOrder();
  refreshOldCaseSignature();
  refreshOldCaseFollowUp();
  refreshMorganOldCase();
  refreshMorganRevisit();
  refreshSourceAudit();
  refreshOldWitnesses();
  refreshWitnessFollowUp();
  refreshOldDiscrepancy();
  refreshPortLog();
  refreshWaybill();
  refreshMorganBriefing();
  refreshArchiveRoute();

  document.getElementById('btn-talk-ray').addEventListener('click', async function() {
    const actions = container.querySelector('#precinct-actions');
    actions.classList.add('hidden');
    var dialogContainer = document.getElementById('dialog-container');
    dialogContainer.classList.remove('hidden');

    var dialogBox = new DialogBox(dialogContainer);
    await dialogBox.show('npc_ray_morgan');

    Events.once('dialogue:closed', function() {
      dialogContainer.innerHTML = '<p class="text-gray-500 text-sm italic">Рэй закуривает очередную сигарету и отворачивается к окну. Аудиенция окончена.</p>';
      actions.classList.remove('hidden');
      container.querySelector('#btn-request-register').hidden = !GameState.hasClue('court_switchboard_log') || GameState.hasClue('court_phone_register_copy');
    });
  });

  container.querySelector('#btn-request-register').addEventListener('click', async function() {
    if (!GameState.hasClue('court_switchboard_log') || GameState.hasClue('court_phone_register_copy')) return;
    const button = this;
    button.disabled = true;
    const result = container.querySelector('#precinct-register-result');
    try {
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      const clue = catalog.court_phone_register_copy;
      if (!clue) throw new Error('Не найдена запись в каталоге улик');
      GameState.addClue(clue);
      button.hidden = true;
      result.classList.remove('hidden');
      result.innerHTML = '<p class="card-title">ЗАПРОС ЗАРЕГИСТРИРОВАН</p><p class="card-subtitle mt-2">Дежурный сверяет номер дела с выпиской и выдаёт заверенную копию страницы из суда. Время совпадает, указан внутренний номер 17 и пометка «К». Подписи абонента нет — его личность по этим бумагам установить нельзя. Копия добавлена в архив улик.</p>';
    } catch (error) {
      button.disabled = false;
      result.classList.remove('hidden');
      result.textContent = 'Архивная запись сейчас недоступна. Попробуйте ещё раз.';
      console.error('[Precinct] Ошибка выдачи копии:', error);
    }
  });

  document.getElementById('btn-leave').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'city-map' });
  });
}
