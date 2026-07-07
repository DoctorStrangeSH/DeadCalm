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
    <div class="scene">

      <!-- Шапка -->
      <div class="scene-header mb-4 md:mb-8">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">КАБИНЕТ</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Блэкфорд, ноябрь 1987 — День 1</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-gray-600 text-xs">Дождь за окном</span>
        </div>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <!-- Карточки-разделы -->
      <div class="cards-grid flex-1">

        <!-- Карта города -->
        <button id="btn-map" class="card text-left w-full">
          <p class="card-title">🗺 КАРТА ГОРОДА</p>
          <p class="card-subtitle">Перемещаться между локациями</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Доступно локаций: 5</p>
        </button>

        <!-- Доска расследования -->
        <button id="btn-board" class="card text-left w-full">
          <p class="card-title">📌 ДОСКА РАССЛЕДОВАНИЯ</p>
          <p class="card-subtitle">Улики, связи, подозреваемые</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Улик на доске: ${cluesCount}</p>
        </button>

        <!-- Инвентарь -->
        <button id="btn-inventory" class="card text-left w-full">
          <p class="card-title">🎒 ИНВЕНТАРЬ</p>
          <p class="card-subtitle">Просмотреть собранные улики</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Улик собрано: ${cluesCount}</p>
        </button>

        <!-- Дневник -->
        <button id="btn-notebook" class="card text-left w-full">
          <p class="card-title">📓 ДНЕВНИК</p>
          <p class="card-subtitle">Заметки и мысли детектива</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Записей: ${notesCount}</p>
        </button>

        <!-- Хронология -->
        <button id="btn-timeline" class="card text-left w-full">
          <p class="card-title">⏳ ХРОНОЛОГИЯ</p>
          <p class="card-subtitle">Восстановить последовательность событий</p>
          <p class="hidden md:block text-gray-600 text-xs mt-3">Событий: 10</p>
        </button>

        <!-- Дела -->
        <button id="btn-cases" class="card text-left w-full">
          <p class="card-title">📋 ДЕЛА</p>
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