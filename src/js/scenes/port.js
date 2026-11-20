import { renderStoryLocation } from '../components/story-location.js';
import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { assessFinalEvidence } from '../systems/campaign-progression.js';
import { getCampaignDaySummary } from '../systems/campaign-day-summary.js';

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
  const summary = getCampaignDaySummary(5, GameState, ending);
  const summaryMarkup = summary ? `
    <div class="card p-4 mt-4">
      <p class="office-kicker">ЧТО ОСТАЛОСЬ ПОСЛЕ РАССЛЕДОВАНИЯ</p>
      <h4 class="text-gold text-sm tracking-widest mt-2">${summary.title}</h4>
      <p class="text-gray-300 text-xs tracking-widest mt-3">УСТАНОВЛЕНО</p>
      <ul class="campaign-missing">${summary.established.map(item => '<li>— ' + item + '</li>').join('')}</ul>
      <p class="text-gray-300 text-xs tracking-widest mt-3">ОПРОВЕРГНУТО</p>
      <ul class="campaign-missing">${summary.refuted.map(item => '<li>— ' + item + '</li>').join('')}</ul>
      <p class="text-gray-300 text-xs tracking-widest mt-3">ПОКА НЕИЗВЕСТНО</p>
      <ul class="campaign-missing">${summary.unknown.map(item => '<li>— ' + item + '</li>').join('')}</ul>
    </div>` : '';
  container.querySelector('#story-location-result').innerHTML = `
    <section class="card p-5" role="status" aria-live="polite">
      <p class="office-kicker">ДЕЛО № 001 · ФИНАЛ</p>
      <h3 class="text-gold text-lg tracking-widest mt-2">${openCase ? 'ОТКРЫТОЕ ДЕЛО' : 'ЦЕНА МОЛЧАНИЯ'}</h3>
      <p class="text-gray-300 text-sm leading-relaxed mt-3">${openCase
        ? 'Вы передаёте проверенную цепочку материалов. Себастьян отрицает убийство, но карточка встречи, аптечная книга, экспертиза и восстановленная плёнка дают основания для официального обвинения. Признание Маркуса также становится частью дела: он отвечает за двадцать лет молчания.'
        : 'Себастьян признаёт, что встретился с Гаррисоном и дал ему яд, но требует оставить часть материалов дела Каллиопы закрытой. Вы принимаете компромисс ради защиты части свидетелей. Маркус избегает публичного разоблачения, а доверие тех, кто вам поверил, зависит от того, сдержите ли вы обещание.'
      }</p>
      <p class="text-gray-500 text-xs mt-4">Сохранённый исход: ${openCase ? 'open_case' : 'price_of_silence'}</p>
      ${summaryMarkup}
      <button id="btn-finale-menu" class="btn-noir w-full py-3 mt-4">В КАБИНЕТ</button>
    </section>
  `;
  container.querySelector('#btn-finale-menu')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}

function renderEndingChoices(container) {
  const evidenceStatus = assessFinalEvidence(GameState);
  const publishReady = evidenceStatus.publicReady;
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
      <p class="text-gray-400 text-sm mt-2">Себастьян выходит из тени склада. Он подтверждает, что назначал встречу с Гаррисоном и что его офис купил белладонну, но утверждает, что это ничего не доказывает. Затем предлагает сделку. Теперь его слова можно сверить с независимыми документами.</p>
            <div class="grid gap-2 mt-4">
        ${publishReady ? "" : '<p class="text-gray-500 text-xs">Для публичного обвинения нужен чётко восстановленный кадр и проверенная связь Блэквуда с ядом. Компромиссный исход остаётся доступен.</p>'}
        <button id="btn-ending-open" class="btn-noir py-3" ${publishReady ? "" : "disabled"}>ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ</button>
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

  container.querySelector('#btn-story-action')?.addEventListener('click', () => {\n    Events.emit('navigate', { scene: 'radio-tuning' });\n  });\n\n  const actions = container.querySelector('.story-location-actions');
  if (!GameState.hasClue('port_cargo_ledger_archive')) {
    const ledger = document.createElement('button');
    ledger.id = 'btn-port-ledger';
    ledger.className = 'card text-left w-full';
    ledger.innerHTML = '<p class="card-title">ПРОВЕРИТЬ ГРУЗОВУЮ КНИГУ</p><p class="card-subtitle">Сверить портовые записи с архивом дела Каллиопы.</p>';
    ledger.addEventListener('click', () => {
      if (GameState.hasClue('port_cargo_ledger_archive')) return;
      GameState.addClue({
        id: 'port_cargo_ledger_archive',
        name: 'Архивный экземпляр грузовой книги 1967 года',
        category: 'document',
        description: 'Архивный экземпляр грузовой книги содержит записи о грузах компании Блэквуда в ночь гибели Каллиопы. Сверка с копией, которую Себастьян передал Джону, подтверждает совпадение части записей и выявляет исправления в обеих версиях. Это независимо подтверждает связь компании с портом и временем, но не устанавливает, кто физически убил Каллиопу.',
        location: 'port',
        day: 4,
        source: 'Архив портового управления',
        connections_to: ['port_cargo_ledger', 'old_case_details', 'belladonna_invoice']
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
          <p class="text-gray-300 text-sm leading-relaxed mt-2">Маркус выходит из тени складского навеса. «Я изменил время в протоколе. Я спрятал плёнку. Я говорил себе, что спасаю невиновного, но на самом деле спасал себя. Себастьян был рядом с Каллиопой в ночь её смерти — это я видел на плёнке. А кто убил Гаррисона, я не видел. Я могу рассказать о его страхе и о том, что он собирался раскрыть, но мои догадки не заменят ваших доказательств»..</p>
          <p class="text-gray-500 text-xs mt-3">Его признание касается его собственных действий. Версию об убийстве необходимо сверить с независимыми материалами.</p>
        </div>
      `;
      renderEndingChoices(container);
    });
  }
}
