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
      <div id="dialog-container" class="hidden"></div>
    </div>
  `;

  const oldCasePanel = container.querySelector('#precinct-old-case');
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
    if (clueId === 'old_case_transfer_card' ? !revisit
      : isFollowUpDocument ? followUp?.clueId !== clueId
      : isSignatureDocument ? !GameState.flags.court_old_case_order_interpretation
      : isOrderDocument ? !GameState.flags.court_old_case_closure_review : !GameState.flags.court_old_case_reading) return;
    if (GameState.hasClue(clueId)) return;
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
    } catch (error) {
      button.disabled = false;
      oldCaseStatus.textContent = 'Архив временно недоступен. Повторите запрос позже.';
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
    refreshMorganRevisit();
  });
  oldCaseAssess.addEventListener('click', () => {
    const note = recordOldCaseClosure(assessOldCaseClosure(id => GameState.hasClue(id), GameState.flags.court_old_case_reading), GameState.flags.court_old_case_closure_review);
    if (!note) return;
    GameState.setFlag('court_old_case_closure_review', note);
    refreshOldCase();
    refreshOldCaseOrder();
  });
  refreshOldCase();
  refreshOldCaseOrder();
  refreshOldCaseSignature();
  refreshOldCaseFollowUp();
  refreshMorganOldCase();
  refreshMorganRevisit();

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
