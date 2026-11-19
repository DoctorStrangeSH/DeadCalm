import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Inventory } from '../components/inventory.js';

/**
 * Кабинет детектива — главный хаб игры.
 * Отсюда игрок переходит на карту, доску расследования, дневник и другие разделы.
 */
export function render(container) {
  var cluesCount = GameState.currentCase.clues.length;
  var notesCount = GameState.notebook ? GameState.notebook.length : 0;

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
          <p class="card-subtitle">Перемещаться между локациями</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Доступно локаций: 5</p>
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
          <p class="hidden md:block text-gray-600 text-xs mt-3">Практика · Работа с сигналом</p>
        </button>

        <!-- Мастерская -->
        <button id="btn-repair" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">⚙</span><span class="office-card-number">07</span>
          <p class="card-title">МАСТЕРСКАЯ</p>
          <p class="card-subtitle">Практика ремонта механизма</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Тренировка · Карманные часы</p>
        </button>

        <!-- Дела -->
        <button id="btn-cases" class="card office-card text-left w-full">
          <span class="office-card-icon" aria-hidden="true">§</span><span class="office-card-number">06</span>
          <p class="card-title">АКТИВНЫЕ ДЕЛА</p>
          <p class="card-subtitle">Активные и завершённые расследования</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Активных: 1</p>
        </button>

      </div>

      <!-- Статус-бар -->
      <div class="status-bar mt-4 md:mt-8 text-xs md:text-sm">
        <span class="text-gray-500">УЛИКИ: <span class="text-gold">${cluesCount}</span></span>
        <span class="text-gray-500 md:ml-8">ЗАМЕТКИ: <span class="text-gold">${notesCount}</span></span>
        <span class="text-gray-500 md:ml-8">ДЕНЬ: <span class="text-gold">1</span></span>
      </div>

      <!-- Кнопка назад -->
      <button id="btn-back" class="text-gray-600 text-xs tracking-widest mt-4 hover:text-gray-400 transition">
        ← В ГЛАВНОЕ МЕНЮ
      </button>
    </div>
  `;

  // === ОБРАБОТЧИКИ КНОПОК ===

  // Радиоприёмная — отдельная сенсорная мини-игра
  document.getElementById('btn-radio').addEventListener('click', function () {
    Events.emit('navigate', { scene: 'radio-tuning' });
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
            <p class="text-gray-500 text-xs mt-2">Судья найден мёртвым в зале суда. Ритуальное убийство. Надпись кровью. Связь с делом 20-летней давности.</p>
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
