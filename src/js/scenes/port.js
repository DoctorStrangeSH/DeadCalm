import { renderStoryLocation } from '../components/story-location.js';
import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { assessFinalEvidence, buildFinalEvidenceDossier } from '../systems/campaign-progression.js';
import { canAccessCase001MiniGame } from '../systems/minigame-access.js';

export function addPortClue(clue, button, successLabel) {
  const added = GameState.addClue(clue);
  const title = button.querySelector?.('.card-title');
  if (!added) {
    if (title) title.textContent = 'НЕ УДАЛОСЬ СОХРАНИТЬ — ПОВТОРИТЬ';
    else button.textContent = 'НЕ УДАЛОСЬ СОХРАНИТЬ — ПОВТОРИТЬ';
    button.disabled = false;
    return false;
  }

  if (title) title.textContent = successLabel;
  else button.textContent = successLabel;
  button.disabled = true;
  return true;
}

const markusStatement = {
  id: 'markus_statement',
  name: 'Показания Маркуса Холта',
  category: 'testimony',
  description: 'Маркус признаёт, что изменил запись о времени в 1967 году и спрятал оригинальную плёнку. Его слова подтверждают собственное участие в сокрытии, но требуют проверки по независимым документам.',
  location: 'port',
  day: 5,
  source: 'Маркус Холт',
  connections_to: ['old_case_details', 'restored_film_frame', 'port_cargo_ledger']
};

function renderEnding(container, ending) {
  const openCase = ending === 'open_case';
  container.querySelector('#story-location-result').innerHTML = `
    <section class="card p-5" role="status" aria-live="polite">
      <p class="office-kicker">ДЕЛО № 001 · ФИНАЛ</p>
      <h3 class="text-gold text-lg tracking-widest mt-2">${openCase ? 'ОТКРЫТОЕ ДЕЛО' : 'ЦЕНА МОЛЧАНИЯ'}</h3>
      <p class="text-gray-300 text-sm leading-relaxed mt-3">${openCase
        ? 'Вы публикуете проверенную цепочку и передаёте материалы властям. Совокупность медицинского заключения, назначенной встречи, закупки белладонны на счёт офиса Блэквуда, показания Себастьяна о передаче запечатанного флакона и независимых материалов о старом преступлении даёт основания для официального обвинения Себастьяна. Это процессуальное обвинение, а не судебный приговор: показание о передаче не доказывает, что Гаррисон выпил содержимое или что Себастьян действовал с умыслом; дело должно пройти независимую проверку в суде. Фальсификация Маркуса раскрыта; он отвечает за своё молчание. Анна получает правду о сокрытии, а Лидия — основания добиваться пересмотра дела Габриэля.'
        : 'Вы принимаете закрытое соглашение. В запечатанном приложении к нему Себастьян письменно признаёт, что встретился с Гаррисоном в вечер убийства и сам передал ему белладонну, зная о смертельном действии вещества. Это прямое признание фиксируется для следствия, но не публикуется и не заменяет независимую проверку обстоятельств. Взамен Джон откладывает публичное раскрытие материалов дела Каллиопы и защищает часть свидетелей от немедленной огласки. Себастьян открывает часть корпоративного архива по установленной процедуре. Маркус не получает иммунитета: его признание о фальсификации остаётся в материалах дела.'
      }</p>
      <p class="text-gray-500 text-xs mt-4">Сохранённый исход: ${openCase ? 'Открытое дело' : 'Цена молчания'}</p>
      <button id="btn-finale-menu" class="btn-noir w-full py-3 mt-4">В КАБИНЕТ</button>
    </section>
  `;
  container.querySelector('#btn-finale-menu')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}

function showFinaleSaveError(container) {
  const result = container.querySelector('#story-location-result');
  if (!result) return;
  let message = result.querySelector('[data-finale-save-error]');
  if (!message) {
    message = document.createElement('p');
    message.dataset.finaleSaveError = 'true';
    message.className = 'text-red-300 text-sm mt-3';
    message.setAttribute('role', 'alert');
    message.setAttribute('aria-live', 'assertive');
    result.append(message);
  }
  message.textContent = 'Не удалось сохранить завершение расследования. Ваш выбор не потерян: проверьте доступность хранилища браузера и повторите попытку.';
}

function renderEndingChoices(container) {
  const evidenceStatus = assessFinalEvidence(GameState);
  const fullDisclosureReady = evidenceStatus.fullDisclosureReady;
  const evidenceDossier = buildFinalEvidenceDossier(GameState);
  const result = container.querySelector('#story-location-result');
  if (!evidenceStatus.ready) {
    const needsSebastianStatement = evidenceStatus.missing.includes('Показание Себастьяна о передаче флакона');
    result.innerHTML = `
      <div class="card p-4">
        <p class="text-gold text-sm">ПОКА НЕДОСТАТОЧНО ДОКАЗАТЕЛЬСТВ</p>
        <p class="text-gray-400 text-sm mt-2">Не хватает обязательных материалов:</p><ul class="text-gray-500 text-xs mt-2">${evidenceStatus.missing.map(item => '<li>— ' + item + '</li>').join('')}</ul><p class="text-gray-500 text-xs mt-2">Признание Маркуса не заменит независимые источники.</p>
        ${needsSebastianStatement ? '<button id="btn-return-sebastian" class="btn-noir w-full py-3 mt-4">ВЕРНУТЬСЯ К СЕБАСТЬЯНУ В ОСОБНЯК →</button>' : ''}
      </div>
    `;
    result.querySelector('#btn-return-sebastian')?.addEventListener('click', () => {
      Events.emit('navigate', { scene: 'blackwood-mansion' });
    });
    return;
  }

  result.innerHTML = `
    <div class="card p-4">
      <p class="text-gold text-sm">ДОКАЗАТЕЛЬСТВА СВЕРЕНЫ</p>
      <p class="text-gray-400 text-sm mt-2">Себастьян выходит из тени склада. Медицинское заключение, карточка встречи, аптечная запись и его собственное показание о передаче Гаррисону запечатанного флакона из заказа на белладонну связывают его с передачей препарата. Это даёт основания предъявить официальное обвинение, но ещё не судебный приговор: показание не доказывает, что Гаррисон выпил содержимое или что Себастьян действовал с умыслом. Сам Себастьян не признаёт убийство. Перед выбором проверьте выводы и пределы каждого источника.</p>
      <ol class="grid gap-3 mt-4">
        ${evidenceDossier.map(item => `<li class="border-l-2 border-gray-700 pl-3">
          <p class="text-gray-200 text-sm font-semibold">${item.title}</p>
          <p class="text-gray-400 text-xs mt-1">${item.finding}</p>
          <p class="text-gray-500 text-xs mt-1">Предел доказательства: ${item.limit}</p>
        </li>`).join('')}
      </ol>
      <p class="text-gray-500 text-xs mt-3">Совокупность источников обосновывает официальное обвинение, но не заменяет судебную проверку. Ни одна отдельная улика не называет убийцу.</p>
      <div class="grid gap-2 mt-4">
        ${fullDisclosureReady ? "" : '<p class="text-gray-500 text-xs">Для полного публичного раскрытия материалов старого дела нужен чётко восстановленный кадр. Он не доказывает, что Гаррисон выпил переданный флакон или что Себастьян действовал с умыслом; эти обстоятельства проверяются отдельно.</p>'}
        ${!fullDisclosureReady && canAccessCase001MiniGame('film-restoration', GameState)
          ? '<button id="btn-retry-finale-film" class="btn-noir py-3">ПОВТОРИТЬ РЕСТАВРАЦИЮ ПЛЁНКИ →</button>'
          : ''}
        <button id="btn-ending-open" class="btn-noir py-3" ${fullDisclosureReady ? "" : "disabled"}>ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ</button>
        <button id="btn-ending-silence" class="btn-noir py-3">ЗАКЛЮЧИТЬ СДЕЛКУ</button>
      </div>
    </div>
  `;
  result.querySelector('#btn-retry-finale-film')?.addEventListener('click', () => {
    if (canAccessCase001MiniGame('film-restoration', GameState)) {
      Events.emit('navigate', { scene: 'film-restoration' });
    }
  });
  result.querySelector('#btn-ending-open')?.addEventListener('click', () => {
    if (GameState.completeCampaign('open_case')) renderEnding(container, 'open_case');
    else showFinaleSaveError(container);
  });
  result.querySelector('#btn-ending-silence')?.addEventListener('click', () => {
    if (!GameState.hasClue('sebastian_sealed_confession')) {
      const confessionSaved = GameState.addClue({
        id: 'sebastian_sealed_confession',
        name: 'Запечатанное признание Себастьяна',
        category: 'testimony',
        description: 'В приложении к закрытому соглашению Себастьян письменно признаёт, что встретился с Гаррисоном в вечер убийства и сам передал ему белладонну, зная о смертельном действии вещества. Признание запечатано и передано следствию; его происхождение и обстоятельства получения должны быть проверены независимо.',
        location: 'port',
        day: 5,
        source: 'Подписанное заявление Себастьяна Блэквуда',
        connections_to: ['autopsy_report_01', 'judge_appointment_card', 'belladonna_invoice']
      });
      if (!confessionSaved && !GameState.hasClue('sebastian_sealed_confession')) {
        showFinaleSaveError(container);
        return;
      }
    }
    if (GameState.completeCampaign('price_of_silence')) renderEnding(container, 'price_of_silence');
    else showFinaleSaveError(container);
  });
}

export function render(container) {
  renderStoryLocation(container, {
    title: 'СТАРЫЙ ПОРТ',
    subtitle: 'Блэкфорд · четвёртый / пятый день расследования',
    description: 'Ветер тянет с воды запах соли и мазута. Старые причалы почти пусты. Именно здесь двадцать лет назад погибла Каллиопа; здесь же Маркус оставил последнее сообщение. Улики должны говорить раньше, чем люди.',
    background: 'blackford-harbor.webp',
    action: {
      label: 'НАСТРОИТЬ ПОРТОВУЮ ЧАСТОТУ ↗',
      description: 'Проверить временное окно по фрагменту радиосвязи.'
    }
  });

  if (GameState.campaign.completed && GameState.campaign.ending) {
    renderEnding(container, GameState.campaign.ending);
    return;
  }

  container.querySelector('#btn-story-action')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'radio-tuning' });
  });

  const actions = container.querySelector('.story-location-actions');
  const showArchiveAction = () => {
    if (GameState.hasClue('port_cargo_ledger') && !GameState.hasClue('port_cargo_ledger_archive')) {
      if (actions.querySelector('#btn-port-archive-ledger')) return;
      const archive = document.createElement('button');
      archive.id = 'btn-port-archive-ledger';
      archive.className = 'card text-left w-full';
      archive.innerHTML = '<p class="card-title">СВЕРИТЬ С АРХИВНЫМ ЭКЗЕМПЛЯРОМ</p><p class="card-subtitle">Проверить копию Себастьяна по независимому архиву портового управления.</p>';
      archive.addEventListener('click', () => {
        if (GameState.hasClue('port_cargo_ledger_archive')) return;
        addPortClue({
          id: 'port_cargo_ledger_archive',
          name: 'Архивный экземпляр грузовой книги 1967 года',
          category: 'document',
          description: 'Архивный экземпляр грузовой книги содержит записи о грузах компании Блэквуда в ночь гибели Каллиопы. Сверка с копией, которую Себастьян передал Джону, подтверждает совпадение части записей и выявляет исправления в обеих версиях. Это независимо подтверждает связь компании с портом и временем, но не устанавливает, кто физически убил Каллиопу.',
          location: 'port',
          day: 4,
          source: 'Архив портового управления',
          connections_to: ['port_cargo_ledger', 'old_case_details', 'belladonna_invoice']
        }, archive, 'АРХИВНАЯ СВЕРКА ДОБАВЛЕНА');
      });
      actions.appendChild(archive);
    }
  };

  if (!GameState.hasClue('port_cargo_ledger')) {
    const ledger = document.createElement('button');
    ledger.id = 'btn-port-ledger';
    ledger.className = 'card text-left w-full';
    ledger.innerHTML = '<p class="card-title">ПРОВЕРИТЬ ГРУЗОВУЮ КНИГУ</p><p class="card-subtitle">Сверить портовые записи с архивом дела Каллиопы.</p>';
    ledger.addEventListener('click', () => {
      if (GameState.hasClue('port_cargo_ledger')) return;
      const ledgerSaved = addPortClue({
        id: 'port_cargo_ledger',
        name: 'Книга портовых грузов 1967 года',
        category: 'document',
        description: 'В копии грузовой книги есть исправления и записи о грузах компании Блэквуда в ночь гибели Каллиопы. Документ связывает его бизнес с местом и временем; страницы требуют независимой сверки.',
        location: 'port',
        day: 4,
        source: 'Архив порта',
        connections_to: ['old_case_details', 'restored_film_frame']
      }, ledger, 'ГРУЗОВАЯ КНИГА ДОБАВЛЕНА');
      if (ledgerSaved) showArchiveAction();
    });
    actions.appendChild(ledger);
  }

  showArchiveAction();

  if (!GameState.hasClue('belladonna_invoice')) {
    const invoice = document.createElement('button');
    invoice.id = 'btn-port-invoice';
    invoice.className = 'card text-left w-full';
    invoice.innerHTML = '<p class="card-title">ПРОВЕРИТЬ АПТЕЧНУЮ КНИГУ</p><p class="card-subtitle">Сверить закупки портового офиса с заключением Лидии.</p>';
    invoice.addEventListener('click', () => {
      if (GameState.hasClue('belladonna_invoice')) return;
      addPortClue({
        id: 'belladonna_invoice',
        name: 'Счёт за экстракт белладонны',
        category: 'document',
        description: 'В портовой аптечной книге зафиксирована покупка экстракта белладонны на счёт офиса Блэквуда за день до смерти судьи. Заказ связан с его компанией, но требует проверки, кто именно получил препарат и куда он был передан.',
        location: 'port',
        day: 4,
        source: 'Портовая аптечная книга',
        connections_to: ['autopsy_report_01', 'port_cargo_ledger']
      }, invoice, 'СЧЁТ ДОБАВЛЕН В ДЕЛО');
    });
    actions.appendChild(invoice);
  }
  if (GameState.campaign.day >= 5) {
    const meet = document.createElement('button');
    meet.id = 'btn-find-markus';
    meet.className = 'btn-noir w-full py-3';
    meet.textContent = GameState.hasClue('markus_statement') ? 'ПРОВЕРИТЬ ПРИЗНАНИЕ МАРКУСА' : 'НАЙТИ МАРКУСА ХОЛТА';
    actions.appendChild(meet);
    meet.addEventListener('click', () => {
      if (!GameState.hasClue('markus_statement') &&
          !addPortClue(markusStatement, meet, 'ПОКАЗАНИЯ МАРКУСА СОХРАНЕНЫ')) {
        const result = container.querySelector('#story-location-result');
        if (result) {
          result.innerHTML = '<p class="text-red-300 text-sm" role="alert">Не удалось сохранить показания Маркуса. Сцена не будет засчитана; проверьте хранилище браузера и повторите попытку.</p>';
        }
        return;
      }
      const encounterId = 'event-markus-sebastian-final-confrontation';
      const encounterRecorded = GameState.socialGraph?.events?.some(event => event.id === encounterId) ||
        Boolean(GameState.recordSocialEvent({
          id: encounterId,
          fromNpcId: 'npc_markus_holt',
          toNpcId: 'npc_sebastian_blackwood',
          description: 'Джон лично наблюдал финальную встречу Маркуса и Себастьяна на причале № 4: Маркус признал фальсификацию старого дела, Себастьян потребовал отдать ему материалы, и попытался выхватить коробку с оригиналами.',
          timeLabel: 'День 5 · Причал № 4',
          sourceType: 'direct_observation',
          certainty: 'corroborated',
          sourceRefs: ['scene:port:day5:final_confrontation']
        }));
      container.querySelector('#story-location-result').innerHTML = `
        <div class="card p-4">
          <p class="text-gold text-sm">МАРКУС ХОЛТ · ПРИЧАЛ № 4</p>
          <p class="text-gray-300 text-sm leading-relaxed mt-2">Маркус выходит из тени складского навеса. «Я изменил время в протоколе. Я спрятал плёнку. Я говорил себе, что спасаю невиновного, но на самом деле спасал себя. Себастьян был рядом с Каллиопой в ночь её смерти — это я видел на плёнке. А кто убил Гаррисона, я не видел. Я могу рассказать о его страхе и о том, что он собирался раскрыть, но мои догадки не заменят ваших доказательств».</p>
          <p class="text-gray-300 text-sm leading-relaxed mt-3">Из-за складского навеса появляется Себастьян. «Вы должны были оставить прошлое в покое, Маркус». Тот не отступает: «Я уже однажды промолчал. Больше не буду». Себастьян требует отдать ему материалы и резко тянется к коробке с оригиналами. Джон оказывается свидетелем их открытого столкновения; попытка уничтожить доказательства не превращается автоматически в признание убийства Гаррисона.</p>
          <p class="text-gray-500 text-xs mt-3">Признание Маркуса касается его собственных действий. Встреча подтверждает конфликт между ним и Себастьяном, но не заменяет независимые доказательства по делу Гаррисона.</p>
          ${encounterRecorded ? '' : '<p class="text-red-300 text-xs mt-3" role="alert">Не удалось сохранить запись о встрече. Событие показано, но не внесено в социальный граф. Повторно откройте сцену после проверки сохранения.</p>'}
        </div>
      `;
      renderEndingChoices(container);
    });
  }
}
