import { Events } from '../core/events.js';
import { DialogBox } from '../components/dialog-box.js';
import { GameState } from '../core/state.js';
import { assessOldCaseClosure, recordOldCaseClosure } from '../systems/old-case-closure.js';
import { assessOldCaseOrder, recordOldCaseOrderInterpretation, OLD_CASE_ORDER_INTERPRETATIONS } from '../systems/old-case-order.js';

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
    if (isOrderDocument ? !GameState.flags.court_old_case_closure_review : !GameState.flags.court_old_case_reading) return;
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
  oldCaseAssess.addEventListener('click', () => {
    const note = recordOldCaseClosure(assessOldCaseClosure(id => GameState.hasClue(id), GameState.flags.court_old_case_reading), GameState.flags.court_old_case_closure_review);
    if (!note) return;
    GameState.setFlag('court_old_case_closure_review', note);
    refreshOldCase();
    refreshOldCaseOrder();
  });
  refreshOldCase();
  refreshOldCaseOrder();

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
