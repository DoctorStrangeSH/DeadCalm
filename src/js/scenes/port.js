import { renderStoryLocation } from '../components/story-location.js';
import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { assessFinalEvidence, buildFinalEvidenceDossier } from '../systems/campaign-progression.js';

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
        ? 'Вы передаёте собранную цепочку материалов для независимого официального расследования. Карточка встречи, аптечная запись и экспертиза обосновывают проверку версии о причастности Блэквуда, но не доказывают, кто передал яд Гаррисону. Восстановленная плёнка относится к гибели Каллиопы и помогает проверить старое алиби, а не устанавливает убийцу судьи. Признание Маркуса подтверждает его участие в сокрытии материалов, но не доказывает убийство Гаррисона.'
        : 'Вы принимаете закрытое соглашение: материалы о смерти Гаррисона передаются для дальнейшего разбирательства без публичной кампании, а спорные документы о деле Каллиопы не публикуются до независимой проверки. Себастьян не признаёт, что дал судье яд, но соглашается открыть часть корпоративного архива по установленной процедуре. Маркус не становится публичным обвинителем; его признание остаётся в материалах дела.'
      }</p>
      <p class="text-gray-500 text-xs mt-4">Сохранённый исход: ${openCase ? 'Открытое дело' : 'Цена молчания'}</p>
      <button id="btn-finale-menu" class="btn-noir w-full py-3 mt-4">В КАБИНЕТ</button>
    </section>
  `;
  container.querySelector('#btn-finale-menu')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}

function renderEndingChoices(container) {
  const evidenceStatus = assessFinalEvidence(GameState);
  const fullDisclosureReady = evidenceStatus.fullDisclosureReady;
  const evidenceDossier = buildFinalEvidenceDossier(GameState);
  const result = container.querySelector('#story-location-result');
  if (!evidenceStatus.ready) {
    result.innerHTML = `
      <div class="card p-4">
        <p class="text-gold text-sm">ПОКА НЕДОСТАТОЧНО ДОКАЗАТЕЛЬСТВ</p>
        <p class="text-gray-400 text-sm mt-2">Не хватает независимых источников:</p><ul class="text-gray-500 text-xs mt-2">${evidenceStatus.missing.map(item => '<li>— ' + item + '</li>').join('')}</ul><p class="text-gray-500 text-xs mt-2">Признание Маркуса не заменит эти источники.</p>
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="card p-4">
      <p class="text-gold text-sm">ДОКАЗАТЕЛЬСТВА СВЕРЕНЫ</p>
      <p class="text-gray-400 text-sm mt-2">Себастьян выходит из тени склада. Карточка встречи, аптечная запись и независимые свидетельства складываются в подозрение, но ни один документ отдельно не доказывает, что именно он дал яд. Сам Себастьян не признаёт убийство. Перед выбором проверьте выводы и пределы каждого источника.</p>
      <ol class="grid gap-3 mt-4">
        ${evidenceDossier.map(item => `<li class="border-l-2 border-gray-700 pl-3">
          <p class="text-gray-200 text-sm font-semibold">${item.title}</p>
          <p class="text-gray-400 text-xs mt-1">${item.finding}</p>
          <p class="text-gray-500 text-xs mt-1">Предел доказательства: ${item.limit}</p>
        </li>`).join('')}
      </ol>
      <p class="text-gray-500 text-xs mt-3">Это совокупная версия из нескольких источников. Ни одна отдельная улика не называет убийцу.</p>
      <div class="grid gap-2 mt-4">
        ${fullDisclosureReady ? "" : '<p class="text-gray-500 text-xs">Для полного публичного раскрытия материалов старого дела нужен чётко восстановленный кадр. Это не заменяет доказательств того, кто передал яд Гаррисону; открытое дело передаётся на дальнейшее расследование.</p>'}
        <button id="btn-ending-open" class="btn-noir py-3" ${fullDisclosureReady ? "" : "disabled"}>ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ</button>
        <button id="btn-ending-silence" class="btn-noir py-3">ЗАКЛЮЧИТЬ СДЕЛКУ</button>
      </div>
    </div>
  `;
  result.querySelector('#btn-ending-open')?.addEventListener('click', () => {
    if (GameState.completeCampaign('open_case')) renderEnding(container, 'open_case');
  });
  result.querySelector('#btn-ending-silence')?.addEventListener('click', () => {
    if (GameState.completeCampaign('price_of_silence')) renderEnding(container, 'price_of_silence');
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
  if (!GameState.hasClue('port_cargo_ledger')) {
    const ledger = document.createElement('button');
    ledger.id = 'btn-port-ledger';
    ledger.className = 'card text-left w-full';
    ledger.innerHTML = '<p class="card-title">ПРОВЕРИТЬ ГРУЗОВУЮ КНИГУ</p><p class="card-subtitle">Сверить портовые записи с архивом дела Каллиопы.</p>';
    ledger.addEventListener('click', () => {
      if (GameState.hasClue('port_cargo_ledger')) return;
      GameState.addClue({
        id: 'port_cargo_ledger',
        name: 'Книга портовых грузов 1967 года',
        category: 'document',
        description: 'В копии грузовой книги есть исправления и записи о грузах компании Блэквуда в ночь гибели Каллиопы. Документ связывает его бизнес с местом и временем; страницы требуют независимой сверки.',
        location: 'port',
        day: 4,
        source: 'Архив порта',
        connections_to: ['old_case_details', 'restored_film_frame']
      });
      ledger.disabled = true;
      ledger.querySelector('.card-title').textContent = 'ГРУЗОВАЯ КНИГА ДОБАВЛЕНА';
    });
    actions.appendChild(ledger);
  }

  if (!GameState.hasClue('belladonna_invoice')) {
    const invoice = document.createElement('button');
    invoice.id = 'btn-port-invoice';
    invoice.className = 'card text-left w-full';
    invoice.innerHTML = '<p class="card-title">ПРОВЕРИТЬ АПТЕЧНУЮ КНИГУ</p><p class="card-subtitle">Сверить закупки портового офиса с заключением Лидии.</p>';
    invoice.addEventListener('click', () => {
      if (GameState.hasClue('belladonna_invoice')) return;
      GameState.addClue({
        id: 'belladonna_invoice',
        name: 'Счёт за экстракт белладонны',
        category: 'document',
        description: 'В портовой аптечной книге зафиксирована покупка экстракта белладонны на счёт офиса Блэквуда за день до смерти судьи. Заказ связан с его компанией, но требует проверки, кто именно получил препарат и куда он был передан.',
        location: 'port',
        day: 4,
        source: 'Портовая аптечная книга',
        connections_to: ['autopsy_report_01', 'port_cargo_ledger']
      });
      invoice.disabled = true;
      invoice.querySelector('.card-title').textContent = 'СЧЁТ ДОБАВЛЕН В ДЕЛО';
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
      if (!GameState.hasClue('markus_statement')) GameState.addClue(markusStatement);
      container.querySelector('#story-location-result').innerHTML = `
        <div class="card p-4">
          <p class="text-gold text-sm">МАРКУС ХОЛТ · ПРИЧАЛ № 4</p>
          <p class="text-gray-300 text-sm leading-relaxed mt-2">Маркус выходит из тени складского навеса. «Я изменил время в протоколе. Я спрятал плёнку. Я говорил себе, что спасаю невиновного, но на самом деле спасал себя. Себастьян был рядом с Каллиопой в ночь её смерти — это я видел на плёнке. А кто убил Гаррисона, я не видел. Я могу рассказать о его страхе и о том, что он собирался раскрыть, но мои догадки не заменят ваших доказательств».</p>
          <p class="text-gray-500 text-xs mt-3">Его признание касается его собственных действий. Версию об убийстве необходимо сверить с независимыми материалами.</p>
        </div>
      `;
      renderEndingChoices(container);
    });
  }
}
