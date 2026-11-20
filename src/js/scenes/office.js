import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Inventory } from '../components/inventory.js';
import { assessCampaignDay, advanceCampaignWhenReady } from '../systems/campaign-progression.js';
import { getPendingCampaignDaySummary, dismissCampaignDaySummary } from '../systems/campaign-day-summary.js';

/**
 * Кабинет детектива — главный хаб игры.
 * Отсюда игрок переходит на карту, доску расследования, дневник и другие разделы.
 */
export function render(container) {
  var cluesCount = GameState.currentCase.clues.length;
  var notesCount = GameState.notebook ? GameState.notebook.length : 0;
  var radioProgress = GameState.miniGameProgress?.['radio-tuning'];
  var repairProgress = GameState.miniGameProgress?.['mechanical-repair'];
  var filmProgress = GameState.miniGameProgress?.['film-restoration'];
  var radioStatus = radioProgress
    ? 'Попыток: ' + radioProgress.attempts + ' · Лучший приём: ' + (radioProgress.bestOutcome === 'clear' ? 'чистый' : radioProgress.bestOutcome === 'fragmented' ? 'фрагменты' : 'неразборчиво')
    : 'Ещё не настраивали';
  var repairStatus = repairProgress
    ? 'Попыток: ' + repairProgress.attempts + ' · Лучший ремонт: ' + (repairProgress.bestOutcome === 'success' ? 'без повреждений' : 'с последствиями')
    : 'Ещё не ремонтировали';
  var filmStatus = filmProgress ? 'Попыток: ' + filmProgress.attempts + ' · Лучший результат: ' + filmProgress.bestQuality + '%' : 'Катушка № 014 · ожидает реставрации';
  var campaignStatus = assessCampaignDay(GameState);
  var pendingDaySummary = getPendingCampaignDaySummary(GameState);
  var daySummaryMarkup = pendingDaySummary ? `
    <section id="campaign-day-summary" class="campaign-progress card p-4 mt-4" aria-labelledby="campaign-day-summary-title">
      <p class="office-kicker">ИТОГ ДНЯ ${pendingDaySummary.day} / 5</p>
      <h3 id="campaign-day-summary-title" class="text-gold text-sm tracking-widest mt-1">${pendingDaySummary.title}</h3>
      <div class="mt-3">
        <p class="text-gray-300 text-xs tracking-widest">УСТАНОВЛЕНО</p>
        <ul class="campaign-missing">${pendingDaySummary.established.map(item => '<li>— ' + item + '</li>').join('')}</ul>
      </div>
      <div class="mt-3">
        <p class="text-gray-300 text-xs tracking-widest">ОПРОВЕРГНУТО</p>
        <ul class="campaign-missing">${pendingDaySummary.refuted.map(item => '<li>— ' + item + '</li>').join('')}</ul>
      </div>
      <div class="mt-3">
        <p class="text-gray-300 text-xs tracking-widest">ПОКА НЕИЗВЕСТНО</p>
        <ul class="campaign-missing">${pendingDaySummary.unknown.map(item => '<li>— ' + item + '</li>').join('')}</ul>
      </div>
      <button id="btn-dismiss-day-summary" class="btn-noir w-full py-3 mt-4">ПРОДОЛЖИТЬ</button>
    </section>` : '';
  var campaignMissing = campaignStatus.missing.length
    ? '<ul class="campaign-missing">' + campaignStatus.missing.map(item => '<li>— ' + item + '</li>').join('') + '</ul>'
    : '<p class="text-gray-500 text-xs mt-2">Все условия текущего дня выполнены.</p>';

  container.innerHTML = `
    <div class="scene office-scene">

      <!-- Шапка -->
      <div class="scene-header mb-4 md:mb-8">
        <div>
          <p class="office-kicker">BLACKFORD POLICE DEPARTMENT / ОТДЕЛ РАССЛЕДОВАНИЙ</p>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">КАБИНЕТ ДЕТЕКТИВА</h2>
          <p class="text-gray-400 text-xs md:text-sm tracking-wider mt-1">Блэкфорд · Ноябрь 1987 · Дело № 001</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="office-weather">● &nbsp; ДОЖДЬ ЗА ОКНОМ</span>
        </div>
      </div>

      <div class="office-environment" aria-hidden="true">
        <div class="office-window"><div class="office-rain"></div><div class="office-skyline"></div></div>
        <div class="office-lamp"><span></span></div>
        <div class="office-desk"><div class="office-desk-paper"></div><div class="office-cup"></div></div>
        <div class="office-environment-caption">«Город не расскажет тебе правду. Придётся вытащить её самому.»</div>
      </div>

      <div class="office-section-heading"><span>РАБОЧИЙ СТОЛ</span><span>ВЫБЕРИТЕ ДЕЙСТВИЕ</span></div>

      <!-- Карточки-разделы -->
      <div class="cards-grid office-grid flex-1">

        <!-- Карта города -->
        <button id="btn-map" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">⌖</span><span class="office-card-number">01</span>
          <p class="card-title">КАРТА ГОРОДА</p>
          <p class="card-subtitle">Перемещаться между локациями по мере развития дела</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Локации открываются по сюжету</p>
        </button>

        <!-- Доска расследования -->
        <button id="btn-board" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">◇</span><span class="office-card-number">02</span>
          <p class="card-title">ДОСКА РАССЛЕДОВАНИЯ</p>
          <p class="card-subtitle">Улики, связи, подозреваемые</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Улик на доске: ${cluesCount}</p>
        </button>

        <!-- Инвентарь -->
        <button id="btn-inventory" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">▤</span><span class="office-card-number">03</span>
          <p class="card-title">АРХИВ УЛИК</p>
          <p class="card-subtitle">Просмотреть собранные улики</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Улик собрано: ${cluesCount}</p>
        </button>

        <!-- Дневник -->
        <button id="btn-notebook" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">✎</span><span class="office-card-number">04</span>
          <p class="card-title">ДНЕВНИК</p>
          <p class="card-subtitle">Заметки и мысли детектива</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Записей: ${notesCount}</p>
        </button>

        <!-- Хронология -->
        <button id="btn-timeline" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">◷</span><span class="office-card-number">05</span>
          <p class="card-title">ХРОНОЛОГИЯ</p>
          <p class="card-subtitle">Восстановить последовательность событий</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Событий: 10</p>
        </button>

        <!-- Радиоприёмная -->
        <button id="btn-radio" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">⌁</span><span class="office-card-number">08</span>
          <p class="card-title">РАДИОПРИЁМНАЯ</p>
          <p class="card-subtitle">Настроить коротковолновый приёмник</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">${radioStatus}</p>
        </button>

        <!-- Мастерская -->
        <button id="btn-repair" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">⚙</span><span class="office-card-number">07</span>
          <p class="card-title">МАСТЕРСКАЯ</p>
          <p class="card-subtitle">Практика ремонта механизма</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">${repairStatus}</p>
        </button>

        <!-- Реставрация киноплёнки -->
        <button id="btn-film" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">▥</span><span class="office-card-number">09</span>
          <p class="card-title">АРХИВ КИНОПЛЁНКИ</p>
          <p class="card-subtitle">Восстановить повреждённую катушку</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">${filmStatus}</p>
        </button>

        <!-- Дела -->
        <button id="btn-cases" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">§</span><span class="office-card-number">06</span>
          <p class="card-title">АКТИВНЫЕ ДЕЛА</p>
          <p class="card-subtitle">Активные и завершённые расследования</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Активных: 1</p>
        </button>

      </div>

      <section class="campaign-progress card p-4 mt-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="office-kicker">ДЕЛО № 001 · ДЕНЬ ${campaignStatus.day} / 5</p>
            <h3 class="text-gold text-sm tracking-widest mt-1">${campaignStatus.label}</h3>
          </div>
          <span class="text-gray-500 text-xs">${campaignStatus.complete ? "ЗАВЕРШЕНО" : campaignStatus.finaleReady ? "ФИНАЛ" : campaignStatus.canAdvance ? "ГОТОВО" : "В РАБОТЕ"}</span>
        </div>
        ${campaignStatus.day < 5 && !campaignStatus.complete ? campaignMissing : ""}
        ${campaignStatus.finaleReady ? '<p class="text-gray-400 text-sm mt-2">Последняя встреча ждёт вас на старом причале.</p>' : ""}
        ${campaignStatus.complete ? '<p class="text-gray-400 text-sm mt-2">Сохранённый финал: ' + GameState.campaign.ending + '</p>' : ""}
        ${campaignStatus.day < 5 && !campaignStatus.complete ? '<button id="btn-advance-day" class="btn-noir w-full py-3 mt-3" ' + (campaignStatus.canAdvance ? "" : "disabled") + '>ЗАВЕРШИТЬ ДЕНЬ ' + campaignStatus.day + ' →</button>' : ""}
        ${campaignStatus.finaleReady ? '<button id="btn-go-finale" class="btn-noir w-full py-3 mt-3">ОТПРАВИТЬСЯ В ПОРТ →</button>' : ""}
      </section>
      ${daySummaryMarkup}

      <!-- Статус-бар -->
      <div class="status-bar mt-4 md:mt-8 text-xs md:text-sm">
        <span class="text-gray-500">УЛИКИ: <span class="text-gold">${cluesCount}</span></span>
        <span class="text-gray-500 md:ml-8">ЗАМЕТКИ: <span class="text-gold">${notesCount}</span></span>
        <span class="text-gray-500 md:ml-8">ДЕНЬ: <span class="text-gold">${GameState.campaign?.day || 1}</span></span>
      </div>

      <!-- Кнопка назад -->
      <button id="btn-back" class="text-gray-600 text-xs tracking-widest mt-4 hover:text-gray-400 transition">
        ← В ГЛАВНОЕ МЕНЮ
      </button>
    </div>
  `;

  // === ОБРАБОТЧИКИ КНОПОК ===

  document.getElementById('btn-advance-day')?.addEventListener('click', function () {
    const result = advanceCampaignWhenReady(GameState);
    if (result.advanced) Events.emit('navigate', { scene: 'office' });
  });

  document.getElementById('btn-dismiss-day-summary')?.addEventListener('click', function () {
    dismissCampaignDaySummary(GameState, pendingDaySummary.day);
    document.getElementById('campaign-day-summary')?.remove();
  });

  document.getElementById('btn-go-finale')?.addEventListener('click', function () {
    Events.emit('navigate', { scene: 'port' });
  });

  // Радиоприёмная — отдельная сенсорная мини-игра
  document.getElementById('btn-radio').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'radio-tuning' });
  });

  // Архивная киноплёнка — отдельная сенсорная мини-игра
  document.getElementById('btn-film').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'film-restoration' });
  });

  // Мастерская — отдельная игровая мини-сцена
  document.getElementById('btn-repair').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'mechanical-repair' });
  });

  // Карта города
  document.getElementById('btn-map').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'city-map' });
  });

  // Доска расследования
  document.getElementById('btn-board').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'investigation' });
  });

  // Инвентарь
  document.getElementById('btn-inventory').addEventListener('click', function () {
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = '<div class="dialog-modal" id="inventory-modal"></div>';
    document.body.appendChild(overlay);

    var invContainer = document.getElementById('inventory-modal');
    var inventory = new Inventory(invContainer);
    inventory.open();

    // Закрытие при клике на фон
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        inventory.close();
        overlay.remove();
      }
    });

    // Закрытие по событию
    Events.once('inventory:closed', function () {
      overlay.remove();
    });
  });

  // Дневник
  document.getElementById('btn-notebook').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'notebook' });
  });

  // Хронология
  document.getElementById('btn-timeline').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'timeline' });
  });

  // Дела (заглушка)
  document.getElementById('btn-cases').addEventListener('click', function () {
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-modal">
        <div class="dialog-content">
          <p class="dialog-type-label">АКТИВНЫЕ ДЕЛА</p>
          <div class="card p-4 mb-3">
            <p class="card-title">🔪 УБИЙСТВО СУДЬИ ГАРРИСОНА</p>
            <p class="card-subtitle">Дело №001 — активно</p>
            <p class="text-gray-500 text-xs mt-2">Судья найден мёртвым в зале суда. Несовпадение времени, звонок из комнаты секретарей и старое дело Каллиопы.</p>
          </div>
          <p class="text-gray-600 text-xs mb-4">Завершённых дел: 0</p>
          <button class="dialog-btn primary-btn close-cases">ЗАКРЫТЬ</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.close-cases').addEventListener('click', function () {
      overlay.remove();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  });

  // Назад в главное меню
  document.getElementById('btn-back').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'main-menu' });
  });
}
