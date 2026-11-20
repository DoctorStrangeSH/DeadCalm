import { renderStoryLocation } from '../components/story-location.js';
import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

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

function hasCoreEvidence() {
  const hasVisualOrRadio = GameState.hasClue('restored_film_frame')
    || GameState.hasClue('port_radio_fragment');
  return GameState.hasClue('autopsy_report_01')
    && GameState.hasClue('matthews_letter')
    && GameState.hasClue('port_cargo_ledger')
    && hasVisualOrRadio;
}

function renderEnding(container, ending) {
  const openCase = ending === 'open_case';
  container.querySelector('#story-location-result').innerHTML = `
    <section class="card p-5" role="status" aria-live="polite">
      <p class="office-kicker">ДЕЛО № 001 · ФИНАЛ</p>
      <h3 class="text-gold text-lg tracking-widest mt-2">${openCase ? 'ОТКРЫТОЕ ДЕЛО' : 'ЦЕНА МОЛЧАНИЯ'}</h3>
      <p class="text-gray-300 text-sm leading-relaxed mt-3">${openCase
        ? 'Вы передаёте проверенную цепочку материалов. Себастьян больше не может скрываться за старым постановлением. Признание Маркуса также становится частью дела: он отвечает за двадцать лет молчания.'
        : 'Вы добиваетесь немедленного признания Себастьяна и защищаете часть свидетелей, но соглашаетесь оставить часть старых материалов закрытой. Маркус избегает публичного разоблачения, а доверие тех, кто вам поверил, зависит от того, сдержите ли вы обещание.'
      }</p>
      <p class="text-gray-500 text-xs mt-4">Сохранённый исход: ${openCase ? 'open_case' : 'price_of_silence'}</p>
      <button id="btn-finale-menu" class="btn-noir w-full py-3 mt-4">В КАБИНЕТ</button>
    </section>
  `;
  container.querySelector('#btn-finale-menu')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}

function renderEndingChoices(container) {
  const result = container.querySelector('#story-location-result');
  if (!hasCoreEvidence()) {
    result.innerHTML = `
      <div class="card p-4">
        <p class="text-gold text-sm">ПОКА НЕДОСТАТОЧНО ДОКАЗАТЕЛЬСТВ</p>
        <p class="text-gray-400 text-sm mt-2">Перед предъявлением версии нужны заключение о смерти Гаррисона, письмо Мэтьюса, портовая книга и хотя бы один независимый фрагмент — плёнка или радиозапись. Признание Маркуса не заменит эти источники.</p>
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="card p-4">
      <p class="text-gold text-sm">ДОКАЗАТЕЛЬСТВА СВЕРЕНЫ</p>
      <p class="text-gray-400 text-sm mt-2">Вы можете передать полную цепочку материалов или заключить компромисс ради защиты части свидетелей. Убийца от этого не меняется; меняется цена решения.</p>
      <div class="grid gap-2 mt-4">
        <button id="btn-ending-open" class="btn-noir py-3">ПЕРЕДАТЬ ВСЕ МАТЕРИАЛЫ</button>
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
          <p class="text-gray-300 text-sm leading-relaxed mt-2">Маркус выходит из тени складского навеса. «Я изменил время в протоколе. Я спрятал плёнку. Я говорил себе, что спасаю невиновного, но на самом деле спасал себя. Себастьян убил Каллиопу. А Гаррисона — чтобы тот не рассказал, как мы закрыли дело».</p>
          <p class="text-gray-500 text-xs mt-3">Его признание касается его собственных действий. Версию об убийстве необходимо сверить с независимыми материалами.</p>
        </div>
      `;
      renderEndingChoices(container);
    });
  }
}
